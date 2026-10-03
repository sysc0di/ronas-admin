-- CreateTable
CREATE TABLE "site_sections" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_section_translations" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_section_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_sections_key_key" ON "site_sections"("key");

-- CreateIndex
CREATE INDEX "site_section_translations_sectionId_idx" ON "site_section_translations"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "site_section_translations_sectionId_locale_key" ON "site_section_translations"("sectionId", "locale");

-- AddForeignKey
ALTER TABLE "site_section_translations" ADD CONSTRAINT "site_section_translations_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "site_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
