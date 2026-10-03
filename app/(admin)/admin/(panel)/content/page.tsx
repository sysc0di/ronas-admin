import { Pencil } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/admin/AdminShell";
import { TableShell } from "@/components/admin/ui";
import { listPagesForAdmin } from "@/lib/pages";

export const metadata = { title: "Pages · Admin" };

export default async function AdminContentPage() {
  const pages = await listPagesForAdmin();
  const formatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

  return (
    <>
      <PageHeader
        title="Pages"
        description="Edit the content of every storefront page. Sections are ordered and multilingual."
      />

      <TableShell head={["Page", "Key", "Updated", ""]}>
        {pages.map((page) => (
          <tr key={page.key}>
            <td className="cell-strong">{page.label}</td>
            <td className="cell-muted mono">{page.key}</td>
            <td className="cell-muted whitespace-nowrap">
              {formatter.format(page.updatedAt)}
            </td>
            <td>
              <div className="flex justify-end">
                <Link
                  href={`/admin/content/${page.key}`}
                  className="btn btn-secondary btn-sm"
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                  Edit
                </Link>
              </div>
            </td>
          </tr>
        ))}
      </TableShell>
    </>
  );
}
