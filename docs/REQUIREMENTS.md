# PrimaryWMS — Complete Requirements Catalog

**Product:** Single-organization inventory system equivalent to Sortly  
**Tenancy:** One company. Unlimited items, folders, users, custom fields, and history.  
**This file is the source of truth.** Implement every requirement marked **Include**. Do not skip a row because it was summarized elsewhere.  
**Last updated:** 21 August 2026

**Priority:** `M` must (Phase 1 unless noted) · `S` should · `C` could · `P2` Phase 2 · `P3` Phase 3  
**Include:** `YES` build it · `NO` do not build (listed so nothing is forgotten)

Every row below is one requirement. If two behaviors live in one sentence, they are split into two IDs.

---

## 0. How to use this document

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| DOC-1 | When implementing, satisfy every `Include = YES` row. | YES | M |
| DOC-2 | Do not re-derive scope from Sortly marketing; update this file first if scope changes. | YES | M |
| DOC-3 | `Include = NO` rows are explicit non-goals, not omissions. | YES | M |
| DOC-4 | Phase 2/3 rows are still requirements; they ship later but are fully specified here. | YES | M |
| DOC-5 | Live Sortly screens, URLs, and Primary’s custom fields are in `docs/SORTLY-LIVE-UI.md` (read-only capture). Match that layout. Do not store Sortly passwords in this repo. | YES | M |

---

## 1. Product purpose

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| PUR-1 | The system tracks physical supplies, parts, tools, equipment, materials, and assets for one organization. | YES | M |
| PUR-2 | The system is visual (photos on cards) and folder-based (folders are locations). | YES | M |
| PUR-3 | Mobile is scan-first and a full operational client, not a read-only companion. | YES | M |
| PUR-4 | The system is not a warehouse WMS: no directed putaway, wave picking, or carrier shipping. | YES | M |
| PUR-5 | The system is not an ERP: no general ledger, tax engine, or payroll. | YES | M |
| PUR-6 | Labels scanned in the app open the item or folder only for authenticated users with permission. | YES | M |
| PUR-7 | Success: a worker photographs an item, prints a QR, scans to move qty to a van/person, and an admin sees who/when/why. | YES | M |

---

## 2. Master feature checklist (complete Sortly surface)

Nothing in Sortly’s product is left off this list. Each maps to detailed IDs later.

| Sortly feature | Include | Phase | Detail IDs |
| --- | --- | --- | --- |
| Web app | YES | 1 | WEB-* |
| Mobile iOS/Android (or camera PWA) | YES | 1 | MOB-* |
| Login email/password only | YES | 1 | AUTH-* |
| Login Google | NO | — | AUTH-10 |
| Login Apple | NO | — | AUTH-11 |
| Login SSO | NO | — | AUTH-12 |
| First user = Super Admin (Owner); then invite team | YES | 1 | BOOT-*, INV-* |
| Invite-only users (role + folder access like Sortly) | YES | 1 | USR-*, INV-* |
| Super Admin / Admin / Team Member / Scanner roles | YES | 1 | ROLE-* |
| View-only vs Edit per folder | YES | 1 | ACL-* |
| Custom roles (multiple allowed) | YES | 1 | ROLE-20+ |
| Limited/Scanner seats | YES | 1 | ROLE-30+ |
| Company name, industry, logo, color, initials | YES | 1 | ORG-* |
| Currency, country, date format, timezone | YES | 1 | ORG-* |
| Catalog default view and sort | YES | 1 | PREF-* |
| Dark/light/system theme (mobile) | YES | 1 | PREF-10 |
| Dashboard | YES | 1 | DASH-* |
| Items workspace | YES | 1 | ITM-*, FLD-*, UI-* |
| Nested folders (max 6 incl. All Items) | YES | 1 | FLD-* |
| Items outside folders (under All Items) | YES | 1 | FLD-20 |
| Item photos (8) | YES | 1 | MED-* |
| Folder photos (8) | YES | 1 | MED-* |
| Grid / List / Table views | YES | 1 | UI-VIEW-* |
| Group items (clones + variants) | YES | 1 | GRP-* |
| Add item progressive form | YES | 1 | ITM-* |
| Add folder | YES | 1 | FLD-* |
| Show all fields | YES | 1 | UI-ADD-3 |
| Item variants (3 attributes) | YES | 2 | VAR-* |
| Custom fields (12 types) | YES | 1 | CF-* |
| Tags | YES | 1 | TAG-* |
| Units of measure + custom UOM | YES | 1 | UOM-* |
| SID auto-generate | YES | 1 | SID-* |
| QR generate | YES | 1 | LAB-* |
| Barcode generate | YES | 1 | LAB-* |
| Link existing barcode/QR | YES | 1 | LAB-LINK-* |
| Blank/unlinked labels | YES | 1 | LAB-BLANK-* |
| Label PDF Avery + thermal | YES | 1 | LAB-* |
| Hover: alert / qty / move | YES | 1 | UI-CARD-* |
| Bulk bar | YES | 1 | BULK-* |
| Clone same SID / new SID | YES | 1 | CLN-* |
| Merge | YES | 1 | MRG-* |
| Move / check-in / check-out | YES | 1 | MOV-* |
| Return to origin | YES | 1 | MOV-20 |
| Quantity update + reasons + notes | YES | 1 | QTY-*, RSN-* |
| Custom transaction reasons | YES | 1 | RSN-* |
| Activity history per item/folder | YES | 1 | TXN-* |
| Advanced Search (web) | YES | 1 | SRCH-* |
| Quick search | YES | 1 | SRCH-* |
| Scan to search | YES | 1 | SRCH-* |
| Voice search | YES | 1 | SRCH-20 |
| Low-stock quantity alerts | YES | 1 | ALT-* |
| Date-based alerts | YES | 1 | ALT-* |
| In-app notifications | YES | 1 | NTF-* |
| Email alerts | YES | 1 | ALT-MAIL-* |
| Push notifications (mobile) | YES | 1 | NTF-PUSH-* |
| Manage alerts bulk | YES | 1 | ALT-MGT-* |
| CSV/XLSX import new items/folders | YES | 1 | IMP-* |
| Quick import vs Advanced import | YES | 1 | IMP-* |
| Bulk edit items/folders | YES | 1 | BULK-* |
| Export CSV/XLSX | YES | 1 | EXP-* |
| Export PDF list/album/compact | YES | 1 | EXP-PDF-* |
| Export Dropbox | NO | — | EXP-DROP-1 |
| Reports: Activity History | YES | 1 | RPT-AH-* |
| Reports: Inventory Summary | YES | 1 | RPT-IS-* |
| Reports: Low Stock | YES | 1 | RPT-LS-* |
| Reports: Transactions | YES | 1 | RPT-TX-* |
| Reports: Item Flow | YES | 1 | RPT-IF-* |
| Reports: Move Summary | YES | 1 | RPT-MS-* |
| Reports: User Activity Summary | YES | 1 | RPT-UA-* |
| Reports: Quantity Change by Item | YES | 1 | RPT-QC-* |
| Saved reports | YES | 3 | RPT-SAV-* |
| Report email subscriptions | YES | 3 | RPT-SUB-* |
| Inventory snapshot history | YES | 3 | RPT-SNAP-* |
| Quick Actions (mobile) | YES | 1 | QA-* |
| Handheld scanner web (search/link only) | YES | 1 | SCN-WEB-* |
| Handheld scanner mobile (incl. Quick Actions) | YES | 1 | SCN-MOB-* |
| Bluetooth scanner setting | YES | 1 | SCN-BT-* |
| USB keyboard-wedge scanner | YES | 1 | SCN-USB-* |
| Offline mobile + full sync | YES | 1 | OFF-* |
| Sync only on Wi-Fi option | YES | 1 | OFF-10 |
| Disable sync toggle | YES | 1 | OFF-11 |
| Workflows hub | YES | 2 | WF-* |
| Stock counts | YES | 2 | CNT-* |
| Pick lists | YES | 2 | PIK-* |
| Purchase orders | YES | 2 | PO-* |
| Jobs | YES | 2 | JOB-* |
| Invoices | YES | 3 | INV-* |
| Invoice → Pick List clone | YES | 3 | INV-20 |
| Saved addresses | YES | 2 | ADR-* |
| Online Orders / Amazon restock | NO | — | AMZ-* |
| Product Link (external URL on item) | YES | 2 | PLINK-* |
| Restock cart icon on low stock | NO | — | AMZ-* |
| Slack notifications | YES | 3 | INT-SLACK-* |
| Microsoft Teams notifications | YES | 3 | INT-TEAMS-* |
| Webhooks | YES | 3 | INT-HOOK-* |
| REST API | YES | 3 | API-* |
| QuickBooks Online | YES | 3 | INT-QBO-* |
| SSO | NO | — | AUTH-12 |
| Help center in-app | YES | 1 | HELP-1 (static) |
| Chatbot / Product News / roadmap votes | NO | — | HELP-NO-* |
| Multi-account access | NO | — | SAAS-1 |
| Plan limits / billing / seats as SKUs | NO | — | SAAS-2 |
| Unique-item caps | NO | — | SAAS-3 |
| RFID | NO | — | SAAS-4 |
| Public unauthenticated QR pages | NO | — | SAAS-5 |
| Soft-delete restore | YES | 1 | DEL-* |
| Full data backup export | YES | 1 | BKP-1 |
| Delete organization | YES | 1 | ORG-DEL-1 (Super Admin, confirm) |

---

