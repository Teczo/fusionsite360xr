/**
 * Bootstrap + Seed script
 * Creates a demo user + project if none exist, then seeds sample data.
 * Run once: node scripts/bootstrap-seed.js
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Timeline from '../models/Timeline.js';
import HSE from '../models/HSE.js';
import Alert from '../models/Alert.js';
import SCurve from '../models/SCurve.js';
import Media from '../models/Media.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // --- Ensure a user exists ---
  let user = await User.findOne();
  if (!user) {
    const passwordHash = await bcrypt.hash('Demo@2026', 10);
    user = await User.create({
      name: 'Demo User',
      email: 'demo@fusionxr.com',
      passwordHash,
      role: 'admin',
    });
    console.log(`Created demo user: ${user.email} / Demo@2026`);
  } else {
    console.log(`Using existing user: ${user.email}`);
  }

  // --- Ensure a project exists ---
  let project = await Project.findOne({ userId: user._id }).sort({ createdAt: -1 });
  if (!project) {
    project = await Project.create({
      userId: user._id,
      name: 'Tower A — Construction Project',
      description: 'Sample construction project seeded for demo purposes.',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      status: 'In Progress',
      projectCode: 'PRJ-DEMO-001',
      location: { address: 'Kuala Lumpur, Malaysia', latitude: 3.1390, longitude: 101.6869 },
    });
    console.log(`Created project: ${project.name} (${project._id})`);
  } else {
    console.log(`Using existing project: ${project.name} (${project._id})`);
  }

  const projectId = project._id;
  const userId = user._id;

  // --- Timeline ---
  await Timeline.deleteMany({ projectId });
  await Timeline.insertMany([
    { projectId, title: 'Project Kickoff', description: 'Initial planning and team assembly completed.', date: new Date('2025-01-15'), type: 'milestone', createdBy: userId },
    { projectId, title: 'Foundation Complete', description: 'Foundation work finished ahead of schedule.', date: new Date('2025-03-01'), type: 'milestone', createdBy: userId },
    { projectId, title: 'Steel Erection Started', description: 'Structural steel erection commenced on Zone A.', date: new Date('2025-04-10'), type: 'progress_update', createdBy: userId },
    { projectId, title: 'Crane Incident', description: 'Minor crane malfunction during lift operation. No injuries.', date: new Date('2025-05-02'), type: 'incident', createdBy: userId },
    { projectId, title: 'MEP Rough-In', description: 'Mechanical, electrical, and plumbing rough-in started.', date: new Date('2025-06-15'), type: 'progress_update', createdBy: userId },
    { projectId, title: 'Facade Installation', description: 'Curtain wall facade installation 60% complete.', date: new Date('2025-08-20'), type: 'progress_update', createdBy: userId },
    { projectId, title: 'Interior Fit-Out', description: 'Interior finishing work commenced on floors 1-5.', date: new Date('2025-10-01'), type: 'milestone', createdBy: userId },
  ]);
  console.log('Seeded 7 timeline items');

  // --- HSE ---
  await HSE.deleteMany({ projectId });
  const now = new Date();
  const mo = (offsetMonths) => new Date(now.getFullYear(), now.getMonth() + offsetMonths, Math.floor(Math.random() * 20) + 1);
  await HSE.insertMany([
    // ── Lost Time Injuries ────────────────────────────────────────────────────
    {
      projectId, createdBy: userId,
      title: 'Worker Fall from Scaffolding Level 3',
      description: 'Worker fell 2.4m while repositioning scaffold boards. No harness worn. Lost 12 working days.',
      severity: 'Critical', date: mo(-2), zoneId: 'Zone-C',
      incidentType: 'Lost Time Injury', isLTI: true, manhours: 18000,
      status: 'Closed', closedAt: mo(-1),
      subcontractor: 'Bumi Armada Construction', supervisor: 'Ahmad bin Hassan',
      permitType: 'Work at Height', permitActive: false,
      complianceCategory: 'Work at Height',
      computedSeverityWeight: 3,
    },
    {
      projectId, createdBy: userId,
      title: 'Crane Operator Hand Crush Injury',
      description: 'Operator hand trapped between slewing ring and fixed structure during maintenance. Fracture confirmed.',
      severity: 'Critical', date: mo(-4), zoneId: 'Zone-A',
      incidentType: 'Lost Time Injury', isLTI: true, manhours: 22000,
      status: 'Closed', closedAt: mo(-3),
      subcontractor: 'Sapura Heavy Lift', supervisor: 'Ramli bin Yusof',
      permitType: 'Heavy Lifting', permitActive: false,
      complianceCategory: 'Lifting',
      computedSeverityWeight: 3,
    },

    // ── Medical Treatment Cases ───────────────────────────────────────────────
    {
      projectId, createdBy: userId,
      title: 'Electrical Shock — Temporary Power Panel',
      description: 'Electrician received 240V shock from exposed terminal on temporary DB. Treated at clinic, returned next day.',
      severity: 'Critical', date: mo(-1), zoneId: 'Zone-B',
      incidentType: 'Medical Treatment', isLTI: false, manhours: 9500,
      status: 'Open',
      subcontractor: 'Petrofac Electrical Works', supervisor: 'Lee Chong Wei',
      permitType: 'Hot Work', permitActive: true,
      complianceCategory: 'Electrical',
      computedSeverityWeight: 3,
    },
    {
      projectId, createdBy: userId,
      title: 'Chemical Eye Splash — Epoxy Application',
      description: 'Worker not wearing face shield during epoxy mixing. Flushed on-site, transported to hospital for observation.',
      severity: 'Warning', date: mo(-1), zoneId: 'Zone-D',
      incidentType: 'Medical Treatment', isLTI: false, manhours: 7200,
      status: 'Under Investigation',
      subcontractor: 'Bumi Armada Construction', supervisor: 'Ahmad bin Hassan',
      permitType: '', permitActive: false,
      complianceCategory: 'PPE Violation',
      computedSeverityWeight: 2,
    },
    {
      projectId, createdBy: userId,
      title: 'Heat Exhaustion — Roof Waterproofing Crew',
      description: 'Crew member collapsed on roof deck at 14:30. Temperature 38°C, no shade provided. Treated and recovered.',
      severity: 'Warning', date: mo(-2), zoneId: 'Zone-A',
      incidentType: 'Medical Treatment', isLTI: false, manhours: 11000,
      status: 'Closed', closedAt: mo(-1),
      subcontractor: 'Sapura Heavy Lift', supervisor: 'Ramli bin Yusof',
      permitType: '', permitActive: false,
      complianceCategory: 'Housekeeping',
      computedSeverityWeight: 2,
    },

    // ── First Aid Cases ───────────────────────────────────────────────────────
    {
      projectId, createdBy: userId,
      title: 'Nail Puncture — Formwork Decking',
      description: 'Protruding nail punctured boot sole. First aid applied on site, no further treatment required.',
      severity: 'Warning', date: mo(0), zoneId: 'Zone-C',
      incidentType: 'First Aid', isLTI: false, manhours: 4800,
      status: 'Closed', closedAt: mo(0),
      subcontractor: 'Petrofac Electrical Works', supervisor: 'Lee Chong Wei',
      permitType: '', permitActive: false,
      complianceCategory: 'Housekeeping',
      computedSeverityWeight: 2,
    },
    {
      projectId, createdBy: userId,
      title: 'Minor Laceration — Rebar Cutting',
      description: 'Worker glove snagged on rebar cut end, shallow cut on palm. Treated with adhesive dressing.',
      severity: 'Info', date: mo(0), zoneId: 'Zone-B',
      incidentType: 'First Aid', isLTI: false, manhours: 3200,
      status: 'Closed', closedAt: mo(0),
      subcontractor: 'Bumi Armada Construction', supervisor: 'Nor Azizah bt Hamid',
      permitType: '', permitActive: false,
      complianceCategory: 'PPE Violation',
      computedSeverityWeight: 1,
    },
    {
      projectId, createdBy: userId,
      title: 'Dust Eye Irritation — Concrete Grinding',
      description: 'Angle grinder operator not wearing goggles. Eye irrigation applied. Reminded of PPE requirements.',
      severity: 'Info', date: mo(-1), zoneId: 'Zone-A',
      incidentType: 'First Aid', isLTI: false, manhours: 2800,
      status: 'Closed', closedAt: mo(-1),
      subcontractor: 'Sapura Heavy Lift', supervisor: 'Ahmad bin Hassan',
      permitType: '', permitActive: false,
      complianceCategory: 'PPE Violation',
      computedSeverityWeight: 1,
    },

    // ── Near Miss Reports ─────────────────────────────────────────────────────
    {
      projectId, createdBy: userId,
      title: 'Unsecured Load Nearly Dropped — Tower Crane Lift',
      description: 'Steel beam sling slipped during crane pick. Load swung 3m before operator aborted. No injury.',
      severity: 'Critical', date: mo(0), zoneId: 'Zone-A',
      incidentType: 'Near Miss', isLTI: false, manhours: 0,
      status: 'Open',
      subcontractor: 'Sapura Heavy Lift', supervisor: 'Ramli bin Yusof',
      permitType: 'Heavy Lifting', permitActive: true,
      complianceCategory: 'Lifting',
      computedSeverityWeight: 3,
    },
    {
      projectId, createdBy: userId,
      title: 'Confined Space Entry Without Permit',
      description: 'Two workers entered utility tunnel without gas test or permit. Caught by site supervisor before entry completed.',
      severity: 'Critical', date: mo(0), zoneId: 'Zone-D',
      incidentType: 'Near Miss', isLTI: false, manhours: 0,
      status: 'Under Investigation',
      subcontractor: 'Petrofac Electrical Works', supervisor: 'Lee Chong Wei',
      permitType: 'Confined Space', permitActive: true,
      complianceCategory: 'Work at Height',
      computedSeverityWeight: 3,
    },
    {
      projectId, createdBy: userId,
      title: 'Scaffold Plank Overhang Detected',
      description: 'Inspection found 3 scaffold boards with >300mm overhang and no toe boards. Remediated same day.',
      severity: 'Warning', date: mo(-1), zoneId: 'Zone-C',
      incidentType: 'Near Miss', isLTI: false, manhours: 0,
      status: 'Closed', closedAt: mo(-1),
      subcontractor: 'Bumi Armada Construction', supervisor: 'Nor Azizah bt Hamid',
      permitType: 'Work at Height', permitActive: true,
      complianceCategory: 'Work at Height',
      computedSeverityWeight: 2,
    },
    {
      projectId, createdBy: userId,
      title: 'Hot Work Spark Ignites Nearby Debris',
      description: 'Welding sparks ignited cardboard waste 1.5m from work area. Fire extinguisher used immediately.',
      severity: 'Warning', date: mo(-2), zoneId: 'Zone-B',
      incidentType: 'Near Miss', isLTI: false, manhours: 0,
      status: 'Closed', closedAt: mo(-2),
      subcontractor: 'Petrofac Electrical Works', supervisor: 'Lee Chong Wei',
      permitType: 'Hot Work', permitActive: false,
      complianceCategory: 'Housekeeping',
      computedSeverityWeight: 2,
    },
    {
      projectId, createdBy: userId,
      title: 'Excavation Edge Collapse (Unoccupied)',
      description: 'East trench wall slumped 0.6m overnight. No workers present. Shoring installed before work resumed.',
      severity: 'Warning', date: mo(-3), zoneId: 'Zone-E',
      incidentType: 'Near Miss', isLTI: false, manhours: 0,
      status: 'Closed', closedAt: mo(-3),
      subcontractor: 'Sapura Heavy Lift', supervisor: 'Ramli bin Yusof',
      permitType: 'Excavation', permitActive: true,
      complianceCategory: 'Work at Height',
      computedSeverityWeight: 2,
    },

    // ── Safety Observations (Info) ────────────────────────────────────────────
    {
      projectId, createdBy: userId,
      title: 'Toolbox Talk — Working at Height (Monthly)',
      description: 'Monthly TBT delivered to 48 workers covering fall arrest, scaffold inspection and exclusion zones.',
      severity: 'Info', date: mo(0), zoneId: 'Zone-A',
      incidentType: '', isLTI: false, manhours: 480,
      status: 'Closed', closedAt: mo(0),
      subcontractor: '', supervisor: 'Ahmad bin Hassan',
      complianceCategory: '',
      computedSeverityWeight: 1,
    },
    {
      projectId, createdBy: userId,
      title: 'PPE Audit — Zone B Electrical Team',
      description: '3 of 12 workers found without safety glasses during audit. Replacement issued on the spot.',
      severity: 'Info', date: mo(-1), zoneId: 'Zone-B',
      incidentType: '', isLTI: false, manhours: 120,
      status: 'Closed', closedAt: mo(-1),
      subcontractor: 'Petrofac Electrical Works', supervisor: 'Lee Chong Wei',
      complianceCategory: 'PPE Violation',
      computedSeverityWeight: 1,
    },
    {
      projectId, createdBy: userId,
      title: 'Housekeeping Inspection — Zone C Formwork Area',
      description: 'General inspection found acceptable housekeeping standard. Minor debris cleared.',
      severity: 'Info', date: mo(-2), zoneId: 'Zone-C',
      incidentType: '', isLTI: false, manhours: 80,
      status: 'Closed', closedAt: mo(-2),
      subcontractor: 'Bumi Armada Construction', supervisor: 'Nor Azizah bt Hamid',
      complianceCategory: 'Housekeeping',
      computedSeverityWeight: 1,
    },

    // ── Property Damage ───────────────────────────────────────────────────────
    {
      projectId, createdBy: userId,
      title: 'Forklift Struck Site Office Corner',
      description: 'Reversing forklift clipped corner of site office portacabin. Structural integrity checked, minor damage only.',
      severity: 'Warning', date: mo(-1), zoneId: 'Zone-A',
      incidentType: 'Property Damage', isLTI: false, manhours: 1600,
      status: 'Closed', closedAt: mo(0),
      subcontractor: 'Sapura Heavy Lift', supervisor: 'Ramli bin Yusof',
      permitType: '', permitActive: false,
      complianceCategory: 'Housekeeping',
      computedSeverityWeight: 2,
    },
  ]);
  console.log('Seeded 18 HSE incidents (v2 — full field coverage)');

  // --- Alerts ---
  await Alert.deleteMany({ projectId });
  await Alert.insertMany([
    { projectId, title: 'Concrete Pump Failure', severity: 'Critical', activityId: 'ACT-001', source: 'manual', date: new Date('2025-05-15'), createdBy: userId },
    { projectId, title: 'High Wind Warning', severity: 'Warning', activityId: 'ACT-002', source: 'iot', date: new Date('2025-06-20'), createdBy: userId },
    { projectId, title: 'Sensor Offline - Zone C', severity: 'Warning', activityId: 'ACT-003', source: 'iot', date: new Date('2025-07-01'), createdBy: userId },
    { projectId, title: 'Delivery Delay - Steel Beams', severity: 'Info', activityId: 'ACT-004', source: 'manual', date: new Date('2025-08-10'), createdBy: userId },
    { projectId, title: 'Temperature Sensor Alert', severity: 'Critical', activityId: 'ACT-005', source: 'iot', date: new Date('2025-09-25'), createdBy: userId },
    { projectId, title: 'Site Access Restricted', severity: 'Info', activityId: 'ACT-006', source: 'manual', date: new Date('2025-10-05'), createdBy: userId },
  ]);
  console.log('Seeded 6 alerts');

  // --- S-Curve ---
  await SCurve.deleteMany({ projectId });
  const months = ['2025-01','2025-02','2025-03','2025-04','2025-05','2025-06','2025-07','2025-08','2025-09','2025-10','2025-11','2025-12'];
  const baselineValues = [2, 5, 12, 22, 35, 48, 60, 72, 82, 90, 96, 100];
  const actualValues   = [1, 4, 10, 18, 30, 42, 55, 65, null, null, null, null];
  await SCurve.create({
    projectId,
    baseline: months.map((m, i) => ({ date: new Date(`${m}-15`), value: baselineValues[i] })),
    actual:   months.map((m, i) => actualValues[i] !== null ? { date: new Date(`${m}-15`), value: actualValues[i] } : null).filter(Boolean),
    updatedBy: userId,
  });
  console.log('Seeded S-curve data');

  // --- Media ---
  await Media.deleteMany({ projectId });
  await Media.insertMany([
    { projectId, url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400', name: 'Site Overview Aerial', type: 'image', uploadedBy: userId },
    { projectId, url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400', name: 'Foundation Work', type: 'image', uploadedBy: userId },
    { projectId, url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400', name: 'Steel Structure', type: 'image', uploadedBy: userId },
    { projectId, url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400', name: 'MEP Installation', type: 'image', uploadedBy: userId },
    { projectId, url: 'https://images.unsplash.com/photo-1517089596392-fb9a9033e05b?w=400', name: 'Facade Progress', type: 'image', uploadedBy: userId },
  ]);
  console.log('Seeded 5 media items');

  console.log('\n✅ Bootstrap + seed complete!');
  console.log(`   Project ID : ${projectId}`);
  console.log(`   Login      : demo@fusionxr.com / Demo@2026`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
