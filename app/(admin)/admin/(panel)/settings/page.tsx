import { PageHeader } from "@/components/admin/AdminShell";
import { PasswordForm } from "@/components/admin/PasswordForm";
import { SESSION_COOKIE, getAdminFromToken } from "@/lib/admin-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = { title: "Password · Admin" };

export default async function AdminSettingsPage() {
  const store = await cookies();
  const user = await getAdminFromToken(store.get(SESSION_COOKIE)?.value);

  if (!user) redirect("/admin/login");

  return (
    <>
      <PageHeader
        title="Password"
        description="Update the credentials used to sign in to this panel."
      />

      <PasswordForm username={user.username} />
    </>
  );
}
