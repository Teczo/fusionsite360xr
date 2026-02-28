import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { aiApi } from '../../services/api';

export default function FeedbackButtons({ auditLogId }) {
  const [feedback, setFeedback] = useState(null);

  if (!auditLogId) return null;

  async function handleFeedback(value) {
    if (feedback) return;
    setFeedback(value);
    try {
      await aiApi.submitFeedback(auditLogId, value);
    } catch (err) {
      console.error('Feedback failed:', err);
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => handleFeedback('helpful')}
        disabled={!!feedback}
        title="Helpful"
        className={`p-1 rounded-md transition-all disabled:cursor-default ${
          feedback === 'helpful'
            ? 'text-brand'
            : 'text-textsec hover:text-textpri'
        }`}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => handleFeedback('unhelpful')}
        disabled={!!feedback}
        title="Not helpful"
        className={`p-1 rounded-md transition-all disabled:cursor-default ${
          feedback === 'unhelpful'
            ? 'text-red-500'
            : 'text-textsec hover:text-textpri'
        }`}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
