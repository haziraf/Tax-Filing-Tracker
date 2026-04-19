// ============================================================
//  LHDN Tax Relief Tracker — Code.gs  (Standalone Script)
//  v6 — Email whitelist + shared passcode combined login
// ============================================================

// ── App Configuration ─────────────────────────────────────────
const FOLDER_NAME     = "LHDN Tax Relief Tracker";
const FILE_PREFIX     = "YA ";
const FILE_SUFFIX     = " \u2013 Tax Relief";
const RECEIPTS_PREFIX = "Receipts \u2013 YA ";
const SHEET_EXPENSES  = "Expenses";
const SHEET_CATS      = "Categories";
const MAX_FILE_BYTES  = 5 * 1024 * 1024;
const ALLOWED_MIMES   = [
  "image/jpeg","image/png","image/gif","image/webp","application/pdf"
];

// ── ScriptProperties keys ─────────────────────────────────────
const PROP_FOLDER   = "FOLDER_ID";
const PROP_EMAILS   = "ALLOWED_EMAILS";    // comma-separated lowercase emails
const PROP_PASSCODE = "APP_PASSCODE_HASH"; // SHA-256 hex of shared passcode
const PROP_SECRET   = "SESSION_SECRET";    // HMAC signing key
const TOKEN_TTL_MS  = 8 * 60 * 60 * 1000; // 8-hour sessions

// ── LHDN Relief Reference Limits ─────────────────────────────
const RELIEF_LIMITS_DB = {
  2025: {
    "Individual & Dependent Relatives":                                  9000,
    "Medical Treatment for Parents / Grandparents":                      8000,
    "Basic Supporting Equipment (Disabled Self/Spouse/Child/Parent)":    6000,
    "Disabled Individual":                                               7000,
    "Education Fees (Self)":                                             7000,
    "Medical Expenses (Serious Diseases, Fertility, Vaccination & Dental)": 10000,
    "Lifestyle \u2013 Books, PC, Smartphone, Internet & Skill Courses": 2500,
    "Lifestyle \u2013 Sports Equipment, Facilities & Gym":              1000,
    "Breastfeeding Equipment":                                           1000,
    "Child Care Fees (Registered Centre / Kindergarten)":                3000,
    "Net Deposit in SSPN":                                               8000,
    "Life Insurance & EPF":                                              7000,
    "Deferred Annuity & PRS":                                            3000,
    "Education & Medical Insurance":                                     4000,
    "EV Charging Facilities":                                            2500,
    "First Home Housing Loan Interest (Property \u2264 RM500k)":         7000
  },
  2024: {
    "Individual & Dependent Relatives":                                  9000,
    "Medical Treatment for Parents / Grandparents":                      8000,
    "Basic Supporting Equipment (Disabled Self/Spouse/Child/Parent)":    6000,
    "Disabled Individual":                                               6000,
    "Education Fees (Self)":                                             7000,
    "Medical Expenses (Serious Diseases, Fertility, Vaccination & Dental)": 10000,
    "Lifestyle \u2013 Books, PC, Smartphone, Internet & Skill Courses": 2500,
    "Lifestyle \u2013 Sports Equipment, Facilities & Gym":              1000,
    "Breastfeeding Equipment":                                           1000,
    "Child Care Fees (Registered Centre / Kindergarten)":                3000,
    "Net Deposit in SSPN":                                               8000,
    "Life Insurance & EPF":                                              7000,
    "Deferred Annuity & PRS":                                            3000,
    "Education & Medical Insurance":                                     4000,
    "EV Charging Facilities":                                            2500,
    "First Home Housing Loan Interest (Property \u2264 RM500k)":         7000
  },
  2023: {
    "Individual & Dependent Relatives":                                  9000,
    "Medical Treatment for Parents / Grandparents":                      8000,
    "Basic Supporting Equipment (Disabled Self/Spouse/Child/Parent)":    6000,
    "Disabled Individual":                                               6000,
    "Education Fees (Self)":                                             7000,
    "Medical Expenses (Serious Diseases, Fertility, Vaccination & Dental)": 8000,
    "Lifestyle \u2013 Books, PC, Smartphone, Internet & Skill Courses": 2500,
    "Lifestyle \u2013 Sports Equipment, Facilities & Gym":              1000,
    "Breastfeeding Equipment":                                           1000,
    "Child Care Fees (Registered Centre / Kindergarten)":                3000,
    "Net Deposit in SSPN":                                               8000,
    "Life Insurance & EPF":                                              7000,
    "Deferred Annuity & PRS":                                            3000,
    "Education & Medical Insurance":                                     3000,
    "EV Charging Facilities":                                            0,
    "First Home Housing Loan Interest (Property \u2264 RM500k)":         7000
  }
};

