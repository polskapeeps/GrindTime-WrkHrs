// script.js (Root Version - Updated for Email/Password Auth)

// --- Firebase SDK Imports ---
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-analytics.js'; // Optional
import {
  getDatabase,
  ref,
  set,
  onValue,
  push,
  remove,
} from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-database.js';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword, // For Sign Up
  signInWithEmailAndPassword, // For Sign In
  signOut, // For Sign Out
  // signInAnonymously, // We are replacing this
} from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: 'AIzaSyDqusLzhEc3GvFElGRdi6mjxtxhLuInYrA', // Replace with your actual API key if this is a placeholder
  authDomain: 'grind-time-747f4.firebaseapp.com',
  databaseURL: 'https://grind-time-747f4-default-rtdb.firebaseio.com',
  projectId: 'grind-time-747f4',
  storageBucket: 'grind-time-747f4.firebasestorage.app',
  messagingSenderId: '406101223329',
  appId: '1:406101223329:web:bca312115c3b61181dcde0',
  measurementId: 'G-1ZE97D6KCC',
};

// --- Initialize Firebase Services ---
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // Optional
const database = getDatabase(app);
const auth = getAuth(app);

// --- State variable for current user UID ---
let currentUID = null;

// --- DOM Elements ---
// Auth Elements
const authSection = document.getElementById('authSection');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const signInBtn = document.getElementById('signInBtn');
const signUpBtn = document.getElementById('signUpBtn');
const signOutBtn = document.getElementById('signOutBtn');
const authStatusSpan = document.getElementById('authStatus');
const userStatusArea = document.getElementById('userStatusArea');
const userEmailDisplay = document.getElementById('userEmailDisplay');

// Main App Content Element
const mainAppContent = document.getElementById('mainAppContent');

// Existing DOM Elements
const hourlyRateInput = document.getElementById('hourlyRate');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const settingsStatusSpan = document.getElementById('settingsStatus');
const entryFormCard = document.getElementById('entryFormCard'); // Already have this
const entryDateInput = document.getElementById('entryDate');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
const descriptionInput = document.getElementById('description');
const addEntryBtn = document.getElementById('addEntryBtn');
const updateEntryBtn = document.getElementById('updateEntryBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editEntryIdInput = document.getElementById('editEntryId');
const entryStatusSpan = document.getElementById('entryStatus');
const entriesTbody = document.getElementById('entriesTbody');
const noEntriesMessage = document.getElementById('noEntriesMessage');
const filterStartDateInput = document.getElementById('filterStartDate');
const filterEndDateInput = document.getElementById('filterEndDate');
const filterBtn = document.getElementById('filterBtn');
const resetFilterBtn = document.getElementById('resetFilterBtn');
const totalHoursFilteredSpan = document.getElementById('totalHoursFiltered');
const totalPayFilteredSpan = document.getElementById('totalPayFiltered');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportStatusSpan = document.getElementById('exportStatus');

// --- State Variables ---
let entries = [];
let settings = { hourlyRate: 20.0 }; // Default rate
let currentFilter = { startDate: null, endDate: null };
let statusTimeout = null;

// --- UI Update Functions ---
const showAuthUI = () => {
  if (authSection) authSection.style.display = 'block';
  if (mainAppContent) mainAppContent.style.display = 'none';
  if (userStatusArea) userStatusArea.style.display = 'none';
};

const showAppUI = (userEmail) => {
  if (authSection) authSection.style.display = 'none';
  if (mainAppContent) mainAppContent.style.display = 'block';
  if (userStatusArea) userStatusArea.style.display = 'block';
  if (userEmailDisplay && userEmail) userEmailDisplay.textContent = userEmail;
};

const clearDataAndUI = () => {
  entries = [];
  settings = { hourlyRate: 20.0 }; // Reset to default
  if (hourlyRateInput) hourlyRateInput.value = settings.hourlyRate.toFixed(2);
  if (entriesTbody) entriesTbody.innerHTML = '';
  if (noEntriesMessage) noEntriesMessage.hidden = true;
  if (totalHoursFilteredSpan) totalHoursFilteredSpan.textContent = '0.00';
  if (totalPayFilteredSpan) totalPayFilteredSpan.textContent = '0.00';
  clearForm();
};

// --- Helper Functions (formatDate, showStatusMessage, calculateDuration -UNCHANGED) ---
const formatDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  return dateObj.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
};

