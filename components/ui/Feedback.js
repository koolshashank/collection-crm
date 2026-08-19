"use client";

export function EmptyState({ title = "No data found", hint, icon = "📭" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm font-semibold text-gray-600">{title}</p>
      {hint && <p className="max-w-sm text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message = "Something went wrong.", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl">⚠️</div>
      <p className="max-w-md text-sm font-medium text-danger">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary">
          Try again
        </button>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow, icon }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-light text-accent">
            {icon}
          </div>
        )}
        <div>
          {eyebrow && <div className="mb-1">{eyebrow}</div>}
          <h1 className="font-display text-xl font-bold text-gray-800 sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, sub, tone = "default", icon }) {
  const tones = {
    default: "text-gray-800",
    accent: "text-accent-dark",
    danger: "text-danger",
    amber: "text-amber",
    info: "text-info",
  };
  return (
    <div className="card flex items-center gap-4 p-4">
      {icon && (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-light text-lg">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
        <p className={`truncate text-xl font-bold ${tones[tone]}`}>{value}</p>
        {sub && <p className="truncate text-xs text-gray-500">{sub}</p>}
      </div>
    </div>
  );
}
