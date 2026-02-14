export default function ChartContainer({ children, className = '' }) {
  return (
    <div className={`w-full h-[250px] ${className}`}>
      {children}
    </div>
  );
}