const showStatusMessage = (
  element,
  message,
  type = 'success',
  duration = 3000
) => {
  if (!element) return;
  clearTimeout(statusTimeout); // Use the global statusTimeout
  element.textContent = message;
  element.className = `status-message ${type} show`;
  statusTimeout = setTimeout(() => {
    element.classList.remove('show');
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
      // Assuming overnight if end time is earlier or same on same day
      diffMs += 24 * 60 * 60 * 1000;
    }
    return diffMs / (1000 * 60 * 60);
  } catch (e) {
    console.error('Error calculating duration:', e);
    return 0;
  }
};

// --- Firebase Data Functions (loadSettings, saveSettingsToFirebase, loadEntries - UNCHANGED but called conditionally) ---
const loadSettings = () => {
  if (!currentUID) {
    console.log(
      'loadSettings: No currentUID. Settings will use defaults or be empty.'
    );
    settings = { hourlyRate: 20.0 };
    if (hourlyRateInput) hourlyRateInput.value = settings.hourlyRate.toFixed(2);
    renderEntries();
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
        if (hourlyRateInput)
          hourlyRateInput.value = settings.hourlyRate.toFixed(2);
      } else {
        saveSettingsToFirebase({ hourlyRate: settings.hourlyRate }) // Save current (possibly default) rate
          .then(() =>
            console.log('Default/Initial settings saved for user:', currentUID)
          )
          .catch((err) => console.error('Error saving default settings:', err));
      }
      renderEntries();
    },
    (error) => {
      console.error('Error loading settings from Firebase:', error);
      showStatusMessage(
        settingsStatusSpan,
        'Error loading settings.',
        'error',
        5000
      );
    }
  );
};

const saveSettingsToFirebase = async (newSettingsToSave) => {
  if (!currentUID) {
    showStatusMessage(
      settingsStatusSpan,
      'Not signed in. Cannot save settings.',
      'error'
    );
    return Promise.reject('Not authenticated to save settings.');
  }
  const settingsRef = ref(database, `users/${currentUID}/settings`);
  try {
    await set(settingsRef, newSettingsToSave);
    settings = newSettingsToSave;
    showStatusMessage(
      settingsStatusSpan,
      `Rate saved: $${newSettingsToSave.hourlyRate.toFixed(2)}`
    );
  } catch (error) {
    console.error('Error saving settings to Firebase:', error);
    showStatusMessage(settingsStatusSpan, 'Error saving rate.', 'error');
    throw error;
  }
};

const loadEntries = () => {
  if (!currentUID) {
    console.log('loadEntries: No currentUID. Entries will be empty.');
    entries = [];
    renderEntries();
    return;
  }
  const entriesDbRef = ref(database, `users/${currentUID}/entries`);
  onValue(
    entriesDbRef,
    (snapshot) => {
      const data = snapshot.val();
      entries = data
        ? Object.keys(data).map((key) => ({ id: key, ...data[key] }))
        : [];
      renderEntries();
    },
    (error) => {
      console.error('Error loading entries from Firebase:', error);
      showStatusMessage(
        entryStatusSpan,
        'Error loading entries.',
        'error',
        5000
      );
    }
  );
};

