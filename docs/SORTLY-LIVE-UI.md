# Sortly live UI map (read-only)

**Captured:** 21 August 2026 from Primary’s Sortly web app  
**Mode:** View only. No add, edit, save, move, quantity change, invite, or delete.  
**Sortly version shown:** `v10.127.0-R235.0.0`  
**Credentials were not stored in this repo.**

This file is what we must recreate for **one organization** (Primary). It confirms and tightens `docs/REQUIREMENTS.md`.

---

## 1. What this account actually is

This is **not** a generic warehouse demo. Primary uses Sortly as an **office-furniture / fit-out inventory** system (product codes like `P36855`, location suffixes like `16B`, `2C`).

| Live fact | Implication for our app |
| --- | --- |
| Company initials **PR**, currency **£ GBP**, timezone **London BST** | Org settings: name, initials, logo, accent, currency, timezone |
| **79 folders**, **thousands of units** (e.g. one folder “Primary unknown”: 210 items, 516 units) | Must paginate; folder tree + search are mandatory |
| **Total value £0.00** everywhere | Price is optional; qty + location matter more than valuation |
| Folders = **clients, jobs, manufacturers, containers, bins** mixed | Folder tree must allow any taxonomy, not only warehouse/shelf |
| Nested folders inside a parent (e.g. `Primary unknown` → `B284`, `B246`, `B298`) | Nested locations (bins) inside a “unknown / overflow” folder |
| Item names = **SKU + optional loc** (`P36745 - 16B`) | Name is free text; custom fields hold make/condition/building |
| Custom fields in use: Description, Category, Condition, Size, Building, Floor Number, Make, More info, Colour, Order Number, Buy Price, Model/Part Number, Purchase Date | Seed **these** fields for Primary (all small text except Buy Price = large text, Purchase Date = date, applicable to items; Purchase Date also folders) |
| Tags overlap folder names (manufacturers / clients) | Tags + folders both required |
| Jobs empty; PO / pick list / invoice / stock count exist as **drafts** | Build workflow hubs even if they start empty |
| Return to Origin feature **Disabled** in Feature Controls | Still build it; Super Admin can toggle |
| Google/Apple **Not Connected** on profile | We are **not** implementing those logins |

---

## 2. App shell (every web URL)

Left nav: **icon-only rail** at ~1440px (company initials **PR** at top, teal active state). At **1920×1080** the same rail **expands**: company **logo** (gold P + “PRIMARY”) plus **icon + text** for every item. Clone both widths; default desktop should match the labeled sidebar when there is room.

Wide-screen labels, top to bottom: **Dashboard**, **Items**, **Search**, **Tags**, **Workflows**, **Reports**, **Labs** (badge NEW), then **Product News**, **Help**, **Threads**, **Notifications**, **Integrations**, **Settings**.

| URL | Screen | What we clone |
| --- | --- | --- |
| `/login` | Email + password, Forgot password, also Google/Apple/SSO (we **omit** social/SSO) | Email/password only |
| `/dashboard` | Dashboard | Yes |
| `/items` | All Items catalog | Yes — primary workspace |
| `/folder/{id}/content` | Folder contents | Yes |
| `/item/{id}` | Item detail | Yes |
| `/advanced-search` | Advanced Search | Yes |
| `/tags` | Tags (select tag → items) | Yes |
| `/tags/{id}` | Items with that tag | Yes |
| `/workflows` | Workflows hub cards | Yes |
| `/jobs` | Jobs list | Yes (Phase 2) |
| `/pick-lists` | Pick lists table | Yes (Phase 2) |
| `/purchase-orders` | Purchase orders table | Yes (Phase 2) |
| `/invoices` | Invoices table | Yes (Phase 3 / optional) |
| `/stock-counts` | Stock counts table | Yes (Phase 2) |
| `/reports` | Reports hub | Yes |
| `/activity-history` | Activity History report | Yes |
| `/reports/inventory-summary` | Inventory Summary | Yes |
| `/reports/all-transactions` | Transactions | Yes |
| `/reports/quantity-changes-by-item` | Item Flow | Yes |
| `/reports/transfer` | Move Summary | Yes |
| `/reports/user-activity-summary` | User Activity Summary | Yes |
| `/reports/inventory-summary/{savedId}` | Saved report (they have “Low Stock”) | Yes Phase 3 |
| `/labs` | Experimental features | **Skip** (Sortly-only) |
| `/threads` | Comments / @mentions | Phase 3 nice-to-have |
| `/integrations` | Integrations catalog | Phase 3 optional |
| `/trash` | Trash | Yes (soft delete) |
| `/interactive-bulk-import` and `/import` | Bulk import | Yes (do not run on their data) |
| `/user-profile` | Settings → User Profile | Yes |
| `/user-preferences` | Preferences | Yes |
| `/company-addresses` | Addresses | Yes Phase 2 |
| `/manage-custom-attributes/node` | Custom Fields | Yes |
| `/job-settings` | Job Settings | Yes Phase 2 |
| `/transaction-reasons` | Transaction Reasons | Yes |
| `/manage-units` | Units of Measure | Yes |
| `/vendors` | Vendors | Yes Phase 2 |
| `/manage-alerts` | Manage Alerts | Yes |
| `/feature-controls` | Feature toggles | Yes (e.g. Return to Origin) |

