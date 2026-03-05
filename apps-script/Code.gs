// ============================================================
//  IIT Iftar Committee — QR Attendance System
//  Google Apps Script  |  paste into script.google.com
// ============================================================

// ── CONFIG ──────────────────────────────────────────────────
var SHEET_NAME = "Responses";   // default Google Sheets tab name

//  Column indices (1-based) — matches your Google Form output
//  Col  1: Timestamp
//  Col  2: Email Address
//  Col  3: First Name
//  Col  4: Last Name
//  Col  5: Gender
//  Col  6: IIT Student ID
//  Col  7: Contact Number
//  Col  8: National Identity Card (NIC) / Passport Number
//  Col  9: Academic Level
//  Col 10: Food Preference
//  Col 11: Photo-booth Preference
//  Col 12: 360° Camera Experience
//  Col 13: Token
//  Col 14: Attended          ← written by scanner
//  Col 15: Attended At       ← written by scanner

var COL_EMAIL        = 2;
var COL_FNAME        = 3;
var COL_LNAME        = 4;
var COL_IITID        = 6;
var COL_TOKEN        = 13;
var COL_ATTENDED     = 14;
var COL_ATTENDED_AT  = 15;

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

    // ACTION: Diagnostic — check column structure
    if (action === "checkStructure") {
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      return buildResponse({
        status: "success",
        expected_iitid_col: COL_IITID,
        actual_headers: headers,
        sample_row_1: sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0]
      });
    }

    // ACTION: Manual mark (same as QR scan, just labelled separately)
    if (action === "manualMark") {
      var iitId = e.parameter.token; // 'token' parameter from scanner now contains IIT ID
      if (!iitId) return buildResponse({ status: "invalid", message: "No IIT ID provided." });
      return buildResponse(validateAndMark(sheet, iitId));
    }

    // DEFAULT ACTION: QR scan — IIT ID is the payload
    var iitId = e.parameter.token;
    if (!iitId) {
      return buildResponse({ status: "invalid", message: "No IIT ID in QR code." });
    }
    return buildResponse(validateAndMark(sheet, iitId));

  } catch (err) {
    return buildResponse({ status: "error", message: err.message });
  }
}


/** Automatically generates a token for new submissions (DISABLED: now using IIT ID) */
function onFormSubmit(e) {
  // Token generation removed as we are now using IIT ID for QR codes.
}


/** Finds a row by IIT ID (col 5) and marks attendance */
function validateAndMark(sheet, iitId) {
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var rowIitId = String(data[i][COL_IITID - 1]).trim();
    var searchId = String(iitId).trim();

    // Debug log (view in Apps Script → Executions)
    // console.log("Checking Row " + (i+1) + ": '" + rowIitId + "' vs '" + searchId + "'");

    if (searchId && rowIitId.toLowerCase() === searchId.toLowerCase()) {
      var attended = String(data[i][COL_ATTENDED - 1]).trim();
      var fname    = String(data[i][COL_FNAME - 1]).trim();
      var lname    = String(data[i][COL_LNAME - 1]).trim();
      var fullName = (fname + " " + lname).trim();

      if (attended === "Yes") {
        return { status: "already_used", name: fullName, iit_id: rowIitId };
      }
      var rowNum = i + 1;
      sheet.getRange(rowNum, COL_ATTENDED).setValue("Yes");
      sheet.getRange(rowNum, COL_ATTENDED_AT).setValue(
        Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
      );
      return { status: "success", name: fullName, iit_id: rowIitId };
    }
  }
  return { status: "invalid", message: "IIT ID not found in registrations." };
}


/** Fetches all student records from the sheet */
function getFullList(sheet) {
  var data = sheet.getDataRange().getValues();
  var results = [];
  for (var i = 1; i < data.length; i++) {
    var fname = String(data[i][COL_FNAME - 1]).trim();
    var lname = String(data[i][COL_LNAME - 1]).trim();
    var name  = (fname + " " + lname).trim();
    var email = String(data[i][COL_EMAIL - 1]).trim();
    
    if (!name && !email) continue;
    
    results.push({
      name:     name,
      email:    email,
      token:    String(data[i][COL_IITID - 1]).trim(), // Using IIT ID as the token field for backward compatibility in scanner
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
