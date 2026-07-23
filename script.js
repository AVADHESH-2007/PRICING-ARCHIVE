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
const reportsButton = document.getElementById("reportsBtn");
const misButton = document.getElementById("misBtn");
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
let pricingDataRows = getStoredValue("pricingDataRows", []);
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
let misState = {
  filters: {},
  reportType: "division",
  pivotDimension: "division",
  pivotMetric: "sumValue",
  sortKey: "value",
  sortDir: "desc",
  page: 1,
  drill: null,
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMasterDataTable() {
  const entryToEdit = masterDataEntries.find((entry) => entry.id === editingEntryId) || null;

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
        <p>Add material details with the appropriate business division.</p>
      </div>
      <div class="table-wrapper">
        <div class="master-data-form">
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
        </div>

        <div class="saved-entries-section">
          <h3>Saved Entries</h3>
          <table class="master-data-table">
            <thead>
              <tr>
                <th>Sl. No.</th>
                <th>Material Description</th>
                <th>Material Code</th>
                <th>Business Division</th>
                <th>Actions</th>
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
                          <td class="entry-actions">
                            <button type="button" class="edit-btn" data-action="edit" data-id="${entry.id}">Edit</button>
                            <button type="button" class="delete-btn" data-action="delete" data-id="${entry.id}">Delete</button>
                          </td>
                        </tr>
                      `
                    )
                    .join("")
                : '<tr><td colspan="5" class="empty-state">No entries added yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderStateNameEntry() {
  const entryToEdit = stateNameEntries.find((entry) => entry.id === editingStateNameId) || null;

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

      <div class="pricing-heading-form">
        <input id="stateNameInput" type="text" value="${escapeHtml(entryToEdit?.name || "")}" placeholder="Enter state name" />
        <button type="button" class="add-row-btn" id="addStateNameBtn">${entryToEdit ? "Save" : "Add"}</button>
        ${entryToEdit ? '<button type="button" class="secondary-btn" id="cancelStateNameEditBtn">Cancel</button>' : ""}
      </div>

      <div class="saved-entries-section">
        <h3>Saved States</h3>
        <table class="master-data-table">
          <thead>
            <tr>
              <th>Sl. No.</th>
              <th>Name</th>
              <th>Actions</th>
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
                        <td class="entry-actions">
                          <button type="button" class="edit-btn" data-action="edit-state-name" data-id="${entry.id}">Edit</button>
                          <button type="button" class="delete-btn" data-action="delete-state-name" data-id="${entry.id}">Delete</button>
                        </td>
                      </tr>
                    `
                  )
                  .join("")
              : '<tr><td colspan="3" class="empty-state">No state names added yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderFinancialYearEntry() {
  const entryToEdit = financialYearEntries.find((entry) => entry.id === editingFinancialYearId) || null;

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

      <div class="pricing-heading-form">
        <input id="financialYearInput" type="text" value="${escapeHtml(entryToEdit?.year || "")}" placeholder="Enter financial year" />
        <button type="button" class="add-row-btn" id="addFinancialYearBtn">${entryToEdit ? "Save" : "Add"}</button>
        ${entryToEdit ? '<button type="button" class="secondary-btn" id="cancelFinancialYearEditBtn">Cancel</button>' : ""}
      </div>

      <div class="saved-entries-section">
        <h3>Saved Financial Years</h3>
        <table class="master-data-table">
          <thead>
            <tr>
              <th>Sl. No.</th>
              <th>Year</th>
              <th>Actions</th>
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
                        <td class="entry-actions">
                          <button type="button" class="edit-btn" data-action="edit-financial-year" data-id="${entry.id}">Edit</button>
                          <button type="button" class="delete-btn" data-action="delete-financial-year" data-id="${entry.id}">Delete</button>
                        </td>
                      </tr>
                    `
                  )
                  .join("")
              : '<tr><td colspan="3" class="empty-state">No financial years added yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPricingHeadingEntry() {
  const entryToEdit = pricingHeadingEntries.find((entry) => entry.id === editingPricingHeadingId) || null;

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

      <div class="pricing-heading-form">
        <input id="pricingHeadingInput" type="text" value="${escapeHtml(entryToEdit?.description || "")}" placeholder="Enter pricing heading description" />
        <button type="button" class="add-row-btn" id="addPricingHeadingBtn">${entryToEdit ? "Save" : "Add"}</button>
        ${entryToEdit ? '<button type="button" class="secondary-btn" id="cancelPricingHeadingEditBtn">Cancel</button>' : ""}
      </div>

      <div class="saved-entries-section">
        <h3>Saved Pricing Headings</h3>
        <table class="master-data-table">
          <thead>
            <tr>
              <th>Sl. No.</th>
              <th>Description</th>
              <th>Actions</th>
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
                        <td class="entry-actions">
                          <button type="button" class="edit-btn" data-action="edit-pricing-heading" data-id="${entry.id}">Edit</button>
                          <button type="button" class="delete-btn" data-action="delete-pricing-heading" data-id="${entry.id}">Delete</button>
                        </td>
                      </tr>
                    `
                  )
                  .join("")
              : '<tr><td colspan="3" class="empty-state">No pricing heading descriptions added yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function buildEntryRowHtml(row, index) {
  return `
    <tr>
      <td class="sl-no-cell"><span>${index + 1}</span></td>
      <td><select class="pricing-division-select" data-row-id="${row.id}"><option value="">Select division</option><option value="FERTILIZER" ${row.division === "FERTILIZER" ? "selected" : ""}>FERTILIZER</option><option value="IPD" ${row.division === "IPD" ? "selected" : ""}>IPD</option><option value="TIE-UP" ${row.division === "TIE-UP" ? "selected" : ""}>TIE-UP</option></select></td>
      <td><select class="pricing-state-select" data-row-id="${row.id}"><option value="">Select state</option>${stateNameEntries.map((e) => `<option value="${e.id}" ${e.id === row.stateId ? "selected" : ""}>${escapeHtml(e.name)}</option>`).join("")}</select></td>
      <td><select class="pricing-financial-year-select" data-row-id="${row.id}"><option value="">Select financial year</option>${financialYearEntries.map((e) => `<option value="${e.id}" ${e.id === row.financialYearId ? "selected" : ""}>${escapeHtml(e.year)}</option>`).join("")}</select></td>
      <td><input type="text" class="pricing-period-input" data-row-id="${row.id}" value="${escapeHtml(row.period)}" placeholder="Enter period" /></td>
      <td><input type="text" class="pricing-quantity-input" data-row-id="${row.id}" value="${escapeHtml(row.quantity)}" placeholder="Enter quantity" /></td>
      <td><select class="pricing-material-select" data-row-id="${row.id}"><option value="">Select material</option>${masterDataEntries.map((e) => `<option value="${e.id}" ${e.id === row.materialId ? "selected" : ""}>${escapeHtml(e.description)}</option>`).join("")}</select></td>
      <td><select class="pricing-heading-select" data-row-id="${row.id}"><option value="">Select pricing heading</option>${pricingHeadingEntries.map((e) => `<option value="${e.id}" ${e.id === row.pricingHeadingId ? "selected" : ""}>${escapeHtml(e.description)}</option>`).join("")}</select></td>
      <td><input type="text" class="pricing-value-input" data-row-id="${row.id}" value="${escapeHtml(row.value)}" placeholder="Enter value" /></td>
      <td><input type="text" class="pricing-remarks-input" data-row-id="${row.id}" value="${escapeHtml(row.remarks)}" placeholder="Enter remarks" /></td>
      <td class="entry-actions"><button type="button" class="delete-btn" data-action="delete-pricing-data-row" data-id="${row.id}">Delete</button></td>
    </tr>
  `;
}

