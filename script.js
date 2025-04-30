// ---=== Polyfills & Helpers ===---
//--> Basic unique ID generator<--\\
const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

//-->Format seconds into HH:MM:SS----not needed atm---
const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return [hours, minutes, secs].map(v => v < 10 ? "0" + v : v).join(":");
};

// Format date string YYYY-MM-DD to readable format
const formatDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    const dateObj = new Date(year, month - 1, day); // Month is 0-indexed
    return dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' });
};

// ---=== DOM Elements ===---
//const themeToggle = document.getElementById('themeToggle');
const hourlyRateInput = document.getElementById('hourlyRate');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const settingsStatusSpan = document.getElementById('settingsStatus'); // <-- Add this line
const entryDateInput = document.getElementById('entryDate');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
const descriptionInput = document.getElementById('description');
const addEntryBtn = document.getElementById('addEntryBtn');
const updateEntryBtn = document.getElementById('updateEntryBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editEntryIdInput = document.getElementById('editEntryId');
const entriesTbody = document.getElementById('entriesTbody');
const filterStartDateInput = document.getElementById('filterStartDate');
const filterEndDateInput = document.getElementById('filterEndDate');
const filterBtn = document.getElementById('filterBtn');
const resetFilterBtn = document.getElementById('resetFilterBtn');
const totalHoursFilteredSpan = document.getElementById('totalHoursFiltered');
const totalPayFilteredSpan = document.getElementById('totalPayFiltered');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const csvOutput = document.getElementById('csvOutput');
//-->Timer elements<--\\
const startTimerBtn = document.getElementById('startTimerBtn');
const stopTimerBtn = document.getElementById('stopTimerBtn');
const timerDisplay = document.getElementById('timerDisplay');
const timerStartTimeInput = document.getElementById('timerStartTime'); 
//-->Modal elements<--\\
const editModal = document.getElementById('editModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');


// ---=== State Variables ===---
let entries = [];
let settings = { hourlyRate: 20.00, theme: 'light' }; // Default settings
let settingsStatusTimeout = null; // <-- Add this to manage the timeout
let currentFilter = { startDate: null, endDate: null };
let timerInterval = null;
let timerSeconds = 0;

// ---=== localStorage Keys ===---
const ENTRIES_STORAGE_KEY = 'advTimeTrackerEntries';
const SETTINGS_STORAGE_KEY = 'advTimeTrackerSettings';

// ---=== Core Logic Functions ===---

// Load data from localStorage
const loadData = () => {
    const storedEntries = localStorage.getItem(ENTRIES_STORAGE_KEY);
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (storedEntries) {
        try { entries = JSON.parse(storedEntries); } catch (e) { console.error("Error parsing entries:", e); entries = []; }
    } else {
        entries = [];
    }

    if (storedSettings) {
        try { settings = JSON.parse(storedSettings); } catch (e) { console.error("Error parsing settings:", e); /* Keep defaults */ }
    }
    // Apply loaded settings
    hourlyRateInput.value = settings.hourlyRate || 20.00;
    //document.documentElement.setAttribute('data-theme', settings.theme || 'light');
    //themeToggle.textContent = settings.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
};

// Save data to localStorage
const saveData = () => {
    try {
        localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entries));
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error("Error saving data to localStorage:", e);
        alert("Could not save data. LocalStorage might be full or disabled.");
    }
};

// Calculate duration between two time strings in hours
const calculateDuration = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(`1970-01-01T${start}:00`);
    const endDate = new Date(`1970-01-01T${end}:00`);
    if (isNaN(startDate) || isNaN(endDate)) return 0; // Invalid time format

    if (endDate <= startDate) { // Handle overnight
        endDate.setDate(endDate.getDate() + 1);
    }
    const diffMs = endDate - startDate;
    return diffMs / (1000 * 60 * 60);
};

