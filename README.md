# 🌙 IIT Iftar QR Attendance System

A fully automated QR attendance system for the IIT Iftar Committee. Registration → QR email → one-time scan → Google Sheets attendance.

---

## 📁 Project Structure

```
iit-iftar/
├── apps-script/
│   └── Code.gs          ← paste into Google Apps Script
└── scanner/
    └── index.html       ← deploy to Netlify / any static host
```

---

## ✅ Step 1 — Set Up the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet
2. Name the first tab exactly: **`Responses`**
3. Add these headers in **Row 1** (columns A–F):

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Timestamp | Name | Email | Token | Attended | Attended At |

> The form will auto-fill columns A–C. The script fills D–F automatically.

---

## ✅ Step 2 — Create the Google Form

1. Go to [forms.google.com](https://forms.google.com) → **New Form**
2. Add these questions:
   - **Full Name** (Short answer, Required)
   - **Email Address** (Short answer, Required) — set validation: *Text → Email address*
3. Click the **Google Sheets icon** (top right of form) → link it to the spreadsheet from Step 1 — choose **"Select existing spreadsheet"**

> Make sure the form responses land in the **`Responses`** tab.

---

## ✅ Step 3 — Set Up Google Apps Script

1. In your Google Sheet, click **Extensions → Apps Script**
2. Delete all existing code in the editor
3. Paste the entire contents of **`apps-script/Code.gs`**
4. Update the 3 config values at the top:
   ```js
   var EVENT_NAME  = "IIT Iftar 2026";      // your event name
   var EVENT_DATE  = "March 2026";          // actual date
   var EVENT_VENUE = "IIT Campus";          // venue name
   ```
5. Click **Save** (💾)

### Set the Form Submit Trigger

6. Click **Triggers** (⏰ icon on the left sidebar)
7. Click **+ Add Trigger** (bottom right)
8. Configure:
   - **Function**: `onFormSubmit`
   - **Event source**: From spreadsheet
   - **Event type**: On form submit
9. Click **Save** → authorize when prompted

### Deploy as Web App (for the scanner)

10. Click **Deploy → New deployment**
11. Click the ⚙️ gear icon → choose **Web app**
12. Configure:
    - **Execute as**: Me
    - **Who has access**: Anyone
13. Click **Deploy** → authorize again
14. **Copy the Web App URL** — you'll need it in Step 4

> ⚠️ The URL looks like: `https://script.google.com/macros/s/ABC.../exec`

---

## ✅ Step 4 — Deploy the Scanner App

### Option A — Use Locally (easiest for testing)
1. Open `scanner/index.html` in Chrome on your laptop
2. Allow camera access

### Option B — Deploy to Netlify (recommended for event day)
1. Go to [netlify.com](https://netlify.com) → sign up free
2. Drag and drop the **`scanner/`** folder onto the Netlify dashboard
3. You'll get a public URL like `https://iftar-scanner.netlify.app`
4. Open on volunteers' phones

### First-Time Setup on the Scanner Page
When you open the scanner for the first time:
1. A setup banner appears — paste your **Apps Script Web App URL** from Step 3
2. Tap **Save & Start Scanning**
3. The URL is saved in `localStorage` — no need to re-enter next time

---

## 📋 How It Works (Event Day)

```
1. Student opens your email → shows QR code
2. Volunteer opens scanner page on phone
3. Volunteer points camera at student's QR
4. Scanner calls the Apps Script endpoint
5. If valid → ✅ "Admitted! Welcome." + marks Attended = Yes in sheet
6. If already scanned → 🚫 "Already Checked In"
7. If unrecognised → ⚠️ "Invalid QR Code"
8. Scanner auto-resets after 4 seconds
```

---

## 🔒 Security Notes

- Each QR code contains a **UUID v4** (128-bit random) — essentially unguessable
- QR is **one-time use** — invalidated immediately on first successful scan
- The Apps Script endpoint checks the sheet in real-time — **no double-entry possible**
- QR codes do **not expire by time** — only by scan (you can add date validation in `doGet` if needed)

---

## 🐛 Troubleshooting

| Issue | Fix |
|---|---|
| Email not sending | Check Apps Script execution logs (View → Logs) |
| QR not showing in email | Some email clients block external images — student can still screenshot the URL-based QR |
| Scanner shows "Network Error" | Check the Web App URL is correct; re-deploy the Apps Script |
| Sheet not updating | Make sure `SHEET_NAME` in Code.gs matches your tab name exactly |
| Form responses go to wrong sheet | Re-link the form to the spreadsheet from the Form settings |
# Iftar
