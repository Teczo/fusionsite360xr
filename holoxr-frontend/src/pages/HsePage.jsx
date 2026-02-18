import { useLocation } from 'react-router-dom';
import HSEList from '../components/ProjectModules/HSE/HSEList';
import EmptyState from '../components/ui/EmptyState';

export default function HsePage() {
  const location = useLocation();
  const projectId = new URLSearchParams(location.search).get('id');

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <EmptyState
          title="No project selected"
          description="Open a project from the dashboard to view HSE incidents."
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <HSEList projectId={projectId} />
    </div>
  );
}
