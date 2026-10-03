import { PageHeader } from "@/components/admin/AdminShell";
import { ApproachForm } from "@/components/admin/ApproachForm";
import { APPROACH_SECTION_KEY, getSiteSectionForAdmin } from "@/lib/content";

export const metadata = { title: "Home content · Admin" };

export default async function AdminContentPage() {
  const section = await getSiteSectionForAdmin(APPROACH_SECTION_KEY);

  return (
    <>
      <PageHeader
        title="Home content"
        description="Edit the approach section shown on the home page."
      />

      <ApproachForm
        initialImage={section?.image ?? ""}
        initialTranslations={section?.translations ?? []}
      />
    </>
  );
}
