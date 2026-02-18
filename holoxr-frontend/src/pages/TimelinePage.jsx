import { useLocation } from 'react-router-dom';
import TimelineList from '../components/ProjectModules/Timeline/TimelineList';
import EmptyState from '../components/ui/EmptyState';

export default function TimelinePage() {
  const location = useLocation();
  const projectId = new URLSearchParams(location.search).get('id');

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <EmptyState
          title="No project selected"
          description="Open a project from the dashboard to view its timeline."
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <TimelineList projectId={projectId} />
    </div>
  );
}