## 3. Core rules (non-negotiable)

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| CORE-1 | Folders represent locations or logical groups (warehouse, shelf, bin, van, person, job site). | YES | M |
| CORE-2 | An item is a trackable thing in one folder with a quantity. | YES | M |
| CORE-3 | A unique catalog identity is the human **SID** plus an internal UUID. | YES | M |
| CORE-4 | Quantity of a SID does not create extra unique items. | YES | M |
| CORE-5 | Clones that keep the same SID do not create extra unique identities. | YES | M |
| CORE-6 | Variants always receive their own SID. | YES | M |
| CORE-7 | Moving quantity between folders is check-in / check-out / transfer. | YES | M |
| CORE-8 | Prefer moves over silent qty edits when stock physically moved. | YES | M |
| CORE-9 | Every inventory-affecting change appends an immutable **transaction**. | YES | M |
| CORE-10 | Application code must not change `item.quantity` or folder except via the transaction service. | YES | M |
| CORE-11 | Bulk consumable tracking (one row, qty 550 lbs) must work. | YES | M |
| CORE-12 | Serialized tracking (qty 1, unique SID and QR per unit) must work. | YES | M |
| CORE-13 | Same SKU in multiple folders = separate item rows sharing SID, independent qty. | YES | M |
| CORE-14 | Partial move (3 of 30) must work. | YES | M |
| CORE-15 | All stock mutations are authorized against folder ACL. | YES | M |

---

## 4. Tenancy, auth, users

This product is **one organization**. There is no social login and no SSO. The first account is a **Super Admin** (same powers as Sortly **Owner**). Nobody else can register. Super Admin logs in with email and password, then invites the team the same way Sortly does: choose a role and, for Team Member / Scanner / custom roles, choose which folders they may **View** or **Edit**.

### 4.1 Bootstrap (first login)

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| TEN-1 | Exactly one organization per deployment. | YES | M |
| TEN-2 | Persist `organization_id` on all business rows anyway. | YES | M |
| TEN-3 | No self-serve public signup. No “Create an account” on the login page. | YES | M |
| BOOT-1 | On first install, create **one Super Admin** (email + password) via a one-time setup wizard or env/seed. After that, setup cannot create another first user. | YES | M |
| BOOT-2 | Until Super Admin invites people and they accept, **only Super Admin can log in**. | YES | M |
| BOOT-3 | Super Admin is the Owner: all folders, all settings, invite users, assign roles and folder access. | YES | M |
| BOOT-4 | Login page shows **email**, **password**, and **Forgot password** only. | YES | M |
| BOOT-5 | Login page must not show Google, Apple, SSO, or any third-party IdP button. | YES | M |

### 4.2 Email/password auth

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| AUTH-1 | Login is email + password on one form (web and mobile). | YES | M |
| AUTH-2 | Forgot password sends an email reset link (existing active users only). | YES | M |
| AUTH-3 | Invited users set their password via the invite link (not via public signup). Super Admin does not need an invite. | YES | M |
| AUTH-4 | Sessions work on web and mobile. | YES | M |
| AUTH-5 | User can log out. | YES | M |
| AUTH-6 | Super Admin or Admin can deactivate a user and end their sessions. | YES | S |
| AUTH-7 | Passwords stored with bcrypt or argon2. | YES | M |
| AUTH-8 | Link Google on profile. | NO | — |
| AUTH-10 | Sign in with Google. | NO | — |
| AUTH-11 | Sign in with Apple. | NO | — |
| AUTH-12 | Sign in with company SSO (SAML/OIDC). | NO | — |

### 4.3 Users and Sortly-style invites

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| USR-1 | User fields: name, email, role, status (pending / active / deactivated), last login. | YES | M |
| USR-2 | Super Admin (and Admin, for Team Member / Scanner / custom only) invites by email. | YES | M |
| USR-3 | Invite status Pending until the person opens the link, sets password, and accepts; then Active. | YES | M |
| USR-4 | Resend invite. | YES | S |
| USR-5 | Revoke a pending invite. | YES | S |
| USR-6 | Unlimited user seats. | YES | M |
| USR-7 | User can change own name and password. Email change only if Super Admin/Admin allows (default: Super Admin can change any user’s email). | YES | M |
| USR-8 | Invited user cannot log in until they accept the invite and set a password. | YES | M |
| USR-9 | Deactivated users cannot log in. | YES | M |
| INV-1 | Invite form: email, display name (optional), **role** (Super Admin, Admin, Team Member, Scanner, or a custom role). | YES | M |
| INV-2 | Only Super Admin can invite another Super Admin or an Admin. | YES | M |
| INV-3 | Admin may invite Team Member, Scanner, and custom roles, not Super Admin. | YES | M |
| INV-4 | Team Member and Scanner **must** be given folder access on invite (same as Sortly Manage Team). | YES | M |
| INV-5 | Per folder on invite: **Edit** or **View only**. Multiple folders allowed. | YES | M |
| INV-6 | Super Admin and Admin always see all folders; they are not assigned folder-by-folder. | YES | M |
| INV-7 | After invite, Super Admin/Admin can change role and folder grants (add/revoke View or Edit per folder). | YES | M |
| INV-8 | Folder access can also be granted from a folder’s Manage Team (add user to this folder with View or Edit). | YES | S |
| INV-9 | Invite email contains a single-use (or expiring) link to set password and join this organization only. | YES | M |
| INV-10 | Invite email is scoped to this one organization; there is no account picker. | YES | M |
| ORG-DEL-1 | Super Admin can delete the organization after typing the confirm name; irreversible. | YES | S |

---

## 5. Roles and permissions

### 5.1 Roles

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| ROLE-1 | Role **Super Admin** (Sortly Owner): all folders, all settings, users, invites, integrations, delete org. The first user is always this role. | YES | M |
| ROLE-2 | Role **Admin**: all folders, invite Team Member/Scanner/custom, inventory, reports, workflows; cannot delete org, cannot invite/demote Super Admin, cannot remove the last Super Admin. | YES | M |
| ROLE-3 | Role **Team Member**: only assigned folders; cannot manage users or global settings. | YES | M |
| ROLE-4 | Team Member folder grant is **View** or **Edit**. | YES | M |
| ROLE-5 | Role **Scanner** (limited): assigned folders; scan, move, qty, pick, count, job pull/return only. | YES | M |
| ROLE-6 | Scanner cannot edit item master (name, photos, custom fields, price) unless a permission says otherwise. | YES | M |
| ROLE-7 | Scanner cannot open Reports, Manage Team, Custom Fields, Company, Integrations. | YES | M |
| ROLE-8 | Scanner cannot create or edit saved addresses. | YES | P2 |
| ROLE-10 | Multiple **custom roles** are allowed (Sortly allows one; we allow many). | YES | M |
| ROLE-11 | Custom role matrix toggles each action in §5.2. | YES | M |
| ROLE-12 | Hide prices permission: user never sees unit price or total value. | YES | S |
| ROLE-13 | Field visibility: custom role can hide selected custom fields. | YES | S |
| ROLE-14 | PO access: Super Admin/Admin yes; Team Member only if enabled; Scanner no unless enabled. | YES | P2 |
| ROLE-15 | Pick list / count / job access independently grantable. | YES | P2 |
| ROLE-16 | At least one Super Admin must remain. | YES | M |

### 5.2 Permission matrix (every action)

Default: Super Admin (Owner)=Y, Admin=Y, Member Edit=E, Member View=V, Scanner=S. `Y` yes, `-` no, `F` if folder Edit, `v` if folder View (read).

| ID | Action | Super Admin | Admin | Member Edit | Member View | Scanner |
| --- | --- | --- | --- | --- | --- | --- |
| PERM-01 | View item/folder in assigned tree | Y | Y | F | v | F/v |
| PERM-02 | Add item | Y | Y | F | - | - |
| PERM-03 | Edit item master | Y | Y | F | - | - |
| PERM-04 | Delete item | Y | Y | F | - | - |
| PERM-05 | Update quantity | Y | Y | F | - | F |
| PERM-06 | Move item | Y | Y | F | - | F |
| PERM-07 | Clone item | Y | Y | F | - | - |
| PERM-08 | Merge item | Y | Y | F | - | - |
| PERM-09 | Create/print labels | Y | Y | F | - | F (print existing) |
| PERM-10 | Link barcode | Y | Y | F | - | F |
| PERM-11 | Set alerts | Y | Y | F | - | - |
| PERM-12 | Add folder | Y | Y | F | - | - |
| PERM-13 | Edit/move/delete folder | Y | Y | F | - | - |
| PERM-14 | Bulk edit | Y | Y | F | - | - |
| PERM-15 | Import | Y | Y | - | - | - |
| PERM-16 | Export CSV/PDF | Y | Y | F | v | - |
| PERM-17 | Reports | Y | Y | configurable | - | - |
| PERM-18 | Manage users / send invites | Y | Team only | - | - | - |
| PERM-19 | Company settings | Y | Y | - | - | - |
| PERM-20 | Custom fields / UOM / reasons | Y | Y | - | - | - |
| PERM-21 | Workflows create | Y | Y | configurable | - | participate |
| PERM-22 | Resolve stock count | Y | Y | creator only | - | - |
| PERM-23 | Approve PO | Y | Y | if granted | - | - |
| PERM-24 | Receive PO | Y | Y | F | - | F if granted |
| PERM-25 | See prices | Y | Y | Y unless hidden | Y unless hidden | N unless granted |

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| ACL-1 | Folder ACL is stored per user per folder. | YES | M |
| ACL-2 | Child folders inherit parent grant unless overridden. | YES | M |
| ACL-3 | User cannot see or search items in folders they cannot view. | YES | M |
| ACL-4 | Scanning a code for a forbidden item returns “no access,” not the item. | YES | M |
| ACL-5 | Manage Team is also available from a folder’s settings (add user to this folder). | YES | S |

---

