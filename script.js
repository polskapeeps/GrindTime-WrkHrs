// In your .docs/script.js (or its copy)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-analytics.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  push,
  remove,
  update,
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDqusLzhEc3GvFElGRdi6mjxtxhLuInYrA",
  authDomain: "grind-time-747f4.firebaseapp.com",
  projectId: "grind-time-747f4",
  storageBucket: "grind-time-747f4.firebasestorage.app",
  messagingSenderId: "406101223329",
  appId: "1:406101223329:web:bca312115c3b61181dcde0",
  measurementId: "G-1ZE97D6KCC",
  databaseURL: "https://grind-time-747f4-default-rtdb.firebaseio.com",
};

// Initialize Firebase (uses the imported 'initializeApp' from the SDK)
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

// Firebase path references
const SETTINGS_PATH = "settings";
const ENTRIES_PATH = "entries";

// DOM Elements
const hourlyRateInput = document.getElementById("hourlyRate");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const settingsStatusSpan = document.getElementById("settingsStatus");

const entryFormCard = document.getElementById("entryFormCard");
const entryDateInput = document.getElementById("entryDate");
const startTimeInput = document.getElementById("startTime");
const endTimeInput = document.getElementById("endTime");
const descriptionInput = document.getElementById("description");
const addEntryBtn = document.getElementById("addEntryBtn");
const updateEntryBtn = document.getElementById("updateEntryBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const editEntryIdInput = document.getElementById("editEntryId");
const entryStatusSpan = document.getElementById("entryStatus");

const entriesTbody = document.getElementById("entriesTbody");
const noEntriesMessage = document.getElementById("noEntriesMessage");

const filterStartDateInput = document.getElementById("filterStartDate");
const filterEndDateInput = document.getElementById("filterEndDate");
const filterBtn = document.getElementById("filterBtn");
const resetFilterBtn = document.getElementById("resetFilterBtn");
const totalHoursFilteredSpan = document.getElementById("totalHoursFiltered");
const totalPayFilteredSpan = document.getElementById("totalPayFiltered");

const exportCsvBtn = document.getElementById("exportCsvBtn");
const exportStatusSpan = document.getElementById("exportStatus");

// State variables
let entries = [];
let settings = { hourlyRate: 20.0 };
let currentFilter = { startDate: null, endDate: null };
let statusTimeout = null;

// Helper Functions
const formatDate = (dateString) => {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-").map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  return dateObj.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

const showStatusMessage = (
  element,
  message,
  type = "success",
  duration = 3000
) => {
  if (!element) return;
  clearTimeout(statusTimeout);
  element.textContent = message;
  element.className = `status-message ${type} show`;
  statusTimeout = setTimeout(() => {
    element.classList.remove("show");
  }, duration);
};

const calculateDuration = (start, end) => {
  if (!start || !end) return 0;
  try {
    const startDate = new Date(`1970-01-01T${start}:00Z`);
    const endDate = new Date(`1970-01-01T${end}:00Z`);
    if (isNaN(startDate) || isNaN(endDate)) return 0;
    let diffMs = endDate - startDate;
    if (diffMs <= 0) {
      // Assumes overnight if end time is earlier or same and start is not null
      // More robust overnight logic might be needed if entries can span more than 24 hours
      // or if a day boundary isn't crossed. For now, this handles simple overnight.
      diffMs += 24 * 60 * 60 * 1000;
    }
    return diffMs / (1000 * 60 * 60);
  } catch (e) {
    console.error("Error calculating duration:", e);
    return 0;
  }
};

// Firebase Data Functions
const loadSettings = () => {
  const settingsRef = ref(database, SETTINGS_PATH);
  onValue(
    settingsRef,
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        settings = data;
        settings.hourlyRate = parseFloat(settings.hourlyRate) || 20.0;
        hourlyRateInput.value = settings.hourlyRate.toFixed(2);
      } else {
        // Initialize settings in Firebase if they don't exist
        saveSettingsToFirebase(settings)
          .then(() => console.log("Default settings saved to Firebase."))
          .catch((err) => console.error("Error saving default settings:", err));
      }
      renderEntries(); // Re-render if rate affects display
    },
    (error) => {
      console.error("Error loading settings from Firebase:", error);
      showStatusMessage(
        settingsStatusSpan,
        "Error loading settings.",
        "error",
        5000
      );
    }
  );
};

