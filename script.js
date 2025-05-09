// Firebase functions are now available globally via the 'firebase' object
// Remove the ES6 import statements for Firebase:
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// import {
//   getDatabase,
//   ref,
//   set,
//   onValue,
//   push,
//   remove,
//   update
// } from "firebase/database";

// Firebase configuration (ensure this is your actual project config)
const firebaseConfig = {
  apiKey: "AIzaSyDqusLzhEc3GvFElGRdi6mjxtxhLuInYrA", // Use your actual API key
  authDomain: "grind-time-747f4.firebaseapp.com",
  projectId: "grind-time-747f4",
  storageBucket: "grind-time-747f4.firebasestorage.app",
  messagingSenderId: "406101223329",
  appId: "1:406101223329:web:bca312115c3b61181dcde0",
  measurementId: "G-1ZE97D6KCC",
  databaseURL: "https://grind-time-747f4-default-rtdb.firebaseio.com",
};

// Initialize Firebase using the global 'firebase' object from the CDN scripts
const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics(app);
const database = firebase.database(app); // Get the database instance

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
  const dateObj = new Date(Date.UTC(year, month - 1, day)); // Use UTC to avoid timezone issues with date only
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
    const startDate = new Date(`1970-01-01T${start}:00Z`); // Assume UTC for time calculation consistency
    const endDate = new Date(`1970-01-01T${end}:00Z`);
    if (isNaN(startDate) || isNaN(endDate)) return 0;
    let diffMs = endDate - startDate;
    if (diffMs <= 0) { // Handles overnight if end time is earlier or same
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
  const settingsRef = firebase.database().ref(SETTINGS_PATH); // Use global firebase.database().ref()
  firebase.database().onValue(settingsRef, (snapshot) => { // Use global firebase.database().onValue()
    const data = snapshot.val();
    if (data) {
      settings = data;
      settings.hourlyRate = parseFloat(settings.hourlyRate) || 20.0;
      if (hourlyRateInput) hourlyRateInput.value = settings.hourlyRate.toFixed(2);
    } else {
      saveSettingsToFirebase(settings)
        .then(() => console.log("Default settings saved to Firebase."))
        .catch(err => console.error("Error saving default settings:", err));
    }
    renderEntries();
  }, (error) => {
    console.error("Error loading settings from Firebase:", error);
    if (settingsStatusSpan) showStatusMessage(settingsStatusSpan, "Error loading settings.", "error", 5000);
  });
};

const saveSettingsToFirebase = async (newSettings) => {
  const settingsRef = firebase.database().ref(SETTINGS_PATH);
  try {
    await firebase.database().set(settingsRef, newSettings); // Use global firebase.database().set()
    return true;
  } catch (error) {
    console.error("Error saving settings to Firebase:", error);
    throw error;
  }
};

const loadEntries = () => {
  const entriesDbRef = firebase.database().ref(ENTRIES_PATH);
  firebase.database().onValue(entriesDbRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      entries = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
    } else {
      entries = [];
    }
    renderEntries();
  }, (error) => {
    console.error("Error loading entries from Firebase:", error);
    if (entryStatusSpan) showStatusMessage(entryStatusSpan, "Error loading entries.", "error", 5000);
  });
};

