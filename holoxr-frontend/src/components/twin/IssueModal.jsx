import { useState } from 'react';
import { X } from 'lucide-react';
import { issuesApi } from '../../services/api.js';

const SEVERITY_OPTIONS = ['Critical', 'Warning', 'Info'];
const TYPE_OPTIONS = ['RFI', 'Observation', 'Safety', 'Clash', 'Defect'];

const SEVERITY_COLORS = {
  Critical: 'text-red-400',
  Warning:  'text-amber-400',
  Info:     'text-blue-400',
};

/**
 * Modal for creating a spatial issue pin.
 *
 * Props:
 *   projectId  – MongoDB project ObjectId string
 *   position   – { x, y, z } world-space coordinates
 *   onClose    – called when modal is dismissed
 *   onCreated  – called with the newly saved issue object
 */
export default function IssueModal({ projectId, position, onClose, onCreated }) {
  const [title, setTitle]       = useState('');
  const [description, setDesc]  = useState('');
  const [severity, setSeverity] = useState('Warning');
  const [type, setType]         = useState('Observation');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const issue = await issuesApi.create(projectId, {
        title: title.trim(),
        description,
        severity,
        type,
        position,
      });
      onCreated(issue);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save issue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#0F172A] border border-white/10 rounded-2xl p-6 shadow-2xl text-white">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold">New Issue Pin</h2>
            <p className="text-xs text-white/40 mt-0.5 font-mono">
              ({position.x.toFixed(2)}, {position.y.toFixed(2)}, {position.z.toFixed(2)})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Title */}
          <div>
            <label className="block text-xs text-white/60 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Describe the issue…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-white/30 placeholder:text-white/25 transition-colors"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-white/60 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="Additional details…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-white/30 placeholder:text-white/25 resize-none transition-colors"
            />
          </div>

          {/* Severity + Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/60 mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-white/30 transition-colors"
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className={`text-xs mt-1 block ${SEVERITY_COLORS[severity]}`}>{severity}</span>
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-white/30 transition-colors"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-white text-gray-900 hover:bg-white/90 disabled:opacity-50 transition-all"
            >
              {loading ? 'Saving…' : 'Save Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
