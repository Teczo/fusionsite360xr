/**
 * Backfill script: recomputes deterministic derived fields on existing records.
 *
 * Safe to run multiple times (idempotent). Does not delete or modify unrelated fields.
 *
 * Usage:
 *   MONGODB_URI=<your-uri> node scripts/backfillDerivedFields.js
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import ScheduleActivity from '../models/ScheduleActivity.js';
import SCurve from '../models/SCurve.js';
import HSE from '../models/HSE.js';

const SEVERITY_WEIGHTS = { Critical: 3, Warning: 2, Info: 1 };

async function backfillScheduleActivities() {
  const docs = await ScheduleActivity.find({});
  let updated = 0;
  const today = new Date();

  for (const doc of docs) {
    const { plannedStart, plannedFinish, actualFinish } = doc;

    if (!plannedStart || !plannedFinish) continue;

    const plannedDurationDays = Math.max(
      1,
      Math.round((plannedFinish.getTime() - plannedStart.getTime()) / 86400000)
    );

    let delayDays;
    if (actualFinish) {
      delayDays = Math.max(0, Math.round((actualFinish.getTime() - plannedFinish.getTime()) / 86400000));
    } else if (plannedFinish < today) {
      delayDays = Math.round((today.getTime() - plannedFinish.getTime()) / 86400000);
    } else {
      delayDays = 0;
    }
    const isDelayed = delayDays > 0;

    doc.plannedDurationDays = plannedDurationDays;
    doc.delayDays = delayDays;
    doc.isDelayed = isDelayed;
    await doc.save();
    updated++;
  }

  console.log(`ScheduleActivity: ${updated} / ${docs.length} documents updated`);
}

async function backfillSCurves() {
  const docs = await SCurve.find({});
  let updated = 0;

  for (const doc of docs) {
    const { baseline, actual } = doc;

    const latestBaseline = baseline.length > 0 ? baseline[baseline.length - 1].value : 0;
    const latestActual   = actual.length   > 0 ? actual[actual.length - 1].value   : 0;

    doc.variance = latestActual - latestBaseline;
    doc.variancePercent =
      latestBaseline === 0
        ? 0
        : ((latestActual - latestBaseline) / latestBaseline) * 100;

    await doc.save();
    updated++;
  }

  console.log(`SCurve: ${updated} / ${docs.length} documents updated`);
}

async function backfillHSE() {
  const docs = await HSE.find({});
  let updated = 0;

  for (const doc of docs) {
    doc.computedSeverityWeight = SEVERITY_WEIGHTS[doc.severity] ?? 0;
    await doc.save();
    updated++;
  }

  console.log(`HSE: ${updated} / ${docs.length} documents updated`);
}

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  await backfillScheduleActivities();
  await backfillSCurves();
  await backfillHSE();

  console.log('\nBackfill complete.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
