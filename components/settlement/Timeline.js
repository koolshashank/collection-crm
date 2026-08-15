"use client";

import styles from "./settlement.module.css";
import { fmtDateTime } from "./settlementUtils";

const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const CROSS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/** Small step timeline using settlement.php's own .tl-item / .tl-dot design. */
export default function Timeline({ row }) {
  const steps = [
    { label: "Request raised", sub: `${row.raisedBy || "—"} · ${fmtDateTime(row.raisedOn)}`, state: "done" },
  ];

  if (row.status === "pending") {
    steps.push({ label: "Awaiting admin decision", sub: "Pending review", state: "current" });
  } else if (row.status === "approved") {
    steps.push({ label: "Approved", sub: `${row.decidedBy || "Admin"} · ${fmtDateTime(row.decidedOn)}`, state: "done" });
    steps.push({
      label: row.letterSent ? "Letter sent to customer" : "Letter pending",
      sub: row.letterSent ? `Sent to ${row.letterSentTo} · ${fmtDateTime(row.letterSentOn)}` : "Not yet dispatched",
      state: row.letterSent ? "done" : "current",
    });
  } else if (row.status === "rejected") {
    steps.push({ label: "Rejected", sub: `${row.decidedBy || "Admin"} · ${fmtDateTime(row.decidedOn)}`, state: "alert" });
  }

  return (
    <div className={styles.timelineWrap}>
      {steps.map((s, i) => {
        const isLast = i === steps.length - 1;
        const dotCls =
          s.state === "done" ? styles.tlDotDone : s.state === "alert" ? styles.tlDotAlert : s.state === "current" ? styles.tlDotCurrent : "";
        return (
          <div key={i} className={`${styles.tlItem} ${!isLast ? styles.tlItemLine : ""}`}>
            <div className={`${styles.tlDot} ${dotCls}`}>
              {s.state === "done" && CHECK}
              {s.state === "alert" && CROSS}
            </div>
            <div>
              <div className={styles.tlLabel}>{s.label}</div>
              <div className={styles.tlSub}>{s.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
