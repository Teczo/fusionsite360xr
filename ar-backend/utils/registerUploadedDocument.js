import { BlobServiceClient } from '@azure/storage-blob';
import ProjectDocument from '../models/ProjectDocument.js';

/**
 * Register an uploaded CSV as a ProjectDocument so it appears in the Documents card.
 * Non-blocking — if this fails, the CSV upload still succeeds.
 *
 * @param {Object} params
 * @param {string} params.projectId
 * @param {Buffer} params.buffer - The file buffer
 * @param {string} params.originalName - Original filename
 * @param {string} params.mimetype - File MIME type
 * @param {number} params.size - File size in bytes
 * @param {string} params.category - e.g., 'cost-import', 'contractor-import', 'assignment-import'
 * @param {string} params.userId
 */
export async function registerUploadedDocument({ projectId, buffer, originalName, mimetype, size, category, userId }) {
    try {
        const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
        let blobUrl = '';

        // If Azure Storage is configured, upload the file
        if (conn) {
            const blobServiceClient = BlobServiceClient.fromConnectionString(conn);
            const containerClient = blobServiceClient.getContainerClient('uploads');

            const timestamp = Date.now();
            const blobName = `projects/${projectId}/documents/${timestamp}-${category}-${originalName}`;
            const blockBlob = containerClient.getBlockBlobClient(blobName);

            await blockBlob.uploadData(buffer, {
                blobHTTPHeaders: { blobContentType: mimetype || 'text/csv' },
            });

            blobUrl = blockBlob.url;
        }

        // Create the ProjectDocument record regardless of blob upload success,
        // so it shows up in the Documents card (maybe just lacking a download link)
        const doc = new ProjectDocument({
            projectId,
            fileName: originalName,
            fileType: 'csv',
            fileSize: size || buffer.length,
            blobUrl: blobUrl || 'local-upload',
            uploadedBy: userId,
            documentCategory: category,
            datasetType: category,
            tags: [category, 'csv-import']
        });

        await doc.save();
        return doc;
    } catch (err) {
        // Non-blocking — log but don't fail the upload
        console.error(`Document cross-registration failed for ${category}:`, err.message);
        return null;
    }
}
