import csv
import os
import uuid
import datetime
from libsql_client import create_client_sync
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Turso Connection
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL not found in .env")
    exit(1)

# Fix for the Protocol Mismatch:
# Turso SDK for Python prefers https:// over libsql:// for certain environments
url_only = DATABASE_URL.split('?')[0]
if url_only.startswith("libsql://"):
    url_only = url_only.replace("libsql://", "https://")

auth_token = DATABASE_URL.split('authToken=')[1] if 'authToken=' in DATABASE_URL else ""

client = create_client_sync(url=url_only, auth_token=auth_token)

CSV_PATH = "../python-script/responses.csv"

def main():
    print(f"Connecting to Turso Cloud at {url_only}...")
    
    try:
        # We need to handle the BOM if it exists
        with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    print(f"Found {len(rows)} students in CSV. Starting upload...")
    count = 0
    
    for row in rows:
        # Using exact column names from your CSV
        iit_id = str(row.get("IIT Student ID", "")).strip()
        if not iit_id:
            continue
            
        fname = str(row.get("First Name", "")).strip()
        lname = str(row.get("Last Name", "")).strip()
        email = str(row.get("Email Address", "")).strip()
        
        gender = str(row.get("Gender", "")).strip()
        contact = str(row.get("Contact Number", "")).strip()
        nic = str(row.get("National Identity Card (NIC) / Passport Number", "")).strip()
        academic_level = str(row.get("Academic Level", "")).strip()
        food = str(row.get("Food Preference", "")).strip()
        
        # Photobooth column is long
        photo_col = "As part of the event, a photo-booth will be set up. As slots are limited, kindly indicate below if you intend to take a picture"
        photo = str(row.get(photo_col, "")).strip()
        
        cam360_col = "Would you like to try a 360° Camera Experience?  "
        cam360 = str(row.get(cam360_col, "")).strip()
        
        now = datetime.datetime.now(datetime.UTC).isoformat().replace('+00:00', 'Z')
        
        try:
            # Using INSERT OR REPLACE to handle potential duplicates cleanly
            new_id = "c" + uuid.uuid4().hex[:24]
            client.execute("""
                INSERT OR REPLACE INTO Student (id, iitId, firstName, lastName, email, gender, contactNumber, nicOrPassport, academicLevel, foodPreference, photobooth, camera360, attended, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            """, (new_id, iit_id, fname, lname, email, gender, contact, nic, academic_level, food, photo, cam360, now, now))
            count += 1
            if count % 50 == 0:
                print(f"Uploaded {count} students...")
        except Exception as e:
            print(f"Error inserting student {iit_id}: {e}")

    print(f"\nFinal Success! Successfully migrated {count} students to Turso Cloud.")
    print("Your live scanner URL will now show the correct attendance counts.")

if __name__ == "__main__":
    main()
