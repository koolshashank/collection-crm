"use client";

/**
 * GlobalWidgets — mounted once inside app/(app)/layout.js (mirrors the two
 * footer.php includes: popup_notifier.php + convox_widget.php).
 * PopupNotifier sits bottom-RIGHT, ConvoxWidget bottom-LEFT — no overlap.
 */

import PopupNotifier from "./PopupNotifier";
import ConvoxWidget from "./ConvoxWidget";

export default function GlobalWidgets() {
  return (
    <>
      <PopupNotifier />
      <ConvoxWidget />
    </>
  );
}