// ╔══════════════════════════════════════════════════════════════╗
// ║  SECURITY LAYER                                              ║
// ║                                                              ║
// ║  Login requires BOTH conditions to pass (when configured):   ║
// ║    1. Email must be in the whitelist                         ║
// ║    2. Passcode must match the shared secret                  ║
// ║                                                              ║
// ║  If neither is configured → open access (setup mode).        ║
// ║  If only one is configured → only that check applies.        ║
// ║                                                              ║
// ║  On success, server issues a signed HMAC-SHA256 token        ║
// ║  valid for 8 hours. Every API call must carry this token.    ║
// ╚══════════════════════════════════════════════════════════════╝

function getOrCreateSecret_() {
  var props = PropertiesService.getScriptProperties();
  var s     = props.getProperty(PROP_SECRET);
  if (!s) {
    s = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty(PROP_SECRET, s);
  }
  return s;
}

function bytesToHex_(bytes) {
  return bytes.map(function(b){ return (b<0?b+256:b).toString(16).padStart(2,"0"); }).join("");
}

function sha256_(str) {
  return bytesToHex_(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8)
  );
}

function generateToken_() {
  var exp    = String(Date.now() + TOKEN_TTL_MS);
  var secret = getOrCreateSecret_();
  var sig    = bytesToHex_(
    Utilities.computeHmacSha256Signature(exp, secret, Utilities.Charset.UTF_8)
  );
  return exp + ":" + sig;
}

function isValidToken_(token) {
  try {
    if (!token || typeof token !== "string") return false;
    var p = token.split(":");
    if (p.length !== 2) return false;
    if (isNaN(parseInt(p[0],10)) || Date.now() > parseInt(p[0],10)) return false;
    var expected = bytesToHex_(
      Utilities.computeHmacSha256Signature(p[0], getOrCreateSecret_(), Utilities.Charset.UTF_8)
    );
    return p[1] === expected;
  } catch(e){ return false; }
}

/** Throws ACCESS_DENIED if security is configured and the token is invalid. */
function checkAccess_(token) {
  var props    = PropertiesService.getScriptProperties();
  var hasEmail = !!(props.getProperty(PROP_EMAILS) || "").trim();
  var hasPass  = !!(props.getProperty(PROP_PASSCODE) || "").trim();
  if (!hasEmail && !hasPass) return; // open access — no security configured
  if (!isValidToken_(token)) throw new Error("ACCESS_DENIED");
}

// ── Private Data Helpers ──────────────────────────────────────

function getDefaultLimits_(year) {
  var y  = parseInt(year, 10);
  var ks = Object.keys(RELIEF_LIMITS_DB).map(Number).sort(function(a,b){return b-a;});
  if (RELIEF_LIMITS_DB[y]) return RELIEF_LIMITS_DB[y];
  for (var i=0;i<ks.length;i++) { if(ks[i]<=y) return RELIEF_LIMITS_DB[ks[i]]; }
  return RELIEF_LIMITS_DB[ks[ks.length-1]];
}

function getOrCreateFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id    = props.getProperty(PROP_FOLDER);
  if (id) { try { return DriveApp.getFolderById(id); } catch(e){ props.deleteProperty(PROP_FOLDER); } }
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  if (it.hasNext()) { var f=it.next(); props.setProperty(PROP_FOLDER,f.getId()); return f; }
  var nf = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty(PROP_FOLDER, nf.getId());
  return nf;
}

function getSpreadsheetForYear_(year) {
  var folder = getOrCreateFolder_();
  var files  = folder.getFilesByName(FILE_PREFIX + year + FILE_SUFFIX);
  return files.hasNext() ? SpreadsheetApp.openById(files.next().getId()) : null;
}

function getOrCreateReceiptsFolder_(year) {
  var parent = getOrCreateFolder_();
  var name   = RECEIPTS_PREFIX + year;
  var it     = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  var f = parent.createFolder(name);
  f.setDescription("Receipt & invoice files for YA " + year);
  return f;
}

function ensureExpensesSheet_(ss) {
  var sheet = ss.getSheetByName(SHEET_EXPENSES) || ss.insertSheet(SHEET_EXPENSES);
  if (sheet.getRange(1,1).getValue() === "") {
    sheet.getRange(1,1,1,5).setValues([["Date","Description","Category","Amount (RM)","Receipt"]])
      .setFontWeight("bold").setBackground("#0d2137").setFontColor("#ffffff").setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1,110); sheet.setColumnWidth(2,280);
    sheet.setColumnWidth(3,340); sheet.setColumnWidth(4,130); sheet.setColumnWidth(5,220);
  } else if (!sheet.getRange(1,5).getValue()) {
    sheet.getRange(1,5).setValue("Receipt")
      .setFontWeight("bold").setBackground("#0d2137").setFontColor("#ffffff").setHorizontalAlignment("center");
    sheet.setColumnWidth(5,220);
  }
  return sheet;
}

function ensureCategoriesSheet_(ss, year) {
  var sheet = ss.getSheetByName(SHEET_CATS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CATS);
    sheet.getRange(1,1,1,3).setValues([["Category Name","Limit (RM)","Type"]])
      .setFontWeight("bold").setBackground("#163860").setFontColor("#ffffff").setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1,380); sheet.setColumnWidth(2,120); sheet.setColumnWidth(3,140);
    sheet.setTabColor("#c59a30");
    var defs = getDefaultLimits_(year), rows = [];
    Object.keys(defs).forEach(function(c){ if(defs[c]>0) rows.push([c,defs[c],"LHDN Built-in"]); });
    if (rows.length) sheet.getRange(2,1,rows.length,3).setValues(rows);
  }
  return sheet;
}

function readCategories_(ss, year) {
  var data = ensureCategoriesSheet_(ss, year).getDataRange().getValues();
  var out  = [];
  for (var i=1;i<data.length;i++) {
    var n=String(data[i][0]).trim(), l=parseFloat(data[i][1]), t=String(data[i][2]).trim()||"Custom";
    if (n && !isNaN(l)) out.push({name:n,limit:l,type:t,row:i+1});
  }
  return out;
}

function makeReceiptFilename_(date, desc, originalName) {
  var d   = String(date).replace(/[-\/]/g,"").slice(0,8);
  var ds  = String(desc).toLowerCase().replace(/[^a-z0-9]/g,"_").replace(/_+/g,"_").slice(0,28);
  var uid = Utilities.getUuid().replace(/-/g,"").slice(0,8);
  var ext = (originalName.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"");
  return d+"_"+ds+"_"+uid+"."+ext;
}

