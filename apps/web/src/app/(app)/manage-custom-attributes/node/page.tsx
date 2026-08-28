import { CustomFieldsManager } from "@/components/CustomFieldsManager";
import { SettingsChrome } from "@/components/SettingsChrome";

export default function ManageCustomAttributesPage() {
  return (
    <SettingsChrome>
      <CustomFieldsManager />
    </SettingsChrome>
  );
}
