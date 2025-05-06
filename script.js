// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// Import Realtime Database functions
import {
  getDatabase,
  ref,
  set,
  onValue,
  push,
  remove,
  update, // Added for specific updates if needed
  // get, // Use 'get' for one-time reads if not using onValue
} from "firebase/database";

// Your web app's Firebase configuration (from your original file)
const firebaseConfig = {
  apiKey: "AIzaSyDqusLzhEc3GvFElGRdi6mjxtxhLuInYrA", // IMPORTANT: Keep your actual API key secure
  authDomain: "grind-time-747f4.firebaseapp.com",
  projectId: "grind-time-747f4",
  storageBucket: "grind-time-747f4.firebasestorage.app",
  messagingSenderId: "406101223329",
  appId: "1:406101223329:web:bca312115c3b61181dcde0",
  measurementId: "G-1ZE97D6KCC",
  // Add your databaseURL here if it's not automatically inferred (usually it is for v9+)
  // databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app); // Initialize Realtime Database

// ---=== Firebase Path References ===---
// TODO: If implementing user authentication, replace these with user-specific paths
// e.g., const userId = firebase.auth().currentUser.uid;
// const SETTINGS_PATH = `users/${userId}/settings`;
// const ENTRIES_PATH = `users/${userId}/entries`;
const SETTINGS_PATH = "settings";
const ENTRIES_PATH = "entries";


document.addEventListener("DOMContentLoaded", () => {
  // ---=== DOM Elements ===---
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

  // ---=== State Variables ===---
  let entries = []; // This will now be populated from Firebase
  let settings = { hourlyRate: 20.0 }; // Default, will be overwritten by Firebase
  let currentFilter = { startDate: null, endDate: null };
  let statusTimeout = null;

  // ---=== Helper Functions (mostly unchanged) ===---
  // generateId is no longer needed as Firebase provides unique keys for pushed items.

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
        diffMs += 24 * 60 * 60 * 1000;
      }
      return diffMs / (1000 * 60 * 60);
    } catch (e) {
      console.error("Error calculating duration:", e);
      return 0;
    }
  };

  // ---=== Firebase Data Functions ===---

  // Load settings from Firebase
  const loadSettings = () => {
    const settingsRef = ref(database, SETTINGS_PATH);
    onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        settings = data;
        settings.hourlyRate = parseFloat(settings.hourlyRate) || 20.0;
      } else {
        // Initialize settings in Firebase if they don't exist
        saveSettingsToFirebase(settings)
            .then(() => console.log("Default settings saved to Firebase."))
            .catch(err => console.error("Error saving default settings:", err));
      }
      hourlyRateInput.value = settings.hourlyRate.toFixed(2);
      renderEntries(); // Re-render if rate affects display immediately
    }, (error) => {
      console.error("Error loading settings from Firebase:", error);
      showStatusMessage(settingsStatusSpan, "Error loading settings.", "error", 5000);
    });
  };

  // Save settings to Firebase
  const saveSettingsToFirebase = async (newSettings) => {
    const settingsRef = ref(database, SETTINGS_PATH);
    try {
      await set(settingsRef, newSettings);
      // settings global variable will be updated by the onValue listener
    } catch (error) {
      console.error("Error saving settings to Firebase:", error);
      throw error; // Re-throw to be caught by caller
    }
  };

  // Load entries from Firebase
  const loadEntries = () => {
    const entriesDbRef = ref(database, ENTRIES_PATH);
    onValue(entriesDbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Firebase returns an object with unique keys. Convert to an array.
        entries = Object.keys(data).map(key => ({
          id: key, // Store Firebase key as 'id'
          ...data[key]
        }));
      } else {
        entries = [];
      }
      renderEntries();
    }, (error) => {
      console.error("Error loading entries from Firebase:", error);
      showStatusMessage(entryStatusSpan, "Error loading entries.", "error", 5000);
    });
  };

  // ---=== Core Logic Functions (Modified for Firebase) ===---

  const renderEntries = () => {
    entriesTbody.innerHTML = "";
    let filteredEntries = entries; // Assumes 'entries' array is up-to-date from Firebase
    const rate = settings.hourlyRate;

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
    editEntryIdInput.value = "";
    entryDateInput.value = new Date().toISOString().split("T")[0];
    startTimeInput.value = "";
    endTimeInput.value = "";
    descriptionInput.value = "";
    addEntryBtn.hidden = false;
    updateEntryBtn.hidden = true;
    cancelEditBtn.hidden = true;
  };

  const setupEditForm = (entry) => {
    editEntryIdInput.value = entry.id; // Firebase key
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

  // ---=== Event Handlers (Modified for Firebase) ===---
  const handleSaveSettings = async () => {
    const rateValue = parseFloat(hourlyRateInput.value);
    if (isNaN(rateValue) || rateValue < 0) {
      showStatusMessage(settingsStatusSpan, "Invalid rate. Please enter a positive number.", "error");
      hourlyRateInput.focus();
      return;
    }
    const newSettings = { hourlyRate: rateValue };
    try {
      await saveSettingsToFirebase(newSettings);
      // The onValue listener for settings will update the UI and 'settings' variable
      showStatusMessage(settingsStatusSpan, `Rate saved: $${rateValue.toFixed(2)}`);
    } catch (error) {
      showStatusMessage(settingsStatusSpan, "Error saving rate.", "error");
    }
  };

  const handleAddOrUpdateEntry = async (isUpdate = false) => {
    const entryId = editEntryIdInput.value; // Will be empty if adding, or Firebase key if updating
    const date = entryDateInput.value;
    const start = startTimeInput.value;
    const end = endTimeInput.value;
    const description = descriptionInput.value.trim();

    if (!date || !start || !end) {
      showStatusMessage(entryStatusSpan, "Date, Start Time, and End Time are required.", "error");
      return;
    }

    const duration = calculateDuration(start, end);
    if (start && end && start >= end) {
      if (!confirm("End time is earlier than or the same as start time. Is this an overnight shift?")) {
        showStatusMessage(entryStatusSpan, "Entry cancelled.", "error");
        return;
      }
    }
    if (duration <= 0 && start < end) {
      showStatusMessage(entryStatusSpan, "Invalid time range selected.", "error");
      return;
    }

    const entryData = { date, startTime: start, endTime: end, description };

    try {
      if (isUpdate && entryId) {
        const entryRef = ref(database, `${ENTRIES_PATH}/${entryId}`);
        await set(entryRef, entryData); // Use set to overwrite, or update for partial updates
        showStatusMessage(entryStatusSpan, "Entry updated successfully.", "success");
      } else {
        const entriesListRef = ref(database, ENTRIES_PATH);
        await push(entriesListRef, entryData); // push generates a unique ID
        showStatusMessage(entryStatusSpan, "Entry added successfully.", "success");
      }
      // The onValue listener for entries will update the UI and 'entries' array
      clearForm();
    } catch (error) {
      console.error("Error saving entry to Firebase:", error);
      showStatusMessage(entryStatusSpan, "Error saving entry.", "error");
    }
  };

  const handleTableActions = async (event) => {
    const target = event.target;
    const entryId = target.dataset.id; // This is the Firebase key

    if (!entryId) return;

    if (target.classList.contains("edit-btn")) {
      const entryToEdit = entries.find(e => e.id === entryId);
      if (entryToEdit) {
        setupEditForm(entryToEdit);
      }
    } else if (target.classList.contains("delete-btn")) {
      if (confirm("Are you sure you want to delete this entry?")) {
        try {
          const entryRef = ref(database, `${ENTRIES_PATH}/${entryId}`);
          await remove(entryRef);
          showStatusMessage(entryStatusSpan, "Entry deleted.", "success");
          // The onValue listener will update the table.
          // If the deleted entry was being edited, clear the form.
          if (editEntryIdInput.value === entryId) {
            clearForm();
          }
        } catch (error) {
          console.error("Error deleting entry from Firebase:", error);
          showStatusMessage(entryStatusSpan, "Error deleting entry.", "error");
        }
      }
    }
  };

  // Filter and Export functions remain largely the same as they operate on the local 'entries' array,
  // which is now kept in sync by Firebase's onValue listener.

  const handleFilter = () => {
    if (filterStartDateInput.value && filterEndDateInput.value && filterEndDateInput.value < filterStartDateInput.value) {
      showStatusMessage(exportStatusSpan, "Filter 'To' date cannot be before 'From' date.", "error");
      return;
    }
    currentFilter.startDate = filterStartDateInput.value || null;
    currentFilter.endDate = filterEndDateInput.value || null;
    renderEntries(); // Re-render with the new filter
    showStatusMessage(exportStatusSpan, "Filter applied.", "success", 1500);
  };

  const handleResetFilter = () => {
    filterStartDateInput.value = "";
    filterEndDateInput.value = "";
    currentFilter.startDate = null;
    currentFilter.endDate = null;
    renderEntries();
    showStatusMessage(exportStatusSpan, "Filter reset.", "success", 1500);
  };

  const handleExportCsv = () => {
    let currentEntriesToExport = entries; // Use the current state of 'entries'
    if (currentFilter.startDate) {
        currentEntriesToExport = currentEntriesToExport.filter(e => e.date >= currentFilter.startDate);
    }
    if (currentFilter.endDate) {
        currentEntriesToExport = currentEntriesToExport.filter(e => e.date <= currentFilter.endDate);
    }

    if (currentEntriesToExport.length === 0) {
      showStatusMessage(exportStatusSpan, "No entries selected to export.", "error");
      return;
    }

    currentEntriesToExport.sort((a, b) => {
      const dateComparison = b.date.localeCompare(a.date);
      if (dateComparison !== 0) return dateComparison;
      return b.startTime.localeCompare(a.startTime);
    });

    const rate = settings.hourlyRate;
    let csvContent = "Date,Start Time,End Time,Duration (Hours),Description,Pay ($)\n";

    currentEntriesToExport.forEach((entry) => {
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
        filename = `work_hours_${start}_to_${end}.csv`;
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

  // ---=== Initialization ===---
  const initializeLocalApp = () => {
    // Load initial data from Firebase and set up listeners
    loadSettings();
    loadEntries();

    clearForm(); // Set default date and button states

    // Event Listeners (mostly unchanged, but actions now trigger Firebase operations)
    saveSettingsBtn.addEventListener("click", handleSaveSettings);
    addEntryBtn.addEventListener("click", () => handleAddOrUpdateEntry(false));
    updateEntryBtn.addEventListener("click", () => handleAddOrUpdateEntry(true));
    cancelEditBtn.addEventListener("click", clearForm);
    entriesTbody.addEventListener("click", handleTableActions);
    filterBtn.addEventListener("click", handleFilter);
    resetFilterBtn.addEventListener("click", handleResetFilter);
    exportCsvBtn.addEventListener("click", handleExportCsv);
  };

  // Start the application
  initializeLocalApp();
});