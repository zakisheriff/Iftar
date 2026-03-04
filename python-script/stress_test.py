"""
Gmail API Rate Limit Stress Test
=================================
Sends 800 emails to zakisheriff57@gmail.com as fast as possible (no delay).
Uses the already-saved token.json — no browser login needed.

Run:
    python stress_test.py
"""

import base64
import time
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from io import BytesIO

import qrcode
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# ─── CONFIG ────────────────────────────────────────────────────────────────────
SENDER_EMAIL  = "shaki.20231638@iit.ac.lk"
SENDER_NAME   = "IIT Iftar Committee"
TARGET_EMAIL  = "zakisheriff57@gmail.com"
TOTAL_EMAILS  = 800
EMAIL_DELAY   = 0       # no delay — pure stress test

CREDENTIALS_FILE = "credentials.json"
TOKEN_FILE       = "token.json"
SCOPES           = ["https://www.googleapis.com/auth/gmail.send"]
# ───────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


def get_service():
    creds = None
    if __import__("os").path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
    return build("gmail", "v1", credentials=creds)


def make_qr_bytes(token: str) -> bytes:
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(token)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1a2f26", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def build_msg(i: int) -> MIMEMultipart:
    import uuid
    token = str(uuid.uuid4())
    msg = MIMEMultipart("related")
    msg["From"]    = f"{SENDER_NAME} <{SENDER_EMAIL}>"
    msg["To"]      = TARGET_EMAIL
    msg["Subject"] = f"[STRESS TEST #{i}] IIT Iftar Entry Pass"
    html = f"""<html><body style="font-family:Arial;text-align:center;padding:40px;">
        <h2>Test Email #{i} of {TOTAL_EMAILS}</h2>
        <p>Token: <code>{token[:16]}…</code></p>
        <img src="cid:qrcode" width="200" height="200">
    </body></html>"""
    msg.attach(MIMEText(html, "html"))
    qr_img = MIMEImage(make_qr_bytes(token), _subtype="png")
    qr_img.add_header("Content-ID", "<qrcode>")
    qr_img.add_header("Content-Disposition", "inline", filename="qr.png")
    msg.attach(qr_img)
    return msg


def main():
    service = get_service()
    log.info(f"Authenticated. Sending {TOTAL_EMAILS} emails to {TARGET_EMAIL} with NO delay...\n")

    sent = 0
    failed = 0
    start = time.time()

    for i in range(1, TOTAL_EMAILS + 1):
        try:
            msg = build_msg(i)
            raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
            service.users().messages().send(userId="me", body={"raw": raw}).execute()
            sent += 1
            elapsed = time.time() - start
            rate = sent / elapsed
            log.info(f"[{i}/{TOTAL_EMAILS}] ✓ Sent  |  {rate:.1f} emails/sec  |  {elapsed:.1f}s elapsed")

        except HttpError as e:
            failed += 1
            log.error(f"[{i}/{TOTAL_EMAILS}] ✗ HttpError: {e.status_code} — {e.reason}")
            if e.status_code == 429:
                log.error(">>> RATE LIMIT HIT at email #" + str(i))
                break
            elif e.status_code in (500, 503):
                log.warning("Server error, waiting 5s and retrying...")
                time.sleep(5)
        except Exception as e:
            failed += 1
            log.error(f"[{i}/{TOTAL_EMAILS}] ✗ Error: {e}")

        if EMAIL_DELAY:
            time.sleep(EMAIL_DELAY)

    total_time = time.time() - start
    log.info("─" * 60)
    log.info(f"DONE. ✓ {sent} sent  ✗ {failed} failed  in {total_time:.1f}s")
    log.info(f"Average rate: {sent/total_time:.2f} emails/sec")
    if failed == 0:
        log.info("NO RATE LIMIT HIT — Gmail API handled all 800 with no issues ✅")


if __name__ == "__main__":
    main()
