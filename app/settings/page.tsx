"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock, Bell, Save, User, Shield, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { toast } from "react-hot-toast";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notifEnabled, setNotifEnabled] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    },
  });

  function validatePasswords() {
    const e: Record<string, string> = {};
    if (!currentPassword) e.currentPassword = "Current password is required";
    if (!newPassword) e.newPassword = "New password is required";
    else if (newPassword.length < 8)
      e.newPassword = "Must be at least 8 characters";
    if (newPassword !== confirmPassword)
      e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!validatePasswords()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          currentPassword: currentPassword,
          newPassword,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to change password");
        return;
      }
      toast.success("Password updated");
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      setErrors({});
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function requestNotifications() {
    if (!("Notification" in window)) {
      toast.error("Browser notifications not supported");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotifEnabled(true);
      toast.success("Notifications enabled");
      new Notification("Tessera", { body: "Notifications are now enabled!" });
    } else {
      toast.error("Permission denied");
    }
  }

  return (
    <AppShell>
      <div className="space-y-8 max-w-xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
        </div>

        {/* Profile */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-foreground">
            <User size={18} />
            <h2 className="font-semibold">Profile</h2>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium text-foreground">
                {user?.name}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium text-foreground">
                {user?.email}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <span className="text-sm text-muted-foreground">Role</span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                {user?.isAdmin ? (
                  <>
                    <Shield size={12} className="text-primary" />
                    Administrator
                  </>
                ) : (
                  "Member"
                )}
              </span>
            </div>
          </div>
        </section>

        {/* Password */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-foreground">
            <Lock size={18} />
            <h2 className="font-semibold">Change Password</h2>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (errors.currentPassword)
                    setErrors((p) => ({ ...p, currentPassword: "" }));
                }}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                placeholder="••••••••"
                aria-invalid={!!errors.currentPassword}
                aria-describedby={
                  errors.currentPassword ? "current-password-error" : undefined
                }
                autoComplete="current-password"
              />
              {errors.currentPassword && (
                <p
                  id="current-password-error"
                  className="mt-1 text-xs text-destructive"
                >
                  {errors.currentPassword}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errors.newPassword)
                    setErrors((p) => ({ ...p, newPassword: "" }));
                }}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                placeholder="••••••••"
                aria-invalid={!!errors.newPassword}
                aria-describedby={
                  errors.newPassword ? "password-error" : undefined
                }
              />
              {errors.newPassword && (
                <p
                  id="password-error"
                  className="mt-1 text-xs text-destructive"
                >
                  {errors.newPassword}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword)
                    setErrors((p) => ({ ...p, confirmPassword: "" }));
                }}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                placeholder="••••••••"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={
                  errors.confirmPassword ? "confirm-error" : undefined
                }
              />
              {errors.confirmPassword && (
                <p id="confirm-error" className="mt-1 text-xs text-destructive">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className={cn(buttonVariants({ size: "lg" }), "px-4")}
            >
              <Save size={16} />
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </section>

        {/* Notifications */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-foreground">
            <Bell size={18} />
            <h2 className="font-semibold">Notifications</h2>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Browser notifications
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Get alerts for overdue tasks and important updates.
                </p>
              </div>
              {notifEnabled ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-400">
                  <CheckCircle2 size={12} />
                  Enabled
                </span>
              ) : (
                <button
                  onClick={requestNotifications}
                  className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Enable
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
