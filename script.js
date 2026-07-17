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
let completedPricingRecords = getStoredValue("completedPricingRecords", []);
let pricingDataValidationMessage = "";
let editingEntryId = null;
let editingPricingHeadingId = null;
let editingStateNameId = null;
let editingFinancialYearId = null;
let currentMasterDataView = "material";
let currentAppView = "master";
let pricingDataCompletionReady = false;

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

function renderPricingDataTable() {
  masterDataPanel.innerHTML = `
    <div class="master-data-card pricing-data-card">
      <div class="panel-heading">
        <h2>PRICING DATA ENTRY</h2>
        <p>Select a material and pricing heading from the master data, then enter the value for each row.</p>
      </div>

      ${pricingDataValidationMessage ? `<div class="validation-message">${escapeHtml(pricingDataValidationMessage)}</div>` : ""}

      <div class="table-actions pricing-data-actions">
        <button type="button" class="add-row-btn" id="addPricingDataRowBtn">Add Row</button>
        <button type="button" class="secondary-btn" id="savePricingDataBtn">Save</button>
        <button type="button" class="complete-btn" id="completePricingDataBtn" ${pricingDataCompletionReady ? "" : "disabled"}>Complete</button>
      </div>

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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pricingDataRows.length
              ? pricingDataRows
                  .map(
                    (row, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td>
                          <select class="pricing-division-select" data-row-id="${row.id}">
                            <option value="">Select division</option>
                            <option value="FERTILIZER" ${row.division === "FERTILIZER" ? "selected" : ""}>FERTILIZER</option>
                            <option value="IPD" ${row.division === "IPD" ? "selected" : ""}>IPD</option>
                            <option value="TIE-UP" ${row.division === "TIE-UP" ? "selected" : ""}>TIE-UP</option>
                          </select>
                        </td>
                        <td>
                          <select class="pricing-state-select" data-row-id="${row.id}">
                            <option value="">Select state</option>
                            ${stateNameEntries
                              .map(
                                (entry) => `
                                  <option value="${entry.id}" ${entry.id === row.stateId ? "selected" : ""}>
                                    ${escapeHtml(entry.name)}
                                  </option>
                                `
                              )
                              .join("")}
                          </select>
                        </td>
                        <td>
                          <select class="pricing-financial-year-select" data-row-id="${row.id}">
                            <option value="">Select financial year</option>
                            ${financialYearEntries
                              .map(
                                (entry) => `
                                  <option value="${entry.id}" ${entry.id === row.financialYearId ? "selected" : ""}>
                                    ${escapeHtml(entry.year)}
                                  </option>
                                `
                              )
                              .join("")}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            class="pricing-period-input"
                            data-row-id="${row.id}"
                            value="${escapeHtml(row.period)}"
                            placeholder="Enter period"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            class="pricing-quantity-input"
                            data-row-id="${row.id}"
                            value="${escapeHtml(row.quantity)}"
                            placeholder="Enter quantity"
                          />
                        </td>
                        <td>
                          <select class="pricing-material-select" data-row-id="${row.id}">
                            <option value="">Select material</option>
                            ${masterDataEntries
                              .map(
                                (entry) => `
                                  <option value="${entry.id}" ${entry.id === row.materialId ? "selected" : ""}>
                                    ${escapeHtml(entry.description)}
                                  </option>
                                `
                              )
                              .join("")}
                          </select>
                        </td>
                        <td>
                          <select class="pricing-heading-select" data-row-id="${row.id}">
                            <option value="">Select pricing heading</option>
                            ${pricingHeadingEntries
                              .map(
                                (entry) => `
                                  <option value="${entry.id}" ${entry.id === row.pricingHeadingId ? "selected" : ""}>
                                    ${escapeHtml(entry.description)}
                                  </option>
                                `
                              )
                              .join("")}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            class="pricing-value-input"
                            data-row-id="${row.id}"
                            value="${escapeHtml(row.value)}"
                            placeholder="Enter value"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            class="pricing-remarks-input"
                            data-row-id="${row.id}"
                            value="${escapeHtml(row.remarks)}"
                            placeholder="Enter remarks"
                          />
                        </td>
                        <td class="entry-actions">
                          <button type="button" class="edit-btn" data-action="edit-pricing-data-row" data-id="${row.id}">Edit</button>
                          <button type="button" class="delete-btn" data-action="delete-pricing-data-row" data-id="${row.id}">Delete</button>
                        </td>
                      </tr>
                    `
                  )
                  .join("")
              : '<tr><td colspan="11" class="empty-state">No pricing rows yet. Click Add Row to begin.</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="saved-entries-section completed-records-section">
        <h3>Completed Records</h3>
        <div class="table-wrapper">
          <table class="master-data-table completed-records-table">
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
                ? completedPricingRecords
                    .map(
                      (row, index) => `
                        <tr>
                          <td>${index + 1}</td>
                          <td>${escapeHtml(row.division || "")}</td>
                          <td>${escapeHtml(stateNameEntries.find((entry) => entry.id === row.stateId)?.name || "")}</td>
                          <td>${escapeHtml(financialYearEntries.find((entry) => entry.id === row.financialYearId)?.year || "")}</td>
                          <td>${escapeHtml(row.period || "")}</td>
                          <td>${escapeHtml(row.quantity || "")}</td>
                          <td>${escapeHtml(masterDataEntries.find((entry) => entry.id === row.materialId)?.description || "")}</td>
                          <td>${escapeHtml(pricingHeadingEntries.find((entry) => entry.id === row.pricingHeadingId)?.description || "")}</td>
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
                      `
                    )
                    .join("")
                : '<tr><td colspan="14" class="empty-state">No completed records yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
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
  setStoredValue("completedPricingRecords", completedPricingRecords);
}