// Render the entries table based on current filter
const renderEntries = () => {
    entriesTbody.innerHTML = ''; // Clear table
    let filteredEntries = entries;

    // Apply date filter
    if (currentFilter.startDate) {
        filteredEntries = filteredEntries.filter(e => e.date >= currentFilter.startDate);
    }
    if (currentFilter.endDate) {
        filteredEntries = filteredEntries.filter(e => e.date <= currentFilter.endDate);
    }

    // Sort by date descending (most recent first)
    filteredEntries.sort((a, b) => new Date(b.date + 'T' + b.startTime) - new Date(a.date + 'T' + a.startTime));

    let totalHours = 0;
    let totalPay = 0;
    const rate = parseFloat(settings.hourlyRate) || 0;

    if (filteredEntries.length === 0) {
        entriesTbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--secondary-text);">No entries found for the selected period.</td></tr>';
    } else {
        filteredEntries.forEach(entry => {
            const duration = calculateDuration(entry.startTime, entry.endTime);
            const pay = duration * rate;
            totalHours += duration;
            totalPay += pay;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDate(entry.date)}</td>
                <td>${entry.startTime}</td>
                <td>${entry.endTime}</td>
                <td>${duration.toFixed(2)}</td>
                <td><span class="description" title="${entry.description || ''}">${entry.description || '-'}</span></td>
                <td>${pay.toFixed(2)}</td>
                <td class="actions">
                    <button class="warning edit-btn" data-id="${entry.id}">Edit</button>
                    <button class="danger delete-btn" data-id="${entry.id}">Del</button>
                </td>
            `;
            entriesTbody.appendChild(tr);
        });
    }

    // Update filtered totals display
    totalHoursFilteredSpan.textContent = totalHours.toFixed(2);
    totalPayFilteredSpan.textContent = totalPay.toFixed(2);

    // Add event listeners for edit/delete buttons
    attachActionListeners();
};

// Attach listeners to dynamically created buttons
const attachActionListeners = () => {
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', handleEdit);
    });
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', handleDelete);
    });
};

// Clear input form
const clearForm = () => {
    editEntryIdInput.value = ''; // Clear edit ID
    entryDateInput.value = new Date().toISOString().split('T')[0]; // Reset date
    startTimeInput.value = '';
    endTimeInput.value = '';
    descriptionInput.value = '';
    addEntryBtn.style.display = 'inline-block';
    updateEntryBtn.style.display = 'none';
    cancelEditBtn.style.display = 'none';
    startTimeInput.disabled = false;
    endTimeInput.disabled = false;
    entryDateInput.disabled = false;
};

// ---=== Event Handlers ===---
const handleSaveSettings = () => {
    const rate = parseFloat(hourlyRateInput.value);
    if (isNaN(rate) || rate < 0) {
       showStatusMessage("Please enter a valid hourly rate.", 'error');
        return;
    }
    settings.hourlyRate = rate.toFixed(2); // Store as string with 2 decimals
    saveData();
    renderEntries(); // Re-render in case pay changed
    showStatusMessage("Settings saved!");
};

// Show a status message that fades after a few seconds
const showStatusMessage = (message, type = 'success') => {
    if (!settingsStatusSpan) return;
    
    // Clear any existing timeout
    if (settingsStatusTimeout) {
        clearTimeout(settingsStatusTimeout);
    }
    
    // Set the message and show it
    settingsStatusSpan.textContent = message;
    settingsStatusSpan.className = `status-message ${type} show`;
    
    // Hide after 3 seconds
    settingsStatusTimeout = setTimeout(() => {
        settingsStatusSpan.classList.remove('show');
    }, 3000);
};

const handleAddEntry = () => {
    const date = entryDateInput.value;
    const start = startTimeInput.value;
    const end = endTimeInput.value;
    const description = descriptionInput.value.trim();
    const rate = parseFloat(settings.hourlyRate) || 0;

    if (!date || !start || !end) {
        alert("Please fill in Date, Start Time, and End Time.");
        return;
    }
    if (end < start) {
        if (!confirm("End time is before start time. Is this an overnight shift?")) {
            return; // Don't add if user cancels
        }
    }

    const newEntry = {
        id: generateId(),
        date,
        startTime: start,
        endTime: end,
        description,
        hourlyRate: rate // Store rate at time of entry (optional)
    };
    entries.push(newEntry);
    saveData();
    renderEntries();
    clearForm();
};

// Handle clicking the Edit button on a row
const handleEdit = (event) => {
    const id = event.target.getAttribute('data-id');
    const entryToEdit = entries.find(e => e.id === id);
    if (!entryToEdit) return;

    // Populate the form
    editEntryIdInput.value = entryToEdit.id;
    entryDateInput.value = entryToEdit.date;
    startTimeInput.value = entryToEdit.startTime;
    endTimeInput.value = entryToEdit.endTime;
    descriptionInput.value = entryToEdit.description || '';

    // Change button visibility
    addEntryBtn.style.display = 'none';
    updateEntryBtn.style.display = 'inline-block';
    cancelEditBtn.style.display = 'inline-block';

    // Scroll to form and maybe highlight it
    startTimeInput.focus();
    document.getElementById('startTime').closest('.section').scrollIntoView({ behavior: 'smooth' });

    // // Optional: Show a modal instead of reusing the form
    // // modalContent.innerHTML = '... form fields populated ...';
    // // editModal.style.display = 'block';
};

// Handle clicking the Update Entry button (after populating form via Edit)
const handleUpdateEntry = () => {
    const id = editEntryIdInput.value;
    const entryIndex = entries.findIndex(e => e.id === id);
    if (entryIndex === -1) return; // Should not happen

    const date = entryDateInput.value;
    const start = startTimeInput.value;
    const end = endTimeInput.value;
    const description = descriptionInput.value.trim();

    if (!date || !start || !end) {
        alert("Please fill in Date, Start Time, and End Time.");
        return;
    }
    if (end < start) {
        if (!confirm("End time is before start time. Is this an overnight shift?")) {
            return; // Don't update if user cancels
        }
    }

    // Update the entry in the array
    entries[entryIndex] = {
        ...entries[entryIndex], // Keep original ID and rate
        date,
        startTime: start,
        endTime: end,
        description
    };

    saveData();
    renderEntries();
    clearForm(); // Resets buttons and clears form
};

// Handle clicking the Delete button on a row
const handleDelete = (event) => {
    const id = event.target.getAttribute('data-id');
    if (confirm(`Are you sure you want to delete this entry?`)) {
        entries = entries.filter(e => e.id !== id);
        saveData();
        renderEntries();
    }
};

// Handle filter application
const handleFilter = () => {
    currentFilter.startDate = filterStartDateInput.value || null;
    currentFilter.endDate = filterEndDateInput.value || null;
    renderEntries(); // Re-render with new filter
    csvOutput.value = ''; // Clear CSV output on new filter
};

// Handle filter reset
const handleResetFilter = () => {
    filterStartDateInput.value = '';
    filterEndDateInput.value = '';
    currentFilter.startDate = null;
    currentFilter.endDate = null;
    renderEntries();
    csvOutput.value = '';
};

// Handle exporting filtered data to CSV format
const handleExportCsv = () => {
    let filteredEntries = entries;
    if (currentFilter.startDate) {
        filteredEntries = filteredEntries.filter(e => e.date >= currentFilter.startDate);
    }
    if (currentFilter.endDate) {
        filteredEntries = filteredEntries.filter(e => e.date <= currentFilter.endDate);
    }

    if (filteredEntries.length === 0) {
        csvOutput.value = "No entries selected to export.";
        return;
    }

    const rate = parseFloat(settings.hourlyRate) || 0;
    // Define CSV Header
    let csvContent = "Date,Start Time,End Time,Duration (Hours),Description,Pay ($)\n";

    // Add rows
    filteredEntries.forEach(entry => {
        const duration = calculateDuration(entry.startTime, entry.endTime);
        const pay = duration * rate;
        // Escape commas and quotes in description
        const escapedDesc = entry.description ? `"${entry.description.replace(/"/g, '""')}"` : '';
        csvContent += `${entry.date},${entry.startTime},${entry.endTime},${duration.toFixed(3)},${escapedDesc},${pay.toFixed(2)}\n`;
    });

    csvOutput.value = csvContent;
    csvOutput.select(); // Select text for easy copying
    alert("CSV data generated below. Select all (Ctrl+A or Cmd+A) and copy (Ctrl+C or Cmd+C) to paste into a spreadsheet or text file.");
};