const saveSettingsToFirebase = async (newSettings) => {
  const settingsRef = ref(database, SETTINGS_PATH);
  try {
    await set(settingsRef, newSettings);
    return true;
  } catch (error) {
    console.error("Error saving settings to Firebase:", error);
    throw error;
  }
};

const loadEntries = () => {
  const entriesDbRef = ref(database, ENTRIES_PATH);
  onValue(
    entriesDbRef,
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        entries = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
      } else {
        entries = [];
      }
      renderEntries();
    },
    (error) => {
      console.error("Error loading entries from Firebase:", error);
      showStatusMessage(
        entryStatusSpan,
        "Error loading entries.",
        "error",
        5000
      );
    }
  );
};

// Core Logic Functions
const renderEntries = () => {
  entriesTbody.innerHTML = "";
  let filteredEntries = entries;
  const rate = parseFloat(settings.hourlyRate) || 0;

  if (currentFilter.startDate) {
    filteredEntries = filteredEntries.filter(
      (e) => e.date >= currentFilter.startDate
    );
  }
  if (currentFilter.endDate) {
    filteredEntries = filteredEntries.filter(
      (e) => e.date <= currentFilter.endDate
    );
  }

  filteredEntries.sort((a, b) => {
    const dateComparison = b.date.localeCompare(a.date);
    if (dateComparison !== 0) return dateComparison;
    return b.startTime.localeCompare(a.startTime); // Secondary sort by start time if dates are same
  });

  let totalHours = 0;
  let totalPay = 0;

  if (filteredEntries.length === 0) {
    noEntriesMessage.hidden = false;
  } else {
    noEntriesMessage.hidden = true;
    filteredEntries.forEach((entry) => {
      const duration = calculateDuration(entry.startTime, entry.endTime);
      const pay = duration * rate;
      totalHours += duration;
      totalPay += pay;

      const tr = document.createElement("tr");
      tr.dataset.id = entry.id;
      tr.innerHTML = `
        <td>${formatDate(entry.date)}</td>
        <td>${entry.startTime}</td>
        <td>${entry.endTime}</td>
        <td>${duration.toFixed(2)}</td>
        <td><span class="description" title="${entry.description || ""}">${
        entry.description || "-"
      }</span></td>
        <td>${pay.toFixed(2)}</td>
        <td class="actions">
          <button class="btn btn-warning btn-sm edit-btn" data-id="${
            entry.id
          }">Edit</button>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${
            entry.id
          }">Del</button>
        </td>
      `;
      entriesTbody.appendChild(tr);
    });
  }

  totalHoursFilteredSpan.textContent = totalHours.toFixed(2);
  totalPayFilteredSpan.textContent = totalPay.toFixed(2);
};

const clearForm = () => {
  editEntryIdInput.value = "";
  entryDateInput.value = new Date().toISOString().split("T")[0]; // Default to today
  startTimeInput.value = "";
  endTimeInput.value = "";
  descriptionInput.value = "";
  addEntryBtn.hidden = false;
  updateEntryBtn.hidden = true;
  cancelEditBtn.hidden = true;
};

const setupEditForm = (entry) => {
  editEntryIdInput.value = entry.id;
  entryDateInput.value = entry.date;
  startTimeInput.value = entry.startTime;
  endTimeInput.value = entry.endTime;
  descriptionInput.value = entry.description || "";
  addEntryBtn.hidden = true;
  updateEntryBtn.hidden = false;
  cancelEditBtn.hidden = false;
  entryFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
  entryDateInput.focus();
};

