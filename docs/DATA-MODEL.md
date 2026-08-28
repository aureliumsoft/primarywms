# Sortly bulk export → database columns

**Source file:** `sortly bulk export.xlsx` (sheet `Export`, exported 20 Aug 2026)  
**Rows:** 15,653 — **15,074 items** + **579 folders**  
**Use:** this is the live *inventory snapshot* shape. Import, seed, and Prisma tables for folders/items must cover every column that has data. Columns that are empty in Primary’s file are still real Sortly fields (variants, product link, extra barcodes) and stay in the schema as optional.

This is **not** the whole product database. The spreadsheet has no users, ACL, transactions, alerts, POs, pick lists, or settings.

Related: `docs/REQUIREMENTS.md` §44, `docs/SORTLY-INPUTS.md`.

---

## 1. What the file actually is

One flat sheet. Each row is either a **Folder** or an **Item**. Folder location is denormalized into five path columns. Custom fields are extra columns named exactly as in Settings.

| Entry Type | Count | Notes |
| --- | --- | --- |
| Item | 15,074 | `Quantity`, `Unit`, `Value`, `Ordered` filled |
| Folder | 579 | Those qty/price columns empty. **79** folders have no `Primary Folder` (top-level under All Items). UI previously showed 79 top-level folders. |

UI dashboard (~15.1K items, ~582 folders) matches this file within a few rows (export is one day older).

---

## 2. Export columns → tables

Store **one row per folder** and **one row per item**. Do **not** keep `Subfolder-level1`…`4` as item columns in Postgres — reconstruct path from `folder.parent_id`. Keep the five path columns only on **import mapping**.

### 2.1 Shared (`nodes` or split `folders` + `items`)

| Export column | Filled | Observed | Database column | Type / rules |
| --- | --- | --- | --- | --- |
| Entry Name | 15,653 / 15,653 | max **110** chars | `name` | `text` **required**. UI create is required. |
| Entry Type | all | `Item` \| `Folder` | `kind` or separate tables | enum / table split |
| SID | all | 11 chars, **not unique** | `sid` | `text` **required, not unique**. Folders: 579 unique SIDs. Items: **5,807** distinct SIDs; **30** SIDs shared. Dominant SID `S1YHKT27709` = **8,657 items** (clone-with-same-SID). Unique constraint = `(id)` only; optional unique `(sid)` **only if** “generate unique SID” was checked. |
| Notes | 3,705 | max 184 | `notes` | `text` nullable |
| Tags | 3,366 | max 36 on the cell; comma-separated | `item_tags` / `folder_tags` M2M | do not store as a single string. Top tags: showcase, Day2, Forma5, Calibre, Workplace, Portsdown, Haworth, Globe |
| Photo1–Photo8 | 15,229 … 23 | HTTPS `lnk.sortly.co/v2/downloads/photo/…` | `photos[]` ordered 1–8 | `url` + `sort_order`. Max 8. Nullable. On import, download/copy into our S3, do not hotlink Sortly forever. |
| Barcode/QR1-Data | 2 | e.g. `sy://o2/e_qrcode_us/S1YHKT27709`, `S1YHKT…` | `barcodes[].value` | almost unused for Primary |
| Barcode/QR1-Type | 2 | `com.sortly.sortlyLabel`, `com.sortly.barcodeLabel` | `barcodes[].symbology` | QR vs 1D |
| Barcode/QR2-* | 0 | | second barcode slot | keep two slots like Sortly |
| Primary Folder | 15,566 | max 24 | *(import only)* | name of ancestor. **79** folders have this empty = roots. |
| Subfolder-level1 | 15,035 | max 27 | *(import only)* | |
| Subfolder-level2 | 1,094 | max 31 | *(import only)* | |
| Subfolder-level3 | 111 | bin codes | *(import only)* | |
| Subfolder-level4 | 39 | e.g. Plastic box 1–4 | *(import only)* | deepest nest used = **5 path segments** (All Items + 4 sublevels). Sortly max nest is 6 including All Items — schema `parent_id` must allow that. |

**Folder table extra:** `id`, `parent_id` (null = under All Items), `sid`, `name`, `notes`, timestamps, `deleted_at`.

### 2.2 Item-only

| Export column | Filled | Observed | Database column | Type / rules |
| --- | --- | --- | --- | --- |
| Quantity | 15,074 | int, max 3 digits in this dump | `quantity` | `numeric` **required**. Never float in this file. |
| Unit | 15,074 | always **`units`** | `unit_id` FK | seed UOM **Unit** / abbreviation `unit` as default. Org also has Each, Box, etc. (settings), unused in this export. |
| Min Level | 285 | 283× `0`, one `9`, one `166541` | `min_quantity` | `numeric` nullable. Treat `0` as “set”. The `166541` row is bad data (looks like a product code). |
| Price | 1 | `0` | `price` | `numeric(12,2)` nullable. Currency **GBP**. Almost unused. |
| Value | 15,074 | always `0` | **computed** `quantity * price` | do not persist as source of truth; may cache. |
| Ordered | 15,074 | always `False` | `qty_on_order` or derived from open PO lines | boolean in export = “has open order”. Prefer derived. |
| Product Link | 0 | | `product_link` | `text` nullable URL |
| Item Group Name | 0 | | `variant_group_id` | unused by Primary today |
| Attribute 1–3 Name/Option | 0 | | `variant_attributes` | unused; keep for Phase 2 variants |