function extractFileId_(url) {
  if (!url) return null;
  var m = String(url).match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  m = String(url).match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  return m ? m[1] : null;
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  PUBLIC API                                                  ║
// ╚══════════════════════════════════════════════════════════════╝

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("LHDN Tax Relief Tracker")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ══ Auth API (no token needed — these ARE the auth layer) ══════

/**
 * Returns just enough info for the login screen to render correctly.
 * Never returns actual email list or passcode.
 */
function getLoginConfig() {
  var props    = PropertiesService.getScriptProperties();
  var emails   = (props.getProperty(PROP_EMAILS)   || "").trim();
  var passcode = (props.getProperty(PROP_PASSCODE) || "").trim();
  return {
    success:       true,
    requiresEmail: !!emails,
    requiresPass:  !!passcode,
    isOpen:        (!emails && !passcode)
  };
}

/**
 * Verifies the user's email + passcode.
 * Both must pass when both are configured.
 * On success, returns a signed session token.
 *
 * @param {string} email     The email the user typed (self-declared)
 * @param {string} passcode  The shared passcode
 * @returns {{ success, token, message }}
 */
function verifyLogin(email, passcode) {
  try {
    var props       = PropertiesService.getScriptProperties();
    var storedEmails = (props.getProperty(PROP_EMAILS)   || "").trim();
    var storedPass   = (props.getProperty(PROP_PASSCODE) || "").trim();

    // Open access — no security configured
    if (!storedEmails && !storedPass) {
      return { success: true, token: generateToken_(), openAccess: true };
    }

    // Check email whitelist (when configured)
    if (storedEmails) {
      if (!email || !email.trim()) {
        return { success: false, message: "Please enter your email address." };
      }
      var list = storedEmails.split(",").map(function(e){ return e.trim().toLowerCase(); });
      if (list.indexOf(email.trim().toLowerCase()) === -1) {
        Utilities.sleep(600);
        return { success: false, message: "This email is not authorised. Contact the app owner." };
      }
    }

    // Check passcode (when configured)
    if (storedPass) {
      if (!passcode || !passcode.trim()) {
        return { success: false, message: "Please enter the passcode." };
      }
      if (sha256_(passcode.trim()) !== storedPass) {
        Utilities.sleep(600);
        return { success: false, message: "Incorrect passcode." };
      }
    }

    // Both checks passed
    return { success: true, token: generateToken_() };

  } catch (err) {
    console.error("verifyLogin:", err);
    return { success: false, message: err.message };
  }
}

// ══ Security Config API (token required) ═══════════════════════

/**
 * Returns the current security configuration for the Settings tab.
 * @returns {{ allowedEmails[], hasPasscode, requiresEmail, requiresPass }}
 */
function getSecurityConfig(token) {
  try {
    checkAccess_(token);
    var props    = PropertiesService.getScriptProperties();
    var emails   = (props.getProperty(PROP_EMAILS) || "").trim();
    var hasPass  = !!(props.getProperty(PROP_PASSCODE) || "").trim();
    return {
      success:       true,
      allowedEmails: emails ? emails.split(",").map(function(e){return e.trim();}).filter(Boolean) : [],
      hasPasscode:   hasPass,
      requiresEmail: !!emails,
      requiresPass:  hasPass,
      isOpen:        (!emails && !hasPass)
    };
  } catch (err) {
    if (err.message==="ACCESS_DENIED") return {success:false,accessDenied:true};
    return {success:false,message:err.message};
  }
}

/**
 * Saves email whitelist and/or passcode.
 * @param {string}   token
 * @param {string[]} emails         Array of email strings (can be empty)
 * @param {string}   newPasscode    New passcode (empty string = don't change)
 * @param {string}   confirmPasscode
 */
function saveSecurityConfig(token, emails, newPasscode, confirmPasscode) {
  try {
    checkAccess_(token);
    var props = PropertiesService.getScriptProperties();
    var msgs  = [];

    // Save email list
    var cleanEmails = (emails || []).map(function(e){ return e.trim().toLowerCase(); }).filter(Boolean);
    props.setProperty(PROP_EMAILS, cleanEmails.join(","));
    msgs.push(cleanEmails.length > 0
      ? cleanEmails.length + " email(s) authorised."
      : "Email restriction removed.");

    // Update passcode only if a new one was supplied
    if (newPasscode && newPasscode.trim()) {
      if (newPasscode !== confirmPasscode) {
        return { success: false, message: "New passcodes do not match." };
      }
      if (newPasscode.trim().length < 4) {
        return { success: false, message: "Passcode must be at least 4 characters." };
      }
      props.setProperty(PROP_PASSCODE, sha256_(newPasscode.trim()));
      // Rotate signing secret — invalidates all existing sessions
      props.setProperty(PROP_SECRET, Utilities.getUuid() + Utilities.getUuid());
      msgs.push("Passcode updated. All sessions signed out.");
      // Return a fresh token so the current user stays logged in
      return { success: true, token: generateToken_(), message: msgs.join(" ") };
    }

    return { success: true, message: msgs.join(" ") };

  } catch (err) {
    if (err.message==="ACCESS_DENIED") return {success:false,accessDenied:true};
    console.error("saveSecurityConfig:", err);
    return {success:false,message:err.message};
  }
}

/**
 * Removes ALL security (email list + passcode).
 * Requires a valid token.
 */
function clearAllSecurity(token) {
  try {
    checkAccess_(token);
    var props = PropertiesService.getScriptProperties();
    props.deleteProperty(PROP_EMAILS);
    props.deleteProperty(PROP_PASSCODE);
    return { success: true, message: "All security removed. App is now open access." };
  } catch (err) {
    if (err.message==="ACCESS_DENIED") return {success:false,accessDenied:true};
    return {success:false,message:err.message};
  }
}

/**
 * Emergency unlock — run from the Apps Script editor.
 * Clears all security and signing keys.
 */
function resetSecurity() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty(PROP_EMAILS);
  props.deleteProperty(PROP_PASSCODE);
  props.deleteProperty(PROP_SECRET);
  Logger.log("Security fully reset. App is open access.");
}