## 6. Organization and preferences

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| ORG-1 | Company name. | YES | M |
| ORG-2 | Industry (text or list). | YES | S |
| ORG-3 | Company logo upload. | YES | M |
| ORG-4 | App accent color. | YES | M |
| ORG-5 | Company initials (shown if no logo). | YES | M |
| ORG-6 | Country. | YES | M |
| ORG-7 | Currency (used for price and total value). | YES | M |
| ORG-8 | Date format. | YES | M |
| ORG-9 | Timezone; option to detect automatically. | YES | M |
| PREF-1 | Per-user default catalog view: Grid, List, or Table. | YES | M |
| PREF-2 | Per-user default sort: Name, Updated at, Quantity, Price, Total value. | YES | M |
| PREF-3 | Mobile theme: system, always light, always dark. | YES | M |
| PREF-4 | Notification email on/off per user. | YES | S |

---

## 7. Web information architecture

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| WEB-1 | Persistent left navigation. | YES | M |
| WEB-NAV-1 | Dashboard. | YES | M |
| WEB-NAV-2 | Items. | YES | M |
| WEB-NAV-3 | Workflows. | YES | P2 (nav visible in P1 as empty/coming if needed; better hide until P2) |
| WEB-NAV-4 | Search (Advanced Search). | YES | M |
| WEB-NAV-5 | Tags. | YES | M |
| WEB-NAV-6 | Reports. | YES | M |
| WEB-NAV-7 | Notifications. | YES | M |
| WEB-NAV-8 | Settings. | YES | M |
| WEB-NAV-9 | Help. | YES | M |
| WEB-2 | Main canvas is the selected section. | YES | M |
| WEB-3 | Light workspace, white rounded cards, one accent color, generous padding. | YES | M |
| WEB-4 | Usable at 1280×720; cards usable at 768. | YES | M |
| WEB-5 | Keyboard usable for search and forms. | YES | M |

Hide Workflows nav until Phase 2 ships if it would be an empty screen.

---

## 8. Items workspace UI (every control)

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| UI-1 | Breadcrumb: `All Items → …` each segment clickable. | YES | M |
| UI-2 | Current folder shows child folders and items mixed. | YES | M |
| UI-3 | Top search field (name, SID, barcode). | YES | M |
| UI-4 | Add Item button. | YES | M |
| UI-5 | Add Folder button. | YES | M |
| UI-6 | Scanner icon (scan-to-search). | YES | M |
| UI-7 | Sort control (Name, Updated at, Quantity, Price, Total value). | YES | M |
| UI-8 | View control: Grid, List, Table. | YES | M |
| UI-9 | Group items toggle. | YES | M |
| UI-VIEW-1 | Grid: photo-led tiles, name, qty+unit, price. | YES | M |
| UI-VIEW-2 | List: denser rows; configured custom fields visible (e.g. expiry). | YES | M |
| UI-VIEW-3 | Table: spreadsheet, horizontal scroll, all fields including custom columns. | YES | M |
| UI-CARD-1 | Item card checkbox top-left. | YES | M |
| UI-CARD-2 | Hover/focus: Set alerts. | YES | M |
| UI-CARD-3 | Hover/focus: Update quantity. | YES | M |
| UI-CARD-4 | Hover/focus: Move to folder. | YES | M |
| UI-CARD-5 | Overflow `⋯` menu. | YES | M |
| UI-CARD-6 | First photo is the thumbnail; placeholder prompts add photo if empty. | YES | M |
| UI-CARD-7 | Total value = qty × price, live. | YES | M |
| UI-CARD-8 | Low-stock visual if qty ≤ min. | YES | S |
| UI-CARD-9 | Out-of-stock visual if qty = 0. | YES | S |
| UI-FOLD-1 | Folder card: Set date alert, Edit, Move. | YES | M |
| UI-FOLD-2 | Folder `⋯`: history, create label, export, clone, delete. | YES | M |
| UI-MENU-I-1 | Item `⋯`: Activity/history. | YES | M |
| UI-MENU-I-2 | Item `⋯`: Create label. | YES | M |
| UI-MENU-I-3 | Item `⋯`: Export PDF/CSV. | YES | M |
| UI-MENU-I-4 | Item `⋯`: Clone. | YES | M |
| UI-MENU-I-5 | Item `⋯`: Merge. | YES | M |
| UI-MENU-I-6 | Item `⋯`: Delete. | YES | M |
| UI-ADD-1 | Add Item is a modal (web) or full screen (mobile). | YES | M |
| UI-ADD-2 | Default visible fields: Name, Quantity, UOM, Min level, Alert bell, Price, computed Value, photos, folder, variants toggle. | YES | M |
| UI-ADD-3 | “Show all fields” reveals notes, tags, custom fields, barcode link. | YES | M |
| UI-ADD-4 | Required on submit: Name and Quantity. | YES | M |
| UI-ADD-5 | Mobile Save is top-right. | YES | M |
| UI-DET-1 | Click card opens item/folder detail: photos, all fields, SID, barcode image, alerts, history, Edit. | YES | M |
| UI-MOVE-1 | Move dialog: qty (not silent all), reason, destination folder tree, optional note. | YES | M |
| UI-MOVE-2 | After move, highlight destination folder. | YES | S |
| UI-QTY-1 | Qty dialog: +/− stepper, typed number, reason, optional note. | YES | M |
| UI-ALT-1 | Alert wizard: type → condition → recipients → confirm. Bell shows on item. | YES | M |

---

## 9. Folders (every field and action)

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| FLD-1 | Root folder named **All Items** always exists. | YES | M |
| FLD-2 | Nesting max **6** levels including All Items. | YES | M |
| FLD-3 | Creating a 7th level is rejected with a clear error. | YES | M |
| FLD-4 | Folder name is required. | YES | M |
| FLD-5 | Optional: notes. | YES | M |
| FLD-6 | Optional: tags. | YES | M |
| FLD-7 | Optional: up to 8 photos. | YES | M |
| FLD-8 | Optional: custom field values (folder-applicable fields). | YES | M |
| FLD-9 | System folder SID, visible on edit. | YES | M |
| FLD-10 | Optional QR/barcode native + extra. | YES | M |
| FLD-11 | `parent_id` null only for All Items; all others have a parent. | YES | M |
| FLD-12 | Create folder in current location. | YES | M |
| FLD-13 | Rename folder. | YES | M |
| FLD-14 | Move folder to a new parent (depth rule enforced). | YES | M |
| FLD-15 | Clone folder without contents. | YES | M |
| FLD-16 | Clone folder with nested items and subfolders. | YES | M |
| FLD-17 | Delete folder: confirm; if not empty, warn and require explicit cascade or block. | YES | M |
| FLD-18 | Scanning a folder code opens that folder if permitted. | YES | M |
| FLD-19 | Print folder label. | YES | M |
| FLD-20 | Items may live directly in All Items (no subfolder). | YES | M |
| FLD-21 | Unlimited number of folders (depth is the only limit). | YES | M |
| FLD-22 | Folder history shows transactions for the folder and its items. | YES | M |

---

## 10. Items (every field and action)

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| ITM-1 | Required: name. | YES | M |
| ITM-2 | Required: quantity (numeric, scale per UOM, default 1). | YES | M |
| ITM-3 | Unit of measure. | YES | M |
| ITM-4 | Min quantity (reorder point), optional. | YES | M |
| ITM-5 | Unit price, optional, currency from org. | YES | M |
| ITM-6 | Total value displayed as qty × price. | YES | M |
| ITM-7 | Notes, optional. | YES | M |
| ITM-8 | Up to 8 photos. | YES | M |
| ITM-9 | Tags, many. | YES | M |
| ITM-10 | Parent folder (default current). | YES | M |
| ITM-11 | Auto SID. | YES | M |
| ITM-12 | Native generated QR or barcode URL/value. | YES | M |
| ITM-13 | Extra linked manufacturer barcode/QR (second code). | YES | M |
| ITM-14 | Custom field values. | YES | M |
| ITM-15 | Created at, updated at, created by, updated by. | YES | M |
| ITM-16 | Create item. | YES | M |
| ITM-17 | Edit item. | YES | M |
| ITM-18 | Delete item (confirm). | YES | M |
| ITM-19 | Soft-delete with Restore from history (activity type Restored). | YES | S |
| ITM-20 | Open detail. | YES | M |
| ITM-21 | Quantity cannot go below 0 (default). | YES | M |
| ITM-22 | Serial number, warranty, expiry, manufacturer are **custom fields**, not hardcoded. | YES | M |
| DEL-1 | Deleted items are hidden from catalog but recoverable for 30 days if ITM-19 is on. | YES | S |
| DEL-2 | Bulk delete selected items with confirm. | YES | M |

---

## 11. SID, clone, merge, group

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| SID-1 | Generate human SID unique among unique identities (pattern e.g. `S01QSR0001`). | YES | M |
| SID-2 | SID printed on labels. | YES | M |
| SID-3 | Internal primary key is UUID, not SID. | YES | M |
| SID-4 | Search by SID. | YES | M |
| CLN-1 | Clone copies name, photos, fields, tags, UOM, price, min, barcodes policy as below. | YES | M |
| CLN-2 | Clone option: **keep SID** (multi-location). | YES | M |
| CLN-3 | Clone option: **new SID** (serialized). | YES | M |
| CLN-4 | Keep SID ⇒ same QR/barcode as original. | YES | M |
| CLN-5 | New SID ⇒ new QR/barcode. | YES | M |
| CLN-6 | Clone target folder selectable; quantity set by user. | YES | M |
| CLN-7 | Clone folder API/UI supports include_subtree. | YES | M |
| MRG-1 | Auto-merge only if same SID **and** same folder **and** all details identical. | YES | M |
| MRG-2 | If any detail differs, do not auto-merge. | YES | M |
| MRG-3 | Manual merge: pick surviving item; warn mismatches; irreversible; qty sums; loser SID row removed. | YES | M |
| MRG-4 | Merge only same SID in the same folder. | YES | M |
| GRP-1 | Group Items ON: same-SID clones and variant groups show as one tile with count. | YES | M |
| GRP-2 | Group Items OFF: every row visible. | YES | M |
| GRP-3 | Opening a group shows member items. | YES | M |

