import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/AdminShell";
import { PageEditor } from "@/components/admin/PageEditor";
import { getPageForAdmin } from "@/lib/pages";

export default async function AdminPageEditorPage({
  params,
}: {
  params: Promise<{ key: string[] }>;
}) {
  const key = (await params).key.join("/");
  const page = await getPageForAdmin(key);

  if (!page) notFound();

  return (
    <>
      <PageHeader title={page.label} description={`Editing "${page.key}"`} />

      <PageEditor page={page} />
    </>
  );
}
