// ============================================================
//  IIT Iftar Committee — QR Attendance System
//  Google Apps Script  |  paste into script.google.com
// ============================================================

// ── CONFIG ──────────────────────────────────────────────────
//  Replace with the name of YOUR Google Sheet tab
var SHEET_NAME = "Responses";

//  Column indices (1-based) — must match your sheet layout
var COL_TIMESTAMP    = 1;
var COL_NAME         = 2;
var COL_EMAIL        = 3;
var COL_TOKEN        = 4;
var COL_ATTENDED     = 5;
var COL_ATTENDED_AT  = 6;

//  Your event details (shown in the email)
var EVENT_NAME = "IIT Iftar 2026";
var EVENT_DATE = "09 March 2026";       // update with the real date
var EVENT_VENUE = "Temple Trees";      // update with the venue
// ────────────────────────────────────────────────────────────


// ============================================================
//  1.  FORM SUBMIT TRIGGER
//     Set this up: Extensions → Apps Script → Triggers →
//     onFormSubmit | From spreadsheet | On form submit
// ============================================================
function onFormSubmit(e) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);

    // Read values from the form response
    var values    = e.values;                  // array of cell values
    var name      = values[COL_NAME - 1];      // e.g. "Ahmed Ali"
    var email     = values[COL_EMAIL - 1];     // e.g. "s123@iit.edu"
    var rowIndex  = findRowByEmail(sheet, email);

    // Generate a unique token & store it
    var token = generateUUID();
    sheet.getRange(rowIndex, COL_TOKEN).setValue(token);
    sheet.getRange(rowIndex, COL_ATTENDED).setValue("No");
    sheet.getRange(rowIndex, COL_ATTENDED_AT).setValue("");

    // Send the QR email
    sendQREmail(name, email, token);

    Logger.log("QR sent to " + email + " | token: " + token);
  } catch (err) {
    Logger.log("ERROR in onFormSubmit: " + err.message);
  }
}


// ============================================================
//  2.  WEB APP ENDPOINT  (GET request from scanner page)
//     Deploy as: Execute as ME | Anyone can access
//     URL format:  <webAppUrl>?token=<uuid>
// ============================================================
function doGet(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
    "Content-Type": "application/json"
  };

  try {
    var action = e.parameter.action;
    var ss     = SpreadsheetApp.getActiveSpreadsheet();
    var sheet  = ss.getSheetByName(SHEET_NAME);

    // ACTION: Get the master list of students
    if (action === "getList") {
      var list = getFullList(sheet);
      return buildResponse({ status: "success", data: list }, headers);
    }



    // ACTION: Mark attendance via QR (default)
    var token = e.parameter.token;
    if (!token) {
      return buildResponse({ 
        status: "invalid", 
        message: "No token/action provided. IMPORTANT: Make sure you re-deployed your script as a NEW VERSION." 
      }, headers);
    }

    var result = validateAndMark(sheet, token);
    return buildResponse(result, headers);
  } catch (err) {
    return buildResponse({ status: "error", message: err.message }, headers);
  }
}


/** Finds a token in column D and validates / marks attendance */
function validateAndMark(sheet, token) {
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var rowToken = String(data[i][COL_TOKEN - 1]).trim();
    var attended = String(data[i][COL_ATTENDED - 1]).trim();
    var name     = String(data[i][COL_NAME - 1]).trim();

    if (rowToken === token) {
      if (attended === "Yes") {
        return { status: "already_used", name: name };
      }
      var rowNum = i + 1;
      sheet.getRange(rowNum, COL_ATTENDED).setValue("Yes");
      sheet.getRange(rowNum, COL_ATTENDED_AT).setValue(
        Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
      );
      return { status: "success", name: name };
    }
  }
  return { status: "invalid", message: "Token not found." };
}





/** Fetches all student records from the sheet */
function getFullList(sheet) {
  var data = sheet.getDataRange().getValues();
  var results = [];
  
  for (var i = 1; i < data.length; i++) {
    var name = String(data[i][COL_NAME - 1]).trim();
    var email = String(data[i][COL_EMAIL - 1]).trim();
    // Skip empty rows
    if (!name && !email) continue;
    
    results.push({
      name: name,
      email: email,
      attended: String(data[i][COL_ATTENDED - 1]).trim() === "Yes"
    });
  }
  return results;
}


/** Finds the sheet row number matching an email (column C) */
function findRowByEmail(sheet, email) {
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) { // latest match first
    if (String(data[i][COL_EMAIL - 1]).trim().toLowerCase() === email.trim().toLowerCase()) {
      return i + 1; // 1-based row index
    }
  }
  // Fallback: return last row if not found (shouldn't happen)
  return sheet.getLastRow();
}


