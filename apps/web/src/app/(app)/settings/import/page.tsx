"use client";

import { ImportWizard } from "@/components/ImportWizard";
import { SettingsPage } from "@/components/settings/ui";

export default function SettingsImportPage() {
  return (
    <SettingsPage
      title="Bulk Import"
      subtitle="Add new items and folders from a spreadsheet. Import never updates existing records — it only creates new ones."
      wide
    >
      <ImportWizard layout="page" />
    </SettingsPage>
  );
}
