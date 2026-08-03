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
const masterDataPanel = document.getElementById("masterDataPanel");

function getStoredValue(key, fallback) {
  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch (error) {
    return fallback;
  }
}

function setStoredValue(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Ignore storage errors.
  }
}

let masterDataEntries = [];
let pricingHeadingEntries = [];
let stateNameEntries = [];
let financialYearEntries = [];
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
let currentMasterDataView = "material";
let currentAppView = "master";
let editingReportRecordId = null;
let reportsValidationMessage = "";
let selectedSavedRowIds = new Set();
let editingSavedRowId = null;
let savedRecordFilters = {};
let reportRecordFilters = {};
let activeReportFilterCol = null;

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
      <td><input type="text" class="pricing-apr-input" data-row-id="${row.id}" value="${escapeHtml(row.aprNumber || "")}" placeholder="Enter APR No." /></td>
      <td><input type="text" class="pricing-batchno-input" data-row-id="${row.id}" value="${escapeHtml(row.batchNo || "")}" placeholder="Enter batch no." /></td>
      <td><input type="text" class="pricing-slno-input" data-row-id="${row.id}" value="${escapeHtml(row.slNo || "")}" placeholder="Enter SL No." /></td>
      <td><textarea class="pricing-period-input complex-value-editor" data-row-id="${row.id}" rows="2" placeholder="Enter period">${escapeHtml(row.period)}</textarea></td>
      <td><input type="text" class="pricing-quantity-input" data-row-id="${row.id}" value="${escapeHtml(row.quantity)}" placeholder="Enter quantity" /></td>
      <td><input type="text" class="pricing-unit-rate-input" data-row-id="${row.id}" value="${escapeHtml(row.unitRate || "")}" placeholder="Enter unit rate" /></td>
      <td><select class="pricing-heading-select" data-row-id="${row.id}"><option value="">Select pricing heading</option>${pricingHeadingEntries.map((e) => `<option value="${e.id}" ${e.id === row.pricingHeadingId ? "selected" : ""}>${escapeHtml(e.description)}</option>`).join("")}</select></td>
      <td><textarea class="pricing-value-input complex-value-editor" data-row-id="${row.id}" rows="3" placeholder="Enter value, slabs, conditions, formulas, or text">${escapeHtml(row.value)}</textarea></td>
      <td><textarea class="pricing-remarks-input complex-value-editor" data-row-id="${row.id}" rows="2" placeholder="Enter remarks">${escapeHtml(row.remarks)}</textarea></td>
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
  { key: "quantity",      label: "Quantity",             type: "text" },
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
    quantity:      row.quantity || "",
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
  return {
    ...getCommonRowDisplayValues(row, index),
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
        <td><textarea class="saved-period-input complex-value-editor" data-row-id="${row.id}" rows="2" placeholder="Enter period">${escapeHtml(row.period)}</textarea></td>
        <td><input type="text" class="saved-quantity-input" data-row-id="${row.id}" value="${escapeHtml(row.quantity)}" placeholder="Enter quantity" /></td>
        <td><input type="text" class="saved-unit-rate-input" data-row-id="${row.id}" value="${escapeHtml(row.unitRate || "")}" placeholder="Enter unit rate" /></td>
        <td><select class="saved-heading-select" data-row-id="${row.id}"><option value="">Select pricing heading</option>${pricingHeadingEntries.map((e) => `<option value="${e.id}" ${e.id === row.pricingHeadingId ? "selected" : ""}>${escapeHtml(e.description)}</option>`).join("")}</select></td>
        <td><textarea class="saved-value-input complex-value-editor" data-row-id="${row.id}" rows="3" placeholder="Enter value, slabs, conditions, formulas, or text">${escapeHtml(row.value)}</textarea></td>
        <td><textarea class="saved-remarks-input complex-value-editor" data-row-id="${row.id}" rows="2" placeholder="Enter remarks">${escapeHtml(row.remarks)}</textarea></td>
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
      <td>${escapeHtml(row.quantity || "")}</td>
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
      <th>APR No.</th>
      <th>BATCH NO.</th>
      <th>SL No.</th>
      <th>Period</th>
      <th>Quantity</th>
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
              : '<tr><td colspan="13" class="empty-state">No pricing rows yet. Click Add Row to begin.</td></tr>'}
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
    quantity: "",
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
    row.quantity,
    row.unitRate,
    row.materialId,
    row.pricingHeadingId,
    row.aprNumber,
    row.batchNo,
    row.slNo,
    row.value,
    row.remarks,
  ].every((value) => value === "" || value === undefined || value === null);
}

