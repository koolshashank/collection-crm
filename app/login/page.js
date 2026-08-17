"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/nav/Icon";
import Spinner from "@/components/ui/Spinner";
import { postJson } from "@/lib/clientFetch";
import { useCompanyConfig } from "@/components/company/CompanyConfigProvider";

export default function LoginPage() {
  const router = useRouter();
  const { appName, tagline, logoUrl } = useCompanyConfig();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // step: "credentials" | "code" | "setup"
  const [step, setStep] = useState("credentials");
  const [code, setCode] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [secret, setSecret] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    const res = await postJson("/api/auth/login", { username: username.trim(), password: password.trim() });

    if (res.ok && res.data?.success) {
      if (res.data.requires2FA) {
        setLoading(false);
        setStep("code");
        return;
      }
      if (res.data.requiresSetup) {
        const setupRes = await postJson("/api/auth/setup-2fa", {});
        setLoading(false);
        if (setupRes.ok && setupRes.data?.success) {
          setQrCodeDataUrl(setupRes.data.qrCodeDataUrl);
          setSecret(setupRes.data.secret);
          setStep("setup");
        } else {
          setError(setupRes.data?.message || setupRes.error || "Could not start two-factor setup. Please try again.");
        }
        return;
      }
      setLoading(false);
      router.push(res.data.redirect || "/dashboard");
      router.refresh();
    } else {
      setLoading(false);
      setError(res.data?.message || res.error || "Login failed. Please try again.");
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setLoading(true);
    const res = await postJson("/api/auth/verify-2fa", { code: code.trim() });
    setLoading(false);
    if (res.ok && res.data?.success) {
      router.push(res.data.redirect || "/dashboard");
      router.refresh();
    } else {
      setError(res.data?.message || res.error || "Invalid code. Please try again.");
    }
  };

  const backToCredentials = () => {
    setStep("credentials");
    setCode("");
    setQrCodeDataUrl("");
    setSecret("");
    setError("");
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-navy p-12 lg:flex">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent shadow-[0_4px_16px_rgba(15,155,142,.4)]">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={appName} className="h-full w-full object-cover" />
            ) : (
              <Icon name="shield-check" size={22} className="text-white" strokeWidth={2} />
            )}
          </span>
          <div className="leading-tight">
            <p className="font-display text-lg text-white">{appName}</p>
            <p className="text-[11px] font-medium uppercase tracking-[.1em] text-white/50">{tagline}</p>
          </div>
        </div>
        <div className="relative">
          <h1 className="font-display text-4xl font-bold leading-tight text-white">
            Recover smarter.
            <br />
            Collect faster.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
            Portfolio, promises to pay, field visits, settlements and NOCs — everything your collection team needs, in
            one place.
          </p>
        </div>
        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} {tagline}. All rights reserved.</p>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center bg-surface px-4 py-10 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={appName} className="h-full w-full object-cover" />
              ) : (
                <Icon name="shield-check" size={20} className="text-white" strokeWidth={2} />
              )}
            </span>
            <div className="leading-tight">
              <p className="font-display text-base text-gray-800">{appName}</p>
              <p className="text-[10px] font-medium uppercase tracking-[.1em] text-gray-400">{tagline}</p>
            </div>
          </div>

          <h2 className="font-display text-2xl font-bold text-gray-800">
            {step === "setup" ? "Set up two-factor authentication" : step === "code" ? "Verification code" : "Sign in"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {step === "setup"
              ? "Scan this QR code with Google Authenticator, then enter the code it shows."
              : step === "code"
              ? "Enter the 6-digit code from your authenticator app."
              : "Use your employee credentials to continue."}
          </p>

          {error && (
            <div className="mt-5 rounded-lg border-l-4 border-danger bg-red-50 px-4 py-3 text-sm font-medium text-danger" role="alert">
              {error}
            </div>
          )}

          {step === "code" || step === "setup" ? (
            <form onSubmit={submitCode} className="mt-6 space-y-4" noValidate>
              {step === "setup" && (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface p-5">
                  {qrCodeDataUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrCodeDataUrl}
                      alt="Two-factor setup QR code"
                      className="h-44 w-44 rounded-lg bg-white p-2"
                    />
                  )}
                  <div className="text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Can&apos;t scan? Enter this key manually
                    </div>
                    <code className="mt-1 inline-block rounded bg-white px-2 py-1 text-xs text-gray-700">{secret}</code>
                  </div>
                </div>
              )}
              <div>
                <label className="label" htmlFor="code">Authentication code</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Icon name="shield-check" size={15} />
                  </span>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    className="input pl-9 tracking-[0.3em]"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner size={16} className="border-white border-t-transparent" /> Verifying…
                  </>
                ) : step === "setup" ? (
                  "Confirm & Continue"
                ) : (
                  "Verify"
                )}
              </button>
              <button
                type="button"
                onClick={backToCredentials}
                className="w-full text-center text-xs font-semibold text-accent hover:text-accent-dark"
                disabled={loading}
              >
                ‹ Back to login
              </button>
            </form>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              <div>
                <label className="label" htmlFor="username">Email</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Icon name="user" size={15} />
                  </span>
                  <input
                    id="username"
                    type="email"
                    autoComplete="username"
                    className="input pl-9"
                    placeholder="you@company.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="password">Password</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Icon name="lock" size={15} />
                  </span>
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    className="input pl-9 pr-14"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-accent hover:text-accent-dark"
                    tabIndex={-1}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner size={16} className="border-white border-t-transparent" /> Signing in…
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-xs text-gray-400">
            Authorized personnel only. Sessions are monitored.
          </p>
        </div>
      </div>
    </div>
  );
}
