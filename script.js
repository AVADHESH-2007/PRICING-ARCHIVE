const pricingHeaders = [
  "MATERIAL DESCRIPTION",
  "MATERIAL CODE",
  "MRP",
  "BASIC PRICE",
  "DEALER MARGIN",
  "CREDIT (NO. OF DAYS)",
  "CASH REBATE IN LIEU OF CREDIT ON PRO RATA BASIS (MAX)",
  "SPECIAL REBATE",
  "INCENTIVE FOR RAILHEAD DELIVERY",
  "HANDLING AND TRANSPORTATION WHERE H& T CONTRACT ARE NOT AVALIABLE",
  "HANDLING AND TRANSPORTATION WHERE H& T CONTRACT ARE AVALIABLE",
  "VALUE FOR STOCK TRANSFER FOR GST",
];

const masterDataButton = document.getElementById("masterDataBtn");
const pricingDataButton = document.getElementById("pricingDataBtn");
const savedPricingRecordsButton = document.getElementById("savedPricingRecordsBtn");
const reportsButton = document.getElementById("reportsBtn");
const misButton = document.getElementById("misBtn");
const printCircularButton = document.getElementById("printCircularBtn");
const checkCircularButton = document.getElementById("checkCircularBtn");
const approveCircularButton = document.getElementById("approveCircularBtn");
const circularArchiveButton = document.getElementById("circularArchiveBtn");
const masterDataPanel = document.getElementById("masterDataPanel");

function getStoredValue(key, fallback) {
  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch (error) {
    console.error(`Unable to read ${key} from local storage.`, error);
    return fallback;
  }
}

