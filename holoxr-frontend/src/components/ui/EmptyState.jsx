export default function EmptyState({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="text-4xl mb-3 text-[#D1D5DB]">{icon}</div>}
      <p className="text-sm font-semibold text-[#6B7280]">{title}</p>
      {description && <p className="text-xs text-[#9CA3AF] mt-1 max-w-xs">{description}</p>}
    </div>
  );
}
