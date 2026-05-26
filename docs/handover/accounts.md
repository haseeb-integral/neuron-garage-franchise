# Neuron Garage — Credentials & Handover Index

> **CRITICAL SECURITY RULE:** This file lives in a **public** GitHub repo. It contains **NO** passwords, API keys, recovery codes, or secrets — ever. Real credentials live only in the **shared Google Doc** (path below). If you're tempted to paste a secret here, stop.

**Where the actual secrets live:** Google Doc — `Shared with me → Neuron Garage → 00_Admin → Account Inventory`
*(adhoc path until Brett confirms the final Google Drive location)*

**Audience:** Sam (incoming), Haseeb (current), Brett (owner/approver).
**App size:** 3–6 internal users. Pre-release. No customers yet.

---

## How to use this file

1. This file is the **index** — names of accounts, who owns them, what Sam needs.
2. The **Google Doc** is the **vault** — actual emails, temp passwords, API keys, recovery codes.
3. Anything marked **🟡 Pending Brett** must not be touched until Brett approves.

---

## 1. Primary Platforms & Hosting (we own)

### 💻 Lovable.dev — Frontend & dev environment
- **Purpose:** Where this app is built, previewed, and published.
- **Project URL:** https://lovable.dev (project ID `c74b81ad-10d7-4a10-b6c8-de17f48a663e`)
- **Master account:** *[see Google Doc]*
- **Access for Sam:** Full admin (co-owner)
- **How to hand over:** Lovable → Project → Settings → Team → Invite Sam's email as Admin.

### ⚡ Lovable Cloud (backend: DB, Auth, Storage, Edge Functions)
- **Purpose:** Stores all candidate, city, teacher, pipeline, and user data. Runs all server-side functions.
- **Managed via:** Lovable (no separate dashboard login for day-to-day).
- **Underlying Supabase project ref:** `hqvmltmboakixpwapzfe`
- **Access for Sam:** Inherited automatically when he's added to the Lovable project above.
- **How to hand over:** Nothing extra — Lovable project access = Cloud access.

### 🐙 GitHub — source code
- **Purpose:** Stores source code and version history.
- **Repository:** *[confirm URL — currently on Haseeb's personal account, public]*
- **Owner:** `haseeb-integral` (personal account)
- **Access for Sam:** Admin collaborator (immediate). **Later:** move repo into a `neuron-garage` GitHub org with both as owners — parked until post-release.
- **How to hand over:** GitHub repo → Settings → Collaborators → Add Sam's GitHub username with Admin role.
- **⚠️ Repo is public** so Claude/Manus AI can read it. Never commit secrets — use Lovable Cloud secrets instead.

### 🌐 Domain & DNS
- **Domain:** *[confirm — `neurongarage.com`?]*
- **Registrar:** *[see Google Doc]*
- **Renewal date / card on file:** *[see Google Doc]*
- **Access for Sam:** Add as account contact / admin.
- **How to hand over:** Registrar dashboard → Account → Add user.

### 📬 Google Workspace (email + shared Drive)
- **Purpose:** Email (`*@neurongarage.com`), shared Drive where this very Google Doc lives.
- **Super admin:** *[see Google Doc]*
- **Access for Sam:** Super admin.
- **How to hand over:** admin.google.com → Account → Admin roles → assign Super Admin to Sam.

---

## 2. API Integrations 🟡 Pending Brett

These are all on **Brett's accounts**. API keys are already wired into Lovable Cloud secrets and the app works fine. But Brett needs to decide for each one: *transfer to a Neuron Garage account*, *add Sam as user*, or *leave on his account*.

| Service | Used for | Current owner | Brett decision needed |
|---|---|---|---|
| **SmartLead** | Cold email outreach to teachers | Brett | Transfer / add Sam / leave |
| **Apify** | Web scraping for teacher prospects | Brett | Transfer / add Sam / leave |
| **Firecrawl** | Website crawling for enrichment | Brett | Transfer / add Sam / leave |
| **Deepgram** | TTS in the AI assistant | Brett | Transfer / add Sam / leave |
| **Census API** | Demographics data for city scoring | Brett | Transfer / add Sam / leave |
| **BLS API** | Labor statistics for city scoring | Brett | Transfer / add Sam / leave |
| **BEA API** | Economic data for city scoring | Brett | Transfer / add Sam / leave |
| **Lovable AI Gateway** | All in-app AI calls | Managed by Lovable | Confirms with Lovable plan |

**Do NOT share these keys or transfer these accounts until Brett signs off.**

---

## 3. Marketing & Outreach

### LinkedIn
- **Company page / personal handles used for outreach:** *[list in Google Doc]*
- **Access for Sam:** Add as page admin.

### Analytics (if any exist)
- **Tool:** *[GA4 / Plausible / none?]*
- **Access for Sam:** Viewer/admin.

---

## 4. App login users (the app itself)

Managed live in-app at **`/settings/team`** (Team Members page). This is the source of truth — do not duplicate the list here.

For each user the Team Members page handles:
- Creating accounts with a temp password (shown once, share via Google Doc / 1:1 channel)
- Sending password reset links
- Role changes (admin / manager)

Current users to confirm exist with correct role:
- Kaylie (admin)
- Sam (admin)
- Haseeb (admin)
- Brett (admin)

---

## 5. Handover checklist (do these in order)

- [ ] Sam confirms his email address for all the below
- [ ] Add Sam to Lovable project (Admin)
- [ ] Add Sam to GitHub repo (Admin collaborator)
- [ ] Add Sam to Google Workspace (Super Admin)
- [ ] Add Sam as domain registrar contact
- [ ] Create Sam's app login at `/settings/team` (role: admin)
- [ ] Share the Google Doc with Sam (view + edit)
- [ ] 🟡 Talk to Brett re: SmartLead + other API accounts
- [ ] Later (post-release): create `neuron-garage` GitHub org, transfer repo

---

*Last updated: see git history. Owner of this file: Haseeb until handover complete, then Sam.*