---

## 12. Variants

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| VAR-1 | Toggle “This item has variants” on create. | YES | P2 |
| VAR-2 | Max 3 attributes (e.g. Size, Color, Sleeve). | YES | P2 |
| VAR-3 | Each attribute has a list of options. | YES | P2 |
| VAR-4 | After attributes, a qty matrix for each combination. | YES | P2 |
| VAR-5 | Each combination is an item with its own SID. | YES | P2 |
| VAR-6 | Parent is an item group; group QR optional; scan opens all variants. | YES | P2 |
| VAR-7 | Photos are per variant (not auto-copied to all). | YES | P2 |
| VAR-8 | User can add a missing option later (e.g. add Size Small) and create the new combinations. | YES | P2 |
| VAR-9 | Labels can be bulk-created for all variants. | YES | P2 |
| VAR-10 | Existing non-variant items are not retrofitted unless user converts (v1: variants only at create is acceptable if documented). | YES | P2 |

---

## 13. Custom fields (every type and limit)

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| CF-1 | Admin defines fields: name, type, applies to items / folders / both, placeholder, default. | YES | M |
| CF-2 | Applies-to cannot change after create. | YES | M |
| CF-3 | Type cannot change after create. | YES | M |
| CF-4 | To cover the other entity, create a new field. | YES | M |
| CF-5 | Field name max 190 characters. | YES | M |
| CF-6 | Placeholder max 190 characters. | YES | M |
| CF-10 | Type **small text**: value max 190. | YES | M |
| CF-11 | Type **large text**: value max 4000; name/placeholder 190. | YES | M |
| CF-12 | Type **whole number**: integer, max 2,147,483,647. | YES | M |
| CF-13 | Type **decimal**: max 68,719,476,735.99999. | YES | M |
| CF-14 | Type **checkbox**. | YES | M |
| CF-15 | Type **date/time**; can drive date alerts. | YES | M |
| CF-16 | Type **dropdown** with admin-defined options; option text 190. | YES | M |
| CF-17 | Type **web link**: value max 300. | YES | M |
| CF-18 | Type **phone**: 190, basic format validation. | YES | M |
| CF-19 | Type **email**: 190, email validation. | YES | M |
| CF-20 | Type **scanner/barcode**: 190; can capture via scan. | YES | M |
| CF-21 | Type **file attachment**: max 3 files (pdf, doc, docx, xls, xlsx); field name 190. | YES | S |
| CF-22 | Unlimited number of custom fields (no plan cap). | YES | M |
| CF-23 | Reorder fields for form display. | YES | S |
| CF-24 | Delete field: confirm; existing values removed. | YES | M |
| CF-25 | Show field on list/table when “visible in list” is on. | YES | S |

---

## 14. Tags

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| TAG-1 | Org-wide tag names, unique case-insensitive. | YES | M |
| TAG-2 | Create tag from Tags screen. | YES | M |
| TAG-3 | Create tag inline from item/folder edit. | YES | M |
| TAG-4 | Assign/remove many tags on items and folders. | YES | M |
| TAG-5 | Tags screen lists tags; filled icon if any items, empty if none. | YES | S |
| TAG-6 | Click tag shows all matching items across folders (ACL applied). | YES | M |
| TAG-7 | Rename tag (updates all uses). | YES | S |
| TAG-8 | Delete tag (removes associations). | YES | M |
| TAG-9 | Tags are not a substitute for folders; they cut across the tree. | YES | M |

---

## 15. Units of measure

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| UOM-1 | Types: count, weight, length, volume. | YES | M |
| UOM-2 | Count built-in: `units`. | YES | M |
| UOM-3 | Weight built-in: `lbs`, `g`, `kg`, `oz`. | YES | M |
| UOM-4 | Length built-in: `yd`, `cm`, `ft`, `in`, `m`. | YES | M |
| UOM-5 | Volume built-in: `gal`, `ml`, `l`, `ft3`, `in3`. | YES | M |
| UOM-6 | Area units `ft2`, `in2` allowed under volume/area as in Sortly API. | YES | S |
| UOM-7 | Decimal scale up to 4. | YES | M |
| UOM-8 | Admin can add custom unit names (box, roll, each, pair, …). | YES | S |
| UOM-9 | Item stores UOM type + name + value. | YES | M |

---

## 16. Photos and files

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| MED-1 | Max 8 images per item. | YES | M |
| MED-2 | Max 8 images per folder. | YES | M |
| MED-3 | Web: upload from disk. | YES | M |
| MED-4 | Mobile: camera and library. | YES | M |
| MED-5 | Reorder photos; first is thumbnail. | YES | S |
| MED-6 | Delete a photo. | YES | M |
| MED-7 | Server stores originals in object storage; generate card thumbnails. | YES | M |
| MED-8 | Compress reasonably; reject huge files with a message. | YES | M |
| MED-9 | Custom-field files stored in object storage. | YES | S |

---

## 17. Transactions

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| TXN-1 | Append-only log; no update/delete of stock transactions. | YES | M |
| TXN-2 | Log: create item, delete item, restore item. | YES | M |
| TXN-3 | Log: create folder, delete folder, restore folder. | YES | M |
| TXN-4 | Log: edit item details (name, fields, tags, photos, price, min). | YES | M |
| TXN-5 | Log: edit folder details. | YES | M |
| TXN-6 | Log: quantity add. | YES | M |
| TXN-7 | Log: quantity subtract. | YES | M |
| TXN-8 | Log: quantity set. | YES | M |
| TXN-9 | Log: move (from, to, qty). | YES | M |
| TXN-10 | Log: merge. | YES | M |
| TXN-11 | Log: clone. | YES | M |
| TXN-12 | Log: bulk edit as one batch id plus per-item rows. | YES | M |
| TXN-13 | Log: PO receive, pick, count adjustment, job pull, job return, job consume. | YES | P2 |
| TXN-14 | Fields: id, type, item_id, from_folder_id, to_folder_id, qty_delta, reason, note, user_id, document_type, document_id, created_at, batch_id. | YES | M |
| TXN-15 | A move writes matching negative (source) and positive (dest) qty effects. | YES | M |
| TXN-16 | Job pull uses the same double-entry as TXN-15. | YES | P2 |
| TXN-17 | Item history UI reads this log. | YES | M |
| TXN-18 | Folder history UI reads this log. | YES | M |
| TXN-19 | Corrections are new transactions, never edits. | YES | M |
| TXN-20 | Same DB transaction as item qty/folder write; row-lock the item. | YES | M |

---

## 18. Transaction reasons

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| RSN-1 | Two lists: Quantity reasons and Move reasons. | YES | M |
| RSN-Q-1 | Built-in qty: Consumed. | YES | M |
| RSN-Q-2 | Built-in qty: Damaged. | YES | M |
| RSN-Q-3 | Built-in qty: Inventory Count Adjustment. | YES | M |
| RSN-Q-4 | Built-in qty: Picked. | YES | M |
| RSN-Q-5 | Built-in qty: Restocked. | YES | M |
| RSN-Q-6 | Built-in qty: Returned. | YES | M |
| RSN-Q-7 | Built-in qty: Sold. | YES | M |
| RSN-Q-8 | Built-in qty: Stock Take. | YES | M |
| RSN-M-1 | Built-in move: Added to Job. | YES | M |
| RSN-M-2 | Built-in move: Consumed. | YES | M |
| RSN-M-3 | Built-in move: Damaged. | YES | M |
| RSN-M-4 | Built-in move: Donation. | YES | M |
| RSN-M-5 | Built-in move: End of Life (EOL). | YES | M |
| RSN-M-6 | Built-in move: Expired. | YES | M |
| RSN-M-7 | Built-in move: Gift. | YES | M |
| RSN-M-8 | Built-in move: Incorrectly Added. | YES | M |
| RSN-M-9 | Built-in move: Inventory Count Adjustment. | YES | M |
| RSN-M-10 | Built-in move: Invoice Not Received. | YES | M |
| RSN-M-11 | Built-in move: Other. | YES | M |
| RSN-M-12 | Built-in move: Out of Season. | YES | M |
| RSN-M-13 | Built-in move: Picked. | YES | M |
| RSN-M-14 | Built-in move: Quality Control. | YES | M |
| RSN-M-15 | Built-in move: Replenish. | YES | M |
| RSN-M-16 | Built-in move: Return to Supplier. | YES | M |
| RSN-M-17 | Built-in move: Signed In. | YES | M |
| RSN-M-18 | Built-in move: Signed Out. | YES | M |
| RSN-M-19 | Built-in move: Sold. | YES | M |
| RSN-2 | Custom reasons: up to 15 extra per list. | YES | S |
| RSN-3 | Custom reason name max 20 characters. | YES | S |
| RSN-4 | Hide a built-in reason from dropdowns (do not delete history). | YES | S |
| RSN-5 | One default reason per list. | YES | S |
| RSN-6 | Required-reason toggle per list (qty and/or move). | YES | S |
| RSN-7 | Bulk operations use one reason for the batch. | YES | M |
| RSN-8 | Optional free-text transaction note on qty and move. | YES | M |

---

