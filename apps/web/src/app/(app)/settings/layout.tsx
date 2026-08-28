import { SettingsChrome } from "@/components/SettingsChrome";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsChrome>{children}</SettingsChrome>;
}
