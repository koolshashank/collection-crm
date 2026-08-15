"use client";

import styles from "./settlement.module.css";

/**
 * Generic filter bar — a search input plus either a row of filter pills
 * or a plain <select>, matching whichever the PHP used for a given tab.
 */
export default function FilterBar({ search, onSearch, placeholder, pills, activePill, onPill, select }) {
  return (
    <div className={styles.filterBar}>
      {onSearch && (
        <input
          type="text"
          placeholder={placeholder || "Search…"}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      )}
      {pills &&
        pills.map((p) => (
          <span
            key={p.key}
            className={`${styles.fp} ${activePill === p.key ? styles.fpActive : ""}`}
            onClick={() => onPill(p.key)}
          >
            {p.label}
          </span>
        ))}
      {select && (
        <select value={select.value} onChange={(e) => select.onChange(e.target.value)}>
          {select.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
