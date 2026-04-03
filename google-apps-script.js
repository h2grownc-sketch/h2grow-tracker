// ============================================
// H2 GROW JOB TRACKER — Google Apps Script
// ============================================
// Paste this ENTIRE file into your Google Apps Script editor.
// Then deploy as a Web App (see setup instructions).
// ============================================

const SHEET_NAME = 'Jobs';

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getJobs') return getJobs();
  return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.action === 'saveJob') return saveJob(data.job);
  if (data.action === 'deleteJob') return deleteJob(data.jobId);
  return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' })).setMimeType(ContentService.MimeType.JSON);
}

function getJobs() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return ContentService.createTextOutput(JSON.stringify({ jobs: [] })).setMimeType(ContentService.MimeType.JSON);
  const headers = data[0];
  const jobs = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    const job = {};
    headers.forEach((h, idx) => { job[h] = row[idx]; });
    if (job.checks && typeof job.checks === 'string') {
      try { job.checks = JSON.parse(job.checks); } catch(e) { job.checks = {}; }
    }
    jobs.push(job);
  }
  return ContentService.createTextOutput(JSON.stringify({ jobs })).setMimeType(ContentService.MimeType.JSON);
}

function saveJob(job) {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rowData = headers.map(h => {
    if (h === 'checks') return JSON.stringify(job.checks || {});
    return job[h] || '';
  });
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === job.id) { sheet.getRange(i + 1, 1, 1, headers.length).setValues([rowData]); found = true; break; }
  }
  if (!found) sheet.appendRow(rowData);
  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

function deleteJob(jobId) {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === jobId) { sheet.deleteRow(i + 1); break; }
  }
  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = ['id','customerName','phone','email','address','serviceType','sqft','notes','source','dateCreated','quoteSentDate','scheduledDate','sprayDate','sampleMailedDate','quoteAmount','soilTestNumber','checks','county','assignedTo','estimateStatus'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}