// Event Handlers
const handleSaveSettings = async () => {
  const rateValue = parseFloat(hourlyRateInput.value);
  if (isNaN(rateValue) || rateValue < 0) {
    showStatusMessage(
      settingsStatusSpan,
      "Invalid rate. Please enter a positive number.",
      "error"
    );
    hourlyRateInput.focus();
    return;
  }
  const newSettings = { hourlyRate: rateValue };
  try {
    await saveSettingsToFirebase(newSettings);
    showStatusMessage(
      settingsStatusSpan,
      `Rate saved: $${rateValue.toFixed(2)}`
    );
  } catch (error) {
    showStatusMessage(settingsStatusSpan, "Error saving rate.", "error");
  }
};

const handleAddOrUpdateEntry = async (isUpdate = false) => {
  const entryId = editEntryIdInput.value; // Will be empty if adding
  const date = entryDateInput.value;
  const start = startTimeInput.value;
  const end = endTimeInput.value;
  const description = descriptionInput.value.trim();

  if (!date || !start || !end) {
    showStatusMessage(
      entryStatusSpan,
      "Date, Start Time, and End Time are required.",
      "error"
    );
    return;
  }

  const duration = calculateDuration(start, end);
  // Specific check for non-overnight shifts where end time is before start time
  if (start && end && start > end && duration < 12) {
    // Assuming an overnight shift wouldn't naturally result in a duration < 12 if calculated straight
    if (
      !confirm(
        "End time is earlier than start time. Is this an overnight shift? If not, the times may be incorrect."
      )
    ) {
      showStatusMessage(
        entryStatusSpan,
        "Entry cancelled. Please verify times.",
        "error"
      );
      return;
    }
  } else if (start === end) {
    showStatusMessage(
      entryStatusSpan,
      "Start and End times cannot be the same unless it's a 24-hour entry (handled as overnight). Please adjust.",
      "error"
    );
    return;
  }

  if (duration <= 0 && start < end) {
    // This case should ideally not happen if calculateDuration is correct with non-overnight
    showStatusMessage(
      entryStatusSpan,
      "Invalid time range selected resulting in zero or negative duration.",
      "error"
    );
    return;
  }

  const entryData = { date, startTime: start, endTime: end, description };

  try {
    if (isUpdate && entryId) {
      const entryRef = ref(database, `${ENTRIES_PATH}/${entryId}`);
      await set(entryRef, entryData); // Using set for update to overwrite the existing entry
      showStatusMessage(
        entryStatusSpan,
        "Entry updated successfully.",
        "success"
      );
    } else {
      const entriesListRef = ref(database, ENTRIES_PATH);
      await push(entriesListRef, entryData);
      showStatusMessage(
        entryStatusSpan,
        "Entry added successfully.",
        "success"
      );
    }
    clearForm();
    // renderEntries(); // loadEntries already calls this via onValue, so this might be redundant
  } catch (error) {
    console.error("Error saving entry to Firebase:", error);
    showStatusMessage(entryStatusSpan, "Error saving entry.", "error");
  }
};

const handleTableActions = async (event) => {
  const target = event.target;
  const entryId = target.dataset.id;

  if (!entryId) return; // Clicked somewhere else in the tbody

  if (target.classList.contains("edit-btn")) {
    const entryToEdit = entries.find((e) => e.id === entryId);
    if (entryToEdit) {
      setupEditForm(entryToEdit);
    }
  } else if (target.classList.contains("delete-btn")) {
    if (confirm("Are you sure you want to delete this entry?")) {
      try {
        const entryRef = ref(database, `${ENTRIES_PATH}/${entryId}`);
        await remove(entryRef);
        showStatusMessage(entryStatusSpan, "Entry deleted.", "success");
        if (editEntryIdInput.value === entryId) {
          // If deleting the entry currently in edit form
          clearForm();
        }
        // renderEntries(); // loadEntries already calls this via onValue
      } catch (error) {
        console.error("Error deleting entry from Firebase:", error);
        showStatusMessage(entryStatusSpan, "Error deleting entry.", "error");
      }
    }
  }
};

const handleFilter = () => {
  if (
    filterStartDateInput.value &&
    filterEndDateInput.value &&
    filterEndDateInput.value < filterStartDateInput.value
  ) {
    showStatusMessage(
      exportStatusSpan,
      "Filter 'To' date cannot be before 'From' date.",
      "error"
    ); // Use exportStatusSpan or another relevant one
    return;
  }
  currentFilter.startDate = filterStartDateInput.value || null;
  currentFilter.endDate = filterEndDateInput.value || null;
  renderEntries();
  showStatusMessage(exportStatusSpan, "Filter applied.", "success", 1500); // Use exportStatusSpan or another relevant one
};

