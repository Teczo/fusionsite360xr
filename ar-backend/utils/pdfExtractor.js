import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * Extract text content from a file buffer.
 * Supports PDF and plain text files.
 * Returns empty string on failure — never throws.
 */
export async function extractTextFromBuffer(buffer, fileType) {
  if (!buffer) return '';

  try {
    const type = (fileType || '').toLowerCase();

    if (type === 'pdf') {
      const data = await pdfParse(buffer);
      return data.text || '';
    }

    if (type === 'csv' || type === 'txt') {
      return buffer.toString('utf-8');
    }

    // For docx, xlsx, etc. — return empty for now
    // These can be added later with mammoth (docx) or xlsx packages
    return '';
  } catch (err) {
    console.error('Text extraction failed:', err.message);
    return '';
  }
}