## 19. Move and check-in / check-out

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| MOV-1 | Move requires qty ≤ available in source. | YES | M |
| MOV-2 | Move requires destination folder. | YES | M |
| MOV-3 | Move creates dest row if same SID not already in dest. | YES | M |
| MOV-4 | Bulk move from checkboxes. | YES | M |
| MOV-5 | Bulk move from Advanced Search results. | YES | M |
| MOV-6 | Check-out = move to a person/van/site folder. | YES | M |
| MOV-7 | Check-in = move back to stock folder. | YES | M |
| MOV-8 | Saved Quick Move actions (named dest folder) for scan checkout. | YES | M |
| MOV-20 | Return to Origin: dest = folder the qty last came from (stored on item/move). | YES | M |
| MOV-21 | Return to Origin available on web and mobile. | YES | M |
| MOV-22 | Cannot move to a folder the user cannot edit. | YES | M |

---

## 20. Quantity update

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| QTY-1 | Add quantity. | YES | M |
| QTY-2 | Subtract quantity. | YES | M |
| QTY-3 | Set quantity to an absolute value. | YES | M |
| QTY-4 | Stepper and typed input. | YES | M |
| QTY-5 | Reason + optional note. | YES | M |
| QTY-6 | Card hover and Quick Quantity both supported. | YES | M |

---

## 21. Search

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| SRCH-1 | Quick search: name. | YES | M |
| SRCH-2 | Quick search: SID. | YES | M |
| SRCH-3 | Quick search: barcode/QR value. | YES | M |
| SRCH-4 | Advanced Search is web-only as a full page. | YES | M |
| SRCH-5 | Filter: folders. | YES | M |
| SRCH-6 | Filter: name. | YES | M |
| SRCH-7 | Filter: quantity (comparators). | YES | M |
| SRCH-8 | Filter: min level. | YES | M |
| SRCH-9 | Filter: price. | YES | M |
| SRCH-10 | Filter: SID. | YES | M |
| SRCH-11 | Filter: barcode. | YES | M |
| SRCH-12 | Filter: tags. | YES | M |
| SRCH-13 | Filter: custom fields. | YES | M |
| SRCH-14 | Filter: quantity alerts set. | YES | M |
| SRCH-15 | Filter: date alerts set. | YES | M |
| SRCH-16 | Apply Filters and Clear Filters. | YES | M |
| SRCH-17 | Results support bulk bar (edit, move, label, export). | YES | M |
| SRCH-18 | Scan-to-search web: focused search + camera or wedge. | YES | M |
| SRCH-19 | Scan-to-search mobile. | YES | M |
| SRCH-20 | Voice-to-search on mobile (device speech). | YES | S |
| SRCH-21 | Mobile search shows every permitted folder the item lives in. | YES | M |
| SRCH-22 | Sort on search results. | YES | M |

---

## 22. Barcodes, QR, labels (every type and wizard step)

### 22.1 Symbologies (generate and/or link)

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| SYM-1 | org.iso.QRCode | YES | M |
| SYM-2 | org.iso.Code128 (default 1D if unknown) | YES | M |
| SYM-3 | org.gs1.UPC-E | YES | M |
| SYM-4 | org.iso.Code39 | YES | M |
| SYM-5 | org.iso.Code39Mod43 | YES | S |
| SYM-6 | org.gs1.EAN-13 | YES | M |
| SYM-7 | org.gs1.EAN-8 | YES | M |
| SYM-8 | com.intermec.Code93 | YES | S |
| SYM-9 | org.ansi.Interleaved2of5 | YES | S |
| SYM-10 | org.iso.PDF417 | YES | S |
| SYM-11 | org.iso.Aztec | YES | S |
| SYM-12 | org.iso.DataMatrix | YES | S |

### 22.2 Link existing

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| LAB-LINK-1 | From item: Link QR/Barcode, scan, save as extra or native. | YES | M |
| LAB-LINK-2 | From folder: same. | YES | M |
| LAB-LINK-3 | Linking does not change SID. | YES | M |
| LAB-LINK-4 | Add-via-scan supports standard 1D barcodes, not QR/Data Matrix (QR is linked after create). | YES | M |
| LAB-LINK-5 | If UPC catalog lookup is disabled, keep code and require manual name. | YES | M |
| LAB-LINK-6 | Optional UPC lookup (Amazon/eBay style) prefills name/photo. | NO | — |