Settings is a **second left column** under heading “Settings”, not a separate top-level nav icon URL. Entry is a gear in the icon rail (opens this column). **Create Labels** opens the **unlinked / blank QR** wizard (see §12).

Duncan’s login is **Admin**. `/company-details` → Access Denied (Owner only). Manage Team URLs 404 from this account. Company / team screens must be taken from an Owner session later, or from `REQUIREMENTS.md` SET-3/SET-4.

---

## 3. Items workspace UI (clone this layout)

**Three columns**

1. **Left nav** — at compact width: slim icon rail. At wide width: logo + labeled items: Dashboard, Items (active), Search, Tags, Workflows, Reports, Labs (NEW), Product News, Help, Threads, Notifications, Integrations, Settings (opens settings column).
2. **Folder pane** — search folders, tree “All Folders”, scrollable folder list, footer links: **Bulk Import**, **History**, **Trash**.
3. **Main** — breadcrumb, title, **Add Item** + **Add Folder**, search “Search All Items”, scanner icon, **Group Items** toggle, **Sort** (default “Updated At”), view switcher. Stats row: Folders / Items / Total Quantity / Total Value. **Card grid** of folders then items. Pagination: Show 20 per page, 1–20, next.

**Folder card:** photo (or grey placeholder), name, item count, qty, £ value.  
**Item card:** photo, **NEW** badge if recently added, name, qty + unit, £ value.

**Folder page extras:** breadcrumb `All Items › Primary unknown`, search scoped to folder, nested folder cards (bins) **and** item cards together.

---

## 4. Dashboard widgets (clone)

URL `/dashboard`

- Header **Dashboard** + **SET FOLDERS** (filter which folders feed the dashboard)
- **Inventory Summary** — unique items count, total quantity, total value (£)
- **Low Stock** — item cards with LOW STOCK badge, “View all N items”
- **Recent Activity** — “Added item [name] in [folder]”, relative time (Yesterday, 2 days ago, 1 week ago), **View all activity**
- **Recently Added** — NEW badges, item cards

---

## 5. Item detail (clone this information architecture)

URL `/item/{id}`  
Example (viewed, not edited): name `P36855`, SID `S1YHKT27709`, folder `Primary unknown`.

**Header:** breadcrumb, Sortly ID, Updated at, name, **EDIT** (we did not click).

**Core block:** Quantity (with unit), Min Level, Price per unit, Total value.

**Product Information**

- Tags  
- Notes  
- QR & Barcode (helper copy + generate/link UI)  
- **Custom Fields** listed in definition order  
- **Orders** — Open / Closed tabs for POs; empty: “No open orders for this item.”  
- **Product links** — “Go directly to the supplier's product page when restocking” + LINK (we did not click)

For Primary, custom field order on the item page:

1. Description  
2. Category  
3. Condition  
4. Size  
5. Building  
6. Floor Number  
7. Make  
8. More info  
9. Colour  
10. Order Number  
11. Buy Price  
12. Model/Part Number  
13. Purchase Date  

---

## 6. Advanced Search filters (clone)

URL `/advanced-search`

Left filter rail:

