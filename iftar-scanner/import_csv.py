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

    print(f"Found {len(rows)} rows in CSV. Starting upload to cloud...")
    
    # First, let's clear the Student table to ensure a fresh test import
    print("Clearing existing students in cloud for a clean sync...")
    client.execute("DELETE FROM Student")
    
    count = 0
    for row in rows:
        # Note: Your test CSV has many duplicate IIT IDs (20231638)
        # We will use the Email as part of the unique ID to ensure they don't overwrite each other
        iit_id = str(row.get("IIT Student ID", "")).strip()
        if not iit_id:
            iit_id = str(row.get("IIT Student ID ", "")).strip() # check for space
            if not iit_id: continue
            
        fname = str(row.get("First Name", "")).strip()
        lname = str(row.get("Last Name", "")).strip()
        email = str(row.get("Email Address", "")).strip()
        
        # We generate a completely unique ID for every single row
        # This prevents the '0' issue where records are overwritten
        unique_id = "c" + uuid.uuid4().hex[:24]
        
        now = datetime.datetime.now(datetime.UTC).isoformat().replace('+00:00', 'Z')
        
        try:
            client.execute("""
                INSERT INTO Student (id, iitId, firstName, lastName, email, attended, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, 0, ?, ?)
            """, (unique_id, iit_id, fname, lname, email, now, now))
            count += 1
            if count % 50 == 0:
                print(f"Uploaded {count} students...")
        except Exception as e:
            # If IIT ID is unique in schema, but we have duplicates in CSV, we must handle it
            # For now, we print it out. If the schema has @unique on iitId, this will error on the 2nd duplicate.
            print(f"Skipping duplicate IIT ID {iit_id}: {e}")

    print(f"\nFinal Success! Successfully migrated {count} students to Turso Cloud.")

if __name__ == "__main__":
    main()
