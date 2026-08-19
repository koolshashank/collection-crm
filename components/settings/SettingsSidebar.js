"use client";

import { CiIcon } from "@/components/client-info/icons";

/**
 * Left-hand settings navigation — mirrors the same tab set the page's
 * horizontal tab bar drives (both control the one `activeTab` state), just
 * given a persistent, always-visible home on larger screens.
 */
export default function SettingsSidebar({ tabs, activeTab, onSelect, supportEmail }) {
  return (
    <aside className="hidden w-56 shrink-0 lg:flex lg:flex-col lg:justify-between">
      <div>
        <div className="mb-4 flex items-center gap-2 px-2 text-xs font-bold uppercase tracking-widest text-accent-dark">
          <CiIcon name="settings" size={16} strokeWidth={2} />
          Settings
        </div>
        <nav className="space-y-1">
          {tabs.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onSelect(t.key)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  active ? "bg-accent-light text-accent-dark" : "text-gray-600 hover:bg-surface"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    active ? "bg-white text-accent-dark" : "bg-surface text-gray-400"
                  }`}
                >
                  <CiIcon name={t.icon} size={15} strokeWidth={2} />
                </span>
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-surface p-4">
        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm">
          <CiIcon name="headset" size={16} strokeWidth={2} />
        </div>
        <div className="text-[13px] font-bold text-gray-800">Need help?</div>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">Check our documentation or contact support.</p>
        <a href={`mailto:${supportEmail}`} className="btn-secondary mt-3 w-full !py-1.5 text-xs">
          Contact Support
        </a>
      </div>
    </aside>
  );
}
