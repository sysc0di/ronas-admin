import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/LoginForm";
import { SESSION_COOKIE, getAdminFromToken } from "@/lib/admin-session";

export const metadata = { title: "Sign in · Admin" };

export default async function AdminLoginPage() {
  const store = await cookies();
  const user = await getAdminFromToken(store.get(SESSION_COOKIE)?.value);

  if (user) redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <span className="admin-brand-mark size-11 text-sm">RC</span>

          <div>
            <h1 className="text-lg font-semibold text-ink">
              Admin panel
            </h1>

            <p className="mt-1 text-sm text-muted">
              Sign in to manage products and submitted lists.
            </p>
          </div>
        </div>

        <div className="panel p-6">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-subtle">
          Access is limited to store administrators.
        </p>
      </div>
    </div>
  );
}