/* // Handle theme toggle
const handleThemeToggle = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    settings.theme = newTheme;
    themeToggle.textContent = newTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    saveData();
}; */

// --- Timer Functionality ---
const startTimer = () => {
    if (timerInterval) return; // Already running

    // Disable form fields while timer runs maybe? Or just start/end time
    startTimeInput.disabled = true;
    endTimeInput.disabled = true;
    entryDateInput.disabled = true;
    addEntryBtn.disabled = true;

    const now = new Date();
    timerStartTimeInput.value = now.toISOString(); // Store precise start time
    startTimeInput.value = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); // Set start time in form
    entryDateInput.value = now.toISOString().split('T')[0]; // Set date in form

    timerSeconds = 0;
    timerDisplay.textContent = formatTime(timerSeconds);

    timerInterval = setInterval(() => {
        timerSeconds++;
        timerDisplay.textContent = formatTime(timerSeconds);
    }, 1000);

    startTimerBtn.disabled = true;
    stopTimerBtn.disabled = false;
};

const stopTimer = () => {
    if (!timerInterval) return; // Not running

    clearInterval(timerInterval);
    timerInterval = null;

    const now = new Date();
    endTimeInput.value = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); // Set end time

    startTimerBtn.disabled = false;
    stopTimerBtn.disabled = true;
    addEntryBtn.disabled = false; // Re-enable add button
    startTimeInput.disabled = false; // Re-enable fields
    endTimeInput.disabled = false;
    entryDateInput.disabled = false;


    
    // Automatically add the entry? Or just pre-fill? Let's pre-fill.
    // User can add description and click "Add Manual Entry"
    alert(`Timer stopped at ${formatTime(timerSeconds)}. Please add description if needed and click 'Add Manual Entry'.`);
    // Optional: Automatically add entry here
    // handleAddEntry();
};