const handleResetFilter = () => {
  filterStartDateInput.value = "";
  filterEndDateInput.value = "";
  currentFilter.startDate = null;
  currentFilter.endDate = null;
  renderEntries();
  showStatusMessage(exportStatusSpan, "Filter reset.", "success", 1500); // Use exportStatusSpan or another relevant one
};

const handleExportCsv = () => {
  let filteredEntries = entries;
  if (currentFilter.startDate) {
    filteredEntries = filteredEntries.filter(
      (e) => e.date >= currentFilter.startDate
    );
  }
  if (currentFilter.endDate) {
    filteredEntries = filteredEntries.filter(
      (e) => e.date <= currentFilter.endDate
    );
  }

  if (filteredEntries.length === 0) {
    showStatusMessage(
      exportStatusSpan,
      "No entries selected to export.",
      "error"
    );
    return;
  }

  // Sort entries for export, consistent with display
  filteredEntries.sort((a, b) => {
    const dateComparison = b.date.localeCompare(a.date);
    if (dateComparison !== 0) return dateComparison;
    return b.startTime.localeCompare(a.startTime);
  });

  const rate = settings.hourlyRate;
  let csvContent =
    "Date,Start Time,End Time,Duration (Hours),Description,Pay ($)\n";

  filteredEntries.forEach((entry) => {
    const duration = calculateDuration(entry.startTime, entry.endTime);
    const pay = duration * rate;
    const escapedDesc = entry.description
      ? `"${entry.description.replace(/"/g, '""')}"`
      : ""; // Handle quotes in description
    csvContent += `${entry.date},${entry.startTime},${
      entry.endTime
    },${duration.toFixed(3)},${escapedDesc},${pay.toFixed(2)}\n`;
  });

  try {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);

    let filename = "work_hours_export.csv";
    const today = new Date().toISOString().split("T")[0];
    const start = currentFilter.startDate || "all";
    const end = currentFilter.endDate || today; // Default end to today if not specified for filename
    if (start !== "all" || end !== today) {
      // Make sure start and end are actual dates for the filename
      const actualStart = currentFilter.startDate || "beginning";
      const actualEnd =
        currentFilter.endDate || new Date().toISOString().split("T")[0];
      filename = `work_hours_${actualStart}_to_${actualEnd}.csv`;
    }

    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showStatusMessage(exportStatusSpan, "CSV export generated.", "success");
  } catch (e) {
    console.error("CSV Export failed:", e);
    showStatusMessage(
      exportStatusSpan,
      "CSV export failed. See console for details.",
      "error"
    );
  }
};

// *** EDITED SECTION ***
// Renamed this function from initializeApp to setupApplication
const setupApplication = () => {
  // Set the default date in the form
  clearForm();

  // Load data from Firebase and set up listeners
  loadSettings();
  loadEntries();

  // Set up event listeners
  if (saveSettingsBtn)
    saveSettingsBtn.addEventListener("click", handleSaveSettings);
  if (addEntryBtn)
    addEntryBtn.addEventListener("click", () => handleAddOrUpdateEntry(false));
  if (updateEntryBtn)
    updateEntryBtn.addEventListener("click", () =>
      handleAddOrUpdateEntry(true)
    );
  if (cancelEditBtn) cancelEditBtn.addEventListener("click", clearForm);
  if (entriesTbody) entriesTbody.addEventListener("click", handleTableActions);
  if (filterBtn) filterBtn.addEventListener("click", handleFilter);
  if (resetFilterBtn)
    resetFilterBtn.addEventListener("click", handleResetFilter);
  if (exportCsvBtn) exportCsvBtn.addEventListener("click", handleExportCsv);
};

// Start the application once the DOM is fully loaded
// Call the renamed function
setupApplication();
// *** END EDITED SECTION ***
