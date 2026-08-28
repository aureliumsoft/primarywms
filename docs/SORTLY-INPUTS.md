# Sortly input catalog (field-level)

**Captured read-only** from Primary’s live Sortly (21 Aug 2026).  
**No form was submitted.** HTML `required` was usually false even when the UI still needs a name/qty to save.

This file lists **every input we actually dumped**. If a control is under **Not dumped**, we saw the screen but did not enumerate every option.

---

## 1. Item edit `/item/{id}/edit`

| Label / placeholder | Control | `name` / testid | Notes |
| --- | --- | --- | --- |
| Name | text | `name` / `node-name-field` | Current value e.g. `P36855` |
| Quantity | number-like text | `quantity-field-input` | Value `5` |
| Unit | dropdown next to qty | (clicked overlay blocked) | Displayed **unit**. Org units from Settings: Unit (default), Each (ea), Box, plus weight/length/volume system units |
| Min Level (unit) | text | `minQuantity` / `min-level-field` | Empty allowed |
| Price, £ | text | `price` / `price-field` | Currency from org |
| Total value | text | `value` | **Disabled**, computed `£0` |
| Photos | `input type=file` | aria `Photos upload section` | Multi photo (Sortly max 8) |
| Tags | combobox | `tags` | Free-create tags |
| Notes | textarea | `description` / `notes-inputs` | Placeholder “Notes” |
| QR & Barcode | camera button → modal | not a text field | See §6 |
| Description | text | `customAttributes.customAttribute_163347.attributeValue` | Small text |
| Category | text | `…_230548…` | |
| Condition | text | `…_163324…` | e.g. `new` |
| Size | text | `…_163291…` | |
| Building | text | `…_230549…` | |
| Floor Number | text | `…_230545…` | |
| Make | text | `…_163336…` | |
| More info | text | `…_163370…` | |
| Colour | text | `…_163309…` | |
| Order Number | text | `…_163360…` | |
| Buy Price | **textarea** | `…_230462…` | Large text type |
| Model/Part Number | text | `…_282946…` | |
| Purchase Date | date text `dd/mm/yyyy` | `date-picker-input` | Date type; also used for alerts |
| Product Link | text | `productLink` / `product-link-input` | Placeholder `Add link here` |
| Buttons | | `cancel-button`, Save | Save stays disabled until a change |

Folder search in the left pane: `search-input` placeholder **Search folders** (not part of the item payload).

---

## 2. Clone Item

| Label | Control | `name` / testid | Default |
| --- | --- | --- | --- |
| Name | text | `name` / `name-field` | `{original} (Copy)` |
| Number of clones (30 max) | number | `clonesNumber` / `clones-number` | `1` (max **30**) |
| Generate unique Sortly ID for each clone | checkbox | `newSid` | Off = **keep SID** |
| Clone to Folder | folder picker | (tree, not a raw input) | Current folder |
| Submit | **CLONE** | | Do not click on live data |

---

## 3. Update Quantity

| Label | Control | Notes |
| --- | --- | --- |
| (readonly) name, current qty, £ | display | e.g. P36855, 5 units |
| Quantity | signed delta (+/− stepper) | Changing this updates New Quantity |
| New Quantity | absolute qty | Changing this updates Quantity |
| Reason | dropdown | Options = **Quantity Update Reasons** (Settings): Consumed, Damaged, Inventory Count Adjustment, Picked, Restocked, Returned, Sold, Stocktake, Stolen + custom. Optional unless “Require quantity update reason” is on |
| Transaction Note | textarea `transactionNote` / `notes-field` | Placeholder **Transaction Note (optional)** |
| Submit | **UPDATE** | Writes a transaction; do not click |

---

## 4. Move Item

| Label | Control | Notes |
| --- | --- | --- |
| Quantity to move | number | Of *n* units on hand |
| Move all | action/toggle | Sets qty = on-hand |
| Choose destination folder | folder tree | Plus **New Folder** (would create — do not use on live) |
| Move reason | combobox | Options = **Move Reasons** (Settings): Added to Job, Consumed, Damaged, Donation, End of Life (EOL), Expired, Gift, Incorrectly Added, Inventory Count Adjustment, Invoice Not Received, Item Recall, Moved Within Job, Not Used, Other + custom. Optional unless require-move-reason is on (it was **off**) |
| Move notes | textarea | Optional |
| Submit | **MOVE** | Do not click |

---

## 5. Set Alert

**Step 1**

| Input | Values |
| --- | --- |
| Select a field | **Quantity** · **Purchase Date** (every date custom field appears here) |

