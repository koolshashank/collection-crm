import Link from "next/link";

/**
 * Catch-all for modules that exist in the menu but whose source pages
 * were not part of the migrated bundle (payments, reports, settlement…).
 */
export default function ModuleNotMigrated() {
  return (
    <div className="card mx-auto mt-16 max-w-lg p-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-light text-2xl">🚧</div>
      <h1 className="font-display text-xl font-bold text-gray-800">Module not migrated yet</h1>
      <p className="mt-2 text-sm text-gray-500">
        This module was not included in the source bundle that was converted to Next.js. Its menu entry is preserved so
        it can be plugged in later without touching navigation.
      </p>
      <Link href="/dashboard" className="btn-primary mt-6">
        Back to Dashboard
      </Link>
    </div>
  );
}