- Folders (tree, All Folders / All Items / each folder)
- Name (searchable list of item names)
- Quantity (unit + exact/comparators)
- Min. Level
- Show Items
- Price (£) exact/comparators
- Quantity Alerts
- Date Alerts
- Tags
- Sortly ID (SID)
- Barcode / QR code
- Notes
- Then **each custom field** as a filter (Description, Category, Condition, …)
- **Add custom filter**
- **APPLY FILTERS**

Helper copy on the canvas: create lists across inventory; summaries group same SID.

---

## 7. Workflows hub copy and tables (clone)

URL `/workflows` — intro: “Workflows are actions you can take on your inventory that interact with quantities.”

Cards:

| Card | URL | Empty / list columns |
| --- | --- | --- |
| Jobs (New) | `/jobs` | Empty state + CREATE YOUR FIRST JOB (we did not). Copy: unlimited jobs on Enterprise — **we have unlimited always**. |
| Pick Lists | `/pick-lists` | Columns: PICK LIST #, ASSIGNED TO, DUE DATE, STATUS, ITEM OUTCOME, LAST UPDATED, SHIP TO, ASSIGNED DATE, CREATED BY, PICKED DATE. They have Draft `PL-000002`, `PL-000001`. |
| Purchase Orders | `/purchase-orders` | PO #, VENDOR, ORDER TOTAL, STATUS, LAST UPDATED, DATE ORDERED, DATE EXPECTED, DATE RECEIVED, SHIP TO, CREATED BY, SUBMITTED BY. Draft `PO-000001`, total GBP 0.00. |
| Invoices | `/invoices` | INVOICE #, STATUS, CUSTOMER, DATE CREATED, LAST UPDATED. Draft `IN-000001`. |
| Stock Counts (New) | `/stock-counts` | STOCK COUNT #, ASSIGNED TO, DUE DATE, STATUS, ITEM COUNT, DISCREPANT ITEMS, RESOLVED ITEMS, LAST UPDATED, CREATED BY, STARTED DATE. Drafts `SC-000001`, `SC-000002`. |

Each list: **NEW …** primary button, optional “Learn how / Watch video / Help article”, pagination Show 10 per page.

**Opened existing drafts (view only, not saved):**

| Doc | URL pattern | Header actions / required fields seen |
| --- | --- | --- |
| Pick list PL-000001 | `/pick-list/{id}` | Draft · **READY TO PICK**. Assign To*, Due Date, Item Outcome when Picked*, Ship To address, Notes |
| PO PO-000001 | `/purchase-order/{id}` | Draft · EXPORT. Vendor / Ship To / Bill To, line items, Date Expected, Approved By |
| Invoice IN-000001 | `/invoices` → draft | EDIT · EXPORT. Customer*, Customer Email, Date Due*, Date Issued* |
| Stock count SC-000001 | `/stock-counts` → draft | **READY TO COUNT**. Assigned To*, Due Date, items list (empty) |

**Do not clone** Sortly help videos as a product dependency.

---

## 8. Reports hub (clone)

URL `/reports`

- Learn about reports / saved reports / subscriptions  
- **Saved Reports** (they have 1: “Low Stock” → Inventory Summary, dated)  
- Caps on Sortly (e.g. 0/15) — **we do not cap**  
- Report types and one-line descriptions: Activity History, Inventory Summary, Transactions, Item Flow, Move Summary, User Activity Summary  

---

## 9. Settings screens (clone fields, not Sortly billing)

**User Profile** `/user-profile`  
First Name, Last Name, Email, Job Function, Job Title, Phone Number, Change Password, Linked Accounts (Google/Apple — **do not build**).

**Preferences** `/user-preferences`  
Time zone (BST London) + Set automatically; Sort by; Ascending/Descending; Email: Alerts On, Purchase Orders On, Threads On.

**Custom Fields** — Primary’s live definitions (seed these):

| Name | Type | Applies to |
| --- | --- | --- |
| Description | Small text | Items |
| Category | Small text | Items |
| Condition | Small text | Items |
| Size | Small text | Items |
| Building | Small text | Items |
| Floor Number | Small text | Items |
| Make | Small text | Items |
| More info | Small text | Items |
| Colour | Small text | Items |
| Order Number | Small text | Items |
| Buy Price | Large text | Items |
| Model/Part Number | Small text | Items |
| Purchase Date | Date | Items & Folders |

UI: NAME, VISIBLE IN LIST VIEW, APPLICABLE TO, ACTIONS. Show on item page: All Fields.