**Step 2 (Quantity)**

| Input | Values |
| --- | --- |
| Alert me when Quantity is | Default shown: **At OR Below Min Level** (dropdown; other comparators exist in the control) |
| Min Level | Uses item min (or prompt to set) |
| Recipients | **Self**, **Custom Roles**, **Owners**, **Admins**, **Team Members**, **Select People Manually** |
| Buttons | Back · Confirm (**not** clicked) |

**Step 2 (Purchase Date)**

| Input | Values |
| --- | --- |
| Purchase Date | Shows the item’s date (e.g. `19/08/2026`) |
| Alert me | Two **Select...** comboboxes (when / offset — full option list not opened) |
| Recipients | Same as quantity; copy **Alert will be sent at 08:00 (BST)** |
| Buttons | Back · Confirm (**not** clicked) |

---

## 6. Add QR / Barcode (from item edit)

Modal **Add QR / Barcode** (not a typed value until you pick):

| Choice | Copy |
| --- | --- |
| Create New | Create a unique QR code or barcode |
| Link Existing | Scan any QR code or barcode using scanner |
| Add | Disabled until a choice is selected |

Did not complete Add (would attach a code).

---

## 7. Create Label (linked)

**Step 1 — Label options**

| Input | Values |
| --- | --- |
| Label type | combobox: **QR Label**, **Barcode Label** |
| Paper size | **US Letter (8.5in x 11in)**, **A4 Sheet (21.0cm x 29.7cm)**, **Label printer** |
| Label size (QR + Letter) | Extra Large 5½×8½, Large 3⅓×4, Medium 4×2, Medium tall 2×4, Small 4×1⅓, Extra Small 2⅝×1, Micro 1×1 |
| Include additional item details | toggle + **one** of: Quantity, Price, Min Level, Total Value, Notes, Tags, or one custom field |
| Include photo | toggle (size-dependent) |
| Include logo or icon | toggle |
| Add a note to label | toggle + text |

**Step 2 — Printing**

| Input | Values |
| --- | --- |
| Label quantity | **1 per Item** · **Custom** (Amount number) · **As per item quantity** (default Unit UOM only) |
| Start position | Avery slot picker |
| Include printing instructions | toggle |
| Send copy to email | toggle + Email |
| Buttons | Back · Download PDF · Print & Save Label (**not clicked**) |

**Unlinked labels** (Settings → Create Labels): extra **Label Name** text; QR-only; link later on mobile.

---

## 8. Export

**Step 1:** Spreadsheet (CSV, XLSX) · Page(s) PDF · Dropbox (skip).

**Step 2 spreadsheet**

| Input | Notes |
| --- | --- |
| Export as .xlsx (Excel) | toggle (else CSV) |
| Fields to export | checkboxes: Entry Type, Entry Name, Variant Details, Sortly ID, Quantity, Unit, Min Level, Price, Value, Notes, Tags, Product Link, Ordered, Primary Folder, Subfolder-level1–4, Photo1–8, Barcode/QR1-Data, Barcode/QR1-Type, Barcode/QR2-Data, Barcode/QR2-Type, then **all custom fields** |
| Unselect All | |
| Remember these selections | checkbox |

**Step 2 PDF (Page(s)):** toggles **Add Title Page**, **Add Summary Page**, **Include Labels**; field checkboxes (subset vs spreadsheet); Remember these selections; BACK · EXPORT (**not** clicked).

---

## 9. Bulk Edit

| Input | Notes |
| --- | --- |
| Name | text |
| Min Level | text |
| Price | text |
| Notes | textarea |
| Tags | combobox |
| Unit of Measure | dropdown (org units) |
| All custom fields | same as item edit |
| Apply / Cancel | Apply **not** clicked |

Empty fields mean “do not change” (typical bulk-edit; confirm in implementation).

---

## 10. Merge / Add to / Restock / Permissions

**Merge:** search box placeholder **Search Items**; pick a same-SID row; Continue disabled until pick. Copy: “This folder contains **N items with the same SID**”.

**Add to…** chooser: **Add to Pick List / Purchase Order / Stock Count**.

**Add to Pick List follow-on (cancelled, not added):**

| Step | Inputs |
| --- | --- |
| Quantity | **Quantity to Add** + unit; BACK · NEXT |
| Choose list | Existing drafts (e.g. PL-000002, PL-000001); BACK · **CREATE NEW** · **ADD** (**not** clicked) |

**Restock:** first screen **Use a Purchase Order**, product Link, Open/Closed orders, Continue. Continue into a new PO was **not** clicked (would create).

