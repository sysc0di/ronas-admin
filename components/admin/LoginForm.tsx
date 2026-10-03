"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, Button, Input } from "@/components/admin/ui";

export function LoginForm() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors([]);
    setPending(true);

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrors(
          Array.isArray(payload.errors) && payload.errors.length > 0
            ? payload.errors
            : ["Sign in failed."],
        );
        setPending(false);
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setErrors(["Something went wrong. Please try again."]);
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {errors.length > 0 && (
        <Alert>{errors.join(" ")}</Alert>
      )}

      <Input
        label="Username"
        name="username"
        autoComplete="username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        placeholder="admin"
        required
      />

      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="••••••••"
        required
      />

      <Button
        type="submit"
        variant="primary"
        className="mt-1 w-full"
        loading={pending}
      >
        Sign in
      </Button>
    </form>
  );
}