// ══ Year / Folder API ══════════════════════════════════════════

function getAvailableYears(token) {
  try {
    checkAccess_(token);
    var folder = getOrCreateFolder_();
    var files  = folder.getFiles();
    var years  = [];
    while (files.hasNext()) {
      var file = files.next();
      var n    = file.getName();
      if (n.indexOf(FILE_PREFIX)===0 && n.slice(-FILE_SUFFIX.length)===FILE_SUFFIX) {
        var y = parseInt(n.slice(FILE_PREFIX.length, n.length-FILE_SUFFIX.length).trim(), 10);
        if (!isNaN(y)) years.push({year:y,name:n,id:file.getId(),url:file.getUrl()});
      }
    }
    years.sort(function(a,b){return b.year-a.year;});
    return {success:true,folderName:FOLDER_NAME,folderUrl:folder.getUrl(),years:years};
  } catch(err){
    if(err.message==="ACCESS_DENIED") return {success:false,accessDenied:true};
    console.error("getAvailableYears:",err);
    return {success:false,message:err.message};
  }
}

function createNewYA(token, year) {
  try {
    checkAccess_(token);
    year = parseInt(year,10);
    if (isNaN(year)||year<1990||year>2100) return {success:false,message:"Enter a valid 4-digit year."};
    var folder = getOrCreateFolder_();
    var fn     = FILE_PREFIX+year+FILE_SUFFIX;
    if (folder.getFilesByName(fn).hasNext()) return {success:false,message:"YA "+year+" already exists."};
    var ss   = SpreadsheetApp.create(fn);
    var file = DriveApp.getFileById(ss.getId());
    folder.addFile(file);
    try { DriveApp.getRootFolder().removeFile(file); } catch(_){}
    ensureExpensesSheet_(ss); ensureCategoriesSheet_(ss,year); getOrCreateReceiptsFolder_(year);
    var info = ss.getSheetByName("Info")||ss.insertSheet("Info",0);
    info.getRange(1,1).setValue("LHDN Tax Relief Tracker \u2013 YA "+year);
    info.getRange(2,1).setValue("Managed by the LHDN Tax Relief Tracker web app.");
    info.getRange(1,1).setFontWeight("bold").setFontSize(13);
    info.setTabColor("#c9a84c"); info.setColumnWidth(1,500);
    ss.setActiveSheet(ss.getSheetByName(SHEET_EXPENSES));
    return {success:true,year:year,id:ss.getId(),url:ss.getUrl()};
  } catch(err){
    if(err.message==="ACCESS_DENIED") return {success:false,accessDenied:true};
    console.error("createNewYA:",err); return {success:false,message:err.message};
  }
}

