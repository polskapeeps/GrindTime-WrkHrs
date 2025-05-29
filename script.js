// script.js (Root Version - Updated for Email/Password Auth & Week Filters)

// --- Firebase SDK Imports ---
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics'; // Optional
import {
  getDatabase,
  ref,
  set,
  onValue,
  push,
  remove,
} from 'firebase/database';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword, // For Sign Up
  signInWithEmailAndPassword, // For Sign In
  signOut, // For Sign Out
} from 'firebase/auth';

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
const authSection = document.getElementById('authSection');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const signInBtn = document.getElementById('signInBtn');
const signUpBtn = document.getElementById('signUpBtn');
const signOutBtn = document.getElementById('signOutBtn');
const authStatusSpan = document.getElementById('authStatus');
const userStatusArea = document.getElementById('userStatusArea');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const mainAppContent = document.getElementById('mainAppContent');
const hourlyRateInput = document.getElementById('hourlyRate');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const settingsStatusSpan = document.getElementById('settingsStatus');
const entryFormCard = document.getElementById('entryFormCard');
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
const prevWeekBtn = document.getElementById('prevWeekBtn'); // Added
const nextWeekBtn = document.getElementById('nextWeekBtn'); // Added

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
  if (mainAppContent) mainAppContent.style.display = 'flex';
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
  if (filterStartDateInput) filterStartDateInput.value = '';
  if (filterEndDateInput) filterEndDateInput.value = '';
  currentFilter = { startDate: null, endDate: null };
};

// --- Helper Functions ---
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
  clearTimeout(statusTimeout);
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
    if (diffMs < 0) {
      diffMs += 24 * 60 * 60 * 1000;
    }
    return diffMs / (1000 * 60 * 60);
  } catch (e) {
    console.error('Error calculating duration:', e);
    return 0;
  }
};

const formatDateToInput = (date) => {
  // Ensure date is a Date object before calling getFullYear etc.
  if (!(date instanceof Date) || isNaN(date)) {
    console.error('formatDateToInput received an invalid date:', date);
    // Fallback to today or an empty string, depending on desired behavior
    const today = new Date();
    const year = today.getUTCFullYear();
    const month = (today.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = today.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const setDefaultDateFilterToCurrentWeek = () => {
  if (!filterStartDateInput || !filterEndDateInput) {
    console.warn(
      'Filter date input elements not found. Skipping default filter.'
    );
    return;
  }
  const today = new Date(); // Use local time 'today' as the base
  const currentDay = today.getUTCDay(); // 0 (Sun) to 6 (Sat) -  Using getUTCDay for consistency in calculation

  // Create a new Date object for Monday based on UTC components of 'today'
  const monday = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  monday.setUTCDate(monday.getUTCDate() + diffToMonday);

  const sunday = new Date(
    Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate())
  );
  sunday.setUTCDate(sunday.getUTCDate() + 6);

  filterStartDateInput.value = formatDateToInput(monday);
  filterEndDateInput.value = formatDateToInput(sunday);
  handleFilter();
};

// --- Firebase Data Functions ---
const loadSettings = () => {
  if (!currentUID) {
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
      } else {
        settings = { hourlyRate: 20.0 };
        saveSettingsToFirebase(settings).catch((err) =>
          console.error('Failed to save initial settings:', err)
        );
      }
      if (hourlyRateInput)
        hourlyRateInput.value = settings.hourlyRate.toFixed(2);
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
      settings = { hourlyRate: 20.0 };
      if (hourlyRateInput)
        hourlyRateInput.value = settings.hourlyRate.toFixed(2);
      renderEntries();
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
    renderEntries();
  } catch (error) {
    console.error('Error saving settings to Firebase:', error);
    showStatusMessage(settingsStatusSpan, 'Error saving rate.', 'error');
    throw error;
  }
};

const loadEntries = () => {
  if (!currentUID) {
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
      entries = [];
      renderEntries();
    }
  );
};

