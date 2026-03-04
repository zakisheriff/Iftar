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

    food_line  = f"<br>🍽️ Food: <strong>{food}</strong>"           if food       else ""
    photo_line = f"<br>📸 Photobooth: <strong>{photobooth}</strong>" if photobooth else ""
    cam_line   = f"<br>🎥 360° Camera: <strong>{camera360}</strong>"  if camera360  else ""

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body {{ margin:0; padding:0; background:#eae3d9; font-family:Arial,sans-serif; color:#1a2f26; }}
  .wrapper {{ max-width:580px; margin:40px auto; background:#f5f0eb; border-radius:35px; overflow:hidden; border:1px solid rgba(59,107,88,0.15); box-shadow:0 10px 40px rgba(59,107,88,0.08); }}
  .header {{ background:#eae3d9; padding:40px 32px; text-align:center; border-bottom:1px solid rgba(59,107,88,0.1); }}
  .title {{ font-size:26px; font-weight:bold; color:#1a2f26; letter-spacing:1px; margin:0; }}
  .subtitle {{ font-size:16px; color:#3b6b58; margin:8px 0 0; font-weight:700; }}
  .theme {{ font-size:13px; color:rgba(26,47,38,0.6); margin-top:10px; font-style:italic; }}
  .body {{ padding:40px 32px; text-align:center; }}
  .greeting {{ font-size:18px; color:#3b6b58; margin-bottom:10px; font-weight:bold; }}
  .name {{ font-size:24px; font-weight:bold; color:#1a2f26; margin-bottom:6px; }}
  .iit-id {{ font-size:13px; color:#5a7368; margin-bottom:24px; }}
  .msg {{ font-size:15px; color:#5a7368; line-height:1.7; margin-bottom:32px; }}
  .qr-wrapper {{ display:inline-block; padding:20px; background:#fff; border-radius:24px; border:1px solid rgba(59,107,88,0.15); margin-bottom:32px; box-shadow:0 4px 12px rgba(59,107,88,0.04); }}
  .qr-box img {{ display:block; border-radius:8px; }}
  .note {{ background:rgba(59,107,88,0.05); border:1px solid rgba(59,107,88,0.15); border-radius:20px; padding:20px; font-size:14px; color:#3b6b58; margin-bottom:32px; text-align:left; line-height:1.6; }}
  .note strong {{ display:block; margin-bottom:6px; font-size:15px; }}
  .details {{ font-size:14px; color:#5a7368; background:#eae3d9; padding:16px 24px; border-radius:20px; display:inline-block; }}
  .details span {{ color:#1a2f26; font-weight:bold; }}
  .footer {{ border-top:1px solid rgba(59,107,88,0.15); padding:24px 32px; text-align:center; font-size:13px; color:#5a7368; background:#eae3d9; }}
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div style="margin-bottom:24px;">
      <img src="https://drive.google.com/uc?export=view&id=1yZOAcZWugkGxNs8fV2uzhgXQrW4XWgym" width="130" alt="Logo" style="display:inline-block;">
    </div>
    <div class="subtitle">Echoes of Arabia — Your Entry Pass</div>
    <div class="theme">Some stories never fade; they just echo.</div>
  </div>
  <div class="body">
    <div class="greeting">As-salamu Alaikum,</div>
    <div class="name">{name}</div>
    <div class="iit-id">IIT ID: {iit_id}</div>
    <div class="msg">
      You are registered for <strong style="color:#3b6b58">{EVENT_NAME}</strong>.<br>
      Present this QR code at the entrance. It is unique to you<br>
      and can only be scanned <strong style="color:#b91c1c">once</strong>.
    </div>
    <div class="qr-wrapper"><div class="qr-box"><img src="cid:qrcode" width="240" height="240" alt="Your QR Code"></div></div>
    <div class="note">
      <strong>Important</strong>
      Do not share this QR code. It will be invalidated after the first scan.
      Screenshots are fine — just make sure it is visible and clear.
    </div>
    <div class="details">Date: <span>{EVENT_DATE}</span> &nbsp;|&nbsp; Time: <span>{EVENT_TIME}</span> &nbsp;|&nbsp; Venue: <span>{EVENT_VENUE}</span></div>
  </div>
  <div class="footer">IIT Iftar Committee &nbsp;&middot;&nbsp; This is an automated email, please do not reply.</div>
</div>
</body></html>"""

    msg = MIMEMultipart("related")
    msg["From"]    = f"{SENDER_NAME} <{SENDER_EMAIL}>"
    msg["To"]      = to_email
    msg["Subject"] = f"Your Iftar Entry Pass — {EVENT_NAME}"
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
