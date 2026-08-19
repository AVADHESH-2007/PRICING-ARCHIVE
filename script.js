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
let editingReportRecordId = null;
let reportsValidationMessage = "";
let selectedSavedRowIds = new Set();
let editingSavedRowId = null;
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
let printCircularCcText = "";
let printCircularSignatoryText = "Dy. General Manager (Fin.)\nAuthorized Signatory";
let printCircularTermsHtml = "";
let databaseSyncQueue = Promise.resolve();
let databaseAvailable = false;

function getApplicationState() {
  return { masterDataEntries, pricingHeadingEntries, stateNameEntries, financialYearEntries, unitRateEntries, categoryEntries, pricingDataRows, savedPricingRecords, completedPricingRecords, aprCounter, deletionAuditLog };
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
  { key: "genMkfedPvt", label: "GEN/MKFED/PVT." }, { key: "pricingHeading", label: "Pricing Heading" },
  { key: "remarks", label: "Remarks" }, { key: "completedAt", label: "Completed On" },
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
          <option value="pricing" ${currentMasterDataView === "pricing" ? "selected" : ""}>PRICING HEADING ENTRY</option>
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
          <option value="pricing">PRICING HEADING ENTRY</option>
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
          <option value="pricing">PRICING HEADING ENTRY</option>
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
          <option value="pricing">PRICING HEADING ENTRY</option>
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
          <option value="pricing">PRICING HEADING ENTRY</option>
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

  masterDataPanel.innerHTML = `
    <div class="master-data-card">
      <div class="master-data-mode-selector">
        <label for="masterDataModeSelect">Entry Type</label>
        <select id="masterDataModeSelect">
          <option value="material">MATERIAL MASTER DATA ENTRY</option>
          <option value="pricing" selected>PRICING HEADING ENTRY</option>
          <option value="state">STATE NAME ENTRY</option>
          <option value="financial-year">FINANCIAL YEAR ENTRY</option>
          <option value="unit-rate">UNIT RATE ENTRY</option>
        </select>
      </div>

      <div class="panel-heading">
        <h2>PRICING HEADING ENTRY</h2>
      </div>
      ${buildMasterDataAccessControls()}

      ${canManage ? `<div class="pricing-heading-form">
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
              <th>Description</th>
              ${canManage ? "<th>Actions</th>" : ""}
            </tr>
          </thead>
          <tbody>
            ${pricingHeadingEntries.length
              ? pricingHeadingEntries
                  .map(
                    (entry, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(entry.description)}</td>
                        ${canManage ? `<td class="entry-actions">
                          <button type="button" class="edit-btn" data-action="edit-pricing-heading" data-id="${entry.id}">Edit</button>
                          <button type="button" class="delete-btn" data-action="delete-pricing-heading" data-id="${entry.id}">Delete</button>
                        </td>` : ""}
                      </tr>
                    `
                  )
                  .join("")
              : `<tr><td colspan="${canManage ? 3 : 2}" class="empty-state">No pricing heading descriptions added yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function buildEntryRowHtml(row, index) {
  return `
    <tr>
      <td><select class="pricing-financial-year-select" data-row-id="${row.id}"><option value="">Select financial year</option>${financialYearEntries.map((e) => `<option value="${e.id}" ${e.id === row.financialYearId ? "selected" : ""}>${escapeHtml(e.year)}</option>`).join("")}</select></td>
      <td><select class="pricing-division-select" data-row-id="${row.id}"><option value="">Select division</option><option value="FERTILIZER" ${row.division === "FERTILIZER" ? "selected" : ""}>FERTILIZER</option><option value="IPD" ${row.division === "IPD" ? "selected" : ""}>IPD</option><option value="TIE-UP" ${row.division === "TIE-UP" ? "selected" : ""}>TIE-UP</option></select></td>
      <td><select class="pricing-state-select" data-row-id="${row.id}"><option value="">Select state</option>${stateNameEntries.map((e) => `<option value="${e.id}" ${e.id === row.stateId ? "selected" : ""}>${escapeHtml(e.name)}</option>`).join("")}</select></td>
      <td><select class="pricing-material-select" data-row-id="${row.id}"><option value="">Select material</option>${masterDataEntries.map((e) => `<option value="${e.id}" ${e.id === row.materialId ? "selected" : ""}>${escapeHtml(e.description)}</option>`).join("")}</select></td>
      <td><input type="text" class="pricing-batchno-input" data-row-id="${row.id}" value="${escapeHtml(row.batchNo || "")}" placeholder="Enter batch no." /></td>
      <td class="auto-slno-cell">${index + 1}</td>
      <td><textarea class="pricing-period-input complex-value-editor compact-editor" data-row-id="${row.id}" rows="1" placeholder="Enter period">${escapeHtml(row.period)}</textarea></td>
      <td><select class="pricing-gen-mkfed-pvt-select" data-row-id="${row.id}"><option value="">Select classification</option><option value="GENERAL" ${row.genMkfedPvt === "GENERAL" ? "selected" : ""}>GENERAL</option><option value="MARKFED" ${row.genMkfedPvt === "MARKFED" ? "selected" : ""}>MARKFED</option><option value="PRIVATE" ${row.genMkfedPvt === "PRIVATE" ? "selected" : ""}>PRIVATE</option></select></td>
      <td><select class="pricing-unit-rate-select" data-row-id="${row.id}"><option value="">Select unit rate</option>${unitRateEntries.map((e) => `<option value="${escapeHtml(e.name)}" ${row.unitRate === e.name ? "selected" : ""}>${escapeHtml(e.name)}</option>`).join("")}</select></td>
      <td><select class="pricing-heading-select" data-row-id="${row.id}"><option value="">Select pricing heading</option>${pricingHeadingEntries.map((e) => `<option value="${e.id}" ${e.id === row.pricingHeadingId ? "selected" : ""}>${escapeHtml(e.description)}</option>`).join("")}</select></td>
      <td><textarea class="pricing-value-input complex-value-editor compact-editor" data-row-id="${row.id}" rows="1" placeholder="Enter value, slabs, conditions, formulas, or text">${escapeHtml(row.value)}</textarea></td>
      <td><textarea class="pricing-remarks-input complex-value-editor compact-editor" data-row-id="${row.id}" rows="1" placeholder="Enter remarks">${escapeHtml(row.remarks)}</textarea></td>
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
  { key: "genMkfedPvt",   label: "GEN/MKFED/PVT.",        type: "dropdown" },
  { key: "unitRate",      label: "UNIT RATE",            type: "text" },
  { key: "pricingHeading",label: "Pricing Heading",      type: "text" },
  { key: "value",         label: "Value / Amount / Text", type: "text" },
  { key: "remarks",       label: "Remarks",              type: "text" },
];

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
    genMkfedPvt:   row.genMkfedPvt || "",
    unitRate:      row.unitRate || "",
    material:      masterDataEntries.find((e) => e.id === row.materialId)?.description || "",
    pricingHeading: pricingHeadingEntries.find((e) => e.id === row.pricingHeadingId)?.description || "",
    value:         row.value || "",
    remarks:       row.remarks || "",
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
  return `<th class="sl-no-cell"><input type="checkbox" id="selectAllSavedRows" title="Select all visible rows" ${allSelected ? "checked" : ""} data-indeterminate="${indeterminate}"></th>` + colHeaders + "<th>Actions</th>";
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
  const isEditing = row.id === editingSavedRowId;
  const isChecked = selectedSavedRowIds.has(row.id);
  const slCell = `<td class="sl-no-cell"><input type="checkbox" class="saved-row-checkbox" data-row-id="${row.id}" ${isChecked ? "checked" : ""} /></td>`;
  if (isEditing) {
    return `
      <tr>
        ${slCell}
        <td><select class="saved-financial-year-select" data-row-id="${row.id}"><option value="">Select financial year</option>${financialYearEntries.map((e) => `<option value="${e.id}" ${e.id === row.financialYearId ? "selected" : ""}>${escapeHtml(e.year)}</option>`).join("")}</select></td>
        <td><select class="saved-division-select" data-row-id="${row.id}"><option value="">Select division</option><option value="FERTILIZER" ${row.division === "FERTILIZER" ? "selected" : ""}>FERTILIZER</option><option value="IPD" ${row.division === "IPD" ? "selected" : ""}>IPD</option><option value="TIE-UP" ${row.division === "TIE-UP" ? "selected" : ""}>TIE-UP</option></select></td>
        <td><select class="saved-state-select" data-row-id="${row.id}"><option value="">Select state</option>${stateNameEntries.map((e) => `<option value="${e.id}" ${e.id === row.stateId ? "selected" : ""}>${escapeHtml(e.name)}</option>`).join("")}</select></td>
        <td><select class="saved-material-select" data-row-id="${row.id}"><option value="">Select material</option>${masterDataEntries.map((e) => `<option value="${e.id}" ${e.id === row.materialId ? "selected" : ""}>${escapeHtml(e.description)}</option>`).join("")}</select></td>
        <td><input type="text" class="saved-apr-input" data-row-id="${row.id}" value="${escapeHtml(row.aprNumber || "")}" placeholder="Enter APR No." /></td>
        <td><input type="text" class="saved-batchno-input" data-row-id="${row.id}" value="${escapeHtml(row.batchNo || "")}" placeholder="Enter batch no." /></td>
        <td><input type="text" class="saved-slno-input" data-row-id="${row.id}" value="${escapeHtml(row.slNo || "")}" placeholder="Enter SL No." /></td>
        <td><textarea class="saved-period-input complex-value-editor compact-editor" data-row-id="${row.id}" rows="1" placeholder="Enter period">${escapeHtml(row.period)}</textarea></td>
        <td><select class="saved-gen-mkfed-pvt-select" data-row-id="${row.id}"><option value="">Select classification</option><option value="GENERAL" ${row.genMkfedPvt === "GENERAL" ? "selected" : ""}>GENERAL</option><option value="MARKFED" ${row.genMkfedPvt === "MARKFED" ? "selected" : ""}>MARKFED</option><option value="PRIVATE" ${row.genMkfedPvt === "PRIVATE" ? "selected" : ""}>PRIVATE</option></select></td>
        <td><input type="text" class="saved-unit-rate-input" data-row-id="${row.id}" value="${escapeHtml(row.unitRate || "")}" placeholder="Enter unit rate" /></td>
        <td><select class="saved-heading-select" data-row-id="${row.id}"><option value="">Select pricing heading</option>${pricingHeadingEntries.map((e) => `<option value="${e.id}" ${e.id === row.pricingHeadingId ? "selected" : ""}>${escapeHtml(e.description)}</option>`).join("")}</select></td>
        <td><textarea class="saved-value-input complex-value-editor compact-editor" data-row-id="${row.id}" rows="1" placeholder="Enter value, slabs, conditions, formulas, or text">${escapeHtml(row.value)}</textarea></td>
        <td><textarea class="saved-remarks-input complex-value-editor compact-editor" data-row-id="${row.id}" rows="1" placeholder="Enter remarks">${escapeHtml(row.remarks)}</textarea></td>
        <td class="entry-actions">
          <button type="button" class="add-row-btn" data-action="save-saved-row" data-id="${row.id}">Save</button>
          <button type="button" class="secondary-btn" data-action="cancel-saved-edit">Cancel</button>
        </td>
      </tr>
    `;
  }
  return `
    <tr>
      ${slCell}
      <td>${escapeHtml(financialYearEntries.find((e) => e.id === row.financialYearId)?.year || "")}</td>
      <td>${escapeHtml(row.division || "")}</td>
      <td>${escapeHtml(stateNameEntries.find((e) => e.id === row.stateId)?.name || "")}</td>
      <td>${escapeHtml(masterDataEntries.find((e) => e.id === row.materialId)?.description || "")}</td>
      <td>${escapeHtml(row.aprNumber || "")}</td>
      <td>${escapeHtml(row.batchNo || "")}</td>
      <td>${escapeHtml(row.slNo || "")}</td>
      <td>${escapeHtml(row.period || "")}</td>
      <td>${escapeHtml(row.genMkfedPvt || "Not classified")}</td>
      <td>${escapeHtml(row.unitRate || "")}</td>
      <td>${escapeHtml(pricingHeadingEntries.find((e) => e.id === row.pricingHeadingId)?.description || "")}</td>
      <td>${formatMultilineText(row.value)}</td>
      <td>${escapeHtml(row.remarks || "")}</td>
      <td class="entry-actions"></td>
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
      <th>GEN/MKFED/PVT.</th>
      <th>UNIT RATE</th>
      <th>Pricing Heading</th>
      <th>Value / Amount / Text</th>
      <th>Remarks</th>
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
        <button type="button" class="secondary-btn" id="savePricingDataBtn">Save</button>
      </div>

      <div class="table-wrapper entry-table-wrapper">
        <table class="master-data-table pricing-data-table">
          <thead>${entryTableHeaders}</thead>
          <tbody>
            ${pricingDataRows.length
              ? pricingDataRows.map((row, index) => buildEntryRowHtml(row, index)).join("")
              : '<tr><td colspan="12" class="empty-state">No pricing rows yet. Click Add Row to begin.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSavedPricingRecordsPanel() {
  const selCount = selectedSavedRowIds.size;
  const hasSelection = selCount > 0;
  const isSingleSelection = selCount === 1;
  const isEditingAny = !!editingSavedRowId;
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
          <button type="button" class="edit-btn" id="editSavedRowBtn" ${isSingleSelection && !isEditingAny ? "" : "disabled"}>Edit</button>
          <button type="button" class="delete-btn" id="deleteSavedRowBtn" ${isSingleSelection && !isEditingAny ? "" : "disabled"}>Delete</button>
          <button type="button" class="complete-btn" id="completeSavedRowBtn" ${hasSelection && !isEditingAny ? "" : "disabled"}>Complete</button>
        </div>
      </div>
      <div class="table-wrapper saved-table-wrapper">
        <table class="master-data-table pricing-data-table">
          <thead><tr>${buildSavedTableHeaderRow(filteredRecords)}</tr></thead>
          <tbody>
            ${filteredRecords.length
              ? filteredRecords.map((row, index) => buildSavedRowHtml(row, index)).join("")
              : `<tr><td colspan="15" class="empty-state">${savedPricingRecords.length ? "No records match the current filters." : "No saved records yet. Create a record in Pricing Data to see it here."}</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const selectAllCb = document.getElementById("selectAllSavedRows");
  if (selectAllCb && selectAllCb.dataset.indeterminate === "true") {
    selectAllCb.indeterminate = true;
  }
}

function createPricingDataRow() {
  return {
    id: `pricing-row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    division: "",
    stateId: "",
    financialYearId: "",
    period: "",
    genMkfedPvt: "",
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
    row.genMkfedPvt,
    row.unitRate,
    row.materialId,
    row.pricingHeadingId,
    row.aprNumber,
    row.batchNo,
    row.value,
    row.remarks,
  ].every((value) => value === "" || value === undefined || value === null);
}

function normalizePricingDataRows(rows) {
  const safeRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
  return safeRows.length ? safeRows : [createPricingDataRow()];
}

function loadPersistedState() {
  masterDataEntries = getStoredValue("masterDataEntries", masterDataEntries);
  pricingHeadingEntries = getStoredValue("pricingHeadingEntries", pricingHeadingEntries);
  stateNameEntries = getStoredValue("stateNameEntries", stateNameEntries);
  financialYearEntries = getStoredValue("financialYearEntries", financialYearEntries);
  pricingDataRows = normalizePricingDataRows(getStoredValue("pricingDataRows", []));
  savedPricingRecords = getStoredValue("savedPricingRecords", []);
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

function validateSavedRow(row) {
  const validClassifications = ["GENERAL", "MARKFED", "PRIVATE"];
  if (!row || !row.division || !row.stateId || !row.financialYearId || !String(row.period || "").trim() || !validClassifications.includes(row.genMkfedPvt) || !row.materialId || !row.pricingHeadingId || !String(row.value || "").trim()) {
    return { valid: false, message: "Please complete all fields before saving." };
  }
  return { valid: true, message: "" };
}

function updatePricingDataRow(rowId, field, value) {
  const row = pricingDataRows.find((item) => item.id === rowId);
  if (!row) return;
  row[field] = value;
  pricingDataValidationMessage = "";
  persistPricingDataState();
}

function updateSavedPricingRow(rowId, field, value) {
  const row = savedPricingRecords.find((item) => item.id === rowId);
  if (!row) return;
  row[field] = value;
  persistPricingDataState();
}

function handleAddPricingDataRow() {
  pricingDataRows = [...pricingDataRows, createPricingDataRow()];
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
  pricingDataValidationMessage = "";
  persistPricingDataState();
  renderPricingDataTable();
}

function handleSavePricingDataRows() {
  const validation = validatePricingDataRows();
  if (!validation.valid) {
    pricingDataValidationMessage = validation.message;
    renderPricingDataTable();
    return;
  }

  const rowsToSave = pricingDataRows.filter(isPricingDataRowComplete);
  if (!rowsToSave.length) {
    pricingDataValidationMessage = "Please complete at least one row before saving.";
    renderPricingDataTable();
    return;
  }

  aprCounter += 1;
  const batchAprNumber = `APR-${aprCounter}`;
  savedPricingRecords = [
    ...savedPricingRecords,
    ...rowsToSave.map((row, index) => ({ ...row, aprNumber: batchAprNumber, slNo: String(index + 1) })),
  ];

  const remainingRows = pricingDataRows.filter((row) => !isPricingDataRowComplete(row));
  pricingDataRows = [...remainingRows, createPricingDataRow()];
  pricingDataValidationMessage = `${rowsToSave.length} row${rowsToSave.length > 1 ? "s" : ""} saved successfully.`;
  persistPricingDataState();
  renderPricingDataTable();
}

function handleCompleteSavedRows() {
  const idsToComplete = [...selectedSavedRowIds];
  if (idsToComplete.length === 0) {
    pricingDataValidationMessage = "Please select at least one record to complete.";
    renderSavedPricingRecordsPanel();
    return;
  }

  try {
    const selectedRecords = idsToComplete.map((id) => savedPricingRecords.find((record) => record.id === id));
    const missingIds = idsToComplete.filter((id, index) => !selectedRecords[index]);
    if (missingIds.length) {
      console.error("Completion failed because selected record IDs are no longer present.", { missingIds, idsToComplete, savedPricingRecords });
      selectedSavedRowIds.clear();
      pricingDataValidationMessage = "Unable to complete the selected records because the selection is no longer current. Please select the records again.";
      renderSavedPricingRecordsPanel();
      return;
    }

    const invalidRows = selectedRecords.filter((row) => !validateSavedRow(row).valid);
    if (invalidRows.length) {
      console.warn("Completion blocked: selected records failed validation.", invalidRows);
      pricingDataValidationMessage = "One or more selected records are incomplete or do not have a valid GEN/MKFED/PVT. classification. Please fix them before completing.";
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
    const selectedIdSet = new Set(idsToComplete);
    const nextCompletedRecords = [...completedPricingRecords, ...newCompleted];
    const nextSavedRecords = savedPricingRecords.filter((record) => !selectedIdSet.has(record.id));
    const previousCompletedRecords = completedPricingRecords;
    const previousSavedRecords = savedPricingRecords;

    completedPricingRecords = nextCompletedRecords;
    savedPricingRecords = nextSavedRecords;
    if (!persistPricingDataState()) {
      completedPricingRecords = previousCompletedRecords;
      savedPricingRecords = previousSavedRecords;
      const rollbackPersisted = persistPricingDataState();
      console.error("Completion rolled back because the updated records could not be persisted.", { rollbackPersisted });
      pricingDataValidationMessage = "Unable to complete the selected records. Please check available browser storage and try again.";
      renderSavedPricingRecordsPanel();
      return;
    }

    selectedSavedRowIds.clear();
    editingSavedRowId = null;
    pricingDataValidationMessage = `${newCompleted.length} record${newCompleted.length > 1 ? "s" : ""} marked as completed.`;
    renderSavedPricingRecordsPanel();
  } catch (error) {
    console.error("Unexpected error while completing saved pricing records.", error);
    pricingDataValidationMessage = "Unable to complete the selected records. Please check the selected records and try again.";
    renderSavedPricingRecordsPanel();
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
  const colCount = isAdminAuthenticated ? 17 : 16;

  const headerCells = REPORT_COLS.map((col) => {
    const isActive = reportRecordFilters[col.key]?.active;
    return `<th class="${isActive ? "col-filter-active" : ""}">
      <span class="th-label">${col.label}</span>
      <button type="button" class="report-filter-btn" data-report-filter-col="${col.key}" title="Filter ${col.label}">&#9660;</button>
    </th>`;
  }).join("");

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
      </div>
      <div class="table-wrapper saved-table-wrapper">
        <table class="master-data-table pricing-data-table">
          <thead>
            <tr>
              ${headerCells}
              ${isAdminAuthenticated ? "<th>Actions</th>" : ""}
            </tr>
          </thead>
          <tbody>
            ${filteredReports.length
              ? filteredReports.map((row, index) => {
                  const display = getReportRowDisplayValues(row, index);
                  return `
                    <tr>
                      <td>${escapeHtml(display.financialYear)}</td>
                      <td>${escapeHtml(display.division)}</td>
                      <td>${escapeHtml(display.state)}</td>
                      <td>${escapeHtml(display.material)}</td>
                      <td>${escapeHtml(display.aprNumber)}</td>
                      <td>${escapeHtml(display.batchNo)}</td>
                      <td>${escapeHtml(display.slNo)}</td>
                      <td>${escapeHtml(display.period)}</td>
                      <td>${escapeHtml(display.genMkfedPvt || "Not classified")}</td>
                      <td>${escapeHtml(display.unitRate)}</td>
                      <td>${escapeHtml(display.pricingHeading)}</td>
                      <td>${formatMultilineText(display.value)}</td>
                      <td>${escapeHtml(display.remarks)}</td>
                      <td>${escapeHtml(display.completedAt)}</td>
                      <td>${escapeHtml(display.status)}</td>
                      <td>${escapeHtml(display.completedId)}</td>
                      ${isAdminAuthenticated ? `<td class="entry-actions"><button type="button" class="delete-btn" data-action="admin-delete-report" data-id="${row.id}">Delete</button></td>` : ""}
                    </tr>
                  `;
                }).join("")
              : `<tr><td colspan="${colCount}" class="empty-state">${completedPricingRecords.length ? "No records match the current filters." : "No completed records available yet."}</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
function renderMisPanel() {
  const source = completedPricingRecords.map((row, index) => ({ row, values: getReportRowDisplayValues(row, index) }));
  const optionsFor = (key) => key === "genMkfedPvt"
    ? ["GENERAL", "MARKFED", "PRIVATE"]
    : [...new Set(source.map((item) => item.values[key]).filter((value) => value !== "" && value != null))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  const activeFilters = MIS_FILTERS.reduce((filters, filter) => ({ ...filters, [filter.key]: misFilters[filter.key] || [] }), {});

  const MIS_TABLE_COLS = [
    { key: "aprNumber",      label: "APR No." },
    { key: "slNo",           label: "Sl. No." },
    { key: "division",       label: "Division" },
    { key: "state",          label: "State" },
    { key: "financialYear",  label: "Financial Year" },
    { key: "period",         label: "Period" },
    { key: "genMkfedPvt",    label: "GEN/MKFED/PVT." },
    { key: "material",       label: "Material Description" },
    { key: "pricingHeading", label: "Pricing Heading" },
    { key: "unitRate",       label: "Unit Rate" },
    { key: "batchNo",        label: "Batch No." },
    { key: "value",          label: "Value / Amount / Text" },
    { key: "remarks",        label: "Remarks" },
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
}

function formatDateOnly(dateString) {
  if (!dateString) return "";
  const parts = dateString.split(",");
  return parts[0].trim();
}

function renderPrintCircularPanel() {
  const aprNumbers = [...new Set(completedPricingRecords.map((r) => r.aprNumber).filter(Boolean))];
  aprNumbers.sort((a, b) => {
    const numA = parseInt(String(a).replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(String(b).replace(/\D/g, ""), 10) || 0;
    return numA - numB || String(a).localeCompare(String(b));
  });

  const selectedAprRecords = printCircularSelectedApr
    ? completedPricingRecords.filter((r) => r.aprNumber === printCircularSelectedApr)
    : [];
  const records = selectedAprRecords.map((row, index) => getReportRowDisplayValues(row, index));

  const aprSelectHtml = `
    <div class="pricing-heading-form">
      <select id="printCircularAprSelect">
        <option value="">Select APR No.</option>
        ${aprNumbers.map((apr) => `<option value="${escapeHtml(apr)}" ${printCircularSelectedApr === apr ? "selected" : ""}>${escapeHtml(apr)}</option>`).join("")}
      </select>
    </div>`;

  const noAprMessage = !printCircularSelectedApr
    ? `<div class="empty-state" style="padding:40px 20px;font-size:1.1rem">Please select an APR No. to generate the Pricing Circular.</div>`
    : "";

  let circularHeader = "";
  if (selectedAprRecords.length > 0) {
    const first = records[0];
    const uniqueMaterials = [...new Set(selectedAprRecords.map((r) => r.materialId).filter(Boolean))].map((mid) => masterDataEntries.find((m) => m.id === mid)?.description).filter(Boolean);
    const uniqueBatchNos = [...new Set(selectedAprRecords.map((r) => r.batchNo).filter(Boolean))];
    const circularDate = formatDateOnly(selectedAprRecords[0].completedAt || "");
    circularHeader = `
      <table class="circular-header-table">
        <tr>
          <td class="circular-header-label">APR No. :-</td>
          <td class="circular-header-value">${escapeHtml(first.aprNumber || "")}</td>
          <td class="circular-header-label">Division :-</td>
          <td class="circular-header-value">${escapeHtml(first.division || "")}</td>
          <td class="circular-header-label">Material Description :-</td>
          <td class="circular-header-value">${escapeHtml(uniqueMaterials.join(", ") || "")}</td>
        </tr>
        <tr>
          <td class="circular-header-label">Circular Date :-</td>
          <td class="circular-header-value">${escapeHtml(circularDate)}</td>
          <td class="circular-header-label">State :-</td>
          <td class="circular-header-value">${escapeHtml(first.state || "")}</td>
          <td class="circular-header-label">Batch No. :-</td>
          <td class="circular-header-value">${escapeHtml(uniqueBatchNos.join(", ") || "")}</td>
        </tr>
        <tr>
          <td class="circular-header-label">Effective From :-</td>
          <td class="circular-header-value">${escapeHtml(circularDate)}</td>
          <td class="circular-header-label">Financial Year :-</td>
          <td class="circular-header-value">${escapeHtml(first.financialYear || "")}</td>
          <td class="circular-header-label">Period :-</td>
          <td class="circular-header-value">${escapeHtml(first.period || "")}</td>
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

  masterDataPanel.innerHTML = `
    <div class="master-data-card pricing-data-card print-circular-card">
      <div class="panel-heading">
        <h2>PRINT CIRCULAR</h2>
        <p>Select an APR No. to generate the pricing circular.</p>
      </div>
      ${aprSelectHtml}
      ${noAprMessage}
      ${circularHeader}
      ${selectedAprRecords.length ? `
      <div class="circular-intro">The following pricing and sales terms have been approved for details mentioned above.</div>
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
       <div style="text-align: left; margin-top: 10px;">To State Incharge (Mkting) / State Finance Incharge</div>
       <div class="circular-cc">
         <div class="circular-cc-label">CC To</div>
         <textarea class="circular-cc-textarea" placeholder="Enter Name / Designation / Department / Address">${escapeHtml(printCircularCcText || "")}</textarea>
       </div>
       <div class="table-actions pricing-data-actions" style="margin-top:12px">
         <button type="button" class="add-row-btn" id="printCircularPrintBtn">Print Circular</button>
        </div>
       ` : ""}
    </div>
  `;
  const ccTextarea = masterDataPanel.querySelector(".circular-cc-textarea");
  if (ccTextarea) {
    ccTextarea.style.height = "auto";
    ccTextarea.style.height = ccTextarea.scrollHeight + "px";
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
            cell.style.border = "1px solid #cbd5e1";
            cell.style.padding = "6px 8px";
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
          document.execCommand("insertHTML", false, div.innerHTML);
        } else {
          document.execCommand("insertText", false, text);
        }
        } else {
          document.execCommand("insertHTML", false, text.replace(/\n/g, "<br>"));
        }
    });
  }
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
  const columns = ["aprNumber", "slNo", "batchNo", "division", "state", "financialYear", "period", "genMkfedPvt", "material", "pricingHeading", "value", "remarks", "completedAt", "completedId"];
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
  if (currentMasterDataView === "pricing") {
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
  if (!description) {
    return;
  }

  if (editingPricingHeadingId) {
    const recordId = editingPricingHeadingId;
    pricingHeadingEntries = pricingHeadingEntries.map((entry) =>
      entry.id === editingPricingHeadingId ? { ...entry, description } : entry
    );
    editingPricingHeadingId = null;
    logMasterDataAudit("Edit", "Pricing Heading Master", recordId);
  } else {
    const recordId = Date.now().toString();
    pricingHeadingEntries.push({
      id: recordId,
      description,
    });
    logMasterDataAudit("Create", "Pricing Heading Master", recordId);
  }

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
  currentMasterDataView = "material";
  currentAppView = "master";
  document.body.classList.remove("pricing-view-active");
  masterDataPanel.classList.remove("hidden");
  renderMasterDataPanel();
});

pricingDataButton.addEventListener("click", () => {
  currentAppView = "pricing";
  document.body.classList.add("pricing-view-active");
  masterDataPanel.classList.remove("hidden");
  pricingDataRows = normalizePricingDataRows(pricingDataRows);
  persistPricingDataState();
  renderPricingDataTable();
});

savedPricingRecordsButton.addEventListener("click", () => {
  currentAppView = "saved-pricing-records";
  document.body.classList.add("pricing-view-active");
  masterDataPanel.classList.remove("hidden");
  renderSavedPricingRecordsPanel();
});

reportsButton.addEventListener("click", () => {
  currentAppView = "reports";
  document.body.classList.add("pricing-view-active");
  masterDataPanel.classList.remove("hidden");
  renderReportsPanel();
});

misButton.addEventListener("click", () => {
  currentAppView = "mis";
  document.body.classList.add("pricing-view-active");
  masterDataPanel.classList.remove("hidden");
  renderMisPanel();
});

printCircularButton.addEventListener("click", () => {
  currentAppView = "print-circular";
  document.body.classList.add("pricing-view-active");
  masterDataPanel.classList.remove("hidden");
  printCircularSelectedApr = "";
  printCircularCcText = "";
  printCircularSignatoryText = "Dy. General Manager (Fin.)\nAuthorized Signatory";
  printCircularTermsHtml = "";
  renderPrintCircularPanel();
});

function renderCurrentAppView() {
  if (currentAppView === "pricing") renderPricingDataTable();
  else if (currentAppView === "saved-pricing-records") renderSavedPricingRecordsPanel();
  else if (currentAppView === "reports") renderReportsPanel();
  else if (currentAppView === "mis") renderMisPanel();
  else if (currentAppView === "print-circular") renderPrintCircularPanel();
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
    const columns = ["financialYear", "division", "state", "material", "aprNumber", "batchNo", "period", "genMkfedPvt", "pricingHeading", "value"];
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
  }
});

masterDataPanel.addEventListener("click", (event) => {
  const target = event.target;

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
  } else if (target.id === "editSavedRowBtn") {
    if (selectedSavedRowIds.size !== 1 || editingSavedRowId) return;
    editingSavedRowId = [...selectedSavedRowIds][0];
    pricingDataValidationMessage = "";
    renderSavedPricingRecordsPanel();
  } else if (target.id === "deleteSavedRowBtn") {
    if (selectedSavedRowIds.size !== 1 || editingSavedRowId) return;
    const confirmed = window.confirm("Are you sure you want to delete this record?");
    if (!confirmed) return;
    const idToDelete = [...selectedSavedRowIds][0];
    savedPricingRecords = savedPricingRecords.filter((row) => row.id !== idToDelete);
    selectedSavedRowIds.clear();
    persistPricingDataState();
    renderSavedPricingRecordsPanel();
  } else if (target.id === "completeSavedRowBtn") {
    if (editingSavedRowId) return;
    handleCompleteSavedRows();
  } else if (target.matches("[data-action='save-saved-row']")) {
    const rowId = target.dataset.id;
    const row = savedPricingRecords.find((r) => r.id === rowId);
    if (!row) return;
    const validation = validateSavedRow(row);
    if (!validation.valid) {
      pricingDataValidationMessage = validation.message;
      renderSavedPricingRecordsPanel();
      return;
    }
    editingSavedRowId = null;
    selectedSavedRowIds.clear();
    pricingDataValidationMessage = "Record updated successfully.";
    persistPricingDataState();
    renderSavedPricingRecordsPanel();
  } else if (target.matches("[data-action='cancel-saved-edit']")) {
    editingSavedRowId = null;
    selectedSavedRowIds.clear();
    pricingDataValidationMessage = "";
    renderSavedPricingRecordsPanel();
  } else if (target.id === "addPricingDataRowBtn") {
    handleAddPricingDataRow();
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
    renderReportsPanel();
  } else if (target.classList.contains("report-filter-btn")) {
    openReportFilterPopup(target.dataset.reportFilterCol, target);
  } else if (target.id === "adminLoginBtn") {
    handleAdminLogin();
  } else if (target.id === "adminLogoutBtn") {
    isAdminAuthenticated = false;
    renderReportsPanel();
  } else if (target.matches("[data-action='admin-delete-report']")) {
    handleAdminDeleteReport(target.dataset.id);
  } else if (target.id === "printCircularPrintBtn") {
    if (!printCircularSelectedApr) {
      window.alert("Please select an APR No. before printing.");
      return;
    }
    const selected = printCircularSelectedApr
      ? completedPricingRecords.filter((r) => r.aprNumber === printCircularSelectedApr)
      : [];
    if (!selected.length) return;

    const records = selected.map((row, index) => getReportRowDisplayValues(row, index));
    const first = records[0];
    const uniqueMaterials = [...new Set(selected.map((r) => r.materialId).filter(Boolean))].map((mid) => masterDataEntries.find((m) => m.id === mid)?.description).filter(Boolean);
    const uniqueBatchNos = [...new Set(selected.map((r) => r.batchNo).filter(Boolean))];
    const circularDate = formatDateOnly(selected[0].completedAt || "");

    const headerInfo = {
      aprNumber: first.aprNumber || "",
      circularDate: circularDate,
      effectiveFrom: circularDate,
      division: first.division || "",
      state: first.state || "",
      financialYear: first.financialYear || "",
      period: first.period || "",
      materials: uniqueMaterials.join(", ") || "",
      batchNos: uniqueBatchNos.join(", ") || ""
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
      max-width: 180mm;
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
      padding: 5px 7px;
      border: 1px solid #dbe5f0;
      vertical-align: top;
      word-wrap: break-word;
      overflow-wrap: anywhere;
      word-break: break-word;
      white-space: normal;
      line-height: 1.35;
    }
    .circular-header-label {
      width: 15%;
      font-weight: 700;
      color: #003366;
      white-space: normal;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .circular-header-value {
      width: 35%;
      color: #233142;
      font-weight: 600;
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: normal;
      font-size: 9pt;
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
      table-layout: fixed;
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
      text-align: left;
      font-size: 9.5pt;
      vertical-align: top;
      word-wrap: break-word;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
    .circular-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    .col-slno { width: 6%; }
    .col-heading { width: 40%; }
    .col-value { width: 31%; }
    .col-remarks { width: 23%; }
    .circular-table .col-heading {
      white-space: normal;
      overflow-wrap: normal;
      word-wrap: normal;
    }
    .circular-table td.col-value {
      text-align: right !important;
    }
    .circular-intro {
      font-size: 10pt;
      font-weight: 600;
      color: #233142;
      margin: 12px 0 8px;
      text-align: left;
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
      page-break-inside: avoid;
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
      .circular-signatories { page-break-inside: avoid; }
      .circular-cc { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="circular-wrap">
     <div class="circular-title">Pricing Circular</div>
     <div class="circular-details">
       <table class="circular-header-table">
         <tr>
           <td class="circular-header-label">APR No. :-</td>
           <td class="circular-header-value">${escapeHtml(headerInfo.aprNumber || "")}</td>
           <td class="circular-header-label">Division :-</td>
           <td class="circular-header-value">${escapeHtml(headerInfo.division || "")}</td>
           <td class="circular-header-label">Material Description :-</td>
           <td class="circular-header-value">${escapeHtml(headerInfo.materials || "")}</td>
         </tr>
         <tr>
           <td class="circular-header-label">Circular Date :-</td>
           <td class="circular-header-value">${escapeHtml(headerInfo.circularDate || "")}</td>
           <td class="circular-header-label">State :-</td>
           <td class="circular-header-value">${escapeHtml(headerInfo.state || "")}</td>
           <td class="circular-header-label">Batch No. :-</td>
           <td class="circular-header-value">${escapeHtml(headerInfo.batchNos || "")}</td>
         </tr>
         <tr>
           <td class="circular-header-label">Effective From :-</td>
           <td class="circular-header-value">${escapeHtml(headerInfo.effectiveFrom || "")}</td>
           <td class="circular-header-label">Financial Year :-</td>
           <td class="circular-header-value">${escapeHtml(headerInfo.financialYear || "")}</td>
           <td class="circular-header-label">Period :-</td>
           <td class="circular-header-value">${escapeHtml(headerInfo.period || "")}</td>
         </tr>
       </table>
     </div>
     <div class="circular-section-title">Pricing Details</div>
     <div class="circular-intro">The following pricing and sales terms have been approved for details mentioned above.</div>
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
         <div class="circular-gst">GST will be charged extra as applicable.</div>
         <div class="circular-terms">
           <div class="circular-terms-label">Other terms and conditions</div>
            <div class="circular-terms-box">${printCircularTermsHtml || ""}</div>
         </div>
         <div style="text-align: right; margin-top: 24px; page-break-inside: avoid;">
           <div class="circular-signatory-box">${escapeHtml(printCircularSignatoryText || "").replace(/\n/g, "<br>")}</div>
         </div>
       <div style="text-align: left; margin-top: 10px;">To State Incharge (Mkting) / State Finance Incharge</div>
       <div class="circular-cc">
         <div class="circular-cc-label">CC To</div>
         <div class="circular-cc-box">${escapeHtml(printCircularCcText || "").replace(/\n/g, "<br>")}</div>
       </div>
   </div>
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 100);
    };
  <\/script>
</body>
</html>`);
    printWindow.document.close();
  }
});

masterDataPanel.addEventListener("change", (event) => {
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
    renderSavedPricingRecordsPanel();
  } else if (event.target.id === "printCircularAprSelect") {
    printCircularSelectedApr = event.target.value || "";
    renderPrintCircularPanel();
  } else if (event.target.classList.contains("circular-cc-textarea")) {
    printCircularCcText = event.target.value || "";
    event.target.style.height = "auto";
    event.target.style.height = event.target.scrollHeight + "px";
  } else if (event.target.classList.contains("circular-signatory-textarea")) {
    printCircularSignatoryText = event.target.value || "";
    event.target.style.height = "auto";
    event.target.style.height = event.target.scrollHeight + "px";
  } else if (event.target.classList.contains("circular-terms-editor")) {
    printCircularTermsHtml = event.target.innerHTML || "";
    event.target.style.height = "auto";
    event.target.style.height = event.target.scrollHeight + "px";
  } else if (event.target.id === "masterDataModeSelect") {
    currentMasterDataView = event.target.value;
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
    updatePricingDataRow(event.target.dataset.rowId, "genMkfedPvt", event.target.value);
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
  } else if (event.target.classList.contains("saved-gen-mkfed-pvt-select")) {
    updateSavedPricingRow(event.target.dataset.rowId, "genMkfedPvt", event.target.value);
  }
});

masterDataPanel.addEventListener("input", (event) => {
  if (event.target.classList.contains("report-period-input")) {
    updateReportRecord(event.target.dataset.rowId, "period", event.target.value);
  } else if (event.target.classList.contains("report-value-input")) {
    updateReportRecord(event.target.dataset.rowId, "value", event.target.value);
  } else if (event.target.classList.contains("report-remarks-input")) {
    updateReportRecord(event.target.dataset.rowId, "remarks", event.target.value);
  } else if (event.target.classList.contains("pricing-period-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "period", event.target.value);
  } else if (event.target.classList.contains("pricing-batchno-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "batchNo", event.target.value);
  } else if (event.target.classList.contains("pricing-value-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "value", event.target.value);
  } else if (event.target.classList.contains("pricing-remarks-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "remarks", event.target.value);
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

const yearEl = document.getElementById("year");
yearEl.textContent = new Date().getFullYear();
initialiseDatabaseStorage().then(() => {
  if (!masterDataPanel.classList.contains("hidden")) renderCurrentAppView();
});