// --- Core Logic Functions ---
const renderEntries = () => {
  if (!entriesTbody) return;
  entriesTbody.innerHTML = '';
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

  // Sort entries: oldest first by date, then by start time (Mon -> Fri)
  filteredEntries.sort((a, b) => {
    const dateComparison = a.date.localeCompare(b.date);
    if (dateComparison !== 0) return dateComparison;
    return a.startTime.localeCompare(b.startTime);
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

// --- Event Handlers ---
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
  if (duration <= 0 && !(start > end)) {
    showStatusMessage(
      entryStatusSpan,
      'End time must be after start time for a valid duration.',
      'error'
    );
    return;
  }

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
  if (!currentUID) return;
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
  const startDateValue = filterStartDateInput
    ? filterStartDateInput.value
    : null;
  const endDateValue = filterEndDateInput ? filterEndDateInput.value : null;

  if (startDateValue && endDateValue && endDateValue < startDateValue) {
    showStatusMessage(
      exportStatusSpan,
      "Filter 'To' date cannot be before 'From' date.",
      'error'
    );
    return;
  }
  currentFilter.startDate = startDateValue || null;
  currentFilter.endDate = endDateValue || null;
  renderEntries();
  // Message for filter application could be added here if desired,
  // but avoiding it for programmatic changes like week navigation to reduce noise.
};

const handleResetFilter = () => {
  setDefaultDateFilterToCurrentWeek();
  showStatusMessage(
    exportStatusSpan,
    'Filter reset to current week.',
    'success',
    1500
  );
};

// --- Week Navigation Function (NEW) ---
const navigateWeeks = (direction) => {
  if (!filterStartDateInput || !filterEndDateInput) {
    console.warn('Filter date inputs not found for week navigation.');
    return;
  }

  let currentStartDateString = filterStartDateInput.value;
  let baseDateForCalc;

  if (
    currentStartDateString &&
    !isNaN(new Date(currentStartDateString + 'T00:00:00Z'))
  ) {
    // Use the current filter's start date, parsed as UTC
    baseDateForCalc = new Date(currentStartDateString + 'T00:00:00Z');
  } else {
    // If no valid filter start date, base it on today (local time, then convert to UTC for calculation)
    const todayLocal = new Date();
    baseDateForCalc = new Date(
      Date.UTC(
        todayLocal.getFullYear(),
        todayLocal.getMonth(),
        todayLocal.getDate()
      )
    );
  }

  // Find Monday of the baseDateForCalc's week
  const baseDay = baseDateForCalc.getUTCDay(); // 0 (Sun) to 6 (Sat)
  const diffToMonday = baseDay === 0 ? -6 : 1 - baseDay;

  // Create a new date object for Monday to avoid modifying baseDateForCalc directly
  const mondayOfTargetWeek = new Date(
    Date.UTC(
      baseDateForCalc.getUTCFullYear(),
      baseDateForCalc.getUTCMonth(),
      baseDateForCalc.getUTCDate()
    )
  );
  mondayOfTargetWeek.setUTCDate(mondayOfTargetWeek.getUTCDate() + diffToMonday);

  // Move to previous or next week's Monday
  if (direction === 'prev') {
    mondayOfTargetWeek.setUTCDate(mondayOfTargetWeek.getUTCDate() - 7);
  } else if (direction === 'next') {
    mondayOfTargetWeek.setUTCDate(mondayOfTargetWeek.getUTCDate() + 7);
  }

  const sundayOfTargetWeek = new Date(
    Date.UTC(
      mondayOfTargetWeek.getUTCFullYear(),
      mondayOfTargetWeek.getUTCMonth(),
      mondayOfTargetWeek.getUTCDate()
    )
  );
  sundayOfTargetWeek.setUTCDate(sundayOfTargetWeek.getUTCDate() + 6);

  filterStartDateInput.value = formatDateToInput(mondayOfTargetWeek);
  filterEndDateInput.value = formatDateToInput(sundayOfTargetWeek);
  handleFilter(); // Apply the new filter and re-render

  showStatusMessage(
    exportStatusSpan,
    `Filter set to ${direction === 'prev' ? 'previous' : 'next'} week.`,
    'success',
    1500
  );
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
      'No entries in the current filter to export.',
      'error'
    );
    return;
  }

  // Sorting for export should match display (oldest first)
  csvExportEntries.sort((a, b) => {
    const dateComparison = a.date.localeCompare(b.date);
    if (dateComparison !== 0) return dateComparison;
    return a.startTime.localeCompare(b.startTime);
  });

  const rate = parseFloat(settings.hourlyRate) || 0;
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
    // Using formatDateToInput which gives YYYY-MM-DD, then formatDate for user-friendly part
    const safeFormatDateForFilename = (dateStr) =>
      dateStr ? formatDate(dateStr).replace(/[^a-zA-Z0-9]/g, '-') : 'all';

    const startStr = currentFilter.startDate
      ? safeFormatDateForFilename(currentFilter.startDate)
      : 'all';
    const endStr = currentFilter.endDate
      ? safeFormatDateForFilename(currentFilter.endDate)
      : safeFormatDateForFilename(formatDateToInput(new Date()));

    filename = `work_hours_${startStr}_to_${endStr}.csv`;

    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

// --- Authentication Event Handlers ---
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
    showStatusMessage(
      authStatusSpan,
      'Sign up successful! You are now logged in.',
      'success'
    );
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
    showStatusMessage(authStatusSpan, 'Sign in successful!', 'success');
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
    showStatusMessage(authStatusSpan, 'You have been signed out.', 'success');
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

// --- Authentication State Handling ---
const handleAuthState = (user) => {
  if (user) {
    currentUID = user.uid;
    console.log('Authenticated with UID:', currentUID, 'Email:', user.email);
    showAppUI(user.email);
    loadSettings();
    loadEntries();
    setDefaultDateFilterToCurrentWeek();
  } else {
    currentUID = null;
    console.log('User signed out or no user.');
    clearDataAndUI();
    showAuthUI();
  }
};

// --- Application Setup ---
const setupApplication = () => {
  showAuthUI();
  clearForm();

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

  // Week navigation buttons (NEW)
  if (prevWeekBtn)
    prevWeekBtn.addEventListener('click', () => navigateWeeks('prev'));
  if (nextWeekBtn)
    nextWeekBtn.addEventListener('click', () => navigateWeeks('next'));

  if (signUpBtn) signUpBtn.addEventListener('click', handleSignUp);
  if (signInBtn) signInBtn.addEventListener('click', handleSignIn);
  if (signOutBtn) signOutBtn.addEventListener('click', handleSignOut);

  if (passwordInput) {
    passwordInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSignIn();
      }
    });
  }
  if (emailInput) {
    emailInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (passwordInput) passwordInput.focus();
      }
    });
  }
  onAuthStateChanged(auth, handleAuthState);
};

// --- Initialize App on DOM Ready ---
document.addEventListener('DOMContentLoaded', setupApplication);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/GrindTime-WrkHrs/sw.js') // Ensure this path is correct for your deployment
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
