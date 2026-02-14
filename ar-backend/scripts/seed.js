/**
 * Seed script: populates sample data for a given project.
 *
 * Usage:
 *   MONGODB_URI=<your-uri> PROJECT_ID=<id> node scripts/seed.js
 *
 * This creates sample timeline, HSE, alert, s-curve, and media records
 * for the specified project (or the first project found for the first user).
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Timeline from '../models/Timeline.js';
import HSE from '../models/HSE.js';
import Alert from '../models/Alert.js';
import SCurve from '../models/SCurve.js';
import Media from '../models/Media.js';
import Project from '../models/Project.js';

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  let projectId = process.env.PROJECT_ID;

  if (!projectId) {
    const project = await Project.findOne().sort({ createdAt: -1 });
    if (!project) {
      console.error('No projects found. Create a project first.');
      process.exit(1);
    }
    projectId = project._id;
    console.log(`Using project: ${project.name} (${projectId})`);
  }

  const userId = (await Project.findById(projectId))?.userId;

  // --- Timeline ---
  await Timeline.deleteMany({ projectId });
  const timelineItems = [
    { projectId, title: 'Project Kickoff', description: 'Initial project planning and team assembly completed.', date: new Date('2025-01-15'), type: 'milestone', createdBy: userId },
    { projectId, title: 'Foundation Complete', description: 'Foundation work finished ahead of schedule.', date: new Date('2025-03-01'), type: 'milestone', createdBy: userId },
    { projectId, title: 'Steel Erection Started', description: 'Structural steel erection commenced on Zone A.', date: new Date('2025-04-10'), type: 'progress_update', createdBy: userId },
    { projectId, title: 'Crane Incident', description: 'Minor crane malfunction during lift operation. No injuries.', date: new Date('2025-05-02'), type: 'incident', createdBy: userId },
    { projectId, title: 'MEP Rough-In', description: 'Mechanical, electrical, and plumbing rough-in started.', date: new Date('2025-06-15'), type: 'progress_update', createdBy: userId },
    { projectId, title: 'Facade Installation', description: 'Curtain wall facade installation 60% complete.', date: new Date('2025-08-20'), type: 'progress_update', createdBy: userId },
    { projectId, title: 'Interior Fit-Out', description: 'Interior finishing work commenced on floors 1-5.', date: new Date('2025-10-01'), type: 'milestone', createdBy: userId },
  ];
  await Timeline.insertMany(timelineItems);
  console.log(`Seeded ${timelineItems.length} timeline items`);

  // --- HSE ---
  await HSE.deleteMany({ projectId });
  const hseItems = [
    { projectId, title: 'Fall Protection Violation', description: 'Worker observed without harness at elevation.', severity: 'Critical', date: new Date('2025-05-10'), createdBy: userId },
    { projectId, title: 'Noise Level Exceeded', description: 'Noise levels in Zone B exceeded 85dB without PPE.', severity: 'Warning', date: new Date('2025-06-01'), createdBy: userId },
    { projectId, title: 'Fire Drill Conducted', description: 'Quarterly fire evacuation drill completed successfully.', severity: 'Info', date: new Date('2025-07-15'), createdBy: userId },
    { projectId, title: 'Scaffolding Deficiency', description: 'Missing guardrails on level 3 scaffolding.', severity: 'Critical', date: new Date('2025-08-05'), createdBy: userId },
    { projectId, title: 'Chemical Spill', description: 'Minor diesel spill near generator area, contained within 30 min.', severity: 'Warning', date: new Date('2025-09-12'), createdBy: userId },
  ];
  await HSE.insertMany(hseItems);
  console.log(`Seeded ${hseItems.length} HSE incidents`);

  // --- Alerts ---
  await Alert.deleteMany({ projectId });
  const alertItems = [
    { projectId, title: 'Concrete Pump Failure', severity: 'Critical', source: 'manual', date: new Date('2025-05-15'), createdBy: userId },
    { projectId, title: 'High Wind Warning', severity: 'Warning', source: 'iot', date: new Date('2025-06-20'), createdBy: userId },
    { projectId, title: 'Sensor Offline - Zone C', severity: 'Warning', source: 'iot', date: new Date('2025-07-01'), createdBy: userId },
    { projectId, title: 'Delivery Delay - Steel Beams', severity: 'Info', source: 'manual', date: new Date('2025-08-10'), createdBy: userId },
    { projectId, title: 'Temperature Sensor Alert', severity: 'Critical', source: 'iot', date: new Date('2025-09-25'), createdBy: userId },
    { projectId, title: 'Site Access Restricted', severity: 'Info', source: 'manual', date: new Date('2025-10-05'), createdBy: userId },
  ];
  await Alert.insertMany(alertItems);
  console.log(`Seeded ${alertItems.length} alerts`);

  // --- S-Curve ---
  await SCurve.deleteMany({ projectId });
  const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];
  const baselineValues = [2, 5, 12, 22, 35, 48, 60, 72, 82, 90, 96, 100];
  const actualValues = [1, 4, 10, 18, 30, 42, 55, 65, null, null, null, null];

  const baseline = months.map((m, i) => ({ date: new Date(`${m}-15`), value: baselineValues[i] }));
  const actual = months
    .map((m, i) => actualValues[i] !== null ? { date: new Date(`${m}-15`), value: actualValues[i] } : null)
    .filter(Boolean);

  await SCurve.create({ projectId, baseline, actual, updatedBy: userId });
  console.log('Seeded S-curve data');

  // --- Media (placeholder URLs) ---
  await Media.deleteMany({ projectId });
  const mediaItems = [
    { projectId, url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400', name: 'Site Overview Aerial', type: 'image', uploadedBy: userId },
    { projectId, url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400', name: 'Foundation Work', type: 'image', uploadedBy: userId },
    { projectId, url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400', name: 'Steel Structure', type: 'image', uploadedBy: userId },
    { projectId, url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400', name: 'MEP Installation', type: 'image', uploadedBy: userId },
    { projectId, url: 'https://images.unsplash.com/photo-1590496793907-51d60c tried?w=400', name: 'Safety Inspection', type: 'image', uploadedBy: userId },
    { projectId, url: 'https://images.unsplash.com/photo-1517089596392-fb9a9033e05b?w=400', name: 'Facade Progress', type: 'image', uploadedBy: userId },
  ];
  await Media.insertMany(mediaItems);
  console.log(`Seeded ${mediaItems.length} media items`);

  console.log('\nSeed complete!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