// ---=== Initialization ===---
const initializeApp = () => {
    loadData(); // Load saved data first
    clearForm(); // Set default date and button states
    renderEntries(); // Render initial view

    // Make sure the status message is initially hidden
    if (settingsStatusSpan) {
        settingsStatusSpan.textContent = '';
        settingsStatusSpan.classList.remove('show');
    }

    // Attach persistent event listeners
    saveSettingsBtn.addEventListener('click', handleSaveSettings);
    addEntryBtn.addEventListener('click', handleAddEntry);
    updateEntryBtn.addEventListener('click', handleUpdateEntry);
    cancelEditBtn.addEventListener('click', clearForm);
    filterBtn.addEventListener('click', handleFilter);
    resetFilterBtn.addEventListener('click', handleResetFilter);
    exportCsvBtn.addEventListener('click', handleExportCsv);
    //themeToggle.addEventListener('click', handleThemeToggle);
    startTimerBtn.addEventListener('click', startTimer);
    stopTimerBtn.addEventListener('click', stopTimer);

    // Basic modal close functionality if used
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            if (editModal) editModal.style.display = "none";
        });
    }
    
    window.addEventListener('click', (event) => {
        if (editModal && event.target == editModal) {
            editModal.style.display = "none";
        }
    });
};

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);
