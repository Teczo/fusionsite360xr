import { useEffect, useState, useRef } from 'react';
import { documentsApi } from '../../../services/api';
import { useRole } from '../../hooks/useRole';
import EmptyState from '../../ui/EmptyState';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { FileText, FileSpreadsheet, FileJson, FileType, Trash2, Download, Eye, X } from 'lucide-react';

export default function ProjectDocuments({ projectId }) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const fileRef = useRef(null);
    const { canEdit } = useRole(); // Assuming canEdit is enough for upload/delete documents

    const load = () => {
        setLoading(true);
        documentsApi.list(projectId)
            .then(setDocuments)
            .catch(() => setDocuments([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { if (projectId) load(); }, [projectId]);

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Allowed types check (optional client side, server also handles it implicitly by accepting blob)
        const allowedExtensions = ['csv', 'pdf', 'docx', 'xlsx', 'txt', 'json'];
        const ext = file.name.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            alert(`File type .${ext} is not supported directly. Please upload CSV, PDF, DOCX, XLSX, TXT, or JSON.`);
            if (fileRef.current) fileRef.current.value = '';
            return;
        }

        setUploading(true);
        try {
            await documentsApi.upload(projectId, file);
            load();
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Failed to upload document.');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const handleDelete = async () => {
        if (!confirmDeleteId) return;
        try {
            await documentsApi.remove(projectId, confirmDeleteId);
            load();
        } catch (err) {
            console.error('Delete failed', err);
            alert('Failed to delete document');
        } finally {
            setConfirmDeleteId(null);
        }
    };

    const openPreview = (doc) => {
        const type = doc.fileType?.toLowerCase();
        if (['pdf', 'csv', 'txt', 'json'].includes(type)) {
            setPreviewDoc(doc);
        } else {
            // Download for others
            window.open(doc.blobUrl, '_blank');
        }
    };

    const getIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'pdf': return <FileText className="text-red-500" />;
            case 'csv':
            case 'xlsx': return <FileSpreadsheet className="text-green-600" />;
            case 'json':
            case 'txt': return <FileText className="text-gray-500" />;
            case 'docx': return <FileText className="text-blue-600" />;
            default: return <FileType className="text-gray-400" />;
        }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    if (loading) return <LoadingSpinner />;

    return (
        <>
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[#111827]">Project Documents</h2>
                    {canEdit && (
                        <div>
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".csv,.pdf,.docx,.xlsx,.txt,.json"
                                onChange={handleUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileRef.current?.click()}
                                disabled={uploading}
                                className="rounded-xl border border-[#E6EAF0] bg-white px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB] transition disabled:opacity-50"
                            >
                                {uploading ? 'Uploading...' : '+ Upload Document'}
                            </button>
                        </div>
                    )}
                </div>

                {documents.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
                        <p className="text-sm font-medium text-gray-900">No documents uploaded yet.</p>
                        <p className="text-xs text-gray-500 mt-1">Upload project files to enable AI data processing.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {documents.map((doc) => (
                            <div key={doc._id} className="group relative rounded-lg border border-border bg-surface p-3 hover:shadow-md transition-shadow">

                                <div className="flex items-center justify-center h-24 bg-appbg rounded-lg mb-2 cursor-pointer" onClick={() => openPreview(doc)}>
                                    {getIcon(doc.fileType)}
                                </div>

                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-[#111827] truncate" title={doc.fileName}>{doc.fileName}</p>
                                    <div className="flex justify-between items-center text-[10px] text-[#6B7280]">
                                        <span>{doc.fileType?.toUpperCase()}</span>
                                        <span>{formatSize(doc.fileSize)}</span>
                                    </div>
                                    <p className="text-[10px] text-[#9CA3AF]">By {doc.uploadedBy?.name || 'Unknown'}</p>
                                    <p className="text-[10px] text-[#9CA3AF]">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                </div>

                                {/* Hover Actions */}
                                <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openPreview(doc); }}
                                        className="p-1 rounded-full bg-white border border-gray-200 text-gray-600 hover:text-blue-600 shadow-sm"
                                        title="View/Download"
                                    >
                                        {['pdf', 'csv', 'txt', 'json'].includes(doc.fileType?.toLowerCase()) ? <Eye size={12} /> : <Download size={12} />}
                                    </button>
                                    {canEdit && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(doc._id); }}
                                            className="p-1 rounded-full bg-white border border-gray-200 text-gray-600 hover:text-red-600 shadow-sm"
                                            title="Delete"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Document?</h3>
                        <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete this file? This action cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewDoc && (
                <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
            )}
        </>
    );
}

function DocumentPreviewModal({ doc, onClose }) {
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(false);
    const type = doc.fileType?.toLowerCase();

    useEffect(() => {
        if (['csv', 'txt', 'json'].includes(type)) {
            setLoading(true);
            fetch(doc.blobUrl)
                .then(res => res.text())
                .then(text => setContent(text))
                .catch(err => setContent('Failed to load content.'))
                .finally(() => setLoading(false));
        }
    }, [doc]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{doc.fileName}</h3>
                        <p className="text-xs text-gray-500">{new Date(doc.uploadedAt).toLocaleString()} • {doc.uploadedBy?.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto bg-gray-50 p-4">
                    {type === 'pdf' ? (
                        <iframe src={doc.blobUrl} className="w-full h-full min-h-[600px] rounded-lg border border-gray-200" title="PDF Preview"></iframe>
                    ) : (
                        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm min-h-[200px]">
                            {loading ? (
                                <div className="flex justify-center items-center h-40">
                                    <LoadingSpinner />
                                </div>
                            ) : type === 'csv' ? (
                                <CsvPreview content={content} />
                            ) : (
                                <pre className="text-xs font-mono whitespace-pre-wrap text-gray-800 overflow-x-auto">
                                    {content}
                                </pre>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <a
                        href={doc.blobUrl}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm"
                    >
                        Download Original
                    </a>
                </div>
            </div>
        </div>
    );
}

function CsvPreview({ content }) {
    if (!content) return null;
    const rows = content.split('\n').map(row => row.split(','));

    return (
        <div className="overflow-auto max-h-[600px]">
            <table className="min-w-full text-left text-xs text-gray-500">
                <thead className="bg-gray-100 text-gray-700 font-medium uppercase sticky top-0">
                    <tr>
                        {rows[0]?.map((header, i) => (
                            <th key={i} className="px-3 py-2 border-b border-gray-200 whitespace-nowrap">{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {rows.slice(1).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            {row.map((cell, j) => (
                                <td key={j} className="px-3 py-2 border-b border-gray-100 whitespace-nowrap">{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
