export default function EmptyState({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="text-4xl mb-3 text-border">{icon}</div>}
      <p className="text-sm font-semibold text-textsec">{title}</p>
      {description && <p className="text-xs text-texttert mt-1 max-w-xs">{description}</p>}
    </div>
  );
}
