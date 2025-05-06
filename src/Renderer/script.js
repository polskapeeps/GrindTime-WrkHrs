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
  const editEntryIdInput = document.getElementById("editEntryId"); // Hidden input
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
  let entries = [];
  let settings = { hourlyRate: 20.0 }; // Default rate
  let currentFilter = { startDate: null, endDate: null };
  let statusTimeout = null; // For managing status message display

  // ---=== localStorage Keys ===---
  const ENTRIES_STORAGE_KEY = "grindTimeEntries_v1"; // Renamed key slightly
  const SETTINGS_STORAGE_KEY = "grindTimeSettings_v1";

  // ---=== Helper Functions ===---
  const generateId = () => "_" + Math.random().toString(36).substr(2, 9);

  // Formats YYYY-MM-DD to a more readable format like "Wed, May 3"
  const formatDate = (dateString) => {
    if (!dateString) return "";
    // Use UTC to avoid timezone issues with date-only strings
    const [year, month, day] = dateString.split("-").map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    return dateObj.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC", // Specify UTC timezone
    });
  };

  // Show status message and hide after a delay
  const showStatusMessage = (
    element,
    message,
    type = "success",
    duration = 3000
  ) => {
    if (!element) return;
    clearTimeout(statusTimeout); // Clear previous timeout if any
    element.textContent = message;
    element.className = `status-message ${type} show`; // Add type and show class

    statusTimeout = setTimeout(() => {
      element.classList.remove("show");
      // Optional: clear text after fade out
      // setTimeout(() => { element.textContent = ''; }, 500);
    }, duration);
  };

  // Calculate duration handling overnight shifts
  const calculateDuration = (start, end) => {
    if (!start || !end) return 0;
    try {
      // Use a fixed date to compare times only
      const startDate = new Date(`1970-01-01T${start}:00Z`); // Assume UTC for consistency
      const endDate = new Date(`1970-01-01T${end}:00Z`);

      if (isNaN(startDate) || isNaN(endDate)) return 0;

      let diffMs = endDate - startDate;

      // If end time is earlier than or same as start time, assume it's the next day
      if (diffMs <= 0) {
        diffMs += 24 * 60 * 60 * 1000; // Add 24 hours in milliseconds
      }
      return diffMs / (1000 * 60 * 60); // Return duration in hours
    } catch (e) {
      console.error("Error calculating duration:", e);
      return 0;
    }
  };

  // ---=== Core Logic Functions ===---

  // Load data from localStorage
  const loadData = () => {
    const storedEntries = localStorage.getItem(ENTRIES_STORAGE_KEY);
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);

    try {
      entries = storedEntries ? JSON.parse(storedEntries) : [];
      // Basic validation/migration if needed in the future
      if (!Array.isArray(entries)) entries = [];
    } catch (e) {
      console.error("Error parsing entries:", e);
      entries = [];
      showStatusMessage(
        entryStatusSpan,
        "Error loading entries.",
        "error",
        5000
      );
    }

    try {
      settings = storedSettings
        ? JSON.parse(storedSettings)
        : { hourlyRate: 20.0 };
      // Ensure hourlyRate is a number
      settings.hourlyRate = parseFloat(settings.hourlyRate) || 20.0;
    } catch (e) {
      console.error("Error parsing settings:", e);
      settings = { hourlyRate: 20.0 };
      showStatusMessage(
        settingsStatusSpan,
        "Error loading settings.",
        "error",
        5000
      );
    }

    // Apply loaded settings to the input
    hourlyRateInput.value = settings.hourlyRate.toFixed(2);
  };

  // Save data to localStorage
  const saveData = () => {
    try {
      localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entries));
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error("Error saving data to localStorage:", e);
      // Provide feedback in a non-blocking way
      showStatusMessage(
        settingsStatusSpan,
        "Error: Could not save data. Storage might be full.",
        "error",
        6000
      );
    }
  };

  // Render the entries table
  const renderEntries = () => {
    entriesTbody.innerHTML = ""; // Clear existing rows
    let filteredEntries = entries;
    const rate = settings.hourlyRate;

    // Apply date filter
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

    // Sort by date and then start time descending (most recent first)
    filteredEntries.sort((a, b) => {
      const dateComparison = b.date.localeCompare(a.date);
      if (dateComparison !== 0) return dateComparison;
      // If dates are the same, sort by start time (descending might not be intuitive here, maybe ascending?)
      // Let's stick to descending for most recent overall
      return b.startTime.localeCompare(a.startTime);
    });

    let totalHours = 0;
    let totalPay = 0;

    if (filteredEntries.length === 0) {
      noEntriesMessage.hidden = false; // Show the 'no entries' message
    } else {
      noEntriesMessage.hidden = true; // Hide the message
      filteredEntries.forEach((entry) => {
        const duration = calculateDuration(entry.startTime, entry.endTime);
        const pay = duration * rate;
        totalHours += duration;
        totalPay += pay;

        const tr = document.createElement("tr");
        tr.dataset.id = entry.id; // Add data-id for easier selection
        tr.innerHTML = `
                    <td>${formatDate(entry.date)}</td>
                    <td>${entry.startTime}</td>
                    <td>${entry.endTime}</td>
                    <td>${duration.toFixed(2)}</td>
                    <td><span class="description" title="${
                      entry.description || ""
                    }">${entry.description || "-"}</span></td>
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

    // Update filtered totals display
    totalHoursFilteredSpan.textContent = totalHours.toFixed(2);
    totalPayFilteredSpan.textContent = totalPay.toFixed(2);

    // Note: Event listeners for edit/delete are added once using event delegation
  };

  // Clear input form and reset buttons
  const clearForm = () => {
    editEntryIdInput.value = "";
    entryDateInput.value = new Date().toISOString().split("T")[0]; // Today's date
    startTimeInput.value = "";
    endTimeInput.value = "";
    descriptionInput.value = "";

    addEntryBtn.hidden = false;
    updateEntryBtn.hidden = true;
    cancelEditBtn.hidden = true;

    // Optional: remove any error styling from inputs if implemented
  };

  // Set up the form for editing an entry
  const setupEditForm = (entry) => {
    editEntryIdInput.value = entry.id;
    entryDateInput.value = entry.date;
    startTimeInput.value = entry.startTime;
    endTimeInput.value = entry.endTime;
    descriptionInput.value = entry.description || "";

    addEntryBtn.hidden = true;
    updateEntryBtn.hidden = false;
    cancelEditBtn.hidden = false;

    // Scroll form into view and focus first field
    entryFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
    entryDateInput.focus();
  };

  // ---=== Event Handlers ===---
  const handleSaveSettings = () => {
    const rate = parseFloat(hourlyRateInput.value);
    if (isNaN(rate) || rate < 0) {
      showStatusMessage(
        settingsStatusSpan,
        "Invalid rate. Please enter a positive number.",
        "error"
      );
      hourlyRateInput.focus();
      return;
    }
    settings.hourlyRate = rate;
    saveData();
    renderEntries(); // Re-render entries with new rate calculation
    showStatusMessage(settingsStatusSpan, `Rate saved: $${rate.toFixed(2)}`);
  };

  const handleAddOrUpdateEntry = (isUpdate = false) => {
    const id = isUpdate ? editEntryIdInput.value : generateId();
    const date = entryDateInput.value;
    const start = startTimeInput.value;
    const end = endTimeInput.value;
    const description = descriptionInput.value.trim();

    // Basic validation
    if (!date || !start || !end) {
      showStatusMessage(
        entryStatusSpan,
        "Date, Start Time, and End Time are required.",
        "error"
      );
      return;
    }

    // Validate time order (allow overnight confirmation)
    const duration = calculateDuration(start, end);
    if (start && end && start >= end) {
      // Check if end time is not later than start time
      if (
        !confirm(
          "End time is earlier than or the same as start time. Is this an overnight shift?"
        )
      ) {
        showStatusMessage(entryStatusSpan, "Entry cancelled.", "error");
        return;
      }
    }
    if (duration <= 0 && start < end) {
      // Handle invalid time inputs leading to zero/negative duration
      showStatusMessage(
        entryStatusSpan,
        "Invalid time range selected.",
        "error"
      );
      return;
    }

    const entryData = {
      id,
      date,
      startTime: start,
      endTime: end,
      description,
      // Rate at time of entry isn't stored here, using global setting for calculations
    };

    if (isUpdate) {
      const index = entries.findIndex((e) => e.id === id);
      if (index !== -1) {
        entries[index] = entryData;
        showStatusMessage(
          entryStatusSpan,
          "Entry updated successfully.",
          "success"
        );
      } else {
        showStatusMessage(
          entryStatusSpan,
          "Error: Entry not found for update.",
          "error"
        );
        clearForm(); // Reset form if update failed weirdly
        return; // Exit early
      }
    } else {
      entries.push(entryData);
      showStatusMessage(
        entryStatusSpan,
        "Entry added successfully.",
        "success"
      );
    }

    saveData();
    renderEntries();
    clearForm();
  };

  const handleTableActions = (event) => {
    const target = event.target;
    const entryId = target.dataset.id;

    if (!entryId) return; // Click wasn't on a button with data-id

    if (target.classList.contains("edit-btn")) {
      const entryToEdit = entries.find((e) => e.id === entryId);
      if (entryToEdit) {
        setupEditForm(entryToEdit);
      }
    } else if (target.classList.contains("delete-btn")) {
      if (confirm("Are you sure you want to delete this entry?")) {
        entries = entries.filter((e) => e.id !== entryId);
        saveData();
        renderEntries();
        showStatusMessage(entryStatusSpan, "Entry deleted.", "success");
        // If the deleted entry was being edited, clear the form
        if (editEntryIdInput.value === entryId) {
          clearForm();
        }
      }
    }
  };

  const handleFilter = () => {
    // Basic validation: End date should not be before start date
    if (
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

    currentFilter.startDate = filterStartDateInput.value || null;
    currentFilter.endDate = filterEndDateInput.value || null;
    renderEntries();
    showStatusMessage(exportStatusSpan, "Filter applied.", "success", 1500); // Short message
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

    // Sort for export consistency (same as render)
    filteredEntries.sort((a, b) => {
      const dateComparison = b.date.localeCompare(a.date);
      if (dateComparison !== 0) return dateComparison;
      return b.startTime.localeCompare(a.startTime);
    });

    const rate = settings.hourlyRate;
    let csvContent =
      "Date,Start Time,End Time,Duration (Hours),Description,Pay ($)\n"; // Header

    filteredEntries.forEach((entry) => {
      const duration = calculateDuration(entry.startTime, entry.endTime);
      const pay = duration * rate;
      // Escape potential commas and quotes in description
      const escapedDesc = entry.description
        ? `"${entry.description.replace(/"/g, '""')}"`
        : "";
      csvContent += `${entry.date},${entry.startTime},${
        entry.endTime
      },${duration.toFixed(3)},${escapedDesc},${pay.toFixed(2)}\n`;
    });

    // Create and trigger download
    try {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);

      // Generate filename
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
      URL.revokeObjectURL(url); // Clean up
      showStatusMessage(exportStatusSpan, "CSV export generated.", "success");
    } catch (e) {
      console.error("CSV Export failed:", e);
      showStatusMessage(
        exportStatusSpan,
        "CSV export failed. See console for details.",
        "error"
      );
      // Fallback maybe? Could display in a textarea if needed.
    }
  };

  // ---=== Initialization ===---
  const initializeApp = () => {
    loadData();
    clearForm(); // Set default date and button states
    renderEntries(); // Initial render

    // Attach Event Listeners
    saveSettingsBtn.addEventListener("click", handleSaveSettings);
    addEntryBtn.addEventListener("click", () => handleAddOrUpdateEntry(false)); // Explicitly adding
    updateEntryBtn.addEventListener("click", () =>
      handleAddOrUpdateEntry(true)
    ); // Explicitly updating
    cancelEditBtn.addEventListener("click", clearForm);

    // Use event delegation for edit/delete buttons in the table
    entriesTbody.addEventListener("click", handleTableActions);

    filterBtn.addEventListener("click", handleFilter);
    resetFilterBtn.addEventListener("click", handleResetFilter);
    exportCsvBtn.addEventListener("click", handleExportCsv);

    // Optional: Re-calculate totals if rate changes without saving
    // hourlyRateInput.addEventListener('input', () => { /* maybe update totals dynamically? */ });
  };

  // Start the application
  initializeApp();
});