// --- Core Logic Functions (renderEntries, clearForm, setupEditForm - UNCHANGED) ---
const renderEntries = () => {
  if (!entriesTbody) return;
  entriesTbody.innerHTML = '';
  let filteredEntries = entries;
  const rate = parseFloat(settings.hourlyRate) || 0;

  if (
    currentFilter.startDate &&
    filterStartDateInput &&
    filterStartDateInput.value
  ) {
    filteredEntries = filteredEntries.filter(
      (e) => e.date >= currentFilter.startDate
    );
  }
  if (currentFilter.endDate && filterEndDateInput && filterEndDateInput.value) {
    filteredEntries = filteredEntries.filter(
      (e) => e.date <= currentFilter.endDate
    );
  }

  filteredEntries.sort((a, b) => {
    const dateComparison = b.date.localeCompare(a.date);
    if (dateComparison !== 0) return dateComparison;
    return b.startTime.localeCompare(a.startTime); // Sort by start time if dates are same
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
      const tr = document.createElement('tr');
      tr.dataset.id = entry.id;
      tr.innerHTML = `
        <td>${formatDate(entry.date)}</td>
        <td>${entry.startTime}</td>
        <td>${entry.endTime}</td>
        <td>${duration.toFixed(2)}</td>
        <td><span class="description" title="${entry.description || ''}">${
        entry.description || '-'
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
  if (editEntryIdInput) editEntryIdInput.value = '';
  if (entryDateInput)
    entryDateInput.value = new Date().toISOString().split('T')[0];
  if (startTimeInput) startTimeInput.value = '';
  if (endTimeInput) endTimeInput.value = '';
  if (descriptionInput) descriptionInput.value = '';
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
  if (descriptionInput) descriptionInput.value = entry.description || '';
  if (addEntryBtn) addEntryBtn.hidden = true;
  if (updateEntryBtn) updateEntryBtn.hidden = false;
  if (cancelEditBtn) cancelEditBtn.hidden = false;
  if (entryFormCard)
    entryFormCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (entryDateInput) entryDateInput.focus();
};

// --- Event Handlers (handleAddOrUpdateEntry, handleTableActions, etc. - UNCHANGED logic, ensure currentUID check) ---
const handleSaveSettings = async () => {
  if (!currentUID) {
    showStatusMessage(
      settingsStatusSpan,
      'Please sign in to save settings.',
      'error'
    );
    return;
  }
  const rateValue = parseFloat(hourlyRateInput.value);
  if (isNaN(rateValue) || rateValue < 0) {
    showStatusMessage(
      settingsStatusSpan,
      'Invalid rate. Please enter a positive number.',
      'error'
    );
    if (hourlyRateInput) hourlyRateInput.focus();
    return;
  }
  await saveSettingsToFirebase({ hourlyRate: rateValue });
};

const handleAddOrUpdateEntry = async (isUpdate = false) => {
  if (!currentUID) {
    showStatusMessage(
      entryStatusSpan,
      'Please sign in to add or update entries.',
      'error'
    );
    return;
  }
  const entryId = editEntryIdInput ? editEntryIdInput.value : null;
  const date = entryDateInput ? entryDateInput.value : null;
  const start = startTimeInput ? startTimeInput.value : null;
  const end = endTimeInput ? endTimeInput.value : null;
  const description = descriptionInput ? descriptionInput.value.trim() : '';

  if (!date || !start || !end) {
    showStatusMessage(
      entryStatusSpan,
      'Date, Start Time, and End Time are required.',
      'error'
    );
    return;
  }
  const duration = calculateDuration(start, end);
  if (start && end && start > end && duration < 12) {
    // Check for potential overnight, but still allow if duration is reasonable (e.g., < 12h)
    if (
      !confirm(
        'End time is earlier than start time. Is this an overnight shift?'
      )
    ) {
      showStatusMessage(entryStatusSpan, 'Entry cancelled.', 'error');
      return;
    }
  } else if (start === end) {
    showStatusMessage(
      entryStatusSpan,
      'Start and End times cannot be the same.',
      'error'
    );
    return;
  }
  // Duration check was a bit problematic before, calculateDuration handles overnight by adding 24h.
  // So a positive duration is generally okay.
  // Let's refine the "invalid time range" check. It's mostly covered if duration is correctly calculated.

  const entryData = { date, startTime: start, endTime: end, description };

  try {
    if (isUpdate && entryId) {
      const entryRef = ref(database, `users/${currentUID}/entries/${entryId}`);
      await set(entryRef, entryData);
      showStatusMessage(
        entryStatusSpan,
        'Entry updated successfully.',
        'success'
      );
    } else {
      const entriesListRef = ref(database, `users/${currentUID}/entries`);
      await push(entriesListRef, entryData);
      showStatusMessage(
        entryStatusSpan,
        'Entry added successfully.',
        'success'
      );
    }
    clearForm();
  } catch (error) {
    console.error('Error saving entry to Firebase:', error);
    showStatusMessage(entryStatusSpan, 'Error saving entry.', 'error');
  }
};

const handleTableActions = async (event) => {
  if (!currentUID) return; // Should not happen if UI is managed correctly
  const target = event.target;
  const entryId = target.dataset.id;
  if (!entryId) return;

  if (target.classList.contains('edit-btn')) {
    const entryToEdit = entries.find((e) => e.id === entryId);
    if (entryToEdit) setupEditForm(entryToEdit);
  } else if (target.classList.contains('delete-btn')) {
    if (confirm('Are you sure you want to delete this entry?')) {
      try {
        const entryRef = ref(
          database,
          `users/${currentUID}/entries/${entryId}`
        );
        await remove(entryRef);
        showStatusMessage(entryStatusSpan, 'Entry deleted.', 'success');
        if (editEntryIdInput && editEntryIdInput.value === entryId) clearForm();
      } catch (error) {
        console.error('Error deleting entry from Firebase:', error);
        showStatusMessage(entryStatusSpan, 'Error deleting entry.', 'error');
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
      'error'
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
  showStatusMessage(exportStatusSpan, 'Filter applied.', 'success', 1500);
};

const handleResetFilter = () => {
  if (filterStartDateInput) filterStartDateInput.value = '';
  if (filterEndDateInput) filterEndDateInput.value = '';
  currentFilter.startDate = null;
  currentFilter.endDate = null;
  renderEntries();
  showStatusMessage(exportStatusSpan, 'Filter reset.', 'success', 1500);
};

const handleExportCsv = () => {
  let csvExportEntries = [...entries];
  if (currentFilter.startDate) {
    csvExportEntries = csvExportEntries.filter(
      (e) => e.date >= currentFilter.startDate
    );
  }
  if (currentFilter.endDate) {
    csvExportEntries = csvExportEntries.filter(
      (e) => e.date <= currentFilter.endDate
    );
  }

  if (csvExportEntries.length === 0) {
    showStatusMessage(
      exportStatusSpan,
      'No entries selected to export.',
      'error'
    );
    return;
  }
  csvExportEntries.sort((a, b) => {
    const dateComparison = b.date.localeCompare(a.date);
    if (dateComparison !== 0) return dateComparison;
    return b.startTime.localeCompare(a.startTime);
  });

  const rate = settings.hourlyRate;
  let csvContent =
    'Date,Start Time,End Time,Duration (Hours),Description,Pay ($)\n';
  csvExportEntries.forEach((entry) => {
    const duration = calculateDuration(entry.startTime, entry.endTime);
    const pay = duration * rate;
    const escapedDesc = entry.description
      ? `"${entry.description.replace(/"/g, '""')}"`
      : '';
    csvContent += `${entry.date},${entry.startTime},${
      entry.endTime
    },${duration.toFixed(3)},${escapedDesc},${pay.toFixed(2)}\n`;
  });
  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    let filename = 'work_hours_export.csv';
    const today = new Date().toISOString().split('T')[0];
    const start = currentFilter.startDate || 'all';
    const end = currentFilter.endDate || today;
    if (start !== 'all' || end !== today) {
      const actualStart = currentFilter.startDate || 'beginning';
      const actualEnd =
        currentFilter.endDate || new Date().toISOString().split('T')[0];
      filename = `work_hours_${actualStart}_to_${actualEnd}.csv`;
    }
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Important to release the object URL
    showStatusMessage(exportStatusSpan, 'CSV export generated.', 'success');
  } catch (e) {
    console.error('CSV Export failed:', e);
    showStatusMessage(
      exportStatusSpan,
      'CSV export failed. See console.',
      'error'
    );
  }
};