// ══ Category API ════════════════════════════════════════════════

function saveCategory(token, year, catData) {
  try {
    checkAccess_(token);
    var ss = getSpreadsheetForYear_(year);
    if(!ss) return {success:false,message:"YA "+year+" not found."};
    var newName=String(catData.name||"").trim(), newLim=parseFloat(catData.limit), oldName=String(catData.oldName||"").trim();
    if(!newName) return {success:false,message:"Category name is required."};
    if(isNaN(newLim)||newLim<0) return {success:false,message:"Limit must be 0 or more."};
    var sheet=ensureCategoriesSheet_(ss,year), data=sheet.getDataRange().getValues();
    if(oldName){
      for(var i=1;i<data.length;i++){
        if(String(data[i][0]).trim()===oldName){
          if(data[i][2]==="LHDN Built-in"){sheet.getRange(i+1,2).setValue(newLim);}
          else{sheet.getRange(i+1,1).setValue(newName);sheet.getRange(i+1,2).setValue(newLim);}
          return {success:true,message:"Category updated."};
        }
      }
      return {success:false,message:"Category not found."};
    } else {
      for(var j=1;j<data.length;j++){
        if(String(data[j][0]).trim().toLowerCase()===newName.toLowerCase())
          return {success:false,message:"Category already exists."};
      }
      sheet.appendRow([newName,newLim,"Custom"]);
      return {success:true,message:"Custom category added."};
    }
  } catch(err){
    if(err.message==="ACCESS_DENIED") return {success:false,accessDenied:true};
    console.error("saveCategory:",err); return {success:false,message:err.message};
  }
}

function deleteCategory(token, year, catName) {
  try {
    checkAccess_(token);
    var ss=getSpreadsheetForYear_(year);
    if(!ss) return {success:false,message:"YA "+year+" not found."};
    var sheet=ensureCategoriesSheet_(ss,year), data=sheet.getDataRange().getValues();
    for(var i=1;i<data.length;i++){
      if(String(data[i][0]).trim()===catName){
        if(data[i][2]==="LHDN Built-in") return {success:false,message:"LHDN built-in categories cannot be deleted."};
        sheet.deleteRow(i+1);
        return {success:true,message:"Category deleted."};
      }
    }
    return {success:false,message:"Category not found."};
  } catch(err){
    if(err.message==="ACCESS_DENIED") return {success:false,accessDenied:true};
    console.error("deleteCategory:",err); return {success:false,message:err.message};
  }
}

function restoreDefaultLimit(token, year, catName) {
  try {
    checkAccess_(token);
    var defs=getDefaultLimits_(year);
    if(!defs.hasOwnProperty(catName)) return {success:false,message:"No default found for \""+catName+"\"."};
    return saveCategory(token,year,{name:catName,limit:defs[catName],oldName:catName});
  } catch(err){
    if(err.message==="ACCESS_DENIED") return {success:false,accessDenied:true};
    return {success:false,message:err.message};
  }
}

// ══ Expense API ═════════════════════════════════════════════════

