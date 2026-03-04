"""
IIT Iftar 2026 — Batch QR Code Emailer (IIT ID as QR payload)
==============================================================
QR codes now encode the student's IIT ID directly.
No token column needed. No upload back to the Sheet.
The Sheet only needs: Timestamp, Email, Name, IIT ID, ... + Attended, Attended At (last 2 cols)

USAGE
-----
  python send_qr_emails.py            # send to everyone
  python send_qr_emails.py --dry-run  # preview only, no emails sent
  python send_qr_emails.py --resume   # skip rows already marked "Email Sent = Yes"

INPUT / OUTPUT
--------------
  Input:  responses.csv          (exported from Google Sheet — no changes needed after this)
  Output: responses_sent.csv     (tracks who was emailed, for resume support)
          qr_codes/              (all generated QR images)
          emailer.log / sent_log.txt
"""

import os
import argparse
import base64
import time
import logging
from io import BytesIO
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage

import qrcode
import pandas as pd

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# ─── CONFIG ────────────────────────────────────────────────────────────────────

SENDER_EMAIL  = "abdul.20232105@iit.ac.lk"
SENDER_NAME   = "IIT Iftar Committee"

EVENT_NAME    = "IIT Iftar 2026"
EVENT_DATE    = "09th March 2026"
EVENT_TIME    = "4:00 PM"
EVENT_VENUE   = "Temple Trees - Main Hall"

INPUT_CSV     = "responses.csv"
OUTPUT_CSV    = "responses_sent.csv"   # tracks Email Sent column
QR_DIR        = "qr_codes"
SENT_LOG      = "sent_log.txt"

CREDENTIALS_FILE = "credentials.json"
TOKEN_FILE       = "token.json"
SCOPES           = ["https://www.googleapis.com/auth/gmail.send"]

EMAIL_DELAY = 1.0

# ─── CSV COLUMN NAMES (must match your Sheet header exactly) ───────────────────
COL_EMAIL       = "Email Address"
COL_NAME        = "Full Name"
COL_IITID       = "IIT ID"
COL_FOOD        = "Food Preference"
COL_PHOTOBOOTH  = "Since we have limited the number of slots for the photobooth this time, please confirm whether you would like to have a photobooth picture?"
COL_360         = "Would you like to try a 360° camera experience?"
COL_EMAIL_SENT  = "Email Sent"   # added by this script to output CSV only

# ─── LOGGING ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("emailer.log"),
    ]
)
log = logging.getLogger(__name__)
os.makedirs(QR_DIR, exist_ok=True)


# ─── GMAIL API AUTH ────────────────────────────────────────────────────────────

def get_gmail_service():
    creds = None
    if not os.path.exists(CREDENTIALS_FILE):
        log.error(f"'{CREDENTIALS_FILE}' not found! See setup instructions.")
        raise SystemExit(1)
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
        log.info("Authenticated! token.json saved.")
    return build("gmail", "v1", credentials=creds)


# ─── QR CODE (encodes IIT ID directly) ────────────────────────────────────────

