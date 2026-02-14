const SEVERITY_STYLES = {
  Critical: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]',
  Warning: 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]',
  Info: 'bg-[#DBEAFE] text-[#1E40AF] border-[#93C5FD]',
  milestone: 'bg-[#EDE9FE] text-[#6D28D9] border-[#C4B5FD]',
  incident: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]',
  progress_update: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
};

export default function Badge({ label, variant }) {
  const styles = SEVERITY_STYLES[variant] || 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]';
  return (
    <span className={`inline-flex items-center rounded-lg border px-2 py-[2px] text-xs font-semibold ${styles}`}>
      {label}
    </span>
  );
}