function saveExpenseRow(token, data) {
  try {
    checkAccess_(token);
    var year=data.year, date=data.date, desc=String(data.description||"").trim();
    var cat=data.category, amount=parseFloat(data.amount);
    if(!year||!date||!desc||!cat||!data.amount) return {success:false,message:"All fields are required."};
    if(isNaN(amount)||amount<=0) return {success:false,message:"Amount must be a positive number."};
    var ss=getSpreadsheetForYear_(year);
    if(!ss) return {success:false,message:"YA "+year+" not found. Please create it first."};
    var cats=readCategories_(ss,year), catMap={};
    cats.forEach(function(c){catMap[c.name]=c.limit;});
    if(!catMap.hasOwnProperty(cat)) return {success:false,message:"Invalid category: \""+cat+"\""};
    var sheet=ensureExpensesSheet_(ss);
    var nextRow=sheet.getLastRow()+1;
    sheet.getRange(nextRow,1,1,5).setValues([[date,desc,cat,amount,"\u2014"]]);
    sheet.getRange(nextRow,4).setNumberFormat('"RM "#,##0.00');
    SpreadsheetApp.flush();
    console.log("saveExpenseRow: row "+nextRow+" YA "+year);
    return {success:true,sheetRow:nextRow,ssId:ss.getId(),message:"Expense saved."};
  } catch(err){
    if(err.message==="ACCESS_DENIED") return {success:false,accessDenied:true};
    console.error("saveExpenseRow:",err); return {success:false,message:err.message};
  }
}

