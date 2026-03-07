PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "iitId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "gender" TEXT,
    "contactNumber" TEXT,
    "nicOrPassport" TEXT,
    "academicLevel" TEXT,
    "foodPreference" TEXT,
    "photobooth" TEXT,
    "camera360" TEXT,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "attendedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO Student VALUES('c23f4115ba5a244fcab744516','20231638','Zaki','1','zakisheriff57@gmail.com','Male','715858325','Don’t have','Foundation','Non-Veg','Yes','',0,NULL,'2026-03-07T09:04:48.732Z',1772874568243);
CREATE UNIQUE INDEX "Student_iitId_key" ON "Student"("iitId");
COMMIT;
