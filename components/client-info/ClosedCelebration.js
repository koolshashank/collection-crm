"use client";

import { useEffect, useState } from "react";
import { CiIcon } from "./icons";
import { ciInr } from "./helpers";

/**
 * Confetti + success dialog for a CLOSED loan — port of the PHP block:
 *   confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
 *   Swal.fire({ icon:'success', title:'Loan Closed — ₹X', timer:2500 })
 */
export default function ClosedCelebration({ collectionAmount }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const confetti = (await import("canvas-confetti")).default;
        if (!cancelled) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      } catch {
        /* confetti is decorative — never block the page */
      }
    })();
    const t = setTimeout(() => setShow(false), 2500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[950] flex items-center justify-center bg-navy/40 p-4 backdrop-blur-[2px]">
      <div className="card flex w-full max-w-sm flex-col items-center gap-3 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-light text-accent">
          <CiIcon name="check" size={34} strokeWidth={2} />
        </div>
        <div className="font-display text-xl font-bold text-gray-800">
          Loan Closed — {ciInr(collectionAmount ?? 0)}
        </div>
      </div>
    </div>
  );
}
