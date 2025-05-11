// script.js (Root version - Updated for Anonymous Auth & User-Specific Data)

// --- Firebase SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-analytics.js"; // Optional
import {
  getDatabase,
  ref,
  set,
  onValue,
  push,
  remove,
  // update, // 'update' wasn't explicitly used in your original data functions, set can overwrite
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-database.js";
// ---> ADD THESE AUTH IMPORTS FOR ANONYMOUS SIGN-IN <---
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";

// --- APP CHECK IMPORT (add this after basic functionality is working and configured in Firebase console) ---
// import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-app-check.js';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDqusLzhEc3GvFElGRdi6mjxtxhLuInYrA",
  authDomain: "grind-time-747f4.firebaseapp.com",
  databaseURL: "https://grind-time-747f4-default-rtdb.firebaseio.com",
  projectId: "grind-time-747f4",
  storageBucket: "grind-time-747f4.firebasestorage.app",
  messagingSenderId: "406101223329",
  appId: "1:406101223329:web:bca312115c3b61181dcde0",
  measurementId: "G-1ZE97D6KCC",
};

// --- Initialize Firebase Services ---
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // Optional
const database = getDatabase(app);
const auth = getAuth(app); // Initialize Auth

// --- APP CHECK INITIALIZATION (add when ready) ---
// const appCheck = initializeAppCheck(app, {
//   provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_V3_SITE_KEY_HERE'),
//   isTokenAutoRefreshEnabled: true
// });

// --- State variable for current user UID ---
let currentUID = null;

// --- DOM Elements ---
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

// --- State Variables ---
let entries = [];
let settings = { hourlyRate: 20.0 }; // Default rate
let currentFilter = { startDate: null, endDate: null };
let statusTimeout = null;

// --- Helper Functions ---
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