/** Generates a UUID v4 string */
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0;
    var v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}


/** Sends a beautifully formatted HTML email with embedded QR code */
function sendQREmail(name, email, token) {
  var qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(token);

  var htmlBody = '<!DOCTYPE html>' +
    '<html><head><meta charset="UTF-8">' +
    '<style>' +
    '  body { margin:0; padding:0; background:#eae3d9; font-family: Arial, sans-serif; color:#1a2f26; }' +
    '  .wrapper { max-width:580px; margin:40px auto; background:#f5f0eb; border-radius:35px; overflow:hidden; border:1px solid rgba(59,107,88,0.15); box-shadow: 0 10px 40px rgba(59,107,88,0.08); }' +
    '  .header { background: #eae3d9; padding:40px 32px; text-align:center; border-bottom:1px solid rgba(59,107,88,0.1); }' +
    '  .title { font-size:26px; font-weight:bold; color:#1a2f26; letter-spacing:1px; margin:0; }' +
    '  .subtitle { font-size:16px; color:#3b6b58; margin:8px 0 0; font-weight: 700; }' +
    '  .theme { font-size: 13px; color: rgba(26, 47, 38, 0.6); margin-top: 10px; font-style: italic; }' +
    '  .body { padding:40px 32px; text-align:center; }' +
    '  .greeting { font-size:18px; color:#3b6b58; margin-bottom:10px; font-weight: bold; }' +
    '  .name { font-size:24px; font-weight:bold; color:#1a2f26; margin-bottom:24px; }' +
    '  .msg { font-size:15px; color:#5a7368; line-height:1.7; margin-bottom:32px; }' +
    '  .qr-wrapper { display: inline-block; padding: 20px; background: #fff; border-radius: 24px; border: 1px solid rgba(59,107,88,0.15); margin-bottom: 32px; box-shadow: 0 4px 12px rgba(59,107,88,0.04); }' +
    '  .qr-box img { display:block; border-radius: 8px; }' +
    '  .note { background:rgba(59,107,88,0.05); border:1px solid rgba(59,107,88,0.15); border-radius:20px; padding:20px; font-size:14px; color:#3b6b58; margin-bottom:32px; text-align:left; line-height: 1.6; }' +
    '  .note strong { display:block; margin-bottom:6px; font-size:15px; }' +
    '  .details { font-size:14px; color:#5a7368; background: #eae3d9; padding: 16px 24px; border-radius: 20px; display: inline-block; }' +
    '  .details span { color:#1a2f26; font-weight:bold; }' +
    '  .footer { border-top:1px solid rgba(59,107,88,0.15); padding:24px 32px; text-align:center; font-size:13px; color:#5a7368; background: #eae3d9; }' +
    '</style></head><body>' +
    '<div class="wrapper">' +
    '  <div class="header">' +
    '    <div style="margin-bottom: 24px;">' +
    '      <img src="https://i.postimg.cc/KvMhHNWc/IMG-0290.png" width="130" alt="Logo" style="display:inline-block;">' +
    '    </div>' +

    '    <div class="subtitle">Echoes of Arabia — Your Entry Pass</div>' +
    '    <div class="theme">Some stories never fade; they just echo.</div>' +
    '  </div>' +
    '  <div class="body">' +
    '    <div class="greeting">As-salamu Alaikum,</div>' +
    '    <div class="name">' + name + '</div>' +
    '    <div class="msg">You are registered for <strong style="color:#3b6b58">' + EVENT_NAME + '</strong>.<br>Please present the QR code below at the entrance. It is unique to you and can only be scanned <strong style="color:#b91c1c">once</strong>.</div>' +
    '    <div class="qr-wrapper"><div class="qr-box"><img src="' + qrUrl + '" width="240" height="240" alt="Your QR Code" /></div></div>' +
    '    <div class="note">' +
    '      <strong>Important</strong>' +
    '      Do not share this QR code. It will be invalidated after the first scan. Screenshots are fine — just make sure it is visible and clear.' +
    '    </div>' +
    '    <div class="details">Date: <span>' + EVENT_DATE + '</span> &nbsp;|&nbsp; Venue: <span>' + EVENT_VENUE + '</span></div>' +
    '  </div>' +
    '  <div class="footer">IIT Iftar Committee &nbsp;&middot;&nbsp; This is an automated email, do not reply.</div>' +
    '</div>' +
    '</body></html>';

  GmailApp.sendEmail(email, "Your Iftar Entry Pass — " + EVENT_NAME, "", {
    htmlBody: htmlBody,
    name: "IIT Iftar Committee"
  });
}


/** Wraps a JSON object into a ContentService response */
function buildResponse(obj, headers) {
  var output = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