**Folder Permissions:** Add (button per user without access); existing users **View** vs **View and Edit**; Save **not** clicked.

---

## 11. Advanced Search inputs (live `name=` attributes)

| Filter | Inputs |
| --- | --- |
| Folders | checkboxes per folder |
| Name | `names.0`, `names.1`, … checkboxes of existing names |
| Quantity unit | hidden `quantities.unit` default **`any`**; combobox aria **Unit** |
| Quantity range | `quantities.minValue` placeholder **Min**, `quantities.maxValue` placeholder **Max** |
| Exact value | checkbox `quantities.exactSearch` |
| Min level / show items | `minQuantities.showItems` — **Below Min Level**, **At or Below Min Level**, **Above Min Level**, **With Min Level set**, **Without Min Level set** |
| Price | `prices.minValue` / `prices.maxValue` Min/Max; `prices.exactSearch` |
| Quantity alerts | hidden `qtyAlerts` + Show Items combobox |
| Date alerts | `dateAlerts.primary` + combobox **Date type field** |
| Barcode / QR | text `primaryLabels` placeholder **Search Barcode / QR code** |
| Tags, SID, Notes, custom fields | present in UI; individual `name=` not all dumped |
| Apply | **APPLY FILTERS** (read-only search; we did not need to apply) |

---

## 12. Catalog chrome inputs

| Control | Input |
| --- | --- |
| Folder tree search | text placeholder **Search folders** |
| Item search | text placeholder **Search All Items** or **Search {folder}** |
| Scanner mode | toggle (not a text field) |
| Group Items | checkbox `summarize-items` |
| Sort | dropdown: Updated At, Name, Quantity, Min Level, Price, Description, Buy Price |
| View | Grid / List / Table; Hide Folders; Hide SID |
| Pagination | combobox per-page (20 default; also 10 on workflow tables) |

---

## 13. Preferences `/user-preferences`

| Input | Live value / notes |
| --- | --- |
| Time zone | combobox **BST (UTC +01:00) London**, disabled while auto is on |
| Set automatically | checkbox `timeZoneAuto` **On** |
| Sort by | combobox (display **Updated at**) |
| Direction | radio `sortingDirection`: **Ascending** / **Descending** (Descending selected) |
| Email Alerts | checkbox `notificationsAllowedEmail` **On** |
| Purchase Orders emails | `purchaseOrderEmailsEnabled` **On** |
| Threads emails | `threadMentionEmailEnabled` **On** |
| SAVE CHANGES | not clicked |

---

## 14. Add Item (opened, not submitted)

Modal on folder/items. Buttons **ADD** / close. Required `*` in placeholder.

| Label | Control | name / testid |
| --- | --- | --- |
| Name* | text | `name` / `name-field` |
| Quantity* | text | `quantity` / `quantity-field` |
| Unit of Measure* | combobox next to qty | org units (Unit, Each, Box, …) |
| Min Level | text | `minQuantity` / `min-level-field` |
| SET ALERT | button on min-level row | |
| Price, £ | text | `price` / `price-field` |
| Photos | file | Max **8 photos, 30 MB Total** |
| This item has variants | checkbox `itemGroupsEnabled` | |
| SHOW ALL FIELDS | expands notes/tags/custom/QR | |
| Add to Folder | folder picker | current folder (e.g. Primary unknown) |

---

## 15. Add Folder (opened, not submitted)

| Label | Notes |
| --- | --- |
| Name | required (same family as item) |
| Tags | combobox |
| Notes | textarea |
| Photos | Max 8 / 30 MB |
| SHOW ALL FIELDS | extra folder custom fields (Purchase Date applies to folders) |
| Add to Folder | parent picker |
| ADD | not clicked |

---

## 16. Folder clone / move / delete (cancelled)

**Clone Folder:** Name; checkbox **Include folder's content**; **Clone to Folder** (tree, default All Items); **CLONE** not clicked.

**Move Folder:** destination tree + **New Folder**; **Move reason**; **Move notes**; **MOVE** not clicked.

**Delete folder confirm:** “Do you want to delete 1 folder?” Copy: **You can always restore deleted items from Trash.** Optional **Delete Reason**, **Delete Note**. Button **DELETE 1 FOLDER** not clicked.

---

## 17. Dashboard SET FOLDERS

Dialog title **Folders**. Search folders. Checkbox tree (All Items + each folder). **APPLY** / **CANCEL**. Cancelled — dashboard still **All Folders**.

---

## 18. Custom field create wizard (SAVE not clicked)

