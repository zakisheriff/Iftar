DROP TABLE Student;
CREATE TABLE Student (
    id TEXT PRIMARY KEY,
    iitId TEXT,
    firstName TEXT,
    lastName TEXT,
    email TEXT,
    gender TEXT,
    contactNumber TEXT,
    nicOrPassport TEXT,
    academicLevel TEXT,
    foodPreference TEXT,
    photobooth TEXT,
    camera360 TEXT,
    attended INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
