// ============================================================
//  IIT Iftar Committee — QR Attendance System
//  Google Apps Script  |  paste into script.google.com
// ============================================================

// ── CONFIG ──────────────────────────────────────────────────
var SHEET_NAME = "Responses";   // default Google Sheets tab name

//  Col indices (1-based) — matches your Google Form output
//  Col  1: Timestamp
//  Col  2: Email Address     ← auto-verified Google email
//  Col  3: Full Name
//  Col  4: IIT ID            ← NO LONGER the QR payload
//  Col  5: Contact Number
//  Col  6: NIC
//  Col  7: Food Preference
//  Col  8: Photobooth
//  Col  9: Gender
//  Col 10: 360° Camera
//  Col 11: Academic level
//  Col 12: TOKEN             ← this IS the QR payload now
//  Col 13: Attended          ← written by scanner
//  Col 14: Attended At       ← written by scanner

var COL_EMAIL        = 2;
var COL_NAME         = 3;
var COL_IITID        = 4;
var COL_TOKEN        = 12;
var COL_ATTENDED     = 13;
var COL_ATTENDED_AT  = 14;

var EVENT_NAME  = "IIT Iftar 2026";
var EVENT_DATE  = "09 March 2026";
var EVENT_VENUE = "Temple Trees";
// ────────────────────────────────────────────────────────────


// ============================================================
//  WEB APP ENDPOINT  (GET request from scanner)
//  Deploy as: Execute as ME | Anyone can access
//
//  URL: <webAppUrl>?token=<TOKEN>      → mark attendance via QR scan
//  URL: <webAppUrl>?action=getList     → fetch full list for master view
//  URL: <webAppUrl>?action=manualMark&token=<TOKEN>  → manual override
// ============================================================
function doGet(e) {
  try {
    var ss     = SpreadsheetApp.getActiveSpreadsheet();
    var sheet  = ss.getSheetByName(SHEET_NAME);
    var action = e.parameter.action;

    // ACTION: Fetch master list
    if (action === "getList") {
      return buildResponse({ status: "success", data: getFullList(sheet) });
    }

    // ACTION: Manual mark (same as QR scan, just labelled separately)
    if (action === "manualMark") {
      var token = e.parameter.token;
      if (!token) return buildResponse({ status: "invalid", message: "No Token provided." });
      return buildResponse(validateAndMark(sheet, token));
    }

    // DEFAULT ACTION: QR scan — token is the payload
    var token = e.parameter.token;
    if (!token) {
      return buildResponse({ status: "invalid", message: "No Token in QR code." });
    }
    return buildResponse(validateAndMark(sheet, token));

  } catch (err) {
    return buildResponse({ status: "error", message: err.message });
  }
}


/** Automatically generates a token for new submissions */
function onFormSubmit(e) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  var row   = e.range.getRow();

  // Generate 8-char random alphanumeric token
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // readable chars
  var token = "";
  for (var i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Write token to COL_TOKEN
  sheet.getRange(row, COL_TOKEN).setValue(token);
}


/** Finds a row by Token (col 12) and marks attendance */
function validateAndMark(sheet, token) {
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var rowToken = String(data[i][COL_TOKEN - 1]).trim();
    var attended = String(data[i][COL_ATTENDED - 1]).trim();
    var name     = String(data[i][COL_NAME - 1]).trim();
    var iitId    = String(data[i][COL_IITID - 1]).trim();

    if (rowToken === String(token).trim()) {
      if (attended === "Yes") {
        return { status: "already_used", name: name, iit_id: iitId };
      }
      var rowNum = i + 1;
      sheet.getRange(rowNum, COL_ATTENDED).setValue("Yes");
      sheet.getRange(rowNum, COL_ATTENDED_AT).setValue(
        Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
      );
      return { status: "success", name: name, iit_id: iitId };
    }
  }
  return { status: "invalid", message: "Token not found in registrations." };
}


/** Fetches all student records from the sheet */
function getFullList(sheet) {
  var data = sheet.getDataRange().getValues();
  var results = [];
  for (var i = 1; i < data.length; i++) {
    var name  = String(data[i][COL_NAME - 1]).trim();
    var email = String(data[i][COL_EMAIL - 1]).trim();
    if (!name && !email) continue;
    results.push({
      name:     name,
      email:    email,
      token:    String(data[i][COL_TOKEN - 1]).trim(),
      iit_id:   String(data[i][COL_IITID - 1]).trim(),
      attended: String(data[i][COL_ATTENDED - 1]).trim() === "Yes"
    });
  }
  return results;
}


/** Wraps a JSON object into a ContentService response */
function buildResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