**Step 1 — suggested:** Serial Number, Expiry Date, Product Link, **or** Create your own.

**Choose field type:** Small Text Box, Large Text Box, Round Number, Decimal Number, Checkbox, Dropdown, Date, Scanner, Phone Number, Web Link, Email, File Attachment.

**Step 2 (Small Text Box):** Field Name*; Default Text; checkbox **Apply default value to all existing items**; Placeholder Text; **Applicable to** Items and/or Folders (cannot change later); live samples. **Character Limit: 190**. BACK · SAVE.

---

## 19. Create New Unit (CREATE not clicked)

| Input | Notes |
| --- | --- |
| Name* | placeholder `Name (eg. Bag)*` testid `name` |
| Abbreviation* | `Abbreviation (eg. bg)*` |
| Type* | default **Count** (also Weight / Length / Volume on the units table) |
| Copy | “A unit of measure in use cannot be deleted.” |

Live units: Unit (default, Count), Each (ea), Box (box), Pound, Kilogram, Gram, Ounce, Yard, Foot, Inch, Meter, Centimeter, Millimeter, Gallon, Liter.

---

## 20. New Vendor / New Address (SAVE not clicked)

**Vendor** `/vendors`: Name*, Address 1*, Address 2, City*, State / Province / Region*, Zip / Postal Code*, Country* (United Kingdom), Email, Phone Number.

**Address** `/company-addresses`: Set Default checkboxes **Primary / Shipping / Billing**; then same address block as vendor (no email/phone).

---

## 21. Job Settings `/job-settings`

Additional Fields → **ADD CUSTOM FIELD**. Custom Subfolders: **USE SUGGESTED SUBFOLDERS**; text `suggestedSubfolders.0.name` placeholder **Add subfolder name**; **ADD SUBFOLDER**; **SAVE CHANGES** not clicked. **BACK TO JOBS**.

---

## 22. Feature Controls / Manage Alerts

**Feature Controls:** only **Return to Origin** (`returnToOriginEnabled`) — **Disabled** on this account. **Show Details** expander. SAVE not clicked.

**Manage Alerts:** Search; date range **This Month**. Empty: “No data available”.

---

## 23. Workflow document screens (existing drafts, viewed only)

**Pick list** `/pick-list/{id}` Draft: **READY TO PICK**; Assign To*; Due Date; Item Outcome when Picked*; Ship To (Name, Address 1/2, City, Region, Zip, Country); Notes.

**Purchase order** `/purchase-order/{id}` Draft: EXPORT; Order Total; Submitted By; Date Expected; Approved By; line columns LINE ITEM, ITEM DESCRIPTION, PART #, ORDER QUANTITY, UNIT RATE, AMOUNT; Vendor / Ship To / Bill To address blocks; Notes.

**Invoice** Draft: EDIT; EXPORT; Customer*; Customer Email; Date Due*; Date Issued*; ITEM DESCRIPTION, QUANTITY, UNIT RATE, AMOUNT.

**Stock count** Draft: **READY TO COUNT**; Assigned To*; Due Date; Items to Count; notes. Empty: “Add at least 1 item”.

---

## 24. Access this login cannot open

Duncan is **Admin**, not Owner.

| URL | Result |
| --- | --- |
| `/company-details` | Redirect `/restricted` — “Only users with Owner access…” |
| `/account`, `/manage-team` | Redirect `/manage-users` or `/user-management` → **Page not found** |
| Settings sidebar | No Company / Manage Team links (Owner-only) |

Clone **Company details** and **Manage Team** from `docs/REQUIREMENTS.md` SET-3 / SET-4; re-open with an Owner login later if the client provides one.

---

## 25. Still thin (do not block Phase 1)

| Screen | What’s left |
| --- | --- |
| Add Item **SHOW ALL FIELDS** expanded | Click did not expand; implement from REQUIREMENTS UI-ADD-3 |
| Quantity alert **full operator list** | Default At OR Below Min Level captured |
| Purchase Date **Alert me** combobox options | Two Select… controls; options not opened |
| Label **Barcode** + **Label printer** size lists | QR + A4 + Large captured fully |
| Restock → Continue (new PO) | Not opened (would create a PO) |
| PDF export layout names | Step 2 fields captured: Add Title Page, Add Summary Page, Include Labels + field checks |
| Unit dropdown on item edit | Use Settings unit list |
| NEW Job / NEW Pick List create forms | Existing draft documents dumped instead |

---

## 26. Labs (do not build)

`/labs` — **Sortly Labs**, experimental **Bulk Update** “Coming soon”, Request a feature. Skip in our product.
