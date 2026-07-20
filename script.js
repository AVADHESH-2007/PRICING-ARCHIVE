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

// ─────────────────────────────────────────────────────────────────────────────

function buildSavedRowHtml(row, index) {
  const isEditing = row.id === editingSavedRowId;
  const isChecked = selectedSavedRowIds.has(row.id);
  const aprCell = `<td class="apr-no-cell">${escapeHtml(row.aprNumber || "")}</td>`;
  const slCell = `<td class="sl-no-cell"><input type="checkbox" class="saved-row-checkbox" data-row-id="${row.id}" ${isChecked ? "checked" : ""} /><span>${index + 1}</span></td>`;
  if (isEditing) {
    return `
      <tr>
        ${aprCell}
        ${slCell}
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
      ${aprCell}
      ${slCell}
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

  savedPricingRecords = [
    ...savedPricingRecords,
    ...pricingDataRows.map((row) => {
      aprCounter += 1;
      return { ...row, aprNumber: `APR-${aprCounter}` };
    }),
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
  masterDataPanel.innerHTML = `
    <div class="master-data-card pricing-data-card">
      <div class="panel-heading">
        <h2>REPORTS</h2>
        <p>Completed pricing records are displayed here from the completed records table.</p>
      </div>

      ${reportsValidationMessage ? `<div class="validation-message">${escapeHtml(reportsValidationMessage)}</div>` : ""}

      <div class="table-wrapper">
        <table class="master-data-table pricing-data-table">
          <thead>
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
              <th>Completed On</th>
              <th>Status</th>
              <th>Completed ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${completedPricingRecords.length
              ? completedPricingRecords.map((row, index) => {
                  const isEditing = row.id === editingReportRecordId;
                  if (isEditing) {
                    return `
                      <tr>
                        <td>${index + 1}</td>
                        <td>
                          <select class="report-division-select" data-row-id="${row.id}">
                            <option value="">Select division</option>
                            <option value="FERTILIZER" ${row.division === "FERTILIZER" ? "selected" : ""}>FERTILIZER</option>
                            <option value="IPD" ${row.division === "IPD" ? "selected" : ""}>IPD</option>
                            <option value="TIE-UP" ${row.division === "TIE-UP" ? "selected" : ""}>TIE-UP</option>
                          </select>
                        </td>
                        <td>
                          <select class="report-state-select" data-row-id="${row.id}">
                            <option value="">Select state</option>
                            ${stateNameEntries.map((e) => `<option value="${e.id}" ${e.id === row.stateId ? "selected" : ""}>${escapeHtml(e.name)}</option>`).join("")}
                          </select>
                        </td>
                        <td>
                          <select class="report-financial-year-select" data-row-id="${row.id}">
                            <option value="">Select financial year</option>
                            ${financialYearEntries.map((e) => `<option value="${e.id}" ${e.id === row.financialYearId ? "selected" : ""}>${escapeHtml(e.year)}</option>`).join("")}
                          </select>
                        </td>
                        <td><input type="text" class="report-period-input" data-row-id="${row.id}" value="${escapeHtml(row.period)}" placeholder="Period" /></td>
                        <td><input type="text" class="report-quantity-input" data-row-id="${row.id}" value="${escapeHtml(row.quantity)}" placeholder="Quantity" /></td>
                        <td>
                          <select class="report-material-select" data-row-id="${row.id}">
                            <option value="">Select material</option>
                            ${masterDataEntries.map((e) => `<option value="${e.id}" ${e.id === row.materialId ? "selected" : ""}>${escapeHtml(e.description)}</option>`).join("")}
                          </select>
                        </td>
                        <td>
                          <select class="report-heading-select" data-row-id="${row.id}">
                            <option value="">Select pricing heading</option>
                            ${pricingHeadingEntries.map((e) => `<option value="${e.id}" ${e.id === row.pricingHeadingId ? "selected" : ""}>${escapeHtml(e.description)}</option>`).join("")}
                          </select>
                        </td>
                        <td><input type="text" class="report-value-input" data-row-id="${row.id}" value="${escapeHtml(row.value)}" placeholder="Value" /></td>
                        <td><input type="text" class="report-remarks-input" data-row-id="${row.id}" value="${escapeHtml(row.remarks)}" placeholder="Remarks" /></td>
                        <td>${escapeHtml(row.completedAt || "")}</td>
                        <td>${escapeHtml(row.status || "Completed")}</td>
                        <td>${escapeHtml(row.completedId || row.id)}</td>
                        <td class="entry-actions">
                          <button type="button" class="add-row-btn" data-action="save-report-record" data-id="${row.id}">Save</button>
                          <button type="button" class="secondary-btn" data-action="cancel-report-edit">Cancel</button>
                        </td>
                      </tr>
                    `;
                  }
                  return `
                    <tr>
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
                      <td class="entry-actions">
                        <button type="button" class="edit-btn" data-action="edit-completed-pricing-record" data-id="${row.id}">Edit</button>
                        <button type="button" class="delete-btn" data-action="delete-completed-pricing-record" data-id="${row.id}">Delete</button>
                      </td>
                    </tr>
                  `;
                }).join("")
              : '<tr><td colspan="14" class="empty-state">No completed records available yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function updateReportRecord(recordId, field, value) {
  const record = completedPricingRecords.find((r) => r.id === recordId);
  if (!record) return;
  record[field] = value;
}

function handleSaveReportRecord(recordId) {
  const record = completedPricingRecords.find((r) => r.id === recordId);
  if (!record) return;

  if (!record.division || !record.stateId || !record.financialYearId || !record.period.trim() || !record.quantity.trim() || !record.materialId || !record.pricingHeadingId || !record.value.trim()) {
    reportsValidationMessage = "Please complete all fields before saving.";
    renderReportsPanel();
    return;
  }

  editingReportRecordId = null;
  reportsValidationMessage = "Record updated successfully.";
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
  } else if (target.matches("[data-action='edit-completed-pricing-record']")) {
    editingReportRecordId = target.dataset.id;
    reportsValidationMessage = "";
    renderReportsPanel();
  } else if (target.matches("[data-action='save-report-record']")) {
    handleSaveReportRecord(target.dataset.id);
  } else if (target.matches("[data-action='cancel-report-edit']")) {
    editingReportRecordId = null;
    reportsValidationMessage = "";
    renderReportsPanel();
  } else if (target.matches("[data-action='delete-completed-pricing-record']")) {
    handleDeleteCompletedPricingRecord(target.dataset.id);
    renderReportsPanel();
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
    applyFilterFromPopup();
  } else if (target.id === "fpClear") {
    clearColumnFilter(activeFilterCol);
  } else if (target.id === "fpClose") {
    closeFilterPopup();
  } else if (!popup.contains(target) && !target.classList.contains("col-filter-btn")) {
    closeFilterPopup();
  }
});

const yearEl = document.getElementById("year");
yearEl.textContent = new Date().getFullYear();
