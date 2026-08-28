import { PageHeader } from "@/components/AppShell";

export default function HelpPage() {
  return (
    <>
      <PageHeader title="Help" />
      <div className="prose max-w-3xl p-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Primary WMS</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Track supplies, parts, tools, and furniture in folders (locations). Every quantity change writes an immutable transaction.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
            <li>Add folders for clients, vans, bins, or people.</li>
            <li>Add items with quantity, min level, photos, and custom fields (Make, Condition, Order Number…).</li>
            <li>Move quantity between folders instead of silently editing stock.</li>
            <li>Invite teammates from Settings → Team and grant View or Edit per folder.</li>
            <li>Super Admin is created once on first setup. Nobody else can self-register.</li>
          </ul>
        </div>
        <div id="linking-codes" className="mt-4 scroll-mt-24 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Link an existing QR or barcode</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Plug in a USB or Bluetooth scanner that types like a keyboard, or use the camera on this page. Open{" "}
            <strong>Link existing</strong>, wait until scanning mode is enabled, then scan the code.{" "}
            <strong>LINK</strong> becomes available after a successful scan. Searching or scanning that same code later
            opens the item or folder. 1D scanners cannot read QR codes — use a 2D scanner or the camera for those.
          </p>
        </div>
        <div id="labels" className="mt-4 scroll-mt-24 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">QR codes, barcodes, and labels</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              <strong>Linked labels</strong> — open any item or folder, choose Create Label, pick QR or barcode, paper
              size, and label size. Use Print &amp; Save Label to store the layout for easy reprinting.
            </li>
            <li>
              <strong>Unlinked QR labels</strong> — Settings → Create Labels prints blank QR codes you can link later
              from Add QR / Barcode → Link Existing.
            </li>
            <li>
              Print at <strong>100% / actual size</strong>. Reprinting never changes the stored code value.
            </li>
            <li>Bulk Create Label works for <strong>items only</strong> (not folders).</li>
          </ul>
        </div>
      </div>
    </>
  );
}
