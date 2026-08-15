export default function Spinner({ size = 20, className = "" }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-accent border-t-transparent align-middle ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageLoader({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-500">
      <Spinner size={32} />
      <span className="text-sm">{label}</span>
    </div>
  );
}