function uploadReceiptForRow(token, year, sheetRow, ssId, base64, mimeType, fileName) {
  try {
    checkAccess_(token);
    console.log("uploadReceipt START | year="+year+" row="+sheetRow+" mime="+mimeType+" file="+fileName+" b64len="+(base64?base64.length:0));
    if(!year||!sheetRow||!base64||!mimeType||!fileName) return {success:false,message:"Missing upload parameters."};
    if(ALLOWED_MIMES.indexOf(mimeType)===-1) return {success:false,message:"Unsupported file type. Use JPG, PNG, WEBP, GIF, or PDF."};
    var bytes; try{bytes=Utilities.base64Decode(base64);}catch(e){return {success:false,message:"Could not decode file: "+e.message};}
    var blob=Utilities.newBlob(bytes,mimeType,fileName);
    if(blob.getBytes().length>MAX_FILE_BYTES) return {success:false,message:"File too large. Maximum 5 MB."};
    var today=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyyMMdd");
    var safeName=makeReceiptFilename_(today,"receipt",fileName);
    blob.setName(safeName);
    var folder=getOrCreateReceiptsFolder_(year);
    var uploaded=folder.createFile(blob);
    var url=uploaded.getUrl();
    console.log("uploadReceipt: created "+safeName);
    try{uploaded.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}
    catch(e){console.warn("setSharing skipped: "+e.message);}
    var sheetUpdated=false;
    try{
      var ss; try{ss=ssId?SpreadsheetApp.openById(ssId):null;}catch(e){ss=null;}
      if(!ss) ss=getSpreadsheetForYear_(year);
      if(ss){
        var sheet=ss.getSheetByName(SHEET_EXPENSES), row=parseInt(sheetRow,10);
        if(sheet&&!isNaN(row)&&row>=2){
          sheet.getRange(row,5).setFormula('=HYPERLINK("'+url+'","'+safeName.replace(/"/g,"'")+'")');;
          SpreadsheetApp.flush(); sheetUpdated=true;
          console.log("uploadReceipt: HYPERLINK written row="+row);
        }
      }
    } catch(e){ console.error("HYPERLINK write failed: "+e.message); }
    return {success:true,receiptUrl:url,receiptName:safeName,sheetUpdated:sheetUpdated,
            message:sheetUpdated?"Receipt uploaded and linked.":"Receipt in Drive. Refresh to see link."};
  } catch(err){
    if(err.message==="ACCESS_DENIED") return {success:false,accessDenied:true};
    console.error("uploadReceiptForRow FATAL:",err.message); return {success:false,message:err.message};
  }
}

function getReliefSummary(token, year) {
  try {
    checkAccess_(token);
    year=parseInt(year,10);
    var ss=getSpreadsheetForYear_(year);
    if(!ss) return {success:false,message:"YA "+year+" not found.",year:year};
    var cats=readCategories_(ss,year), catMap={};
    cats.forEach(function(c){catMap[c.name]=c.limit;});
    var ks=Object.keys(RELIEF_LIMITS_DB).map(Number).sort(function(a,b){return b-a;});
    var knownYear=!!RELIEF_LIMITS_DB[year], fallbackYear=year;
    if(!knownYear){for(var i=0;i<ks.length;i++){if(ks[i]<=year){fallbackYear=ks[i];break;}}if(fallbackYear===year)fallbackYear=ks[ks.length-1];}
    var sheet=ensureExpensesSheet_(ss), values=sheet.getDataRange().getValues();
    var lastRow=sheet.getLastRow();
    var formulas=lastRow>1?sheet.getRange(2,5,lastRow-1,1).getFormulas():[];
    var totals={};
    cats.forEach(function(c){totals[c.name]=0;});
    var rows=[];
    for(var r=1;r<values.length;r++){
      var cat=values[r][2]; if(!cat||!catMap.hasOwnProperty(cat)) continue;
      var amount=parseFloat(values[r][3])||0; totals[cat]+=amount;
      var dateStr="";
      try{dateStr=values[r][0]?Utilities.formatDate(new Date(values[r][0]),Session.getScriptTimeZone(),"dd/MM/yyyy"):"";}catch(_){dateStr=String(values[r][0]);}
      var rUrl="",rName="";
      var formula=(formulas[r-1]&&formulas[r-1][0])?formulas[r-1][0]:"";
      if(formula&&formula.toUpperCase().indexOf("HYPERLINK")!==-1){
        var mu=formula.match(/HYPERLINK\("([^"]+)"/i), mn=formula.match(/HYPERLINK\("[^"]+","([^"]+)"/i);
        if(mu)rUrl=mu[1]; if(mn)rName=mn[1];
      }
      rows.push({sheetRow:r+1,date:dateStr,description:values[r][1],category:cat,amount:amount,receiptUrl:rUrl,receiptName:rName});
    }
    var limits={};
    cats.forEach(function(c){limits[c.name]=c.limit;});
    return {success:true,year:year,categories:cats,limits:limits,totals:totals,rows:rows.reverse(),knownYear:knownYear,fallbackYear:fallbackYear};
  } catch(err){
    if(err.message==="ACCESS_DENIED") return {success:false,accessDenied:true};
    console.error("getReliefSummary:",err); return {success:false,message:err.message};
  }
}

function deleteExpense(token, rowIndex, year) {
  try {
    checkAccess_(token);
    var idx=parseInt(rowIndex,10);
    if(isNaN(idx)||idx<2) return {success:false,message:"Invalid row index."};
    var ss=getSpreadsheetForYear_(year);
    if(!ss) return {success:false,message:"YA "+year+" not found."};
    var sheet=ss.getSheetByName(SHEET_EXPENSES);
    if(!sheet||idx>sheet.getLastRow()) return {success:false,message:"Row does not exist."};
    var receiptDeleted=false;
    try{
      var formula=sheet.getRange(idx,5).getFormula();
      if(formula&&formula.toUpperCase().indexOf("HYPERLINK")!==-1){
        var um=formula.match(/HYPERLINK\("([^"]+)"/i);
        if(um){var fid=extractFileId_(um[1]);if(fid){DriveApp.getFileById(fid).setTrashed(true);receiptDeleted=true;}}
      }
    } catch(e){console.warn("Could not trash receipt:",e.message);}
    sheet.deleteRow(idx);
    return {success:true,receiptDeleted:receiptDeleted,message:receiptDeleted?"Record and receipt deleted.":"Record deleted."};
  } catch(err){
    if(err.message==="ACCESS_DENIED") return {success:false,accessDenied:true};
    console.error("deleteExpense:",err); return {success:false,message:err.message};
  }
}