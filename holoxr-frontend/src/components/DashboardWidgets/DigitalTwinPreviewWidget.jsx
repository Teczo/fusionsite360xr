import Card from '../ui/Card';

export default function DigitalTwinPreviewWidget({ projects, onOpen }) {
  const published = projects?.filter((p) => p.published) || [];

  return (
    <Card title="3D Digital Twin" menu>
      {published.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="text-4xl mb-3 text-border">&#9634;</div>
          <p className="text-sm font-semibold text-textsec">No published projects</p>
          <p className="text-xs text-texttert mt-1">Publish a project to see it here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {published.slice(0, 4).map((p) => (
            <button
              key={p._id}
              onClick={() => onOpen(p._id)}
              className="w-full flex items-center gap-3 rounded-xl border border-border bg-appbg px-3 py-2 hover:bg-brand-50 transition text-left"
            >
              {p.thumbnail ? (
                <img src={p.thumbnail} alt={p.name} className="h-10 w-14 rounded-lg object-cover border border-border" />
              ) : (
                <div className="h-10 w-14 rounded-lg bg-gradient-to-b from-appbg to-border border border-border flex items-center justify-center text-xs text-texttert">3D</div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium text-textpri truncate">{p.name}</div>
                <div className="text-xs text-texttert">Published</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
