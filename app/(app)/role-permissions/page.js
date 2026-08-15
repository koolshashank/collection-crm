"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientFetch, postJson } from "@/lib/clientFetch";
import Spinner, { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { MENU_SECTIONS, ALL_ROLES } from "@/components/nav/menuConfig";

const ROLE_LABELS = {
  ADMIN: "Admin",
  "COLLECTION-HEAD": "Collection Head",
  "COLLECTION-EXECUTIVE": "Collection Exec.",
  VISITOR: "Visitor",
  ACCOUNTS: "Accounts",
  RECOVERY_HEAD: "Recovery Head",
  ACM: "ACM",
};

/** Effective checkbox state for one item+role: saved override, else the item's default. */
function resolveChecked(item, role, saved) {
  const override = saved?.[item.href]?.[role];
  if (typeof override === "boolean") return override;
  return !item.roles || item.roles.includes(role);
}

function buildMatrix(saved) {
  const matrix = {};
  for (const section of MENU_SECTIONS) {
    for (const item of section.items) {
      matrix[item.href] = {};
      for (const role of ALL_ROLES) {
        matrix[item.href][role] = resolveChecked(item, role, saved);
      }
    }
  }
  return matrix;
}

export default function RolePermissionsPage() {
  const router = useRouter();
  const { success, error: toastError, info } = useToast();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [original, setOriginal] = useState({});
  const [current, setCurrent] = useState({});

  const dirty = JSON.stringify(original) !== JSON.stringify(current);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const me = await clientFetch("/api/auth/me");
    const roles = me.ok ? me.data?.user?.roles ?? [] : [];
    const isAdmin = roles.includes("ADMIN") || roles.includes("COLLECTION-HEAD") || roles.includes("RECOVERY_HEAD");
    if (!isAdmin) {
      router.replace("/dashboard");
      return;
    }
    setAllowed(true);

    const res = await clientFetch("/api/role-permissions");
    if (!res.ok || !res.data?.success) {
      setError(res.data?.message || "Could not load role permissions.");
      setLoading(false);
      return;
    }

    const matrix = buildMatrix(res.data.permissions ?? {});
    setOriginal(matrix);
    setCurrent(matrix);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function toggle(href, role) {
    setCurrent((c) => ({ ...c, [href]: { ...c[href], [role]: !c[href][role] } }));
  }

  async function saveAll() {
    setSaving(true);
    const res = await postJson("/api/role-permissions", current);
    setSaving(false);
    if (res.ok && res.data?.success) {
      setOriginal({ ...current });
      success("Role permissions saved");
    } else {
      toastError(res.data?.message || "Save failed");
    }
  }

  function discard() {
    setCurrent({ ...original });
    info("Changes discarded");
  }

  if (loading || !allowed) return <PageLoader label="Loading role permissions…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="mx-auto max-w-6xl pb-16">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-3.5">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-accent-light px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent-dark">
            Admin Only
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-800">Role Permissions</h1>
          <p className="mt-1 text-sm text-gray-500">Control which sidebar menu items each role can see</p>
        </div>
        <Link href="/dashboard" className="btn-secondary">
          ‹ Back
        </Link>
      </div>

      <div className="card mb-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface">
                <th className="th sticky left-0 bg-surface">Menu Item</th>
                {ALL_ROLES.map((role) => (
                  <th key={role} className="th whitespace-nowrap text-center">{ROLE_LABELS[role] || role}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MENU_SECTIONS.map((section) => (
                <Fragment key={section.label}>
                  <tr className="border-b border-line bg-accent-light/30">
                    <td colSpan={ALL_ROLES.length + 1} className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-accent-dark">
                      {section.label}
                    </td>
                  </tr>
                  {section.items.map((item) => (
                    <tr key={item.href} className="border-b border-line last:border-0 hover:bg-accent-light/20">
                      <td className="td sticky left-0 bg-white font-medium text-gray-800">{item.label}</td>
                      {ALL_ROLES.map((role) => (
                        <td key={role} className="td text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer accent-accent"
                            checked={Boolean(current[item.href]?.[role])}
                            onChange={() => toggle(item.href, role)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {dirty && (
        <div className="sticky bottom-4 z-40 mt-5 flex flex-wrap items-center justify-between gap-3.5 rounded-2xl bg-navy px-5 py-3.5 text-white shadow-pop">
          <div className="flex items-center gap-2 text-sm font-medium">⚠ You have unsaved permission changes</div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={discard}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Discard
            </button>
            <button type="button" className="btn-primary" onClick={saveAll} disabled={saving}>
              {saving ? (
                <span className="flex items-center gap-2">
                  <Spinner size={14} className="border-white border-t-transparent" /> Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
