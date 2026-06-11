"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Eye, EyeOff, Lock } from "lucide-react";
import { Logo } from "@/components/logo";
import { toast } from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [otp, setOtp] = useState("");
  const [mustChange, setMustChange] = useState(false);
  const [changePassword, setChangePassword] = useState("");
  const [userId, setUserId] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, otp: otp || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.mfaRequired) setMfaRequired(true);
        toast.error(data.error || "Login failed");
        return;
      }

      if (data.user.mustChangePassword) {
        setMustChange(true);
        setUserId(data.user.id);
        return;
      }

      toast.success("Welcome back!");
      // Use window.location for full page navigation to ensure
      // the new session cookie is sent with the first request
      window.location.href = "/dashboard";
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // The user just authenticated with `password`, so we know it.
      // Sending it back as `currentPassword` is required by the new strict
      // change-password endpoint.
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          currentPassword: password,
          newPassword: changePassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to change password");
        return;
      }

      // The new password is now active — take them straight to the dashboard
      // rather than forcing a re-login.
      toast.success("Password updated");
      setMustChange(false);
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <Logo size={36} className="text-foreground" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Tessera
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Team productivity platform
          </p>
        </div>

        {mustChange ? (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2 text-primary">
                <Lock size={18} />
                <span className="text-sm font-semibold">
                  Change Required Password
                </span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={changePassword}
                    onChange={(e) => setChangePassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                    minLength={8}
                  />
                </div>
                {mfaRequired && (
                  <div>
                    <label
                      htmlFor="otp"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      Authentication code
                    </label>
                    <input
                      id="otp"
                      value={otp}
                      onChange={(event) => setOtp(event.target.value)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="6-digit code or recovery code"
                      className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                      required
                    />
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    "Update Password"
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="username"
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    Username or email
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="admin"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 pr-10 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    "Sign In"
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