`folder_id` is **required** on items (resolve from path columns on import).

### 2.3 Custom fields (EAV, not extra Postgres columns per field)

Match Settings → Custom Fields. Values live in `custom_field_values (node_id, field_id, value)`.

| Export / field name | Type in Sortly | Filled (rows) | Max len | Seed |
| --- | --- | --- | --- | --- |
| Description | Small text | 13,168 | 171 | YES, items |
| Category | Small text | 15 | 20 | YES (almost unused; messy: New/Used/desk) |
| Condition | Small text | 11,286 | 79 | YES. Free text, not an enum. Common: New/new/Used/used/unchecked/Returns/Damaged |
| Size | Small text | 179 | 25 | YES |
| Building | Small text | 481 | 29 | YES |
| Floor Number | Small text | 2 | 13 | YES |
| Make | Small text | 13,355 | 95 | YES — heavily used |
| More info | Small text | 3,208 | 104 | YES |
| Colour | Small text | 421 | 54 | YES |
| Order Number | Small text | 13,384 | 85 | YES — heavily used |
| Buy Price | Large text | **0** | — | YES, still seed (they defined it) |
| Model/Part Number | Small text | 27 | 23 | YES |
| Purchase Date | Date | 9,105 | 10 | YES, items **and folders**. Values are **`dd/mm/yyyy` strings**, not Excel dates. |

Small-text Sortly limit is **190** characters (live wizard). This export never exceeded that.

Do **not** add `condition` as a Postgres enum. Store as custom-field text like Sortly.

---

## 3. Suggested Postgres shape (inventory only)

```text
organizations          — one row (Primary)
units                  — id, name, abbreviation, type (count|weight|length|volume), is_default
folders                — id, parent_id, sid, name, notes, created_at, updated_at, deleted_at
items                  — id, folder_id, sid, name, quantity, unit_id, min_quantity,
                         price, notes, product_link, variant_group_id, created_at, updated_at, deleted_at
tags                   — id, name unique
item_tags / folder_tags
photos                 — id, owner_type (item|folder), owner_id, sort_order 1–8, storage_key, url
barcodes               — id, owner_type, owner_id, slot 1–2, value, type (qr|code128|…)
custom_fields          — id, name, type, applies_to item|folder|both, list_visible, max_length
custom_field_values    — node_type, node_id, field_id, value_text / value_date (unique node+field)
```

**Indexes that this dataset requires**

- `items(folder_id)`
- `items(sid)` — **non-unique**; Group Items / merge uses this
- `items(name)` trigram or `ilike` for search
- `folders(parent_id)`, `folders(sid)` unique
- photos/barcodes by owner

**Do not** unique-index `items.sid`. That would reject Primary’s real data.

---

## 4. Import mapping (path → `parent_id`)

For each row:

1. If `Entry Type = Folder`: folder name = `Entry Name`. Parent = last non-empty of Primary Folder → level1 → level2 → level3 (the row’s own name is not in the path). Roots have all path columns empty.
2. If `Entry Type = Item`: parent folder = last non-empty path column (level4, else 3, else 2, else 1, else Primary Folder).
3. Resolve parent by **name + parent chain**, not name alone (duplicate folder names are possible).
4. Photos: enqueue download of `Photo1`…`Photo8` URLs into our bucket; skip blanks.
5. Tags: split on comma, trim, upsert tag names.
6. Purchase Date: parse `dd/mm/yyyy` with London locale; store `date`.
7. SID: copy as-is; do not regenerate.

Path depth in this file (count of filled path columns): 0=87, 1=531, 2=13,941, 3=983, 4=72, 5=39. Most items sit two levels down (client folder → bin).

---

## 5. Not in this spreadsheet (still need tables)

Transactions, activity, users, roles, folder ACL, alerts, units extra metadata, reasons, addresses, vendors, POs / pick lists / counts / jobs / invoices, labels library, trash metadata beyond `deleted_at`, comments/threads.

When we import this file we create **current stock only**. History starts empty unless we later import a transactions export.

---

## 6. Data-quality notes from Primary’s file

- Prices are effectively unused; qty + folder + photos + Make/Order Number/Description/Condition/Purchase Date matter.
- `Min Level` = `166541` on one row is almost certainly a mistaken SKU; do not treat as a real min.
- Condition casing is inconsistent (`New` vs `new`); search should be case-insensitive.
- Two barcode rows only; labels in the app are mostly generated at print time from SID, not stored as extra barcode values.
- Variant columns empty: skip variant UI in Phase 1; keep columns nullable.

---

## 7. Seed custom fields (exact names)

Create these 13 fields on first install for this org, same order as the export:

Description, Category, Condition, Size, Building, Floor Number, Make, More info, Colour, Order Number, Buy Price, Model/Part Number, Purchase Date.
