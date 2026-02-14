export default function Card({ title, menu, onMenuClick, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-[#E6EAF0] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)] ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
        {menu && (
          <button
            onClick={onMenuClick}
            className="text-[#9CA3AF] hover:text-[#6B7280] text-lg leading-none"
          >
            &bull;&bull;&bull;
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