// --- NEW Authentication Event Handlers ---
const handleSignUp = async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  if (!email || !password) {
    showStatusMessage(
      authStatusSpan,
      'Email and password are required.',
      'error'
    );
    return;
  }
  if (password.length < 6) {
    showStatusMessage(
      authStatusSpan,
      'Password should be at least 6 characters.',
      'error'
    );
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle the rest (UI update, data loading)
    showStatusMessage(
      authStatusSpan,
      'Sign up successful! You are now logged in.',
      'success'
    );
    // Clear password field after successful signup attempt
    if (passwordInput) passwordInput.value = '';
  } catch (error) {
    console.error('Sign up error:', error);
    showStatusMessage(
      authStatusSpan,
      `Sign up failed: ${error.message}`,
      'error',
      5000
    );
  }
};

const handleSignIn = async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  if (!email || !password) {
    showStatusMessage(
      authStatusSpan,
      'Email and password are required.',
      'error'
    );
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle the rest
    showStatusMessage(authStatusSpan, 'Sign in successful!', 'success');
    // Clear password field after successful sign in attempt
    if (passwordInput) passwordInput.value = '';
  } catch (error) {
    console.error('Sign in error:', error);
    showStatusMessage(
      authStatusSpan,
      `Sign in failed: ${error.message}`,
      'error',
      5000
    );
  }
};

