import sqlite3
import csv
import uuid
import datetime

DB_PATH = "prisma/dev.db"
CSV_PATH = "../python-script/responses.csv"

def main():
    print(f"Reading {CSV_PATH}...")
    try:
        with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    print(f"Connecting to {DB_PATH}... Found {len(rows)} rows.")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

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
        
        now = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
        
        # Check if already exists
        cursor.execute("SELECT id FROM Student WHERE iitId = ?", (iit_id,))
        exists = cursor.fetchone()
        
        if not exists:
            # Generate cuid-like or uuid string
            new_id = "c" + uuid.uuid4().hex[:24]
            try:
                cursor.execute("""
                    INSERT INTO Student (id, iitId, firstName, lastName, email, gender, contactNumber, nicOrPassport, academicLevel, foodPreference, photobooth, camera360, attended, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
                """, (new_id, iit_id, fname, lname, email, gender, contact, nic, academic_level, food, photo, cam360, now, now))
                count += 1
            except Exception as e:
                print(f"Error inserting {iit_id}: {e}")
                
    conn.commit()
    conn.close()
    print(f"Successfully migrated {count} new students into the local database!")

if __name__ == "__main__":
    main()