function normalizePricingDataRows(rows) {
  const safeRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
  return safeRows.length ? safeRows : [createPricingDataRow()];
}

function loadPersistedState() {
  pricingDataRows = normalizePricingDataRows(getStoredValue("pricingDataRows", []));
  savedPricingRecords = getStoredValue("savedPricingRecords", []);
  completedPricingRecords = getStoredValue("completedPricingRecords", []);
  aprCounter = Number(getStoredValue("aprCounter", 0)) || 0;
  deletionAuditLog = getStoredValue("deletionAuditLog", []);
}

loadPersistedState();

function persistPricingDataState() {
  setStoredValue("pricingDataRows", pricingDataRows);
  setStoredValue("savedPricingRecords", savedPricingRecords);
  setStoredValue("completedPricingRecords", completedPricingRecords);
  setStoredValue("aprCounter", aprCounter);
  setStoredValue("deletionAuditLog", deletionAuditLog);
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
  if (!row.division || !row.stateId || !row.financialYearId || !row.period.trim() || !row.quantity.trim() || !row.materialId || !row.pricingHeadingId || !row.value.trim()) {
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
    ...rowsToSave.map((row) => ({ ...row, aprNumber: batchAprNumber })),
  ];

  const remainingRows = pricingDataRows.filter((row) => !isPricingDataRowComplete(row));
  pricingDataRows = [...remainingRows, createPricingDataRow()];
  pricingDataValidationMessage = `${rowsToSave.length} row${rowsToSave.length > 1 ? "s" : ""} saved successfully.`;
  persistPricingDataState();
  renderPricingDataTable();
}

function handleCompleteSavedRows() {
  if (selectedSavedRowIds.size === 0) {
    pricingDataValidationMessage = "Please select at least one record to complete.";
    renderSavedPricingRecordsPanel();
    return;
  }

  const idsToComplete = [...selectedSavedRowIds];
  const invalidRows = idsToComplete
    .map((id) => savedPricingRecords.find((r) => r.id === id))
    .filter((row) => row && !validateSavedRow(row).valid);

  if (invalidRows.length) {
    pricingDataValidationMessage = "One or more selected records have incomplete fields. Please fix them before completing.";
    renderSavedPricingRecordsPanel();
    return;
  }

  const now = new Date().toLocaleString();
  const newCompleted = idsToComplete.map((id) => {
    const row = savedPricingRecords.find((r) => r.id === id);
    return {
      ...row,
      id: `completed-pricing-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      originalId: row.id,
      completedAt: now,
      completedId: `CMP-${Date.now().toString(36).toUpperCase()}`,
      status: "Completed",
    };
  });

  completedPricingRecords = [...completedPricingRecords, ...newCompleted];
  savedPricingRecords = savedPricingRecords.filter((r) => !selectedSavedRowIds.has(r.id));
  selectedSavedRowIds.clear();
  editingSavedRowId = null;
  pricingDataValidationMessage = `${newCompleted.length} record${newCompleted.length > 1 ? "s" : ""} marked as completed.`;
  persistPricingDataState();
  renderSavedPricingRecordsPanel();
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
                      <td>${escapeHtml(display.quantity)}</td>
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
  }
});

masterDataPanel.addEventListener("input", (event) => {
  if (event.target.classList.contains("report-period-input")) {
    updateReportRecord(event.target.dataset.rowId, "period", event.target.value);
  } else if (event.target.classList.contains("report-quantity-input")) {
    updateReportRecord(event.target.dataset.rowId, "quantity", event.target.value);
  } else if (event.target.classList.contains("report-value-input")) {
    updateReportRecord(event.target.dataset.rowId, "value", event.target.value);
  } else if (event.target.classList.contains("report-remarks-input")) {
    updateReportRecord(event.target.dataset.rowId, "remarks", event.target.value);
  } else if (event.target.classList.contains("pricing-period-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "period", event.target.value);
  } else if (event.target.classList.contains("pricing-quantity-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "quantity", event.target.value);
  } else if (event.target.classList.contains("pricing-unit-rate-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "unitRate", event.target.value);
  } else if (event.target.classList.contains("pricing-batchno-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "batchNo", event.target.value);
  } else if (event.target.classList.contains("pricing-value-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "value", event.target.value);
  } else if (event.target.classList.contains("pricing-remarks-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "remarks", event.target.value);
  } else if (event.target.classList.contains("saved-period-input")) {
    updateSavedPricingRow(event.target.dataset.rowId, "period", event.target.value);
  } else if (event.target.classList.contains("saved-quantity-input")) {
    updateSavedPricingRow(event.target.dataset.rowId, "quantity", event.target.value);
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