// ── Filter helpers ──────────────────────────────────────────────────────────

const SAVED_COLS = [
  { key: "aprNumber",   label: "APR No.",               type: "text" },
  { key: "slNo",        label: "Sl. No.",                type: "text" },
  { key: "division",    label: "Division",               type: "dropdown" },
  { key: "state",       label: "State",                  type: "text" },
  { key: "financialYear", label: "Financial Year",       type: "text" },
  { key: "period",      label: "Period",                 type: "text" },
  { key: "quantity",    label: "Quantity",               type: "text" },
  { key: "material",    label: "Material Description",   type: "text" },
  { key: "pricingHeading", label: "Pricing Heading",     type: "text" },
  { key: "value",       label: "Value / Amount / Text",  type: "text" },
  { key: "remarks",     label: "Remarks",                type: "text" },
];

function getSavedRowDisplayValues(row, index) {
  return {
    aprNumber:     row.aprNumber || "",
    slNo:          String(index + 1),
    division:      row.division || "",
    state:         stateNameEntries.find((e) => e.id === row.stateId)?.name || "",
    financialYear: financialYearEntries.find((e) => e.id === row.financialYearId)?.year || "",
    period:        row.period || "",
    quantity:      row.quantity || "",
    material:      masterDataEntries.find((e) => e.id === row.materialId)?.description || "",
    pricingHeading: pricingHeadingEntries.find((e) => e.id === row.pricingHeadingId)?.description || "",
    value:         row.value || "",
    remarks:       row.remarks || "",
  };
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
  renderPricingDataTable();
}

function clearColumnFilter(colKey) {
  delete savedRecordFilters[colKey];
  closeFilterPopup();
  syncSelectionToFilteredRecords();
  renderPricingDataTable();
}

// ── Report filter helpers ─────────────────────────────────────────────────────

const REPORT_COLS = [
  { key: "aprNumber",     label: "APR No.",              type: "text" },
  { key: "slNo",          label: "Sl. No.",              type: "text" },
  { key: "division",      label: "Division",             type: "dropdown" },
  { key: "state",         label: "State",                type: "text" },
  { key: "financialYear", label: "Financial Year",       type: "text" },
  { key: "period",        label: "Period",               type: "text" },
  { key: "quantity",      label: "Quantity",             type: "text" },
  { key: "material",      label: "Material Description", type: "text" },
  { key: "pricingHeading",label: "Pricing Heading",      type: "text" },
  { key: "value",         label: "Value / Amount / Text",type: "text" },
  { key: "remarks",       label: "Remarks",              type: "text" },
  { key: "completedAt",   label: "Completed On",         type: "text" },
  { key: "status",        label: "Status",               type: "text" },
  { key: "completedId",   label: "Completed ID",         type: "text" },
];