// --- Firebase Data Functions (Now use currentUID) ---
const loadSettings = () => {
  if (!currentUID) {
    console.log("loadSettings: No currentUID, cannot load settings.");
    // Optionally reset UI if needed, or wait for auth state
    settings = { hourlyRate: 20.0 }; // Reset local settings object
    hourlyRateInput.value = settings.hourlyRate.toFixed(2);
    renderEntries(); // Re-render as rate might affect displayed pay
    return;
  }
  const settingsRef = ref(database, `users/${currentUID}/settings`);
  onValue(
    settingsRef,
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        settings = data;
        settings.hourlyRate = parseFloat(settings.hourlyRate) || 20.0;
        hourlyRateInput.value = settings.hourlyRate.toFixed(2);
      } else {
        // Initialize settings in Firebase for this new anonymous user
        saveSettingsToFirebase(settings) // Save the default settings object
          .then(() =>
            console.log(
              "Default settings saved to Firebase for user:",
              currentUID
            )
          )
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

const saveSettingsToFirebase = async (newSettingsToSave) => {
  if (!currentUID) return Promise.reject("Not authenticated to save settings.");
  const settingsRef = ref(database, `users/${currentUID}/settings`);
  try {
    await set(settingsRef, newSettingsToSave); // Use the passed settings
    settings = newSettingsToSave; // Update global settings state
    return true;
  } catch (error) {
    console.error("Error saving settings to Firebase:", error);
    throw error; // Re-throw to be caught by caller if needed
  }
};

const loadEntries = () => {
  if (!currentUID) {
    console.log("loadEntries: No currentUID, cannot load entries.");
    entries = []; // Clear local entries array
    renderEntries(); // Update UI
    return;
  }
  const entriesDbRef = ref(database, `users/${currentUID}/entries`);
  onValue(
    entriesDbRef,
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        entries = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
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

// --- Core Logic Functions ---
const renderEntries = () => {
  if (!entriesTbody) return; // Guard clause if element not found
  entriesTbody.innerHTML = "";
  let filteredEntries = entries; // Use the global entries array
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
    return b.startTime.localeCompare(a.startTime);
  });

  let totalHours = 0;
  let totalPay = 0;

  if (filteredEntries.length === 0) {
    if (noEntriesMessage) noEntriesMessage.hidden = false;
  } else {
    if (noEntriesMessage) noEntriesMessage.hidden = true;
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

  if (totalHoursFilteredSpan)
    totalHoursFilteredSpan.textContent = totalHours.toFixed(2);
  if (totalPayFilteredSpan)
    totalPayFilteredSpan.textContent = totalPay.toFixed(2);
};

const clearForm = () => {
  if (editEntryIdInput) editEntryIdInput.value = "";
  if (entryDateInput)
    entryDateInput.value = new Date().toISOString().split("T")[0];
  if (startTimeInput) startTimeInput.value = "";
  if (endTimeInput) endTimeInput.value = "";
  if (descriptionInput) descriptionInput.value = "";
  if (addEntryBtn) addEntryBtn.hidden = false;
  if (updateEntryBtn) updateEntryBtn.hidden = true;
  if (cancelEditBtn) cancelEditBtn.hidden = true;
};

const setupEditForm = (entry) => {
  if (!entry) return;
  if (editEntryIdInput) editEntryIdInput.value = entry.id;
  if (entryDateInput) entryDateInput.value = entry.date;
  if (startTimeInput) startTimeInput.value = entry.startTime;
  if (endTimeInput) endTimeInput.value = entry.endTime;
  if (descriptionInput) descriptionInput.value = entry.description || "";
  if (addEntryBtn) addEntryBtn.hidden = true;
  if (updateEntryBtn) updateEntryBtn.hidden = false;
  if (cancelEditBtn) cancelEditBtn.hidden = false;
  if (entryFormCard)
    entryFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
  if (entryDateInput) entryDateInput.focus();
};

// --- Event Handlers ---
const handleSaveSettings = async () => {
  if (!currentUID) {
    showStatusMessage(
      settingsStatusSpan,
      "Please wait, authenticating...",
      "error"
    );
    return;
  }
  const rateValue = parseFloat(hourlyRateInput.value);
  if (isNaN(rateValue) || rateValue < 0) {
    showStatusMessage(
      settingsStatusSpan,
      "Invalid rate. Please enter a positive number.",
      "error"
    );
    if (hourlyRateInput) hourlyRateInput.focus();
    return;
  }
  const newSettingsToSave = { hourlyRate: rateValue };
  try {
    await saveSettingsToFirebase(newSettingsToSave);
    showStatusMessage(
      settingsStatusSpan,
      `Rate saved: $${rateValue.toFixed(2)}`
    );
  } catch (error) {
    showStatusMessage(settingsStatusSpan, "Error saving rate.", "error");
  }
};

const handleAddOrUpdateEntry = async (isUpdate = false) => {
  if (!currentUID) {
    showStatusMessage(
      entryStatusSpan,
      "Please wait, authenticating...",
      "error"
    );
    return;
  }
  const entryId = editEntryIdInput ? editEntryIdInput.value : null;
  const date = entryDateInput ? entryDateInput.value : null;
  const start = startTimeInput ? startTimeInput.value : null;
  const end = endTimeInput ? endTimeInput.value : null;
  const description = descriptionInput ? descriptionInput.value.trim() : "";

  if (!date || !start || !end) {
    showStatusMessage(
      entryStatusSpan,
      "Date, Start Time, and End Time are required.",
      "error"
    );
    return;
  }
  const duration = calculateDuration(start, end);
  if (start && end && start > end && duration < 12) {
    if (
      !confirm(
        "End time is earlier than start time. Is this an overnight shift?"
      )
    ) {
      showStatusMessage(entryStatusSpan, "Entry cancelled.", "error");
      return;
    }
  } else if (start === end) {
    showStatusMessage(
      entryStatusSpan,
      "Start and End times cannot be the same.",
      "error"
    );
    return;
  }
  if (duration <= 0 && start < end) {
    showStatusMessage(entryStatusSpan, "Invalid time range.", "error");
    return;
  }

  const entryData = { date, startTime: start, endTime: end, description };

  try {
    if (isUpdate && entryId) {
      const entryRef = ref(database, `users/${currentUID}/entries/${entryId}`);
      await set(entryRef, entryData);
      showStatusMessage(entryStatusSpan, "Entry updated.", "success");
    } else {
      const entriesListRef = ref(database, `users/${currentUID}/entries`);
      await push(entriesListRef, entryData);
      showStatusMessage(entryStatusSpan, "Entry added.", "success");
    }
    clearForm();
  } catch (error) {
    console.error("Error saving entry:", error);
    showStatusMessage(entryStatusSpan, "Error saving entry.", "error");
  }
};

const handleTableActions = async (event) => {
  if (!currentUID) return;
  const target = event.target;
  const entryId = target.dataset.id;
  if (!entryId) return;

  if (target.classList.contains("edit-btn")) {
    const entryToEdit = entries.find((e) => e.id === entryId);
    if (entryToEdit) setupEditForm(entryToEdit);
  } else if (target.classList.contains("delete-btn")) {
    if (confirm("Are you sure you want to delete this entry?")) {
      try {
        const entryRef = ref(
          database,
          `users/${currentUID}/entries/${entryId}`
        );
        await remove(entryRef);
        showStatusMessage(entryStatusSpan, "Entry deleted.", "success");
        if (editEntryIdInput && editEntryIdInput.value === entryId) clearForm();
      } catch (error) {
        console.error("Error deleting entry:", error);
        showStatusMessage(entryStatusSpan, "Error deleting entry.", "error");
      }
    }
  }
};

const handleFilter = () => {
  if (
    filterStartDateInput &&
    filterEndDateInput &&
    filterStartDateInput.value &&
    filterEndDateInput.value &&
    filterEndDateInput.value < filterStartDateInput.value
  ) {
    showStatusMessage(
      exportStatusSpan,
      "Filter 'To' date cannot be before 'From' date.",
      "error"
    );
    return;
  }
  currentFilter.startDate = filterStartDateInput
    ? filterStartDateInput.value || null
    : null;
  currentFilter.endDate = filterEndDateInput
    ? filterEndDateInput.value || null
    : null;
  renderEntries();
  showStatusMessage(exportStatusSpan, "Filter applied.", "success", 1500);
};

const handleResetFilter = () => {
  if (filterStartDateInput) filterStartDateInput.value = "";
  if (filterEndDateInput) filterEndDateInput.value = "";
  currentFilter.startDate = null;
  currentFilter.endDate = null;
  renderEntries();
  showStatusMessage(exportStatusSpan, "Filter reset.", "success", 1500);
};

const handleExportCsv = () => {
  // ... (Your existing CSV export logic should be fine as it operates on the local 'entries' array)
  // Make sure it uses the global 'entries' and 'settings' variables correctly.
  let csvEntries = entries; // Use the global 'entries' already filtered by currentUID data path
  if (currentFilter.startDate) {
    csvEntries = csvEntries.filter((e) => e.date >= currentFilter.startDate);
  }
  if (currentFilter.endDate) {
    csvEntries = csvEntries.filter((e) => e.date <= currentFilter.endDate);
  }

  if (csvEntries.length === 0) {
    showStatusMessage(exportStatusSpan, "No entries to export.", "error");
    return;
  }
  csvEntries.sort((a, b) => {
    /* ... same sort as renderEntries ... */
  });
  const rate = settings.hourlyRate;
  let csvContent =
    "Date,Start Time,End Time,Duration (Hours),Description,Pay ($)\n";
  csvEntries.forEach((entry) => {
    /* ... same CSV row generation ... */
  });
  try {
    /* ... same blob creation and download ... */
  } catch (e) {
    /* ... */
  }
};

// --- Authentication Handling ---
const handleAuthState = (user) => {
  if (user) {
    currentUID = user.uid;
    console.log("Authenticated anonymously with UID:", currentUID);
    // Data loading will now use this UID
    loadSettings();
    loadEntries();
  } else {
    currentUID = null;
    console.log(
      "User signed out or no user. Attempting to sign in anonymously."
    );
    entries = []; // Clear data if user somehow signs out
    settings = { hourlyRate: 20.0 }; // Reset settings
    renderEntries(); // Clear UI
    clearForm();
    performSignInAnonymously(); // Try to sign in again
  }
};

const performSignInAnonymously = () => {
  signInAnonymously(auth).catch((error) => {
    console.error("Anonymous sign-in error:", error.code, error.message);
    showStatusMessage(
      entryStatusSpan,
      "Cloud connection failed. Refresh to try again.",
      "error",
      7000
    );
  });
};

// --- Application Setup ---
const setupApplication = () => {
  clearForm();

  // Attach Event Listeners (make sure these elements exist in your HTML)
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

  // Listen for auth state changes
  onAuthStateChanged(auth, handleAuthState);

  // Attempt initial anonymous sign-in
  if (!auth.currentUser) {
    // Check if a user is already signed in from a previous session
    performSignInAnonymously();
  } else {
    // If already signed in (e.g. from session persistence)
    handleAuthState(auth.currentUser);
  }
};

// --- Initialize App on DOM Ready ---
document.addEventListener("DOMContentLoaded", setupApplication);
