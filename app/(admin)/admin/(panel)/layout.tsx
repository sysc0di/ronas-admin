import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { SESSION_COOKIE, getAdminFromToken } from "@/lib/admin-session";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  const user = await getAdminFromToken(store.get(SESSION_COOKIE)?.value);

  if (!user) redirect("/admin/login");

  return (
    <AdminShell username={user.username}>
      {children}
    </AdminShell>
  );
}
