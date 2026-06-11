"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Lock,
  Bell,
  Save,
  User,
  Shield,
  CheckCircle2,
  KeyRound,
  Copy,
  Sun,
  Moon,
  Camera,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { toast } from "react-hot-toast";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [nameEdit, setNameEdit] = useState("");
  const [nameEditing, setNameEditing] = useState(false);

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

  async function copyMfaSecret() {
    try {
      await navigator.clipboard.writeText(mfaSecret);
      toast.success("Authenticator secret copied");
    } catch {
      toast.error("Could not copy the authenticator secret");
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
            {/* Avatar — non-admins only */}
            {!user?.isAdmin && (
              <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
                <div className="relative">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                  <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
                    <Camera size={12} />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setAvatarUploading(true);
                        const formData = new FormData();
                        formData.append("avatar", file);
                        try {
                          const res = await fetch("/api/users/me/avatar", {
                            method: "POST",
                            body: formData,
                          });
                          const data = await res.json();
                          if (!res.ok) {
                            toast.error(data.error || "Upload failed");
                            return;
                          }
                          queryClient.invalidateQueries({ queryKey: ["me"] });
                          toast.success("Avatar updated");
                        } catch {
                          toast.error("Upload failed");
                        } finally {
                          setAvatarUploading(false);
                        }
                      }}
                      disabled={avatarUploading}
                    />
                  </label>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Photo</p>
                  <p className="text-xs text-muted-foreground">
                    {avatarUploading
                      ? "Uploading..."
                      : "JPG, PNG, WebP, GIF — max 2MB"}
                  </p>
                </div>
              </div>
            )}

            {/* Name — editable for non-admins */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <span className="text-sm text-muted-foreground">Name</span>
              {nameEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    value={nameEdit}
                    onChange={(e) => setNameEdit(e.target.value)}
                    className="rounded-lg border border-border bg-muted px-2 py-1 text-sm outline-none"
                    autoFocus
                  />
                  <button
                    onClick={async () => {
                      if (!nameEdit.trim()) return;
                      const res = await fetch("/api/users/me", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: nameEdit.trim() }),
                      });
                      if (res.ok) {
                        queryClient.invalidateQueries({ queryKey: ["me"] });
                        toast.success("Name updated");
                        setNameEditing(false);
                      } else {
                        toast.error("Failed to update name");
                      }
                    }}
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    <Save size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setNameEdit(user?.name || "");
                    setNameEditing(true);
                  }}
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  {user?.name}
                  {!user?.isAdmin && (
                    <span className="text-xs text-muted-foreground">
                      (Edit)
                    </span>
                  )}
                </button>
              )}
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

            {/* Theme — non-admins only */}
            {!user?.isAdmin && (
              <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                <span className="text-sm text-muted-foreground">Theme</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const next = user?.theme === "light" ? "dark" : "light";
                      const res = await fetch("/api/users/me", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ theme: next }),
                      });
                      if (res.ok) {
                        queryClient.invalidateQueries({ queryKey: ["me"] });
                        toast.success(
                          next === "light" ? "Light mode on" : "Dark mode on",
                        );
                      } else {
                        toast.error("Failed to switch theme");
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    {user?.theme === "light" ? (
                      <>
                        <Sun size={14} />
                        Light
                      </>
                    ) : (
                      <>
                        <Moon size={14} />
                        Dark
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
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
            <KeyRound size={18} />
            <h2 className="font-semibold">Multi-factor authentication</h2>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium">
              {user?.mfaEnabled
                ? "Authenticator protection is enabled"
                : "Protect sign-in with an authenticator app"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tessera supports standard time-based one-time passwords and
              single-use recovery codes.
            </p>
            {!user?.mfaEnabled && !mfaSecret && (
              <button
                onClick={async () => {
                  const response = await fetch("/api/security/mfa", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "setup" }),
                  });
                  const data = await response.json();
                  if (!response.ok) return toast.error(data.error);
                  setMfaSecret(data.secret);
                }}
                className={cn(buttonVariants(), "mt-3")}
              >
                Begin setup
              </button>
            )}
            {!user?.mfaEnabled && mfaSecret && (
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    Add this secret to your authenticator app
                  </p>
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                    <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">
                      {mfaSecret}
                    </code>
                    <button
                      type="button"
                      onClick={copyMfaSecret}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "shrink-0",
                      )}
                      aria-label="Copy authenticator secret"
                      title="Copy secret"
                    >
                      <Copy size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    value={mfaCode}
                    onChange={(event) => setMfaCode(event.target.value)}
                    placeholder="6-digit code"
                    className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none"
                  />
                  <button
                    onClick={async () => {
                      const response = await fetch("/api/security/mfa", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "confirm",
                          code: mfaCode,
                        }),
                      });
                      const data = await response.json();
                      if (!response.ok) return toast.error(data.error);
                      setRecoveryCodes(data.recoveryCodes);
                      toast.success("Multi-factor authentication enabled");
                    }}
                    className={buttonVariants()}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}
            {user?.mfaEnabled && (
              <div className="mt-3 flex gap-2">
                <input
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value)}
                  placeholder="Current code or recovery code"
                  className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none"
                />
                <button
                  onClick={async () => {
                    const response = await fetch("/api/security/mfa", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "disable",
                        code: mfaCode,
                      }),
                    });
                    const data = await response.json();
                    if (!response.ok) return toast.error(data.error);
                    window.location.reload();
                  }}
                  className={buttonVariants({ variant: "destructive" })}
                >
                  Disable
                </button>
              </div>
            )}
          </div>
          {!!recoveryCodes.length && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
              <p className="text-sm font-medium text-warning">
                Store these recovery codes securely. Each code works once.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
                {recoveryCodes.map((code) => (
                  <code key={code}>{code}</code>
                ))}
              </div>
            </div>
          )}
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