const handleSignOut = async () => {
  try {
    await signOut(auth);
    // onAuthStateChanged will handle UI changes and data clearing
    showStatusMessage(authStatusSpan, 'You have been signed out.', 'success');
    // Clear email/password fields on sign out
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
  } catch (error) {
    console.error('Sign out error:', error);
    showStatusMessage(
      authStatusSpan,
      `Sign out failed: ${error.message}`,
      'error',
      5000
    );
  }
};

// --- MODIFIED Authentication State Handling ---
const handleAuthState = (user) => {
  if (user) {
    // User is signed in (no longer anonymous by default here)
    currentUID = user.uid;
    console.log('Authenticated with UID:', currentUID, 'Email:', user.email);
    showAppUI(user.email); // Show main app, hide auth form, display user email
    loadSettings();
    loadEntries();
  } else {
    // User is signed out
    currentUID = null;
    console.log('User signed out or no user.');
    clearDataAndUI(); // Clear any existing user data from the UI
    showAuthUI(); // Show auth form, hide main app
  }
};

// --- Application Setup ---
const setupApplication = () => {
  // Initial UI state: show auth, hide app (will be updated by onAuthStateChanged)
  showAuthUI();
  clearForm(); // Initial clear and default date for the entry form

  // Attach Event Listeners
  if (saveSettingsBtn)
    saveSettingsBtn.addEventListener('click', handleSaveSettings);
  if (addEntryBtn)
    addEntryBtn.addEventListener('click', () => handleAddOrUpdateEntry(false));
  if (updateEntryBtn)
    updateEntryBtn.addEventListener('click', () =>
      handleAddOrUpdateEntry(true)
    );
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', clearForm);
  if (entriesTbody) entriesTbody.addEventListener('click', handleTableActions);
  if (filterBtn) filterBtn.addEventListener('click', handleFilter);
  if (resetFilterBtn)
    resetFilterBtn.addEventListener('click', handleResetFilter);
  if (exportCsvBtn) exportCsvBtn.addEventListener('click', handleExportCsv);

  // Auth Event Listeners
  if (signUpBtn) signUpBtn.addEventListener('click', handleSignUp);
  if (signInBtn) signInBtn.addEventListener('click', handleSignIn);
  if (signOutBtn) signOutBtn.addEventListener('click', handleSignOut);

  // Listen for auth state changes - This is crucial.
  onAuthStateChanged(auth, handleAuthState);
};

// --- Initialize App on DOM Ready ---
document.addEventListener('DOMContentLoaded', setupApplication);