function setStoredValue(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Unable to save ${key} to local storage.`, error);
    return false;
  }
}

let masterDataEntries = getStoredValue("masterDataEntries", []);
let pricingHeadingEntries = getStoredValue("pricingHeadingEntries", []);
let currentPricingHeadingCategory = "PRICING ENTRY HEADING-FERTILIZER";
let stateNameEntries = getStoredValue("stateNameEntries", []);
let financialYearEntries = getStoredValue("financialYearEntries", []);
let unitRateEntries = getStoredValue("unitRateEntries", []);
let categoryEntries = getStoredValue("categoryEntries", []);
let pricingDataRows = [];
let savedPricingRecords = getStoredValue("savedPricingRecords", []);
let completedPricingRecords = getStoredValue("completedPricingRecords", []);
let aprCounter = getStoredValue("aprCounter", 0);
let deletionAuditLog = getStoredValue("deletionAuditLog", []);
let isAdminAuthenticated = false;
let pricingDataValidationMessage = "";
let editingEntryId = null;
let editingPricingHeadingId = null;
let editingStateNameId = null;
let editingFinancialYearId = null;
let editingUnitRateId = null;
let editingCategoryId = null;
let currentMasterDataView = "material";
let currentAppView = "master";
let approvalActiveTab = "approved";
let editingReportRecordId = null;
let reportsValidationMessage = "";
let selectedSavedRowIds = new Set();
let editingSavedRowIds = new Set();
let savedEditBackup = {};
let savedRecordFilters = {};
let reportRecordFilters = {};
let activeReportFilterCol = null;
let misFilters = {};
let misDrillDown = [];
let misTableSearch = "";
let misTableSort = { key: "financialYear", asc: true };
let misTablePage = 1;
let misComparisonKey = "division";
let misExpandedNodes = new Set();
let misDrillSort = { key: "", asc: true };
let misDrillExpandedRows = new Set();
let misApplied = false;
let printCircularSelectedApr = "";
let printCircularSelectedFinancialYear = "";
let printCircularSelectedDivision = "";
let printCircularSelectedState = "";
let printCircularSelectedMaterial = "";
let printCircularCcText = "";
let printCircularSignatoryText = "Dy. General Manager (Fin.)\nAuthorized Signatory";
let printCircularTermsHtml = "";
let printCircularIntroText = "The following pricing and sales terms have been approved for details mentioned above.";
let printCircularDateOfCircular = "";
let printCircularEffectiveFrom = "";
let draftCircularEditMode = false;
let circularCheckStatus = {};
let circularAuditTrail = {};
let checkerActiveTab = "checker1";
let currentCheckerLevel = "checker1";
let selectedCircularForCheck = null;
let navigationHistory = [];
let reportDrillDownExpanded = new Set();
let reportDrillDownZoom = 100;
let approvedArchiveExpanded = new Set();
let circularArchiveExpanded = new Set();
let firstRowAutoCopied = false;
let databaseSyncQueue = Promise.resolve();
let databaseAvailable = false;

function getApplicationState() {
  return { masterDataEntries, pricingHeadingEntries, stateNameEntries, financialYearEntries, unitRateEntries, categoryEntries, pricingDataRows, savedPricingRecords, completedPricingRecords, aprCounter, deletionAuditLog };
}

function setPricingMasterCategoryFromSelection(selectedValue) {
  if (selectedValue === "pricing-fertilizer") {
    currentMasterDataView = "pricing";
    currentPricingHeadingCategory = "PRICING ENTRY HEADING-FERTILIZER";
    return;
  }
  if (selectedValue === "pricing-ipd") {
    currentMasterDataView = "pricing";
    currentPricingHeadingCategory = "PRICING ENTRY HEADING-IPD";
    return;
  }
  if (selectedValue === "pricing-tie-up") {
    currentMasterDataView = "pricing";
    currentPricingHeadingCategory = "PRICING ENTRY HEADING-TIE-UP";
    return;
  }
  currentMasterDataView = selectedValue;
}

function applyApplicationState(state) {
  masterDataEntries = Array.isArray(state.masterDataEntries) ? state.masterDataEntries : [];
  pricingHeadingEntries = Array.isArray(state.pricingHeadingEntries) ? state.pricingHeadingEntries : [];
  stateNameEntries = Array.isArray(state.stateNameEntries) ? state.stateNameEntries : [];
  financialYearEntries = Array.isArray(state.financialYearEntries) ? state.financialYearEntries : [];
  unitRateEntries = Array.isArray(state.unitRateEntries) ? state.unitRateEntries : [];
  categoryEntries = Array.isArray(state.categoryEntries) ? state.categoryEntries : [];
  pricingDataRows = normalizePricingDataRows(state.pricingDataRows || []);
  savedPricingRecords = Array.isArray(state.savedPricingRecords) ? state.savedPricingRecords : [];
  completedPricingRecords = Array.isArray(state.completedPricingRecords) ? state.completedPricingRecords : [];
  aprCounter = Number(state.aprCounter) || 0;
  deletionAuditLog = Array.isArray(state.deletionAuditLog) ? state.deletionAuditLog : [];
}

function queueDatabaseSave() {
  if (!databaseAvailable) return;
  const snapshot = JSON.stringify(getApplicationState());
  databaseSyncQueue = databaseSyncQueue.then(async () => {
    const response = await fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: snapshot });
    if (!response.ok) throw new Error(`Database save failed (${response.status}).`);
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || "Database save failed.");
  }).catch((error) => {
    console.error("SQLite database synchronization failed.", error);
    pricingDataValidationMessage = "Database synchronization failed. Your browser copy is still available; please check that the local database server is running.";
  });
}

async function initialiseDatabaseStorage() {
  if (location.protocol === "file:") {
    console.warn("SQLite storage requires the local server. Start it with: python backend/app.py");
    return;
  }
  try {
    const response = await fetch("/api/state");
    if (!response.ok) throw new Error(`Database unavailable (${response.status}).`);
    const result = await response.json();
    databaseAvailable = true;
    if (result.hasData) applyApplicationState(result.state);
    else queueDatabaseSave(); // One-time migration of the existing browser state.
    persistPricingDataState();
  } catch (error) {
    console.error("Unable to initialise local SQLite storage.", error);
    pricingDataValidationMessage = "Local database unavailable. Start the application with python backend/app.py to use SQLite storage.";
  }
}

const MIS_FILTERS = [
  { key: "financialYear", label: "Financial Year" }, { key: "division", label: "Division" },
  { key: "state", label: "State" }, { key: "material", label: "Material Description" },
  { key: "aprNumber", label: "APR No." }, { key: "batchNo", label: "Batch no." }, { key: "period", label: "Period" },
  { key: "category", label: "CATEGORY" }, { key: "pricingHeading", label: "Pricing Heading" },
  { key: "approvingAuthority", label: "Approving Authority" }, { key: "dateOfApproval", label: "Date of Approval" },
  { key: "refNoteOfApproval", label: "Ref. Note of Approval" }, { key: "remarks", label: "Remarks" }, { key: "completedAt", label: "Completed On" },
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMultilineText(value) {
  return `<span class="multiline-cell">${escapeHtml(value || "")}</span>`;
}

const MASTER_DATA_ACCESS_DENIED = "Access Denied. Only users with Administrator privileges are authorized to create, modify, or delete Master Data.";

function isMasterDataAdministrator() {
  return isAdminAuthenticated;
}

function requireMasterDataAdministrator() {
  if (isMasterDataAdministrator()) return true;
  window.alert(MASTER_DATA_ACCESS_DENIED);
  return false;
}

function logMasterDataAudit(action, masterDataType, recordIdentifier) {
  deletionAuditLog.push({
    userId: "ADMIN",
    userName: "Administrator",
    action,
    masterDataType,
    recordIdentifier,
    dateTime: new Date().toISOString(),
    ipAddress: "Unavailable (client-only application)",
  });
  persistPricingDataState();
}

function buildMasterDataAccessControls() {
  return isMasterDataAdministrator()
    ? '<div class="table-actions master-data-access"><span>Administrator mode enabled</span><button type="button" class="secondary-btn" id="masterDataAdminLogoutBtn">Logout Admin</button></div>'
    : '<div class="table-actions master-data-access"><span>Read-only access</span><button type="button" class="secondary-btn" id="masterDataAdminLoginBtn">Administrator Login</button></div>';
}

function renderMasterDataTable() {
  const entryToEdit = masterDataEntries.find((entry) => entry.id === editingEntryId) || null;
  const canManage = isMasterDataAdministrator();

  masterDataPanel.innerHTML = `
    <div class="master-data-card">
      <div class="master-data-mode-selector">
        <label for="masterDataModeSelect">Entry Type</label>
        <select id="masterDataModeSelect">
          <option value="material" ${currentMasterDataView === "material" ? "selected" : ""}>MATERIAL MASTER DATA ENTRY</option>
          <option value="pricing-fertilizer" ${currentMasterDataView === "pricing" && currentPricingHeadingCategory === "PRICING ENTRY HEADING-FERTILIZER" ? "selected" : ""}>PRICING ENTRY HEADING-FERTILIZER</option>
          <option value="pricing-ipd" ${currentMasterDataView === "pricing" && currentPricingHeadingCategory === "PRICING ENTRY HEADING-IPD" ? "selected" : ""}>PRICING ENTRY HEADING-IPD</option>
          <option value="pricing-tie-up" ${currentMasterDataView === "pricing" && currentPricingHeadingCategory === "PRICING ENTRY HEADING-TIE-UP" ? "selected" : ""}>PRICING ENTRY HEADING-TIE-UP</option>
          <option value="state" ${currentMasterDataView === "state" ? "selected" : ""}>STATE NAME ENTRY</option>
          <option value="financial-year" ${currentMasterDataView === "financial-year" ? "selected" : ""}>FINANCIAL YEAR ENTRY</option>
          <option value="unit-rate" ${currentMasterDataView === "unit-rate" ? "selected" : ""}>UNIT RATE ENTRY</option>
          <option value="category" ${currentMasterDataView === "category" ? "selected" : ""}>CATEGORY ENTRY</option>
        </select>
      </div>

      <div class="panel-heading">
        <h2>MATERIAL MASTER DATA ENTRY</h2>
        <p>${canManage ? "Add material details with the appropriate business division." : "Material records are available for viewing. Administrator access is required to make changes."}</p>
      </div>
      ${buildMasterDataAccessControls()}
      <div class="table-wrapper">
        ${canManage ? `<div class="master-data-form">
          <div class="master-data-form-grid">
            <input id="materialDescriptionInput" type="text" value="${escapeHtml(entryToEdit?.description || "")}" placeholder="Enter material description" />
            <input id="materialCodeInput" type="text" value="${escapeHtml(entryToEdit?.code || "")}" placeholder="Enter material code" />
            <select id="businessDivisionInput">
              <option value="">Select division</option>
              <option ${entryToEdit?.division === "FERTILIZER" ? "selected" : ""}>FERTILIZER</option>
              <option ${entryToEdit?.division === "IPD" ? "selected" : ""}>IPD</option>
              <option ${entryToEdit?.division === "TIE-UP PRODUCTS" ? "selected" : ""}>TIE-UP PRODUCTS</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="add-row-btn" id="saveMasterEntryBtn">${entryToEdit ? "Save" : "Add"}</button>
            ${entryToEdit ? '<button type="button" class="secondary-btn" id="cancelEditBtn">Cancel</button>' : ""}
          </div>
        </div>` : ""}

        <div class="saved-entries-section">
          <h3>Saved Entries</h3>
          <table class="master-data-table">
            <thead>
              <tr>
                <th>Sl. No.</th>
                <th>Material Description</th>
                <th>Material Code</th>
                <th>Business Division</th>
                ${canManage ? "<th>Actions</th>" : ""}
              </tr>
            </thead>
            <tbody>
              ${masterDataEntries.length
                ? masterDataEntries
                    .map(
                      (entry, index) => `
                        <tr>
                          <td>${index + 1}</td>
                          <td>${escapeHtml(entry.description)}</td>
                          <td>${escapeHtml(entry.code)}</td>
                          <td>${escapeHtml(entry.division)}</td>
                          ${canManage ? `<td class="entry-actions">
                            <button type="button" class="edit-btn" data-action="edit" data-id="${entry.id}">Edit</button>
                            <button type="button" class="delete-btn" data-action="delete" data-id="${entry.id}">Delete</button>
                          </td>` : ""}
                        </tr>
                      `
                    )
                    .join("")
                : `<tr><td colspan="${canManage ? 5 : 4}" class="empty-state">No entries added yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderStateNameEntry() {
  const entryToEdit = stateNameEntries.find((entry) => entry.id === editingStateNameId) || null;
  const canManage = isMasterDataAdministrator();

  masterDataPanel.innerHTML = `
    <div class="master-data-card">
      <div class="master-data-mode-selector">
        <label for="masterDataModeSelect">Entry Type</label>
        <select id="masterDataModeSelect">
          <option value="material">MATERIAL MASTER DATA ENTRY</option>
          <option value="pricing-fertilizer">PRICING ENTRY HEADING-FERTILIZER</option>
          <option value="pricing-ipd">PRICING ENTRY HEADING-IPD</option>
          <option value="pricing-tie-up">PRICING ENTRY HEADING-TIE-UP</option>
          <option value="state" selected>STATE NAME ENTRY</option>
          <option value="financial-year">FINANCIAL YEAR ENTRY</option>
          <option value="unit-rate">UNIT RATE ENTRY</option>
          <option value="category">CATEGORY ENTRY</option>
        </select>
      </div>

      <div class="panel-heading">
        <h2>STATE NAME ENTRY</h2>
      </div>
      ${buildMasterDataAccessControls()}

      ${canManage ? `<div class="pricing-heading-form">
        <input id="stateNameInput" type="text" value="${escapeHtml(entryToEdit?.name || "")}" placeholder="Enter state name" />
        <button type="button" class="add-row-btn" id="addStateNameBtn">${entryToEdit ? "Save" : "Add"}</button>
        ${entryToEdit ? '<button type="button" class="secondary-btn" id="cancelStateNameEditBtn">Cancel</button>' : ""}
      </div>` : ""}

      <div class="saved-entries-section">
        <h3>Saved States</h3>
        <table class="master-data-table">
          <thead>
            <tr>
              <th>Sl. No.</th>
              <th>Name</th>
              ${canManage ? "<th>Actions</th>" : ""}
            </tr>
          </thead>
          <tbody>
            ${stateNameEntries.length
              ? stateNameEntries
                  .map(
                    (entry, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(entry.name)}</td>
                        ${canManage ? `<td class="entry-actions">
                          <button type="button" class="edit-btn" data-action="edit-state-name" data-id="${entry.id}">Edit</button>
                          <button type="button" class="delete-btn" data-action="delete-state-name" data-id="${entry.id}">Delete</button>
                        </td>` : ""}
                      </tr>
                    `
                  )
                  .join("")
              : `<tr><td colspan="${canManage ? 3 : 2}" class="empty-state">No state names added yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderFinancialYearEntry() {
  const entryToEdit = financialYearEntries.find((entry) => entry.id === editingFinancialYearId) || null;
  const canManage = isMasterDataAdministrator();

  masterDataPanel.innerHTML = `
    <div class="master-data-card">
      <div class="master-data-mode-selector">
        <label for="masterDataModeSelect">Entry Type</label>
        <select id="masterDataModeSelect">
          <option value="material">MATERIAL MASTER DATA ENTRY</option>
          <option value="pricing-fertilizer">PRICING ENTRY HEADING-FERTILIZER</option>
          <option value="pricing-ipd">PRICING ENTRY HEADING-IPD</option>
          <option value="pricing-tie-up">PRICING ENTRY HEADING-TIE-UP</option>
          <option value="state">STATE NAME ENTRY</option>
          <option value="financial-year" selected>FINANCIAL YEAR ENTRY</option>
          <option value="unit-rate">UNIT RATE ENTRY</option>
          <option value="category">CATEGORY ENTRY</option>
        </select>
      </div>

      <div class="panel-heading">
        <h2>FINANCIAL YEAR ENTRY</h2>
      </div>
      ${buildMasterDataAccessControls()}

      ${canManage ? `<div class="pricing-heading-form">
        <input id="financialYearInput" type="text" value="${escapeHtml(entryToEdit?.year || "")}" placeholder="Enter financial year" />
        <button type="button" class="add-row-btn" id="addFinancialYearBtn">${entryToEdit ? "Save" : "Add"}</button>
        ${entryToEdit ? '<button type="button" class="secondary-btn" id="cancelFinancialYearEditBtn">Cancel</button>' : ""}
      </div>` : ""}

      <div class="saved-entries-section">
        <h3>Saved Financial Years</h3>
        <table class="master-data-table">
          <thead>
            <tr>
              <th>Sl. No.</th>
              <th>Year</th>
              ${canManage ? "<th>Actions</th>" : ""}
            </tr>
          </thead>
          <tbody>
            ${financialYearEntries.length
              ? financialYearEntries
                  .map(
                    (entry, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(entry.year)}</td>
                        ${canManage ? `<td class="entry-actions">
                          <button type="button" class="edit-btn" data-action="edit-financial-year" data-id="${entry.id}">Edit</button>
                          <button type="button" class="delete-btn" data-action="delete-financial-year" data-id="${entry.id}">Delete</button>
                        </td>` : ""}
                      </tr>
                    `
                  )
                  .join("")
              : `<tr><td colspan="${canManage ? 3 : 2}" class="empty-state">No financial years added yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderUnitRateEntry() {
  const entryToEdit = unitRateEntries.find((entry) => entry.id === editingUnitRateId) || null;
  const canManage = isMasterDataAdministrator();

  masterDataPanel.innerHTML = `
    <div class="master-data-card">
      <div class="master-data-mode-selector">
        <label for="masterDataModeSelect">Entry Type</label>
        <select id="masterDataModeSelect">
          <option value="material">MATERIAL MASTER DATA ENTRY</option>
          <option value="pricing-fertilizer">PRICING ENTRY HEADING-FERTILIZER</option>
          <option value="pricing-ipd">PRICING ENTRY HEADING-IPD</option>
          <option value="pricing-tie-up">PRICING ENTRY HEADING-TIE-UP</option>
          <option value="state">STATE NAME ENTRY</option>
          <option value="financial-year">FINANCIAL YEAR ENTRY</option>
          <option value="unit-rate" selected>UNIT RATE ENTRY</option>
          <option value="category">CATEGORY ENTRY</option>
        </select>
      </div>

      <div class="panel-heading">
        <h2>UNIT RATE ENTRY</h2>
      </div>
      ${buildMasterDataAccessControls()}

      ${canManage ? `<div class="pricing-heading-form">
        <input id="unitRateInput" type="text" value="${escapeHtml(entryToEdit?.name || "")}" placeholder="Enter unit rate" />
        <button type="button" class="add-row-btn" id="addUnitRateBtn">${entryToEdit ? "Save" : "Add"}</button>
        ${entryToEdit ? '<button type="button" class="secondary-btn" id="cancelUnitRateEditBtn">Cancel</button>' : ""}
      </div>` : ""}

      <div class="saved-entries-section">
        <h3>Saved Unit Rates</h3>
        <table class="master-data-table">
          <thead>
            <tr>
              <th>Sl. No.</th>
              <th>Unit Rate</th>
              ${canManage ? "<th>Actions</th>" : ""}
            </tr>
          </thead>
          <tbody>
            ${unitRateEntries.length
              ? unitRateEntries
                  .map(
                    (entry, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(entry.name)}</td>
                        ${canManage ? `<td class="entry-actions">
                          <button type="button" class="edit-btn" data-action="edit-unit-rate" data-id="${entry.id}">Edit</button>
                          <button type="button" class="delete-btn" data-action="delete-unit-rate" data-id="${entry.id}">Delete</button>
                        </td>` : ""}
                      </tr>
                    `
                  )
                  .join("")
              : `<tr><td colspan="${canManage ? 3 : 2}" class="empty-state">No unit rates added yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderCategoryEntry() {
  const entryToEdit = categoryEntries.find((entry) => entry.id === editingCategoryId) || null;
  const canManage = isMasterDataAdministrator();

  masterDataPanel.innerHTML = `
    <div class="master-data-card">
      <div class="master-data-mode-selector">
        <label for="masterDataModeSelect">Entry Type</label>
        <select id="masterDataModeSelect">
          <option value="material">MATERIAL MASTER DATA ENTRY</option>
          <option value="pricing-fertilizer">PRICING ENTRY HEADING-FERTILIZER</option>
          <option value="pricing-ipd">PRICING ENTRY HEADING-IPD</option>
          <option value="pricing-tie-up">PRICING ENTRY HEADING-TIE-UP</option>
          <option value="state">STATE NAME ENTRY</option>
          <option value="financial-year">FINANCIAL YEAR ENTRY</option>
          <option value="unit-rate">UNIT RATE ENTRY</option>
          <option value="category" ${currentMasterDataView === "category" ? "selected" : ""}>CATEGORY ENTRY</option>
        </select>
      </div>

      <div class="panel-heading">
        <h2>CATEGORY ENTRY</h2>
      </div>
      ${buildMasterDataAccessControls()}

      ${canManage ? `<div class="pricing-heading-form">
        <input id="categoryInput" type="text" value="${escapeHtml(entryToEdit?.name || "")}" placeholder="Enter category name" />
        <button type="button" class="add-row-btn" id="addCategoryBtn">${entryToEdit ? "Save" : "Add"}</button>
        ${entryToEdit ? '<button type="button" class="secondary-btn" id="cancelCategoryEditBtn">Cancel</button>' : ""}
      </div>` : ""}

      <div class="saved-entries-section">
        <h3>Saved Categories</h3>
        <table class="master-data-table">
          <thead>
            <tr>
              <th>Sl. No.</th>
              <th>Category Name</th>
              ${canManage ? "<th>Actions</th>" : ""}
            </tr>
          </thead>
          <tbody>
            ${categoryEntries.length
              ? categoryEntries
                  .map(
                    (entry, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(entry.name)}</td>
                        ${canManage ? `<td class="entry-actions">
                          <button type="button" class="edit-btn" data-action="edit-category" data-id="${entry.id}">Edit</button>
                          <button type="button" class="delete-btn" data-action="delete-category" data-id="${entry.id}">Delete</button>
                        </td>` : ""}
                      </tr>
                    `
                  )
                  .join("")
              : `<tr><td colspan="${canManage ? 3 : 2}" class="empty-state">No categories added yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPricingHeadingEntry() {
  const entryToEdit = pricingHeadingEntries.find((entry) => entry.id === editingPricingHeadingId) || null;
  const canManage = isMasterDataAdministrator();
  const activeCategory = normalizePricingHeadingCategory(currentPricingHeadingCategory);
  const entriesForCategory = pricingHeadingEntries.filter((entry) => normalizePricingHeadingCategory(entry?.category || entry?.entryType || entry?.division || "PRICING ENTRY HEADING-FERTILIZER") === activeCategory);

  masterDataPanel.innerHTML = `
    <div class="master-data-card">
      <div class="master-data-mode-selector">
        <label for="masterDataModeSelect">Entry Type</label>
        <select id="masterDataModeSelect">
          <option value="material">MATERIAL MASTER DATA ENTRY</option>
          <option value="pricing-fertilizer" ${activeCategory === "PRICING ENTRY HEADING-FERTILIZER" ? "selected" : ""}>PRICING ENTRY HEADING-FERTILIZER</option>
          <option value="pricing-ipd" ${activeCategory === "PRICING ENTRY HEADING-IPD" ? "selected" : ""}>PRICING ENTRY HEADING-IPD</option>
          <option value="pricing-tie-up" ${activeCategory === "PRICING ENTRY HEADING-TIE-UP" ? "selected" : ""}>PRICING ENTRY HEADING-TIE-UP</option>
          <option value="state">STATE NAME ENTRY</option>
          <option value="financial-year">FINANCIAL YEAR ENTRY</option>
          <option value="unit-rate">UNIT RATE ENTRY</option>
        </select>
      </div>

      <div class="panel-heading">
        <h2>${activeCategory}</h2>
      </div>
      ${buildMasterDataAccessControls()}

      ${canManage ? `<div class="pricing-heading-form">
        <select id="pricingHeadingCategorySelect">
          <option value="PRICING ENTRY HEADING-FERTILIZER" ${activeCategory === "PRICING ENTRY HEADING-FERTILIZER" ? "selected" : ""}>PRICING ENTRY HEADING-FERTILIZER</option>
          <option value="PRICING ENTRY HEADING-IPD" ${activeCategory === "PRICING ENTRY HEADING-IPD" ? "selected" : ""}>PRICING ENTRY HEADING-IPD</option>
          <option value="PRICING ENTRY HEADING-TIE-UP" ${activeCategory === "PRICING ENTRY HEADING-TIE-UP" ? "selected" : ""}>PRICING ENTRY HEADING-TIE-UP</option>
        </select>
        <input id="pricingHeadingInput" type="text" value="${escapeHtml(entryToEdit?.description || "")}" placeholder="Enter pricing heading description" />
        <button type="button" class="add-row-btn" id="addPricingHeadingBtn">${entryToEdit ? "Save" : "Add"}</button>
        ${entryToEdit ? '<button type="button" class="secondary-btn" id="cancelPricingHeadingEditBtn">Cancel</button>' : ""}
      </div>` : ""}

      <div class="saved-entries-section">
        <h3>Saved Pricing Headings</h3>
        <table class="master-data-table">
          <thead>
            <tr>
              <th>Sl. No.</th>
              <th>Entry Type</th>
              <th>Description</th>
              ${canManage ? "<th>Actions</th>" : ""}
            </tr>
          </thead>
          <tbody>
            ${entriesForCategory.length
              ? entriesForCategory
                  .map(
                    (entry, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(normalizePricingHeadingCategory(entry?.category || entry?.entryType || entry?.division || activeCategory))}</td>
                        <td>${escapeHtml(entry.description)}</td>
                        ${canManage ? `<td class="entry-actions">
                          <button type="button" class="edit-btn" data-action="edit-pricing-heading" data-id="${entry.id}">Edit</button>
                          <button type="button" class="delete-btn" data-action="delete-pricing-heading" data-id="${entry.id}">Delete</button>
                        </td>` : ""}
                      </tr>
                    `
                  )
                  .join("")
              : `<tr><td colspan="${canManage ? 4 : 3}" class="empty-state">No pricing headings exist for ${escapeHtml(activeCategory)}.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function buildEntryRowHtml(row, index) {
  const allowedPricingHeadings = getPricingHeadingEntriesForDivision(row.division || "");
  const pricingHeadingOptions = allowedPricingHeadings.length
    ? allowedPricingHeadings.map((entry) => `<option value="${entry.id}" ${entry.id === row.pricingHeadingId ? "selected" : ""}>${escapeHtml(entry.description)}</option>`).join("")
    : "";

  const allowedMaterials = getMaterialsForDivision(row.division || "");
  const materialOptions = allowedMaterials.length
    ? allowedMaterials.map((entry) => `<option value="${entry.id}" ${entry.id === row.materialId ? "selected" : ""}>${escapeHtml(entry.description)}</option>`).join("")
    : "";

  return `
    <tr>
      <td><select class="pricing-financial-year-select" data-row-id="${row.id}" required><option value="">Select financial year</option>${financialYearEntries.map((e) => `<option value="${e.id}" ${e.id === row.financialYearId ? "selected" : ""}>${escapeHtml(e.year)}</option>`).join("")}</select></td>
      <td><select class="pricing-division-select" data-row-id="${row.id}" required><option value="">Select division</option><option value="FERTILIZER" ${row.division === "FERTILIZER" ? "selected" : ""}>FERTILIZER</option><option value="IPD" ${row.division === "IPD" ? "selected" : ""}>IPD</option><option value="TIE-UP" ${row.division === "TIE-UP" ? "selected" : ""}>TIE-UP</option></select></td>
      <td><select class="pricing-state-select" data-row-id="${row.id}" required><option value="">Select state</option>${stateNameEntries.map((e) => `<option value="${e.id}" ${e.id === row.stateId ? "selected" : ""}>${escapeHtml(e.name)}</option>`).join("")}</select></td>
      <td><select class="pricing-material-select" data-row-id="${row.id}" required><option value="">${row.division ? (allowedMaterials.length ? "Select material" : "No matching materials") : "Select division first"}</option>${materialOptions}</select></td>
      <td><input type="text" class="pricing-batchno-input" data-row-id="${row.id}" value="${escapeHtml(row.batchNo || "")}" placeholder="Enter batch no." required /></td>
      <td class="auto-slno-cell">${index + 1}</td>
      <td><textarea class="pricing-period-input complex-value-editor compact-editor" data-row-id="${row.id}" rows="1" placeholder="Enter period" required>${escapeHtml(row.period)}</textarea></td>
      <td><select class="pricing-category-select" data-row-id="${row.id}" required><option value="">Select category</option>${categoryEntries.map((e) => `<option value="${escapeHtml(e.name)}" ${row.category === e.name ? "selected" : ""}>${escapeHtml(e.name)}</option>`).join("")}</select></td>
      <td><select class="pricing-unit-rate-select" data-row-id="${row.id}" required><option value="">Select unit rate</option>${unitRateEntries.map((e) => `<option value="${escapeHtml(e.name)}" ${row.unitRate === e.name ? "selected" : ""}>${escapeHtml(e.name)}</option>`).join("")}</select></td>
      <td><select class="pricing-heading-select" data-row-id="${row.id}" required><option value="">${row.division ? (allowedPricingHeadings.length ? "Select pricing heading" : "No matching pricing headings") : "Select division first"}</option>${pricingHeadingOptions}</select></td>
      <td><textarea class="pricing-value-input complex-value-editor compact-editor" data-row-id="${row.id}" rows="1" placeholder="Enter value, slabs, conditions, formulas, or text" required>${escapeHtml(row.value)}</textarea></td>
      <td><textarea class="pricing-remarks-input complex-value-editor compact-editor" data-row-id="${row.id}" rows="1" placeholder="Enter remarks" required>${escapeHtml(row.remarks)}</textarea></td>
      <td><input type="text" class="pricing-approving-authority-input" data-row-id="${row.id}" value="${escapeHtml(row.approvingAuthority || "")}" placeholder="Enter approving authority" required /></td>
      <td><input type="date" class="pricing-date-of-approval-input" data-row-id="${row.id}" value="${escapeHtml(row.dateOfApproval || "")}" required /></td>
      <td><textarea class="pricing-ref-note-input complex-value-editor compact-editor" data-row-id="${row.id}" rows="1" placeholder="Enter ref. note of approval" required>${escapeHtml(row.refNoteOfApproval)}</textarea></td>
      <td class="entry-actions"><button type="button" class="delete-btn" data-action="delete-pricing-data-row" data-id="${row.id}">Delete</button></td>
    </tr>
  `;
}

// ── Filter helpers ──────────────────────────────────────────────────────────

const PRICING_DISPLAY_COLS = [
  { key: "financialYear", label: "Financial Year",       type: "text" },
  { key: "division",      label: "Division",             type: "dropdown" },
  { key: "state",         label: "State",                type: "text" },
  { key: "material",      label: "Material Description", type: "text" },
  { key: "aprNumber",     label: "APR No.",              type: "text" },
  { key: "batchNo",       label: "BATCH NO.",            type: "text" },
  { key: "slNo",          label: "SL No.",               type: "text" },
  { key: "period",        label: "Period",               type: "text" },
  { key: "category",   label: "CATEGORY",            type: "dropdown" },
  { key: "unitRate",      label: "UNIT RATE",            type: "text" },
  { key: "pricingHeading",label: "Pricing Heading",      type: "text" },
  { key: "value",         label: "Value / Amount / Text", type: "text" },
  { key: "remarks",       label: "Remarks",              type: "text" },
  { key: "approvingAuthority", label: "Approving Authority", type: "text" },
  { key: "dateOfApproval", label: "Date of Approval", type: "text" },
  { key: "refNoteOfApproval", label: "Ref. Note of Approval", type: "text" },
];

const MASTER_FIELDS = [
  { key: "financialYearId", label: "Financial Year", selector: ".pricing-financial-year-select", type: "select" },
  { key: "division", label: "Division", selector: ".pricing-division-select", type: "select" },
  { key: "stateId", label: "State", selector: ".pricing-state-select", type: "select" },
  { key: "materialId", label: "Material Description", selector: ".pricing-material-select", type: "select" },
  { key: "batchNo", label: "Batch No.", selector: ".pricing-batchno-input", type: "text" },
  { key: "period", label: "Period", selector: ".pricing-period-input", type: "text" },
  { key: "category", label: "Category", selector: ".pricing-category-select", type: "select" },
  { key: "unitRate", label: "Unit Rate", selector: ".pricing-unit-rate-select", type: "select" },
  { key: "pricingHeadingId", label: "Pricing Heading", selector: ".pricing-heading-select", type: "select" },
  { key: "approvingAuthority", label: "Approving Authority", selector: ".pricing-approving-authority-input", type: "text" },
  { key: "dateOfApproval", label: "Date of Approval", selector: ".pricing-date-of-approval-input", type: "date" },
  { key: "refNoteOfApproval", label: "Ref. Note of Approval", selector: ".pricing-ref-note-input", type: "text" },
  { key: "remarks", label: "Remarks", selector: ".pricing-remarks-input", type: "text" },
];

function normalizePricingHeadingCategory(category) {
  const value = String(category || "").trim();
  if (!value) return "PRICING ENTRY HEADING-FERTILIZER";
  if (["PRICING ENTRY HEADING", "PRICING HEADING ENTRY", "PRICING ENTRY HEADING-FERTILIZER", "FERTILIZER"].includes(value)) return "PRICING ENTRY HEADING-FERTILIZER";
  if (["PRICING ENTRY HEADING-IPD", "IPD"].includes(value)) return "PRICING ENTRY HEADING-IPD";
  if (["PRICING ENTRY HEADING-TIE-UP", "TIE-UP", "TIE-UP PRODUCTS"].includes(value)) return "PRICING ENTRY HEADING-TIE-UP";
  return "PRICING ENTRY HEADING-FERTILIZER";
}

function normalizeDivisionValue(division) {
  const value = String(division || "").trim();
  if (["FERTILIZER"].includes(value)) return "FERTILIZER";
  if (["IPD"].includes(value)) return "IPD";
  if (["TIE-UP", "TIE-UP PRODUCTS"].includes(value)) return "TIE-UP";
  return value;
}

function getPricingHeadingCategoryForDivision(division) {
  const normalized = normalizeDivisionValue(division);
  if (normalized === "IPD") return "PRICING ENTRY HEADING-IPD";
  if (normalized === "TIE-UP") return "PRICING ENTRY HEADING-TIE-UP";
  return "PRICING ENTRY HEADING-FERTILIZER";
}

function getDivisionFromPricingHeadingCategory(category) {
  const normalized = normalizePricingHeadingCategory(category);
  if (normalized === "PRICING ENTRY HEADING-IPD") return "IPD";
  if (normalized === "PRICING ENTRY HEADING-TIE-UP") return "TIE-UP";
  return "FERTILIZER";
}

function normalizePricingHeadingEntries(entries) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const deduped = [];
  const seen = new Set();

  safeEntries.forEach((entry) => {
    const description = String(entry?.description || "").trim();
    if (!description) return;
    const category = normalizePricingHeadingCategory(entry?.category || entry?.entryType || entry?.division || "PRICING ENTRY HEADING-FERTILIZER");
    const dedupeKey = `${description.toLowerCase()}|${category}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    deduped.push({
      ...entry,
      description,
      category,
      division: getDivisionFromPricingHeadingCategory(category),
    });
  });

  return deduped;
}

function getPricingHeadingEntriesForDivision(division) {
  const normalizedDivision = normalizeDivisionValue(division);
  const allowedCategory = getPricingHeadingCategoryForDivision(normalizedDivision);

  if (!normalizedDivision) return [];

  return pricingHeadingEntries.filter((entry) => {
    const category = normalizePricingHeadingCategory(entry?.category || entry?.entryType || entry?.division || "PRICING ENTRY HEADING-FERTILIZER");
    return category === allowedCategory;
  });
}

function getMaterialsForDivision(division) {
  const normalizedDivision = normalizeDivisionValue(division);
  if (!normalizedDivision) return [];

  return masterDataEntries.filter((entry) => normalizeDivisionValue(entry?.division || "") === normalizedDivision);
}

function isMaterialAllowedForDivision(division, materialId) {
  if (!division || !materialId) return true;
  const allowedMaterialIds = new Set(getMaterialsForDivision(division).map((entry) => String(entry.id)));
  return allowedMaterialIds.has(String(materialId));
}

function getPricingHeadingOptionsHtml(division) {
  const available = getPricingHeadingEntriesForDivision(division);
  const placeholder = !division ? "Select division first" : "Select pricing heading";
  return `
    <option value="">${placeholder}</option>
    ${available.map((entry) => `<option value="${entry.id}" ${entry.id === selectedPricingHeadingId ? "selected" : ""}>${escapeHtml(entry.description)}</option>`).join("")}
  `;
}

function getMasterFieldValue(row, fieldName) {
  const value = row[fieldName];
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function isMasterFieldValid(field, fieldName) {
  if (!field) return false;
  const rawValue = field.type === "checkbox" || field.type === "radio" ? (field.checked ? "checked" : "") : String(field.value || "").trim();
  if (!rawValue) return false;
  if (field.tagName === "SELECT" && rawValue === "") return false;
  if (field.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) return false;
  return true;
}

function isFirstRowComplete() {
  if (!pricingDataRows.length) return false;
  const firstRow = pricingDataRows[0];
  return MASTER_FIELDS.every((field) => {
    const value = getMasterFieldValue(firstRow, field.key);
    return value !== "";
  });
}

function copyFirstRowValuesToRow(sourceRow, targetRow) {
  MASTER_FIELDS.forEach((field) => {
    const value = getMasterFieldValue(sourceRow, field.key);
    if (value !== "") {
      targetRow[field.key] = value;
    }
  });
}

function triggerFieldEvents(rowId, fieldKey) {
  const fieldMeta = MASTER_FIELDS.find((f) => f.key === fieldKey);
  if (!fieldMeta) return;
  const container = document.querySelector(".entry-table-wrapper");
  if (!container) return;
  const field = container.querySelector(`[data-row-id="${rowId}"]${fieldMeta.selector}`);
  if (!field) return;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

function copyFirstRowValuesToAllRows() {
  if (!pricingDataRows.length) return;
  const sourceRow = pricingDataRows[0];
  for (let i = 1; i < pricingDataRows.length; i++) {
    copyFirstRowValuesToRow(sourceRow, pricingDataRows[i]);
  }
  persistPricingDataState();
  renderPricingDataTable();
  for (let i = 1; i < pricingDataRows.length; i++) {
    MASTER_FIELDS.forEach((field) => {
      triggerFieldEvents(pricingDataRows[i].id, field.key);
    });
  }
}

function showFieldError(field) {
  if (!field) return;
  field.classList.add("pricing-field-error");
  field.setAttribute("aria-invalid", "true");
  let error = field.parentElement.querySelector(".pricing-validation-error");
  if (!error) {
    error = document.createElement("div");
    error.className = "pricing-validation-error";
    error.textContent = "This field is required. Please enter or select a value.";
    field.parentElement.appendChild(error);
  }
}

function clearFieldError(field) {
  if (!field) return;
  field.classList.remove("pricing-field-error");
  field.removeAttribute("aria-invalid");
  const error = field.parentElement.querySelector(".pricing-validation-error");
  if (error) error.remove();
}

function validatePricingDataBeforeSave() {
  let isValid = true;
  let firstInvalidField = null;
  const container = document.querySelector(".entry-table-wrapper");
  if (!container) return false;

  const tbody = container.querySelector("tbody");
  if (!tbody) return false;

  const rows = tbody.querySelectorAll("tr");
  rows.forEach((row, rowIndex) => {
    if (row.closest(".entry-actions")) return;
    MASTER_FIELDS.forEach((fieldMeta) => {
      const field = row.querySelector(fieldMeta.selector);
      if (!field) return;
      if (field.closest(".entry-actions")) return;
      if (!isMasterFieldValid(field, fieldMeta.key)) {
        isValid = false;
        showFieldError(field);
        if (!firstInvalidField) firstInvalidField = field;
      } else {
        clearFieldError(field);
      }
    });
  });

  if (!isValid && firstInvalidField) {
    firstInvalidField.focus();
    firstInvalidField.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return isValid;
}

function simulateServerSideValidation(rows) {
  const errors = [];
  rows.forEach((row, rowIndex) => {
    MASTER_FIELDS.forEach((fieldMeta) => {
      const value = getMasterFieldValue(row, fieldMeta.key);
      if (!value) {
        errors.push({ row: rowIndex + 1, field: fieldMeta.key, message: `${fieldMeta.label} is required.` });
      } else if (fieldMeta.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        errors.push({ row: rowIndex + 1, field: fieldMeta.key, message: `${fieldMeta.label} is not a valid date.` });
      }
    });

    if (row.division && row.materialId && !isMaterialAllowedForDivision(row.division, row.materialId)) {
      errors.push({ row: rowIndex + 1, field: "materialId", message: "Material Description does not belong to the selected Division." });
    }

    if (row.division && row.pricingHeadingId && !isPricingHeadingAllowedForDivision(row.division, row.pricingHeadingId)) {
      errors.push({ row: rowIndex + 1, field: "pricingHeadingId", message: "Pricing Heading does not belong to the selected Division." });
    }
  });
  return errors;
}

function applyFirstRowToAllRows() {
  if (!pricingDataRows.length) return;

  const container = document.querySelector(".entry-table-wrapper");
  if (!container) return;
  const tbody = container.querySelector("tbody");
  if (!tbody) return;
  const firstRowElement = tbody.querySelector("tr");
  if (!firstRowElement) return;

  const allValid = MASTER_FIELDS.every((fieldMeta) => {
    const field = firstRowElement.querySelector(fieldMeta.selector);
    if (!field) return false;
    return isMasterFieldValid(field, fieldMeta.key);
  });

  if (!allValid) {
    window.alert("Please complete all master fields in the first row before applying to all rows.");
    return;
  }
  const confirmed = window.confirm("Do you want to copy the first-row values to all pricing rows? Existing values in those fields will be replaced.");
  if (!confirmed) return;

  const sourceValues = {};
  MASTER_FIELDS.forEach((fieldMeta) => {
    const field = firstRowElement.querySelector(fieldMeta.selector);
    if (field) {
      sourceValues[fieldMeta.key] = field.value || "";
    }
  });

  for (let i = 0; i < pricingDataRows.length; i++) {
    MASTER_FIELDS.forEach((fieldMeta) => {
      const value = sourceValues[fieldMeta.key];
      if (value !== "") {
        pricingDataRows[i][fieldMeta.key] = value;
      }
    });
  }

  persistPricingDataState();
  renderPricingDataTable();
  for (let i = 1; i < pricingDataRows.length; i++) {
    MASTER_FIELDS.forEach((field) => {
      triggerFieldEvents(pricingDataRows[i].id, field.key);
    });
  }
  window.alert("First-row values have been applied to all rows.");
}

const SAVED_COLS = PRICING_DISPLAY_COLS;

function getCommonRowDisplayValues(row, index) {
  return {
    aprNumber:     row.aprNumber || "",
    batchNo:       row.batchNo || "",
    slNo:          row.slNo || String(index + 1),
    division:      row.division || "",
    state:         stateNameEntries.find((e) => e.id === row.stateId)?.name || "",
    financialYear: financialYearEntries.find((e) => e.id === row.financialYearId)?.year || "",
    period:        row.period || "",
    category:      categoryEntries.find((e) => e.name)?.name || row.category || "",
    unitRate:      row.unitRate || "",
    material:      masterDataEntries.find((e) => e.id === row.materialId)?.description || "",
    pricingHeading: pricingHeadingEntries.find((e) => e.id === row.pricingHeadingId)?.description || "",
    value:         row.value || "",
    remarks:       row.remarks || "",
    approvingAuthority: row.approvingAuthority || "",
    dateOfApproval: row.dateOfApproval || "",
    refNoteOfApproval: row.refNoteOfApproval || "",
  };
}

function getSavedRowDisplayValues(row, index) {
  return getCommonRowDisplayValues(row, index);
}

function getFilteredSavedRecords() {
  const activeFilters = Object.entries(savedRecordFilters).filter(([, f]) => f && f.active);
  if (!activeFilters.length) return savedPricingRecords;

  return savedPricingRecords.filter((row, index) => {
    const vals = getSavedRowDisplayValues(row, index);
    return activeFilters.every(([key, f]) => {
      const cell = (vals[key] || "").toLowerCase();
      const v1 = (f.value || "").toLowerCase();
      const v2 = (f.value2 || "").toLowerCase();
      switch (f.operator) {
        case "contains":    return cell.includes(v1);
        case "equals":      return cell === v1;
        case "startsWith":  return cell.startsWith(v1);
        case "endsWith":    return cell.endsWith(v1);
        case "gt":          return parseFloat(cell) > parseFloat(v1);
        case "lt":          return parseFloat(cell) < parseFloat(v1);
        case "between":     return parseFloat(cell) >= parseFloat(v1) && parseFloat(cell) <= parseFloat(v2);
        case "multiSelect":  return !f.selected || f.selected.length === 0 || f.selected.includes(vals[key]);
        default:            return true;
      }
    });
  });
}

function buildSavedTableHeaderRow(filteredRecords) {
  const allIds = filteredRecords.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedSavedRowIds.has(id));
  const someSelected = allIds.some((id) => selectedSavedRowIds.has(id));
  const indeterminate = someSelected && !allSelected;
  const colHeaders = SAVED_COLS.map((col) => {
    const isActive = savedRecordFilters[col.key]?.active;
    return `<th class="${isActive ? "col-filter-active" : ""}">
      <span class="th-label">${col.label}</span>
      <button type="button" class="col-filter-btn" data-filter-col="${col.key}" title="Filter ${col.label}">&#9660;</button>
    </th>`;
  }).join("");
  return `<th class="sl-no-cell"><input type="checkbox" id="selectAllSavedRows" title="Select all visible rows" ${allSelected ? "checked" : ""} data-indeterminate="${indeterminate}"></th>` + colHeaders;
}

// ── Filter popup ─────────────────────────────────────────────────────────────

let activeFilterCol = null;

function openFilterPopup(colKey, anchorEl) {
  closeFilterPopup();
  activeFilterCol = colKey;
  const col = SAVED_COLS.find((c) => c.key === colKey);
  const existing = savedRecordFilters[colKey] || {};
  const rect = anchorEl.getBoundingClientRect();

  const popup = document.createElement("div");
  popup.id = "filterPopup";
  popup.className = "filter-popup";

  let inner = "";
  if (col.type === "dropdown") {
    const allVals = [...new Set(savedPricingRecords.map((r) => r[colKey] || "").filter(Boolean))];
    const selected = existing.selected || allVals;
    inner = `
      <div class="filter-popup-title">Filter: ${col.label}</div>
      <div class="filter-multiselect">
        <label><input type="checkbox" id="fpSelectAll" ${selected.length === allVals.length ? "checked" : ""}> Select All</label>
        ${allVals.map((v) => `<label><input type="checkbox" class="fp-val-cb" value="${escapeHtml(v)}" ${selected.includes(v) ? "checked" : ""}> ${escapeHtml(v)}</label>`).join("")}
      </div>
      <div class="filter-popup-actions">
        <button type="button" class="add-row-btn" id="fpApply">Apply</button>
        <button type="button" class="secondary-btn" id="fpClear">Clear</button>
        <button type="button" class="secondary-btn" id="fpClose">Cancel</button>
      </div>`;
  } else {
    const ops = col.type === "numeric"
      ? [["equals","Equals"],["gt","Greater Than"],["lt","Less Than"],["between","Between"]]
      : [["contains","Contains"],["equals","Equals"],["startsWith","Starts With"],["endsWith","Ends With"]];
    const curOp = existing.operator || ops[0][0];
    inner = `
      <div class="filter-popup-title">Filter: ${col.label}</div>
      <select id="fpOperator">${ops.map(([v, l]) => `<option value="${v}" ${curOp === v ? "selected" : ""}>${l}</option>`).join("")}</select>
      <input type="text" id="fpValue" placeholder="Value" value="${escapeHtml(existing.value || "")}" />
      <input type="text" id="fpValue2" placeholder="To (for Between)" value="${escapeHtml(existing.value2 || "")}" style="display:${curOp === "between" ? "block" : "none"}" />
      <div class="filter-popup-actions">
        <button type="button" class="add-row-btn" id="fpApply">Apply</button>
        <button type="button" class="secondary-btn" id="fpClear">Clear</button>
        <button type="button" class="secondary-btn" id="fpClose">Cancel</button>
      </div>`;
  }

  popup.innerHTML = inner;
  document.body.appendChild(popup);

  // Position below the anchor button
  const top = rect.bottom + window.scrollY + 4;
  const left = Math.min(rect.left + window.scrollX, window.innerWidth - 260);
  popup.style.top = top + "px";
  popup.style.left = left + "px";

  // Wire operator change to show/hide second input
  const opSel = popup.querySelector("#fpOperator");
  const val2 = popup.querySelector("#fpValue2");
  if (opSel && val2) {
    opSel.addEventListener("change", () => {
      val2.style.display = opSel.value === "between" ? "block" : "none";
    });
  }

  // Select All toggle
  const selectAll = popup.querySelector("#fpSelectAll");
  if (selectAll) {
    selectAll.addEventListener("change", () => {
      popup.querySelectorAll(".fp-val-cb").forEach((cb) => { cb.checked = selectAll.checked; });
    });
  }
}

function closeFilterPopup() {
  const existing = document.getElementById("filterPopup");
  if (existing) existing.remove();
  activeFilterCol = null;
  activeReportFilterCol = null;
}

function syncSelectionToFilteredRecords() {
  const visibleIds = new Set(getFilteredSavedRecords().map((r) => r.id));
  for (const id of [...selectedSavedRowIds]) {
    if (!visibleIds.has(id)) selectedSavedRowIds.delete(id);
  }
}

function applyFilterFromPopup() {
  const popup = document.getElementById("filterPopup");
  if (!popup || !activeFilterCol) return;
  const col = SAVED_COLS.find((c) => c.key === activeFilterCol);

  if (col.type === "dropdown") {
    const selected = [...popup.querySelectorAll(".fp-val-cb:checked")].map((cb) => cb.value);
    savedRecordFilters[activeFilterCol] = { active: selected.length > 0, operator: "multiSelect", selected };
  } else {
    const operator = popup.querySelector("#fpOperator")?.value || "contains";
    const value = popup.querySelector("#fpValue")?.value.trim() || "";
    const value2 = popup.querySelector("#fpValue2")?.value.trim() || "";
    savedRecordFilters[activeFilterCol] = { active: !!value, operator, value, value2 };
  }
  closeFilterPopup();
  syncSelectionToFilteredRecords();
  renderSavedPricingRecordsPanel();
}

function clearColumnFilter(colKey) {
  delete savedRecordFilters[colKey];
  closeFilterPopup();
  syncSelectionToFilteredRecords();
  renderSavedPricingRecordsPanel();
}

// ── Report filter helpers ─────────────────────────────────────────────────────

const REPORT_COLS = [
  ...PRICING_DISPLAY_COLS,
  { key: "completedAt", label: "Completed On", type: "text" },
  { key: "status",      label: "Status",       type: "text" },
  { key: "completedId", label: "Completed ID", type: "text" },
];

function getReportRowDisplayValues(row, index) {
  const reportIndex = completedPricingRecords.findIndex((record) => record.id === row.id);
  const aprNumber = row.aprNumber || "";
  const aprSerialNumber = reportIndex >= 0
    ? completedPricingRecords.slice(0, reportIndex + 1).filter((record) => (record.aprNumber || "") === aprNumber).length
    : index + 1;
  return {
    ...getCommonRowDisplayValues(row, index),
    slNo: String(aprSerialNumber),
    completedAt: row.completedAt || "",
    status: row.status || "Completed",
    completedId: row.completedId || row.id,
  };
}

function applyReportFilter(cell, f) {
  const v1 = (f.value || "").toLowerCase();
  const v2 = (f.value2 || "").toLowerCase();
  switch (f.operator) {
    case "contains":   return cell.includes(v1);
    case "equals":     return cell === v1;
    case "startsWith": return cell.startsWith(v1);
    case "endsWith":   return cell.endsWith(v1);
    case "gt":         return parseFloat(cell) > parseFloat(v1);
    case "lt":         return parseFloat(cell) < parseFloat(v1);
    case "between":    return parseFloat(cell) >= parseFloat(v1) && parseFloat(cell) <= parseFloat(v2);
    case "multiSelect": return !f.selected || f.selected.length === 0 || f.selected.includes(cell);
    default:           return true;
  }
}

function getFilteredReportRecords() {
  const activeFilters = Object.entries(reportRecordFilters).filter(([, f]) => f && f.active);
  if (!activeFilters.length) return completedPricingRecords;
  return completedPricingRecords.filter((row, index) => {
    const vals = getReportRowDisplayValues(row, index);
    return activeFilters.every(([key, f]) => {
      const cell = (vals[key] || "").toLowerCase();
      const rawCell = vals[key] || "";
      if (f.operator === "multiSelect") {
        return !f.selected || f.selected.length === 0 || f.selected.includes(rawCell);
      }
      return applyReportFilter(cell, f);
    });
  });
}

function getCurrentVisibleReportRows() {
  const tree = buildReportDrillDownTree(getFilteredReportRecords());
  const visibleRows = [];

  function collectVisibleRecords(nodes) {
    for (const node of nodes) {
      const isExpanded = reportDrillDownExpanded.has(node.id);
      if (isExpanded && node.children && node.children.length > 0) {
        collectVisibleRecords(node.children);
      }
      if (isExpanded && node.records && node.records.length > 0) {
        visibleRows.push(...node.records);
      }
    }
  }

  collectVisibleRecords(tree);
  return visibleRows;
}

function getNodePath(nodeId) {
  const parts = nodeId.split(":");
  if (parts.length < 5) return {};
  return {
    financialYear: parts[1] || "",
    division: parts[2] || "",
    state: parts[3] || "",
    material: parts[4] || "",
    aprNumber: parts[6] || "",
  };
}

function buildReportFileName() {
  const filtered = getFilteredReportRecords();
  if (!filtered.length) return "Reports.xlsx";
  const seen = new Set();
  const parts = [];
  for (const row of filtered) {
    const fy = financialYearEntries.find((e) => e.id === row.financialYearId)?.year || "";
    const div = row.division || "";
    const state = stateNameEntries.find((e) => e.id === row.stateId)?.name || "";
    const key = `${fy}|${div}|${state}`;
    if (!seen.has(key)) {
      seen.add(key);
      parts.push([fy, div, state].filter(Boolean).join("_"));
    }
    if (parts.length >= 3) break;
  }
  const suffix = parts.length ? `_${parts.join("_")}` : "";
  const safe = suffix.replace(/[^A-Za-z0-9_\-]/g, "_");
  return `Reports${safe}.xlsx`;
}

function exportCurrentReportToExcel() {
  if (typeof XLSX === "undefined") {
    window.alert("Excel library is not loaded. Please check your internet connection and try again.");
    return;
  }

  const visibleRows = getCurrentVisibleReportRows();
  if (!visibleRows.length) {
    window.alert("No records available for export.");
    return;
  }

  const btn = document.getElementById("exportExcelBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Exporting...";
  }

  try {
    const data = visibleRows.map((row, index) => {
      const display = getReportRowDisplayValues(row, index);
      return {
        "Financial Year": display.financialYear || "",
        "Division": display.division || "",
        "State": display.state || "",
        "Material Description": display.material || "",
        "APR No.": display.aprNumber || "",
        "Batch No.": display.batchNo || "",
        "Sl. No.": display.slNo || "",
        "Period": display.period || "",
        "CATEGORY": display.category || "Not classified",
        "UNIT RATE": display.unitRate || "",
        "Pricing Heading": display.pricingHeading || "",
        "Value / Amount / Text": display.value || "",
        "Remarks": display.remarks || "",
        "Approving Authority": display.approvingAuthority || "",
        "Date of Approval": display.dateOfApproval || "",
        "Ref. Note of Approval": display.refNoteOfApproval || "",
        "Completed On": display.completedAt || "",
        "Status": display.status || "Completed",
        "Completed ID": display.completedId || row.id || "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");

    const fileName = buildReportFileName();
    XLSX.writeFile(wb, fileName);
  } catch (err) {
    console.error("Excel export failed:", err);
    window.alert("Excel export failed. Please try again.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Export to Excel";
    }
  }
}

function generatePrintPreviewFromCurrentReportState() {
  return getCurrentVisibleReportRows();
}

function buildReportDrillDownTree(records) {
  const tree = [];
  const fyMap = new Map();

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const display = getReportRowDisplayValues(row, i);
    const fy = display.financialYear || "Unknown";
    const div = display.division || "Unknown";
    const state = display.state || "Unknown";
    const mat = display.material || "Unknown";
    const apr = display.aprNumber || "Unknown";

    let fyNode = fyMap.get(fy);
    if (!fyNode) {
      fyNode = { id: `fy:${fy}`, label: fy, count: 0, children: [], records: [], divMap: new Map() };
      fyMap.set(fy, fyNode);
      tree.push(fyNode);
    }

    let divNode = fyNode.divMap.get(div);
    if (!divNode) {
      divNode = { id: `fy:${fy}:div:${div}`, label: div, count: 0, children: [], records: [], stateMap: new Map() };
      fyNode.divMap.set(div, divNode);
      fyNode.children.push(divNode);
    }

    let stateNode = divNode.stateMap.get(state);
    if (!stateNode) {
      stateNode = { id: `fy:${fy}:div:${div}:state:${state}`, label: state, count: 0, children: [], records: [], matMap: new Map() };
      divNode.stateMap.set(state, stateNode);
      divNode.children.push(stateNode);
    }

    let matNode = stateNode.matMap.get(mat);
    if (!matNode) {
      matNode = { id: `fy:${fy}:div:${div}:state:${state}:mat:${mat}`, label: mat, count: 0, children: [], records: [], aprMap: new Map() };
      stateNode.matMap.set(mat, matNode);
      stateNode.children.push(matNode);
    }

    let aprNode = matNode.aprMap.get(apr);
    if (!aprNode) {
      aprNode = { id: `fy:${fy}:div:${div}:state:${state}:mat:${mat}:apr:${apr}`, label: apr, count: 0, children: [], records: [] };
      matNode.aprMap.set(apr, aprNode);
      matNode.children.push(aprNode);
    }

    aprNode.records.push(row);
  }

  function setCounts(node) {
    if (node.records.length > 0) {
      node.count = node.records.length;
    } else {
      node.count = 0;
      for (const child of node.children) {
        setCounts(child);
        node.count += child.count || 0;
      }
    }
  }

  for (const fyNode of tree) {
    setCounts(fyNode);
  }

  return tree;
}

function renderReportDrillDownNode(node, level = 0) {
  const hasChildren = node.children && node.children.length > 0;
  const hasRecords = node.records && node.records.length > 0;
  const hasToggle = hasChildren || hasRecords;
  const isExpanded = reportDrillDownExpanded.has(node.id);
  const indent = level * 24;
  const toggleIcon = hasToggle ? (isExpanded ? "−" : "+") : "";
  const toggleClass = hasToggle ? "report-drill-toggle" : "report-drill-leaf";
  const recordLabel = node.count === 1 ? "Record" : "Records";

  let html = `
    <div class="report-drill-node" style="margin-left:${indent}px;" data-node-id="${escapeHtml(node.id)}">
      <button type="button" class="${toggleClass}" data-node-id="${escapeHtml(node.id)}">${toggleIcon}</button>
      <span class="report-drill-label">${escapeHtml(node.label)}</span>
      <span class="report-drill-count">(${node.count} ${recordLabel})</span>
    </div>
  `;

  if (isExpanded && hasChildren) {
    for (const child of node.children) {
      html += renderReportDrillDownNode(child, level + 1);
    }
  }

  if (isExpanded && hasRecords) {
    html += renderReportDetailTable(node.records, level + 1);
  }

  return html;
}

function renderReportDetailTable(records, level) {
  const indent = level * 24;
  let html = `<div class="report-drill-details" style="margin-left:${indent}px;">`;
  html += `<table class="master-data-table pricing-data-table report-drill-table">
    <thead>
      <tr>
        <th>Financial Year</th>
        <th>Division</th>
        <th>State</th>
        <th>Material Description</th>
        <th>APR No.</th>
        <th>Batch No.</th>
        <th>Sl. No.</th>
        <th>Period</th>
        <th>CATEGORY</th>
        <th>UNIT RATE</th>
        <th>Pricing Heading</th>
        <th>Value / Amount / Text</th>
        <th>Remarks</th>
        <th>Approving Authority</th>
        <th>Date of Approval</th>
        <th>Ref. Note of Approval</th>
        ${isAdminAuthenticated ? "<th>Actions</th>" : ""}
      </tr>
    </thead>
    <tbody>`;

  records.forEach((row, i) => {
    const display = getReportRowDisplayValues(row, i);
    html += `<tr>
      <td>${escapeHtml(display.financialYear)}</td>
      <td>${escapeHtml(display.division)}</td>
      <td>${escapeHtml(display.state)}</td>
      <td>${escapeHtml(display.material)}</td>
      <td>${escapeHtml(display.aprNumber)}</td>
      <td>${escapeHtml(display.batchNo)}</td>
      <td>${escapeHtml(display.slNo)}</td>
      <td>${escapeHtml(display.period)}</td>
      <td>${escapeHtml(display.category || "Not classified")}</td>
      <td>${escapeHtml(display.unitRate)}</td>
      <td>${escapeHtml(display.pricingHeading)}</td>
      <td>${formatMultilineText(display.value)}</td>
      <td>${escapeHtml(display.remarks)}</td>
      <td>${escapeHtml(display.approvingAuthority)}</td>
      <td>${escapeHtml(display.dateOfApproval)}</td>
      <td>${escapeHtml(display.refNoteOfApproval)}</td>
      ${isAdminAuthenticated ? `<td class="entry-actions"><button type="button" class="delete-btn" data-action="admin-delete-report" data-id="${row.id}">Delete</button></td>` : ""}
    </tr>`;
  });

  html += `</tbody></table></div>`;
  return html;
}

function openReportFilterPopup(colKey, anchorEl) {
  closeFilterPopup();
  activeReportFilterCol = colKey;
  const col = REPORT_COLS.find((c) => c.key === colKey);
  const existing = reportRecordFilters[colKey] || {};
  const rect = anchorEl.getBoundingClientRect();

  const popup = document.createElement("div");
  popup.id = "filterPopup";
  popup.className = "filter-popup";

  let inner = "";
  if (col.type === "dropdown") {
    const allVals = [...new Set(completedPricingRecords.map((r) => r[colKey] || "").filter(Boolean))];
    const selected = existing.selected || allVals;
    inner = `
      <div class="filter-popup-title">Filter: ${col.label}</div>
      <div class="filter-multiselect">
        <label><input type="checkbox" id="fpSelectAll" ${selected.length === allVals.length ? "checked" : ""}> Select All</label>
        ${allVals.map((v) => `<label><input type="checkbox" class="fp-val-cb" value="${escapeHtml(v)}" ${selected.includes(v) ? "checked" : ""}> ${escapeHtml(v)}</label>`).join("")}
      </div>
      <div class="filter-popup-actions">
        <button type="button" class="add-row-btn" id="fpApply">Apply</button>
        <button type="button" class="secondary-btn" id="fpClear">Clear</button>
        <button type="button" class="secondary-btn" id="fpClose">Cancel</button>
      </div>`;
  } else {
    const ops = [["contains","Contains"],["equals","Equals"],["startsWith","Starts With"],["endsWith","Ends With"]];
    const curOp = existing.operator || "contains";
    inner = `
      <div class="filter-popup-title">Filter: ${col.label}</div>
      <select id="fpOperator">${ops.map(([v, l]) => `<option value="${v}" ${curOp === v ? "selected" : ""}>${l}</option>`).join("")}</select>
      <input type="text" id="fpValue" placeholder="Value" value="${escapeHtml(existing.value || "")}" />
      <input type="text" id="fpValue2" placeholder="To (for Between)" value="${escapeHtml(existing.value2 || "")}" style="display:none" />
      <div class="filter-popup-actions">
        <button type="button" class="add-row-btn" id="fpApply">Apply</button>
        <button type="button" class="secondary-btn" id="fpClear">Clear</button>
        <button type="button" class="secondary-btn" id="fpClose">Cancel</button>
      </div>`;
  }

  popup.innerHTML = inner;
  document.body.appendChild(popup);
  const top = rect.bottom + window.scrollY + 4;
  const left = Math.min(rect.left + window.scrollX, window.innerWidth - 260);
  popup.style.top = top + "px";
  popup.style.left = left + "px";

  const selectAll = popup.querySelector("#fpSelectAll");
  if (selectAll) {
    selectAll.addEventListener("change", () => {
      popup.querySelectorAll(".fp-val-cb").forEach((cb) => { cb.checked = selectAll.checked; });
    });
  }
}

function applyReportFilterFromPopup() {
  const popup = document.getElementById("filterPopup");
  if (!popup || !activeReportFilterCol) return;
  const col = REPORT_COLS.find((c) => c.key === activeReportFilterCol);
  if (col.type === "dropdown") {
    const selected = [...popup.querySelectorAll(".fp-val-cb:checked")].map((cb) => cb.value);
    reportRecordFilters[activeReportFilterCol] = { active: selected.length > 0, operator: "multiSelect", selected };
  } else {
    const operator = popup.querySelector("#fpOperator")?.value || "contains";
    const value = popup.querySelector("#fpValue")?.value.trim() || "";
    reportRecordFilters[activeReportFilterCol] = { active: !!value, operator, value, value2: "" };
  }
  activeReportFilterCol = null;
  closeFilterPopup();
  renderReportsPanel();
}

function clearReportColumnFilter(colKey) {
  delete reportRecordFilters[colKey];
  activeReportFilterCol = null;
  closeFilterPopup();
  renderReportsPanel();
}

// ─────────────────────────────────────────────────────────────────────────────

function buildSavedRowHtml(row, index) {
  const isEditing = editingSavedRowIds.has(row.id);
  const isChecked = selectedSavedRowIds.has(row.id);
  const slCell = `<td class="sl-no-cell"><input type="checkbox" class="saved-row-checkbox" data-row-id="${row.id}" ${isChecked ? "checked" : ""} /></td>`;

  if (isEditing) {
    const allowedPricingHeadings = getPricingHeadingEntriesForDivision(row.division || "");
    const pricingHeadingOptions = allowedPricingHeadings.length
      ? allowedPricingHeadings.map((entry) => `<option value="${entry.id}" ${entry.id === row.pricingHeadingId ? "selected" : ""}>${escapeHtml(entry.description)}</option>`).join("")
      : "";

    const allowedMaterials = getMaterialsForDivision(row.division || "");
    const materialOptions = allowedMaterials.length
      ? allowedMaterials.map((entry) => `<option value="${entry.id}" ${entry.id === row.materialId ? "selected" : ""}>${escapeHtml(entry.description)}</option>`).join("")
      : "";

    return `
      <tr data-record-id="${row.id}">
        ${slCell}
        <td><select class="saved-financial-year-select" data-row-id="${row.id}"><option value="">Select financial year</option>${financialYearEntries.map((e) => `<option value="${e.id}" ${e.id === row.financialYearId ? "selected" : ""}>${escapeHtml(e.year)}</option>`).join("")}</select></td>
        <td><select class="saved-division-select" data-row-id="${row.id}"><option value="">Select division</option><option value="FERTILIZER" ${row.division === "FERTILIZER" ? "selected" : ""}>FERTILIZER</option><option value="IPD" ${row.division === "IPD" ? "selected" : ""}>IPD</option><option value="TIE-UP" ${row.division === "TIE-UP" ? "selected" : ""}>TIE-UP</option></select></td>
        <td><select class="saved-state-select" data-row-id="${row.id}"><option value="">Select state</option>${stateNameEntries.map((e) => `<option value="${e.id}" ${e.id === row.stateId ? "selected" : ""}>${escapeHtml(e.name)}</option>`).join("")}</select></td>
        <td><select class="saved-material-select" data-row-id="${row.id}"><option value="">${row.division ? (allowedMaterials.length ? "Select material" : "No matching materials") : "Select division first"}</option>${materialOptions}</select></td>
        <td><input type="text" class="saved-apr-input" data-row-id="${row.id}" value="${escapeHtml(row.aprNumber || "")}" placeholder="Enter APR No." /></td>
        <td><input type="text" class="saved-batchno-input" data-row-id="${row.id}" value="${escapeHtml(row.batchNo || "")}" placeholder="Enter batch no." /></td>
        <td><input type="text" class="saved-slno-input" data-row-id="${row.id}" value="${escapeHtml(row.slNo || "")}" placeholder="Enter SL No." /></td>
        <td><textarea class="saved-period-input complex-value-editor compact-editor" data-row-id="${row.id}" rows="1" placeholder="Enter period">${escapeHtml(row.period)}</textarea></td>
        <td><select class="saved-category-select" data-row-id="${row.id}"><option value="">Select category</option>${categoryEntries.map((e) => `<option value="${escapeHtml(e.name)}" ${row.category === e.name ? "selected" : ""}>${escapeHtml(e.name)}</option>`).join("")}</select></td>
        <td><input type="text" class="saved-unit-rate-input" data-row-id="${row.id}" value="${escapeHtml(row.unitRate || "")}" placeholder="Enter unit rate" /></td>
        <td><select class="saved-heading-select" data-row-id="${row.id}"><option value="">${row.division ? (allowedPricingHeadings.length ? "Select pricing heading" : "No matching pricing headings") : "Select division first"}</option>${pricingHeadingOptions}</select></td>
        <td><textarea class="saved-value-input complex-value-editor compact-editor" data-row-id="${row.id}" rows="1" placeholder="Enter value, slabs, conditions, formulas, or text">${escapeHtml(row.value)}</textarea></td>
        <td><textarea class="saved-remarks-input complex-value-editor compact-editor" data-row-id="${row.id}" rows="1" placeholder="Enter remarks">${escapeHtml(row.remarks)}</textarea></td>
        <td><input type="text" class="saved-approving-authority-input" data-row-id="${row.id}" value="${escapeHtml(row.approvingAuthority || "")}" placeholder="Enter approving authority" /></td>
        <td><input type="date" class="saved-date-of-approval-input" data-row-id="${row.id}" value="${escapeHtml(row.dateOfApproval || "")}" /></td>
        <td><textarea class="saved-ref-note-input complex-value-editor compact-editor" data-row-id="${row.id}" rows="1" placeholder="Enter ref. note of approval">${escapeHtml(row.refNoteOfApproval)}</textarea></td>
      </tr>
    `;
  }

  return `
    <tr data-record-id="${row.id}">
      ${slCell}
      <td>${escapeHtml(financialYearEntries.find((e) => e.id === row.financialYearId)?.year || "")}</td>
      <td>${escapeHtml(row.division || "")}</td>
      <td>${escapeHtml(stateNameEntries.find((e) => e.id === row.stateId)?.name || "")}</td>
      <td>${escapeHtml(masterDataEntries.find((e) => e.id === row.materialId)?.description || "")}</td>
      <td>${escapeHtml(row.aprNumber || "")}</td>
      <td>${escapeHtml(row.batchNo || "")}</td>
      <td>${escapeHtml(row.slNo || "")}</td>
      <td>${escapeHtml(row.period || "")}</td>
      <td>${escapeHtml(row.category || "Not classified")}</td>
      <td>${escapeHtml(row.unitRate || "")}</td>
      <td>${escapeHtml(pricingHeadingEntries.find((e) => e.id === row.pricingHeadingId)?.description || "")}</td>
      <td>${formatMultilineText(row.value)}</td>
      <td>${escapeHtml(row.remarks || "")}</td>
      <td>${escapeHtml(row.approvingAuthority || "")}</td>
      <td>${escapeHtml(row.dateOfApproval || "")}</td>
      <td>${escapeHtml(row.refNoteOfApproval || "")}</td>
    </tr>
  `;
}

function renderPricingDataTable() {
  const normalizedRows = normalizePricingDataRows(pricingDataRows);
  if (normalizedRows.length !== pricingDataRows.length || normalizedRows.some((row, index) => row.id !== pricingDataRows[index]?.id)) {
    pricingDataRows = normalizedRows;
    persistPricingDataState();
  }
  const entryTableHeaders = `
    <tr>
      <th>Financial Year</th>
      <th>Division</th>
      <th>State</th>
      <th>Material Description</th>
      <th>BATCH NO.</th>
      <th>Sl. No.</th>
      <th>Period</th>
      <th>CATEGORY</th>
      <th>UNIT RATE</th>
      <th>Pricing Heading</th>
      <th>Value / Amount / Text</th>
      <th>Remarks</th>
      <th>Approving Authority</th>
      <th>Date of Approval</th>
      <th>Ref. Note of Approval</th>
      <th>Actions</th>
    </tr>`;
  masterDataPanel.innerHTML = `
    <div class="master-data-card pricing-data-card">
      <div class="panel-heading">
        <h2>PRICING DATA ENTRY</h2>
        <p>Enter a new pricing record and click Save to add it to the Saved Pricing Records table.</p>
      </div>

      ${pricingDataValidationMessage ? `<div class="validation-message">${escapeHtml(pricingDataValidationMessage)}</div>` : ""}

      <div class="table-actions pricing-data-actions">
        <button type="button" class="add-row-btn" id="addPricingDataRowBtn">Add Row</button>
        <button type="button" class="secondary-btn" id="applyFirstRowToAllBtn">Apply First Row to All Rows</button>
        <button type="button" class="secondary-btn" id="savePricingDataBtn">Save</button>
      </div>

      <div class="table-wrapper entry-table-wrapper">
        <table class="master-data-table pricing-data-table">
          <thead>${entryTableHeaders}</thead>
          <tbody>
            ${pricingDataRows.length
              ? pricingDataRows.map((row, index) => buildEntryRowHtml(row, index)).join("")
              : '<tr><td colspan="16" class="empty-state">No pricing rows yet. Click Add Row to begin.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSavedPricingRecordsPanel() {
  const selCount = getSelectedRecordIds().length;
  const hasSelection = selCount > 0;
  const isEditingAny = editingSavedRowIds.size > 0;
  const hasActiveFilters = Object.values(savedRecordFilters).some((f) => f?.active);
  const filteredRecords = getFilteredSavedRecords();

  masterDataPanel.innerHTML = `
    <div class="master-data-card pricing-data-card">
      <div class="panel-heading">
        <h2>SAVED PRICING RECORDS</h2>
        <p>Review, edit, filter, or complete saved pricing records.</p>
      </div>
      ${pricingDataValidationMessage ? `<div class="validation-message">${escapeHtml(pricingDataValidationMessage)}</div>` : ""}
      <div class="saved-records-header">
        <div class="table-actions">
          ${hasActiveFilters ? '<button type="button" class="secondary-btn" id="clearAllFiltersBtn">Clear All Filters</button>' : ""}
          ${hasSelection ? `<span class="selection-count">${selCount} record${selCount > 1 ? "s" : ""} selected</span>` : ""}
          <button type="button" class="edit-btn" id="editSelectedBtn" ${hasSelection && !isEditingAny ? "" : "disabled"}>Edit</button>
          <button type="button" class="add-row-btn" id="saveSelectedBtn" ${hasSelection || isEditingAny ? "" : "disabled"}>Save</button>
          <button type="button" class="delete-btn" id="deleteSelectedBtn" ${hasSelection && !isEditingAny ? "" : "disabled"}>Delete</button>
          <button type="button" class="complete-btn" id="completeSelectedBtn" ${hasSelection && !isEditingAny ? "" : "disabled"}>Complete</button>
        </div>
      </div>
      <div class="table-wrapper saved-table-wrapper">
        <table class="master-data-table pricing-data-table">
          <thead><tr>${buildSavedTableHeaderRow(filteredRecords)}</tr></thead>
          <tbody>
            ${filteredRecords.length
              ? filteredRecords.map((row, index) => buildSavedRowHtml(row, index)).join("")
               : `<tr><td colspan="17" class="empty-state">${savedPricingRecords.length ? "No records match the current filters." : "No saved records yet. Create a record in Pricing Data to see it here."}</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;

  updateSelectAllState();
}

function getSelectedRecordIds() {
  const filteredRecords = getFilteredSavedRecords();
  const visibleIds = new Set(filteredRecords.map((r) => r.id));
  return [...selectedSavedRowIds].filter((id) => visibleIds.has(id));
}

function requireSelectedRecords() {
  const selectedIds = getSelectedRecordIds();
  if (selectedIds.length === 0) {
    pricingDataValidationMessage = "Please select at least one pricing record.";
    renderSavedPricingRecordsPanel();
    return null;
  }
  return selectedIds;
}

function handleBulkEdit() {
  const selectedIds = requireSelectedRecords();
  if (!selectedIds) return;

  savedEditBackup = {};
  selectedIds.forEach((id) => {
    const row = savedPricingRecords.find((r) => r.id === id);
    if (row) {
      savedEditBackup[id] = { ...row };
      editingSavedRowIds.add(id);
    }
  });
  selectedSavedRowIds.clear();
  pricingDataValidationMessage = `${selectedIds.length} record${selectedIds.length > 1 ? "s" : ""} ready for editing.`;
  renderSavedPricingRecordsPanel();
}

function handleBulkSave() {
  try {
    const selectedIds = getSelectedRecordIds();
    const editingIds = [...editingSavedRowIds];
    const idsToSave = selectedIds.length > 0 ? selectedIds : editingIds;

    console.log("handleBulkSave - selectedIds:", selectedIds);
    console.log("handleBulkSave - editingIds:", editingIds);
    console.log("handleBulkSave - idsToSave:", idsToSave);

    if (idsToSave.length === 0) {
      pricingDataValidationMessage = "Please select at least one pricing record.";
      renderSavedPricingRecordsPanel();
      return;
    }

    const rowsToSave = idsToSave.map((id) => savedPricingRecords.find((r) => r.id === id)).filter(Boolean);
    const invalidRows = [];
    rowsToSave.forEach((row, idx) => {
      const validation = validateSavedRow(row);
      console.log("handleBulkSave - validating row:", row.id, "valid:", validation.valid, "message:", validation.message);
      if (!validation.valid) {
        invalidRows.push({ row, index: idx + 1, message: validation.message, recordId: row.id });
      }
    });

    if (invalidRows.length > 0) {
      const firstError = invalidRows[0];
      pricingDataValidationMessage = `Row ${firstError.index} (ID: ${firstError.recordId}): ${firstError.message}`;
      renderSavedPricingRecordsPanel();
      return;
    }

    console.log("handleBulkSave - saving rows, clearing edit mode");
    editingSavedRowIds.clear();
    selectedSavedRowIds.clear();
    savedEditBackup = {};
    pricingDataValidationMessage = `${rowsToSave.length} pricing record${rowsToSave.length > 1 ? "s" : ""} saved successfully.`;
    persistPricingDataState();
    renderSavedPricingRecordsPanel();
  } catch (error) {
    console.error("Error in handleBulkSave:", error);
    pricingDataValidationMessage = "An error occurred while saving. Please try again.";
    renderSavedPricingRecordsPanel();
  }
}

function handleBulkDelete() {
  const selectedIds = requireSelectedRecords();
  if (!selectedIds) return;
  const count = selectedIds.length;

  const confirmed = window.confirm(`Are you sure you want to delete ${count} selected pricing record${count > 1 ? "s" : ""}?`);
  if (!confirmed) return;

  const selectedIdSet = new Set(selectedIds);
  savedPricingRecords = savedPricingRecords.filter((row) => !selectedIdSet.has(row.id));
  selectedSavedRowIds.clear();
  editingSavedRowIds.clear();
  persistPricingDataState();
  pricingDataValidationMessage = `${count} record${count > 1 ? "s" : ""} deleted successfully.`;
  renderSavedPricingRecordsPanel();
}

function handleBulkComplete() {
  const selectedIds = requireSelectedRecords();
  if (!selectedIds) return;
  const count = selectedIds.length;

  if (editingSavedRowIds.size > 0) {
    pricingDataValidationMessage = "Please save your changes before completing records.";
    renderSavedPricingRecordsPanel();
    return;
  }

  const confirmed = window.confirm(`Are you sure you want to mark ${count} selected pricing record${count > 1 ? "s" : ""} as Complete?`);
  if (!confirmed) return;

  const selectedRecords = selectedIds.map((id) => savedPricingRecords.find((record) => record.id === id)).filter(Boolean);
  const invalidRows = selectedRecords.filter((row) => !validateSavedRow(row).valid);
  if (invalidRows.length > 0) {
    pricingDataValidationMessage = "One or more selected records are incomplete or do not have a valid CATEGORY. Please fix them before completing.";
    renderSavedPricingRecordsPanel();
    return;
  }

  const now = new Date();
  const completionStamp = now.getTime().toString(36).toUpperCase();
  const newCompleted = selectedRecords.map((row, index) => ({
    ...row,
    id: `completed-pricing-${completionStamp}-${index + 1}-${Math.random().toString(16).slice(2)}`,
    originalId: row.id,
    completedAt: now.toLocaleString(),
    completedId: `CMP-${completionStamp}-${index + 1}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
    status: "Completed",
  }));
  const selectedIdSet = new Set(selectedIds);
  completedPricingRecords = [...completedPricingRecords, ...newCompleted];
  savedPricingRecords = savedPricingRecords.filter((record) => !selectedIdSet.has(record.id));
  selectedSavedRowIds.clear();
  editingSavedRowIds.clear();
  persistPricingDataState();
  pricingDataValidationMessage = `${count} record${count > 1 ? "s" : ""} marked as completed.`;
  renderSavedPricingRecordsPanel();
}

function updateSelectAllState() {
  const filteredRecords = getFilteredSavedRecords();
  const allIds = filteredRecords.map((r) => r.id);
  const selectAllCb = document.getElementById("selectAllSavedRows");
  if (!selectAllCb) return;

  if (allIds.length === 0) {
    selectAllCb.checked = false;
    selectAllCb.indeterminate = false;
    return;
  }

  const allSelected = allIds.every((id) => selectedSavedRowIds.has(id));
  const someSelected = allIds.some((id) => selectedSavedRowIds.has(id));

  selectAllCb.checked = allSelected;
  selectAllCb.indeterminate = someSelected && !allSelected;
}

function cancelEdit(rowId) {
  if (savedEditBackup[rowId]) {
    const index = savedPricingRecords.findIndex((r) => r.id === rowId);
    if (index !== -1) {
      savedPricingRecords[index] = savedEditBackup[rowId];
    }
    delete savedEditBackup[rowId];
  }
  editingSavedRowIds.delete(rowId);
  renderSavedPricingRecordsPanel();
}

function createPricingDataRow() {
  return {
    id: `pricing-row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    division: "",
    stateId: "",
    financialYearId: "",
    period: "",
    category: "",
    approvingAuthority: "",
    dateOfApproval: "",
    refNoteOfApproval: "",
    unitRate: "",
    materialId: "",
    pricingHeadingId: "",
    aprNumber: "",
    batchNo: "",
    slNo: "",
    value: "",
    remarks: "",
  };
}

function isBlankPricingDataRow(row) {
  return [
    row.division,
    row.stateId,
    row.financialYearId,
    row.period,
    row.category,
    row.unitRate,
    row.materialId,
    row.pricingHeadingId,
    row.aprNumber,
    row.batchNo,
    row.value,
    row.remarks,
    row.approvingAuthority,
    row.dateOfApproval,
    row.refNoteOfApproval,
  ].every((value) => value === "" || value === undefined || value === null);
}

function normalizePricingDataRows(rows) {
  const safeRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
  return safeRows.length ? safeRows : [createPricingDataRow()];
}

function loadPersistedState() {
  masterDataEntries = getStoredValue("masterDataEntries", masterDataEntries);
  pricingHeadingEntries = normalizePricingHeadingEntries(getStoredValue("pricingHeadingEntries", pricingHeadingEntries));
  stateNameEntries = getStoredValue("stateNameEntries", stateNameEntries);
  financialYearEntries = getStoredValue("financialYearEntries", financialYearEntries);
  pricingDataRows = normalizePricingDataRows(getStoredValue("pricingDataRows", []));
  savedPricingRecords = getStoredValue("savedPricingRecords", []).map((row) => ({
    ...row,
    division: normalizeDivisionValue(row.division),
    pricingHeadingId: row.pricingHeadingId && !getPricingHeadingEntriesForDivision(row.division).some((entry) => entry.id === row.pricingHeadingId) ? "" : row.pricingHeadingId,
  }));
  completedPricingRecords = getStoredValue("completedPricingRecords", []);
  aprCounter = Number(getStoredValue("aprCounter", 0)) || 0;
  deletionAuditLog = getStoredValue("deletionAuditLog", []);
  unitRateEntries = getStoredValue("unitRateEntries", []);
  categoryEntries = getStoredValue("categoryEntries", []);
}

loadPersistedState();

function persistPricingDataState() {
  const stored = [
    setStoredValue("masterDataEntries", masterDataEntries),
    setStoredValue("pricingHeadingEntries", pricingHeadingEntries),
    setStoredValue("stateNameEntries", stateNameEntries),
    setStoredValue("financialYearEntries", financialYearEntries),
    setStoredValue("unitRateEntries", unitRateEntries),
    setStoredValue("categoryEntries", categoryEntries),
    setStoredValue("pricingDataRows", pricingDataRows),
    setStoredValue("savedPricingRecords", savedPricingRecords),
    setStoredValue("completedPricingRecords", completedPricingRecords),
    setStoredValue("aprCounter", aprCounter),
    setStoredValue("deletionAuditLog", deletionAuditLog),
  ].every(Boolean);
  queueDatabaseSave();
  return stored;
}

function isPricingDataRowComplete(row) {
  return !isBlankPricingDataRow(row);
}

function validatePricingDataRows() {
  const completedRows = pricingDataRows.filter(isPricingDataRowComplete);

  if (!completedRows.length) {
    return {
      valid: false,
      message: "Please enter at least one value in a row before saving.",
    };
  }

  const stateMap = new Map(stateNameEntries.map((entry) => [entry.id, entry.name]));
  const financialYearMap = new Map(financialYearEntries.map((entry) => [entry.id, entry.year]));
  const materialMap = new Map(masterDataEntries.map((entry) => [entry.id, entry.description]));
  const headingMap = new Map(pricingHeadingEntries.map((entry) => [entry.id, entry.description]));
  const seen = new Set();
  let duplicateFound = false;

  completedRows.forEach((row) => {
    const stateName = stateMap.get(row.stateId) || "";
    const financialYear = financialYearMap.get(row.financialYearId) || "";
    const materialDescription = materialMap.get(row.materialId) || "";
    const headingDescription = headingMap.get(row.pricingHeadingId) || "";
    const key = `${stateName.toLowerCase()}|${financialYear.toLowerCase()}|${materialDescription.toLowerCase()}|${headingDescription.toLowerCase()}`;

    if (seen.has(key)) {
      duplicateFound = true;
    } else {
      seen.add(key);
    }
  });

  if (duplicateFound) {
    return {
      valid: false,
      message: "Duplicate Material + Pricing Heading combinations are not allowed.",
    };
  }

  return { valid: true, message: "" };
}

function isPricingHeadingAllowedForDivision(division, pricingHeadingId) {
  if (!division || !pricingHeadingId) return true;
  const heading = pricingHeadingEntries.find((entry) => entry.id === pricingHeadingId);
  if (!heading) return false;
  const allowedCategory = getPricingHeadingCategoryForDivision(normalizeDivisionValue(division));
  const headingCategory = normalizePricingHeadingCategory(heading.category || heading.entryType || heading.division || "PRICING ENTRY HEADING-FERTILIZER");
  return headingCategory === allowedCategory;
}

function validateSavedRow(row) {
  const validCategories = categoryEntries.map((e) => e.name);
  if (!validCategories.length) {
    return { valid: false, message: "No Category is available. Please create Category in Master Data before entering Pricing Data." };
  }
  if (!row) {
    return { valid: false, message: "Record not found." };
  }
  const missingFields = [];
  if (!row.division) missingFields.push("Division");
  if (!row.stateId) missingFields.push("State");
  if (!row.financialYearId) missingFields.push("Financial Year");
  if (!String(row.period || "").trim()) missingFields.push("Period");
  if (!validCategories.includes(row.category)) missingFields.push("Category");
  if (!row.materialId) missingFields.push("Material Description");
  if (!row.pricingHeadingId) missingFields.push("Pricing Heading");
  if (!String(row.value || "").trim()) missingFields.push("Value");
  if (row.division && row.materialId && !isMaterialAllowedForDivision(row.division, row.materialId)) {
    return { valid: false, message: `Material Description does not belong to the selected Division (${row.division}). Please select a valid material for this division.` };
  }
  if (row.division && row.pricingHeadingId && !isPricingHeadingAllowedForDivision(row.division, row.pricingHeadingId)) {
    return { valid: false, message: `Pricing Heading does not belong to the selected Division (${row.division}). Please select a valid heading for this division.` };
  }
  if (missingFields.length > 0) {
    return { valid: false, message: "Missing fields: " + missingFields.join(", ") };
  }
  return { valid: true, message: "" };
}

function updatePricingDataRow(rowId, field, value) {
  const row = pricingDataRows.find((item) => item.id === rowId);
  if (!row) return;
  row[field] = value;

  if (field === "division") {
    const allowedHeadingIds = new Set(getPricingHeadingEntriesForDivision(value).map((entry) => String(entry.id)));
    const allowedMaterialIds = new Set(getMaterialsForDivision(value).map((entry) => String(entry.id)));
    row.pricingHeadingId = allowedHeadingIds.has(String(row.pricingHeadingId || "")) ? row.pricingHeadingId : "";
    row.materialId = allowedMaterialIds.has(String(row.materialId || "")) ? row.materialId : "";
    pricingDataValidationMessage = "";
    persistPricingDataState();
    renderPricingDataTable();
    return;
  }

  if (field === "materialId" && row.division && row.materialId && !isMaterialAllowedForDivision(row.division, row.materialId)) {
    row.materialId = "";
    pricingDataValidationMessage = "Material Description was reset because it does not belong to the selected Division.";
  } else if (field === "pricingHeadingId" && row.division && row.pricingHeadingId && !isPricingHeadingAllowedForDivision(row.division, row.pricingHeadingId)) {
    row.pricingHeadingId = "";
    pricingDataValidationMessage = "Pricing Heading was reset because it does not belong to the selected Division.";
  } else {
    pricingDataValidationMessage = "";
  }

  persistPricingDataState();
}

function updateSavedPricingRow(rowId, field, value) {
  const row = savedPricingRecords.find((item) => item.id === rowId);
  if (!row) return;
  row[field] = value;

  if (field === "division") {
    const allowedHeadingIds = new Set(getPricingHeadingEntriesForDivision(value).map((entry) => String(entry.id)));
    const allowedMaterialIds = new Set(getMaterialsForDivision(value).map((entry) => String(entry.id)));
    row.pricingHeadingId = allowedHeadingIds.has(String(row.pricingHeadingId || "")) ? row.pricingHeadingId : "";
    row.materialId = allowedMaterialIds.has(String(row.materialId || "")) ? row.materialId : "";
    persistPricingDataState();
    renderSavedPricingRecordsPanel();
    return;
  }

  if (field === "materialId" && row.division && row.materialId && !isMaterialAllowedForDivision(row.division, row.materialId)) {
    row.materialId = "";
  }

  persistPricingDataState();
}

function handleAddPricingDataRow() {
  const newRow = createPricingDataRow();
  if (pricingDataRows.length > 0 && isFirstRowComplete()) {
    copyFirstRowValuesToRow(pricingDataRows[0], newRow);
  }
  pricingDataRows = [...pricingDataRows, newRow];
  pricingDataValidationMessage = "";
  persistPricingDataState();
  renderPricingDataTable();
}

function handleDeletePricingDataRow(rowId) {
  const confirmed = window.confirm("Are you sure you want to delete this row?");
  if (!confirmed) return;
  pricingDataRows = pricingDataRows.filter((row) => row.id !== rowId);
  if (pricingDataRows.length === 0) {
    pricingDataRows = [createPricingDataRow()];
  }
  firstRowAutoCopied = false;
  pricingDataValidationMessage = "";
  persistPricingDataState();
  renderPricingDataTable();
}

function handleSavePricingDataRows() {
  if (pricingDataRows.length === 0) {
    pricingDataValidationMessage = "Please add at least one pricing record.";
    renderPricingDataTable();
    return;
  }

  if (!validatePricingDataBeforeSave()) {
    pricingDataValidationMessage = "Please complete all required fields before saving.";
    renderPricingDataTable();
    return;
  }

  const serverErrors = simulateServerSideValidation(pricingDataRows);
  if (serverErrors.length) {
    pricingDataValidationMessage = "Server validation failed. Please correct the highlighted fields.";
    const container = document.querySelector(".entry-table-wrapper");
    if (container) {
      const tbody = container.querySelector("tbody");
      if (tbody) {
        const rows = tbody.querySelectorAll("tr");
        serverErrors.forEach((err) => {
          const row = rows[err.row - 1];
          if (!row) return;
          const fieldMeta = MASTER_FIELDS.find((f) => f.key === err.field);
          if (!fieldMeta) return;
          const field = row.querySelector(fieldMeta.selector);
          if (field) showFieldError(field);
        });
        const firstErr = serverErrors[0];
        const firstRow = rows[firstErr.row - 1];
        if (firstRow) {
          const firstFieldMeta = MASTER_FIELDS.find((f) => f.key === firstErr.field);
          if (firstFieldMeta) {
            const firstField = firstRow.querySelector(firstFieldMeta.selector);
            if (firstField) {
              firstField.focus();
              firstField.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }
        }
      }
    }
    renderPricingDataTable();
    return;
  }

  const mismatchRows = pricingDataRows.filter((row) => row.division && row.pricingHeadingId && !isPricingHeadingAllowedForDivision(row.division, row.pricingHeadingId));
  if (mismatchRows.length) {
    pricingDataValidationMessage = `Pricing Heading mismatch detected: one or more rows have a heading that does not belong to the selected Division. Please fix before saving.`;
    renderPricingDataTable();
    return;
  }

  const duplicateValidation = validatePricingDataRows();
  if (!duplicateValidation.valid) {
    pricingDataValidationMessage = duplicateValidation.message;
    renderPricingDataTable();
    return;
  }

  const allRowsComplete = pricingDataRows.every(isPricingDataRowComplete);
  if (!allRowsComplete) {
    pricingDataValidationMessage = "Please complete all fields in every row before saving.";
    renderPricingDataTable();
    return;
  }

  const saveBtn = document.getElementById("savePricingDataBtn");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
  }

  try {
    const rowsToSave = [...pricingDataRows];
    const batchAprNumber = generateAprNumber(rowsToSave[0].financialYearId);
    savedPricingRecords = [
      ...savedPricingRecords,
      ...rowsToSave.map((row, index) => ({ ...row, aprNumber: batchAprNumber, slNo: String(index + 1) })),
    ];

    pricingDataRows = [createPricingDataRow()];
    pricingDataValidationMessage = `${rowsToSave.length} row${rowsToSave.length !== 1 ? "s" : ""} saved successfully.`;
    persistPricingDataState();
    renderPricingDataTable();
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
    }
  }
}

function handleEditCompletedPricingRecord(recordId) {
  const completedRecord = completedPricingRecords.find((item) => item.id === recordId);
  if (!completedRecord) return;

  savedPricingRecords = [
    ...savedPricingRecords,
    {
      ...completedRecord,
      id: completedRecord.originalId || completedRecord.id,
      completedAt: "",
      completedId: "",
      status: "",
    },
  ];
  completedPricingRecords = completedPricingRecords.filter((item) => item.id !== recordId);
  pricingDataValidationMessage = "Completed record moved back to Saved Pricing Records for editing.";
  persistPricingDataState();
  renderPricingDataTable();
}

function handleDeleteCompletedPricingRecord(recordId) {
  completedPricingRecords = completedPricingRecords.filter((item) => item.id !== recordId);
  pricingDataValidationMessage = "Completed record deleted.";
  persistPricingDataState();
}

function renderReportsPanel() {
  const adminBtnLabel = isAdminAuthenticated ? "Admin Mode: ON" : "Admin Login";
  const filteredReports = getFilteredReportRecords();
  const hasActiveFilters = Object.values(reportRecordFilters).some((f) => f?.active);
  const tree = buildReportDrillDownTree(filteredReports);

  const headerCells = REPORT_COLS.map((col) => {
    const isActive = reportRecordFilters[col.key]?.active;
    return `<th class="${isActive ? "col-filter-active" : ""}">
      <span class="th-label">${col.label}</span>
      <button type="button" class="report-filter-btn" data-report-filter-col="${col.key}" title="Filter ${col.label}">&#9660;</button>
    </th>`;
  }).join("");

  const drillDownHtml = tree.length
    ? tree.map((node) => renderReportDrillDownNode(node, 0)).join("")
    : `<div class="empty-state">${completedPricingRecords.length ? "No records match the current filters." : "No completed records available yet."}</div>`;

  masterDataPanel.innerHTML = `
    <div class="master-data-card pricing-data-card">
      <div class="panel-heading">
        <h2>REPORTS</h2>
        <p>Completed pricing records are displayed here. Records are read-only.</p>
      </div>
      <div class="table-actions" style="margin-bottom:8px;flex-shrink:0;">
        <button type="button" class="${isAdminAuthenticated ? "complete-btn" : "secondary-btn"}" id="adminLoginBtn">${adminBtnLabel}</button>
        ${isAdminAuthenticated ? '<button type="button" class="secondary-btn" id="adminLogoutBtn">Logout Admin</button>' : ""}
        ${hasActiveFilters ? '<button type="button" class="secondary-btn" id="clearAllReportFiltersBtn">Clear All Filters</button>' : ""}
        <button type="button" class="secondary-btn" id="expandAllReportsBtn">Expand All</button>
         <button type="button" class="secondary-btn" id="collapseAllReportsBtn">Collapse All</button>
         <button type="button" class="secondary-btn" id="printPreviewBtn">Print Preview</button>
         <button type="button" class="secondary-btn" id="exportExcelBtn">Export to Excel</button>
      </div>
      <div class="table-wrapper saved-table-wrapper report-drill-wrapper">
        ${drillDownHtml}
      </div>
    </div>
  `;
}
function renderMisPanel() {
  const source = completedPricingRecords.map((row, index) => ({ row, values: getReportRowDisplayValues(row, index) }));
  const optionsFor = (key) => key === "category"
    ? [...new Set(categoryEntries.map((e) => e.name).filter((value) => value !== "" && value != null))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))
    : [...new Set(source.map((item) => item.values[key]).filter((value) => value !== "" && value != null))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  const activeFilters = MIS_FILTERS.reduce((filters, filter) => ({ ...filters, [filter.key]: misFilters[filter.key] || [] }), {});

  const MIS_TABLE_COLS = [
    { key: "aprNumber",      label: "APR No." },
    { key: "slNo",           label: "Sl. No." },
    { key: "division",       label: "Division" },
    { key: "state",          label: "State" },
    { key: "financialYear",  label: "Financial Year" },
    { key: "period",         label: "Period" },
    { key: "category",    label: "CATEGORY" },
    { key: "material",       label: "Material Description" },
    { key: "pricingHeading", label: "Pricing Heading" },
    { key: "unitRate",       label: "Unit Rate" },
    { key: "batchNo",        label: "Batch No." },
    { key: "value",          label: "Value / Amount / Text" },
    { key: "remarks",        label: "Remarks" },
    { key: "approvingAuthority", label: "Approving Authority" },
    { key: "dateOfApproval", label: "Date of Approval" },
    { key: "refNoteOfApproval", label: "Ref. Note of Approval" },
    { key: "completedAt",    label: "Completed On" },
    { key: "completedId",    label: "Completed ID" },
  ];

  // Filter panel HTML
  const filterHtml = MIS_FILTERS.map((filter) => {
    const options = optionsFor(filter.key), selected = activeFilters[filter.key];
    const selectedCount = selected.length;
    return `<div class="mis-filter" data-mis-filter-wrap="${filter.key}"><label>${filter.label}</label><button type="button" class="mis-filter-toggle" data-mis-filter-toggle="${filter.key}" aria-expanded="false">${selectedCount ? `${selectedCount} selected` : "All values"}<span>âŒ„</span></button><div class="mis-filter-menu" id="misFilterMenu-${filter.key}" hidden><input class="mis-filter-search" data-mis-search="${filter.key}" placeholder="Search ${filter.label}" /><div class="mis-filter-menu-actions"><button type="button" data-mis-select-all="${filter.key}">Select All</button><button type="button" data-mis-clear-filter="${filter.key}">Clear</button></div><div class="mis-filter-options">${options.map((option) => `<label data-mis-option="${filter.key}"><input type="checkbox" data-mis-filter="${filter.key}" value="${escapeHtml(option)}" ${selected.includes(String(option)) ? "checked" : ""}> <span>${escapeHtml(option)}</span></label>`).join("") || '<span class="mis-no-options">No report data available</span>'}</div></div></div>`;
  }).join("");

  // Build results section only when misApplied is true
  let resultsHtml = "";
  if (misApplied) {
    const hasAnyFilter = MIS_FILTERS.some((f) => (activeFilters[f.key] || []).length > 0);
    if (!hasAnyFilter) {
      resultsHtml = `<div class="mis-no-filter-msg">Please select at least one filter before generating the MIS.</div>`;
    } else {
      // Apply filters: within same filter = OR, between filters = AND
      const filtered = source.filter((item) => MIS_FILTERS.every((filter) => {
        const selected = activeFilters[filter.key];
        return !selected.length || selected.includes(String(item.values[filter.key] || ""));
      }));
      const allRecords = filtered.map((item) => item.values);

      // Applied filter summary
      const appliedSummary = MIS_FILTERS
        .filter((f) => (activeFilters[f.key] || []).length > 0)
        .map((f) => `<span class="mis-applied-tag"><strong>${escapeHtml(f.label)}:</strong> ${activeFilters[f.key].map(escapeHtml).join(", ")}</span>`)
        .join("");

      // Search within results
      const searched = misTableSearch
        ? allRecords.filter((r) => Object.values(r).join(" ").toLowerCase().includes(misTableSearch.toLowerCase()))
        : allRecords;

      // Sort
      const sortKey = misTableSort.key || "aprNumber";
      const sorted = [...searched].sort((a, b) => {
        const l = String(a[sortKey] || ""), r = String(b[sortKey] || "");
        const res = l.localeCompare(r, undefined, { numeric: true });
        return misTableSort.asc ? res : -res;
      });

      // Paginate
      const pageSize = 20;
      const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
      misTablePage = Math.min(misTablePage, pageCount);
      const pageRows = sorted.slice((misTablePage - 1) * pageSize, misTablePage * pageSize);

      const thead = MIS_TABLE_COLS.map((col) => {
        const arrow = misTableSort.key === col.key ? (misTableSort.asc ? " â–²" : " â–¼") : "";
        return `<th><button type="button" class="mis-sort" data-mis-sort="${col.key}">${escapeHtml(col.label)}${arrow}</button></th>`;
      }).join("");

      const tbody = pageRows.length
        ? pageRows.map((r) => `<tr>${MIS_TABLE_COLS.map((col) => `<td>${escapeHtml(r[col.key] || "")}</td>`).join("")}</tr>`).join("")
        : `<tr><td colspan="${MIS_TABLE_COLS.length}" class="empty-state">No records found for the selected filter criteria.</td></tr>`;

      resultsHtml = `
        <div class="mis-applied-filters">${appliedSummary}</div>
        <div class="mis-table-tools">
          <span class="mis-record-count">Filtered Records: <strong>${allRecords.length}</strong>${misTableSearch ? ` &nbsp;Â·&nbsp; Showing: <strong>${searched.length}</strong>` : ""}</span>
          <input id="misTableSearch" value="${escapeHtml(misTableSearch)}" placeholder="Search within resultsâ€¦" />
        </div>
        <div class="saved-table-wrapper mis-result-table-wrap">
          <table class="master-data-table pricing-data-table mis-result-table">
            <thead><tr>${thead}</tr></thead>
            <tbody>${tbody}</tbody>
          </table>
        </div>
        <div class="mis-pagination">
          <button type="button" class="secondary-btn" id="misPrevBtn" ${misTablePage === 1 ? "disabled" : ""}>Previous</button>
          <span>Page ${misTablePage} of ${pageCount} &nbsp;Â·&nbsp; ${sorted.length} record${sorted.length !== 1 ? "s" : ""}</span>
          <button type="button" class="secondary-btn" id="misNextBtn" ${misTablePage === pageCount ? "disabled" : ""}>Next</button>
        </div>`;
    }
  }

  masterDataPanel.innerHTML = `
    <div class="master-data-card mis-dashboard">
      <div class="panel-heading"><h2>MIS ANALYTICAL DASHBOARD</h2><p>Select filters and click Apply Filters to retrieve matching Records.</p></div>
      <section class="mis-filter-panel">
        <div class="mis-filter-grid">${filterHtml}</div>
        <div class="table-actions mis-controls">
          <button type="button" class="add-row-btn" id="misApplyBtn">Apply Filters</button>
          <button type="button" class="secondary-btn" id="misClearBtn">Clear / Reset Filters</button>
          ${misApplied ? `<button type="button" class="secondary-btn" id="misExportBtn">Export CSV</button><button type="button" class="secondary-btn" id="misPrintBtn">Print</button>` : ""}
        </div>
      </section>
      ${resultsHtml}
    </div>`;
  refreshMISScrollLayout();
}

function refreshMISScrollLayout() {
  const misPanel = document.querySelector('.mis-dashboard');
  const tableWrapper = document.querySelector('.mis-result-table-wrap');
  const pagination = document.querySelector('.mis-pagination');

  if (misPanel) {
    misPanel.style.height = 'auto';
    misPanel.style.maxHeight = 'none';
    misPanel.style.overflow = 'visible';
  }

  if (tableWrapper) {
    tableWrapper.style.maxHeight = 'none';
    tableWrapper.style.overflowY = 'visible';
    tableWrapper.style.overflowX = 'auto';
  }

  if (pagination) {
    pagination.style.display = 'flex';
    pagination.style.visibility = 'visible';
  }
}

function formatDateOnly(dateString) {
  if (!dateString) return "";
  const parts = dateString.split(",");
  return parts[0].trim();
}

function toDateInputValue(dateString) {
  if (!dateString) return "";
  const parts = dateString.split(",");
  const datePart = parts[0].trim();
  const match = datePart.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const [, a, b, year] = match;
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    let month, day;
    if (numA > 12) {
      day = String(numA).padStart(2, '0');
      month = String(numB).padStart(2, '0');
    } else if (numB > 12) {
      month = String(numA).padStart(2, '0');
      day = String(numB).padStart(2, '0');
    } else {
      month = String(numA).padStart(2, '0');
      day = String(numB).padStart(2, '0');
    }
    return `${year}-${month}-${day}`;
  }
  const date = new Date(datePart);
  if (!isNaN(date.getTime())) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  return datePart;
}

function formatDateDisplay(dateString) {
  if (!dateString) return "";
  const parts = dateString.split(",");
  const datePart = parts[0].trim();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  
  // Handle YYYY-MM-DD (HTML date input format)
  const isoMatch = datePart.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${String(day).padStart(2, '0')}-${months[parseInt(month, 10) - 1]}-${year}`;
  }
  
  // Handle MM/DD/YYYY or DD/MM/YYYY
  const match = datePart.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const [, a, b, year] = match;
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    let month, day;
    if (numA > 12) {
      day = String(numA).padStart(2, '0');
      month = months[numB - 1];
    } else if (numB > 12) {
      month = months[numA - 1];
      day = String(numB).padStart(2, '0');
    } else {
      month = months[numA - 1];
      day = String(numB).padStart(2, '0');
    }
    return `${day}-${month}-${year}`;
  }
  
  const date = new Date(datePart);
  if (!isNaN(date.getTime())) {
    return `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${date.getFullYear()}`;
  }
  return datePart;
}

function generateAprNumber(financialYearId) {
  const financialYear = financialYearEntries.find((e) => e.id === financialYearId)?.year || "";
  const startYearMatch = financialYear.match(/^(\d{4})/);
  const startYear = startYearMatch ? startYearMatch[1] : "";
  const prefix = startYear ? `APR-${startYear}-` : `APR-`;
  const existingRecords = [...savedPricingRecords, ...completedPricingRecords];
  const maxSeq = existingRecords.reduce((max, r) => {
    if (!r.aprNumber || !r.aprNumber.startsWith(prefix)) return max;
    const suffix = r.aprNumber.slice(prefix.length);
    const num = parseInt(suffix, 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return `${prefix}${maxSeq + 1}`;
}

function getCircularDraftsList() {
  return getStoredValue("circularDrafts", []).filter((draft) => draft && draft.aprNumber && (!draft.status || draft.status === "draft"));
}

function getCircularDraftRecord(aprNumber) {
  return getCircularDraftsList().find((draft) => draft.aprNumber === aprNumber) || null;
}

function isCircularDraft(aprNumber) {
  return Boolean(getCircularDraftRecord(aprNumber));
}

function isCircularAlreadyCreated(aprNumber) {
  const circularDrafts = getStoredValue("circularDrafts", []);
  const draftMatch = circularDrafts.find((draft) => draft.aprNumber === aprNumber && draft.status === "created");
  if (draftMatch) return true;

  const checkStatus = getStoredValue("circularCheckStatus", {});
  const status = checkStatus[aprNumber]?.status;
  return Boolean(status) && status !== "draft";
}

function getCreateCircularCandidates() {
  return completedPricingRecords.filter((r) => r.aprNumber && !isCircularAlreadyCreated(r.aprNumber) && !isCircularDraft(r.aprNumber));
}

function loadDraftCircularIntoForm(aprNumber) {
  const draft = getCircularDraftRecord(aprNumber);
  if (!draft) return;

  printCircularSelectedApr = draft.aprNumber || "";
  printCircularSelectedFinancialYear = draft.financialYearId || "";
  printCircularSelectedDivision = draft.division || "";
  printCircularSelectedState = draft.stateId || "";
  printCircularSelectedMaterial = draft.materialId || "";
  printCircularCcText = draft.ccText || "";
  printCircularSignatoryText = draft.signatoryText || "Dy. General Manager (Fin.)\nAuthorized Signatory";
  printCircularTermsHtml = draft.termsHtml || "";
  printCircularIntroText = draft.introText || "The following pricing and sales terms have been approved for details mentioned above.";
  printCircularDateOfCircular = draft.dateOfCircular || "";
  printCircularEffectiveFrom = draft.effectiveFrom || "";
  draftCircularEditMode = true;
}

function renderPrintCircularPanel() {
  // Check if we're in EDIT MODE for a pending approval circular or checker-originated edit flow
  const isEditMode = selectedCircularForCheck && (selectedCircularForCheck.checkerLevel === "approver_edit" || selectedCircularForCheck.editingFromChecker === true);
  const isDraftEditMode = draftCircularEditMode && printCircularSelectedApr && isCircularDraft(printCircularSelectedApr);

  let filterHtml = "";
  let noAprMessage = "";

  // Only show filters if NOT in edit mode
  if (!isEditMode && !isDraftEditMode) {
    const pendingRecords = getCreateCircularCandidates();

    const getUniqueValues = (records, key) => [...new Set(records.map((r) => r[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

    const financialYears = getUniqueValues(pendingRecords, "financialYearId");
    const divisions = printCircularSelectedFinancialYear
      ? getUniqueValues(pendingRecords.filter((r) => r.financialYearId === printCircularSelectedFinancialYear), "division")
      : [];
    const states = printCircularSelectedFinancialYear && printCircularSelectedDivision
      ? getUniqueValues(pendingRecords.filter((r) => r.financialYearId === printCircularSelectedFinancialYear && r.division === printCircularSelectedDivision), "stateId")
      : [];
    const materials = printCircularSelectedFinancialYear && printCircularSelectedDivision && printCircularSelectedState
      ? getUniqueValues(pendingRecords.filter((r) => r.financialYearId === printCircularSelectedFinancialYear && r.division === printCircularSelectedDivision && r.stateId === printCircularSelectedState), "materialId")
      : [];
    const aprNumbers = printCircularSelectedFinancialYear && printCircularSelectedDivision && printCircularSelectedState && printCircularSelectedMaterial
      ? getUniqueValues(pendingRecords.filter((r) => r.financialYearId === printCircularSelectedFinancialYear && r.division === printCircularSelectedDivision && r.stateId === printCircularSelectedState && r.materialId === printCircularSelectedMaterial), "aprNumber")
      : [];
    const pendingAprNumbers = aprNumbers.filter((apr) => !isCircularAlreadyCreated(apr) && !isCircularDraft(apr));

    if (printCircularSelectedApr && !pendingAprNumbers.includes(printCircularSelectedApr)) {
      printCircularSelectedApr = "";
    }

    const financialYearOptions = financialYears.map((fy) => {
      const fyDisplay = financialYearEntries.find((e) => e.id === fy)?.year || fy;
      return `<option value="${escapeHtml(fy)}" ${printCircularSelectedFinancialYear === fy ? "selected" : ""}>${escapeHtml(fyDisplay)}</option>`;
    }).join("");

    const divisionOptions = divisions.map((d) => `<option value="${escapeHtml(d)}" ${printCircularSelectedDivision === d ? "selected" : ""}>${escapeHtml(d)}</option>`).join("");
    const stateOptions = states.map((s) => {
      const stateDisplay = stateNameEntries.find((e) => e.id === s)?.name || s;
      return `<option value="${escapeHtml(s)}" ${printCircularSelectedState === s ? "selected" : ""}>${escapeHtml(stateDisplay)}</option>`;
    }).join("");
    const materialOptions = materials.map((m) => {
      const materialDisplay = masterDataEntries.find((e) => e.id === m)?.description || m;
      return `<option value="${escapeHtml(m)}" ${printCircularSelectedMaterial === m ? "selected" : ""}>${escapeHtml(materialDisplay)}</option>`;
    }).join("");
    const aprOptions = pendingAprNumbers.map((apr) => `<option value="${escapeHtml(apr)}" ${printCircularSelectedApr === apr ? "selected" : ""}>${escapeHtml(apr)}</option>`).join("");
    const draftCirculars = getCircularDraftsList();
    const draftOptions = draftCirculars.map((draft) => `<option value="${escapeHtml(draft.aprNumber || "")}" ${printCircularSelectedApr === draft.aprNumber ? "selected" : ""}>${escapeHtml(draft.aprNumber || "")}</option>`).join("");

    filterHtml = `
      <div class="pricing-heading-form" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:12px;">
        <select id="printCircularFinancialYearSelect" ${financialYears.length ? "" : "disabled"}>
          <option value="">Select Financial Year</option>
          ${financialYearOptions}
        </select>
        <select id="printCircularDivisionSelect" ${divisions.length ? "" : "disabled"}>
          <option value="">Select Division</option>
          ${divisionOptions}
        </select>
        <select id="printCircularStateSelect" ${states.length ? "" : "disabled"}>
          <option value="">Select State</option>
          ${stateOptions}
        </select>
        <select id="printCircularMaterialSelect" ${materials.length ? "" : "disabled"}>
          <option value="">Select Material</option>
          ${materialOptions}
        </select>
        <select id="printCircularAprSelect" ${pendingAprNumbers.length ? "" : "disabled"}>
          <option value="">Select APR No.</option>
          ${aprOptions}
        </select>
      </div>
      <div class="pricing-heading-form" style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:12px;">
        <label for="draftCircularSelect" style="font-weight:600;">DRAFT CIRCULARS</label>
        <select id="draftCircularSelect">
          <option value="">Select Draft Circular</option>
          ${draftOptions}
        </select>
      </div>`;

    noAprMessage = !printCircularSelectedApr
      ? `<div class="empty-state" style="padding:40px 20px;font-size:1.1rem">Please select all filters and APR No. to generate the Pricing Circular.</div>`
      : "";
  } else if (!isEditMode && isDraftEditMode) {
    const draftCirculars = getCircularDraftsList();
    const draftOptions = draftCirculars.map((draft) => `<option value="${escapeHtml(draft.aprNumber || "")}" ${printCircularSelectedApr === draft.aprNumber ? "selected" : ""}>${escapeHtml(draft.aprNumber || "")}</option>`).join("");
    filterHtml = `
      <div class="pricing-heading-form" style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:12px;">
        <label for="draftCircularSelect" style="font-weight:600;">DRAFT CIRCULARS</label>
        <select id="draftCircularSelect">
          <option value="">Select Draft Circular</option>
          ${draftOptions}
        </select>
      </div>`;
  }

  const selectedAprRecords = printCircularSelectedApr
    ? completedPricingRecords.filter((r) => r.aprNumber === printCircularSelectedApr)
    : [];
  const records = selectedAprRecords.map((row, index) => getReportRowDisplayValues(row, index));

  let circularHeader = "";
  if (selectedAprRecords.length > 0) {
    const first = records[0];
    const uniqueMaterials = [...new Set(selectedAprRecords.map((r) => r.materialId).filter(Boolean))].map((mid) => masterDataEntries.find((m) => m.id === mid)?.description).filter(Boolean);
    const uniqueBatchNos = [...new Set(selectedAprRecords.map((r) => r.batchNo).filter(Boolean))];
    const uniqueCategories = [...new Set(selectedAprRecords.map((r) => r.category).filter(Boolean))].join(", ") || "";
    const dateOfApprovalRaw = selectedAprRecords[0].completedAt || "";
    const dateOfApproval = formatDateDisplay(dateOfApprovalRaw);
    const approvingAuthority = [...new Set(selectedAprRecords.map((r) => r.approvingAuthority).filter(Boolean))].join(", ") || "";
    const refNoteOfApproval = [...new Set(selectedAprRecords.map((r) => r.refNoteOfApproval).filter(Boolean))].join(", ") || "";

    if (!printCircularDateOfCircular) {
      printCircularDateOfCircular = toDateInputValue(dateOfApprovalRaw);
    }
    if (!printCircularEffectiveFrom) {
      printCircularEffectiveFrom = printCircularDateOfCircular;
    }

    circularHeader = `
      <table class="circular-header-table">
        <tr>
          <td class="circular-header-label">APR No. :-</td>
          <td class="circular-header-value">${escapeHtml(first.aprNumber || "")}</td>
          <td class="circular-header-label">Division :-</td>
          <td class="circular-header-value">${escapeHtml(first.division || "")}</td>
          <td class="circular-header-label">Approving Authority :-</td>
          <td class="circular-header-value">${escapeHtml(approvingAuthority)}</td>
        </tr>
        <tr>
          <td class="circular-header-label">Date of Circular :-</td>
          <td class="circular-header-value"><input type="date" class="circular-date-input" id="circularDateOfCircular" value="${escapeHtml(printCircularDateOfCircular || "")}" /></td>
          <td class="circular-header-label">State :-</td>
          <td class="circular-header-value">${escapeHtml(first.state || "")}</td>
          <td class="circular-header-label">Period :-</td>
          <td class="circular-header-value">${escapeHtml(first.period || "")}</td>
        </tr>
        <tr>
          <td class="circular-header-label">Effective From :-</td>
          <td class="circular-header-value"><input type="date" class="circular-date-input" id="circularEffectiveFrom" value="${escapeHtml(printCircularEffectiveFrom || "")}" /></td>
          <td class="circular-header-label">Material Description :-</td>
          <td class="circular-header-value">${escapeHtml(uniqueMaterials.join(", ") || "")}</td>
          <td class="circular-header-label">Ref. Note of Approval :-</td>
          <td class="circular-header-value">${escapeHtml(refNoteOfApproval)}</td>
        </tr>
        <tr>
          <td class="circular-header-label">Financial Year :-</td>
          <td class="circular-header-value">${escapeHtml(first.financialYear || "")}</td>
          <td class="circular-header-label">Batch No. :-</td>
          <td class="circular-header-value">${escapeHtml(uniqueBatchNos.join(", ") || "")}</td>
          <td class="circular-header-label">Category :-</td>
          <td class="circular-header-value">${escapeHtml(uniqueCategories)}</td>
        </tr>
      </table>`;
  }

  const thead = `
    <tr>
      <th class="col-slno">Sl. No.</th>
      <th class="col-heading">Pricing Heading</th>
      <th class="col-value">Value / Amount / Text</th>
      <th class="col-remarks">Remarks</th>
    </tr>`;

  const tbody = records.length
    ? records.map((r, i) => `
        <tr>
          <td class="col-slno">${escapeHtml(r.slNo || "")}</td>
          <td class="col-heading">${escapeHtml(r.pricingHeading || "")}</td>
          <td class="col-value">${formatMultilineText(r.value)}</td>
          <td class="col-remarks">${escapeHtml(r.remarks || "")}</td>
        </tr>
      `).join("")
    : "";

  const isCheckerEditMode = selectedCircularForCheck && selectedCircularForCheck.editingFromChecker === true;
  const isReturnedCorrectionEditMode = selectedCircularForCheck && selectedCircularForCheck.checkerLevel === "preparer" && selectedCircularForCheck.fromReturnedCorrection === true && selectedCircularForCheck.editingFromChecker === true;
  const pageTitle = isEditMode ? "EDIT CIRCULAR" : isReturnedCorrectionEditMode ? "EDIT CIRCULAR" : isCheckerEditMode ? "EDIT CIRCULAR" : isDraftEditMode ? "EDIT DRAFT CIRCULAR" : "CREATE CIRCULAR";
  const pageSubtitle = isEditMode ? `Editing APR No.: ${escapeHtml(printCircularSelectedApr)}` : isReturnedCorrectionEditMode ? `Editing APR No.: ${escapeHtml(printCircularSelectedApr)} for returned-correction review` : isCheckerEditMode ? `Editing APR No.: ${escapeHtml(printCircularSelectedApr)} for ${escapeHtml(currentCheckerLevel === "checker1" ? "Checker-1" : "Checker-2")}` : isDraftEditMode ? `Editing Draft APR No.: ${escapeHtml(printCircularSelectedApr)}` : "Select filters and APR No. to generate the pricing circular.";

  masterDataPanel.innerHTML = `
    <div class="master-data-card pricing-data-card print-circular-card">
      <div class="panel-heading">
        <h2>${pageTitle}</h2>
        <p>${pageSubtitle}</p>
      </div>
      ${filterHtml}
      ${noAprMessage}
      ${circularHeader}
      ${selectedAprRecords.length ? `
      <div class="circular-intro-editor" contenteditable="true">${escapeHtml(printCircularIntroText || "")}</div>
      <div class="circular-section-title">Pricing Details</div>
      <div class="table-wrapper saved-table-wrapper">
        <table class="master-data-table pricing-data-table">
          <thead><tr>${thead}</thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
        <div class="circular-gst">GST will be charged extra as applicable.</div>
       <div class="circular-terms">
         <div class="circular-terms-label">Other terms and conditions</div>
          <div class="circular-terms-editor" contenteditable="true" placeholder="Enter other terms and conditions">${printCircularTermsHtml || ""}</div>
        </div>
        <div style="text-align: right; margin-top: 20px;">
          <textarea class="circular-signatory-textarea" placeholder="Enter signatory details">${escapeHtml(printCircularSignatoryText || "")}</textarea>
        </div>
      <div style="text-align: left; margin-top: 10px;">To State Incharge (Mktg.) / State Finance Incharge</div>
        <div class="circular-cc">
          <div class="circular-cc-label">CC To</div>
          <textarea class="circular-cc-textarea" placeholder="Enter Name / Designation / Department / Address">${escapeHtml(printCircularCcText || "")}</textarea>
        </div>
         <div class="circular-page-footer">© ${new Date().getFullYear()} Pricing Data Portal | All Rights Reserved</div>
         <div class="table-actions pricing-data-actions" style="margin-top:12px">
           ${isEditMode && !isCheckerEditMode ? `
             <button type="button" class="btn-create" id="approverSaveEditBtn">Save/Update</button>
             <button type="button" class="btn-approve" id="approverApproveBtn">Approve</button>
             <button type="button" class="secondary-btn" id="cancelApproverEditBtn">Cancel</button>
           ` : isReturnedCorrectionEditMode ? `
             <button type="button" class="btn-create" id="returnedCircularSaveBtn">SAVE</button>
             <button type="button" class="secondary-btn" id="returnedCircularBackBtn">BACK</button>
           ` : isCheckerEditMode ? `
             <button type="button" class="btn-create" id="checkerEditSaveBtn">Save/Update</button>
             <button type="button" class="secondary-btn" id="backToCheckCircularBtn">BACK</button>
             <button type="button" class="btn-pass" id="checkerEditPassBtn">CHECKED & PASSED</button>
           ` : `
             <button type="button" class="btn-create" id="printCircularCreateBtn">Create Circular</button>
             <button type="button" class="add-row-btn" id="printCircularSaveDraftBtn">${isDraftEditMode ? "Save Draft / Update Draft" : "Save Draft"}</button>
             <button type="button" class="add-row-btn" id="printCircularPrintBtn">Print Circular</button>
             ${isDraftEditMode ? '<button type="button" class="secondary-btn" id="cancelDraftCircularEditBtn">Cancel</button>' : ""}
           `}
          </div>
        ` : ""}
    </div>
  `;

  // Add event listeners for select filters only in CREATE mode
  if (!isEditMode) {
    const fySelect = masterDataPanel.querySelector("#printCircularFinancialYearSelect");
    if (fySelect) {
      fySelect.addEventListener("change", () => {
        printCircularSelectedFinancialYear = fySelect.value;
        printCircularSelectedDivision = "";
        printCircularSelectedState = "";
        printCircularSelectedMaterial = "";
        printCircularSelectedApr = "";
        renderPrintCircularPanel();
      });
    }

    const divSelect = masterDataPanel.querySelector("#printCircularDivisionSelect");
    if (divSelect) {
      divSelect.addEventListener("change", () => {
        printCircularSelectedDivision = divSelect.value;
        printCircularSelectedState = "";
        printCircularSelectedMaterial = "";
        printCircularSelectedApr = "";
        renderPrintCircularPanel();
      });
    }

    const stateSelect = masterDataPanel.querySelector("#printCircularStateSelect");
    if (stateSelect) {
      stateSelect.addEventListener("change", () => {
        printCircularSelectedState = stateSelect.value;
        printCircularSelectedMaterial = "";
        printCircularSelectedApr = "";
        renderPrintCircularPanel();
      });
    }

    const materialSelect = masterDataPanel.querySelector("#printCircularMaterialSelect");
    if (materialSelect) {
      materialSelect.addEventListener("change", () => {
        printCircularSelectedMaterial = materialSelect.value;
        printCircularSelectedApr = "";
        renderPrintCircularPanel();
      });
    }

    const aprSelect = masterDataPanel.querySelector("#printCircularAprSelect");
    if (aprSelect) {
      aprSelect.addEventListener("change", () => {
        printCircularSelectedApr = aprSelect.value;
        renderPrintCircularPanel();
      });
    }

    const draftSelect = masterDataPanel.querySelector("#draftCircularSelect");
    if (draftSelect) {
      draftSelect.addEventListener("change", () => {
        const selectedDraftApr = draftSelect.value;
        if (!selectedDraftApr) {
          draftCircularEditMode = false;
          printCircularSelectedApr = "";
          renderPrintCircularPanel();
          return;
        }
        loadDraftCircularIntoForm(selectedDraftApr);
        renderPrintCircularPanel();
      });
    }
  }
  const signatoryTextarea = masterDataPanel.querySelector(".circular-signatory-textarea");
  if (signatoryTextarea) {
    signatoryTextarea.style.height = "auto";
    signatoryTextarea.style.height = signatoryTextarea.scrollHeight + "px";
  }
  const termsEditor = masterDataPanel.querySelector(".circular-terms-editor");
  if (termsEditor) {
    termsEditor.style.height = "auto";
    termsEditor.style.height = termsEditor.scrollHeight + "px";
    termsEditor.addEventListener("paste", (e) => {
      const html = e.clipboardData.getData("text/html");
      const text = e.clipboardData.getData("text/plain");
      if (html && html.includes("<table")) {
        e.preventDefault();
        const clean = html.replace(/<\?xml[^>]*>/g, "").replace(/<\/?\w+:[^>]*>/g, "");
        const parser = new DOMParser();
        const doc = parser.parseFromString(clean, "text/html");
        const table = doc.querySelector("table");
        if (table) {
          table.style.width = "100%";
          table.style.borderCollapse = "collapse";
          table.style.tableLayout = "fixed";
          const cells = table.querySelectorAll("td, th");
          cells.forEach((cell) => {
            if (!cell.style.border) cell.style.border = "1px solid #cbd5e1";
            if (!cell.style.padding) cell.style.padding = "6px 8px";
            cell.style.wordWrap = "break-word";
            cell.style.overflowWrap = "anywhere";
            cell.style.whiteSpace = "normal";
            cell.style.verticalAlign = "top";
          });
          const fragment = document.createDocumentFragment();
          const div = document.createElement("div");
          div.appendChild(table);
          while (div.firstChild) {
            fragment.appendChild(div.firstChild);
          }
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(fragment);
            range.collapse(false);
          } else {
            termsEditor.appendChild(fragment);
          }
          printCircularTermsHtml = termsEditor.innerHTML || "";
        } else {
          document.execCommand("insertText", false, text);
          printCircularTermsHtml = termsEditor.innerHTML || "";
        }
      } else {
        document.execCommand("insertHTML", false, text.replace(/\n/g, "<br>"));
        printCircularTermsHtml = termsEditor.innerHTML || "";
      }
    });
    termsEditor.addEventListener("input", () => {
      printCircularTermsHtml = termsEditor.innerHTML || "";
    });
  }
  const introEditor = masterDataPanel.querySelector(".circular-intro-editor");
  if (introEditor) {
    introEditor.style.height = "auto";
    introEditor.style.height = introEditor.scrollHeight + "px";
    introEditor.addEventListener("input", () => {
      printCircularIntroText = introEditor.innerText || introEditor.textContent || "";
    });
  }
  const dateOfCircularInput = masterDataPanel.querySelector("#circularDateOfCircular");
  if (dateOfCircularInput) {
    dateOfCircularInput.addEventListener("change", () => {
      printCircularDateOfCircular = dateOfCircularInput.value || "";
      const effectiveFromInput = masterDataPanel.querySelector("#circularEffectiveFrom");
      if (effectiveFromInput && !effectiveFromInput._userChanged) {
        printCircularEffectiveFrom = printCircularDateOfCircular;
        effectiveFromInput.value = printCircularEffectiveFrom;
      }
    });
  }
  const effectiveFromInput = masterDataPanel.querySelector("#circularEffectiveFrom");
  if (effectiveFromInput) {
    effectiveFromInput._userChanged = false;
    effectiveFromInput.addEventListener("change", () => {
      effectiveFromInput._userChanged = true;
      printCircularEffectiveFrom = effectiveFromInput.value || "";
    });
  }
}

function handleSaveDraftCircular() {
  if (!printCircularSelectedApr) {
    window.alert("Please select an APR No. before saving the draft.");
    return;
  }

  const termsEditor = masterDataPanel.querySelector(".circular-terms-editor");
  const introEditor = masterDataPanel.querySelector(".circular-intro-editor");
  const signatoryTextarea = masterDataPanel.querySelector(".circular-signatory-textarea");
  const ccTextarea = masterDataPanel.querySelector(".circular-cc-textarea");
  const dateOfCircularInput = masterDataPanel.querySelector("#circularDateOfCircular");
  const effectiveFromInput = masterDataPanel.querySelector("#circularEffectiveFrom");

  const draftRecord = getCircularDraftRecord(printCircularSelectedApr);
  const draftData = {
    aprNumber: printCircularSelectedApr,
    financialYearId: printCircularSelectedFinancialYear || draftRecord?.financialYearId || "",
    division: printCircularSelectedDivision || draftRecord?.division || "",
    stateId: printCircularSelectedState || draftRecord?.stateId || "",
    materialId: printCircularSelectedMaterial || draftRecord?.materialId || "",
    termsHtml: termsEditor ? termsEditor.innerHTML : (draftRecord?.termsHtml || printCircularTermsHtml),
    introText: introEditor ? (introEditor.innerText || introEditor.textContent) : (draftRecord?.introText || printCircularIntroText),
    signatoryText: signatoryTextarea ? signatoryTextarea.value : (draftRecord?.signatoryText || printCircularSignatoryText),
    ccText: ccTextarea ? ccTextarea.value : (draftRecord?.ccText || printCircularCcText),
    dateOfCircular: dateOfCircularInput ? dateOfCircularInput.value : (draftRecord?.dateOfCircular || printCircularDateOfCircular),
    effectiveFrom: effectiveFromInput ? effectiveFromInput.value : (draftRecord?.effectiveFrom || printCircularEffectiveFrom),
    status: "draft",
    createdAt: draftRecord?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const circularDrafts = getStoredValue("circularDrafts", []);
  const existingIndex = circularDrafts.findIndex((draft) => draft.aprNumber === printCircularSelectedApr);
  if (existingIndex >= 0) {
    circularDrafts[existingIndex] = { ...circularDrafts[existingIndex], ...draftData };
  } else {
    circularDrafts.push(draftData);
  }

  setStoredValue("circularDrafts", circularDrafts);

  const checkStatus = getStoredValue("circularCheckStatus", {});
  if (checkStatus[printCircularSelectedApr] && checkStatus[printCircularSelectedApr].status === "draft") {
    checkStatus[printCircularSelectedApr] = { status: "draft", checker1: null, checker2: null, createdAt: new Date().toISOString() };
    setStoredValue("circularCheckStatus", checkStatus);
  }

  draftCircularEditMode = true;
  window.alert("Draft circular saved successfully.");
  renderPrintCircularPanel();
}

function handleCreateCircular() {
  if (!printCircularSelectedApr) {
    window.alert("Please select an APR No. before creating the circular.");
    return;
  }

  if (!printCircularSelectedFinancialYear) {
    window.alert("Please select a Financial Year before creating the circular.");
    return;
  }

  if (!printCircularSelectedDivision) {
    window.alert("Please select a Division before creating the circular.");
    return;
  }

  if (!printCircularSelectedState) {
    window.alert("Please select a State before creating the circular.");
    return;
  }

  if (!printCircularSelectedMaterial) {
    window.alert("Please select a Material Description before creating the circular.");
    return;
  }

  const dateOfCircularInput = masterDataPanel.querySelector("#circularDateOfCircular");
  if (!dateOfCircularInput || !dateOfCircularInput.value) {
    window.alert("Please enter the Date of Circular before creating the circular.");
    return;
  }

  const effectiveFromInput = masterDataPanel.querySelector("#circularEffectiveFrom");
  if (!effectiveFromInput || !effectiveFromInput.value) {
    window.alert("Please enter the Effective From date before creating the circular.");
    return;
  }

  const signatoryTextarea = masterDataPanel.querySelector(".circular-signatory-textarea");
  if (!signatoryTextarea || !signatoryTextarea.value.trim()) {
    window.alert("Please enter the Signatory details before creating the circular.");
    return;
  }

  const termsEditor = masterDataPanel.querySelector(".circular-terms-editor");
  const introEditor = masterDataPanel.querySelector(".circular-intro-editor");
  const ccTextarea = masterDataPanel.querySelector(".circular-cc-textarea");

  if (isCircularAlreadyCreated(printCircularSelectedApr)) {
    if (isAdminAuthenticated) {
      const confirmed = window.confirm("This circular has already been created and cannot be created again.\n\nAdministrator override is active. Do you want to proceed with re-creation?");
      if (!confirmed) {
        renderPrintCircularPanel();
        return;
      }
    } else {
      window.alert("This circular has already been created and cannot be created again. Administrator permission is required for any re-creation.");
      renderPrintCircularPanel();
      return;
    }
  }

  const wasAdminOverride = isAdminAuthenticated && isCircularAlreadyCreated(printCircularSelectedApr);

  const draftData = {
    aprNumber: printCircularSelectedApr,
    financialYearId: printCircularSelectedFinancialYear,
    division: printCircularSelectedDivision,
    stateId: printCircularSelectedState,
    materialId: printCircularSelectedMaterial,
    termsHtml: termsEditor ? termsEditor.innerHTML : printCircularTermsHtml,
    introText: introEditor ? (introEditor.innerText || introEditor.textContent) : printCircularIntroText,
    signatoryText: signatoryTextarea ? signatoryTextarea.value : printCircularSignatoryText,
    ccText: ccTextarea ? ccTextarea.value : printCircularCcText,
    dateOfCircular: dateOfCircularInput ? dateOfCircularInput.value : printCircularDateOfCircular,
    effectiveFrom: effectiveFromInput ? effectiveFromInput.value : printCircularEffectiveFrom,
    createdAt: new Date().toISOString(),
    status: "created",
  };

  let circularDrafts = getStoredValue("circularDrafts", []);
  const existingIndex = circularDrafts.findIndex((d) => d.aprNumber === printCircularSelectedApr);
  if (existingIndex >= 0) {
    const existingDraft = circularDrafts[existingIndex];
    circularDrafts[existingIndex] = { ...existingDraft, ...draftData };
  } else {
    circularDrafts.push(draftData);
  }

  setStoredValue("circularDrafts", circularDrafts);

  const checkStatus = getStoredValue("circularCheckStatus", {});
  checkStatus[printCircularSelectedApr] = { status: "checker1_pending", checker1: null, checker2: null, createdAt: new Date().toISOString() };
  setStoredValue("circularCheckStatus", checkStatus);

  const auditTrail = getStoredValue("circularAuditTrail", {});
  if (!auditTrail[printCircularSelectedApr]) {
    auditTrail[printCircularSelectedApr] = [];
  }
  auditTrail[printCircularSelectedApr].push({ 
    action: "created", 
    level: "PREPARER", 
    remarks: wasAdminOverride ? "Circular re-created by Administrator override" : "Circular created and submitted to Checker-1", 
    timestamp: new Date().toISOString(),
    adminOverride: wasAdminOverride || undefined
  });
  setStoredValue("circularAuditTrail", auditTrail);

  draftCircularEditMode = false;
  printCircularSelectedApr = "";
  printCircularSelectedFinancialYear = "";
  printCircularSelectedDivision = "";
  printCircularSelectedState = "";
  printCircularSelectedMaterial = "";
  window.alert("Circular created successfully and submitted to Checker-1 for checking.");
  renderPrintCircularPanel();
}

function renderCheckCircularPanel() {
  const activeTab = checkerActiveTab || "checker1";
  const circularDrafts = getStoredValue("circularDrafts", []);
  const checkStatus = getStoredValue("circularCheckStatus", {});
  const auditTrail = getStoredValue("circularAuditTrail", {});

  const getStatus = (aprNumber) => {
    return checkStatus[aprNumber] || { status: "draft", checker1: null, checker2: null };
  };

  const addAuditEntry = (aprNumber, action, remarks, level) => {
    if (!auditTrail[aprNumber]) {
      auditTrail[aprNumber] = [];
    }
    auditTrail[aprNumber].push({
      action: action,
      level: level,
      remarks: remarks,
      timestamp: new Date().toISOString(),
    });
    setStoredValue("circularAuditTrail", auditTrail);
  };

  const checker1Pending = circularDrafts.filter((d) => {
    const status = getStatus(d.aprNumber);
    return status.status === "checker1_pending" || status.status === "created";
  });

  const checker2Pending = circularDrafts.filter((d) => {
    const status = getStatus(d.aprNumber);
    return status.status === "checker1_confirmed" || status.status === "checker2_pending";
  });

  const returnedForCorrection = circularDrafts.filter((d) => {
    const status = getStatus(d.aprNumber);
    return status.status === "returned_for_correction";
  });

  const approved = circularDrafts.filter((d) => {
    const status = getStatus(d.aprNumber);
    return status.status === "approved";
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      "draft": { label: "DRAFT", class: "status-draft" },
      "created": { label: "CREATED", class: "status-created" },
      "checker1_pending": { label: "CHECKER-1 PENDING", class: "status-pending" },
      "checker1_confirmed": { label: "CHECKER-1 CONFIRMED", class: "status-passed" },
      "checker2_pending": { label: "CHECKER-2 PENDING", class: "status-pending" },
      "checker2_confirmed": { label: "CHECKER-2 CONFIRMED", class: "status-passed" },
      "ready_for_approval": { label: "READY FOR APPROVAL", class: "status-approved" },
      "returned_for_correction": { label: "RETURNED", class: "status-returned" },
    };
    const config = statusConfig[status] || { label: status, class: "status-draft" };
    return `<span class="status-badge ${config.class}">${config.label}</span>`;
  };

  const checker1List = checker1Pending.length
    ? checker1Pending.map((draft, index) => {
        const fyDisplay = financialYearEntries.find((e) => e.id === draft.financialYearId)?.year || draft.financialYearId || "";
        const stateDisplay = stateNameEntries.find((e) => e.id === draft.stateId)?.name || draft.stateId || "";
        const materialDisplay = masterDataEntries.find((e) => e.id === draft.materialId)?.description || draft.materialId || "";
        const status = getStatus(draft.aprNumber);
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(fyDisplay)}</td>
            <td>${escapeHtml(draft.division || "")}</td>
            <td>${escapeHtml(stateDisplay)}</td>
            <td>${escapeHtml(materialDisplay)}</td>
            <td>${escapeHtml(draft.aprNumber || "")}</td>
            <td>${getStatusBadge(status.status)}</td>
            <td>
              <button type="button" class="secondary-btn view-circular-btn" data-apr="${escapeHtml(draft.aprNumber || "")}">View Circular</button>
              <button type="button" class="add-row-btn view-checker1-btn" data-apr="${escapeHtml(draft.aprNumber || "")}">Check</button>
            </td>
          </tr>`;
      }).join("")
    : `<tr><td colspan="8" class="empty-state">No circulars pending for Checker-1.</td></tr>`;

  const checker2List = checker2Pending.length
    ? checker2Pending.map((draft, index) => {
        const fyDisplay = financialYearEntries.find((e) => e.id === draft.financialYearId)?.year || draft.financialYearId || "";
        const stateDisplay = stateNameEntries.find((e) => e.id === draft.stateId)?.name || draft.stateId || "";
        const materialDisplay = masterDataEntries.find((e) => e.id === draft.materialId)?.description || draft.materialId || "";
        const status = getStatus(draft.aprNumber);
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(fyDisplay)}</td>
            <td>${escapeHtml(draft.division || "")}</td>
            <td>${escapeHtml(stateDisplay)}</td>
            <td>${escapeHtml(materialDisplay)}</td>
            <td>${escapeHtml(draft.aprNumber || "")}</td>
            <td>${getStatusBadge(status.status)}</td>
            <td>
              <button type="button" class="secondary-btn view-circular-btn" data-apr="${escapeHtml(draft.aprNumber || "")}">View Circular</button>
              <button type="button" class="add-row-btn view-checker2-btn" data-apr="${escapeHtml(draft.aprNumber || "")}">Check</button>
            </td>
          </tr>`;
      }).join("")
    : `<tr><td colspan="8" class="empty-state">No circulars pending for Checker-2.</td></tr>`;

  const returnedList = returnedForCorrection.length
    ? returnedForCorrection.map((draft, index) => {
        const fyDisplay = financialYearEntries.find((e) => e.id === draft.financialYearId)?.year || draft.financialYearId || "";
        const stateDisplay = stateNameEntries.find((e) => e.id === draft.stateId)?.name || draft.stateId || "";
        const materialDisplay = masterDataEntries.find((e) => e.id === draft.materialId)?.description || draft.materialId || "";
        const status = getStatus(draft.aprNumber);
        const audit = auditTrail[draft.aprNumber] || [];
        const lastReturn = audit.filter((a) => a.action === "returned").pop();
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(draft.aprNumber || "")}</td>
            <td>${escapeHtml(fyDisplay)}</td>
            <td>${escapeHtml(draft.division || "")}</td>
            <td>${escapeHtml(stateDisplay)}</td>
            <td>${escapeHtml(materialDisplay)}</td>
            <td>${escapeHtml(lastReturn?.level || "")}</td>
            <td>${escapeHtml(lastReturn?.remarks || "")}</td>
            <td>${lastReturn ? new Date(lastReturn.timestamp).toLocaleString() : ""}</td>
            <td>${getStatusBadge(status.status)}</td>
            <td>
              <button type="button" class="add-row-btn view-returned-btn" data-apr="${escapeHtml(draft.aprNumber || "")}">View/Correct</button>
            </td>
          </tr>`;
      }).join("")
    : `<tr><td colspan="11" class="empty-state">No circulars returned for correction.</td></tr>`;

  masterDataPanel.innerHTML = `
    <div class="master-data-card pricing-data-card">
      <div class="panel-heading">
        <h2>CHECK CIRCULAR</h2>
        <p>Two-level checking: CHECKER-1 → CHECKER-2 → APPROVED</p>
      </div>

      <div class="checker-tabs">
        <button type="button" class="checker-tab ${activeTab === 'checker1' ? 'active' : ''}" data-tab="checker1">CHECKER-1 QUEUE (${checker1Pending.length})</button>
        <button type="button" class="checker-tab ${activeTab === 'checker2' ? 'active' : ''}" data-tab="checker2">CHECKER-2 QUEUE (${checker2Pending.length})</button>
        <button type="button" class="checker-tab ${activeTab === 'returned' ? 'active' : ''}" data-tab="returned">RETURNED FOR CORRECTION (${returnedForCorrection.length})</button>
      </div>

      <div id="checker1Panel" class="checker-panel ${activeTab === 'checker1' ? 'active' : ''}" style="display:${activeTab === 'checker1' ? 'block' : 'none'};">
        <div class="panel-subheading">
          <h3>CHECKER-1 QUEUE</h3>
          <p>Circulars pending first-level checking</p>
        </div>
        <div class="table-wrapper saved-table-wrapper">
          <table class="master-data-table pricing-data-table">
            <thead>
              <tr>
                <th>Sl. No.</th>
                <th>Financial Year</th>
                <th>Division</th>
                <th>State</th>
                <th>Material</th>
                <th>APR No.</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${checker1List}
            </tbody>
          </table>
        </div>
      </div>

      <div id="checker2Panel" class="checker-panel ${activeTab === 'checker2' ? 'active' : ''}" style="display:${activeTab === 'checker2' ? 'block' : 'none'};">
        <div class="panel-subheading">
          <h3>CHECKER-2 QUEUE</h3>
          <p>Circulars passed by Checker-1, pending second-level checking</p>
        </div>
        <div class="table-wrapper saved-table-wrapper">
          <table class="master-data-table pricing-data-table">
            <thead>
              <tr>
                <th>Sl. No.</th>
                <th>Financial Year</th>
                <th>Division</th>
                <th>State</th>
                <th>Material</th>
                <th>APR No.</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${checker2List}
            </tbody>
          </table>
        </div>
      </div>

      <div id="returnedPanel" class="checker-panel ${activeTab === 'returned' ? 'active' : ''}" style="display:${activeTab === 'returned' ? 'block' : 'none'};">
        <div class="panel-subheading">
          <h3>CIRCULARS RETURNED FOR CORRECTION</h3>
          <p>Circulars returned by checkers with discrepancy remarks</p>
        </div>
        <div class="table-wrapper saved-table-wrapper">
          <table class="master-data-table pricing-data-table">
            <thead>
              <tr>
                <th>Sl. No.</th>
                <th>APR No.</th>
                <th>Financial Year</th>
                <th>Division</th>
                <th>State</th>
                <th>Material</th>
                <th>Returned By</th>
                <th>Discrepancy</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${returnedList}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function misNumber(value) { const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, "")); return Number.isFinite(parsed) ? parsed : 0; }
function misFormat(value) { return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value || 0); }
function misChart(groups, key, line) {
  if (!groups.length) return '<p class="mis-empty">No report data available for this view.</p>';
  const top = groups.slice(0, 8), max = Math.max(...top.map((item) => item.count), 1);
  return `<div class="mis-bars ${line ? "mis-line" : ""}">${top.map((item) => `<button type="button" class="mis-bar mis-drill" data-mis-drill-key="${key}" data-mis-drill-value="${escapeHtml(item.label)}" title="Drill into ${escapeHtml(item.label)}"><span class="mis-bar-value">${item.count}</span><i style="height:${Math.max(8, (item.count / max) * 100)}%"></i><b>${escapeHtml(item.label)}</b></button>`).join("")}</div>`;
}

function misHierarchy(records, level = 0, path = "") {
  const levels = ["division", "state", "financialYear", "material", "pricingHeading"];
  if (!records.length) return '<p class="mis-empty">No Report records match the current filters.</p>';
  if (level >= levels.length) return misHierarchyRecords(records);
  const key = levels[level];
  const label = REPORT_COLS.find((c) => c.key === key)?.label || key;
  const groups = records.reduce((acc, rec) => {
    const v = String(rec[key] || "Not specified");
    (acc[v] ||= []).push(rec);
    return acc;
  }, {});
  const totalRecords = records.length;
  const totalAprs = new Set(records.map((r) => r.aprNumber).filter(Boolean)).size;
  const totalVal = records.reduce((s, r) => s + misNumber(r.value), 0);
  const sortedEntries = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));

  // Build summary table rows
  const summaryRows = sortedEntries.map(([value, childRecords]) => {
    const nodeId = `${path}|${key}:${value}`;
    const expanded = misExpandedNodes.has(nodeId);
    const cnt = childRecords.length;
    const aprs = new Set(childRecords.map((r) => r.aprNumber).filter(Boolean)).size;
    const val = childRecords.reduce((s, r) => s + misNumber(r.value), 0);
    const pct = totalRecords ? ((cnt / totalRecords) * 100).toFixed(1) : "0.0";
    return `
      <tr class="mis-summary-row ${expanded ? "is-expanded" : ""}">
        <td>
          <button type="button" class="mis-tree-toggle mis-summary-toggle" data-mis-tree-id="${escapeHtml(nodeId)}" aria-expanded="${expanded}">
            <span class="mis-tree-icon">${expanded ? "−" : "+"}</span>
            <span>${escapeHtml(value)}</span>
          </button>
        </td>
        <td class="mis-num">${cnt}</td>
        <td class="mis-num">${aprs}</td>
        <td class="mis-num">${misFormat(val)}</td>
        <td class="mis-num">${pct}%</td>
      </tr>
      ${expanded ? `<tr class="mis-summary-child-row"><td colspan="5"><div class="mis-tree-children">${misHierarchy(childRecords, level + 1, nodeId)}</div></td></tr>` : ""}`;
  }).join("");

  // Total row
  const totalRow = `
    <tr class="mis-summary-total">
      <td><strong>Total</strong></td>
      <td class="mis-num"><strong>${totalRecords}</strong></td>
      <td class="mis-num"><strong>${totalAprs}</strong></td>
      <td class="mis-num"><strong>${misFormat(totalVal)}</strong></td>
      <td class="mis-num"><strong>100%</strong></td>
    </tr>`;

  return `
    <div class="mis-summary-wrap">
      <div class="mis-summary-label">Level ${level + 1} · ${escapeHtml(label)}</div>
      <div class="mis-tree-table-wrap">
        <table class="master-data-table mis-summary-table">
          <thead><tr>
            <th>${escapeHtml(label)}</th>
            <th class="mis-num">Records</th>
            <th class="mis-num">APRs</th>
            <th class="mis-num">Numeric Value</th>
            <th class="mis-num">% of Total</th>
          </tr></thead>
          <tbody>${summaryRows}${totalRow}</tbody>
        </table>
      </div>
    </div>`;
}

function misHierarchyRecords(records) {
  const columns = ["aprNumber", "slNo", "batchNo", "division", "state", "financialYear", "period", "category", "material", "pricingHeading", "value", "remarks", "completedAt", "completedId"];
  const labels = Object.fromEntries(REPORT_COLS.map((c) => [c.key, c.label]));
  return `<div class="mis-tree-records">
    <strong>Detailed Records (${records.length})</strong>
    <div class="mis-tree-table-wrap">
      <table class="master-data-table mis-tree-table">
        <thead><tr>${columns.map((k) => `<th>${escapeHtml(labels[k] || k)}</th>`).join("")}</tr></thead>
        <tbody>${records.map((rec) => `<tr>${columns.map((k) => `<td>${escapeHtml(rec[k] || "—")}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
  </div>`;
}

function handleAdminLogin() {
  const pin = window.prompt("Enter Administrator PIN:");
  if (pin === null) return;
  if (pin === "ADMIN123") {
    isAdminAuthenticated = true;
    renderReportsPanel();
  } else {
    window.alert("Incorrect PIN. Access denied.");
  }
}

function handleMasterDataAdminLogin() {
  const pin = window.prompt("Enter Administrator PIN:");
  if (pin === null) return;
  if (pin !== "ADMIN123") {
    window.alert("Incorrect PIN. Access denied.");
    return;
  }
  isAdminAuthenticated = true;
  renderMasterDataPanel();
}

function handleAdminDeleteReport(recordId) {
  const record = completedPricingRecords.find((r) => r.id === recordId);
  if (!record) return;
  const confirmed = window.confirm(
    `ADMINISTRATOR ACTION\n\nYou are about to permanently delete record:\nCompleted ID: ${record.completedId || recordId}\nAPR No.: ${record.aprNumber || "-"}\n\nThis action cannot be undone and will be logged. Proceed?`
  );
  if (!confirmed) return;
  const reason = window.prompt("Enter reason for deletion (required):");
  if (!reason || !reason.trim()) {
    window.alert("Deletion cancelled: a reason is required.");
    return;
  }
  deletionAuditLog.push({
    userId: "ADMIN",
    dateTime: new Date().toLocaleString(),
    recordId: recordId,
    completedId: record.completedId || recordId,
    aprNumber: record.aprNumber || "-",
    reason: reason.trim(),
  });
  completedPricingRecords = completedPricingRecords.filter((r) => r.id !== recordId);
  persistPricingDataState();
  renderReportsPanel();
}

function renderMasterDataPanel() {
  if (currentMasterDataView === "pricing" || currentMasterDataView === "pricing-fertilizer" || currentMasterDataView === "pricing-ipd" || currentMasterDataView === "pricing-tie-up") {
    renderPricingHeadingEntry();
  } else if (currentMasterDataView === "state") {
    renderStateNameEntry();
  } else if (currentMasterDataView === "financial-year") {
    renderFinancialYearEntry();
  } else if (currentMasterDataView === "unit-rate") {
    renderUnitRateEntry();
  } else if (currentMasterDataView === "category") {
    renderCategoryEntry();
  } else {
    renderMasterDataTable();
  }
}

function handleSaveEntry() {
  if (!requireMasterDataAdministrator()) return;
  const description = document.getElementById("materialDescriptionInput")?.value.trim();
  const code = document.getElementById("materialCodeInput")?.value.trim();
  const division = document.getElementById("businessDivisionInput")?.value;

  if (!description || !code || !division) {
    return;
  }

  const isDuplicate = masterDataEntries.some(
    (entry) =>
      entry.id !== editingEntryId &&
      entry.description.toLowerCase() === description.toLowerCase() &&
      entry.code.toLowerCase() === code.toLowerCase() &&
      entry.division === division
  );

  if (isDuplicate) {
    window.alert("This material description and code already exist for the selected division.");
    return;
  }

  if (editingEntryId) {
    const recordId = editingEntryId;
    masterDataEntries = masterDataEntries.map((entry) =>
      entry.id === editingEntryId ? { ...entry, description, code, division } : entry
    );
    editingEntryId = null;
    logMasterDataAudit("Edit", "Material Master Data", recordId);
  } else {
    const recordId = Date.now().toString();
    masterDataEntries.push({
      id: recordId,
      description,
      code,
      division,
    });
    logMasterDataAudit("Create", "Material Master Data", recordId);
  }

  renderMasterDataTable();
}

function handleEditEntry(id) {
  if (!requireMasterDataAdministrator()) return;
  editingEntryId = id;
  renderMasterDataTable();
}

function handleDeleteEntry(id) {
  if (!requireMasterDataAdministrator()) return;
  const entry = masterDataEntries.find((item) => item.id === id);
  if (!entry) {
    return;
  }

  const confirmed = window.confirm(`Delete entry for ${entry.description}?`);
  if (!confirmed) {
    return;
  }

  masterDataEntries = masterDataEntries.filter((item) => item.id !== id);
  logMasterDataAudit("Delete", "Material Master Data", entry.id);
  if (editingEntryId === id) {
    editingEntryId = null;
  }
  renderMasterDataTable();
}

function handleAddPricingHeading() {
  if (!requireMasterDataAdministrator()) return;
  const description = document.getElementById("pricingHeadingInput")?.value.trim();
  const categorySelectValue = document.getElementById("pricingHeadingCategorySelect")?.value || currentPricingHeadingCategory;
  const normalizedCategory = normalizePricingHeadingCategory(categorySelectValue);
  if (!description) {
    return;
  }

  const duplicate = pricingHeadingEntries.some((entry) => {
    const entryCategory = normalizePricingHeadingCategory(entry?.category || entry?.entryType || entry?.division || "PRICING ENTRY HEADING-FERTILIZER");
    return entryCategory === normalizedCategory && entry.description.trim().toLowerCase() === description.toLowerCase() && entry.id !== editingPricingHeadingId;
  });

  if (duplicate) {
    window.alert("This pricing heading already exists for the selected entry type.");
    return;
  }

  if (editingPricingHeadingId) {
    const recordId = editingPricingHeadingId;
    pricingHeadingEntries = pricingHeadingEntries.map((entry) =>
      entry.id === editingPricingHeadingId ? { ...entry, description, category: normalizedCategory, division: getDivisionFromPricingHeadingCategory(normalizedCategory) } : entry
    );
    editingPricingHeadingId = null;
    currentPricingHeadingCategory = normalizedCategory;
    logMasterDataAudit("Edit", "Pricing Heading Master", recordId);
  } else {
    const recordId = Date.now().toString();
    pricingHeadingEntries.push({
      id: recordId,
      description,
      category: normalizedCategory,
      division: getDivisionFromPricingHeadingCategory(normalizedCategory),
    });
    currentPricingHeadingCategory = normalizedCategory;
    logMasterDataAudit("Create", "Pricing Heading Master", recordId);
  }

  pricingHeadingEntries = normalizePricingHeadingEntries(pricingHeadingEntries);
  persistPricingDataState();
  renderPricingHeadingEntry();
}

function handleEditPricingHeading(id) {
  if (!requireMasterDataAdministrator()) return;
  editingPricingHeadingId = id;
  renderPricingHeadingEntry();
}

function handleDeletePricingHeading(id) {
  if (!requireMasterDataAdministrator()) return;
  const entry = pricingHeadingEntries.find((item) => item.id === id);
  if (!entry) {
    return;
  }

  const confirmed = window.confirm(`Delete pricing heading "${entry.description}"?`);
  if (!confirmed) {
    return;
  }

  pricingHeadingEntries = pricingHeadingEntries.filter((item) => item.id !== id);
  logMasterDataAudit("Delete", "Pricing Heading Master", entry.id);
  if (editingPricingHeadingId === id) {
    editingPricingHeadingId = null;
  }
  renderPricingHeadingEntry();
}

function handleAddStateName() {
  if (!requireMasterDataAdministrator()) return;
  const name = document.getElementById("stateNameInput")?.value.trim();
  if (!name) {
    return;
  }

  if (editingStateNameId) {
    const recordId = editingStateNameId;
    stateNameEntries = stateNameEntries.map((entry) =>
      entry.id === editingStateNameId ? { ...entry, name } : entry
    );
    editingStateNameId = null;
    logMasterDataAudit("Edit", "State Name Master", recordId);
  } else {
    const recordId = Date.now().toString();
    stateNameEntries.push({ id: recordId, name });
    logMasterDataAudit("Create", "State Name Master", recordId);
  }

  renderStateNameEntry();
}

function handleEditStateName(id) {
  if (!requireMasterDataAdministrator()) return;
  editingStateNameId = id;
  renderStateNameEntry();
}

function handleDeleteStateName(id) {
  if (!requireMasterDataAdministrator()) return;
  const entry = stateNameEntries.find((item) => item.id === id);
  if (!entry) {
    return;
  }

  const confirmed = window.confirm(`Delete state "${entry.name}"?`);
  if (!confirmed) {
    return;
  }

  stateNameEntries = stateNameEntries.filter((item) => item.id !== id);
  logMasterDataAudit("Delete", "State Name Master", entry.id);
  if (editingStateNameId === id) {
    editingStateNameId = null;
  }
  renderStateNameEntry();
}

function handleAddFinancialYear() {
  if (!requireMasterDataAdministrator()) return;
  const year = document.getElementById("financialYearInput")?.value.trim();
  if (!year) {
    return;
  }

  if (editingFinancialYearId) {
    const recordId = editingFinancialYearId;
    financialYearEntries = financialYearEntries.map((entry) =>
      entry.id === editingFinancialYearId ? { ...entry, year } : entry
    );
    editingFinancialYearId = null;
    logMasterDataAudit("Edit", "Financial Year Master", recordId);
  } else {
    const recordId = Date.now().toString();
    financialYearEntries.push({ id: recordId, year });
    logMasterDataAudit("Create", "Financial Year Master", recordId);
  }

  renderFinancialYearEntry();
}

function handleEditFinancialYear(id) {
  if (!requireMasterDataAdministrator()) return;
  editingFinancialYearId = id;
  renderFinancialYearEntry();
}

function handleDeleteFinancialYear(id) {
  if (!requireMasterDataAdministrator()) return;
  const entry = financialYearEntries.find((item) => item.id === id);
  if (!entry) {
    return;
  }

  const confirmed = window.confirm(`Delete financial year "${entry.year}"?`);
  if (!confirmed) {
    return;
  }

  financialYearEntries = financialYearEntries.filter((item) => item.id !== id);
  logMasterDataAudit("Delete", "Financial Year Master", entry.id);
  if (editingFinancialYearId === id) {
    editingFinancialYearId = null;
  }
  renderFinancialYearEntry();
}

function handleAddUnitRate() {
  if (!requireMasterDataAdministrator()) return;
  const name = document.getElementById("unitRateInput")?.value.trim();
  if (!name) {
    return;
  }

  if (editingUnitRateId) {
    const recordId = editingUnitRateId;
    unitRateEntries = unitRateEntries.map((entry) =>
      entry.id === editingUnitRateId ? { ...entry, name } : entry
    );
    editingUnitRateId = null;
    logMasterDataAudit("Edit", "Unit Rate Master", recordId);
  } else {
    const recordId = Date.now().toString();
    unitRateEntries.push({ id: recordId, name });
    logMasterDataAudit("Create", "Unit Rate Master", recordId);
  }

  renderUnitRateEntry();
}

function handleEditUnitRate(id) {
  if (!requireMasterDataAdministrator()) return;
  editingUnitRateId = id;
  renderUnitRateEntry();
}

function handleDeleteUnitRate(id) {
  if (!requireMasterDataAdministrator()) return;
  const entry = unitRateEntries.find((item) => item.id === id);
  if (!entry) {
    return;
  }

  const confirmed = window.confirm(`Delete unit rate "${entry.name}"?`);
  if (!confirmed) {
    return;
  }

  unitRateEntries = unitRateEntries.filter((item) => item.id !== id);
  logMasterDataAudit("Delete", "Unit Rate Master", entry.id);
  if (editingUnitRateId === id) {
    editingUnitRateId = null;
  }
  renderUnitRateEntry();
}

function handleAddCategory() {
  if (!requireMasterDataAdministrator()) return;
  const name = document.getElementById("categoryInput")?.value.trim();
  if (!name) {
    return;
  }

  if (editingCategoryId) {
    const recordId = editingCategoryId;
    categoryEntries = categoryEntries.map((entry) =>
      entry.id === editingCategoryId ? { ...entry, name } : entry
    );
    editingCategoryId = null;
    logMasterDataAudit("Edit", "Category Master", recordId);
  } else {
    const recordId = Date.now().toString();
    categoryEntries.push({ id: recordId, name });
    logMasterDataAudit("Create", "Category Master", recordId);
  }

  renderCategoryEntry();
}

function handleEditCategory(id) {
  if (!requireMasterDataAdministrator()) return;
  editingCategoryId = id;
  renderCategoryEntry();
}

function handleDeleteCategory(id) {
  if (!requireMasterDataAdministrator()) return;
  const entry = categoryEntries.find((item) => item.id === id);
  if (!entry) {
    return;
  }

  const confirmed = window.confirm(`Delete category "${entry.name}"?`);
  if (!confirmed) {
    return;
  }

  categoryEntries = categoryEntries.filter((item) => item.id !== id);
  logMasterDataAudit("Delete", "Category Master", entry.id);
  if (editingCategoryId === id) {
    editingCategoryId = null;
  }
  renderCategoryEntry();
}

masterDataButton.addEventListener("click", () => {
  resetNavigationHistory();
  currentMasterDataView = "material";
  currentAppView = "master";
  document.body.classList.remove("pricing-view-active");
  document.body.classList.remove("print-circular-active");
  masterDataPanel.classList.remove("hidden");
  renderMasterDataPanel();
});

pricingDataButton.addEventListener("click", () => {
  resetNavigationHistory();
  currentAppView = "pricing";
  document.body.classList.add("pricing-view-active");
  document.body.classList.remove("print-circular-active");
  masterDataPanel.classList.remove("hidden");
  pricingDataRows = normalizePricingDataRows(pricingDataRows);
  persistPricingDataState();
  renderPricingDataTable();
});

savedPricingRecordsButton.addEventListener("click", () => {
  resetNavigationHistory();
  currentAppView = "saved-pricing-records";
  document.body.classList.add("pricing-view-active");
  document.body.classList.remove("print-circular-active");
  masterDataPanel.classList.remove("hidden");
  renderSavedPricingRecordsPanel();
});

reportsButton.addEventListener("click", () => {
  resetNavigationHistory();
  currentAppView = "reports";
  document.body.classList.add("pricing-view-active");
  document.body.classList.remove("print-circular-active");
  masterDataPanel.classList.remove("hidden");
  renderReportsPanel();
});

misButton.addEventListener("click", () => {
  resetNavigationHistory();
  currentAppView = "mis";
  document.body.classList.add("pricing-view-active");
  document.body.classList.remove("print-circular-active");
  masterDataPanel.classList.remove("hidden");
  renderMisPanel();
});

printCircularButton.addEventListener("click", () => {
  resetNavigationHistory();
  currentAppView = "print-circular";
  document.body.classList.add("pricing-view-active");
  document.body.classList.add("print-circular-active");
  masterDataPanel.classList.remove("hidden");
  printCircularSelectedApr = "";
  printCircularSelectedFinancialYear = "";
  printCircularSelectedDivision = "";
  printCircularSelectedState = "";
  printCircularSelectedMaterial = "";
  printCircularCcText = "";
  printCircularSignatoryText = "Dy. General Manager (Fin.)\nAuthorized Signatory";
  printCircularTermsHtml = "";
  printCircularIntroText = "The following pricing and sales terms have been approved for details mentioned above.";
  printCircularDateOfCircular = "";
  printCircularEffectiveFrom = "";
  renderPrintCircularPanel();
});

checkCircularButton.addEventListener("click", () => {
  resetNavigationHistory();
  currentAppView = "check-circular";
  document.body.classList.add("pricing-view-active");
  document.body.classList.remove("print-circular-active");
  masterDataPanel.classList.remove("hidden");
  renderCheckCircularPanel();
});

approveCircularButton.addEventListener("click", () => {
  resetNavigationHistory();
  currentAppView = "approve-circular";
  document.body.classList.add("pricing-view-active");
  document.body.classList.remove("print-circular-active");
  masterDataPanel.classList.remove("hidden");
  renderApproveCircularPanel();
});

circularArchiveButton.addEventListener("click", () => {
  resetNavigationHistory();
  currentAppView = "circular-archive";
  document.body.classList.add("pricing-view-active");
  document.body.classList.remove("print-circular-active");
  masterDataPanel.classList.remove("hidden");
  renderCircularArchivePanel();
});

function getNavigationSnapshot() {
  return {
    view: currentAppView,
    approvalActiveTab,
    checkerActiveTab,
    currentMasterDataView,
    currentCheckerLevel,
    selectedCircularForCheck: selectedCircularForCheck ? { ...selectedCircularForCheck } : null,
    printCircularSelectedApr,
    printCircularSelectedFinancialYear,
    printCircularSelectedDivision,
    printCircularSelectedState,
    printCircularSelectedMaterial,
    printCircularCcText,
    printCircularSignatoryText,
    printCircularTermsHtml,
    printCircularIntroText,
    printCircularDateOfCircular,
    printCircularEffectiveFrom,
    savedRecordFilters: { ...savedRecordFilters },
    reportRecordFilters: { ...reportRecordFilters },
    activeReportFilterCol,
    misFilters: Object.fromEntries(Object.entries(misFilters).map(([key, values]) => [key, Array.isArray(values) ? [...values] : values])),
    misDrillDown: misDrillDown.map((item) => ({ ...item })),
    misTableSearch,
    misTableSort: { ...misTableSort },
    misTablePage,
    misComparisonKey,
    misExpandedNodes: [...misExpandedNodes],
    misDrillSort: { ...misDrillSort },
    misDrillExpandedRows: [...misDrillExpandedRows],
    misApplied,
    reportDrillDownExpanded: [...reportDrillDownExpanded],
    reportDrillDownZoom,
    approvedArchiveExpanded: [...approvedArchiveExpanded],
    circularArchiveExpanded: [...circularArchiveExpanded],
    selectedSavedRowIds: [...selectedSavedRowIds],
    editingSavedRowIds: [...editingSavedRowIds],
    scrollY: window.scrollY,
  };
}

function restoreNavigationState(snapshot) {
  if (!snapshot) return;

  currentAppView = snapshot.view || currentAppView;
  approvalActiveTab = snapshot.approvalActiveTab || approvalActiveTab;
  checkerActiveTab = snapshot.checkerActiveTab || checkerActiveTab;
  currentMasterDataView = snapshot.currentMasterDataView || currentMasterDataView;
  currentCheckerLevel = snapshot.currentCheckerLevel || currentCheckerLevel;
  selectedCircularForCheck = snapshot.selectedCircularForCheck ? { ...snapshot.selectedCircularForCheck } : null;
  printCircularSelectedApr = snapshot.printCircularSelectedApr || "";
  printCircularSelectedFinancialYear = snapshot.printCircularSelectedFinancialYear || "";
  printCircularSelectedDivision = snapshot.printCircularSelectedDivision || "";
  printCircularSelectedState = snapshot.printCircularSelectedState || "";
  printCircularSelectedMaterial = snapshot.printCircularSelectedMaterial || "";
  printCircularCcText = snapshot.printCircularCcText || "";
  printCircularSignatoryText = snapshot.printCircularSignatoryText || "Dy. General Manager (Fin.)\nAuthorized Signatory";
  printCircularTermsHtml = snapshot.printCircularTermsHtml || "";
  printCircularIntroText = snapshot.printCircularIntroText || "The following pricing and sales terms have been approved for details mentioned above.";
  printCircularDateOfCircular = snapshot.printCircularDateOfCircular || "";
  printCircularEffectiveFrom = snapshot.printCircularEffectiveFrom || "";
  savedRecordFilters = snapshot.savedRecordFilters ? { ...snapshot.savedRecordFilters } : savedRecordFilters;
  reportRecordFilters = snapshot.reportRecordFilters ? { ...snapshot.reportRecordFilters } : reportRecordFilters;
  activeReportFilterCol = snapshot.activeReportFilterCol || null;
  misFilters = snapshot.misFilters ? Object.fromEntries(Object.entries(snapshot.misFilters).map(([key, values]) => [key, Array.isArray(values) ? [...values] : values])) : misFilters;
  misDrillDown = Array.isArray(snapshot.misDrillDown) ? snapshot.misDrillDown.map((item) => ({ ...item })) : misDrillDown;
  misTableSearch = snapshot.misTableSearch || "";
  misTableSort = snapshot.misTableSort ? { ...snapshot.misTableSort } : misTableSort;
  misTablePage = Number(snapshot.misTablePage) || 1;
  misComparisonKey = snapshot.misComparisonKey || misComparisonKey;
  misExpandedNodes = new Set(Array.isArray(snapshot.misExpandedNodes) ? snapshot.misExpandedNodes : []);
  misDrillSort = snapshot.misDrillSort ? { ...snapshot.misDrillSort } : misDrillSort;
  misDrillExpandedRows = new Set(Array.isArray(snapshot.misDrillExpandedRows) ? snapshot.misDrillExpandedRows : []);
  misApplied = Boolean(snapshot.misApplied);
  reportDrillDownExpanded = new Set(Array.isArray(snapshot.reportDrillDownExpanded) ? snapshot.reportDrillDownExpanded : []);
  reportDrillDownZoom = Number(snapshot.reportDrillDownZoom) || 100;
  approvedArchiveExpanded = new Set(Array.isArray(snapshot.approvedArchiveExpanded) ? snapshot.approvedArchiveExpanded : []);
  circularArchiveExpanded = new Set(Array.isArray(snapshot.circularArchiveExpanded) ? snapshot.circularArchiveExpanded : []);
  selectedSavedRowIds = new Set(Array.isArray(snapshot.selectedSavedRowIds) ? snapshot.selectedSavedRowIds : []);
  editingSavedRowIds = new Set(Array.isArray(snapshot.editingSavedRowIds) ? snapshot.editingSavedRowIds : []);

  document.body.classList.toggle("pricing-view-active", ["pricing", "saved-pricing-records", "reports", "mis", "print-circular", "check-circular", "approve-circular", "circular-archive"].includes(currentAppView));
  document.body.classList.toggle("print-circular-active", currentAppView === "print-circular");

  if (currentAppView === "pricing") renderPricingDataTable();
  else if (currentAppView === "saved-pricing-records") renderSavedPricingRecordsPanel();
  else if (currentAppView === "reports") renderReportsPanel();
  else if (currentAppView === "mis") renderMisPanel();
  else if (currentAppView === "print-circular") renderPrintCircularPanel();
  else if (currentAppView === "check-circular") renderCheckCircularPanel();
  else if (currentAppView === "approve-circular") renderApproveCircularPanel();
  else if (currentAppView === "circular-archive") renderCircularArchivePanel();
  else renderMasterDataPanel();

  if (Number.isFinite(Number(snapshot.scrollY))) {
    window.scrollTo(0, Number(snapshot.scrollY));
  }
}

function pushNavigationHistoryState() {
  const snapshot = getNavigationSnapshot();
  const last = navigationHistory[navigationHistory.length - 1];
  if (last && JSON.stringify(last) === JSON.stringify(snapshot)) {
    return;
  }
  navigationHistory.push(snapshot);
  if (navigationHistory.length > 20) {
    navigationHistory.shift();
  }
}

function resetNavigationHistory() {
  navigationHistory = [];
  selectedCircularForCheck = null;
  currentCheckerLevel = "checker1";
  draftCircularEditMode = false;
}

function goBackToPreviousScreen() {
  const previous = navigationHistory.pop();
  if (previous) {
    restoreNavigationState(previous);
    return;
  }

  renderCurrentAppView();
}

function renderCurrentAppView() {
  if (currentAppView === "pricing") renderPricingDataTable();
  else if (currentAppView === "saved-pricing-records") renderSavedPricingRecordsPanel();
  else if (currentAppView === "reports") renderReportsPanel();
  else if (currentAppView === "mis") renderMisPanel();
  else if (currentAppView === "print-circular") renderPrintCircularPanel();
  else if (currentAppView === "check-circular") renderCheckCircularPanel();
  else if (currentAppView === "approve-circular") renderApproveCircularPanel();
  else if (currentAppView === "circular-archive") renderCircularArchivePanel();
  else renderMasterDataPanel();
}


function getMisFilteredDisplayRecords() {
  return completedPricingRecords.map((row, index) => getReportRowDisplayValues(row, index)).filter((record) =>
    MIS_FILTERS.every((filter) => !misFilters[filter.key]?.length || misFilters[filter.key].includes(String(record[filter.key] || ""))) &&
    misDrillDown.every((drill) => String(record[drill.key] || "") === drill.value)
  );
}

masterDataPanel.addEventListener("change", (event) => {
  const filterKey = event.target.dataset.misFilter;
  if (filterKey) {
    misFilters[filterKey] = [...document.querySelectorAll(`[data-mis-filter="${filterKey}"]:checked`)].map((option) => option.value);
    misTablePage = 1;
    renderMisPanel();
  } else if (event.target.id === "misComparisonSelect") {
    misComparisonKey = event.target.value;
    renderMisPanel();
  }
});

masterDataPanel.addEventListener("input", (event) => {
  const searchKey = event.target.dataset.misSearch;
  if (searchKey) {
    const term = event.target.value.toLowerCase();
    document.querySelectorAll(`[data-mis-option="${searchKey}"]`).forEach((option) => { option.hidden = !option.textContent.toLowerCase().includes(term); });
  } else if (event.target.id === "misTableSearch") {
    misTableSearch = event.target.value;
    misTablePage = 1;
    renderMisPanel();
  }
});

masterDataPanel.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.misFilterToggle) {
    const key = target.dataset.misFilterToggle;
    const menu = document.getElementById(`misFilterMenu-${key}`);
    const willOpen = menu.hidden;
    document.querySelectorAll(".mis-filter-menu").forEach((item) => { item.hidden = true; });
    document.querySelectorAll(".mis-filter-toggle").forEach((item) => item.setAttribute("aria-expanded", "false"));
    menu.hidden = !willOpen;
    target.setAttribute("aria-expanded", String(willOpen));
    if (willOpen) menu.querySelector("input")?.focus();
  } else if (target.dataset.misTreeId) {
    const nodeId = target.dataset.misTreeId;
    if (misExpandedNodes.has(nodeId)) misExpandedNodes.delete(nodeId); else misExpandedNodes.add(nodeId);
    renderMisPanel();
  } else if (target.dataset.misSelectAll) {
    const key = target.dataset.misSelectAll;
    misFilters[key] = [...document.querySelectorAll(`[data-mis-filter="${key}"]`)].map((input) => input.value);
    misTablePage = 1; renderMisPanel();
  } else if (target.dataset.misClearFilter) {
    delete misFilters[target.dataset.misClearFilter];
    misTablePage = 1; renderMisPanel();
  } else if (target.id === "misApplyBtn") { misApplied = true; misTablePage = 1; renderMisPanel(); }
  else if (target.id === "misClearBtn") { misFilters = {}; misApplied = false; misTableSearch = ""; misTablePage = 1; renderMisPanel(); }
  else if (target.id === "misResetBtn") { misFilters = {}; misApplied = false; misDrillDown = []; misExpandedNodes.clear(); misTableSearch = ""; misTablePage = 1; renderMisPanel(); }
  else if (target.id === "misBackBtn") { misDrillDown.pop(); misTablePage = 1; renderMisPanel(); }
  else if (target.id === "misPrevBtn") { misTablePage -= 1; renderMisPanel(); }
  else if (target.id === "misNextBtn") { misTablePage += 1; renderMisPanel(); }
  else if (target.id === "misFullscreenBtn") {
    const dashboard = document.querySelector(".mis-dashboard");
    if (document.fullscreenElement) document.exitFullscreen?.(); else dashboard?.requestFullscreen?.();
  } else if (target.id === "misPrintBtn") { window.print(); }
  else if (target.id === "misExportBtn") {
    const columns = ["financialYear", "division", "state", "material", "aprNumber", "batchNo", "period", "category", "pricingHeading", "value", "approvingAuthority", "dateOfApproval", "refNoteOfApproval"];
    const csv = [columns.join(","), ...getMisFilteredDisplayRecords().map((row) => columns.map((key) => `"${String(row[key] || "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = "MIS-Report.csv"; link.click(); URL.revokeObjectURL(link.href);
  } else if (target.id === "misCompExportBtn") {
    const tbl = document.getElementById("misCompTable");
    if (!tbl) return;
    const csvRows = [...tbl.querySelectorAll("tr")].map(tr => [...tr.querySelectorAll("th,td")].map(td => `"${td.innerText.replace(/"/g,"\"\"\"\"")}"` ).join(","));
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csvRows.join("\n")], { type: "text/csv" })); link.download = "MIS-Comparative-Analysis.csv"; link.click(); URL.revokeObjectURL(link.href);
  } else if (target.dataset.misSort) {
    const key = target.dataset.misSort;
    misTableSort = { key, asc: misTableSort.key === key ? !misTableSort.asc : true }; renderMisPanel();
   } else if (target.dataset.misDrillKey && target.dataset.misDrillValue) {
     const key = target.dataset.misDrillKey, value = target.dataset.misDrillValue;
     if (!misDrillDown.some((item) => item.key === key && item.value === value)) {
       const label = MIS_FILTERS.find((item) => item.key === key)?.label || key;
       misDrillDown.push({ key, value, label }); misTablePage = 1; renderMisPanel();
     }
    } else if (target.id === "expandAllReportsBtn") {
      function addAllNodeIds(nodes) {
        for (const node of nodes) {
          if ((node.children && node.children.length > 0) || (node.records && node.records.length > 0)) {
            reportDrillDownExpanded.add(node.id);
          }
          if (node.children) addAllNodeIds(node.children);
        }
      }
      const tree = buildReportDrillDownTree(getFilteredReportRecords());
      addAllNodeIds(tree);
      renderReportsPanel();
    } else if (target.id === "collapseAllReportsBtn") {
      reportDrillDownExpanded.clear();
      renderReportsPanel();
    } else if (target.classList.contains("report-drill-toggle")) {
      const nodeId = target.dataset.nodeId;
      if (reportDrillDownExpanded.has(nodeId)) reportDrillDownExpanded.delete(nodeId); else reportDrillDownExpanded.add(nodeId);
      renderReportsPanel();
    } else if (target.id === "printPreviewBtn") {
      openReportPrintPreview();
    } else if (target.id === "exportExcelBtn") {
      exportCurrentReportToExcel();
    }
 });

masterDataPanel.addEventListener("click", (event) => {
  const target = event.target.closest("button") || event.target;

  if (target.id === "masterDataAdminLoginBtn") {
    handleMasterDataAdminLogin();
  } else if (target.id === "masterDataAdminLogoutBtn") {
    isAdminAuthenticated = false;
    editingEntryId = null;
    editingPricingHeadingId = null;
    editingStateNameId = null;
    editingFinancialYearId = null;
    renderMasterDataPanel();
  } else if (target.id === "saveMasterEntryBtn") {
    handleSaveEntry();
  } else if (target.id === "cancelEditBtn") {
    editingEntryId = null;
    renderMasterDataTable();
  } else if (target.id === "addPricingHeadingBtn") {
    handleAddPricingHeading();
  } else if (target.id === "cancelPricingHeadingEditBtn") {
    editingPricingHeadingId = null;
    renderPricingHeadingEntry();
  } else if (target.id === "addStateNameBtn") {
    handleAddStateName();
  } else if (target.id === "cancelStateNameEditBtn") {
    editingStateNameId = null;
    renderStateNameEntry();
  } else if (target.id === "addFinancialYearBtn") {
    handleAddFinancialYear();
  } else if (target.id === "cancelFinancialYearEditBtn") {
    editingFinancialYearId = null;
    renderFinancialYearEntry();
  } else if (target.id === "addUnitRateBtn") {
    handleAddUnitRate();
  } else if (target.id === "cancelUnitRateEditBtn") {
    editingUnitRateId = null;
    renderUnitRateEntry();
  } else if (target.id === "addCategoryBtn") {
    handleAddCategory();
  } else if (target.id === "cancelCategoryEditBtn") {
    editingCategoryId = null;
    renderCategoryEntry();
  } else if (target.matches("[data-action='edit-category']")) {
    handleEditCategory(target.dataset.id);
  } else if (target.matches("[data-action='delete-category']")) {
    handleDeleteCategory(target.dataset.id);
  } else if (target.id === "clearAllFiltersBtn") {
    savedRecordFilters = {};
    syncSelectionToFilteredRecords();
    renderSavedPricingRecordsPanel();
  } else if (target.classList.contains("col-filter-btn")) {
    openFilterPopup(target.dataset.filterCol, target);
  } else if (target.id === "editSelectedBtn") {
    handleBulkEdit();
  } else if (target.id === "saveSelectedBtn") {
    handleBulkSave();
  } else if (target.id === "deleteSelectedBtn") {
    handleBulkDelete();
  } else if (target.id === "completeSelectedBtn") {
    handleBulkComplete();
  } else if (target.id === "addPricingDataRowBtn") {
    handleAddPricingDataRow();
  } else if (target.id === "applyFirstRowToAllBtn") {
    applyFirstRowToAllRows();
  } else if (target.id === "savePricingDataBtn") {
    handleSavePricingDataRows();
  } else if (target.matches("[data-action='edit']")) {
    handleEditEntry(target.dataset.id);
  } else if (target.matches("[data-action='delete']")) {
    handleDeleteEntry(target.dataset.id);
  } else if (target.matches("[data-action='edit-pricing-heading']")) {
    handleEditPricingHeading(target.dataset.id);
  } else if (target.matches("[data-action='delete-pricing-heading']")) {
    handleDeletePricingHeading(target.dataset.id);
  } else if (target.matches("[data-action='edit-state-name']")) {
    handleEditStateName(target.dataset.id);
  } else if (target.matches("[data-action='delete-state-name']")) {
    handleDeleteStateName(target.dataset.id);
  } else if (target.matches("[data-action='edit-financial-year']")) {
    handleEditFinancialYear(target.dataset.id);
  } else if (target.matches("[data-action='delete-financial-year']")) {
    handleDeleteFinancialYear(target.dataset.id);
  } else if (target.matches("[data-action='edit-unit-rate']")) {
    handleEditUnitRate(target.dataset.id);
  } else if (target.matches("[data-action='delete-unit-rate']")) {
    handleDeleteUnitRate(target.dataset.id);
  } else if (target.matches("[data-action='edit-pricing-data-row']")) {
    pricingDataValidationMessage = "";
    renderPricingDataTable();
  } else if (target.matches("[data-action='delete-pricing-data-row']")) {
    handleDeletePricingDataRow(target.dataset.id);
  } else if (target.id === "clearAllReportFiltersBtn") {
    reportRecordFilters = {};
    reportDrillDownExpanded.clear();
    renderReportsPanel();
  } else if (target.classList.contains("report-filter-btn")) {
    openReportFilterPopup(target.dataset.reportFilterCol, target);
  } else if (target.id === "adminLoginBtn") {
    handleAdminLogin();
    reportDrillDownExpanded.clear();
    renderReportsPanel();
  } else if (target.id === "adminLogoutBtn") {
    isAdminAuthenticated = false;
    reportDrillDownExpanded.clear();
    renderReportsPanel();
  } else if (target.matches("[data-action='admin-delete-report']")) {
    handleAdminDeleteReport(target.dataset.id);
  } else if (target.id === "printCircularCreateBtn") {
    handleCreateCircular();
  } else if (target.id === "printCircularSaveDraftBtn") {
    handleSaveDraftCircular();
  } else if (target.id === "cancelDraftCircularEditBtn") {
    draftCircularEditMode = false;
    printCircularSelectedApr = "";
    printCircularSelectedFinancialYear = "";
    printCircularSelectedDivision = "";
    printCircularSelectedState = "";
    printCircularSelectedMaterial = "";
    renderPrintCircularPanel();
  } else if (target.id === "approverSaveEditBtn") {
    saveApproverEdit();
  } else if (target.id === "approverApproveBtn") {
    approveUpdatedCircular(printCircularSelectedApr);
  } else if (target.id === "cancelApproverEditBtn") {
    cancelApproverEdit();
  } else if (target.id === "printCircularPrintBtn") {
    if (!printCircularSelectedApr) {
      window.alert("Please select an APR No. before printing.");
      return;
    }
    const termsEditor = masterDataPanel.querySelector(".circular-terms-editor");
    if (termsEditor) {
      printCircularTermsHtml = termsEditor.innerHTML || "";
    }
    const selected = printCircularSelectedApr
      ? completedPricingRecords.filter((r) => r.aprNumber === printCircularSelectedApr)
      : [];
    if (!selected.length) return;

    const records = selected.map((row, index) => getReportRowDisplayValues(row, index));
    const first = records[0];
    const uniqueMaterials = [...new Set(selected.map((r) => r.materialId).filter(Boolean))].map((mid) => masterDataEntries.find((m) => m.id === mid)?.description).filter(Boolean);
    const uniqueBatchNos = [...new Set(selected.map((r) => r.batchNo).filter(Boolean))];
    const uniqueCategories = [...new Set(selected.map((r) => r.category).filter(Boolean))].join(", ") || "";
    const dateOfApprovalRaw = selected[0].completedAt || "";
    const dateOfApproval = formatDateDisplay(dateOfApprovalRaw);
    const approvingAuthority = [...new Set(selected.map((r) => r.approvingAuthority).filter(Boolean))].join(", ") || "";
    const refNoteOfApproval = [...new Set(selected.map((r) => r.refNoteOfApproval).filter(Boolean))].join(", ") || "";

    const dateOfCircular = formatDateDisplay(printCircularDateOfCircular || dateOfApprovalRaw);
    const effectiveFrom = formatDateDisplay(printCircularEffectiveFrom || printCircularDateOfCircular || dateOfApprovalRaw);

    const headerInfo = {
      aprNumber: first.aprNumber || "",
      dateOfCircular: dateOfCircular,
      effectiveFrom: effectiveFrom,
      approvingAuthority: approvingAuthority,
      division: first.division || "",
      state: first.state || "",
      financialYear: first.financialYear || "",
      refNoteOfApproval: refNoteOfApproval,
      period: first.period || "",
      materials: uniqueMaterials.join(", ") || "",
      batchNos: uniqueBatchNos.join(", ") || "",
      category: uniqueCategories
    };

    const rows = selected.map((row, i) => {
      const vals = getReportRowDisplayValues(row, i);
      return `<tr>
        <td class="col-slno">${escapeHtml(vals.slNo || "")}</td>
        <td class="col-heading">${escapeHtml(vals.pricingHeading || "")}</td>
        <td class="col-value" style="text-align:right">${escapeHtml(vals.value || "")}</td>
        <td class="col-remarks">${escapeHtml(vals.remarks || "")}</td>
      </tr>`;
    }).join("");

    const circularDrafts = getStoredValue("circularDrafts", []);
    const checkStatus = getStoredValue("circularCheckStatus", {});
    const draft = circularDrafts.find((d) => d.aprNumber === printCircularSelectedApr);
    const isApproved = draft && (checkStatus[printCircularSelectedApr]?.status === "final_approved" || checkStatus[printCircularSelectedApr]?.status === "signed");

    const unapprovedWarning = !isApproved ? `<div class="circular-unapproved-warning">THIS CIRCULAR IS NOT APPROVED</div>` : "";

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) { window.alert("Unable to open print window. Please allow popups for this site."); return; }
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Pricing Circular - ${escapeHtml(headerInfo.aprNumber)}</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 24mm 16mm;
      @bottom-center {
        content: "Page " counter(page);
        font-family: Arial, Helvetica, sans-serif;
        font-size: 8pt;
        color: #475569;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.5pt;
      color: #233142;
      line-height: 1.4;
      background: white;
    }
    .circular-wrap {
      max-width: 178mm;
      margin: 0 auto;
    }
    .circular-title {
      text-align: center;
      font-size: 20pt;
      font-weight: 700;
      color: #003366;
      margin-bottom: 14px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .circular-unapproved-warning {
      text-align: center;
      font-size: 16pt;
      font-weight: 700;
      color: #dc3545;
      margin-bottom: 14px;
      padding: 10px;
      border: 2px solid #dc3545;
      background: #fff5f5;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .circular-details {
      margin-bottom: 14px;
      padding: 12px 14px;
      background: #f8fbff;
      border: 1px solid #dbe5f0;
      border-radius: 4px;
    }
    .circular-header-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .circular-header-table td {
      padding: 6px 8px;
      border: 1px solid #dbe5f0;
      vertical-align: top;
      word-wrap: break-word;
      overflow-wrap: anywhere;
      word-break: break-word;
      white-space: normal;
      line-height: 1.4;
    }
    .circular-header-label {
      width: 16%;
      font-weight: 700;
      color: #003366;
      white-space: normal;
      font-size: 8pt;
      text-transform: none;
      letter-spacing: 0.02em;
    }
    .circular-header-value {
      width: 34%;
      color: #233142;
      font-weight: 400;
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: normal;
      font-size: 9pt;
    }
    .circular-date-input {
      width: 100%;
      padding: 3px 6px;
      border: 1px solid #cbd5e1;
      border-radius: 3px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      color: #233142;
      background: #fff;
      box-sizing: border-box;
    }
    .circular-section-title {
      font-size: 12pt;
      font-weight: 700;
      color: #003366;
      margin: 14px 0 8px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .circular-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
    }
    .circular-table thead {
      display: table-header-group;
    }
    .circular-table thead tr {
      background: #003366 !important;
      color: white;
    }
    .circular-table th {
      padding: 7px 8px;
      border: 1px solid #cbd5e1;
      text-align: left;
      font-size: 9pt;
      font-weight: 700;
      vertical-align: middle;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }
    .circular-table td {
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      font-size: 9.5pt;
      vertical-align: top;
    }
    .circular-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    .col-slno { width: 1%; white-space: nowrap; }
    .col-heading { white-space: normal; overflow-wrap: anywhere; word-wrap: break-word; }
    .col-value { white-space: nowrap; overflow-wrap: normal; word-wrap: normal; text-align: right; }
    .col-remarks { white-space: nowrap; overflow-wrap: normal; word-wrap: normal; }
    .circular-intro {
      font-size: 10pt;
      font-weight: 600;
      color: #233142;
      margin: 12px 0 8px;
      text-align: left;
      word-wrap: break-word;
      overflow-wrap: anywhere;
      white-space: normal;
      line-height: 1.35;
    }
    .circular-gst {
      font-size: 10pt;
      font-weight: 600;
      color: #233142;
      margin: 10px 0 14px;
      text-align: left;
    }
    .circular-signatories {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 10px;
      margin-top: 24px;
      page-break-inside: avoid;
    }
    .circular-signatory-left {
      font-size: 9.5pt;
      font-weight: 700;
      color: #233142;
      align-self: flex-start;
      width: auto;
    }
    .circular-signatory-right {
      width: auto;
      text-align: right;
    }
    .circular-signatory-line {
      border-bottom: 1px solid #233142;
      margin-bottom: 4px;
      min-height: 32px;
    }
    .circular-signatory-name {
      font-size: 9.5pt;
      font-weight: 700;
      color: #233142;
    }
    .circular-signatory-role {
      font-size: 9pt;
      color: #233142;
    }
    .circular-signatory-box {
      width: 100%;
      padding: 6px 8px;
      border: none;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.5pt;
      color: #233142;
      line-height: 1.35;
      box-sizing: border-box;
      text-align: right;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }
    .circular-terms {
      margin-top: 18px;
      page-break-inside: auto;
    }
    .circular-terms-label {
      font-size: 9.5pt;
      font-weight: 700;
      color: #233142;
      margin-bottom: 4px;
    }
    .circular-terms-box {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.5pt;
      color: #233142;
      line-height: 1.35;
      box-sizing: border-box;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }
    .circular-terms-box table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin: 4px 0;
    }
    .circular-terms-box td,
    .circular-terms-box th {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      word-wrap: break-word;
      overflow-wrap: anywhere;
      white-space: normal;
      vertical-align: top;
    }
    .circular-page-footer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #dbe5f0;
      text-align: center;
      font-size: 8pt;
      color: #64748b;
      font-weight: 500;
    }
    .circular-cc {
      margin-top: 18px;
      page-break-inside: avoid;
    }
    .circular-cc-label {
      font-size: 9.5pt;
      font-weight: 700;
      color: #233142;
      margin-bottom: 4px;
    }
    .circular-cc-box {
      width: 100%;
      padding: 6px 8px;
      border: none;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.5pt;
      color: #233142;
      line-height: 1.35;
      box-sizing: border-box;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }
    @media print {
      body { margin: 0; }
      .circular-wrap { max-width: none; margin: 0; }
      .circular-table tr { page-break-inside: avoid; }
      .circular-table thead { display: table-header-group; }
      .circular-footer { page-break-inside: auto; }
      .circular-terms { page-break-inside: auto; }
      .circular-terms-box table { page-break-inside: auto; }
      .circular-signatories { page-break-inside: avoid; }
      .circular-cc { page-break-inside: auto; }
    }
  </style>
</head>
<body>
  <div class="circular-wrap">
     <div class="circular-title">Pricing Circular</div>
     ${unapprovedWarning}
     <div class="circular-details">
         <table class="circular-header-table">
           <tr>
             <td class="circular-header-label">APR No. :-</td>
             <td class="circular-header-value">${escapeHtml(headerInfo.aprNumber || "")}</td>
             <td class="circular-header-label">Division :-</td>
             <td class="circular-header-value">${escapeHtml(headerInfo.division || "")}</td>
             <td class="circular-header-label">Approving Authority :-</td>
             <td class="circular-header-value">${escapeHtml(headerInfo.approvingAuthority || "")}</td>
           </tr>
           <tr>
             <td class="circular-header-label">Date of Circular :-</td>
             <td class="circular-header-value">${escapeHtml(headerInfo.dateOfCircular || "")}</td>
             <td class="circular-header-label">State :-</td>
             <td class="circular-header-value">${escapeHtml(headerInfo.state || "")}</td>
             <td class="circular-header-label">Period :-</td>
             <td class="circular-header-value">${escapeHtml(headerInfo.period || "")}</td>
           </tr>
           <tr>
             <td class="circular-header-label">Effective From :-</td>
             <td class="circular-header-value">${escapeHtml(headerInfo.effectiveFrom || "")}</td>
             <td class="circular-header-label">Material Description :-</td>
             <td class="circular-header-value">${escapeHtml(headerInfo.materials || "")}</td>
             <td class="circular-header-label">Ref. Note of Approval :-</td>
             <td class="circular-header-value">${escapeHtml(headerInfo.refNoteOfApproval || "")}</td>
           </tr>
           <tr>
             <td class="circular-header-label">Financial Year :-</td>
             <td class="circular-header-value">${escapeHtml(headerInfo.financialYear || "")}</td>
             <td class="circular-header-label">Batch No. :-</td>
             <td class="circular-header-value">${escapeHtml(headerInfo.batchNos || "")}</td>
             <td class="circular-header-label">Category :-</td>
             <td class="circular-header-value">${escapeHtml(headerInfo.category || "")}</td>
           </tr>
         </table>
     </div>
     <div class="circular-section-title">Pricing Details</div>
      <div class="circular-intro">${escapeHtml(printCircularIntroText || "")}</div>
      <table class="circular-table">
        <thead>
          <tr>
            <th class="col-slno">Sl. No.</th>
            <th class="col-heading">Pricing Heading</th>
            <th class="col-value">Value / Amount / Text</th>
            <th class="col-remarks">Remarks</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="circular-footer">
          <div class="circular-gst">GST will be charged extra as applicable.</div>
          <div class="circular-terms">
            <div class="circular-terms-label">Other terms and conditions</div>
             <div class="circular-terms-box">${printCircularTermsHtml || ""}</div>
          </div>
          <div style="text-align: right; margin-top: 24px;">
            <div class="circular-signatory-box">${escapeHtml(printCircularSignatoryText || "").replace(/\n/g, "<br>")}</div>
          </div>
        <div style="text-align: left; margin-top: 10px;">To State Incharge (Mktg.) / State Finance Incharge</div>
        <div class="circular-cc">
          <div class="circular-cc-label">CC To</div>
          <div class="circular-cc-box">${escapeHtml(printCircularCcText || "").replace(/\n/g, "<br>")}</div>
        </div>
        <div class="circular-page-footer">© ${new Date().getFullYear()} Pricing Data Portal | All Rights Reserved</div>
      </div>
   </div>
  <script>
    window.onload = function() {
      requestAnimationFrame(function() {
        setTimeout(function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        }, 800);
      });
    };
  <\/script>
</body>
    </html>`);
    printWindow.document.close();
  } else if (target.classList.contains("checker-tab")) {
    event.stopPropagation();
    event.preventDefault();
    checkerActiveTab = target.dataset.tab;
    document.querySelectorAll(".checker-tab").forEach((t) => t.classList.remove("active"));
    target.classList.add("active");
    document.querySelectorAll(".checker-panel").forEach((p) => (p.style.display = "none"));
    const panel = document.getElementById(checkerActiveTab + "Panel");
    if (panel) panel.style.display = "block";
    return;
  } else if (target.classList.contains("view-checker1-btn")) {
    const aprNumber = target.dataset.apr;
    openCheckerReview(aprNumber, "checker1");
  } else if (target.classList.contains("view-checker2-btn")) {
    const aprNumber = target.dataset.apr;
    openCheckerReview(aprNumber, "checker2");
  } else if (target.classList.contains("view-circular-btn")) {
    const aprNumber = target.dataset.apr;
    viewCircularOnly(aprNumber);
  } else if (target.classList.contains("view-returned-btn")) {
    const aprNumber = target.dataset.apr;
    openReturnedCorrection(aprNumber);
  } else if (target.id === "checkerEditBtn") {
    const aprNumber = selectedCircularForCheck?.aprNumber || printCircularSelectedApr;
    if (aprNumber) {
      openCheckerEdit(aprNumber, currentCheckerLevel || checkerActiveTab || "checker1");
    }
  } else if (target.id === "returnedCircularEditBtn") {
    const aprNumber = selectedCircularForCheck?.aprNumber || printCircularSelectedApr;
    if (aprNumber) {
      openReturnedCircularEdit(aprNumber);
    }
  } else if (target.id === "returnedCircularSaveBtn") {
    handleReturnedCircularEditSave();
  } else if (target.id === "returnedCircularBackBtn") {
    handleReturnedCircularEditBack();
  } else if (target.id === "checkerPassBtn") {
    handleCheckerPass();
  } else if (target.id === "checkerEditPassBtn") {
    handleCheckerEditPass();
  } else if (target.id === "checkerEditSaveBtn") {
    handleCheckerEditSave();
  } else if (target.id === "checkerReturnBtn") {
    handleCheckerReturn();
  } else if (target.id === "resubmitBtn") {
    handleResubmit();
  } else if (target.id === "backToCheckCircularBtn") {
    goBackToPreviousScreen();
  } else if (target.classList.contains("approval-tab")) {
    event.stopPropagation();
    event.preventDefault();
    const tab = target.dataset.tab;
    approvalActiveTab = tab;
    document.querySelectorAll(".approval-tab").forEach((t) => t.classList.remove("active"));
    target.classList.add("active");
    document.querySelectorAll(".approval-panel").forEach((p) => (p.style.display = "none"));
    const panel = document.getElementById(tab + "Panel");
    if (panel) panel.style.display = "block";
    return;
  } else if (target.classList.contains("view-pending-circular-btn")) {
    event.stopPropagation();
    const aprNumber = target.dataset.apr;
    viewCircularOnly(aprNumber);
  } else if (target.classList.contains("edit-pending-circular-btn")) {
    event.stopPropagation();
    const aprNumber = target.dataset.apr;
    openEditPendingCircular(aprNumber);
  } else if (target.classList.contains("return-pending-circular-btn")) {
    event.stopPropagation();
    const aprNumber = target.dataset.apr;
    openReturnForCorrection(aprNumber);
  } else if (target.classList.contains("approve-circular-btn")) {
    event.stopPropagation();
    const aprNumber = target.dataset.apr;
    approveCircularFinal(aprNumber);
  } else if (target.classList.contains("sign-circular-btn")) {
    event.stopPropagation();
    const aprNumber = target.dataset.apr;
    signCircularDigital(aprNumber);
  } else if (target.classList.contains("print-pending-circular-btn")) {
    event.stopPropagation();
    const aprNumber = target.dataset.apr;
    printApprovedCircular(aprNumber);
  } else if (target.classList.contains("view-approved-circular-btn")) {
    event.stopPropagation();
    const aprNumber = target.dataset.apr;
    viewCircularOnly(aprNumber);
  } else if (target.classList.contains("print-approved-circular-btn")) {
    event.stopPropagation();
    const aprNumber = target.dataset.apr;
    printApprovedCircular(aprNumber);
  } else if (target.classList.contains("download-pdf-btn")) {
    event.stopPropagation();
    const aprNumber = target.dataset.apr;
    downloadArchivePdf(aprNumber);
  } else if (target.id === "expandArchiveAllBtn") {
    event.stopPropagation();
    event.preventDefault();
    const tree = buildCircularArchiveTree();
    function addAllNodeIds(nodes) {
      for (const node of nodes) {
        if ((node.children && node.children.length > 0) || (node.records && node.records.length > 0)) {
          circularArchiveExpanded.add(node.id);
        }
        if (node.children) addAllNodeIds(node.children);
      }
    }
    addAllNodeIds(tree);
    renderCircularArchivePanel();
  } else if (target.id === "collapseArchiveAllBtn") {
    event.stopPropagation();
    event.preventDefault();
    circularArchiveExpanded.clear();
    renderCircularArchivePanel();
  } else if (target.classList.contains("archive-drill-toggle")) {
    event.stopPropagation();
    event.preventDefault();
    const nodeId = target.dataset.nodeId;
    if (circularArchiveExpanded.has(nodeId)) circularArchiveExpanded.delete(nodeId); else circularArchiveExpanded.add(nodeId);
    renderCircularArchivePanel();
  } else if (target.classList.contains("archive-view-btn")) {
    event.stopPropagation();
    const aprNumber = target.dataset.apr;
    viewCircularOnly(aprNumber);
  } else if (target.classList.contains("archive-download-btn")) {
    event.stopPropagation();
    const aprNumber = target.dataset.apr;
    downloadArchivePdf(aprNumber);
  } else if (target.id === "expandApprovedAllBtn") {
    event.stopPropagation();
    event.preventDefault();
    const circularDrafts = getStoredValue("circularDrafts", []);
    const checkStatus = getStoredValue("circularCheckStatus", {});
    const approvedCirculations = circularDrafts.filter((d) => {
      const status = checkStatus[d.aprNumber] || {};
      return status.status === "final_approved" || status.status === "signed";
    });
    const tree = buildApprovedArchiveTree(approvedCirculations, checkStatus);
    function addAllNodeIds(nodes) {
      for (const node of nodes) {
        if ((node.children && node.children.length > 0) || (node.records && node.records.length > 0)) {
          approvedArchiveExpanded.add(node.id);
        }
        if (node.children) addAllNodeIds(node.children);
      }
    }
    addAllNodeIds(tree);
    renderApproveCircularPanel();
  } else if (target.id === "collapseApprovedAllBtn") {
    event.stopPropagation();
    event.preventDefault();
    approvedArchiveExpanded.clear();
    renderApproveCircularPanel();
  } else if (target.classList.contains("approved-drill-toggle")) {
    event.stopPropagation();
    event.preventDefault();
    const nodeId = target.dataset.nodeId;
    if (approvedArchiveExpanded.has(nodeId)) approvedArchiveExpanded.delete(nodeId); else approvedArchiveExpanded.add(nodeId);
    renderApproveCircularPanel();
  } else if (target.classList.contains("approved-view-btn")) {
    event.stopPropagation();
    const aprNumber = target.dataset.apr;
    viewCircularOnly(aprNumber);
  } else if (target.classList.contains("approved-digital-sign-btn")) {
    event.stopPropagation();
    const aprNumber = target.dataset.apr;
    handleDigitalSign(aprNumber);
  } else if (target.classList.contains("approved-signed-btn")) {
    event.stopPropagation();
    const aprNumber = target.dataset.apr;
    viewCircularOnly(aprNumber);
  } else if (target.classList.contains("approved-print-btn")) {
    event.stopPropagation();
    const aprNumber = target.dataset.apr;
    printApprovedCircular(aprNumber);
  }
});

function openCheckerReview(aprNumber, level) {
  const circularDrafts = getStoredValue("circularDrafts", []);
  const draft = circularDrafts.find((d) => d.aprNumber === aprNumber);
  if (!draft) return;

  pushNavigationHistoryState();

  selectedCircularForCheck = { ...draft, checkerLevel: level };
  currentCheckerLevel = level;
  currentAppView = "check-circular";

  printCircularSelectedApr = draft.aprNumber || "";
  printCircularSelectedFinancialYear = draft.financialYearId || "";
  printCircularSelectedDivision = draft.division || "";
  printCircularSelectedState = draft.stateId || "";
  printCircularSelectedMaterial = draft.materialId || "";
  printCircularTermsHtml = draft.termsHtml || "";
  printCircularIntroText = draft.introText || "";
  printCircularSignatoryText = draft.signatoryText || printCircularSignatoryText;
  printCircularCcText = draft.ccText || "";
  printCircularDateOfCircular = draft.dateOfCircular || "";
  printCircularEffectiveFrom = draft.effectiveFrom || "";

  const checkStatus = getStoredValue("circularCheckStatus", {});
  const auditTrail = getStoredValue("circularAuditTrail", {});
  const audit = auditTrail[aprNumber] || [];

  const auditHtml = audit.length
    ? audit
        .map(
          (entry) => `
        <div class="audit-entry">
          <span class="audit-timestamp">${new Date(entry.timestamp).toLocaleString()}</span>
          <span class="audit-action"><span class="audit-level">${entry.level}:</span> ${escapeHtml(entry.action)}${entry.remarks ? " - " + escapeHtml(entry.remarks) : ""}</span>
        </div>`
        )
        .join("")
    : '<p class="empty-state">No audit trail entries.</p>';

  masterDataPanel.innerHTML = `
    <div class="master-data-card pricing-data-card">
      <div class="panel-heading">
        <h2>${level === "checker1" ? "CHECKER-1 REVIEW" : "CHECKER-2 REVIEW"}</h2>
        <p>Reviewing APR No.: ${escapeHtml(aprNumber)}</p>
      </div>
      <div class="checker-action-panel">
        <h4>Circular Details</h4>
        <p><strong>APR No.:</strong> ${escapeHtml(draft.aprNumber || "")}</p>
        <p><strong>Financial Year:</strong> ${escapeHtml(financialYearEntries.find((e) => e.id === draft.financialYearId)?.year || "")}</p>
        <p><strong>Division:</strong> ${escapeHtml(draft.division || "")}</p>
        <p><strong>State:</strong> ${escapeHtml(stateNameEntries.find((e) => e.id === draft.stateId)?.name || "")}</p>
        <p><strong>Material:</strong> ${escapeHtml(masterDataEntries.find((e) => e.id === draft.materialId)?.description || "")}</p>
      </div>
      <div class="checker-action-panel">
        <h4>Checker Remarks / Discrepancy</h4>
        <textarea class="checker-remarks-textarea" id="checkerRemarks" placeholder="Enter discrepancy or remarks (required if returning)"></textarea>
        <div class="checker-action-buttons">
          <button type="button" class="btn-secondary" id="checkerEditBtn">EDIT</button>
          <button type="button" class="secondary-btn" id="backToCheckCircularBtn">BACK</button>
          <button type="button" class="btn-pass" id="checkerPassBtn">CHECKED & PASSED</button>
          <button type="button" class="btn-return" id="checkerReturnBtn">RETURN FOR CORRECTION</button>
        </div>
      </div>
      <div class="audit-trail">
        <h4>Audit Trail</h4>
        ${auditHtml}
      </div>
    </div>
  `;
}

function openCheckerEdit(aprNumber, level) {
  const circularDrafts = getStoredValue("circularDrafts", []);
  const draft = circularDrafts.find((item) => item.aprNumber === aprNumber);
  if (!draft) return;

  pushNavigationHistoryState();

  selectedCircularForCheck = { ...draft, checkerLevel: level, editingFromChecker: true };
  currentCheckerLevel = level;
  currentAppView = "print-circular";
  document.body.classList.add("print-circular-active");

  printCircularSelectedApr = draft.aprNumber || "";
  printCircularSelectedFinancialYear = draft.financialYearId || "";
  printCircularSelectedDivision = draft.division || "";
  printCircularSelectedState = draft.stateId || "";
  printCircularSelectedMaterial = draft.materialId || "";
  printCircularTermsHtml = draft.termsHtml || "";
  printCircularIntroText = draft.introText || "";
  printCircularSignatoryText = draft.signatoryText || printCircularSignatoryText;
  printCircularCcText = draft.ccText || "";
  printCircularDateOfCircular = draft.dateOfCircular || "";
  printCircularEffectiveFrom = draft.effectiveFrom || "";

  renderPrintCircularPanel();
}

function handleCheckerEditSave() {
  if (!selectedCircularForCheck || !printCircularSelectedApr) return;

  const aprNumber = printCircularSelectedApr;
  const level = currentCheckerLevel || selectedCircularForCheck.checkerLevel;
  const termsEditor = masterDataPanel.querySelector(".circular-terms-editor");
  const introEditor = masterDataPanel.querySelector(".circular-intro-editor");
  const signatoryTextarea = masterDataPanel.querySelector(".circular-signatory-textarea");
  const ccTextarea = masterDataPanel.querySelector(".circular-cc-textarea");
  const dateOfCircularInput = masterDataPanel.querySelector("#circularDateOfCircular");
  const effectiveFromInput = masterDataPanel.querySelector("#circularEffectiveFrom");

  if (!dateOfCircularInput || !dateOfCircularInput.value) {
    window.alert("Please enter the Date of Circular before saving.");
    return;
  }
  if (!effectiveFromInput || !effectiveFromInput.value) {
    window.alert("Please enter the Effective From date before saving.");
    return;
  }
  if (!signatoryTextarea || !signatoryTextarea.value.trim()) {
    window.alert("Please enter the Signatory details before saving.");
    return;
  }

  const circularDrafts = getStoredValue("circularDrafts", []);
  const draftIndex = circularDrafts.findIndex((draft) => draft.aprNumber === aprNumber);
  if (draftIndex >= 0) {
    circularDrafts[draftIndex] = {
      ...circularDrafts[draftIndex],
      aprNumber,
      financialYearId: printCircularSelectedFinancialYear || circularDrafts[draftIndex].financialYearId || "",
      division: printCircularSelectedDivision || circularDrafts[draftIndex].division || "",
      stateId: printCircularSelectedState || circularDrafts[draftIndex].stateId || "",
      materialId: printCircularSelectedMaterial || circularDrafts[draftIndex].materialId || "",
      termsHtml: termsEditor ? termsEditor.innerHTML : printCircularTermsHtml,
      introText: introEditor ? (introEditor.innerText || introEditor.textContent) : printCircularIntroText,
      signatoryText: signatoryTextarea ? signatoryTextarea.value : printCircularSignatoryText,
      ccText: ccTextarea ? ccTextarea.value : printCircularCcText,
      dateOfCircular: dateOfCircularInput ? dateOfCircularInput.value : printCircularDateOfCircular,
      effectiveFrom: effectiveFromInput ? effectiveFromInput.value : printCircularEffectiveFrom,
      lastEditedBy: level === "checker1" ? "CHECKER-1" : "CHECKER-2",
      lastEditedAt: new Date().toISOString(),
    };
  }
  setStoredValue("circularDrafts", circularDrafts);

  const auditTrail = getStoredValue("circularAuditTrail", {});
  if (!auditTrail[aprNumber]) auditTrail[aprNumber] = [];
  auditTrail[aprNumber].push({
    action: "edited_by_checker",
    level: level === "checker1" ? "CHECKER-1" : "CHECKER-2",
    remarks: "Circular edited before check pass",
    timestamp: new Date().toISOString(),
  });
  setStoredValue("circularAuditTrail", auditTrail);

  window.alert("Circular updated successfully.");
  renderPrintCircularPanel();
}

function handleCheckerEditPass() {
  if (!selectedCircularForCheck) return;
  handleCheckerEditSave();
  if (selectedCircularForCheck) {
    handleCheckerPass();
  }
}

function viewCircularOnly(aprNumber) {
  const circularDrafts = getStoredValue("circularDrafts", []);
  const draft = circularDrafts.find((d) => d.aprNumber === aprNumber);
  if (!draft) return;

  pushNavigationHistoryState();

  const checkStatus = getStoredValue("circularCheckStatus", {});
  const status = checkStatus[aprNumber]?.status;
  const canEdit = status === "ready_for_approval";

  printCircularSelectedApr = draft.aprNumber || "";
  printCircularSelectedFinancialYear = draft.financialYearId || "";
  printCircularSelectedDivision = draft.division || "";
  printCircularSelectedState = draft.stateId || "";
  printCircularSelectedMaterial = draft.materialId || "";
  printCircularTermsHtml = draft.termsHtml || "";
  printCircularIntroText = draft.introText || "";
  printCircularSignatoryText = draft.signatoryText || printCircularSignatoryText;
  printCircularCcText = draft.ccText || "";
  printCircularDateOfCircular = draft.dateOfCircular || "";
  printCircularEffectiveFrom = draft.effectiveFrom || "";

  const selectedAprRecords = completedPricingRecords.filter((r) => r.aprNumber === aprNumber);
  const records = selectedAprRecords.map((row, index) => getReportRowDisplayValues(row, index));

  const first = records[0] || {};
  const uniqueMaterials = [...new Set(selectedAprRecords.map((r) => r.materialId).filter(Boolean))].map((mid) => masterDataEntries.find((m) => m.id === mid)?.description).filter(Boolean);
  const uniqueBatchNos = [...new Set(selectedAprRecords.map((r) => r.batchNo).filter(Boolean))];
  const uniqueCategories = [...new Set(selectedAprRecords.map((r) => r.category).filter(Boolean))].join(", ") || "";
  const approvingAuthority = [...new Set(selectedAprRecords.map((r) => r.approvingAuthority).filter(Boolean))].join(", ") || "";
  const refNoteOfApproval = [...new Set(selectedAprRecords.map((r) => r.refNoteOfApproval).filter(Boolean))].join(", ") || "";

  const circularHeader = `
    <table class="circular-header-table">
      <tr>
        <td class="circular-header-label">APR No. :-</td>
        <td class="circular-header-value">${escapeHtml(first.aprNumber || "")}</td>
        <td class="circular-header-label">Division :-</td>
        <td class="circular-header-value">${escapeHtml(first.division || "")}</td>
        <td class="circular-header-label">Approving Authority :-</td>
        <td class="circular-header-value">${escapeHtml(approvingAuthority)}</td>
      </tr>
      <tr>
        <td class="circular-header-label">Date of Circular :-</td>
        <td class="circular-header-value">${escapeHtml(printCircularDateOfCircular || "")}</td>
        <td class="circular-header-label">State :-</td>
        <td class="circular-header-value">${escapeHtml(first.state || "")}</td>
        <td class="circular-header-label">Period :-</td>
        <td class="circular-header-value">${escapeHtml(first.period || "")}</td>
      </tr>
      <tr>
        <td class="circular-header-label">Effective From :-</td>
        <td class="circular-header-value">${escapeHtml(printCircularEffectiveFrom || "")}</td>
        <td class="circular-header-label">Material Description :-</td>
        <td class="circular-header-value">${escapeHtml(uniqueMaterials.join(", ") || "")}</td>
        <td class="circular-header-label">Ref. Note of Approval :-</td>
        <td class="circular-header-value">${escapeHtml(refNoteOfApproval)}</td>
      </tr>
      <tr>
        <td class="circular-header-label">Financial Year :-</td>
        <td class="circular-header-value">${escapeHtml(first.financialYear || "")}</td>
        <td class="circular-header-label">Batch No. :-</td>
        <td class="circular-header-value">${escapeHtml(uniqueBatchNos.join(", ") || "")}</td>
        <td class="circular-header-label">Category :-</td>
        <td class="circular-header-value">${escapeHtml(uniqueCategories)}</td>
      </tr>
    </table>`;

  const thead = `
    <tr>
      <th class="col-slno">Sl. No.</th>
      <th class="col-heading">Pricing Heading</th>
      <th class="col-value">Value / Amount / Text</th>
      <th class="col-remarks">Remarks</th>
    </tr>`;

  const tbody = records.length
    ? records.map((r, i) => `
        <tr>
          <td class="col-slno">${escapeHtml(r.slNo || "")}</td>
          <td class="col-heading">${escapeHtml(r.pricingHeading || "")}</td>
          <td class="col-value">${formatMultilineText(r.value)}</td>
          <td class="col-remarks">${escapeHtml(r.remarks || "")}</td>
        </tr>
      `).join("")
    : "";

  masterDataPanel.innerHTML = `
    <div class="master-data-card pricing-data-card print-circular-card">
      <div class="panel-heading">
        <h2>VIEW CIRCULAR</h2>
        <p>APR No.: ${escapeHtml(aprNumber)} (Read-Only View)</p>
      </div>
      ${circularHeader}
      <div class="circular-intro-editor" contenteditable="false">${escapeHtml(printCircularIntroText || "")}</div>
      <div class="circular-section-title">Pricing Details</div>
      <div class="table-wrapper saved-table-wrapper">
        <table class="master-data-table pricing-data-table">
          <thead><tr>${thead}</thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
      <div class="circular-gst">GST will be charged extra as applicable.</div>
      <div class="circular-terms">
        <div class="circular-terms-label">Other terms and conditions</div>
        <div class="circular-terms-editor" contenteditable="false">${printCircularTermsHtml || ""}</div>
      </div>
      <div style="text-align: right; margin-top: 20px;">
        <div class="circular-signatory-name">${escapeHtml(printCircularSignatoryText || "").replace(/\n/g, "<br>")}</div>
      </div>
      <div class="circular-page-footer">© ${new Date().getFullYear()} Pricing Data Portal | All Rights Reserved</div>
      <div class="table-actions pricing-data-actions" style="margin-top:12px">
        ${canEdit ? `<button type="button" class="secondary-btn edit-pending-circular-btn" data-apr="${escapeHtml(aprNumber)}">Edit</button>` : ""}
        <button type="button" class="secondary-btn" id="backToCheckCircularBtn">BACK</button>
      </div>
    </div>
  `;
}

function printApprovedCircular(aprNumber) {
  const circularDrafts = getStoredValue("circularDrafts", []);
  const draft = circularDrafts.find((d) => d.aprNumber === aprNumber);
  if (!draft) return;

  printCircularSelectedApr = draft.aprNumber || "";
  printCircularSelectedFinancialYear = draft.financialYearId || "";
  printCircularSelectedDivision = draft.division || "";
  printCircularSelectedState = draft.stateId || "";
  printCircularSelectedMaterial = draft.materialId || "";
  printCircularTermsHtml = draft.termsHtml || "";
  printCircularIntroText = draft.introText || "";
  printCircularSignatoryText = draft.signatoryText || printCircularSignatoryText;
  printCircularCcText = draft.ccText || "";
  printCircularDateOfCircular = draft.dateOfCircular || "";
  printCircularEffectiveFrom = draft.effectiveFrom || "";

  const selectedAprRecords = completedPricingRecords.filter((r) => r.aprNumber === aprNumber);
  const records = selectedAprRecords.map((row, index) => getReportRowDisplayValues(row, index));

  const first = records[0] || {};
  const uniqueMaterials = [...new Set(selectedAprRecords.map((r) => r.materialId).filter(Boolean))].map((mid) => masterDataEntries.find((m) => m.id === mid)?.description).filter(Boolean);
  const uniqueBatchNos = [...new Set(selectedAprRecords.map((r) => r.batchNo).filter(Boolean))];
  const uniqueCategories = [...new Set(selectedAprRecords.map((r) => r.category).filter(Boolean))].join(", ") || "";
  const approvingAuthority = [...new Set(selectedAprRecords.map((r) => r.approvingAuthority).filter(Boolean))].join(", ") || "";
  const refNoteOfApproval = [...new Set(selectedAprRecords.map((r) => r.refNoteOfApproval).filter(Boolean))].join(", ") || "";

  const circularHeader = `
    <table class="circular-header-table">
      <tr>
        <td class="circular-header-label">APR No. :-</td>
        <td class="circular-header-value">${escapeHtml(first.aprNumber || "")}</td>
        <td class="circular-header-label">Division :-</td>
        <td class="circular-header-value">${escapeHtml(first.division || "")}</td>
        <td class="circular-header-label">Approving Authority :-</td>
        <td class="circular-header-value">${escapeHtml(approvingAuthority)}</td>
      </tr>
      <tr>
        <td class="circular-header-label">Date of Circular :-</td>
        <td class="circular-header-value">${escapeHtml(printCircularDateOfCircular || "")}</td>
        <td class="circular-header-label">State :-</td>
        <td class="circular-header-value">${escapeHtml(first.state || "")}</td>
        <td class="circular-header-label">Period :-</td>
        <td class="circular-header-value">${escapeHtml(first.period || "")}</td>
      </tr>
      <tr>
        <td class="circular-header-label">Effective From :-</td>
        <td class="circular-header-value">${escapeHtml(printCircularEffectiveFrom || "")}</td>
        <td class="circular-header-label">Material Description :-</td>
        <td class="circular-header-value">${escapeHtml(uniqueMaterials.join(", ") || "")}</td>
        <td class="circular-header-label">Ref. Note of Approval :-</td>
        <td class="circular-header-value">${escapeHtml(refNoteOfApproval)}</td>
      </tr>
      <tr>
        <td class="circular-header-label">Financial Year :-</td>
        <td class="circular-header-value">${escapeHtml(first.financialYear || "")}</td>
        <td class="circular-header-label">Batch No. :-</td>
        <td class="circular-header-value">${escapeHtml(uniqueBatchNos.join(", ") || "")}</td>
        <td class="circular-header-label">Category :-</td>
        <td class="circular-header-value">${escapeHtml(uniqueCategories)}</td>
      </tr>
    </table>`;

  const thead = `
    <tr>
      <th class="col-slno">Sl. No.</th>
      <th class="col-heading">Pricing Heading</th>
      <th class="col-value">Value / Amount / Text</th>
      <th class="col-remarks">Remarks</th>
    </tr>`;

  const tbody = records.length
    ? records.map((r, i) => `
        <tr>
          <td class="col-slno">${escapeHtml(r.slNo || "")}</td>
          <td class="col-heading">${escapeHtml(r.pricingHeading || "")}</td>
          <td class="col-value">${formatMultilineText(r.value)}</td>
          <td class="col-remarks">${escapeHtml(r.remarks || "")}</td>
        </tr>
      `).join("")
    : "";

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>Circular - ${escapeHtml(aprNumber)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    .circular-title { text-align: center; font-size: 18pt; font-weight: bold; color: #003366; margin-bottom: 14px; text-transform: uppercase; }
    .circular-header-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .circular-header-table td { padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 10pt; }
    .circular-header-label { font-weight: 700; background: #f8fbff; width: 15%; }
    .circular-header-value { width: 18%; }
    .circular-intro { margin-bottom: 14px; font-size: 10.5pt; line-height: 1.5; }
    .circular-section-title { font-size: 11pt; font-weight: 700; color: #003366; margin: 14px 0 8px; text-transform: uppercase; }
    .circular-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    .circular-table th { background: #003366; color: white; padding: 7px 8px; border: 1px solid #cbd5e1; text-align: left; font-size: 9pt; }
    .circular-table td { padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 9.5pt; vertical-align: top; }
    .circular-table td.col-value { text-align: right; }
    .circular-gst { font-size: 10pt; margin: 10px 0; }
    .circular-terms { margin-top: 18px; }
    .circular-terms-label { font-size: 10pt; font-weight: 700; margin-bottom: 4px; }
    .circular-terms-box { border: 1px solid #cbd5e1; padding: 8px; font-size: 10pt; min-height: 40px; }
    .circular-signatory { text-align: right; margin-top: 20px; }
    .circular-signatory-name { font-weight: 700; font-size: 10pt; }
    .circular-recipient { margin-top: 14px; page-break-inside: avoid; }
    .circular-recipient-label { font-weight: 700; font-size: 10pt; margin-bottom: 4px; }
    .circular-recipient-box { white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; line-height: 1.4; }
    .circular-footer { text-align: center; font-size: 9pt; color: #64748b; margin-top: 20px; border-top: 1px solid #cbd5e1; padding-top: 10px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="circular-title">PRICING CIRCULAR</div>
  ${circularHeader}
  <div class="circular-intro">${escapeHtml(printCircularIntroText || "")}</div>
  <div class="circular-section-title">Pricing Details</div>
  <table class="circular-table">
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>
  <div class="circular-gst">GST will be charged extra as applicable.</div>
  <div class="circular-terms">
    <div class="circular-terms-label">Other terms and conditions</div>
    <div class="circular-terms-box">${printCircularTermsHtml || ""}</div>
  </div>
  <div class="circular-signatory">
    <div class="circular-signatory-name">${escapeHtml(printCircularSignatoryText || "").replace(/\n/g, "<br>")}</div>
  </div>
  <div class="circular-recipient">To State Incharge (Mktg.) / State Finance Incharge</div>
  <div class="circular-recipient">
    <div class="circular-recipient-label">CC To</div>
    <div class="circular-recipient-box">${escapeHtml(printCircularCcText || "").replace(/\n/g, "<br>")}</div>
  </div>
  <div class="circular-footer">© ${new Date().getFullYear()} Pricing Data Portal | All Rights Reserved</div>
</body>
</html>
  `);
  printWindow.document.close();
  printWindow.print();
}

function buildCircularArchiveTree() {
  const circularDrafts = getStoredValue("circularDrafts", []);
  const checkStatus = getStoredValue("circularCheckStatus", {});

  const getStatus = (aprNumber) => {
    return checkStatus[aprNumber] || { status: "draft", checker1: null, checker2: null };
  };

  const approvedRecords = [];

  for (const draft of circularDrafts) {
    const status = getStatus(draft.aprNumber);
    if (status.status === "final_approved" || status.status === "signed") {
      const fyDisplay = financialYearEntries.find((e) => e.id === draft.financialYearId)?.year || draft.financialYearId || "Unknown";
      const stateDisplay = stateNameEntries.find((e) => e.id === draft.stateId)?.name || draft.stateId || "Unknown";
      const materialDisplay = masterDataEntries.find((e) => e.id === draft.materialId)?.description || draft.materialId || "Unknown";

      approvedRecords.push({
        id: `apr:${draft.aprNumber}`,
        label: draft.aprNumber || "Unknown",
        count: 1,
        children: [],
        records: [draft],
        aprNumber: draft.aprNumber,
        financialYear: fyDisplay,
        division: draft.division || "Unknown",
        state: stateDisplay,
        material: materialDisplay,
        status: status.status,
        level: "apr",
      });
    }
  }

  const tree = [];
  const fyMap = new Map();

  for (const record of approvedRecords) {
    const fy = record.financialYear;
    const div = record.division;
    const state = record.state;
    const mat = record.material;

    let fyNode = fyMap.get(fy);
    if (!fyNode) {
      fyNode = { id: `fy:${fy}`, label: fy, count: 0, children: [], records: [], divMap: new Map(), level: "fy" };
      fyMap.set(fy, fyNode);
      tree.push(fyNode);
    }

    let divNode = fyNode.divMap.get(div);
    if (!divNode) {
      divNode = { id: `fy:${fy}:div:${div}`, label: div, count: 0, children: [], records: [], stateMap: new Map(), level: "div" };
      fyNode.divMap.set(div, divNode);
      fyNode.children.push(divNode);
    }

    let stateNode = divNode.stateMap.get(state);
    if (!stateNode) {
      stateNode = { id: `fy:${fy}:div:${div}:state:${state}`, label: state, count: 0, children: [], records: [], matMap: new Map(), level: "state" };
      divNode.stateMap.set(state, stateNode);
      divNode.children.push(stateNode);
    }

    let matNode = stateNode.matMap.get(mat);
    if (!matNode) {
      matNode = { id: `fy:${fy}:div:${div}:state:${state}:mat:${mat}`, label: mat, count: 0, children: [], records: [], aprMap: new Map(), level: "mat" };
      stateNode.matMap.set(mat, matNode);
      stateNode.children.push(matNode);
    }

    let aprNode = matNode.aprMap.get(record.aprNumber);
    if (!aprNode) {
      aprNode = { id: `fy:${fy}:div:${div}:state:${state}:mat:${mat}:apr:${record.aprNumber}`, label: record.aprNumber, count: 1, children: [], records: [record], level: "apr", status: record.status };
      matNode.aprMap.set(record.aprNumber, aprNode);
      matNode.children.push(aprNode);
    }
  }

  function setCounts(node) {
    if (node.children.length === 0) {
      node.count = node.records.length;
    } else {
      node.count = 0;
      for (const child of node.children) {
        setCounts(child);
        node.count += child.count || 0;
      }
    }
  }

  for (const fyNode of tree) {
    setCounts(fyNode);
  }

  return tree;
}

function renderArchiveDrillDownNode(node, level = 0) {
  const hasChildren = node.children && node.children.length > 0;
  const hasRecords = node.records && node.records.length > 0;
  const hasToggle = hasChildren || hasRecords;
  const isExpanded = circularArchiveExpanded.has(node.id);
  const indent = level * 24;
  const toggleIcon = hasToggle ? (isExpanded ? "−" : "+") : "";
  const toggleClass = hasToggle ? "archive-drill-toggle" : "archive-drill-leaf";
  const recordLabel = node.count === 1 ? "Record" : "Records";

  let html = `
    <div class="archive-drill-node" style="margin-left:${indent}px;" data-node-id="${escapeHtml(node.id)}">
      <button type="button" class="${toggleClass}" data-node-id="${escapeHtml(node.id)}">${toggleIcon}</button>
      <span class="archive-drill-label">${escapeHtml(node.label)}</span>
      <span class="archive-drill-count">(${node.count} ${recordLabel})</span>
    </div>
  `;

  if (isExpanded && hasChildren) {
    for (const child of node.children) {
      html += renderArchiveDrillDownNode(child, level + 1);
    }
  }

  if (isExpanded && hasRecords && node.level === "apr") {
    html += renderArchiveDetailView(node.records[0], level + 1);
  }

  return html;
}

function renderArchiveDetailView(record, level) {
  const indent = level * 24;
  const draft = record;
  const aprNumber = draft.aprNumber;

  const selectedAprRecords = completedPricingRecords.filter((r) => r.aprNumber === aprNumber);
  const records = selectedAprRecords.map((row, idx) => getReportRowDisplayValues(row, idx));
  const first = records[0] || {};
  const uniqueMaterials = [...new Set(selectedAprRecords.map((r) => r.materialId).filter(Boolean))].map((mid) => masterDataEntries.find((m) => m.id === mid)?.description).filter(Boolean);
  const uniqueBatchNos = [...new Set(selectedAprRecords.map((r) => r.batchNo).filter(Boolean))];
  const uniqueCategories = [...new Set(selectedAprRecords.map((r) => r.category).filter(Boolean))].join(", ") || "";
  const approvingAuthority = [...new Set(selectedAprRecords.map((r) => r.approvingAuthority).filter(Boolean))].join(", ") || "";
  const refNoteOfApproval = [...new Set(selectedAprRecords.map((r) => r.refNoteOfApproval).filter(Boolean))].join(", ") || "";

  const statusLabel = record.status === "signed" ? "APPROVED – DIGITALLY SIGNED" : "APPROVED – DIGITAL SIGNATURE PENDING";
  const statusClass = record.status === "signed" ? "status-signed" : "status-approved";

  const circularHeader = `
    <table class="circular-header-table">
      <tr>
        <td class="circular-header-label">APR No. :-</td>
        <td class="circular-header-value">${escapeHtml(first?.aprNumber || aprNumber || "")}</td>
        <td class="circular-header-label">Division :-</td>
        <td class="circular-header-value">${escapeHtml(first?.division || draft.division || "")}</td>
        <td class="circular-header-label">Approving Authority :-</td>
        <td class="circular-header-value">${escapeHtml(approvingAuthority)}</td>
      </tr>
      <tr>
        <td class="circular-header-label">Date of Circular :-</td>
        <td class="circular-header-value">${escapeHtml(draft.dateOfCircular || "")}</td>
        <td class="circular-header-label">State :-</td>
        <td class="circular-header-value">${escapeHtml(first?.state || "")}</td>
        <td class="circular-header-label">Period :-</td>
        <td class="circular-header-value">${escapeHtml(first?.period || "")}</td>
      </tr>
      <tr>
        <td class="circular-header-label">Effective From :-</td>
        <td class="circular-header-value">${escapeHtml(draft.effectiveFrom || "")}</td>
        <td class="circular-header-label">Material Description :-</td>
        <td class="circular-header-value">${escapeHtml(uniqueMaterials.join(", ") || "")}</td>
        <td class="circular-header-label">Ref. Note of Approval :-</td>
        <td class="circular-header-value">${escapeHtml(refNoteOfApproval)}</td>
      </tr>
      <tr>
        <td class="circular-header-label">Financial Year :-</td>
        <td class="circular-header-value">${escapeHtml(first?.financialYear || "")}</td>
        <td class="circular-header-label">Batch No. :-</td>
        <td class="circular-header-value">${escapeHtml(uniqueBatchNos.join(", ") || "")}</td>
        <td class="circular-header-label">Category :-</td>
        <td class="circular-header-value">${escapeHtml(uniqueCategories)}</td>
      </tr>
    </table>`;

  const thead = `
    <tr>
      <th class="col-slno">Sl. No.</th>
      <th class="col-heading">Pricing Heading</th>
      <th class="col-value">Value / Amount / Text</th>
      <th class="col-remarks">Remarks</th>
    </tr>`;

  const tbody = records.length
    ? records
        .map(
          (r, i) => `
        <tr>
          <td class="col-slno">${escapeHtml(r.slNo || "")}</td>
          <td class="col-heading">${escapeHtml(r.pricingHeading || "")}</td>
          <td class="col-value">${formatMultilineText(r.value)}</td>
          <td class="col-remarks">${escapeHtml(r.remarks || "")}</td>
        </tr>`
        )
        .join("")
    : "";

  return `
    <div class="archive-drill-details" style="margin-left:${indent}px;">
      <div class="archive-apr-header">
        <span class="archive-apr-title">APR: ${escapeHtml(aprNumber)}</span>
        <span class="status-badge ${statusClass}">${statusLabel}</span>
        <button type="button" class="add-row-btn archive-download-btn" data-apr="${escapeHtml(aprNumber)}">Download PDF</button>
      </div>
      <div class="archive-detail-content">
        ${circularHeader}
        <div class="circular-intro-archive">${escapeHtml(draft.introText || "")}</div>
        <div class="circular-section-title">Pricing Details</div>
        <table class="master-data-table pricing-data-table">
          <thead><tr>${thead}</thead>
          <tbody>${tbody}</tbody>
        </table>
        <div class="circular-gst">GST will be charged extra as applicable.</div>
        <div class="circular-terms">
          <div class="circular-terms-label">Other terms and conditions</div>
          <div class="circular-terms-archive">${draft.termsHtml || ""}</div>
        </div>
        <div class="circular-signatory">
          <div class="circular-signatory-name">${escapeHtml(draft.signatoryText || "").replace(/\n/g, "<br>")}</div>
        </div>
      </div>
    </div>
  `;
}

function renderCircularArchivePanel() {
  const tree = buildCircularArchiveTree();
  const totalRecords = tree.reduce((sum, node) => sum + (node.count || 0), 0);

  const drillDownHtml = tree.length
    ? tree.map((node) => renderArchiveDrillDownNode(node, 0)).join("")
    : `<div class="empty-state" style="padding:40px 20px;font-size:1.1rem">No approved circulars found in the archive.</div>`;

  masterDataPanel.innerHTML = `
    <div class="master-data-card pricing-data-card">
      <div class="panel-heading">
        <h2>CIRCULAR ARCHIVE</h2>
        <p>View and download approved circulars. Read-only archive.</p>
      </div>
      <div class="saved-records-header">
        <div class="table-actions">
          <span class="selection-count">${totalRecords} approved circular${totalRecords !== 1 ? "s" : ""}</span>
          <button type="button" class="secondary-btn" id="expandArchiveAllBtn">Expand All</button>
          <button type="button" class="secondary-btn" id="collapseArchiveAllBtn">Collapse All</button>
        </div>
      </div>
      <div class="archive-drill-container">
        ${drillDownHtml}
      </div>
    </div>
  `;
}

function downloadArchivePdf(aprNumber) {
  const circularDrafts = getStoredValue("circularDrafts", []);
  const draft = circularDrafts.find((d) => d.aprNumber === aprNumber);
  if (!draft) return;

  const checkStatus = getStoredValue("circularCheckStatus", {});
  const status = checkStatus[aprNumber] || {};
  const isSigned = status.status === "signed";

  printCircularSelectedApr = draft.aprNumber || "";
  printCircularSelectedFinancialYear = draft.financialYearId || "";
  printCircularSelectedDivision = draft.division || "";
  printCircularSelectedState = draft.stateId || "";
  printCircularSelectedMaterial = draft.materialId || "";
  printCircularTermsHtml = draft.termsHtml || "";
  printCircularIntroText = draft.introText || "";
  printCircularSignatoryText = draft.signatoryText || printCircularSignatoryText;
  printCircularCcText = draft.ccText || "";
  printCircularDateOfCircular = draft.dateOfCircular || "";
  printCircularEffectiveFrom = draft.effectiveFrom || "";

  const selectedAprRecords = completedPricingRecords.filter((r) => r.aprNumber === aprNumber);
  const records = selectedAprRecords.map((row, index) => getReportRowDisplayValues(row, index));

  const first = records[0] || {};
  const uniqueMaterials = [...new Set(selectedAprRecords.map((r) => r.materialId).filter(Boolean))].map((mid) => masterDataEntries.find((m) => m.id === mid)?.description).filter(Boolean);
  const uniqueBatchNos = [...new Set(selectedAprRecords.map((r) => r.batchNo).filter(Boolean))];
  const uniqueCategories = [...new Set(selectedAprRecords.map((r) => r.category).filter(Boolean))].join(", ") || "";
  const approvingAuthority = [...new Set(selectedAprRecords.map((r) => r.approvingAuthority).filter(Boolean))].join(", ") || "";
  const refNoteOfApproval = [...new Set(selectedAprRecords.map((r) => r.refNoteOfApproval).filter(Boolean))].join(", ") || "";

  const circularHeader = `
    <table class="circular-header-table">
      <tr>
        <td class="circular-header-label">APR No. :-</td>
        <td class="circular-header-value">${escapeHtml(first.aprNumber || "")}</td>
        <td class="circular-header-label">Division :-</td>
        <td class="circular-header-value">${escapeHtml(first.division || "")}</td>
        <td class="circular-header-label">Approving Authority :-</td>
        <td class="circular-header-value">${escapeHtml(approvingAuthority)}</td>
      </tr>
      <tr>
        <td class="circular-header-label">Date of Circular :-</td>
        <td class="circular-header-value">${escapeHtml(draft.dateOfCircular || "")}</td>
        <td class="circular-header-label">State :-</td>
        <td class="circular-header-value">${escapeHtml(first.state || "")}</td>
        <td class="circular-header-label">Period :-</td>
        <td class="circular-header-value">${escapeHtml(first.period || "")}</td>
      </tr>
      <tr>
        <td class="circular-header-label">Effective From :-</td>
        <td class="circular-header-value">${escapeHtml(draft.effectiveFrom || "")}</td>
        <td class="circular-header-label">Material Description :-</td>
        <td class="circular-header-value">${escapeHtml(uniqueMaterials.join(", ") || "")}</td>
        <td class="circular-header-label">Ref. Note of Approval :-</td>
        <td class="circular-header-value">${escapeHtml(refNoteOfApproval)}</td>
      </tr>
      <tr>
        <td class="circular-header-label">Financial Year :-</td>
        <td class="circular-header-value">${escapeHtml(first.financialYear || "")}</td>
        <td class="circular-header-label">Batch No. :-</td>
        <td class="circular-header-value">${escapeHtml(uniqueBatchNos.join(", ") || "")}</td>
        <td class="circular-header-label">Category :-</td>
        <td class="circular-header-value">${escapeHtml(uniqueCategories)}</td>
      </tr>
    </table>`;

  const thead = `
    <tr>
      <th class="col-slno">Sl. No.</th>
      <th class="col-heading">Pricing Heading</th>
      <th class="col-value">Value / Amount / Text</th>
      <th class="col-remarks">Remarks</th>
    </tr>`;

  const tbody = records.length
    ? records
        .map(
          (r, i) => `
        <tr>
          <td class="col-slno">${escapeHtml(r.slNo || "")}</td>
          <td class="col-heading">${escapeHtml(r.pricingHeading || "")}</td>
          <td class="col-value">${formatMultilineText(r.value)}</td>
          <td class="col-remarks">${escapeHtml(r.remarks || "")}</td>
        </tr>`
        )
        .join("")
    : "";

  const signatureSection = isSigned ? `
    <div class="digital-signature-section">
      <div class="digital-signature-label">Digitally Signed</div>
      <div class="digital-signature-date">Date: ${new Date(status.signed?.timestamp || "").toLocaleString()}</div>
    </div>
  ` : "";

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>Circular - ${escapeHtml(aprNumber)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    .circular-title { text-align: center; font-size: 18pt; font-weight: bold; color: #003366; margin-bottom: 14px; text-transform: uppercase; }
    .circular-header-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .circular-header-table td { padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 10pt; }
    .circular-header-label { font-weight: 700; background: #f8fbff; width: 15%; }
    .circular-header-value { width: 18%; }
    .circular-intro { margin-bottom: 14px; font-size: 10.5pt; line-height: 1.5; }
    .circular-section-title { font-size: 11pt; font-weight: 700; color: #003366; margin: 14px 0 8px; text-transform: uppercase; }
    .circular-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    .circular-table th { background: #003366; color: white; padding: 7px 8px; border: 1px solid #cbd5e1; text-align: left; font-size: 9pt; }
    .circular-table td { padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 9.5pt; vertical-align: top; }
    .circular-table td.col-value { text-align: right; }
    .circular-gst { font-size: 10pt; margin: 10px 0; }
    .circular-terms { margin-top: 18px; }
    .circular-terms-label { font-size: 10pt; font-weight: 700; margin-bottom: 4px; }
    .circular-terms-box { border: 1px solid #cbd5e1; padding: 8px; font-size: 10pt; min-height: 40px; }
    .circular-signatory { text-align: right; margin-top: 20px; }
    .circular-signatory-name { font-weight: 700; font-size: 10pt; }
    .circular-recipient { margin-top: 14px; page-break-inside: avoid; }
    .circular-recipient-label { font-weight: 700; font-size: 10pt; margin-bottom: 4px; }
    .circular-recipient-box { white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; line-height: 1.4; }
    .digital-signature-section { text-align: right; margin-top: 16px; padding: 10px; border: 2px solid #059669; border-radius: 8px; display: inline-block; margin-left: auto; }
    .digital-signature-label { font-weight: 700; color: #059669; font-size: 10pt; }
    .digital-signature-date { font-size: 9pt; color: #64748b; }
    .circular-footer { text-align: center; font-size: 9pt; color: #64748b; margin-top: 20px; border-top: 1px solid #cbd5e1; padding-top: 10px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="circular-title">PRICING CIRCULAR</div>
  ${circularHeader}
  <div class="circular-intro">${escapeHtml(draft.introText || "")}</div>
  <div class="circular-section-title">Pricing Details</div>
  <table class="circular-table">
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>
  <div class="circular-gst">GST will be charged extra as applicable.</div>
  <div class="circular-terms">
    <div class="circular-terms-label">Other terms and conditions</div>
    <div class="circular-terms-box">${draft.termsHtml || ""}</div>
  </div>
  <div class="circular-signatory">
    <div class="circular-signatory-name">${escapeHtml(draft.signatoryText || "").replace(/\n/g, "<br>")}</div>
  </div>
  <div class="circular-recipient">To State Incharge (Mktg.) / State Finance Incharge</div>
  <div class="circular-recipient">
    <div class="circular-recipient-label">CC To</div>
    <div class="circular-recipient-box">${escapeHtml(draft.ccText || "").replace(/\n/g, "<br>")}</div>
  </div>
  ${signatureSection}
  <div class="circular-footer">© ${new Date().getFullYear()} Pricing Data Portal | All Rights Reserved</div>
</body>
</html>
  `);
  printWindow.document.close();
  printWindow.print();
}

function approveCircularFinal(aprNumber) {
  const confirmed = window.confirm("Are you sure you want to approve this circular? This action cannot be undone.");
  if (!confirmed) return;

  const checkStatus = getStoredValue("circularCheckStatus", {});
  const auditTrail = getStoredValue("circularAuditTrail", {});

  if (!checkStatus[aprNumber]) {
    checkStatus[aprNumber] = { status: "draft", checker1: null, checker2: null };
  }
  if (!auditTrail[aprNumber]) {
    auditTrail[aprNumber] = [];
  }

  checkStatus[aprNumber].status = "final_approved";
  checkStatus[aprNumber].finalApproval = { timestamp: new Date().toISOString() };
  auditTrail[aprNumber].push({ action: "final_approved", level: "APPROVER", remarks: "Circular approved", timestamp: new Date().toISOString() });

  setStoredValue("circularCheckStatus", checkStatus);
  setStoredValue("circularAuditTrail", auditTrail);

  alert("Circular approved successfully. You can now sign the circular digitally.");
  renderApproveCircularPanel();
}

function signCircularDigital(aprNumber) {
  const circularDrafts = getStoredValue("circularDrafts", []);
  const draft = circularDrafts.find((d) => d.aprNumber === aprNumber);
  if (!draft) return;

  const checkStatus = getStoredValue("circularCheckStatus", {});
  const auditTrail = getStoredValue("circularAuditTrail", {});

  if (!checkStatus[aprNumber] || checkStatus[aprNumber].status !== "final_approved") {
    alert("Please approve the circular first before signing.");
    return;
  }

  const confirmed = window.confirm("Are you sure you want to digitally sign this circular? This will finalize the circular.");
  if (!confirmed) return;

  if (!auditTrail[aprNumber]) {
    auditTrail[aprNumber] = [];
  }

  checkStatus[aprNumber].status = "signed";
  checkStatus[aprNumber].signed = { timestamp: new Date().toISOString() };
  auditTrail[aprNumber].push({ action: "signed", level: "APPROVER", remarks: "Circular digitally signed", timestamp: new Date().toISOString() });
  auditTrail[aprNumber].push({ action: "archive_updated", level: "System", remarks: "Archive updated with digitally signed version", timestamp: new Date().toISOString() });

  setStoredValue("circularCheckStatus", checkStatus);
  setStoredValue("circularAuditTrail", auditTrail);

  alert("Circular digitally signed successfully. The circular is now finalized.");
  renderApproveCircularPanel();
}

function handleDigitalSign(aprNumber) {
  signCircularDigital(aprNumber);
}

function openReturnForCorrection(aprNumber) {
  const circularDrafts = getStoredValue("circularDrafts", []);
  const draft = circularDrafts.find((d) => d.aprNumber === aprNumber);
  if (!draft) return;

  const remarks = window.prompt("Enter reason/remarks for returning this circular for correction:\n\nPlease provide detailed correction instructions.");
  if (remarks === null) return;
  if (!remarks.trim()) {
    window.alert("Remarks are required when returning a circular for correction.");
    return;
  }

  const checkStatus = getStoredValue("circularCheckStatus", {});
  const auditTrail = getStoredValue("circularAuditTrail", {});

  if (!checkStatus[aprNumber]) {
    checkStatus[aprNumber] = { status: "draft", checker1: null, checker2: null };
  }
  if (!auditTrail[aprNumber]) {
    auditTrail[aprNumber] = [];
  }

  checkStatus[aprNumber].status = "returned_for_correction";
  checkStatus[aprNumber].returnedForCorrection = {
    timestamp: new Date().toISOString(),
    remarks: remarks.trim(),
    level: "APPROVER"
  };

  auditTrail[aprNumber].push({
    action: "returned",
    level: "APPROVER",
    remarks: remarks.trim(),
    timestamp: new Date().toISOString(),
    previousStatus: "ready_for_approval",
    newStatus: "returned_for_correction"
  });

  setStoredValue("circularCheckStatus", checkStatus);
  setStoredValue("circularAuditTrail", auditTrail);

  window.alert("Circular returned for correction. The preparer will be notified to make the required corrections.");
  renderApproveCircularPanel();
}

function openEditPendingCircular(aprNumber) {
  const circularDrafts = getStoredValue("circularDrafts", []);
  const draft = circularDrafts.find((d) => d.aprNumber === aprNumber);
  if (!draft) return;

  pushNavigationHistoryState();

  selectedCircularForCheck = { ...draft, checkerLevel: "approver_edit" };
  currentCheckerLevel = "approver_edit";

  printCircularSelectedApr = draft.aprNumber || "";
  printCircularSelectedFinancialYear = draft.financialYearId || "";
  printCircularSelectedDivision = draft.division || "";
  printCircularSelectedState = draft.stateId || "";
  printCircularSelectedMaterial = draft.materialId || "";
  printCircularTermsHtml = draft.termsHtml || "";
  printCircularIntroText = draft.introText || "";
  printCircularSignatoryText = draft.signatoryText || printCircularSignatoryText;
  printCircularCcText = draft.ccText || "";
  printCircularDateOfCircular = draft.dateOfCircular || "";
  printCircularEffectiveFrom = draft.effectiveFrom || "";

  currentAppView = "print-circular";
  document.body.classList.add("print-circular-active");
  renderPrintCircularPanel();
}

function saveApproverEdit() {
  if (!selectedCircularForCheck) return;

  const aprNumber = selectedCircularForCheck.aprNumber;
  const termsEditor = masterDataPanel.querySelector(".circular-terms-editor");
  const introEditor = masterDataPanel.querySelector(".circular-intro-editor");
  const signatoryTextarea = masterDataPanel.querySelector(".circular-signatory-textarea");
  const ccTextarea = masterDataPanel.querySelector(".circular-cc-textarea");
  const dateOfCircularInput = masterDataPanel.querySelector("#circularDateOfCircular");
  const effectiveFromInput = masterDataPanel.querySelector("#circularEffectiveFrom");

  if (!dateOfCircularInput || !dateOfCircularInput.value) {
    window.alert("Please enter the Date of Circular before saving.");
    return;
  }
  if (!effectiveFromInput || !effectiveFromInput.value) {
    window.alert("Please enter the Effective From date before saving.");
    return;
  }
  if (!signatoryTextarea || !signatoryTextarea.value.trim()) {
    window.alert("Please enter the Signatory details before saving.");
    return;
  }

  const circularDrafts = getStoredValue("circularDrafts", []);
  const draftIndex = circularDrafts.findIndex((d) => d.aprNumber === aprNumber);
  if (draftIndex >= 0) {
    circularDrafts[draftIndex].termsHtml = termsEditor ? termsEditor.innerHTML : printCircularTermsHtml;
    circularDrafts[draftIndex].introText = introEditor ? (introEditor.innerText || introEditor.textContent) : printCircularIntroText;
    circularDrafts[draftIndex].signatoryText = signatoryTextarea ? signatoryTextarea.value : printCircularSignatoryText;
    circularDrafts[draftIndex].ccText = ccTextarea ? ccTextarea.value : printCircularCcText;
    circularDrafts[draftIndex].dateOfCircular = dateOfCircularInput ? dateOfCircularInput.value : printCircularDateOfCircular;
    circularDrafts[draftIndex].effectiveFrom = effectiveFromInput ? effectiveFromInput.value : printCircularEffectiveFrom;
    circularDrafts[draftIndex].lastEditedBy = "APPROVER";
    circularDrafts[draftIndex].lastEditedAt = new Date().toISOString();
  }
  setStoredValue("circularDrafts", circularDrafts);

  printCircularTermsHtml = termsEditor ? termsEditor.innerHTML : printCircularTermsHtml;
  printCircularIntroText = introEditor ? (introEditor.innerText || introEditor.textContent) : printCircularIntroText;
  printCircularSignatoryText = signatoryTextarea ? signatoryTextarea.value : printCircularSignatoryText;
  printCircularCcText = ccTextarea ? ccTextarea.value : printCircularCcText;
  printCircularDateOfCircular = dateOfCircularInput ? dateOfCircularInput.value : printCircularDateOfCircular;
  printCircularEffectiveFrom = effectiveFromInput ? effectiveFromInput.value : printCircularEffectiveFrom;

  const checkStatus = getStoredValue("circularCheckStatus", {});
  const auditTrail = getStoredValue("circularAuditTrail", {});

  if (!checkStatus[aprNumber]) {
    checkStatus[aprNumber] = { status: "draft", checker1: null, checker2: null };
  }
  if (!auditTrail[aprNumber]) {
    auditTrail[aprNumber] = [];
  }

  auditTrail[aprNumber].push({
    action: "edited_by_approver",
    level: "APPROVER",
    remarks: "Circular edited by approver before approval",
    timestamp: new Date().toISOString(),
    editedFields: {
      dateOfCircular: dateOfCircularInput ? dateOfCircularInput.value : "",
      effectiveFrom: effectiveFromInput ? effectiveFromInput.value : "",
      signatoryText: signatoryTextarea ? "[REDACTED]" : "",
      introText: introEditor ? "[REDACTED]" : "",
      termsHtml: termsEditor ? "[REDACTED]" : "",
      ccText: ccTextarea ? "[REDACTED]" : ""
    }
  });

  setStoredValue("circularCheckStatus", checkStatus);
  setStoredValue("circularAuditTrail", auditTrail);

  window.alert("Circular updated successfully. You can now approve the updated circular.");
  renderPrintCircularPanel();
}

function cancelApproverEdit() {
  selectedCircularForCheck = null;
  currentCheckerLevel = null;
  goBackToPreviousScreen();
}

function approveUpdatedCircular(aprNumber) {
  const confirmed = window.confirm("Are you sure you want to approve this updated circular? This action cannot be undone.");
  if (!confirmed) return;

  const checkStatus = getStoredValue("circularCheckStatus", {});
  const auditTrail = getStoredValue("circularAuditTrail", {});

  if (!checkStatus[aprNumber]) {
    checkStatus[aprNumber] = { status: "draft", checker1: null, checker2: null };
  }
  if (!auditTrail[aprNumber]) {
    auditTrail[aprNumber] = [];
  }

  checkStatus[aprNumber].status = "final_approved";
  checkStatus[aprNumber].finalApproval = { timestamp: new Date().toISOString() };
  auditTrail[aprNumber].push({ action: "final_approved", level: "APPROVER", remarks: "Circular approved after editor approver changes", timestamp: new Date().toISOString() });

  setStoredValue("circularCheckStatus", checkStatus);
  setStoredValue("circularAuditTrail", auditTrail);

  window.alert("Circular approved successfully. You can now sign the circular digitally.");
  selectedCircularForCheck = null;
  currentCheckerLevel = null;
  renderApproveCircularPanel();
}

function openReturnedCorrection(aprNumber) {
  const circularDrafts = getStoredValue("circularDrafts", []);
  const draft = circularDrafts.find((d) => d.aprNumber === aprNumber);
  if (!draft) return;

  pushNavigationHistoryState();

  const auditTrail = getStoredValue("circularAuditTrail", {});
  const audit = auditTrail[aprNumber] || [];
  const lastReturn = audit.filter((a) => a.action === "returned").pop();

  selectedCircularForCheck = { ...draft, checkerLevel: "preparer" };

  printCircularSelectedApr = draft.aprNumber || "";
  printCircularSelectedFinancialYear = draft.financialYearId || "";
  printCircularSelectedDivision = draft.division || "";
  printCircularSelectedState = draft.stateId || "";
  printCircularSelectedMaterial = draft.materialId || "";
  printCircularTermsHtml = draft.termsHtml || "";
  printCircularIntroText = draft.introText || "";
  printCircularSignatoryText = draft.signatoryText || printCircularSignatoryText;
  printCircularCcText = draft.ccText || "";
  printCircularDateOfCircular = draft.dateOfCircular || "";
  printCircularEffectiveFrom = draft.effectiveFrom || "";

  masterDataPanel.innerHTML = `
    <div class="master-data-card pricing-data-card">
      <div class="panel-heading">
        <h2>RETURNED FOR CORRECTION</h2>
        <p>APR No.: ${escapeHtml(aprNumber)}</p>
      </div>
      ${lastReturn ? `
      <div class="checker-action-panel" style="border-color: #dc2626; background: #fef2f2;">
        <h4 style="color: #dc2626;">Discrepancy / Remarks by ${escapeHtml(lastReturn.level)}</h4>
        <p><strong>Date:</strong> ${new Date(lastReturn.timestamp).toLocaleString()}</p>
        <p><strong>Remarks:</strong> ${escapeHtml(lastReturn.remarks || "No remarks provided")}</p>
      </div>
      ` : ""}
      <div class="checker-action-panel">
        <h4>Preparer Correction</h4>
        <p>Please review the discrepancy and make necessary corrections to the selected circular before resubmitting.</p>
        <div class="checker-action-buttons">
          <button type="button" class="secondary-btn" id="returnedCircularEditBtn">EDIT</button>
          <button type="button" class="btn-resubmit" id="resubmitBtn">RESUBMIT CIRCULAR</button>
          <button type="button" class="secondary-btn" id="backToCheckCircularBtn">BACK</button>
        </div>
      </div>
    </div>
  `;
}

function openReturnedCircularEdit(aprNumber) {
  const circularDrafts = getStoredValue("circularDrafts", []);
  const draft = circularDrafts.find((item) => item.aprNumber === aprNumber);
  if (!draft) return;

  pushNavigationHistoryState();

  selectedCircularForCheck = { ...draft, checkerLevel: "preparer", editingFromChecker: true, fromReturnedCorrection: true };
  currentCheckerLevel = "preparer";
  currentAppView = "print-circular";
  document.body.classList.add("print-circular-active");

  printCircularSelectedApr = draft.aprNumber || "";
  printCircularSelectedFinancialYear = draft.financialYearId || "";
  printCircularSelectedDivision = draft.division || "";
  printCircularSelectedState = draft.stateId || "";
  printCircularSelectedMaterial = draft.materialId || "";
  printCircularTermsHtml = draft.termsHtml || "";
  printCircularIntroText = draft.introText || "";
  printCircularSignatoryText = draft.signatoryText || printCircularSignatoryText;
  printCircularCcText = draft.ccText || "";
  printCircularDateOfCircular = draft.dateOfCircular || "";
  printCircularEffectiveFrom = draft.effectiveFrom || "";

  renderPrintCircularPanel();
}

function handleReturnedCircularEditSave() {
  if (!selectedCircularForCheck || !selectedCircularForCheck.aprNumber) return;

  const aprNumber = selectedCircularForCheck.aprNumber;
  const termsEditor = masterDataPanel.querySelector(".circular-terms-editor");
  const introEditor = masterDataPanel.querySelector(".circular-intro-editor");
  const signatoryTextarea = masterDataPanel.querySelector(".circular-signatory-textarea");
  const ccTextarea = masterDataPanel.querySelector(".circular-cc-textarea");
  const dateOfCircularInput = masterDataPanel.querySelector("#circularDateOfCircular");
  const effectiveFromInput = masterDataPanel.querySelector("#circularEffectiveFrom");

  if (!dateOfCircularInput || !dateOfCircularInput.value) {
    window.alert("Please enter the Date of Circular before saving.");
    return;
  }
  if (!effectiveFromInput || !effectiveFromInput.value) {
    window.alert("Please enter the Effective From date before saving.");
    return;
  }
  if (!signatoryTextarea || !signatoryTextarea.value.trim()) {
    window.alert("Please enter the Signatory details before saving.");
    return;
  }

  const circularDrafts = getStoredValue("circularDrafts", []);
  const draftIndex = circularDrafts.findIndex((draft) => draft.aprNumber === aprNumber);
  if (draftIndex >= 0) {
    circularDrafts[draftIndex] = {
      ...circularDrafts[draftIndex],
      aprNumber,
      financialYearId: printCircularSelectedFinancialYear || circularDrafts[draftIndex].financialYearId || "",
      division: printCircularSelectedDivision || circularDrafts[draftIndex].division || "",
      stateId: printCircularSelectedState || circularDrafts[draftIndex].stateId || "",
      materialId: printCircularSelectedMaterial || circularDrafts[draftIndex].materialId || "",
      termsHtml: termsEditor ? termsEditor.innerHTML : printCircularTermsHtml,
      introText: introEditor ? (introEditor.innerText || introEditor.textContent) : printCircularIntroText,
      signatoryText: signatoryTextarea ? signatoryTextarea.value : printCircularSignatoryText,
      ccText: ccTextarea ? ccTextarea.value : printCircularCcText,
      dateOfCircular: dateOfCircularInput ? dateOfCircularInput.value : printCircularDateOfCircular,
      effectiveFrom: effectiveFromInput ? effectiveFromInput.value : printCircularEffectiveFrom,
      lastEditedBy: "PREPARER",
      lastEditedAt: new Date().toISOString(),
    };
  }
  setStoredValue("circularDrafts", circularDrafts);

  const auditTrail = getStoredValue("circularAuditTrail", {});
  if (!auditTrail[aprNumber]) auditTrail[aprNumber] = [];
  auditTrail[aprNumber].push({
    action: "edited_by_preparer",
    level: "PREPARER",
    remarks: "Circular updated during returned-for-correction review",
    timestamp: new Date().toISOString(),
    editedFields: {
      dateOfCircular: dateOfCircularInput ? dateOfCircularInput.value : "",
      effectiveFrom: effectiveFromInput ? effectiveFromInput.value : "",
      signatoryText: signatoryTextarea ? "[REDACTED]" : "",
      introText: introEditor ? "[REDACTED]" : "",
      termsHtml: termsEditor ? "[REDACTED]" : "",
      ccText: ccTextarea ? "[REDACTED]" : "",
    }
  });
  setStoredValue("circularAuditTrail", auditTrail);

  selectedCircularForCheck = { ...circularDrafts[draftIndex >= 0 ? draftIndex : 0], checkerLevel: "preparer", editingFromChecker: true, fromReturnedCorrection: true };
  currentCheckerLevel = "preparer";
  printCircularSelectedApr = selectedCircularForCheck.aprNumber || "";
  printCircularSelectedFinancialYear = selectedCircularForCheck.financialYearId || "";
  printCircularSelectedDivision = selectedCircularForCheck.division || "";
  printCircularSelectedState = selectedCircularForCheck.stateId || "";
  printCircularSelectedMaterial = selectedCircularForCheck.materialId || "";
  printCircularTermsHtml = selectedCircularForCheck.termsHtml || "";
  printCircularIntroText = selectedCircularForCheck.introText || "";
  printCircularSignatoryText = selectedCircularForCheck.signatoryText || printCircularSignatoryText;
  printCircularCcText = selectedCircularForCheck.ccText || "";
  printCircularDateOfCircular = selectedCircularForCheck.dateOfCircular || "";
  printCircularEffectiveFrom = selectedCircularForCheck.effectiveFrom || "";

  window.alert("Circular updated successfully.");
  goBackToPreviousScreen();
}

function handleReturnedCircularEditBack() {
  if (!selectedCircularForCheck || !selectedCircularForCheck.aprNumber) return;
  goBackToPreviousScreen();
}

function handleCheckerPass() {
  if (!selectedCircularForCheck) return;

  const aprNumber = selectedCircularForCheck.aprNumber;
  const level = currentCheckerLevel;
  const remarks = document.getElementById("checkerRemarks")?.value || "";

  const checkStatus = getStoredValue("circularCheckStatus", {});
  const auditTrail = getStoredValue("circularAuditTrail", {});

  if (!checkStatus[aprNumber]) {
    checkStatus[aprNumber] = { status: "draft", checker1: null, checker2: null };
  }

  if (!auditTrail[aprNumber]) {
    auditTrail[aprNumber] = [];
  }

  if (level === "checker1") {
    checkStatus[aprNumber].status = "checker1_confirmed";
    checkStatus[aprNumber].checker1 = { passed: true, timestamp: new Date().toISOString(), remarks: remarks };
    auditTrail[aprNumber].push({ action: "confirmed", level: "CHECKER-1", remarks: remarks, timestamp: new Date().toISOString() });
  } else if (level === "checker2") {
    checkStatus[aprNumber].status = "ready_for_approval";
    checkStatus[aprNumber].checker2 = { passed: true, timestamp: new Date().toISOString(), remarks: remarks };
    auditTrail[aprNumber].push({ action: "confirmed", level: "CHECKER-2", remarks: remarks, timestamp: new Date().toISOString() });
  }

  setStoredValue("circularCheckStatus", checkStatus);
  setStoredValue("circularAuditTrail", auditTrail);

  alert(level === "checker1" ? "Circular confirmed by Checker-1. Sent to Checker-2." : "Circular confirmed by Checker-2. Sent for final approval.");
  selectedCircularForCheck = null;
  renderCheckCircularPanel();
}

function handleCheckerReturn() {
  if (!selectedCircularForCheck) return;

  const aprNumber = selectedCircularForCheck.aprNumber;
  const level = currentCheckerLevel;
  const remarks = document.getElementById("checkerRemarks")?.value || "";

  if (!remarks.trim()) {
    alert("Please enter discrepancy/remarks before returning.");
    return;
  }

  const checkStatus = getStoredValue("circularCheckStatus", {});
  const auditTrail = getStoredValue("circularAuditTrail", {});

  if (!checkStatus[aprNumber]) {
    checkStatus[aprNumber] = { status: "draft", checker1: null, checker2: null };
  }

  if (!auditTrail[aprNumber]) {
    auditTrail[aprNumber] = [];
  }

  checkStatus[aprNumber].status = "returned_for_correction";
  auditTrail[aprNumber].push({ action: "returned", level: level === "checker1" ? "CHECKER-1" : "CHECKER-2", remarks: remarks, timestamp: new Date().toISOString() });

  setStoredValue("circularCheckStatus", checkStatus);
  setStoredValue("circularAuditTrail", auditTrail);

  alert("Circular returned for correction.");
  selectedCircularForCheck = null;
  renderCheckCircularPanel();
}

function handleResubmit() {
  if (!selectedCircularForCheck) return;

  const aprNumber = selectedCircularForCheck.aprNumber;

  const circularDrafts = getStoredValue("circularDrafts", []);
  const draft = circularDrafts.find((d) => d.aprNumber === aprNumber);

  if (!draft) {
    window.alert("Circular draft not found. Please create the circular first.");
    return;
  }

  if (!draft.financialYearId) {
    window.alert("Please select a Financial Year before resubmitting.");
    return;
  }
  if (!draft.division) {
    window.alert("Please select a Division before resubmitting.");
    return;
  }
  if (!draft.stateId) {
    window.alert("Please select a State before resubmitting.");
    return;
  }
  if (!draft.materialId) {
    window.alert("Please select a Material Description before resubmitting.");
    return;
  }
  if (!draft.dateOfCircular) {
    window.alert("Please enter the Date of Circular before resubmitting.");
    return;
  }
  if (!draft.effectiveFrom) {
    window.alert("Please enter the Effective From date before resubmitting.");
    return;
  }
  if (!draft.signatoryText || !draft.signatoryText.trim()) {
    window.alert("Please enter the Signatory details before resubmitting.");
    return;
  }

  const checkStatus = getStoredValue("circularCheckStatus", {});
  const auditTrail = getStoredValue("circularAuditTrail", {});

  const previousStatus = checkStatus[aprNumber]?.status || "returned_for_correction";

  if (!checkStatus[aprNumber]) {
    checkStatus[aprNumber] = { status: "draft", checker1: null, checker2: null };
  }

  if (!auditTrail[aprNumber]) {
    auditTrail[aprNumber] = [];
  }

  checkStatus[aprNumber].status = "checker1_pending";
  checkStatus[aprNumber].resubmitted = true;
  checkStatus[aprNumber].resubmittedAt = new Date().toISOString();

  auditTrail[aprNumber].push({
    action: "resubmitted",
    level: "PREPARER",
    remarks: "Corrections made and resubmitted for checking",
    timestamp: new Date().toISOString(),
    previousStatus: previousStatus,
    newStatus: "checker1_pending",
    correctedData: {
      financialYearId: draft.financialYearId || "",
      division: draft.division || "",
      stateId: draft.stateId || "",
      materialId: draft.materialId || "",
      dateOfCircular: draft.dateOfCircular || "",
      effectiveFrom: draft.effectiveFrom || "",
      signatoryText: draft.signatoryText ? "[REDACTED]" : "",
      introText: draft.introText ? "[REDACTED]" : "",
      termsHtml: draft.termsHtml ? "[REDACTED]" : "",
      ccText: draft.ccText ? "[REDACTED]" : "",
    }
  });

  setStoredValue("circularCheckStatus", checkStatus);
  setStoredValue("circularAuditTrail", auditTrail);

  window.alert("Circular resubmitted for checking. It will go through Checker-1 and Checker-2 again.");
  selectedCircularForCheck = null;
  currentAppView = "check-circular";
  document.body.classList.remove("print-circular-active");
  renderCheckCircularPanel();
}

masterDataPanel.addEventListener("change", (event) => {
  if (event.target.classList.contains("is-invalid")) {
    event.target.classList.remove("is-invalid");
    const errorElement = event.target.parentElement.querySelector(".validation-error");
    if (errorElement) errorElement.remove();
  }

  if (event.target.id === "selectAllSavedRows") {
    const filteredRecords = getFilteredSavedRecords();
    if (event.target.checked) {
      filteredRecords.forEach((r) => selectedSavedRowIds.add(r.id));
    } else {
      filteredRecords.forEach((r) => selectedSavedRowIds.delete(r.id));
    }
    renderSavedPricingRecordsPanel();
  } else if (event.target.classList.contains("saved-row-checkbox")) {
    const rowId = event.target.dataset.rowId;
    if (event.target.checked) {
      selectedSavedRowIds.add(rowId);
    } else {
      selectedSavedRowIds.delete(rowId);
    }
    updateSelectAllState();
    renderSavedPricingRecordsPanel();
  } else if (event.target.id === "printCircularFinancialYearSelect") {
    printCircularSelectedFinancialYear = event.target.value || "";
    printCircularSelectedDivision = "";
    printCircularSelectedState = "";
    printCircularSelectedMaterial = "";
    printCircularSelectedApr = "";
    printCircularDateOfCircular = "";
    printCircularEffectiveFrom = "";
    renderPrintCircularPanel();
  } else if (event.target.id === "printCircularDivisionSelect") {
    printCircularSelectedDivision = event.target.value || "";
    printCircularSelectedState = "";
    printCircularSelectedMaterial = "";
    printCircularSelectedApr = "";
    printCircularDateOfCircular = "";
    printCircularEffectiveFrom = "";
    renderPrintCircularPanel();
  } else if (event.target.id === "printCircularStateSelect") {
    printCircularSelectedState = event.target.value || "";
    printCircularSelectedMaterial = "";
    printCircularSelectedApr = "";
    printCircularDateOfCircular = "";
    printCircularEffectiveFrom = "";
    renderPrintCircularPanel();
  } else if (event.target.id === "printCircularMaterialSelect") {
    printCircularSelectedMaterial = event.target.value || "";
    printCircularSelectedApr = "";
    printCircularDateOfCircular = "";
    printCircularEffectiveFrom = "";
    renderPrintCircularPanel();
  } else if (event.target.id === "printCircularAprSelect") {
    printCircularSelectedApr = event.target.value || "";
    printCircularDateOfCircular = "";
    printCircularEffectiveFrom = "";

    if (printCircularSelectedApr) {
      const circularDrafts = getStoredValue("circularDrafts", []);
      const savedDraft = circularDrafts.find((d) => d.aprNumber === printCircularSelectedApr);
      if (savedDraft) {
        printCircularTermsHtml = savedDraft.termsHtml || "";
        printCircularIntroText = savedDraft.introText || "";
        printCircularSignatoryText = savedDraft.signatoryText || printCircularSignatoryText;
        printCircularCcText = savedDraft.ccText || "";
        printCircularDateOfCircular = savedDraft.dateOfCircular || "";
        printCircularEffectiveFrom = savedDraft.effectiveFrom || "";
      }
    }

    renderPrintCircularPanel();
  } else if (event.target.classList.contains("circular-cc-textarea")) {
    printCircularCcText = event.target.value || "";
  } else if (event.target.classList.contains("circular-signatory-textarea")) {
    printCircularSignatoryText = event.target.value || "";
    event.target.style.height = "auto";
    event.target.style.height = event.target.scrollHeight + "px";
  } else if (event.target.closest(".circular-terms-editor")) {
    const editor = event.target.closest(".circular-terms-editor");
    printCircularTermsHtml = editor.innerHTML || "";
    editor.style.height = "auto";
    editor.style.height = editor.scrollHeight + "px";
  } else if (event.target.id === "masterDataModeSelect") {
    setPricingMasterCategoryFromSelection(event.target.value);
    renderMasterDataPanel();
  } else if (event.target.classList.contains("report-division-select")) {
    updateReportRecord(event.target.dataset.rowId, "division", event.target.value);
  } else if (event.target.classList.contains("report-state-select")) {
    updateReportRecord(event.target.dataset.rowId, "stateId", event.target.value);
  } else if (event.target.classList.contains("report-financial-year-select")) {
    updateReportRecord(event.target.dataset.rowId, "financialYearId", event.target.value);
  } else if (event.target.classList.contains("report-material-select")) {
    updateReportRecord(event.target.dataset.rowId, "materialId", event.target.value);
  } else if (event.target.classList.contains("report-heading-select")) {
    updateReportRecord(event.target.dataset.rowId, "pricingHeadingId", event.target.value);
  } else if (event.target.classList.contains("pricing-division-select")) {
    updatePricingDataRow(event.target.dataset.rowId, "division", event.target.value);
  } else if (event.target.classList.contains("pricing-state-select")) {
    updatePricingDataRow(event.target.dataset.rowId, "stateId", event.target.value);
  } else if (event.target.classList.contains("pricing-financial-year-select")) {
    updatePricingDataRow(event.target.dataset.rowId, "financialYearId", event.target.value);
  } else if (event.target.classList.contains("pricing-material-select")) {
    updatePricingDataRow(event.target.dataset.rowId, "materialId", event.target.value);
  } else if (event.target.classList.contains("pricing-heading-select")) {
    updatePricingDataRow(event.target.dataset.rowId, "pricingHeadingId", event.target.value);
  } else if (event.target.classList.contains("pricing-unit-rate-select")) {
    updatePricingDataRow(event.target.dataset.rowId, "unitRate", event.target.value);
  } else if (event.target.classList.contains("pricing-gen-mkfed-pvt-select")) {
    updatePricingDataRow(event.target.dataset.rowId, "category", event.target.value);
  } else if (event.target.classList.contains("pricing-approving-authority-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "approvingAuthority", event.target.value);
  } else if (event.target.classList.contains("pricing-date-of-approval-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "dateOfApproval", event.target.value);
  } else if (event.target.classList.contains("pricing-ref-note-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "refNoteOfApproval", event.target.value);
  } else if (event.target.classList.contains("saved-division-select")) {
    updateSavedPricingRow(event.target.dataset.rowId, "division", event.target.value);
  } else if (event.target.classList.contains("saved-state-select")) {
    updateSavedPricingRow(event.target.dataset.rowId, "stateId", event.target.value);
  } else if (event.target.classList.contains("saved-financial-year-select")) {
    updateSavedPricingRow(event.target.dataset.rowId, "financialYearId", event.target.value);
  } else if (event.target.classList.contains("saved-material-select")) {
    updateSavedPricingRow(event.target.dataset.rowId, "materialId", event.target.value);
  } else if (event.target.classList.contains("saved-heading-select")) {
    updateSavedPricingRow(event.target.dataset.rowId, "pricingHeadingId", event.target.value);
  } else if (event.target.classList.contains("saved-category-select")) {
    updateSavedPricingRow(event.target.dataset.rowId, "category", event.target.value);
  }

  if (pricingDataRows.length > 1) {
    const wasComplete = firstRowAutoCopied;
    const isNowComplete = isFirstRowComplete();
    if (!isNowComplete) {
      firstRowAutoCopied = false;
    } else if (!wasComplete && isNowComplete) {
      firstRowAutoCopied = true;
      copyFirstRowValuesToAllRows();
    }
  }
});

masterDataPanel.addEventListener("input", (event) => {
  if (event.target.classList.contains("is-invalid")) {
    event.target.classList.remove("is-invalid");
    const errorElement = event.target.parentElement.querySelector(".validation-error");
    if (errorElement) errorElement.remove();
  }

  if (event.target.classList.contains("pricing-period-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "period", event.target.value);
  } else if (event.target.classList.contains("pricing-batchno-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "batchNo", event.target.value);
  } else if (event.target.classList.contains("pricing-value-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "value", event.target.value);
  } else if (event.target.classList.contains("pricing-remarks-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "remarks", event.target.value);
  } else if (event.target.classList.contains("pricing-approving-authority-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "approvingAuthority", event.target.value);
  } else if (event.target.classList.contains("pricing-date-of-approval-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "dateOfApproval", event.target.value);
  } else if (event.target.classList.contains("pricing-ref-note-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "refNoteOfApproval", event.target.value);
  } else if (event.target.classList.contains("saved-period-input")) {
    updateSavedPricingRow(event.target.dataset.rowId, "period", event.target.value);
  } else if (event.target.classList.contains("saved-unit-rate-input")) {
    updateSavedPricingRow(event.target.dataset.rowId, "unitRate", event.target.value);
  } else if (event.target.classList.contains("saved-apr-input")) {
    updateSavedPricingRow(event.target.dataset.rowId, "aprNumber", event.target.value);
  } else if (event.target.classList.contains("saved-batchno-input")) {
    updateSavedPricingRow(event.target.dataset.rowId, "batchNo", event.target.value);
  } else if (event.target.classList.contains("saved-slno-input")) {
    updateSavedPricingRow(event.target.dataset.rowId, "aprNumber", event.target.value);
  } else if (event.target.classList.contains("saved-slno-input")) {
    updateSavedPricingRow(event.target.dataset.rowId, "slNo", event.target.value);
  } else if (event.target.classList.contains("saved-value-input")) {
    updateSavedPricingRow(event.target.dataset.rowId, "value", event.target.value);
  } else if (event.target.classList.contains("saved-remarks-input")) {
    updateSavedPricingRow(event.target.dataset.rowId, "remarks", event.target.value);
  } else if (event.target.classList.contains("saved-approving-authority-input")) {
    updateSavedPricingRow(event.target.dataset.rowId, "approvingAuthority", event.target.value);
  } else if (event.target.classList.contains("saved-date-of-approval-input")) {
    updateSavedPricingRow(event.target.dataset.rowId, "dateOfApproval", event.target.value);
  } else if (event.target.classList.contains("saved-ref-note-input")) {
    updateSavedPricingRow(event.target.dataset.rowId, "refNoteOfApproval", event.target.value);
  }

  if (pricingDataRows.length > 1) {
    const wasComplete = firstRowAutoCopied;
    const isNowComplete = isFirstRowComplete();
    if (!isNowComplete) {
      firstRowAutoCopied = false;
    } else if (!wasComplete && isNowComplete) {
      firstRowAutoCopied = true;
      copyFirstRowValuesToAllRows();
    }
  }
});

document.addEventListener("click", (event) => {
  const popup = document.getElementById("filterPopup");
  if (!popup) return;
  const target = event.target;
  if (target.id === "fpApply") {
    if (activeReportFilterCol) {
      applyReportFilterFromPopup();
    } else {
      applyFilterFromPopup();
    }
  } else if (target.id === "fpClear") {
    if (activeReportFilterCol) {
      clearReportColumnFilter(activeReportFilterCol);
    } else {
      clearColumnFilter(activeFilterCol);
    }
  } else if (target.id === "fpClose") {
    activeReportFilterCol = null;
    closeFilterPopup();
  } else if (!popup.contains(target) && !target.classList.contains("col-filter-btn") && !target.classList.contains("report-filter-btn")) {
    activeReportFilterCol = null;
    closeFilterPopup();
  }
});

function openReportPrintPreview() {
  const visibleRows = generatePrintPreviewFromCurrentReportState();
  if (!visibleRows.length) {
    window.alert("No records to preview.");
    return;
  }

  const tree = buildReportDrillDownTree(getFilteredReportRecords());
  const headerCells = REPORT_COLS.map((col) => `<th>${escapeHtml(col.label)}</th>`).join("");

  function renderNode(node, level) {
    const isExpanded = reportDrillDownExpanded.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const hasRecords = node.records && node.records.length > 0;
    const indent = level * 24;
    const recordLabel = node.count === 1 ? "Record" : "Records";

    if (!isExpanded && !hasRecords) return "";

    const childHtml = isExpanded && hasChildren
      ? node.children.map((child) => renderNode(child, level + 1)).join("")
      : "";

    const recordsHtml = isExpanded && hasRecords
      ? (() => {
          const rows = node.records.map((row, idx) => {
            const display = getReportRowDisplayValues(row, idx);
            return `<tr>
              <td>${escapeHtml(display.financialYear)}</td>
              <td>${escapeHtml(display.division)}</td>
              <td>${escapeHtml(display.state)}</td>
              <td>${escapeHtml(display.material)}</td>
              <td>${escapeHtml(display.aprNumber)}</td>
              <td>${escapeHtml(display.batchNo)}</td>
              <td>${escapeHtml(display.slNo)}</td>
              <td>${escapeHtml(display.period)}</td>
              <td>${escapeHtml(display.category || "Not classified")}</td>
              <td>${escapeHtml(display.unitRate)}</td>
              <td>${escapeHtml(display.pricingHeading)}</td>
              <td>${escapeHtml(display.value)}</td>
              <td>${escapeHtml(display.remarks)}</td>
              <td>${escapeHtml(display.approvingAuthority)}</td>
              <td>${escapeHtml(display.dateOfApproval)}</td>
              <td>${escapeHtml(display.refNoteOfApproval)}</td>
            </tr>`;
          }).join("");
          return `<table class="master-data-table pricing-data-table preview-table">
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${rows}</tbody>
          </table>`;
        })()
      : "";

    if (!childHtml && !recordsHtml) return "";

    let html = `<div class="preview-node" style="margin-left:${indent}px;">`;
    html += `<div class="preview-node-heading">${escapeHtml(node.label)} (${node.count} ${recordLabel})</div>`;
    html += childHtml;
    html += recordsHtml;
    html += `</div>`;
    return html;
  }

  const contentHtml = tree.map((node) => renderNode(node, 0)).join("");

  const modal = document.createElement("div");
  modal.className = "report-print-preview-modal";
  modal.id = "reportPrintPreviewModal";
  modal.innerHTML = `
    <div class="report-print-preview-overlay"></div>
    <div class="report-print-preview-container">
      <div class="report-print-preview-toolbar">
        <button type="button" class="secondary-btn" id="previewZoomOut">Zoom −</button>
        <button type="button" class="secondary-btn" id="previewZoomIn">Zoom +</button>
        <button type="button" class="secondary-btn" id="previewFitWidth">Fit Width</button>
        <button type="button" class="secondary-btn" id="previewFitPage">Fit Page</button>
        <button type="button" class="add-row-btn" id="previewPrintBtn">Print</button>
        <button type="button" class="secondary-btn" id="previewCloseBtn">Close</button>
      </div>
      <div class="report-print-preview-scroll" id="previewScrollArea">
        <div class="report-print-preview-content" id="previewContent" style="transform: scale(${reportDrillDownZoom / 100}); transform-origin: top center;">
          <div class="preview-page">
            <div class="preview-page-header">REPORTS</div>
            ${contentHtml}
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";

  const scrollArea = modal.querySelector("#previewScrollArea");
  const content = modal.querySelector("#previewContent");

  function updateZoom(newZoom) {
    reportDrillDownZoom = Math.min(200, Math.max(50, newZoom));
    content.style.transform = `scale(${reportDrillDownZoom / 100})`;
    content.style.transformOrigin = "top center";
  }

  modal.querySelector("#previewZoomIn").addEventListener("click", () => updateZoom(reportDrillDownZoom + 10));
  modal.querySelector("#previewZoomOut").addEventListener("click", () => updateZoom(reportDrillDownZoom - 10));
  modal.querySelector("#previewFitWidth").addEventListener("click", () => {
    const containerWidth = scrollArea.clientWidth - 40;
    const pageWidth = content.firstElementChild.offsetWidth;
    if (pageWidth > 0) {
      const scale = Math.min(1, containerWidth / pageWidth);
      updateZoom(Math.round(scale * 100));
    }
  });
  modal.querySelector("#previewFitPage").addEventListener("click", () => {
    const containerHeight = scrollArea.clientHeight - 40;
    const pageHeight = content.firstElementChild.offsetHeight;
    if (pageHeight > 0) {
      const scale = Math.min(1, containerHeight / pageHeight);
      updateZoom(Math.round(scale * 100));
    }
  });
  modal.querySelector("#previewPrintBtn").addEventListener("click", () => window.print());
  modal.querySelector("#previewCloseBtn").addEventListener("click", () => {
    modal.remove();
    document.body.style.overflow = "";
  });
  modal.querySelector(".report-print-preview-overlay").addEventListener("click", () => {
    modal.remove();
    document.body.style.overflow = "";
  });
}

function renderApproveCircularPanel() {
  const circularDrafts = getStoredValue("circularDrafts", []);
  const checkStatus = getStoredValue("circularCheckStatus", {});
  const auditTrail = getStoredValue("circularAuditTrail", {});

  const getStatus = (aprNumber) => {
    return checkStatus[aprNumber] || { status: "draft", checker1: null, checker2: null };
  };

  const pendingApproval = circularDrafts.filter((d) => {
    const status = getStatus(d.aprNumber);
    return status.status === "ready_for_approval";
  });

  const approvedCirculations = circularDrafts.filter((d) => {
    const status = getStatus(d.aprNumber);
    return status.status === "final_approved" || status.status === "signed";
  });

  const pendingDigitalSignatureCount = approvedCirculations.filter((d) => {
    const status = getStatus(d.aprNumber);
    return status.status === "final_approved";
  }).length;

  const signedCount = approvedCirculations.filter((d) => {
    const status = getStatus(d.aprNumber);
    return status.status === "signed";
  }).length;

  const getStatusBadge = (status) => {
    const statusConfig = {
      "draft": { label: "DRAFT", class: "status-draft" },
      "created": { label: "CREATED", class: "status-created" },
      "checker1_pending": { label: "CHECKER-1 PENDING", class: "status-pending" },
      "checker1_confirmed": { label: "CHECKER-1 CONFIRMED", class: "status-passed" },
      "checker2_pending": { label: "CHECKER-2 PENDING", class: "status-pending" },
      "checker2_confirmed": { label: "CHECKER-2 CONFIRMED", class: "status-passed" },
      "ready_for_approval": { label: "READY FOR APPROVAL", class: "status-approved" },
      "returned_for_correction": { label: "RETURNED", class: "status-returned" },
      "final_approved": { label: "APPROVED", class: "status-approved" },
      "signed": { label: "SIGNED", class: "status-signed" },
    };
    const config = statusConfig[status] || { label: status, class: "status-draft" };
    return `<span class="status-badge ${config.class}">${config.label}</span>`;
  };

  const pendingList = pendingApproval.length
    ? pendingApproval.map((draft, index) => {
        const fyDisplay = financialYearEntries.find((e) => e.id === draft.financialYearId)?.year || draft.financialYearId || "";
        const stateDisplay = stateNameEntries.find((e) => e.id === draft.stateId)?.name || draft.stateId || "";
        const materialDisplay = masterDataEntries.find((e) => e.id === draft.materialId)?.description || draft.materialId || "";
        const status = getStatus(draft.aprNumber);
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(fyDisplay)}</td>
            <td>${escapeHtml(draft.division || "")}</td>
            <td>${escapeHtml(stateDisplay)}</td>
            <td>${escapeHtml(materialDisplay)}</td>
            <td>${escapeHtml(draft.aprNumber || "")}</td>
            <td>${escapeHtml(draft.dateOfCircular || "")}</td>
            <td>${getStatusBadge(status.status)}</td>
            <td>
              <button type="button" class="secondary-btn view-pending-circular-btn" data-apr="${escapeHtml(draft.aprNumber || "")}">View</button>
              <button type="button" class="btn-return return-pending-circular-btn" data-apr="${escapeHtml(draft.aprNumber || "")}">Return for Correction</button>
              <button type="button" class="btn-approve approve-circular-btn" data-apr="${escapeHtml(draft.aprNumber || "")}">Approve</button>
              <button type="button" class="btn-sign sign-circular-btn" data-apr="${escapeHtml(draft.aprNumber || "")}" style="display:none;">Sign</button>
              <button type="button" class="add-row-btn print-pending-circular-btn" data-apr="${escapeHtml(draft.aprNumber || "")}" style="display:none;">Print</button>
            </td>
          </tr>`;
      }).join("")
    : `<tr><td colspan="9" class="empty-state">No circulars pending for approval.</td></tr>`;

  const approvedTree = buildApprovedArchiveTree(approvedCirculations, checkStatus);
  const approvedDrillDownHtml = approvedTree.length
    ? approvedTree.map((node) => renderApprovedDrillDownNode(node, 0)).join("")
    : `<div class="empty-state" style="padding:40px 20px;font-size:1.1rem">No approved circulars found.</div>`;

  masterDataPanel.innerHTML = `
    <div class="master-data-card pricing-data-card">
      <div class="panel-heading">
        <h2>APPROVE CIRCULAR</h2>
        <p>Approve and sign circulars after checking is complete.</p>
      </div>

      <div class="approval-tabs">
        <button type="button" class="approval-tab ${approvalActiveTab === 'pending' ? 'active' : ''}" data-tab="pending">PENDING APPROVAL (${pendingApproval.length})</button>
        <button type="button" class="approval-tab ${approvalActiveTab === 'approved' ? 'active' : ''}" data-tab="approved">APPROVED & SIGNED (${approvedCirculations.length})</button>
      </div>

      <div id="pendingPanel" class="approval-panel" style="display:${approvalActiveTab === 'pending' ? 'block' : 'none'};">
        <div class="panel-subheading">
          <h3>PENDING APPROVAL</h3>
          <p>Circulars passed by Checker-2, pending final approval</p>
        </div>
        <div class="table-wrapper saved-table-wrapper">
          <table class="master-data-table pricing-data-table">
            <thead>
              <tr>
                <th>Sl. No.</th>
                <th>Financial Year</th>
                <th>Division</th>
                <th>State</th>
                <th>Material</th>
                <th>APR No.</th>
                <th>Date of Circular</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${pendingList}
            </tbody>
          </table>
        </div>
      </div>

      <div id="approvedPanel" class="approval-panel" style="display:${approvalActiveTab === 'approved' ? 'block' : 'none'};">
        <div class="panel-subheading">
          <h3>APPROVED & SIGNED CIRCULARS</h3>
          <p>Circulars that have been approved and digitally signed</p>
        </div>
        <div class="saved-records-header">
          <div class="table-actions">
            <span class="selection-count">${pendingDigitalSignatureCount} Pending Digital Signature, ${signedCount} Signed (${approvedCirculations.length} Total)</span>
            <button type="button" class="secondary-btn" id="expandApprovedAllBtn">Expand All</button>
            <button type="button" class="secondary-btn" id="collapseApprovedAllBtn">Collapse All</button>
          </div>
        </div>
        <div class="approved-drill-container">
          ${approvedDrillDownHtml}
        </div>
      </div>
    </div>
  `;
}

function buildApprovedArchiveTree(approvedCirculations, checkStatus) {
  const tree = [];
  const fyMap = new Map();

  for (const draft of approvedCirculations) {
    const fyDisplay = financialYearEntries.find((e) => e.id === draft.financialYearId)?.year || draft.financialYearId || "Unknown";
    const stateDisplay = stateNameEntries.find((e) => e.id === draft.stateId)?.name || draft.stateId || "Unknown";
    const materialDisplay = masterDataEntries.find((e) => e.id === draft.materialId)?.description || draft.materialId || "Unknown";
    const status = checkStatus[draft.aprNumber] || {};

    let fyNode = fyMap.get(fyDisplay);
    if (!fyNode) {
      fyNode = { id: `fy:${fyDisplay}`, label: fyDisplay, count: 0, children: [], records: [], divMap: new Map(), level: "fy" };
      fyMap.set(fyDisplay, fyNode);
      tree.push(fyNode);
    }

    let divNode = fyNode.divMap.get(draft.division);
    if (!divNode) {
      divNode = { id: `fy:${fyDisplay}:div:${draft.division}`, label: draft.division || "Unknown", count: 0, children: [], records: [], stateMap: new Map(), level: "div" };
      fyNode.divMap.set(draft.division, divNode);
      fyNode.children.push(divNode);
    }

    let stateNode = divNode.stateMap.get(stateDisplay);
    if (!stateNode) {
      stateNode = { id: `fy:${fyDisplay}:div:${draft.division}:state:${stateDisplay}`, label: stateDisplay, count: 0, children: [], records: [], matMap: new Map(), level: "state" };
      divNode.stateMap.set(stateDisplay, stateNode);
      divNode.children.push(stateNode);
    }

    let matNode = stateNode.matMap.get(materialDisplay);
    if (!matNode) {
      matNode = { id: `fy:${fyDisplay}:div:${draft.division}:state:${stateDisplay}:mat:${materialDisplay}`, label: materialDisplay, count: 0, children: [], records: [], aprMap: new Map(), level: "mat" };
      stateNode.matMap.set(materialDisplay, matNode);
      stateNode.children.push(matNode);
    }

    let aprNode = matNode.aprMap.get(draft.aprNumber);
    if (!aprNode) {
      aprNode = {
        id: `fy:${fyDisplay}:div:${draft.division}:state:${stateDisplay}:mat:${materialDisplay}:apr:${draft.aprNumber}`,
        label: draft.aprNumber,
        count: 1,
        children: [],
        records: [draft],
        level: "apr",
        status: status.status || "final_approved",
        dateOfCircular: draft.dateOfCircular,
        effectiveFrom: draft.effectiveFrom,
        material: materialDisplay,
      };
      matNode.aprMap.set(draft.aprNumber, aprNode);
      matNode.children.push(aprNode);
    }
  }

  function setCounts(node) {
    if (node.level === "apr") {
      const status = node.status;
      node.count = (status === "final_approved") ? 1 : 0;
      node.totalCount = 1;
    } else {
      node.count = 0;
      node.totalCount = 0;
      for (const child of node.children) {
        setCounts(child);
        node.count += child.count || 0;
        node.totalCount += child.totalCount || 0;
      }
    }
  }

  for (const fyNode of tree) {
    setCounts(fyNode);
  }

  return tree;
}

function renderApprovedDrillDownNode(node, level = 0) {
  const hasChildren = node.children && node.children.length > 0;
  const hasRecords = node.records && node.records.length > 0;
  const hasToggle = hasChildren || hasRecords;
  const isExpanded = approvedArchiveExpanded.has(node.id);
  const indent = level * 24;
  const toggleIcon = hasToggle ? (isExpanded ? "−" : "+") : "";
  const toggleClass = hasToggle ? "approved-drill-toggle" : "approved-drill-leaf";
  const pendingCount = node.count || 0;
  const totalCount = node.totalCount || 0;
  const pendingLabel = pendingCount === 1 ? "Pending" : "Pending";

  let html = `
    <div class="approved-drill-node" style="margin-left:${indent}px;" data-node-id="${escapeHtml(node.id)}">
      <button type="button" class="${toggleClass}" data-node-id="${escapeHtml(node.id)}">${toggleIcon}</button>
      <span class="approved-drill-label">${escapeHtml(node.label)}</span>
      <span class="approved-drill-count">(${pendingCount} ${pendingLabel}, ${totalCount} Total)</span>
    </div>
  `;

  if (isExpanded && hasChildren) {
    for (const child of node.children) {
      html += renderApprovedDrillDownNode(child, level + 1);
    }
  }

  if (isExpanded && hasRecords && node.level === "apr") {
    html += renderApprovedAprDetail(node, level + 1);
  }

  return html;
}

function renderApprovedAprDetail(node, level) {
  const indent = level * 24;
  const draft = node.records[0];
  const aprNumber = draft.aprNumber;
  const isSigned = node.status === "signed";

  const statusLabel = isSigned ? "APPROVED – DIGITALLY SIGNED" : "APPROVED – DIGITAL SIGNATURE PENDING";
  const statusClass = isSigned ? "status-signed" : "status-approved";

  return `
    <div class="approved-drill-details" style="margin-left:${indent}px;">
      <table class="master-data-table pricing-data-table approved-apr-table">
        <thead>
          <tr>
            <th>APR No.</th>
            <th>Circular Date</th>
            <th>Effective From</th>
            <th>Material Description</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${escapeHtml(aprNumber || "")}</td>
            <td>${escapeHtml(draft.dateOfCircular || "")}</td>
            <td>${escapeHtml(draft.effectiveFrom || "")}</td>
            <td>${escapeHtml(node.material || "")}</td>
            <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
            <td>
              <button type="button" class="secondary-btn approved-view-btn" data-apr="${escapeHtml(aprNumber)}">View</button>
              ${isSigned 
                ? `<button type="button" class="btn-sign approved-signed-btn" data-apr="${escapeHtml(aprNumber)}" disabled>Digitally Signed</button>` 
                : `<button type="button" class="btn-sign approved-digital-sign-btn" data-apr="${escapeHtml(aprNumber)}">Digital Sign</button>`}
              <button type="button" class="add-row-btn approved-print-btn" data-apr="${escapeHtml(aprNumber)}">Print</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

const yearEl = document.getElementById("year");
yearEl.textContent = new Date().getFullYear();

window.addEventListener("resize", () => {
  requestAnimationFrame(refreshMISScrollLayout);
});

initialiseDatabaseStorage().then(() => {
  if (!masterDataPanel.classList.contains("hidden")) renderCurrentAppView();
});
