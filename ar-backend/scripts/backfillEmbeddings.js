/**
 * Backfill embeddings for existing ProjectDocuments.
 *
 * Run manually:
 *   node scripts/backfillEmbeddings.js
 *
 * Prerequisites:
 *   - MONGODB_URI and OPENAI_API_KEY must be set in environment
 *   - For PDFs: documents must be accessible via their blobUrl
 *
 * What it does:
 *   1. Finds all ProjectDocuments where embedding is null/empty
 *   2. For CSV/TXT: downloads from Azure, extracts text, generates embedding
 *   3. For PDF: downloads from Azure, extracts text with pdf-parse, generates embedding
 *   4. Updates each document with extractedText + embedding
 *
 * Safe to run multiple times — only processes documents without embeddings.
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import fetch from 'node-fetch';
import ProjectDocument from '../models/ProjectDocument.js';
import { generateEmbedding } from '../services/ai/embeddingService.js';
import { extractTextFromBuffer } from '../utils/pdfExtractor.js';

const MONGODB_URI = process.env.MONGODB_URI;
const BATCH_SIZE = 10;
const DELAY_MS = 1000; // Rate limit protection for OpenAI

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is not set');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  // Find documents without embeddings
  const docs = await ProjectDocument.find({
    $or: [
      { embedding: { $exists: false } },
      { embedding: null },
      { embedding: { $size: 0 } }
    ]
  }).select('_id fileName fileType blobUrl').lean();

  console.log(`Found ${docs.length} documents without embeddings.`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);

    for (const doc of batch) {
      try {
        console.log(`[${processed + skipped + errors + 1}/${docs.length}] Processing: ${doc.fileName}`);

        if (!doc.blobUrl) {
          console.log('  Skipped: no blobUrl');
          skipped++;
          continue;
        }

        // Download file from Azure
        const buffer = await downloadBuffer(doc.blobUrl);

        // Extract text
        const extractedText = await extractTextFromBuffer(buffer, doc.fileType);

        if (!extractedText || extractedText.trim().length === 0) {
          console.log('  Skipped: no text extracted');
          skipped++;
          continue;
        }

        // Generate embedding
        const embedding = await generateEmbedding(extractedText);

        if (!embedding) {
          console.log('  Warning: embedding generation failed');
          // Still save the extracted text
          await ProjectDocument.findByIdAndUpdate(doc._id, { extractedText });
          errors++;
          continue;
        }

        // Update document
        await ProjectDocument.findByIdAndUpdate(doc._id, {
          extractedText,
          embedding
        });

        console.log(`  Done (${extractedText.length} chars, ${embedding.length}-dim vector)`);
        processed++;
      } catch (err) {
        console.error(`  Error: ${err.message}`);
        errors++;
      }
    }

    // Rate limit between batches
    if (i + BATCH_SIZE < docs.length) {
      console.log(`  Waiting ${DELAY_MS}ms (rate limit)...`);
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nComplete: ${processed} processed, ${skipped} skipped, ${errors} errors`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
