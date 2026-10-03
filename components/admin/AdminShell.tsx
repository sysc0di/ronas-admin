"use client";

import {
  Home,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Package,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "cn";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/content", label: "Home", icon: Home },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/lists", label: "Lists", icon: ScrollText },
  { href: "/admin/settings", label: "Password", icon: KeyRound },
];

export function AdminShell({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);

    try {
      await fetch("/api/admin/session", { method: "DELETE" });
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="flex flex-col gap-3">
          <Link href="/admin" className="admin-brand">
            <span className="admin-brand-mark">RC</span>

            <span>
              <span className="admin-brand-name block">
                Ronas Corduene
              </span>
              <span className="admin-brand-sub block">
                Admin panel
              </span>
            </span>
          </Link>

          <nav aria-label="Sections" className="admin-nav">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(href);

              return (
                <Link
                  key={href}
                  href={href}
                  className="nav-link"
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Kept visible at every breakpoint: signing out has to stay reachable
            when the sidebar collapses to a horizontal bar. */}
        <div className="admin-user">
          <div className="min-w-0">
            <p className="cell-muted">Signed in as</p>
            <p className="cell-strong truncate">{username}</p>
          </div>

          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="btn btn-ghost btn-sm"
          >
            {signingOut ? (
              <span className="spinner" aria-hidden="true" />
            ) : (
              <LogOut className="size-3.5" aria-hidden="true" />
            )}
            Sign out
          </button>
        </div>
      </aside>

      <main className="admin-content">{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1 className="page-title">{title}</h1>

        {description && (
          <p className="page-description">{description}</p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "COMPLETED"
      ? "ok"
      : status === "PROCESSING"
        ? "warn"
        : status === "CANCELLED"
          ? "danger"
          : "info";

  return (
    <span className={cn("badge", `badge-${tone}`)}>
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-current"
      />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}