**Units of Measure** `/manage-units`  
Columns: UNIT NAME, ABBREVIATION, TYPE.  
System + their extras: Unit (default, Count), **Each** (ea, Count), **Box** (box, Count), Pound/kg/g/oz, Yard/Foot/Inch/Meter/cm/**Millimeter**, Gallon.

**Vendors** `/vendors`  
Empty state: contact info for POs. **NEW VENDOR**.

**Transaction Reasons** `/transaction-reasons`  
Tabs: Move Reason | Quantity Update Reason.  
Toggles (do not change on their account): Require move reason / Require quantity update reason.  
Table: reason, DEFAULT, VISIBILITY.  
Move list includes Sortly defaults plus **Item Recall**, **Moved Within Job**, **Not Used**.  
Qty list includes **Stocktake**, **Stolen**.

**Job Settings** `/job-settings`  
Additional Fields for every new job; Custom Subfolders; USE SUGGESTED SUBFOLDERS; ADD SUBFOLDER; SAVE CHANGES (we did not save).

**Feature Controls** `/feature-controls`  
Return to Origin — currently **Disabled** on this account. Build the feature + Super Admin toggle.

**Integrations** `/integrations`  
Categories: All, Accounting, Collaboration, Developer, Field Service, Replenishment.  
Listed: AppFolio (coming soon), Housecall Pro (coming soon), Microsoft Teams, Public API, QuickBooks, Slack, Webhooks.  
For Primary v1: **none required**. Phase 3 only if they ask.

**Labs** — experimental Bulk Update “Coming soon”. **Do not build Labs.**

---

## 10. Visual / UX to match (not Sortly branding)

- Light grey canvas, white cards, **teal/green** accent on active nav and primary buttons  
- Rounded cards, photo-first, **NEW** badge  
- Icon rail + folder tree + main (Sortly’s signature layout)  
- Stats strip under the toolbar  
- Pagination footer  
- Company initials avatar when no logo  
- Empty states with a single primary CTA (we will implement CTAs; we did not click theirs)

**Do not copy:** Sortly logo, wordmark, help chatbot, “Enterprise plan” upsells, unique-item/plan caps, Google/Apple/SSO buttons.

---

## 11. What to build first for Primary (single org)

1. Super Admin email/password → invite team with folder View/Edit (like Sortly Manage Team).  
2. Items workspace: folder tree, cards, search, pagination, nested bins.  
3. Item detail with **their custom fields** and SID.  
4. Moves between client/job/container folders (check-in/out).  
5. Tags, advanced search, dashboard, activity history.  
6. Photos; prices optional (they currently store £0).  
7. Then Phase 2: stock counts, pick lists, POs, vendors, jobs — they already have empty/draft documents in Sortly, so those screens are expected.

---

## 12. Labels — creation, usage, search, printing (live)

Opened the **Create Label** wizard on an existing item and the **Settings → Create Labels** blank-label wizard. **Did not** click Download PDF or Print & Save Label (that would store a label).

### 12.1 Two label products

| Kind | Where | What it does |
| --- | --- | --- |
| **Linked item/folder label** | Item `⋯` → Create Label; folder header `⋯` → Create Label; item/folder card `⋯`; bulk bar → Create Label | PDF for this entity. Copy: **“This label will now be stored for easy reprinting.”** Final buttons: **Download PDF** and **Print & Save Label**. |
| **Unlinked (blank) QR labels** | Settings → **Create Labels** | Title **UNLINKED LABELS**. Copy: “Create beautiful QR labels which can be linked to your items using Sortly’s **mobile app**.” Extra field: **Label Name**. Link: “Need to generate auto-linked QR and Barcode labels?” |

Folder labels exist (single folder). **Bulk folder labels are not in Sortly** (help: items only). Scan a folder label → open that folder and its contents.

### 12.2 Add / link a code on the item (not the PDF wizard)

From item **view**, QR & Barcode goes to **edit** ` /item/{id}/edit?focus=scanner `. Camera button opens modal **Add QR / Barcode**:

1. **Create New** — “Create a unique QR code or barcode”
2. **Link Existing** — “Scan any QR code or barcode using scanner”
3. **Add** (disabled until one option is chosen)

We did not click Add. Linking does not change SID.

### 12.3 Linked wizard — step 1 (Label options)

- Label type: **QR Label** | **Barcode Label**
- Paper size: **US Letter (8.5in x 11in)** · **A4 Sheet (21.0cm x 29.7cm)** · **Label printer**
- Label size (QR + US Letter, live list): Extra Large (5½×8½ in), Large (3⅓×4 in), Medium (4×2 in), Medium tall (2×4 in), Small (4×1⅓ in), Extra Small (2⅝×1 in), Micro (1×1 in)
- Next disabled until type + paper + size are set
- Live preview of the sticker (QR, name, SID)

**Label settings** (Large QR, live toggles):

- Include additional item details (one extra slot)
- Include photo
- Include logo or icon
- Add a note to label

Additional-details picker (help + UI): Quantity, Price, Min Level, Total Value, Notes, Tags, **or one custom field**. Only one extra attribute at a time. Photo only on sizes that support it.

### 12.4 Linked wizard — step 2 (Printing options)

- **Label quantity:** 1 per Item · **Custom** (Amount field) · As per item quantity (default UOM “Unit” only)
- **Choose label print start position** (partial Avery sheet)
- **Include printing instructions**
- **Send copy to email** + Email field
- **Label information:** Labels per sheet (Large QR = **6**); Compatible with **Avery 5264, 8164, 1744907**; Purchase Blank Labels; Printer type **laser / inkjet**; Purchase Recommended Printers
- **Back** · **Download PDF** · **Print & Save Label**

Output is a PDF. Print from the OS/PDF viewer at **100% / actual size**. Do not edit the PDF in Illustrator. Reprint does not change the stored QR/barcode value; size/notes can change.

### 12.5 Search and scan (web)

| Action | Behaviour |
| --- | --- |
| Click SID on item header | Navigates `/items?keyword={SID}` |
| Search box “Search All Items” / folder-scoped search | Name, SID, barcode/QR |
| **Scanner icon** (`scanner-mode-toggle`) | Banner: “Scanning mode is enabled. Please use handheld scanner to perform search.” Copy: “Scan QR / Barcode using scanner to search for items and folders.” **Close scanning mode** returns to typed search. |
| Advanced Search filter | **Barcode / QR code** |
| Search results | Path (All Items › folder › subfolder), SID, name, qty, value, Updated, custom fields (Description, Category, Condition) |

**Primary data note:** keyword search on one SID returned **thousands of rows** showing the same SID. Clone-with-same-SID is how they duplicate lots. Search must handle shared SIDs (group / list all clones).

Scan of a Sortly-generated code opens the item/folder **only for a logged-in user with permission**. Not a public page.

### 12.6 Where Create Label appears

- Item detail `⋯`: Create Label (plus Restock, History, Transactions, Set Alert, Export, Clone, Merge, Add to…, Delete)
- Folder header `⋯`: Create Label (plus Edit, Move to folder, History, Set Alert, Export, Clone, Permissions, Delete)
- Folder **card** `⋯`: History, Create Label, Export, Clone, Delete
- Item **card** `⋯`: Restock, History, Transactions, Create Label, Export, Clone, Merge, Add to…, Delete
- Bulk bar: Create Label
- Advanced Search bulk: Create Label
- Mobile: item `⋯` / multi-select Create Labels (not opened)

### 12.7 Sizes and batch caps to implement (help + live)

No custom sizes. No RFID.

US Letter QR: Micro 1500, Extra Small 750, Small 350, Medium 250, Medium tall 250, Large 150, Extra Large 50.  
US Letter barcode: Small (~⅛×1½ in) 1500, Medium 500.  
Thermal: Medium Barcode ¾×2 in (SID+name, no photo); QR thermal sizes Small/Medium/Medium Long/Medium Tall/Large with the usual field rules.

We do **not** cap by Sortly plan. Primary needs **both QR and 1D barcode** labels.

---

## 13. Every control on Items and Folders pages (live)

### 13.1 Shared catalog chrome (`/items` and `/folder/{id}/content`)

**Icon rail:** dashboard, items-page, advanced-search, tags-page, workflows-page, reports-page, labs-page, help, threads, alerts, integrations, settings.

**Folder pane:** search-input, tree-list, folder-tree-filter (“Filter folders”), Bulk Import, History, Trash, collapse toggle.

**Main toolbar**

| Control | testid / label | Behaviour to clone |
| --- | --- | --- |
| Breadcrumb | `breadcrumb-item` | All Items › folder name |
| Folder `⋯` | `header-dropdown-menu-anchor` | See §12.6 |
| Add Item / Add Folder | `add-item`, `add-folder` | Do not click in live account |
| Search | placeholder Search All Items / Search {folder} | Plus scanner toggle |
| Scanner | `scanner-mode-toggle` | Wedge-scanner search mode |
| Group Items | `summarize-items` | Groups clones that share SID (checkbox; was disabled while scan mode on) |
| Sort | `sort-by-dropdown` | Live options: **Updated At**, Name, Quantity, Min Level, Price, Description, Buy Price (custom fields appear in sort) |
| View | `view-dropdown` | LAYOUT TYPE: **Grid / List / Table**. VIEW OPTIONS: **Hide Folders**, **Hide SID** |
| Threads | `threads-button` | Item/folder comments |
| Stats | Folders, Items, Total Quantity, Total Value | |

**Cards:** photo, name, qty, £, NEW badge. Hover on **item** card also shows: checkbox, **change-quantity**, **move**, **set-alert**, **restock**, kebab. Hover on **folder** card: kebab (no qty/restock).

**Pagination:** Show N per page, prev/next.

### 13.2 Bulk bar (select card checkbox)

Shows **“N item selected”**. Actions: **Edit**, **Update Quantity**, **Move**, **Export**, **Restock**, **Create Label**, **Set Alert**, **Clone**, **Add to…**, **Delete**. Icon shortcuts: Edit, Move, Clone. Header **All** (`bulk-select-header`) selects the page/folder set.

We selected one item to read the bar, then deselected. No bulk action was run.

### 13.3 Item detail (`/item/{id}`) — all features

Header: breadcrumb, **Sortly ID** (click = search), copy SID, **Updated at**, name, **Threads**, **Insights**, **Move**, kebab, **Edit** → `/item/{id}/edit`.

Kebab: Restock, History, Transactions, Create Label, Set Alert, Export, Clone, Merge, Add to…, Delete.

Body: Quantity (+ pencil to update — not used), unit, Min Level (+ info + edit), Price, Total value. Photos (upload on edit). Tags. Notes. QR & Barcode. Custom fields (gear → custom field settings). Orders (Open/Closed) + Restock. **Product Link** (URL to supplier page).

Edit form extra: name, qty, unit dropdown (Each, Box, Unit, …), min, price £, total value (computed, disabled), tags combobox, notes, QR add modal, all custom fields, product link textbox. **Cancel / Save**. We cancelled.

### 13.4 Folder page extras

Nested folder cards + item cards in one grid. Header kebab includes **Move to folder** and **Permissions** (item kebab does not). Folder edit is **in-place** (there is no `/folder/{id}/edit` URL — that 404s).

---

## 14. Action dialogs (opened live, then cancelled)

Nothing below was confirmed. No clone, merge, move, qty update, alert, export file, permission save, or delete.

### 14.1 Item actions

| Action | What the live UI actually is |
| --- | --- |
| **View** | Click card → `/item/{id}`. Photos, qty, min, price, tags, notes, QR, custom fields, orders, product link. |
| **Edit** | `/item/{id}/edit`. Cancel/Save. All fields editable. Qty pencil on the **card** is not this screen — see Update Quantity. |
| **Update Quantity** | Modal: current qty, **Quantity** (delta +/−), **New Quantity** (absolute), **Reason**, **Transaction Note**. Button **Update**. Creates a txn (do not auto-edit the field only). |
| **Move** | **Move Item**: qty to move, **Move all**, destination folder tree + **New Folder**, **Move reason**, **Move notes**, **Move**. |
| **History** | `/item/{id}/activity-history`. Report “Activity History - {name}”. Columns: Date, Activity Type, Activity, User, SID, Name, Qty Change, Qty Balance, Qty Moved, Source, Destination. Types seen: Create Item, Edit Item, Update Quantity, Move Item. Date range + Export. |
| **Transactions** | `/reports/all-transactions`. Filters: Any item, Any folder, Any transaction, date. Types: Move, Update Quantity, Create. Columns include qty change, notes, folder, user, price, value, product link, **every custom field**. 1993 rows this month on this account. |
| **Insights** | Side panel: Recent History + **Smart Insights** (“Sortly Sage”). **Do not build Sage.** Link through to History and Transactions. |
| **Restock** | “How would you like to restock this item?” → **Use a Purchase Order**, product **Link**, Open/Closed orders, **Continue**. |
| **Create Label** | See §12. Preview on step 1. |
| **Set Alert** | Step 1: field **Quantity** or **Purchase Date** (any date custom field). Step 2 quantity: “Alert me when Quantity is **At OR Below Min Level**”; recipients: Self, Custom Roles, Owners, Admins, Team Members, Select People Manually. Confirm not clicked. |
| **Export** | Step 1 types: **Spreadsheet** (CSV, XLSX), **Page(s) PDF**, **Dropbox** (we skip Dropbox). Step 2 spreadsheet: .xlsx toggle; fields: Entry Type/Name, Variant, SID, Qty, Unit, Min, Price, Value, Notes, Tags, Product Link, Ordered, folder path levels, Photo1–8, Barcode/QR 1–2 data+type, **all custom fields**, Remember selections. Preview: “Choose export type to see preview”. |
| **Clone** | **Clone Item**: Name, **Number of clones (30 max)**, checkbox **Generate unique Sortly ID for each clone**, **Clone to Folder**, **Clone**. Unchecked = keep SID (this is how Primary has 157 same-SID items in one folder). |
| **Merge** | Right drawer **Merge items**. Selected item card. “Choose an item to merge into”. Copy: “This folder contains **N items with the same SID**”. Search. Continue disabled until a target is picked. Help article linked. |
| **Add to…** | Add to **Pick List**, **Purchase Order**, **Stock Count** (badge New). |
| **Delete** | Menu exists. Confirm dialog was **not** opened. Implement as soft-delete to Trash (restore from `/trash`). |

### 14.2 Folder actions

| Action | What the live UI actually is |
| --- | --- |
| **View** | `/folder/{id}/content` — nested folders + items, stats, same toolbar as Items. |
| **Edit** | In-place (not a `/edit` URL). Same field set as create: name, tags, notes, photos, QR. |
| **Move to folder** | Relocate this folder in the tree (header kebab). |
| **History / Create Label / Set Alert / Export / Clone** | Same family as items; folder clone can include subtree (requirements CLN-7). |
| **Permissions** | Drawer **Folder Permissions**. **Add users to this folder** (people without access, role Team Member, **Add**). **Users with access**: role (Owner / Admin / Team Member) + **View** or **View and Edit**. **Save** not clicked. |
| **Delete** | Soft-delete to Trash. Confirm not opened. |

Live access on “Primary unknown”: Owners and Admins all **View and Edit**. Team Members listed under Add (not yet granted).

### 14.3 Advanced filters and previews

**Advanced Search** `/advanced-search`

- Folders tree (All Folders / All Items / each folder)
- Name (searchable list of existing names)
- Quantity: unit + **Exact value** (and other comparators in the control)
- Min. Level
- **Show Items:** Below Min Level, At or Below Min Level, Above Min Level, With Min Level set, Without Min Level set
- Price (£) exact/comparators
- Quantity Alerts, Date Alerts
- Tags, SID, Barcode/QR, Notes
- Each custom field + **Add custom filter**
- **Apply Filters**
- Right-side explainer: folders, quantity, min, barcode, custom filters, **Summaries = group same SID**

**Previews (live)**

- Label sticker preview (QR, name, SID, size) before PDF
- Export: “Choose export type to see preview”
- Merge: photo + SID + name + qty + Description/Category/Condition on each candidate
- Search results: path, SID, name, qty, Updated, custom fields
- Item/folder cards: photo, NEW, qty, £

### 14.4 Bulk actions (bar after checkbox)

**1 item selected** plus **All**. Actions: **Edit** (bulk edit drawer), **Update Quantity**, **Move**, **Export**, **Restock**, **Create Label**, **Set Alert**, **Clone**, **Add to…**, **Delete**.

**Bulk Edit** drawer (cancelled): Name, Min Level, Price, Notes, Tags, Unit of Measure, then all custom fields. **Apply / Cancel**.

---

*End of live map. No inventory was changed. Label PDFs were not generated or saved.*
