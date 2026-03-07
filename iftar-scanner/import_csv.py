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

url_only = DATABASE_URL.split('?')[0]
if url_only.startswith("libsql://"):
    url_only = url_only.replace("libsql://", "https://")

auth_token = DATABASE_URL.split('authToken=')[1] if 'authToken=' in DATABASE_URL else ""

client = create_client_sync(url=url_only, auth_token=auth_token)

CSV_PATH = "../python-script/responses.csv"

def main():
    print(f"Connecting to Turso Cloud at {url_only}...")
    
    try:
        with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    print(f"Found {len(rows)} rows in CSV. Syncing with cloud...")
    
    # 1. Fetch existing students to avoid unnecessary inserts/overwrites
    print("Fetching existing student records to prevent data loss...")
    existing_res = client.execute("SELECT iitId, email, attended FROM Student")
    # Store as a set of (iitId, email) for fast lookup
    # We use a dictionary to track students we've either fetched or just added
    seen_students = { (str(r[0]).strip(), str(r[1]).strip()): True for r in existing_res }
    
    added_count = 0
    updated_count = 0
    
    now = datetime.datetime.now(datetime.UTC).isoformat().replace('+00:00', 'Z')

    for row in rows:
        iit_id = str(row.get("IIT Student ID", "")).strip()
        if not iit_id:
            iit_id = str(row.get("IIT Student ID ", "")).strip()
            if not iit_id: continue
            
        fname = str(row.get("First Name", "")).strip()
        lname = str(row.get("Last Name", "")).strip()
        email = str(row.get("Email Address", "")).strip()
        
        student_key = (iit_id, email)
        
        # Check if they already exist (either from start or added just now)
        if student_key in seen_students:
            # Student exists. UPDATE details but DO NOT touch 'attended'
            try:
                # We use iitId and email to identify. 
                # Note: if there are already multiple with the same key, this updates all of them.
                client.execute("""
                    UPDATE Student 
                    SET firstName = ?, lastName = ?, updatedAt = ?
                    WHERE iitId = ? AND email = ?
                """, (fname, lname, now, iit_id, email))
                updated_count += 1
            except Exception as e:
                print(f"Error updating {iit_id}: {e}")
        else:
            # NEW Student. INSERT
            unique_id = "c" + uuid.uuid4().hex[:24]
            try:
                client.execute("""
                    INSERT INTO Student (id, iitId, firstName, lastName, email, attended, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
                """, (unique_id, iit_id, fname, lname, email, now, now))
                seen_students[student_key] = True # Track it!
                added_count += 1
            except Exception as e:
                print(f"Error inserting new student {iit_id}: {e}")

        if (added_count + updated_count) % 50 == 0 and (added_count + updated_count) > 0:
            print(f"Processed {added_count + updated_count} students...")

    print(f"\n✅ Sync Complete!")
    print(f"- New students added: {added_count}")
    print(f"- Existing student details updated: {updated_count}")
    print(f"- Total unique students now in cloud: {len(seen_students)}")
    print("\nNote: Attendance data was strictly preserved for all existing students.")

if __name__ == "__main__":
    main()