function getReportRowDisplayValues(row, index) {
  return {
    aprNumber:     row.aprNumber || "",
    slNo:          String(index + 1),
    division:      row.division || "",
    state:         stateNameEntries.find((e) => e.id === row.stateId)?.name || "",
    financialYear: financialYearEntries.find((e) => e.id === row.financialYearId)?.year || "",
    period:        row.period || "",
    quantity:      row.quantity || "",
    material:      masterDataEntries.find((e) => e.id === row.materialId)?.description || "",
    pricingHeading:pricingHeadingEntries.find((e) => e.id === row.pricingHeadingId)?.description || "",
    value:         row.value || "",
    remarks:       row.remarks || "",
    completedAt:   row.completedAt || "",
    status:        row.status || "Completed",
    completedId:   row.completedId || row.id,
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
  const aprCell = `<td class="apr-no-cell">${escapeHtml(row.aprNumber || "")}</td>`;
  const slCell = `<td class="sl-no-cell"><input type="checkbox" class="saved-row-checkbox" data-row-id="${row.id}" ${isChecked ? "checked" : ""} /></td>`;
  if (isEditing) {
    return `
      <tr>
        ${slCell}
        ${aprCell}
        <td class="sl-no-cell"><span>${index + 1}</span></td>
        <td><select class="saved-division-select" data-row-id="${row.id}"><option value="">Select division</option><option value="FERTILIZER" ${row.division === "FERTILIZER" ? "selected" : ""}>FERTILIZER</option><option value="IPD" ${row.division === "IPD" ? "selected" : ""}>IPD</option><option value="TIE-UP" ${row.division === "TIE-UP" ? "selected" : ""}>TIE-UP</option></select></td>
        <td><select class="saved-state-select" data-row-id="${row.id}"><option value="">Select state</option>${stateNameEntries.map((e) => `<option value="${e.id}" ${e.id === row.stateId ? "selected" : ""}>${escapeHtml(e.name)}</option>`).join("")}</select></td>
        <td><select class="saved-financial-year-select" data-row-id="${row.id}"><option value="">Select financial year</option>${financialYearEntries.map((e) => `<option value="${e.id}" ${e.id === row.financialYearId ? "selected" : ""}>${escapeHtml(e.year)}</option>`).join("")}</select></td>
        <td><input type="text" class="saved-period-input" data-row-id="${row.id}" value="${escapeHtml(row.period)}" placeholder="Enter period" /></td>
        <td><input type="text" class="saved-quantity-input" data-row-id="${row.id}" value="${escapeHtml(row.quantity)}" placeholder="Enter quantity" /></td>
        <td><select class="saved-material-select" data-row-id="${row.id}"><option value="">Select material</option>${masterDataEntries.map((e) => `<option value="${e.id}" ${e.id === row.materialId ? "selected" : ""}>${escapeHtml(e.description)}</option>`).join("")}</select></td>
        <td><select class="saved-heading-select" data-row-id="${row.id}"><option value="">Select pricing heading</option>${pricingHeadingEntries.map((e) => `<option value="${e.id}" ${e.id === row.pricingHeadingId ? "selected" : ""}>${escapeHtml(e.description)}</option>`).join("")}</select></td>
        <td><input type="text" class="saved-value-input" data-row-id="${row.id}" value="${escapeHtml(row.value)}" placeholder="Enter value" /></td>
        <td><input type="text" class="saved-remarks-input" data-row-id="${row.id}" value="${escapeHtml(row.remarks)}" placeholder="Enter remarks" /></td>
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
      ${aprCell}
      <td class="sl-no-cell"><span>${index + 1}</span></td>
      <td>${escapeHtml(row.division || "")}</td>
      <td>${escapeHtml(stateNameEntries.find((e) => e.id === row.stateId)?.name || "")}</td>
      <td>${escapeHtml(financialYearEntries.find((e) => e.id === row.financialYearId)?.year || "")}</td>
      <td>${escapeHtml(row.period || "")}</td>
      <td>${escapeHtml(row.quantity || "")}</td>
      <td>${escapeHtml(masterDataEntries.find((e) => e.id === row.materialId)?.description || "")}</td>
      <td>${escapeHtml(pricingHeadingEntries.find((e) => e.id === row.pricingHeadingId)?.description || "")}</td>
      <td>${escapeHtml(row.value || "")}</td>
      <td>${escapeHtml(row.remarks || "")}</td>
      <td class="entry-actions"></td>
    </tr>
  `;
}

function renderPricingDataTable() {
  const selCount = selectedSavedRowIds.size;
  const hasSelection = selCount > 0;
  const isSingleSelection = selCount === 1;
  const isEditingAny = !!editingSavedRowId;
  const entryTableHeaders = `
    <tr>
      <th>Sl. No.</th>
      <th>Division</th>
      <th>State</th>
      <th>Financial Year</th>
      <th>Period</th>
      <th>Quantity</th>
      <th>Material Description</th>
      <th>Pricing Heading</th>
      <th>Value / Amount / Text</th>
      <th>Remarks</th>
      <th>Actions</th>
    </tr>`;
  const hasActiveFilters = Object.values(savedRecordFilters).some((f) => f?.active);
  const filteredRecords = getFilteredSavedRecords();
  const savedTableHeaders = `<tr>${buildSavedTableHeaderRow(filteredRecords)}</tr>`;
  // After render, set indeterminate state via JS (can't be done in HTML)
  // This is handled in a post-render step below.

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
              : '<tr><td colspan="11" class="empty-state">No pricing rows yet. Click Add Row to begin.</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="saved-records-section">
        <div class="saved-records-header">
          <h3>Saved Pricing Records</h3>
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
            <thead>${savedTableHeaders}</thead>
            <tbody>
              ${filteredRecords.length
                ? filteredRecords.map((row, index) => buildSavedRowHtml(row, index)).join("")
                : `<tr><td colspan="13" class="empty-state">${savedPricingRecords.length ? "No records match the current filters." : "No saved records yet. Save a row above to see it here."}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Set indeterminate state on Select All checkbox (must be done via JS after render)
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
    materialId: "",
    pricingHeadingId: "",
    value: "",
    remarks: "",
  };
}

function persistPricingDataState() {
  setStoredValue("pricingDataRows", pricingDataRows);
  setStoredValue("savedPricingRecords", savedPricingRecords);
  setStoredValue("completedPricingRecords", completedPricingRecords);
  setStoredValue("aprCounter", aprCounter);
  setStoredValue("deletionAuditLog", deletionAuditLog);
}

function validatePricingDataRows() {
  const blankRows = pricingDataRows.filter(
    (row) => !row.division || !row.stateId || !row.financialYearId || !row.period.trim() || !row.quantity.trim() || !row.materialId || !row.pricingHeadingId || !row.value.trim()
  );

  if (blankRows.length) {
    return {
      valid: false,
      message: "Please complete all fields in every row before saving.",
    };
  }

  const stateMap = new Map(stateNameEntries.map((entry) => [entry.id, entry.name]));
  const financialYearMap = new Map(financialYearEntries.map((entry) => [entry.id, entry.year]));
  const materialMap = new Map(masterDataEntries.map((entry) => [entry.id, entry.description]));
  const headingMap = new Map(pricingHeadingEntries.map((entry) => [entry.id, entry.description]));
  const seen = new Set();
  let duplicateFound = false;

  pricingDataRows.forEach((row) => {
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
  pricingDataRows.push(createPricingDataRow());
  pricingDataValidationMessage = "";
  persistPricingDataState();
  renderPricingDataTable();
}

function handleDeletePricingDataRow(rowId) {
  const confirmed = window.confirm("Are you sure you want to delete this row?");
  if (!confirmed) return;
  pricingDataRows = pricingDataRows.filter((row) => row.id !== rowId);
  if (pricingDataRows.length === 0) {
    pricingDataRows.push(createPricingDataRow());
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

  aprCounter += 1;
  const batchAprNumber = `APR-${aprCounter}`;
  savedPricingRecords = [
    ...savedPricingRecords,
    ...pricingDataRows.map((row) => ({ ...row, aprNumber: batchAprNumber })),
  ];
  pricingDataRows = [createPricingDataRow()];
  pricingDataValidationMessage = "Row saved successfully.";
  persistPricingDataState();
  renderPricingDataTable();
}

function handleCompleteSavedRows() {
  if (selectedSavedRowIds.size === 0) {
    pricingDataValidationMessage = "Please select at least one record to complete.";
    renderPricingDataTable();
    return;
  }

  const idsToComplete = [...selectedSavedRowIds];
  const invalidRows = idsToComplete
    .map((id) => savedPricingRecords.find((r) => r.id === id))
    .filter((row) => row && !validateSavedRow(row).valid);

  if (invalidRows.length) {
    pricingDataValidationMessage = "One or more selected records have incomplete fields. Please fix them before completing.";
    renderPricingDataTable();
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
  renderPricingDataTable();
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
  const colCount = isAdminAuthenticated ? 15 : 14;

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
              ? filteredReports.map((row, index) => `
                  <tr>
                    <td class="apr-no-cell">${escapeHtml(row.aprNumber || "")}</td>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(row.division || "")}</td>
                    <td>${escapeHtml(stateNameEntries.find((e) => e.id === row.stateId)?.name || "")}</td>
                    <td>${escapeHtml(financialYearEntries.find((e) => e.id === row.financialYearId)?.year || "")}</td>
                    <td>${escapeHtml(row.period || "")}</td>
                    <td>${escapeHtml(row.quantity || "")}</td>
                    <td>${escapeHtml(masterDataEntries.find((e) => e.id === row.materialId)?.description || "")}</td>
                    <td>${escapeHtml(pricingHeadingEntries.find((e) => e.id === row.pricingHeadingId)?.description || "")}</td>
                    <td>${escapeHtml(row.value || "")}</td>
                    <td>${escapeHtml(row.remarks || "")}</td>
                    <td>${escapeHtml(row.completedAt || "")}</td>
                    <td>${escapeHtml(row.status || "Completed")}</td>
                    <td>${escapeHtml(row.completedId || row.id)}</td>
                    ${isAdminAuthenticated ? `<td class="entry-actions"><button type="button" class="delete-btn" data-action="admin-delete-report" data-id="${row.id}">Delete</button></td>` : ""}
                  </tr>
                `).join("")
              : `<tr><td colspan="${colCount}" class="empty-state">${completedPricingRecords.length ? "No records match the current filters." : "No completed records available yet."}</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderMisPanel() {
  const records = getMisRecords();
  const summary = getMisSummary(records);
  const report = getMisReport(records);
  const pageSize = 10;
  const sortedReportRows = sortMisRows(report.rows);
  const pageCount = Math.max(1, Math.ceil(sortedReportRows.length / pageSize));
  misState.page = Math.min(misState.page, pageCount);
  const pageRows = sortedReportRows.slice((misState.page - 1) * pageSize, misState.page * pageSize);

  masterDataPanel.innerHTML = `
    <div class="master-data-card pricing-data-card mis-dashboard">
      <div class="panel-heading">
        <h2>MIS</h2>
        <p>Read-only management dashboard based only on finalized Report records.</p>
      </div>
      <div class="mis-filter-panel">
        <div class="mis-filter-title"><strong>Report Filters</strong><span>${records.length} of ${completedPricingRecords.length} completed records</span></div>
        <div class="mis-filter-grid">${buildMisFilters()}</div>
        <div class="table-actions mis-actions">
          <button type="button" class="add-row-btn" id="misApplyFiltersBtn">Apply Filters</button>
          <button type="button" class="secondary-btn" id="misClearFiltersBtn">Clear Filters</button>
          <input id="misGlobalSearch" class="mis-global-search" type="search" placeholder="Search all displayed fields" value="${escapeHtml(misState.filters.global || "")}" />
          <button type="button" class="secondary-btn" id="misExportCsvBtn">Export CSV</button>
          <button type="button" class="secondary-btn" id="misExportExcelBtn">Export Excel</button>
          <button type="button" class="secondary-btn" id="misPrintBtn">Print / Save PDF</button>
        </div>
      </div>
      <div class="mis-kpis">${buildMisKpis(summary)}</div>
      <div class="mis-chart-grid">${buildMisChart("Division-wise Value", getMisGroupedRows(records, "division").slice(0, 6))}${buildMisChart("State-wise Quantity", getMisGroupedRows(records, "state").slice(0, 6), "quantity")}</div>
      <div class="mis-report-toolbar">
        <label>Analysis <select id="misReportType">${[
          ["period", "Period Comparison"], ["division", "Division-wise Comparison"], ["state", "State-wise Comparison"],
          ["material", "Material-wise Comparison"], ["heading", "Pricing Heading Analysis"], ["apr", "APR-wise Analysis"], ["pivot", "Pivot Analysis"],
        ].map(([value, label]) => `<option value="${value}" ${misState.reportType === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        ${misState.reportType === "pivot" ? `<label>Dimension <select id="misPivotDimension">${buildMisDimensionOptions(misState.pivotDimension)}</select></label><label>Summary <select id="misPivotMetric">${buildMisMetricOptions(misState.pivotMetric)}</select></label>` : ""}
      </div>
      <div class="table-wrapper mis-table-wrapper">
        ${buildMisTable(report, pageRows)}
      </div>
      <div class="mis-pagination"><button type="button" class="secondary-btn" data-mis-page="prev" ${misState.page === 1 ? "disabled" : ""}>Previous</button><span>Page ${misState.page} of ${pageCount} · ${report.rows.length} groups</span><button type="button" class="secondary-btn" data-mis-page="next" ${misState.page === pageCount ? "disabled" : ""}>Next</button></div>
      ${buildMisDrillDown(records)}
      <p class="mis-note">Scheduling and email distribution are reserved for a future server-side enhancement. MIS data is read-only; completed records cannot be edited here.</p>
    </div>
  `;
}

const MIS_DIMENSIONS = [
  ["financialYear", "Financial Year"], ["period", "Period"], ["division", "Division"], ["state", "State"],
  ["material", "Material Description"], ["pricingHeading", "Pricing Heading"], ["aprNumber", "APR No."],
];

function getMisRecordValues(row, index) {
  const values = getReportRowDisplayValues(row, index);
  return { ...values, quantityNumber: misNumber(values.quantity), valueNumber: misNumber(values.value), id: row.id };
}

function misNumber(value) {
  const number = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function misDateValue(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getMisRecords() {
  const seen = new Set();
  const global = (misState.filters.global || "").trim().toLowerCase();
  const dateFrom = misState.filters.dateFrom || "";
  const dateTo = misState.filters.dateTo || "";
  return completedPricingRecords.map(getMisRecordValues).filter((record) => {
    if (seen.has(record.id)) return false;
    seen.add(record.id);
    const included = MIS_DIMENSIONS.every(([key]) => {
      const selected = misState.filters[key] || [];
      return !selected.length || selected.includes(record[key]);
    });
    if (!included) return false;
    const date = misDateValue(record.completedAt);
    if (dateFrom && date && date < new Date(`${dateFrom}T00:00:00`).getTime()) return false;
    if (dateTo && date && date > new Date(`${dateTo}T23:59:59`).getTime()) return false;
    return !global || Object.values(record).join(" ").toLowerCase().includes(global);
  });
}

function buildMisFilters() {
  return MIS_DIMENSIONS.map(([key, label]) => {
    const values = [...new Set(completedPricingRecords.map(getMisRecordValues).map((record) => record[key]).filter(Boolean))].sort();
    const selected = misState.filters[key] || [];
    return `<div class="mis-filter"><label>${label}</label><input type="search" class="mis-filter-search" data-mis-search-for="${key}" placeholder="Search ${label}" /><select class="mis-filter-select" data-mis-filter="${key}" multiple size="3">${values.map((value) => `<option value="${escapeHtml(value)}" ${selected.includes(value) ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select><div><button type="button" class="mis-link-btn" data-mis-select-all="${key}">All</button><button type="button" class="mis-link-btn" data-mis-select-none="${key}">None</button></div></div>`;
  }).join("") + `<div class="mis-filter mis-date-filter"><label>Completed Date Range</label><input id="misDateFrom" type="date" value="${escapeHtml(misState.filters.dateFrom || "")}" /><input id="misDateTo" type="date" value="${escapeHtml(misState.filters.dateTo || "")}" /></div>`;
}

function getMisSummary(records) {
  const unique = (key) => new Set(records.map((record) => record[key]).filter(Boolean)).size;
  const totalValue = records.reduce((sum, record) => sum + record.valueNumber, 0);
  return { aprs: unique("aprNumber"), quantity: records.reduce((sum, record) => sum + record.quantityNumber, 0), value: totalValue, divisions: unique("division"), states: unique("state"), materials: unique("material"), headings: unique("pricingHeading"), average: unique("aprNumber") ? totalValue / unique("aprNumber") : 0, latest: records.reduce((latest, record) => misDateValue(record.completedAt) > misDateValue(latest) ? record.completedAt : latest, "") };
}

function misFormat(value) { return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }); }

function buildMisKpis(summary) {
  const cards = [["Total APRs", summary.aprs], ["Total Quantity", misFormat(summary.quantity)], ["Total Value", misFormat(summary.value)], ["Divisions", summary.divisions], ["States", summary.states], ["Materials", summary.materials], ["Pricing Headings", summary.headings], ["Avg. Value / APR", misFormat(summary.average)], ["Latest Completed", summary.latest || "—"]];
  return cards.map(([label, value]) => `<div class="mis-kpi"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
}

function getMisGroupedRows(records, dimension) {
  const groups = new Map();
  records.forEach((record) => {
    const key = record[dimension] || "Not specified";
    const group = groups.get(key) || { key, count: 0, quantity: 0, value: 0, records: [] };
    group.count += 1; group.quantity += record.quantityNumber; group.value += record.valueNumber; group.records.push(record); groups.set(key, group);
  });
  return [...groups.values()].map((group) => ({ ...group, average: group.count ? group.value / group.count : 0 })).sort((a, b) => b.value - a.value);
}

function buildMisChart(title, rows, metric = "value") {
  const max = Math.max(...rows.map((row) => row[metric]), 1);
  return `<section class="mis-chart"><h3>${title}</h3>${rows.length ? rows.map((row) => `<div class="mis-bar-row"><span title="${escapeHtml(row.key)}">${escapeHtml(row.key)}</span><div class="mis-bar-track"><i style="width:${Math.max(3, (row[metric] / max) * 100)}%"></i></div><b>${misFormat(row[metric])}</b></div>`).join("") : `<p class="empty-state">No Data Found</p>`}</section>`;
}

function getMisReport(records) {
  const configs = {
    division: { dimension: "division", title: "Division", extras: ["Quantity", "Value", "Average Value"] },
    state: { dimension: "state", title: "State", extras: ["Quantity", "Value", "% Contribution", "Growth %"] },
    material: { dimension: "material", title: "Material Description", extras: ["Line Items", "Quantity", "Value"] },
    heading: { dimension: "pricingHeading", title: "Pricing Heading", extras: ["Total Amount", "Average", "Maximum", "Minimum", "Trend"] },
    apr: { dimension: "aprNumber", title: "APR No.", extras: ["Line Items", "Quantity", "Total Value", "Completion Date", "Status", "Remarks"] },
    pivot: { dimension: misState.pivotDimension, title: MIS_DIMENSIONS.find(([key]) => key === misState.pivotDimension)?.[1] || "Dimension", extras: ["Summary"] },
  };
  if (misState.reportType === "period") {
    const rows = getMisGroupedRows(records, "period").sort((a, b) => a.key.localeCompare(b.key)).map((row, index, all) => ({ ...row, previous: all[index - 1]?.value || 0 }));
    return { headers: ["Period", "Current Value", "Previous Period", "Difference", "% Change"], rows: rows.map((row) => ({ ...row, difference: row.value - row.previous, change: row.previous ? (row.value - row.previous) / row.previous * 100 : 0 })), dimension: "period" };
  }
  const config = configs[misState.reportType] || configs.division;
  let rows = getMisGroupedRows(records, config.dimension);
  if (misState.reportType === "state") rows = rows.map((row, index, all) => ({ ...row, contribution: records.length ? row.value / Math.max(1, records.reduce((sum, record) => sum + record.valueNumber, 0)) * 100 : 0, growth: index ? (row.value - all[index - 1].value) / Math.max(1, all[index - 1].value) * 100 : 0 }));
  if (misState.reportType === "heading") rows = rows.map((row) => ({ ...row, maximum: Math.max(...row.records.map((record) => record.valueNumber)), minimum: Math.min(...row.records.map((record) => record.valueNumber)) }));
  if (misState.reportType === "pivot") rows = rows.map((row) => ({ ...row, summary: misPivotValue(row) }));
  return { headers: [config.title, "Rank", ...config.extras], rows, dimension: config.dimension };
}

function misPivotValue(row) {
  const values = row.records.map((record) => record.valueNumber);
  if (misState.pivotMetric === "avgValue") return row.count ? row.value / row.count : 0;
  if (misState.pivotMetric === "count") return row.count;
  if (misState.pivotMetric === "maxValue") return Math.max(...values, 0);
  if (misState.pivotMetric === "minValue") return Math.min(...values, 0);
  return row.value;
}

function buildMisTable(report, rows) {
  const header = (label, key) => `<th><button type="button" class="mis-sort-btn" data-mis-sort="${key}">${label}${misState.sortKey === key ? (misState.sortDir === "asc" ? " ↑" : " ↓") : ""}</button></th>`;
  const cells = (row, index) => {
    const drill = `data-mis-drill="${escapeHtml(JSON.stringify({ dimension: report.dimension, key: row.key }))}"`;
    if (misState.reportType === "period") return `<td><button class="mis-drill-btn" ${drill}>${escapeHtml(row.key)}</button></td><td>${misFormat(row.value)}</td><td>${misFormat(row.previous)}</td><td>${misFormat(row.difference)}</td><td>${misFormat(row.change)}%</td>`;
    if (misState.reportType === "state") return `<td><button class="mis-drill-btn" ${drill}>${escapeHtml(row.key)}</button></td><td>${index + 1}</td><td>${misFormat(row.quantity)}</td><td>${misFormat(row.value)}</td><td>${misFormat(row.contribution)}%</td><td>${misFormat(row.growth)}%</td>`;
    if (misState.reportType === "heading") return `<td><button class="mis-drill-btn" ${drill}>${escapeHtml(row.key)}</button></td><td>${index + 1}</td><td>${misFormat(row.value)}</td><td>${misFormat(row.average)}</td><td>${misFormat(row.maximum)}</td><td>${misFormat(row.minimum)}</td><td>Current total</td>`;
    if (misState.reportType === "apr") { const first = row.records[0] || {}; return `<td><button class="mis-drill-btn" ${drill}>${escapeHtml(row.key)}</button></td><td>${index + 1}</td><td>${row.count}</td><td>${misFormat(row.quantity)}</td><td>${misFormat(row.value)}</td><td>${escapeHtml(first.completedAt || "")}</td><td>${escapeHtml(first.status || "Completed")}</td><td>${escapeHtml(first.remarks || "")}</td>`; }
    if (misState.reportType === "pivot") return `<td><button class="mis-drill-btn" ${drill}>${escapeHtml(row.key)}</button></td><td>${index + 1}</td><td>${misFormat(row.summary)}</td>`;
    if (misState.reportType === "material") return `<td><button class="mis-drill-btn" ${drill}>${escapeHtml(row.key)}</button></td><td>${index + 1}</td><td>${row.count}</td><td>${misFormat(row.quantity)}</td><td>${misFormat(row.value)}</td>`;
    return `<td><button class="mis-drill-btn" ${drill}>${escapeHtml(row.key)}</button></td><td>${index + 1}</td><td>${misFormat(row.quantity)}</td><td>${misFormat(row.value)}</td><td>${misFormat(row.average)}</td>`;
  };
  return `<table class="master-data-table pricing-data-table mis-table"><thead><tr>${report.headers.map((label, index) => header(label, index === 0 ? "key" : label.toLowerCase().replace(/[^a-z]+/g, "").replace("currentvalue", "value").replace("totalamount", "value").replace("summary", "summary"))).join("")}</tr></thead><tbody>${rows.length ? rows.map(cells).map((cell, index) => `<tr>${cell}</tr>`).join("") : `<tr><td colspan="${report.headers.length}" class="empty-state">No Data Found</td></tr>`}</tbody></table>`;
}

function sortMisRows(rows) {
  return [...rows].sort((a, b) => {
    const av = a[misState.sortKey] ?? a.value ?? 0;
    const bv = b[misState.sortKey] ?? b.value ?? 0;
    return typeof av === "string"
      ? av.localeCompare(bv) * (misState.sortDir === "asc" ? 1 : -1)
      : (av - bv) * (misState.sortDir === "asc" ? 1 : -1);
  });
}

function buildMisDimensionOptions(selected) { return MIS_DIMENSIONS.map(([key, label]) => `<option value="${key}" ${key === selected ? "selected" : ""}>${label}</option>`).join(""); }
function buildMisMetricOptions(selected) { return [["sumValue", "Sum"], ["avgValue", "Average"], ["count", "Count"], ["maxValue", "Maximum"], ["minValue", "Minimum"]].map(([key, label]) => `<option value="${key}" ${key === selected ? "selected" : ""}>${label}</option>`).join(""); }

function buildMisDrillDown(records) {
  if (!misState.drill) return "";
  const { dimension, key } = misState.drill;
  const matches = records.filter((record) => record[dimension] === key);
  return `<section class="mis-drilldown"><div class="mis-filter-title"><strong>Drill-down: ${escapeHtml(key)}</strong><button type="button" class="secondary-btn" id="misCloseDrillBtn">Close</button></div><div class="table-wrapper"><table class="master-data-table pricing-data-table"><thead><tr><th>APR No.</th><th>Division</th><th>State</th><th>Period</th><th>Material</th><th>Pricing Heading</th><th>Quantity</th><th>Value</th><th>Completed On</th></tr></thead><tbody>${matches.map((record) => `<tr><td>${escapeHtml(record.aprNumber)}</td><td>${escapeHtml(record.division)}</td><td>${escapeHtml(record.state)}</td><td>${escapeHtml(record.period)}</td><td>${escapeHtml(record.material)}</td><td>${escapeHtml(record.pricingHeading)}</td><td>${misFormat(record.quantityNumber)}</td><td>${misFormat(record.valueNumber)}</td><td>${escapeHtml(record.completedAt)}</td></tr>`).join("") || `<tr><td colspan="9" class="empty-state">No Data Found</td></tr>`}</tbody></table></div></section>`;
}

function updateMisFiltersFromUi() {
  document.querySelectorAll(".mis-filter-select").forEach((select) => { misState.filters[select.dataset.misFilter] = [...select.selectedOptions].map((option) => option.value); });
  misState.filters.dateFrom = document.getElementById("misDateFrom")?.value || "";
  misState.filters.dateTo = document.getElementById("misDateTo")?.value || "";
  misState.filters.global = document.getElementById("misGlobalSearch")?.value || "";
  misState.page = 1;
}

function exportMisCsv(excel = false) {
  const records = getMisRecords();
  const headings = ["APR No.", "Division", "State", "Financial Year", "Period", "Quantity", "Material Description", "Pricing Heading", "Value", "Remarks", "Completed Date"];
  const rows = records.map((record) => [record.aprNumber, record.division, record.state, record.financialYear, record.period, record.quantity, record.material, record.pricingHeading, record.value, record.remarks, record.completedAt]);
  const content = [headings, ...rows].map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `MIS-${new Date().toISOString().slice(0, 10)}.${excel ? "xls" : "csv"}`; link.click(); URL.revokeObjectURL(link.href);
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
    masterDataEntries = masterDataEntries.map((entry) =>
      entry.id === editingEntryId ? { ...entry, description, code, division } : entry
    );
    editingEntryId = null;
  } else {
    masterDataEntries.push({
      id: Date.now().toString(),
      description,
      code,
      division,
    });
  }

  renderMasterDataTable();
}

function handleEditEntry(id) {
  editingEntryId = id;
  renderMasterDataTable();
}

function handleDeleteEntry(id) {
  const entry = masterDataEntries.find((item) => item.id === id);
  if (!entry) {
    return;
  }

  const confirmed = window.confirm(`Delete entry for ${entry.description}?`);
  if (!confirmed) {
    return;
  }

  masterDataEntries = masterDataEntries.filter((item) => item.id !== id);
  if (editingEntryId === id) {
    editingEntryId = null;
  }
  renderMasterDataTable();
}

function handleAddPricingHeading() {
  const description = document.getElementById("pricingHeadingInput")?.value.trim();
  if (!description) {
    return;
  }

  if (editingPricingHeadingId) {
    pricingHeadingEntries = pricingHeadingEntries.map((entry) =>
      entry.id === editingPricingHeadingId ? { ...entry, description } : entry
    );
    editingPricingHeadingId = null;
  } else {
    pricingHeadingEntries.push({
      id: Date.now().toString(),
      description,
    });
  }

  renderPricingHeadingEntry();
}

function handleEditPricingHeading(id) {
  editingPricingHeadingId = id;
  renderPricingHeadingEntry();
}

function handleDeletePricingHeading(id) {
  const entry = pricingHeadingEntries.find((item) => item.id === id);
  if (!entry) {
    return;
  }

  const confirmed = window.confirm(`Delete pricing heading "${entry.description}"?`);
  if (!confirmed) {
    return;
  }

  pricingHeadingEntries = pricingHeadingEntries.filter((item) => item.id !== id);
  if (editingPricingHeadingId === id) {
    editingPricingHeadingId = null;
  }
  renderPricingHeadingEntry();
}

function handleAddStateName() {
  const name = document.getElementById("stateNameInput")?.value.trim();
  if (!name) {
    return;
  }

  if (editingStateNameId) {
    stateNameEntries = stateNameEntries.map((entry) =>
      entry.id === editingStateNameId ? { ...entry, name } : entry
    );
    editingStateNameId = null;
  } else {
    stateNameEntries.push({ id: Date.now().toString(), name });
  }

  renderStateNameEntry();
}

function handleEditStateName(id) {
  editingStateNameId = id;
  renderStateNameEntry();
}

function handleDeleteStateName(id) {
  const entry = stateNameEntries.find((item) => item.id === id);
  if (!entry) {
    return;
  }

  const confirmed = window.confirm(`Delete state "${entry.name}"?`);
  if (!confirmed) {
    return;
  }

  stateNameEntries = stateNameEntries.filter((item) => item.id !== id);
  if (editingStateNameId === id) {
    editingStateNameId = null;
  }
  renderStateNameEntry();
}

function handleAddFinancialYear() {
  const year = document.getElementById("financialYearInput")?.value.trim();
  if (!year) {
    return;
  }

  if (editingFinancialYearId) {
    financialYearEntries = financialYearEntries.map((entry) =>
      entry.id === editingFinancialYearId ? { ...entry, year } : entry
    );
    editingFinancialYearId = null;
  } else {
    financialYearEntries.push({ id: Date.now().toString(), year });
  }

  renderFinancialYearEntry();
}

function handleEditFinancialYear(id) {
  editingFinancialYearId = id;
  renderFinancialYearEntry();
}

function handleDeleteFinancialYear(id) {
  const entry = financialYearEntries.find((item) => item.id === id);
  if (!entry) {
    return;
  }

  const confirmed = window.confirm(`Delete financial year "${entry.year}"?`);
  if (!confirmed) {
    return;
  }

  financialYearEntries = financialYearEntries.filter((item) => item.id !== id);
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
  if (pricingDataRows.length === 0) {
    pricingDataRows.push(createPricingDataRow());
    persistPricingDataState();
  }
  renderPricingDataTable();
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

masterDataPanel.addEventListener("click", (event) => {
  const target = event.target;
  if (target.id === "misApplyFiltersBtn") { updateMisFiltersFromUi(); renderMisPanel(); }
  else if (target.id === "misClearFiltersBtn") { misState.filters = {}; misState.page = 1; misState.drill = null; renderMisPanel(); }
  else if (target.dataset.misSelectAll) { document.querySelectorAll(`[data-mis-filter="${target.dataset.misSelectAll}"] option`).forEach((option) => { option.selected = true; }); updateMisFiltersFromUi(); renderMisPanel(); }
  else if (target.dataset.misSelectNone) { document.querySelectorAll(`[data-mis-filter="${target.dataset.misSelectNone}"] option`).forEach((option) => { option.selected = false; }); updateMisFiltersFromUi(); renderMisPanel(); }
  else if (target.dataset.misPage) { misState.page += target.dataset.misPage === "next" ? 1 : -1; renderMisPanel(); }
  else if (target.dataset.misSort) { const key = target.dataset.misSort; misState.sortDir = misState.sortKey === key && misState.sortDir === "desc" ? "asc" : "desc"; misState.sortKey = key; renderMisPanel(); }
  else if (target.classList.contains("mis-drill-btn")) { misState.drill = JSON.parse(target.dataset.misDrill); renderMisPanel(); }
  else if (target.id === "misCloseDrillBtn") { misState.drill = null; renderMisPanel(); }
  else if (target.id === "misExportCsvBtn") { updateMisFiltersFromUi(); exportMisCsv(); }
  else if (target.id === "misExportExcelBtn") { updateMisFiltersFromUi(); exportMisCsv(true); }
  else if (target.id === "misPrintBtn") { window.print(); }
});

masterDataPanel.addEventListener("change", (event) => {
  const target = event.target;
  if (target.classList.contains("mis-filter-select") || target.id === "misDateFrom" || target.id === "misDateTo" || target.id === "misGlobalSearch") { updateMisFiltersFromUi(); renderMisPanel(); }
  else if (target.id === "misReportType") { misState.reportType = target.value; misState.page = 1; renderMisPanel(); }
  else if (target.id === "misPivotDimension") { misState.pivotDimension = target.value; renderMisPanel(); }
  else if (target.id === "misPivotMetric") { misState.pivotMetric = target.value; renderMisPanel(); }
});

masterDataPanel.addEventListener("input", (event) => {
  if (event.target.classList.contains("mis-filter-search")) {
    const select = document.querySelector(`[data-mis-filter="${event.target.dataset.misSearchFor}"]`);
    if (select) [...select.options].forEach((option) => { option.hidden = !option.text.toLowerCase().includes(event.target.value.toLowerCase()); });
  }
});

masterDataPanel.addEventListener("click", (event) => {
  const target = event.target;

  if (target.id === "saveMasterEntryBtn") {
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
    renderPricingDataTable();
  } else if (target.classList.contains("col-filter-btn")) {
    openFilterPopup(target.dataset.filterCol, target);
  } else if (target.id === "editSavedRowBtn") {
    if (selectedSavedRowIds.size !== 1 || editingSavedRowId) return;
    editingSavedRowId = [...selectedSavedRowIds][0];
    pricingDataValidationMessage = "";
    renderPricingDataTable();
  } else if (target.id === "deleteSavedRowBtn") {
    if (selectedSavedRowIds.size !== 1 || editingSavedRowId) return;
    const confirmed = window.confirm("Are you sure you want to delete this record?");
    if (!confirmed) return;
    const idToDelete = [...selectedSavedRowIds][0];
    savedPricingRecords = savedPricingRecords.filter((row) => row.id !== idToDelete);
    selectedSavedRowIds.clear();
    persistPricingDataState();
    renderPricingDataTable();
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
      renderPricingDataTable();
      return;
    }
    editingSavedRowId = null;
    selectedSavedRowIds.clear();
    pricingDataValidationMessage = "Record updated successfully.";
    persistPricingDataState();
    renderPricingDataTable();
  } else if (target.matches("[data-action='cancel-saved-edit']")) {
    editingSavedRowId = null;
    selectedSavedRowIds.clear();
    pricingDataValidationMessage = "";
    renderPricingDataTable();
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
    renderPricingDataTable();
  } else if (event.target.classList.contains("saved-row-checkbox")) {
    const rowId = event.target.dataset.rowId;
    if (event.target.checked) {
      selectedSavedRowIds.add(rowId);
    } else {
      selectedSavedRowIds.delete(rowId);
    }
    renderPricingDataTable();
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
  } else if (event.target.classList.contains("pricing-value-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "value", event.target.value);
  } else if (event.target.classList.contains("pricing-remarks-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "remarks", event.target.value);
  } else if (event.target.classList.contains("saved-period-input")) {
    updateSavedPricingRow(event.target.dataset.rowId, "period", event.target.value);
  } else if (event.target.classList.contains("saved-quantity-input")) {
    updateSavedPricingRow(event.target.dataset.rowId, "quantity", event.target.value);
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
