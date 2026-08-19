"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { postJson } from "@/lib/clientFetch";
import { useRouter } from "next/navigation";

export default function ChangePasswordModal({ open, onClose }) {
  const toast = useToast();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setNewPassword("");
    setConfirmPassword("");
  }

  function close() {
    reset();
    onClose?.();
  }

  async function submit() {
    if (!newPassword || newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters.");
    }
    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match.");
    }

    setSaving(true);
    const res = await postJson("/api/auth/change-password", { newPassword, confirmPassword });
    setSaving(false);

    if (!res.data?.success) {
      return toast.error(res.data?.message || res.error || "Failed to change password.");
    }

    toast.success("Password changed. Please log in again.");
    reset();
    onClose?.();
    await postJson("/api/auth/logout", {});
    router.push("/login");
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Change Password"
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={close} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Change Password"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div>
          <label className="label">New Password</label>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>
        <div>
          <label className="label">Confirm New Password</label>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
      </div>
    </Modal>
  );
}
