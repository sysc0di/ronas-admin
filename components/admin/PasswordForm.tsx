"use client";

import { useState } from "react";

import {
  Alert,
  Button,
  Input,
  Panel,
  PanelHeader,
} from "@/components/admin/ui";

export function PasswordForm({ username }: { username: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors([]);
    setNotice("");
    setPending(true);

    try {
      const response = await fetch("/api/admin/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrors(
          Array.isArray(payload.errors) && payload.errors.length > 0
            ? payload.errors
            : ["Could not update the password."],
        );
        return;
      }

      setNotice(
        "Password updated. You stay signed in here; other devices are signed out.",
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setErrors(["Something went wrong. Please try again."]);
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel className="max-w-xl">
      <PanelHeader
        title="Password"
        description={`Signed in as ${username}. Changing the password signs out every other device.`}
      />

      <form onSubmit={submit} className="space-y-4 p-5">
        {errors.length > 0 && <Alert>{errors.join(" ")}</Alert>}

        {notice && <Alert tone="success">{notice}</Alert>}

        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
        />

        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          hint="At least 8 characters."
          required
        />

        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />

        <Button
          type="submit"
          variant="primary"
          loading={pending}
          className="w-full sm:w-auto"
        >
          Update password
        </Button>
      </form>
    </Panel>
  );
}