### 22.3 Label wizard

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| LAB-1 | Wizard step: QR vs Barcode. | YES | M |
| LAB-2 | Wizard step: paper size (US Letter, Avery templates, thermal/single). | YES | M |
| LAB-3 | Wizard step: label size (small/medium/large and thermal sizes including ~3" barcode). | YES | M |
| LAB-4 | Toggles only for fields that fit the size; photo only on large. | YES | M |
| LAB-5 | One extra detail slot: notes **or** price **or** min **or** tags **or** total value **or** one custom field. | YES | M |
| LAB-6 | Toggle company logo or icon. | YES | M |
| LAB-7 | QR thermal may include: item details, logo/icon, photo, custom notes. | YES | M |
| LAB-8 | Barcode thermal includes: item details, SID, barcode only (no photo). | YES | M |
| LAB-9 | Print qty: one per selected item. | YES | M |
| LAB-10 | Print qty: custom N copies each. | YES | M |
| LAB-11 | Print qty: one per on-hand quantity. | YES | M |
| LAB-12 | Sheet start position (skip used Avery slots). | YES | M |
| LAB-13 | Optional printing instructions page in PDF. | YES | S |
| LAB-14 | Optional email the PDF. | YES | S |
| LAB-15 | Output is PDF download. | YES | M |
| LAB-16 | Reprint does not change stored code values. | YES | M |
| LAB-17 | Bulk labels from selection, folder, or search. | YES | M |
| LAB-18 | Folder labels. | YES | M |
| LAB-19 | Variant group label (scan opens group). | YES | P2 |
| LAB-BLANK-1 | Print unlinked codes; later scan to attach to new or existing item. | YES | S |
| LAB-20 | Generated QR encodes authenticated deep link / SID, not a public URL. | YES | M |

### 22.4 Scanners

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| SCN-WEB-1 | Web: wedge scanner types into focused search (Items, Advanced Search, Reports, Pick Lists, Stock Counts). | YES | M |
| SCN-WEB-2 | Web: link code from item edit with scanner. | YES | M |
| SCN-WEB-3 | Web: **no** Quick Actions. | YES | M |
| SCN-MOB-1 | Mobile camera scan for search, add, link, Quick Actions, pick, count. | YES | M |
| SCN-BT-1 | Mobile setting Enable Bluetooth Scanning; persists until off. | YES | S |
| SCN-USB-1 | USB wedge on web as keyboard input. | YES | M |
| SCN-2 | 1D scanners cannot read QR; UI copy says use 2D scanner or camera. | YES | S |

---

## 23. Quick Actions (mobile)

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| QA-1 | Entry: Items → scanner icon. | YES | M |
| QA-2 | User selects or creates a Quick Action first. | YES | M |
| QA-3 | User can save multiple actions and swipe between them. | YES | M |
| QA-4 | + adds another action. | YES | M |
| QA-5 | Action: quantity add. | YES | M |
| QA-6 | Action: quantity subtract. | YES | M |
| QA-7 | Action: quantity set. | YES | M |
| QA-8 | Action: quantity edit (open stepper). | YES | M |
| QA-9 | Action: Quick Move to a pre-chosen folder. | YES | M |
| QA-10 | Action: add tag. | YES | M |
| QA-11 | Action: remove tag. | YES | M |
| QA-12 | Action: set tag (replace). | YES | M |
| QA-13 | Action: clone. | YES | M |
| QA-14 | Action: open edit. | YES | M |
| QA-15 | Action: delete (with confirm unless confirm-all is off — still confirm delete). | YES | M |
| QA-16 | Qty-per-scan multiplier (one beep = N). | YES | M |
| QA-17 | Setting: Confirm all updates (popup vs immediate apply). | YES | M |
| QA-18 | Setting: option to show item card instead of generic confirm. | YES | S |
| QA-19 | Setting: enable sound beep on successful scan. | YES | S |
| QA-20 | Unknown code: friendly error, do not apply. | YES | M |

---

## 24. Alerts and notifications

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| ALT-1 | Quantity alert: comparator at-or-below min. | YES | M |
| ALT-2 | Quantity alert: comparator greater-than (optional extra). | YES | S |
| ALT-3 | Recipients: all Super Admins, all Admins, all Team Members, or pick users. | YES | M |
| ALT-4 | Date alert on a date/time custom field. | YES | M |
| ALT-5 | Date when: before, on, or after the date. | YES | M |
| ALT-6 | Date offset unit: days, weeks, months, years. | YES | M |
| ALT-7 | Date alerts on items. | YES | M |
| ALT-8 | Date alerts on folders (date only, no qty). | YES | M |
| ALT-9 | Wizard from card, item bell, folder `⋯`. | YES | M |
| ALT-10 | In-app notification created when alert fires. | YES | M |
| ALT-MAIL-1 | Email when quantity alert fires. | YES | M |
| ALT-MAIL-2 | Email when date alert fires. | YES | M |
| NTF-1 | Notifications inbox lists alerts. | YES | M |
| NTF-2 | Filter by alert type. | YES | M |
| NTF-3 | Filter by status (unread/read/active). | YES | S |
| NTF-4 | Filter by date range. | YES | M |
| NTF-5 | Sort newest/oldest. | YES | M |
| NTF-6 | Click opens the item/folder. | YES | M |
| NTF-PUSH-1 | Mobile push for alerts when permitted by OS. | YES | S |
| ALT-MGT-1 | Settings → Manage alerts: name, type, description, trigger, last triggered, created, recipients, SID, folder. | YES | S |
| ALT-MGT-2 | Bulk edit/delete alerts. | YES | S |
| ALT-11 | No alerts on invoices or POs (v1). | YES | M |
| ALT-12 | Activity notify (created/edited/moved/deleted) via Slack/Teams/webhook only in Phase 3. | YES | P3 |

---

## 25. Bulk, import, export

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| BULK-1 | Selecting any checkbox shows sticky bulk bar. | YES | M |
| BULK-2 | Select all on page. | YES | M |
| BULK-3 | Select all matching (search/folder). | YES | M |
| BULK-4 | Bulk Edit items: name, min, price, notes, tags, quantity (via txn), custom fields, alerts. | YES | M |
| BULK-5 | Tag bulk: add, remove, or replace. | YES | M |
| BULK-6 | Bulk Move. | YES | M |
| BULK-7 | Bulk Create label. | YES | M |
| BULK-8 | Bulk Export. | YES | M |
| BULK-9 | Bulk Set alerts. | YES | M |
| BULK-10 | Bulk edit folders: name, notes, tags, custom fields. | YES | S |
| BULK-11 | Folder bulk: optional apply to subfolders and items. | YES | S |
| IMP-1 | Download CSV/XLSX template. | YES | M |
| IMP-2 | Upload org’s own Excel/CSV. | YES | M |
| IMP-3 | Quick import: all rows into one chosen folder. | YES | M |
| IMP-4 | Advanced import: folder path column places each row. | YES | M |
| IMP-5 | Import creates **new** items/folders only in Phase 1. | YES | M |
| IMP-6 | Duplicate rows in file: document behavior (reject or last wins) and implement consistently (reject duplicates). | YES | M |
| IMP-7 | Required import columns: name, quantity; folder for advanced. | YES | M |
| IMP-8 | Import photos by URL optional. | YES | C |
| IMP-9 | Mobile quick CSV import. | YES | S |
| IMP-10 | Error report for failed rows. | YES | M |
| EXP-1 | Export CSV. | YES | M |
| EXP-2 | Export XLSX. | YES | M |
| EXP-PDF-1 | PDF layout: list. | YES | M |
| EXP-PDF-2 | PDF layout: album (large photo per page). | YES | M |
| EXP-PDF-3 | PDF layout: compact. | YES | M |
| EXP-PDF-4 | Option: title page (custom title). | YES | M |
| EXP-PDF-5 | Option: summary page (by name or SID). | YES | M |
| EXP-PDF-6 | Option: include labels. | YES | M |
| EXP-PDF-7 | Option: include folders. | YES | M |
| EXP-PDF-8 | Choose up to 6 fields to print. | YES | M |
| EXP-PDF-9 | Remember last PDF options. | YES | S |
| EXP-PDF-10 | Export from folder `⋯` or bulk bar. | YES | M |
| EXP-DROP-1 | Export to Dropbox. | NO | — |
| BKP-1 | Super Admin/Admin full inventory backup (CSV/XLSX zip of items, folders, txns). | YES | M |

---

## 26. Dashboard

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| DASH-1 | Total unique items count. | YES | M |
| DASH-2 | Total folders count. | YES | M |
| DASH-3 | Total inventory value. | YES | M |
| DASH-4 | Recent activity list. | YES | M |
| DASH-5 | Recently added/updated items. | YES | M |
| DASH-6 | Low-stock list. | YES | M |
| DASH-7 | Filter dashboard by folder. | YES | M |
| DASH-8 | Filter by activity type. | YES | S |
| DASH-9 | Links into reports. | YES | S |

Mobile: Dashboard is **not** a bottom tab (Sortly replaced it with Workflows). Totals can appear at top of Items (hide-stats option).

---

## 27. Reports (each report fully)

Shared:

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| RPT-0 | Reports page lists all reports below. | YES | M |
| RPT-0b | Click row drills to item detail when applicable. | YES | M |
| RPT-0c | Sort columns asc/desc. | YES | M |
| RPT-0d | Export CSV/XLSX with filters applied. | YES | M |
| RPT-0e | Unlimited history retention. | YES | M |
| RPT-0f | ACL: only permitted folders’ data. | YES | M |
| RPT-0g | Group items toggle where it makes sense (summary). | YES | M |

**Activity History**

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| RPT-AH-1 | Lists activities on items, folders, tags. | YES | M |
| RPT-AH-2 | Filter action: Moved. | YES | M |
| RPT-AH-3 | Filter action: Edited. | YES | M |
| RPT-AH-4 | Filter action: Deleted. | YES | M |
| RPT-AH-5 | Filter action: Created. | YES | M |
| RPT-AH-6 | Filter action: Restored. | YES | S |
| RPT-AH-7 | Filter action: Quantity Changed. | YES | M |
| RPT-AH-8 | Filter action: Merged. | YES | M |
| RPT-AH-9 | Filter SID. | YES | M |
| RPT-AH-10 | Filter date range (day/week/month/custom). | YES | M |
| RPT-AH-11 | Filter user. | YES | M |

**Inventory Summary**

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| RPT-IS-1 | Qty and value by item, including each folder location. | YES | M |
| RPT-IS-2 | Rollup of same name/SID across folders. | YES | M |
| RPT-IS-3 | Filter folder, name, qty, min, tags, alerts. | YES | M |
| RPT-IS-4 | Summary mode vs individual lines. | YES | S |
| RPT-IS-5 | This is the multi-location “where is this item?” report. | YES | M |

**Low Stock**

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| RPT-LS-1 | Items with qty ≤ min quantity and min set. | YES | M |

**Transactions**

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| RPT-TX-1 | Qty-affecting ledger at time of txn (historical snapshot of item). | YES | M |
| RPT-TX-2 | Filter date, folder, tags, txn type, user, SID, barcode. | YES | M |
| RPT-TX-3 | Show reason and note. | YES | M |

**Item Flow**

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| RPT-IF-1 | Per item: increases, decreases, net, txn count over range. | YES | S |
| RPT-IF-2 | Includes job folder movements. | YES | P2 |
| RPT-IF-3 | Link to filtered Transactions report. | YES | S |

**Move Summary**

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| RPT-MS-1 | Transfers grouped by source folder with destination breakdown. | YES | S |
| RPT-MS-2 | Includes inventory ↔ job folder moves. | YES | P2 |
| RPT-MS-3 | Drill to transaction report. | YES | S |

**User Activity Summary**

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| RPT-UA-1 | Counts of moves, updates, creates, deletes per user. | YES | S |
| RPT-UA-2 | Filter user and date. | YES | S |

**Quantity Change by Item**

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| RPT-QC-1 | Net qty delta per item in a date range. | YES | S |

**Saved reports & subscriptions (Phase 3)**

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| RPT-SAV-1 | Save filters and layout as a named report. | YES | P3 |
| RPT-SUB-1 | Email a report once or on a schedule. | YES | P3 |
| RPT-SNAP-1 | Monthly inventory snapshot stored (up to 13 months). | YES | P3 |

---

## 28. Settings screens (every page)

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| SET-1 | User profile. | YES | M |
| SET-2 | Preferences (view, sort, theme, timezone). | YES | M |
| SET-3 | Company details. | YES | M |
| SET-4 | Manage Team. | YES | M |
| SET-5 | Manage Permissions (custom roles). | YES | M |
| SET-6 | Custom fields. | YES | M |
| SET-7 | Units of measure. | YES | M |
| SET-8 | Transaction reasons. | YES | M |
| SET-9 | Manage alerts. | YES | S |
| SET-10 | Bulk import. | YES | M |
| SET-11 | Create labels / blank labels. | YES | M |
| SET-12 | Addresses. | YES | P2 |
| SET-13 | Job settings (default subfolders, extra fields). | YES | P2 |
| SET-14 | Integrations. | YES | P3 |
| SET-15 | Data backup. | YES | M |

---

## 29. Mobile app (every surface)

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| MOB-1 | App for iOS and Android, or PWA with camera + offline if native deferred. | YES | M |
| MOB-2 | Minimum iOS/Android versions documented at build time. | YES | M |
| MOB-3 | Lands on Items tab. | YES | M |
| MOB-4 | Bottom tab: Items. | YES | M |
| MOB-5 | Bottom tab: Workflows (Phase 2; hide in Phase 1). | YES | P2 |
| MOB-6 | Bottom tab: Search. | YES | M |
| MOB-7 | Bottom tab: Notifications. | YES | M |
| MOB-8 | Bottom tab: Menu. | YES | M |
| MOB-9 | FAB +: Add Item, Add Item via Scan, Add Folder. | YES | M |
| MOB-10 | Items: folder picker top-left. | YES | M |
| MOB-11 | Items: scanner top-right. | YES | M |
| MOB-12 | Items `⋯`: filter view, multi-select, search, export. | YES | M |
| MOB-13 | Filter: grid vs list. | YES | M |
| MOB-14 | Filter: hide stats (totals header). | YES | S |
| MOB-15 | Filter: group/summarize items. | YES | M |
| MOB-16 | Filter: hide folders. | YES | S |
| MOB-17 | Filter: hide SID. | YES | S |
| MOB-18 | Filter: sort options. | YES | M |
| MOB-19 | Menu: profile, preferences/theme, company, reports, import, custom fields, team, blank labels, tags, full sync, help. | YES | M |
| MOB-20 | No Dashboard tab (stats on Items). | YES | M |
| MOB-21 | Recent items via Last Modified sort, no 9-item cap. | YES | M |
| MOB-22 | Workflows: counts, picks, POs, jobs. | YES | P2 |
| MOB-23 | PO receive on mobile is manual qty (scan-to-receive not required). | YES | P2 |
| MOB-24 | Quick inventory adj without PO uses Items tab, not Workflows. | YES | P2 |
| MOB-25 | Jobs fully supported on mobile including pull/return/complete. | YES | P2 |

---

## 30. Offline and sync

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| OFF-1 | Cache folders/items the user can access. | YES | M |
| OFF-2 | Allow qty update offline. | YES | M |
| OFF-3 | Allow move offline. | YES | M |
| OFF-4 | Allow create item/folder offline (temp id, reconcile). | YES | S |
| OFF-5 | Queue mutations; sync when online. | YES | M |
| OFF-6 | Never drop a qty change; log both sides on conflict. | YES | M |
| OFF-7 | Conflict: last-write-wins on master data; qty always additive via txns. | YES | M |
| OFF-8 | Menu → Full sync. | YES | M |
| OFF-10 | Option: sync only on Wi-Fi. | YES | S |
| OFF-11 | Option: disable sync (debug); default off. | YES | C |
| OFF-12 | Automatic sync when online (unless disabled). | YES | M |
| OFF-13 | Cloud sync across web and mobile for the same org. | YES | M |

---

## 31. Addresses

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| ADR-1 | Settings → Addresses → New. | YES | P2 |
| ADR-2 | Fields: label, lines, city, region, postal, country. | YES | P2 |
| ADR-3 | Type: Primary, Billing, Shipping (optional flags). | YES | P2 |
| ADR-4 | Unlimited addresses (no 100/1000 plan cap). | YES | P2 |
| ADR-5 | Select Ship To / Bill To on PO. | YES | P2 |
| ADR-6 | Select Ship To on pick list. | YES | P2 |
| ADR-7 | Edit/delete address. | YES | P2 |

---

## 32. Workflows hub

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| WF-1 | Web Workflows lists: Jobs, Pick lists, Purchase orders, Stock counts, Invoices (P3). | YES | P2 |
| WF-2 | Mobile Workflows same operational docs. | YES | P2 |

---

## 33. Purchase orders (every field and status)

Statuses:

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| PO-S-1 | Status `draft`. | YES | P2 |
| PO-S-2 | Status `ready_for_review`. | YES | P2 |
| PO-S-3 | Status `approved`. | YES | P2 |
| PO-S-4 | Status `ordered`. | YES | P2 |
| PO-S-5 | Status `partially_received` (only via Receive). | YES | P2 |
| PO-S-6 | Status `received` (only via Receive). | YES | P2 |
| PO-S-7 | Status `voided` (final). | YES | P2 |
| PO-S-8 | Status `closed` (final). | YES | P2 |
| PO-S-9 | `draft` ↔ `ready_for_review` ↔ `approved` and any of those → `ordered`. | YES | P2 |
| PO-S-10 | From `ordered`: voided, closed, or receive. | YES | P2 |
| PO-S-11 | From partial/received: only closed. | YES | P2 |
| PO-S-12 | Status dropdown cannot set received/partial. | YES | P2 |
| PO-S-13 | Optimistic `version`; stale write returns conflict. | YES | S |

Header/lines:

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| PO-1 | Unique PO number; reject duplicates. | YES | P2 |
| PO-2 | Created by, submitted by. | YES | P2 |
| PO-3 | Last updated. | YES | P2 |
| PO-4 | Vendor name (text; vendor directory C). | YES | P2 |
| PO-5 | Ship To address. | YES | P2 |
| PO-6 | Bill To address. | YES | P2 |
| PO-7 | Notes. | YES | P2 |
| PO-8 | Line: existing item only (search, scan, bulk add). | YES | P2 |
| PO-9 | Line: qty, unit cost, expected date, photo from item. | YES | P2 |
| PO-10 | Totals computed (subtotal, total); client need not send them. | YES | P2 |
| PO-11 | No creating new catalog items from a PO line. | YES | P2 |
| PO-12 | No custom fields on PO header/lines in v1. | YES | P2 |
| PO-13 | No line-count cap of 100 (Sortly cap; we do not copy it). | YES | P2 |
| PO-14 | Receive: dest folder, qty per line; stock via txns. | YES | P2 |
| PO-15 | Partial receive allowed. | YES | P2 |
| PO-16 | PDF export for vendor. | YES | P2 |
| PO-17 | List columns: number, created by, submitted by, status, updated, ship to, vendor, cost. | YES | P2 |
| PO-18 | Item card “Ordered” icon if on open PO. | YES | S |
| PO-19 | Add item to existing Draft/Review/Approved PO from item flow. | YES | S |
| PO-20 | Create new Draft PO from item flow. | YES | S |
| PO-21 | Search-to-add on PO highlights low-stock items. | YES | S |
| PO-22 | History of POs on item detail. | YES | S |
| PO-23 | Mobile: cannot scan-to-receive (manual qty). | YES | P2 |
| PO-24 | New mobile PO starts Draft until status changed on web (or allow status on mobile for Admin). | YES | P2 |

---

## 34. Pick lists (every status and behavior)

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| PIK-S-1 | Draft: still adding/editing lines. | YES | P2 |
| PIK-S-2 | Ready to Pick. | YES | P2 |
| PIK-S-3 | In Progress (first pick moves here). | YES | P2 |
| PIK-S-4 | Partially Complete (some picked, stock updated). | YES | P2 |
| PIK-S-5 | Complete (all picked, stock updated). | YES | P2 |
| PIK-1 | Lines: item, location, qty to pick. | YES | P2 |
| PIK-2 | Header: ship-to, notes. | YES | P2 |
| PIK-3 | Add lines by search. | YES | P2 |
| PIK-4 | Add lines by scan. | YES | P2 |
| PIK-5 | Scan-to-pick: match increments picked by 1; mismatch rejected. | YES | P2 |
| PIK-6 | Completing decrements source via Picked reason txns. | YES | P2 |
| PIK-7 | Floor PDF: name, location, qty, barcode/QR. | YES | P2 |
| PIK-8 | Clone any status → new Draft (items, qtys, address, notes). | YES | S |
| PIK-9 | Add-to-existing only for Draft / Ready / In Progress. | YES | P2 |
| PIK-10 | Invoice clone is Phase 3 and not live-linked. | YES | P3 |

---

## 35. Stock counts (every status and behavior)

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| CNT-S-1 | Draft. | YES | P2 |
| CNT-S-2 | Ready to Count. | YES | P2 |
| CNT-S-3 | In Progress. | YES | P2 |
| CNT-S-4 | Submit for Review / In Review. | YES | P2 |
| CNT-S-5 | Complete. | YES | P2 |
| CNT-S-6 | Voided. | YES | P2 |
| CNT-1 | Add items by search. | YES | P2 |
| CNT-2 | Add items by scan (web scanning mode). | YES | P2 |
| CNT-3 | Bulk add from a folder. | YES | P2 |
| CNT-4 | Bulk add from Advanced Search (multi-folder). | YES | P2 |
| CNT-5 | Assign to a user or Everyone. | YES | P2 |
| CNT-6 | Optional due date. | YES | P2 |
| CNT-7 | Scan-to-count: scan shows item, increment or type qty, Confirm & Count. | YES | P2 |
| CNT-8 | Manage items (add/remove) in Draft, Ready, In Progress unless line counted/locked. | YES | P2 |
| CNT-9 | Submit for Review locks entries. | YES | P2 |
| CNT-10 | In Review shows expected vs counted, variance, notes. | YES | P2 |
| CNT-11 | Absolute discrepancy = sum of \|variance\|. | YES | P2 |
| CNT-12 | Only Super Admin, Admin, or creator resolves and writes qty (Count Adjustment). | YES | P2 |
| CNT-13 | Email on status change to assignee and Super Admins. | YES | S |
| CNT-14 | PDF at Draft, In Progress, Complete. | YES | S |

---

## 36. Jobs (every behavior)

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| JOB-S-1 | Status `not_started`. | YES | P2 |
| JOB-S-2 | Status `in_progress`. | YES | P2 |
| JOB-S-3 | Status `completed`. | YES | P2 |
| JOB-1 | Create job: number, start date, end date, notes, external link (optional). | YES | P2 |
| JOB-2 | Creating a job creates a dedicated job folder. | YES | P2 |
| JOB-3 | Job settings: default extra fields. | YES | S |
| JOB-4 | Job settings: default subfolders. | YES | S |
| JOB-5 | Open job from Workflows or from All Items → job folder. | YES | P2 |
| JOB-6 | Pull items from inventory into job (move txns −source +job). | YES | P2 |
| JOB-7 | Update qty / consume on job. | YES | P2 |
| JOB-8 | Return unused to inventory or another active job. | YES | P2 |
| JOB-9 | Complete: unused returned or consumed; record remains. | YES | P2 |
| JOB-10 | Active jobs list excludes completed. | YES | P2 |
| JOB-11 | Unlimited active jobs (no plan cap). | YES | P2 |
| JOB-12 | Mobile full job lifecycle + offline. | YES | P2 |
| JOB-13 | Reports filterable by job folder. | YES | P2 |

---

## 37. Invoices (Phase 3)

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| INV-1 | List: number, status, customer, created, updated; search by number. | YES | P3 |
| INV-2 | Fields: number, customer info, issue date, due date, status, lines from inventory. | YES | P3 |
| INV-3 | Status Draft. | YES | P3 |
| INV-4 | Status Open. | YES | P3 |
| INV-5 | Status Overdue (manual or by due date job). | YES | P3 |
| INV-6 | Status Paid (manual). | YES | P3 |
| INV-7 | PDF. | YES | P3 |
| INV-8 | Does not auto-decrement stock (picking/jobs do). | YES | P3 |
| INV-9 | Clone lines to Draft pick list; not bi-linked; any invoice status if lines saved. | YES | P3 |
| INV-10 | No custom fields on invoices in v1. | YES | P3 |
| INV-11 | Optional send to QBO. | YES | P3 |

---

## 38. Product link (external)

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| PLINK-1 | Optional external URL on an item (supplier page, catalog, datasheet). | YES | P2 |
| PLINK-2 | Tappable on detail (web + mobile). | YES | P2 |

(Sortly’s “Product Link” help article is treated as item↔code linking plus optional URL; barcode linking is LAB-LINK-*. )

---

## 39. Amazon / Online Orders (documented non-goals)

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| AMZ-1 | Amazon Business US order-from-item. | NO | — |
| AMZ-2 | Restock cart icon on low-stock cards. | NO | — |
| AMZ-3 | Amazon search using item photo. | NO | — |
| AMZ-4 | Order status placed→delivered inside the app. | NO | — |

---

## 40. Integrations (Phase 3)

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| INT-SLACK-1 | Notify a Slack channel on item created, edited, moved, deleted. | YES | P3 |
| INT-TEAMS-1 | Same for Microsoft Teams. | YES | P3 |
| INT-HOOK-1 | HTTPS webhooks for those events (JSON). | YES | P3 |
| INT-QBO-1 | Send invoice to QuickBooks Online. | YES | P3 |
| INT-QBO-2 | Send PO to QuickBooks Online. | YES | P3 |
| INT-QBO-3 | Map to a QBO income account; show last sent timestamp. | YES | P3 |
| API-1 | REST over HTTPS, JSON, bearer auth. | YES | P3 |
| API-2 | Items CRUD, list, recent, move, copy/clone. | YES | P3 |
| API-3 | Folders via same resource `type=folder`. | YES | P3 |
| API-4 | List custom fields, units, alerts CRUD. | YES | P3 |
| API-5 | POs list/create/update/status/receive. | YES | P3 |
| API-6 | Jobs list/create/update/status/items/return. | YES | P3 |
| API-7 | Pagination and documented rate limit. | YES | P3 |

---

## 41. Help (in-app)

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| HELP-1 | Help opens this product’s user guide or `docs/REQUIREMENTS.md` summary pages. | YES | S |
| HELP-NO-1 | SortlyBot chatbot. | NO | — |
| HELP-NO-2 | Public product news / upvote roadmap. | NO | — |

---

## 42. SaaS non-goals (listed so they are not “missing”)

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| SAAS-1 | Multi-account switcher. | NO | — |
| SAAS-2 | Billing, trials, plan SKUs, seat checkout. | NO | — |
| SAAS-3 | Unique-item or custom-field caps. | NO | — |
| SAAS-4 | RFID. | NO | — |
| SAAS-5 | Public QR landing pages. | NO | — |
| SAAS-6 | Auto invoice paid from payment processor. | NO | — |
| SAAS-7 | Shopify/WooCommerce. | NO | — |
| SAAS-8 | Demand forecasting. | NO | — |
| SAAS-9 | Sign in with Google. | NO | — |
| SAAS-10 | Sign in with Apple. | NO | — |
| SAAS-11 | SSO / SAML / OIDC. | NO | — |
| SAAS-12 | Public registration or “Create an account”. | NO | — |

---

## 42a. Chosen tech stack (locked)

Single organization, TypeScript end-to-end. One language for web, API, and mobile.

| Layer | Choice | Why |
| --- | --- | --- |
| Language | TypeScript | Shared types for items, folders, ACL, transactions |
| Web app | **Next.js** (App Router) + **Tailwind CSS** + **shadcn/ui** | Sortly-like cards, folder tree, dialogs; fast to ship |
| API | Next.js Route Handlers (REST JSON) | Same deploy as web; Expo consumes the same API |
| Auth | Email + password only (httpOnly session cookie on web; token on mobile). **argon2** hashes | Matches Super Admin → invite flow; no Google/Apple/SSO |
| Database | **PostgreSQL** | Real transactions, row locks, nested folders, reports |
| ORM | **Prisma** | Migrations, typed queries |
| Files | S3-compatible (**MinIO** local, **Cloudflare R2** or S3 in prod) | Photos, attachments, label PDFs |
| Email | SMTP (e.g. Resend or org SMTP) | Invite + password reset + alerts |
| Labels / PDF | **pdf-lib** | Avery + thermal PDFs without a browser |
| Barcodes | Server: `bwip-js`; mobile camera: Expo Barcode Scanner | Generate + scan |
| Mobile | **Expo** (React Native) | Camera, Bluetooth/wedge later, offline queue |
| Offline | SQLite on device + mutation queue, then sync to API | OFF-* requirements |
| Monorepo | **pnpm** workspaces: `apps/web`, `apps/mobile`, `packages/db` | Shared Prisma schema and TypeScript types |
| Hosting (prod) | Web+API on a Node host (VPS/Docker or Vercel); Postgres managed; object storage | One org, simple ops |

**Not used:** Firebase (weak inventory ledger), MongoDB (qty moves need SQL transactions), Laravel/PHP (second language), Flutter (second UI kit), Google/Apple/SSO.

---

## 43. Non-functional

| ID | Requirement | Include | Pri |
| --- | --- | --- | --- |
| NFR-1 | Authorize every folder on every request. | YES | M |
| NFR-2 | Scan-to-qty < 300 ms after decode when online. | YES | S |
| NFR-3 | Thumbnails on cards, not full originals. | YES | M |
| NFR-4 | English UI; org date/currency formats. | YES | M |
| NFR-5 | Daily backups DB + object storage. | YES | M |
| NFR-6 | HTTPS in production. | YES | M |
| NFR-7 | Empty, loading, and error states on all list screens. | YES | M |
| NFR-8 | Confirm destructive actions (delete, merge, void, complete job). | YES | M |
| NFR-9 | PostgreSQL with transactions and row locks on item qty/move. | YES | M |
| NFR-10 | Object storage for photos, attachments, PDFs. | YES | M |

---

## 44. Logical data fields (must persist)

Live **column names, fill rates, and SID behaviour** from Primary’s Sortly spreadsheet: `docs/DATA-MODEL.md` (source `sortly bulk export.xlsx`).

See also sections 9–10. Additional:

| Entity | Fields (minimum) |
| --- | --- |
| Organization | name, industry, logo, color, initials, country, currency, timezone, date_format |
| User | name, email, password_hash, role_id, status |
| FolderACL | user_id, folder_id, view\|edit |
| Folder | parent_id, name, notes, sid, barcodes, photos, tags, custom_values, origin metadata |
| Item | folder_id, name, qty, uom, min, price, notes, sid, barcodes, photos, tags, custom_values, variant_group_id, last_from_folder_id (origin), deleted_at |
| Tag | name |
| CustomField | name, type, applies_to, placeholder, default, options, list_visible |
| Transaction | see TXN-14 |
| Alert | kind, target, condition, recipients, last_triggered |
| Notification | user_id, alert_id, read_at, payload |
| Address | label, lines, types |
| PO / Pick / Count / Job / Invoice | headers + lines + status + version |
| QuickAction | user_id, type, dest_folder_id, tag, qty_multiplier |
| SavedReport | owner, type, filters, layout |

---

## 45. Acceptance journeys

| ID | Journey | Must pass |
| --- | --- | --- |
| J0 | After setup, only Super Admin can log in with email/password. Super Admin invites a Team Member to Warehouse (Edit) and a Viewer to Job site (View only). Invitee sets password via email link. Member cannot see unassigned folders. Google/Apple/SSO buttons are absent. | Phase 1 |
| J1 | Add Warehouse→Shelf→Bin and item Paint 30 gal with photo and price. | Phase 1 |
| J2 | Move 10 gal to van with reason Replenish; both qtys and histories correct; dest highlighted. | Phase 1 |
| J3 | Consume 5 gal to job-site folder. | Phase 1 |
| J4 | Clone drill with new SID, label, Quick Move to person, Return to Origin. | Phase 1 |
| J5 | Min 5, qty 4, in-app + email, low-stock report. | Phase 1 |
| J6 | Count assign, scan-to-count, review discrepancy, qty committed. | Phase 2 |
| J7 | PO ordered, receive into warehouse, qty up, close. | Phase 2 |
| J8 | Offline subtract, sync, web matches, txn exists. | Phase 1 |
| J9 | Team Member cannot see unassigned folder in search or scan. | Phase 1 |
| J10 | PDF album of a job-site folder for someone without a login. | Phase 1 |
| J11 | Advanced Search filter + bulk move. | Phase 1 |
| J12 | Import CSV into folders via Advanced import. | Phase 1 |
| J13 | Variant shirts Size×Color grouped and ungrouped. | Phase 2 |
| J14 | Pick list scan-to-pick completes and decrements. | Phase 2 |
| J15 | Job pull two-row txn; item flow shows it. | Phase 2 |

---

## 46. Implementation order

1. Org, Super Admin bootstrap, email/password login, invite + folder ACL  
2. Folders + items + photos  
3. Transaction service, qty, move, reasons, history  
4. SID, QR/barcode, label PDF  
5. Clone, merge, group  
6. Tags, custom fields, UOM  
7. Search, bulk, import, export PDF  
8. Alerts, dashboard, Phase 1 reports  
9. Mobile Items, Quick Actions, offline  
10. Counts → picks → POs → jobs → invoices/API  

**Phase 1 done** when J0–J5, J8–J12 pass.

---

## 47. Glossary

| Term | Meaning |
| --- | --- |
| SID | Human-readable item/folder id on labels |
| Unique item | One SID identity |
| Folder | Location node |
| Move | Qty transfer between folders |
| Transaction | Immutable event |
| Quick Action | Mobile scan loop with pre-selected verb |
| Super Admin | First user / Sortly Owner; invites the team |
| Scanner role | Floor user without master-data edit |
| Job | Work order that owns a folder |

---

*End of catalog. If a Sortly behavior is not a YES or NO row above, add it before coding.*