function validatePricingDataRows() {
  const blankRows = pricingDataRows.filter(
    (row) => !row.division || !row.stateId || !row.financialYearId || !row.period.trim() || !row.quantity.trim() || !row.materialId || !row.pricingHeadingId || !row.value.trim()
  );

  if (blankRows.length) {
    return {
      valid: false,
      message: "Please complete all fields in every row before saving or completing.",
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

function updatePricingDataRow(rowId, field, value) {
  const row = pricingDataRows.find((item) => item.id === rowId);
  if (!row) {
    return;
  }

  row[field] = value;
  pricingDataCompletionReady = false;
  pricingDataValidationMessage = "";
  persistPricingDataState();
}

function handleAddPricingDataRow() {
  pricingDataRows.push(createPricingDataRow());
  pricingDataCompletionReady = false;
  persistPricingDataState();
  renderPricingDataTable();
}

function handleDeletePricingDataRow(rowId) {
  pricingDataRows = pricingDataRows.filter((row) => row.id !== rowId);
  pricingDataCompletionReady = false;
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

  pricingDataValidationMessage = "Pricing data saved successfully.";
  pricingDataCompletionReady = true;
  persistPricingDataState();
  renderPricingDataTable();
}

function handleCompletePricingDataRows() {
  if (!pricingDataRows.length) {
    pricingDataValidationMessage = "There are no pricing rows to complete.";
    renderPricingDataTable();
    return;
  }

  if (!pricingDataCompletionReady) {
    pricingDataValidationMessage = "Please save the current pricing rows before completing them.";
    renderPricingDataTable();
    return;
  }

  const validation = validatePricingDataRows();
  if (!validation.valid) {
    pricingDataValidationMessage = validation.message;
    renderPricingDataTable();
    return;
  }

  const completedRows = pricingDataRows.map((row) => ({
    ...row,
    id: `completed-pricing-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    originalId: row.id,
    completedAt: new Date().toLocaleString(),
    completedId: `CMP-${Date.now().toString(36).toUpperCase()}`,
    status: "Completed",
  }));

  completedPricingRecords = [...completedPricingRecords, ...completedRows];
  pricingDataRows = [];
  pricingDataCompletionReady = false;
  pricingDataValidationMessage = "Pricing records marked as completed and moved to Completed Records.";
  persistPricingDataState();
  renderPricingDataTable();
}

function handleEditCompletedPricingRecord(recordId) {
  const completedRecord = completedPricingRecords.find((item) => item.id === recordId);
  if (!completedRecord) {
    return;
  }

  pricingDataRows = [
    ...pricingDataRows,
    {
      ...completedRecord,
      id: completedRecord.originalId || completedRecord.id,
      completedAt: "",
      completedId: "",
      status: "",
    },
  ];
  completedPricingRecords = completedPricingRecords.filter((item) => item.id !== recordId);
  pricingDataCompletionReady = false;
  pricingDataValidationMessage = "Completed record moved back to the active entry table for editing.";
  persistPricingDataState();
  renderPricingDataTable();
}

function handleDeleteCompletedPricingRecord(recordId) {
  completedPricingRecords = completedPricingRecords.filter((item) => item.id !== recordId);
  pricingDataValidationMessage = "Completed record deleted.";
  persistPricingDataState();
  renderPricingDataTable();
}

function renderReportsPanel() {
  masterDataPanel.innerHTML = `
    <div class="master-data-card reports-card">
      <div class="panel-heading">
        <h2>REPORTS</h2>
        <p>Completed pricing records are displayed here from the completed records table.</p>
      </div>

      <div class="table-wrapper">
        <table class="master-data-table reports-table">
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
            </tr>
          </thead>
          <tbody>
            ${completedPricingRecords.length
              ? completedPricingRecords
                  .map(
                    (row, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(row.division || "")}</td>
                        <td>${escapeHtml(stateNameEntries.find((entry) => entry.id === row.stateId)?.name || "")}</td>
                        <td>${escapeHtml(financialYearEntries.find((entry) => entry.id === row.financialYearId)?.year || "")}</td>
                        <td>${escapeHtml(row.period || "")}</td>
                        <td>${escapeHtml(row.quantity || "")}</td>
                        <td>${escapeHtml(masterDataEntries.find((entry) => entry.id === row.materialId)?.description || "")}</td>
                        <td>${escapeHtml(pricingHeadingEntries.find((entry) => entry.id === row.pricingHeadingId)?.description || "")}</td>
                        <td>${escapeHtml(row.value || "")}</td>
                        <td>${escapeHtml(row.remarks || "")}</td>
                        <td>${escapeHtml(row.completedAt || "")}</td>
                        <td>${escapeHtml(row.status || "Completed")}</td>
                        <td>${escapeHtml(row.completedId || row.id)}</td>
                      </tr>
                    `
                  )
                  .join("")
              : '<tr><td colspan="13" class="empty-state">No completed records available yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
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
  renderPricingDataTable();
});

reportsButton.addEventListener("click", () => {
  currentAppView = "reports";
  document.body.classList.remove("pricing-view-active");
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
  } else if (target.id === "addPricingDataRowBtn") {
    handleAddPricingDataRow();
  } else if (target.id === "savePricingDataBtn") {
    handleSavePricingDataRows();
  } else if (target.id === "completePricingDataBtn") {
    handleCompletePricingDataRows();
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
    pricingDataValidationMessage = "Edit action is available for the row. Make changes and save again.";
    renderPricingDataTable();
  } else if (target.matches("[data-action='delete-pricing-data-row']")) {
    handleDeletePricingDataRow(target.dataset.id);
  } else if (target.matches("[data-action='edit-completed-pricing-record']")) {
    handleEditCompletedPricingRecord(target.dataset.id);
  } else if (target.matches("[data-action='delete-completed-pricing-record']")) {
    handleDeleteCompletedPricingRecord(target.dataset.id);
  }
});

masterDataPanel.addEventListener("change", (event) => {
  if (event.target.id === "masterDataModeSelect") {
    currentMasterDataView = event.target.value;
    renderMasterDataPanel();
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
  }
});

masterDataPanel.addEventListener("input", (event) => {
  if (event.target.classList.contains("pricing-period-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "period", event.target.value);
  } else if (event.target.classList.contains("pricing-quantity-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "quantity", event.target.value);
  } else if (event.target.classList.contains("pricing-value-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "value", event.target.value);
  } else if (event.target.classList.contains("pricing-remarks-input")) {
    updatePricingDataRow(event.target.dataset.rowId, "remarks", event.target.value);
  }
});

const yearEl = document.getElementById("year");
yearEl.textContent = new Date().getFullYear();
