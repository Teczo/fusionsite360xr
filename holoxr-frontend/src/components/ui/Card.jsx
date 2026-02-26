export default function Card({ title, menu, onMenuClick, children, className = '' }) {
  return (
    <div className={`rounded-lg border border-border bg-surface p-5 shadow-card transition-shadow duration-150 hover:shadow-card-hover ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-textpri" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>{title}</h3>
        {menu && (
          <button
            onClick={onMenuClick}
            className="text-texttert hover:text-textsec text-lg leading-none"
          >
            &bull;&bull;&bull;
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