def make_qr_bytes(iit_id: str) -> bytes:
    """Generates a QR PNG that encodes the student's IIT ID."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(iit_id)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1a2f26", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ─── EMAIL BUILDER ─────────────────────────────────────────────────────────────

def build_email(to_email: str, name: str, iit_id: str,
                food: str, photobooth: str, camera360: str) -> MIMEMultipart:

    # Preference chips — food excluded, kept minimal
    chips = ""
    if photobooth: chips += f'<span class="chip">Photobooth: {photobooth}</span>'
    if camera360:  chips += f'<span class="chip">360&deg; Camera: {camera360}</span>'
    chips_block = f'<div class="chips">{chips}</div>' if chips else ""

    html = f"""<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" style="color-scheme:dark !important;">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<style>
  :root {{ color-scheme: dark !important; }}
  @media (prefers-color-scheme: dark) {{
    body,table,td {{ background-color:#0b1512 !important; color:#f0e6c8 !important; }}
  }}
  @media (prefers-color-scheme: light) {{
    body,table,td {{ background-color:#0b1512 !important; color:#f0e6c8 !important; }}
  }}
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
  body {{
    margin:0; padding:0;
    background:#0b1512 !important;
    font-family:'Inter',Arial,sans-serif;
    -webkit-text-size-adjust:100%;
  }}
  .email-outer {{
    background:#0b1512 !important;
    padding:32px 16px;
  }}
  .wrapper {{
    max-width:560px;
    margin:0 auto;
    background:#0f1e17 !important;
    border-radius:28px;
    overflow:hidden;
    border:1px solid rgba(197,163,88,0.25);
    box-shadow:0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(197,163,88,0.08);
  }}

  /* ── HEADER ── */
  .header {{
    background:#0a1a10 !important;
    padding:36px 24px 28px;
    text-align:center;
    border-bottom:1px solid rgba(197,163,88,0.2);
  }}
  .header-subtitle {{
    font-family:'Cormorant Garamond',serif;
    font-size:18px;
    font-weight:700;
    color:#c5a358 !important;
    margin:18px 0 6px;
    letter-spacing:0.3px;
  }}
  .header-tagline {{
    font-family:'Cormorant Garamond',serif;
    font-style:italic;
    font-size:14px;
    color:rgba(197,163,88,0.55) !important;
    margin:0;
  }}
  .header-pattern {{
    width:100%;
    display:block;
    opacity:0.18;
  }}
  .header-inner {{
    position:absolute;
    inset:0;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    padding:36px 24px;
  }}
  .logo-wrap {{
    width:80px; height:80px;
    border-radius:50%;
    background:rgba(197,163,88,0.08);
    border:1px solid rgba(197,163,88,0.25);
    display:flex;
    align-items:center;
    justify-content:center;
    margin-bottom:20px;
    overflow:hidden;
  }}
  .header-eyebrow {{
    font-family:'Inter',sans-serif;
    font-size:10px;
    font-weight:600;
    letter-spacing:3px;
    text-transform:uppercase;
    color:rgba(197,163,88,0.7);
    margin-bottom:10px;
  }}
  .header-title {{
    font-family:'Cormorant Garamond',serif;
    font-size:32px;
    font-weight:700;
    color:#f0e6c8;
    margin:0 0 6px;
    letter-spacing:0.5px;
    line-height:1.15;
  }}
  .header-sub {{
    font-family:'Cormorant Garamond',serif;
    font-style:italic;
    font-size:15px;
    color:rgba(197,163,88,0.65);
    margin:0;
  }}
  .gold-line {{
    width:60px; height:1px;
    background:linear-gradient(90deg,transparent,#c5a358,transparent);
    margin:16px auto 0;
  }}

  /* ── BODY ── */
  .body {{
    padding:40px 36px;
    text-align:center;
  }}
  .salam {{
    font-family:'Cormorant Garamond',serif;
    font-size:15px;
    font-style:italic;
    color:rgba(197,163,88,0.6);
    margin:0 0 8px;
    letter-spacing:0.5px;
  }}
  .name {{
    font-family:'Cormorant Garamond',serif;
    font-size:34px;
    font-weight:700;
    color:#f0e6c8;
    margin:0 0 6px;
    line-height:1.1;
  }}
  .iitid-tag {{
    display:inline-block;
    background:rgba(197,163,88,0.1);
    border:1px solid rgba(197,163,88,0.2);
    border-radius:50px;
    padding:4px 14px;
    font-size:12px;
    color:rgba(197,163,88,0.75);
    letter-spacing:1.5px;
    margin-bottom:28px;
  }}
  .divider {{
    display:flex;
    align-items:center;
    gap:12px;
    margin:0 0 28px;
  }}
  .divider-line {{
    flex:1;
    height:1px;
    background:linear-gradient(90deg,transparent,rgba(197,163,88,0.25));
  }}
  .divider-line.right {{
    background:linear-gradient(90deg,rgba(197,163,88,0.25),transparent);
  }}
  .divider-icon {{
    color:rgba(197,163,88,0.5);
    font-size:16px;
  }}
  .msg {{
    font-size:14px;
    color:rgba(240,230,200,0.6);
    line-height:1.8;
    margin:0 0 32px;
  }}
  .msg strong {{
    color:#c5a358;
    font-weight:600;
  }}

  /* ── QR CARD ── */
  .qr-card {{
    background:linear-gradient(145deg,#ffffff 0%,#f8f4ee 100%);
    border-radius:20px;
    padding:24px;
    display:inline-block;
    box-shadow:0 0 0 1px rgba(197,163,88,0.3), 0 8px 32px rgba(0,0,0,0.4), 0 0 60px rgba(197,163,88,0.06);
    margin-bottom:12px;
    position:relative;
  }}
  .qr-card::before {{
    content:'';
    position:absolute;
    inset:-1px;
    border-radius:21px;
    background:linear-gradient(135deg,rgba(197,163,88,0.4),transparent 50%,rgba(197,163,88,0.2));
    z-index:-1;
  }}
  .qr-card img {{
    display:block;
    border-radius:8px;
  }}
  .qr-label {{
    font-size:11px;
    letter-spacing:2px;
    text-transform:uppercase;
    color:rgba(197,163,88,0.45);
    margin:14px 0 32px;
  }}

  /* ── WARNING BOX ── */
  .warn-box {{
    background:rgba(197,163,88,0.05);
    border:1px solid rgba(197,163,88,0.15);
    border-left:3px solid rgba(197,163,88,0.5);
    border-radius:12px;
    padding:16px 20px;
    text-align:left;
    margin-bottom:28px;
    font-size:13px;
    color:rgba(240,230,200,0.55);
    line-height:1.7;
  }}
  .warn-box strong {{
    display:block;
    color:rgba(197,163,88,0.8);
    font-size:12px;
    letter-spacing:1px;
    text-transform:uppercase;
    margin-bottom:4px;
  }}

  /* ── EVENT DETAILS ── */
  .event-box {{
    background:rgba(255,255,255,0.03);
    border:1px solid rgba(197,163,88,0.12);
    border-radius:16px;
    padding:24px 16px;
    margin-bottom:8px;
    display:flex;
    justify-content:center;
    gap:0;
  }}
  .event-col {{
    flex:1;
    text-align:center;
    padding:0 12px;
    border-right:1px solid rgba(197,163,88,0.1);
  }}
  .event-col:last-child {{
    border-right:none;
  }}
  .event-col-label {{
    font-size:10px;
    color:rgba(197,163,88,0.5) !important;
    letter-spacing:2px;
    text-transform:uppercase;
    margin:0 0 6px;
    font-weight:600;
  }}
  .event-col-val {{
    font-size:14px;
    color:#f0e6c8 !important;
    font-weight:500;
    margin:0;
    line-height:1.3;
  }}
  .map-link {{
    color:#f0e6c8 !important;
    text-decoration:underline;
    text-decoration-color:rgba(197,163,88,0.35);
    text-underline-offset:3px;
    cursor:pointer;
  }}

  /* ── PREFERENCE CHIPS ── */
  .chips {{
    margin:20px 0 0;
    display:flex;
    flex-wrap:wrap;
    gap:8px;
    justify-content:center;
  }}
  .chip {{
    background:rgba(197,163,88,0.08);
    border:1px solid rgba(197,163,88,0.18);
    border-radius:50px;
    padding:5px 14px;
    font-size:11px;
    color:rgba(197,163,88,0.7);
    letter-spacing:0.3px;
  }}

  /* ── FOOTER ── */
  .footer {{
    border-top:1px solid rgba(197,163,88,0.1);
    background:#0a1410;
    padding:20px 32px;
    text-align:center;
    font-size:11px;
    color:rgba(240,230,200,0.25);
    letter-spacing:0.5px;
  }}
</style>
</head>
<body style="margin:0;padding:0;background-color:#0b1512 !important;font-family:'Inter',Arial,sans-serif;">
<!-- Outer bgcolor table — Gmail cannot strip HTML attributes -->
<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#0b1512" style="background-color:#0b1512 !important;">
<tr><td align="center" bgcolor="#0b1512" style="background-color:#0b1512 !important;padding:32px 16px;">
<!-- Inner wrapper -->
<table width="560" border="0" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#0f1e17 !important;border-radius:28px;overflow:hidden;border:1px solid rgba(197,163,88,0.25);box-shadow:0 24px 80px rgba(0,0,0,0.6);">
<tr><td bgcolor="#0f1e17" style="background-color:#0f1e17 !important;border-radius:28px;">

  <!-- HEADER -->
  <div style="background-color:#0a1a10 !important;padding:36px 24px 28px;text-align:center;border-bottom:1px solid rgba(197,163,88,0.2);">
    <img src="https://drive.google.com/uc?export=view&id=1yZOAcZWugkGxNs8fV2uzhgXQrW4XWgym" width="100" alt="IIT Iftar Logo" style="display:block;margin:0 auto;">
    <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:700;color:#c5a358 !important;margin:18px 0 6px;letter-spacing:0.3px;">Echoes of Arabia &mdash; Your Entry Pass</div>
    <div style="font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:14px;color:rgba(197,163,88,0.6) !important;margin:0;">Some stories never fade; they just echo.</div>
  </div>

  <!-- BODY -->
  <div style="background-color:#0f1e17 !important;padding:40px 36px;text-align:center;">
    <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:15px;font-style:italic;color:rgba(197,163,88,0.6) !important;margin:0 0 8px;">As-salamu Alaikum,</div>
    <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:34px;font-weight:700;color:#f0e6c8 !important;margin:0 0 6px;line-height:1.1;">{name}</div>
    <div style="display:inline-block;background-color:rgba(197,163,88,0.1) !important;border:1px solid rgba(197,163,88,0.2);border-radius:50px;padding:4px 14px;font-size:12px;color:rgba(197,163,88,0.75) !important;letter-spacing:1.5px;margin-bottom:28px;">&#9670; &nbsp;IIT ID &nbsp;{iit_id}&nbsp; &#9670;</div>

    <div style="display:flex;align-items:center;gap:12px;margin:0 0 28px;">
      <div style="flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(197,163,88,0.25));"></div>
      <div style="color:rgba(197,163,88,0.5) !important;font-size:16px;">&#9790;</div>
      <div style="flex:1;height:1px;background:linear-gradient(90deg,rgba(197,163,88,0.25),transparent);"></div>
    </div>

    <div style="font-size:14px;color:rgba(240,230,200,0.6) !important;line-height:1.8;margin:0 0 32px;">
      Your seat at <strong style="color:#c5a358 !important;">{EVENT_NAME}</strong> is confirmed.<br>
      Show this QR code at the venue entrance &mdash; it is yours alone<br>
      and valid for a <strong style="color:#c5a358 !important;">single scan only</strong>.
    </div>

    <!-- QR CODE -->
    <div style="display:inline-block;background:linear-gradient(145deg,#ffffff,#f8f4ee);border-radius:20px;padding:24px;box-shadow:0 0 0 1px rgba(197,163,88,0.3),0 8px 32px rgba(0,0,0,0.4);margin-bottom:12px;">
      <img src="cid:qrcode" width="220" height="220" alt="Entry QR Code" style="display:block;border-radius:8px;">
    </div>
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(197,163,88,0.45) !important;margin:14px 0 32px;">&#9670; &nbsp; Scan at entrance &nbsp; &#9670;</div>

    <!-- WARNING -->
    <div style="background-color:rgba(197,163,88,0.05) !important;border:1px solid rgba(197,163,88,0.15);border-left:3px solid rgba(197,163,88,0.5);border-radius:12px;padding:16px 20px;text-align:left;margin-bottom:28px;font-size:13px;color:rgba(240,230,200,0.55) !important;line-height:1.7;">
      <strong style="display:block;color:rgba(197,163,88,0.8) !important;font-size:12px;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">&#9888; Important</strong>
      Do not share this QR code. It becomes void after the first scan.
      A screenshot on your phone is perfectly fine.
    </div>

    <!-- EVENT DETAILS -->
    <div style="background-color:rgba(255,255,255,0.03) !important;border:1px solid rgba(197,163,88,0.12);border-radius:16px;padding:24px 16px;margin-bottom:8px;display:flex;justify-content:center;">
      <div style="flex:1;text-align:center;padding:0 12px;border-right:1px solid rgba(197,163,88,0.1);">
        <div style="font-size:10px;color:rgba(197,163,88,0.5) !important;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;font-weight:600;">Date</div>
        <div style="font-size:14px;color:#f0e6c8 !important;font-weight:500;">{EVENT_DATE}</div>
      </div>
      <div style="flex:1;text-align:center;padding:0 12px;border-right:1px solid rgba(197,163,88,0.1);">
        <div style="font-size:10px;color:rgba(197,163,88,0.5) !important;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;font-weight:600;">Time</div>
        <div style="font-size:14px;color:#f0e6c8 !important;font-weight:500;">{EVENT_TIME}</div>
      </div>
      <div style="flex:1;text-align:center;padding:0 12px;">
        <div style="font-size:10px;color:rgba(197,163,88,0.5) !important;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;font-weight:600;">Venue</div>
        <div style="font-size:14px;font-weight:500;"><a href="https://maps.google.com/?q=Temple+Trees+Colombo+Sri+Lanka" style="color:#f0e6c8 !important;text-decoration:underline;text-underline-offset:3px;text-decoration-color:rgba(197,163,88,0.35);" target="_blank">{EVENT_VENUE}</a></div>
      </div>
    </div>

    {chips_block}
  </div>

  <!-- FOOTER -->
  <div style="background-color:#0a1410 !important;border-top:1px solid rgba(197,163,88,0.1);padding:20px 32px;text-align:center;font-size:11px;color:rgba(240,230,200,0.25) !important;letter-spacing:0.5px;">
    IIT IFTAR COMMITTEE &nbsp;&#183;&nbsp; This is an automated message &mdash; please do not reply
  </div>

</td></tr>
</table>
</td></tr>
</table>
</body></html>"""

    msg = MIMEMultipart("related")
    msg["From"]    = f"{SENDER_NAME} <{SENDER_EMAIL}>"
    msg["To"]      = to_email
    msg["Subject"] = f"Your Entry Pass — {EVENT_NAME} ✦"
    msg.attach(MIMEText(html, "html"))

    qr_img = MIMEImage(make_qr_bytes(iit_id), _subtype="png")
    qr_img.add_header("Content-ID", "<qrcode>")
    qr_img.add_header("Content-Disposition", "inline", filename="entry_qr.png")
    msg.attach(qr_img)

    return msg


# ─── SEND VIA GMAIL API ────────────────────────────────────────────────────────


def send_email(service, to_email: str, name: str, iit_id: str,
               food: str, photobooth: str, camera360: str) -> bool:
    try:
        msg = build_email(to_email, name, iit_id, food, photobooth, camera360)
        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        service.users().messages().send(userId="me", body={"raw": raw}).execute()
        return True
    except Exception as e:
        log.error(f"  ✗ Failed for {to_email}: {e}")
        return False


# ─── MAIN ──────────────────────────────────────────────────────────────────────

def main(dry_run: bool, resume: bool):
    read_file = OUTPUT_CSV if (resume and os.path.exists(OUTPUT_CSV)) else INPUT_CSV

    if not os.path.exists(read_file):
        log.error(f"'{read_file}' not found. Export your Google Sheet as CSV first.")
        return

    df = pd.read_csv(read_file, dtype=str).fillna("")
    log.info(f"Loaded {len(df)} rows from '{read_file}'")

    if COL_EMAIL_SENT not in df.columns:
        df[COL_EMAIL_SENT] = ""

    if dry_run:
        log.info("\nDRY RUN — no emails will be sent. Preview:\n")
        for _, row in df.iterrows():
            iit_id = str(row.get(COL_IITID, "N/A")).strip()
            log.info(f"  → {row[COL_NAME]} <{row[COL_EMAIL]}>  IIT ID={iit_id}")
        return

    log.info("Authenticating with Gmail API…")
    service = get_gmail_service()
    log.info(f"Ready! Sending from: {SENDER_EMAIL}\n")

    sent_count = 0
    fail_count = 0
    total = len(df)

    with open(SENT_LOG, "a") as log_file:
        for idx, row in df.iterrows():
            email        = str(row[COL_EMAIL]).strip()
            name         = str(row[COL_NAME]).strip()
            iit_id       = str(row.get(COL_IITID, "")).strip()
            food         = str(row[COL_FOOD]).strip()         if COL_FOOD       in df.columns else ""
            photo        = str(row[COL_PHOTOBOOTH]).strip()   if COL_PHOTOBOOTH in df.columns else ""
            cam360       = str(row[COL_360]).strip()          if COL_360        in df.columns else ""
            already_sent = str(row[COL_EMAIL_SENT]).strip().lower() == "yes"

            if resume and already_sent:
                log.info(f"[{idx+1}/{total}] Skipping (already sent): {email}")
                continue

            if not email:
                log.warning(f"[{idx+1}/{total}] Missing email, skipping")
                continue

            if not iit_id:
                log.warning(f"[{idx+1}/{total}] {name} has no IIT ID — skipping")
                continue

            log.info(f"[{idx+1}/{total}] Sending → {name} <{email}>  (IIT ID: {iit_id})")
            success = send_email(service, email, name, iit_id, food, photo, cam360)

            if success:
                df.at[idx, COL_EMAIL_SENT] = "Yes"
                log_file.write(f"SENT  {email}  iit_id={iit_id}\n")
                sent_count += 1
                log.info(f"  ✓ Sent!")
            else:
                log_file.write(f"FAIL  {email}  iit_id={iit_id}\n")
                fail_count += 1

            df.to_csv(OUTPUT_CSV, index=False)
            time.sleep(EMAIL_DELAY)

    log.info("─" * 50)
    log.info(f"Done!  ✓ {sent_count} sent   ✗ {fail_count} failed")
    if fail_count:
        log.info("Run with --resume to retry failed ones.")


# ─── ENTRY POINT ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IIT Iftar 2026 — QR Code Emailer")
    parser.add_argument("--dry-run", action="store_true", help="Preview without sending")
    parser.add_argument("--resume",  action="store_true", help="Skip already-sent rows")
    args = parser.parse_args()
    main(dry_run=args.dry_run, resume=args.resume)