// Core Logic Functions
const renderEntries = () => {
  if (!entriesTbody || !totalHoursFilteredSpan || !totalPayFilteredSpan || !noEntriesMessage) return;

  entriesTbody.innerHTML = "";
  let filteredEntries = entries;
  const rate = parseFloat(settings.hourlyRate) || 0;

  if (currentFilter.startDate) {
    filteredEntries = filteredEntries.filter(e => e.date >= currentFilter.startDate);
  }
  if (currentFilter.endDate) {
    filteredEntries = filteredEntries.filter(e => e.date <= currentFilter.endDate);
  }

  filteredEntries.sort((a, b) => {
    const dateComparison = b.date.localeCompare(a.date);
    if (dateComparison !== 0) return dateComparison;
    return b.startTime.localeCompare(a.startTime);
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
        <td><span class="description" title="${entry.description || ""}">${entry.description || "-"}</span></td>
        <td>${pay.toFixed(2)}</td>
        <td class="actions">
          <button class="btn btn-warning btn-sm edit-btn" data-id="${entry.id}">Edit</button>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${entry.id}">Del</button>
        </td>
      `;
      entriesTbody.appendChild(tr);
    });
  }

  totalHoursFilteredSpan.textContent = totalHours.toFixed(2);
  totalPayFilteredSpan.textContent = totalPay.toFixed(2);
};

const clearForm = () => {
  if (editEntryIdInput) editEntryIdInput.value = "";
  if (entryDateInput) entryDateInput.value = new Date().toISOString().split("T")[0];
  if (startTimeInput) startTimeInput.value = "";
  if (endTimeInput) endTimeInput.value = "";
  if (descriptionInput) descriptionInput.value = "";
  if (addEntryBtn) addEntryBtn.hidden = false;
  if (updateEntryBtn) updateEntryBtn.hidden = true;
  if (cancelEditBtn) cancelEditBtn.hidden = true;
};

const setupEditForm = (entry) => {
  if (!editEntryIdInput || !entryDateInput || !startTimeInput || !endTimeInput || !descriptionInput || !addEntryBtn || !updateEntryBtn || !cancelEditBtn || !entryFormCard) return;
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
  if (!hourlyRateInput || !settingsStatusSpan) return;
  const rateValue = parseFloat(hourlyRateInput.value);
  if (isNaN(rateValue) || rateValue < 0) {
    showStatusMessage(settingsStatusSpan, "Invalid rate. Please enter a positive number.", "error");
    hourlyRateInput.focus();
    return;
  }
  const newSettings = { hourlyRate: rateValue };
  try {
    await saveSettingsToFirebase(newSettings);
    showStatusMessage(settingsStatusSpan, `Rate saved: $${rateValue.toFixed(2)}`);
  } catch (error) {
    showStatusMessage(settingsStatusSpan, "Error saving rate.", "error");
  }
};

const handleAddOrUpdateEntry = async (isUpdate = false) => {
  if (!editEntryIdInput || !entryDateInput || !startTimeInput || !endTimeInput || !descriptionInput || !entryStatusSpan) return;

  const entryId = editEntryIdInput.value;
  const date = entryDateInput.value;
  const start = startTimeInput.value;
  const end = endTimeInput.value;
  const description = descriptionInput.value.trim();

  if (!date || !start || !end) {
    showStatusMessage(entryStatusSpan, "Date, Start Time, and End Time are required.", "error");
    return;
  }

  const duration = calculateDuration(start, end);
  if (start && end && start > end && duration < 12) {
     if (!confirm("End time is earlier than start time. Is this an overnight shift? If not, the times may be incorrect.")) {
        showStatusMessage(entryStatusSpan, "Entry cancelled. Please verify times.", "error");
        return;
    }
  } else if (start === end) {
     showStatusMessage(entryStatusSpan, "Start and End times cannot be the same unless it's a 24-hour entry. Please adjust.", "error");
     return;
  }

  if (duration <= 0 && start < end) {
    showStatusMessage(entryStatusSpan, "Invalid time range. Duration is zero or negative.", "error");
    return;
  }

  const entryData = { date, startTime: start, endTime: end, description };

  try {
    if (isUpdate && entryId) {
      const entryRef = firebase.database().ref(`${ENTRIES_PATH}/${entryId}`);
      await firebase.database().set(entryRef, entryData); // Use global firebase.database().set()
      showStatusMessage(entryStatusSpan, "Entry updated successfully.", "success");
    } else {
      const entriesListRef = firebase.database().ref(ENTRIES_PATH);
      await firebase.database().push(entriesListRef, entryData); // Use global firebase.database().push()
      showStatusMessage(entryStatusSpan, "Entry added successfully.", "success");
    }
    clearForm();
    // renderEntries(); // Not strictly needed as onValue in loadEntries will trigger it
  } catch (error) {
    console.error("Error saving entry to Firebase:", error);
    showStatusMessage(entryStatusSpan, "Error saving entry.", "error");
  }
};

const handleTableActions = async (event) => {
  if (!entryStatusSpan || !editEntryIdInput) return;
  const target = event.target;
  const entryId = target.dataset.id;

  if (!entryId) return;

  if (target.classList.contains("edit-btn")) {
    const entryToEdit = entries.find(e => e.id === entryId);
    if (entryToEdit) {
      setupEditForm(entryToEdit);
    }
  } else if (target.classList.contains("delete-btn")) {
    if (confirm("Are you sure you want to delete this entry?")) {
      try {
        const entryRef = firebase.database().ref(`${ENTRIES_PATH}/${entryId}`);
        await firebase.database().remove(entryRef); // Use global firebase.database().remove()
        showStatusMessage(entryStatusSpan, "Entry deleted.", "success");
        if (editEntryIdInput.value === entryId) {
          clearForm();
        }
        // renderEntries(); // Not strictly needed
      } catch (error) {
        console.error("Error deleting entry from Firebase:", error);
        showStatusMessage(entryStatusSpan, "Error deleting entry.", "error");
      }
    }
  }
};

const handleFilter = () => {
  if (!filterStartDateInput || !filterEndDateInput || !exportStatusSpan) return;
  if (filterStartDateInput.value && filterEndDateInput.value && filterEndDateInput.value < filterStartDateInput.value) {
    showStatusMessage(exportStatusSpan, "Filter 'To' date cannot be before 'From' date.", "error");
    return;
  }
  currentFilter.startDate = filterStartDateInput.value || null;
  currentFilter.endDate = filterEndDateInput.value || null;
  renderEntries();
  showStatusMessage(exportStatusSpan, "Filter applied.", "success", 1500);
};

const handleResetFilter = () => {
  if (!filterStartDateInput || !filterEndDateInput || !exportStatusSpan) return;
  filterStartDateInput.value = "";
  filterEndDateInput.value = "";
  currentFilter.startDate = null;
  currentFilter.endDate = null;
  renderEntries();
  showStatusMessage(exportStatusSpan, "Filter reset.", "success", 1500);
};

const handleExportCsv = () => {
  if (!exportStatusSpan) return;
  let filteredEntries = entries;
  if (currentFilter.startDate) {
    filteredEntries = filteredEntries.filter(e => e.date >= currentFilter.startDate);
  }
  if (currentFilter.endDate) {
    filteredEntries = filteredEntries.filter(e => e.date <= currentFilter.endDate);
  }

  if (filteredEntries.length === 0) {
    showStatusMessage(exportStatusSpan, "No entries selected to export.", "error");
    return;
  }

  filteredEntries.sort((a, b) => {
    const dateComparison = b.date.localeCompare(a.date);
    if (dateComparison !== 0) return dateComparison;
    return b.startTime.localeCompare(a.startTime);
  });

  const rate = settings.hourlyRate;
  let csvContent = "Date,Start Time,End Time,Duration (Hours),Description,Pay ($)\n";

  filteredEntries.forEach((entry) => {
    const duration = calculateDuration(entry.startTime, entry.endTime);
    const pay = duration * rate;
    const escapedDesc = entry.description ? `"${entry.description.replace(/"/g, '""')}"` : "";
    csvContent += `${entry.date},${entry.startTime},${entry.endTime},${duration.toFixed(3)},${escapedDesc},${pay.toFixed(2)}\n`;
  });

  try {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);

    let filename = "work_hours_export.csv";
    const today = new Date().toISOString().split("T")[0];
    const start = currentFilter.startDate || "all";
    const end = currentFilter.endDate || today;
    if (start !== "all" || end !== today) {
        const actualStart = currentFilter.startDate || "beginning";
        const actualEnd = currentFilter.endDate || new Date().toISOString().split("T")[0];
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
    showStatusMessage(exportStatusSpan, "CSV export failed. See console for details.", "error");
  }
};

const setupApplication = () => {
  clearForm();
  loadSettings();
  loadEntries();

  if (saveSettingsBtn) saveSettingsBtn.addEventListener("click", handleSaveSettings);
  if (addEntryBtn) addEntryBtn.addEventListener("click", () => handleAddOrUpdateEntry(false));
  if (updateEntryBtn) updateEntryBtn.addEventListener("click", () => handleAddOrUpdateEntry(true));
  if (cancelEditBtn) cancelEditBtn.addEventListener("click", clearForm);
  if (entriesTbody) entriesTbody.addEventListener("click", handleTableActions);
  if (filterBtn) filterBtn.addEventListener("click", handleFilter);
  if (resetFilterBtn) resetFilterBtn.addEventListener("click", handleResetFilter);
  if (exportCsvBtn) exportCsvBtn.addEventListener("click", handleExportCsv);
};

// Start the application once the DOM is fully loaded
setupApplication();