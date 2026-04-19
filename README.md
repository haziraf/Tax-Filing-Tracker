# 🧾 LHDN Tax Relief Tracker

> A Google Apps Script web app for Malaysian individual taxpayers to track, manage, and review LHDN tax relief claims across multiple Years of Assessment (YA) — with Google Drive storage, receipt uploads, and a live dashboard.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Part 1 — First-Time Deployment](#part-1--first-time-deployment)
  - [Creating the Apps Script Project](#1-creating-the-apps-script-project)
  - [Deploying as a Web App](#2-deploying-as-a-web-app)
  - [Granting Drive Permissions](#3-granting-drive-permissions)
- [Part 2 — After Deployment](#part-2--after-deployment)
  - [First Launch & Folder Setup](#4-first-launch--folder-setup)
  - [Setting Up a Passcode](#5-setting-up-a-passcode-security)
  - [Creating Your First Year of Assessment](#6-creating-your-first-year-of-assessment-ya)
  - [Redeploying After Code Updates](#7-redeploying-after-code-updates)
- [Part 3 — How to Use the App](#part-3--how-to-use-the-app)
  - [Navigating the App](#8-navigating-the-app)
  - [Adding a Tax Relief Entry](#9-adding-a-tax-relief-entry)
  - [Reading the Dashboard](#10-reading-the-dashboard)
  - [Reviewing and Editing History](#11-reviewing-and-editing-history)
  - [Switching Between Years](#12-switching-between-years-of-assessment)
  - [Accessing Raw Data in Google Sheets](#13-accessing-raw-data-in-google-sheets)
- [Troubleshooting](#troubleshooting)
- [Appendix — Tax Relief Categories & Limits](#appendix--lhdn-tax-relief-categories--limits)
- [Disclaimer](#disclaimer)

---

## Overview

| | |
|---|---|
| **Platform** | Google Apps Script (GAS) |
| **Storage** | Google Drive (Spreadsheets) |
| **Applicable For** | Malaysian Individual Taxpayers (LHDN) |
| **Year Coverage** | Multi-year (Year of Assessment / YA) |

---

## Features

- 📁 **Per-YA Spreadsheets** — Each Year of Assessment gets its own Google Sheet, stored automatically in your Drive
- 📊 **Live Dashboard** — Visual progress bars showing claimed vs. limit for every relief category
- 📎 **Receipt Uploads** — Attach JPG, PNG, or PDF receipts; stored in your Drive folder
- 🔒 **Passcode Protection** — Secure the app with a passcode stored in Google Script Properties
- 📝 **Full History** — View, edit, and delete past entries with version-recovery support via Google Sheets
- 🔄 **Multi-Year Switching** — Instantly switch between YA years with the pill navigator

---

## Prerequisites

Before you begin, make sure you have the following ready:

| | Requirement | Details |
|---|---|---|
| ✔ | **Google Account** | A personal or Workspace account that will own the script and data |
| ✔ | **Google Drive Access** | Ability to create folders and spreadsheets in Drive |
| ✔ | **Source Code** | The complete `Code.gs` + HTML files from your developer or repository |
| ✔ | **Passcode** *(optional)* | A numeric or alphanumeric passcode to protect the app |

---

## Part 1 — First-Time Deployment

### 1. Creating the Apps Script Project

1. Go to [script.google.com](https://script.google.com) and sign in with your Google account.
2. Click **`+ New project`** in the top-left corner.
3. Click `Untitled project` at the top and rename it — e.g. `LHDN Tax Relief Tracker`.
4. Delete all default content in `Code.gs`, then paste the complete server-side code provided.
5. Click the **`+`** icon beside **Files**, choose **HTML**, and name it exactly as referenced in the code (e.g. `Index`). Paste the corresponding HTML content. Repeat for each HTML file.
6. Press **`Ctrl+S`** (or **`Cmd+S`** on Mac) to save.

> **💡 File Names Are Case-Sensitive**
> If the code calls `HtmlService.createHtmlOutputFromFile('Index')`, your file must be named `Index` — not `index` or `INDEX`.

---

### 2. Deploying as a Web App

1. In the toolbar, click **`Deploy`** → **`New deployment`**.
2. Click the gear icon beside **`Select type`** and choose **`Web app`**.
3. Fill in the settings:
   - **Description:** e.g. `v1 Initial Deploy`
   - **Execute as:** `Me` (your Google account)
   - **Who has access:** `Only myself` — or — `Anyone` (if sharing)
4. Click **`Deploy`**. When the permissions dialog appears, click **`Authorise access`**, select your account, and click **`Allow`**.
5. Copy the generated URL — format: `https://script.google.com/macros/s/[ID]/exec`. This is your app's address.

> **⚠️ Authorisation Screen**
> You may see a *"Google hasn't verified this app"* warning. Click **`Advanced`** → **`Go to [project name] (unsafe)`** to proceed. This is expected for personal scripts.

---

### 3. Granting Drive Permissions

During the first authorisation, the following OAuth scopes are requested:

- View and manage files in Google Drive
- View and manage spreadsheets in Google Drive
- Connect to an external service (for the web app to run)

These permissions are used **only** to create and manage the tracker's own folder. No other Drive content is read or modified.

---

## Part 2 — After Deployment

### 4. First Launch & Folder Setup

When you open the Web App URL for the first time, the app automatically:

1. Checks Google Drive for an existing `LHDN Tax Relief Tracker` folder.
2. Creates the folder in the root of your Drive if it does not exist.
3. Displays a welcome screen prompting you to create your first YA.

> **📁 Important:** Do not rename or move the `LHDN Tax Relief Tracker` Drive folder manually — the app locates it by name.

---

### 5. Setting Up a Passcode (Security)

1. Go to [script.google.com](https://script.google.com) and open your project.
2. Click the **gear icon (⚙)** in the left sidebar → **Project Settings**.
3. Scroll to **Script Properties** and click **`Add script property`**.
4. Set:
   - **Property Name:** `APP_PASSCODE`
   - **Value:** your chosen passcode (e.g. `123456` or `MySecret2025`)
5. Click **`Save script properties`**.

> **🔒 Security Note:** The passcode is stored in Google's Script Properties — it is not visible in the code and is tied to your Google account. Anyone with the Web App URL will see a login screen and cannot proceed without the correct passcode.

---

### 6. Creating Your First Year of Assessment (YA)

1. On the welcome screen, click **`New Year of Assessment`**.
2. Use the quick-pick year chips (e.g. `YA 2024`, `YA 2025`) or type a year manually.
3. Click **`Create YA`**. A new Google Spreadsheet is created in your tracker folder.
4. The main app view opens with three tabs: **Add Relief**, **Dashboard**, and **History**.

> **📅 One Spreadsheet Per Year:** YA 2024 and YA 2025 data are stored in separate spreadsheets and never mixed.

---

### 7. Redeploying After Code Updates

When the script is updated (bug fixes, new features), you must create a **new** deployment:

1. Paste the updated code into the Apps Script editor and save (`Ctrl+S`).
2. Click **`Deploy`** → **`New deployment`** *(do not update the existing one — this changes the URL)*.
3. Use the same settings: `Web app`, `Execute as Me`, same access level.
4. Copy the new URL and share it with anyone who has the old one.

---

## Part 3 — How to Use the App

### 8. Navigating the App

| Area | Description |
|---|---|
| **YA Pills** | Row of buttons at the top (e.g. `YA 2024`, `YA 2025`). Click to switch years. |
| **+ New YA** | Opens the dialog to create a new Year of Assessment spreadsheet. |
| **Add Relief Tab** | Form to log a new tax relief entry. Primary data-entry screen. |
| **Dashboard Tab** | Visual summary — totals per category vs. RM limit for the active YA. |
| **History Tab** | Full list of all entries for the active YA. Supports editing and deletion. |
| **Drive Folder Link** | Link in the header/footer to open your LHDN folder in Google Drive. |

---

### 9. Adding a Tax Relief Entry

1. Make sure the correct **YA pill** is active at the top (highlighted in blue).
2. Click the **`Add Relief`** tab.
3. **Choose Category** from the dropdown (e.g. Medical Insurance, EPF, Lifestyle).
4. **Enter Amount (RM)** — must be a positive number.
5. **Enter Description** — e.g. `AXA Medical Insurance Premium — Jan 2025`.
6. **Enter Date** — select the expense or receipt date.
7. *(Optional)* Click **`Choose File`** to attach a receipt image or PDF.
8. Click **`Add Entry`** / **`Save`**. A toast notification confirms the entry was saved.

> **📎 Receipt Upload:** Files are stored in a sub-folder inside your Drive tracker folder. Supported types: JPG, PNG, PDF. File size is limited by your Google Drive storage quota.

---

### 10. Reading the Dashboard

**Summary Cards**

| Card | Description |
|---|---|
| Total Relief Claimed | Sum of all entries for the active YA |
| Estimated Tax Savings | Indicative figure based on your tax bracket (if configured) |
| Number of Entries | Total records saved for the year |

**Category Progress Bars**

Each category shows: amount claimed · statutory limit · progress indicator. Categories that have reached their limit are highlighted in **red/orange**.

> **📊 Limits are Indicative:** Always verify current limits at [hasil.gov.my](https://hasil.gov.my) as they may be revised with each annual Budget.

---

### 11. Reviewing and Editing History

**Viewing Entries**
- Listed in reverse chronological order (newest first).
- Each row shows: date, category, description, and amount.
- A receipt link appears beside entries with attachments.

**Editing an Entry**
1. Find the entry in the History list.
2. Click the **edit icon (✏)** or the entry row.
3. Update the desired fields.
4. Click **`Save`**.

**Deleting an Entry**
1. Click the **delete icon (🗑)** beside the entry.
2. Confirm in the confirmation dialog.

> **⚠️ Deletions Are Permanent** within the app. To recover, open the spreadsheet in Drive → `File` → `Version history` → `See version history`.

---

### 12. Switching Between Years of Assessment

- Click the **`YA 2024`** pill to view that year's data.
- Click **`YA 2025`** to switch to the next year.
- All tabs (Add, Dashboard, History) reflect the **currently selected YA**.
- Data is stored in separate spreadsheets and never mixed between years.

---

### 13. Accessing Raw Data in Google Sheets

1. Click the **Drive folder link** in the app header/footer.
2. Open the spreadsheet for the desired YA (e.g. `YA 2024`).
3. Use standard Google Sheets features — filter, sort, download as `.xlsx`, or print.

> **⚡ Pro Tip:** Before filing on [MyTax](https://mytax.hasil.gov.my), download your YA spreadsheet as Excel or PDF for a full record of all claims and supporting receipts.

---

## Troubleshooting

| Issue / Symptom | Recommended Action |
|---|---|
| *"Connection error. Please reload."* | Refresh the page. If it persists, open Apps Script → `Deploy` → `Manage deployments` and re-authorise if prompted. |
| *"Access Denied"* or login loop | Verify `APP_PASSCODE` is set correctly in Script Properties ([Section 5](#5-setting-up-a-passcode-security)). Clear browser cache and retry. |
| App is blank / stuck loading | Check the browser console (`F12` → Console) for errors. Ensure all HTML files are correctly named and saved. |
| Receipt upload fails | Confirm Google Drive has sufficient storage and that the Drive API scope was authorised during deployment. |
| YA data missing after reload | Confirm the spreadsheet still exists in your Drive folder and has not been moved or deleted. |
| Dashboard shows wrong limits | Limits are hardcoded. If LHDN updated them, the developer must update the script and redeploy ([Section 7](#7-redeploying-after-code-updates)). |
| *"Google hasn't verified this app"* | Expected for personal scripts. Click `Advanced` → `Go to [app] (unsafe)` to proceed. |

---

## Appendix — LHDN Tax Relief Categories & Limits

> ⚠️ Limits listed below are **indicative** and based on LHDN guidelines at time of writing. Always verify the latest limits at [hasil.gov.my](https://hasil.gov.my).

| Category | RM Limit | Notes |
|---|---|---|
| Individual & Dependent Relief | **9,000** | Automatic for every taxpayer |
| Medical / Dental Insurance | **3,000** | Private medical or dental policy |
| SOCSO / EIS Contributions | **350** | Employee contributions only |
| Life Insurance (EPF combined) | **7,000** | Life policy + EPF max RM7,000 |
| EPF Voluntary Contributions | **4,000** | Separate from life insurance limit |
| Education (Self) - Postgrad | **7,000** | Masters or Doctorate level |
| Education (Self) - Skills / Law / Finance | **2,000** | Recognised skills or professional courses |
| Medical Examination | **1,000** | General check-up; receipts required |
| Serious Disease Treatment | **8,000** | Heart, lungs, cancer, etc. |
| Fertility Treatment | **8,000** | Shared with serious disease limit |
| Childcare Fees | **3,000** | Registered childcare centres only |
| Breastfeeding Equipment | **1,000** | Once every 2 years; child < 2 yrs |
| Child Relief (Below 18) | **2,000** | Per qualifying child |
| Child Relief (Disabled) | **6,000** | Per disabled child |
| SSPN (Education Savings) | **8,000** | Net deposits in the year |
| Broadband / Phone / Computer | **2,500** | For personal use |
| EV Charging Equipment | **2,500** | Installation & purchase |
| Lifestyle (Books, Sports, etc.) | **2,500** | Receipts needed; expanded scope |
| Donations & Gifts | **Varies** | Approved institutions only |

---

## Disclaimer

This tool and user manual are provided for **personal tax record-keeping purposes only** and do not constitute professional tax advice. Consult a licensed tax consultant or contact [LHDN](https://hasil.gov.my) directly for authoritative guidance on your tax obligations.

---

*Confidential – Internal Use Only · Version 1.0*