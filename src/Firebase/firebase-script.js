// Import Firebase modules
import { db, auth } from './firebase-config.js';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  getDocs, query, where, orderBy, Timestamp 
} from 'firebase/firestore';
import { 
  onAuthStateChanged, signInAnonymously 
} from 'firebase/auth';

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
  let currentUser = null; // Store the current user
  let isOnline = window.navigator.onLine;

  // ---=== Firebase Collection Names ===---
  const ENTRIES_COLLECTION = "timeEntries";
  const SETTINGS_COLLECTION = "userSettings";

  // ---=== localStorage Keys (for offline support) ===---
  const ENTRIES_STORAGE_KEY = "grindTimeEntries_v1";
  const SETTINGS_STORAGE_KEY = "grindTimeSettings_v1";
  const PENDING_OPERATIONS_KEY = "grindTimePendingOperations";

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

  // ---=== Firebase Auth Functions ===---
  
  // Sign in anonymously to Firebase
  const signInAnonymously = async () => {
    try {
      const userCredential = await signInAnonymously(auth);
      currentUser = userCredential.user;
      console.log("Signed in anonymously with ID:", currentUser.uid);
      return currentUser;
    } catch (error) {
      console.error("Error signing in anonymously:", error);
      showStatusMessage(
        entryStatusSpan, 
        "Error connecting to cloud storage. Working in offline mode.", 
        "error", 
        5000
      );
      return null;
    }
  };

  // Listen for auth state changes
  const setupAuthListener = () => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUser = user;
        console.log("User is signed in:", user.uid);
        // Load data after authentication
        loadDataFromFirebase();
      } else {
        console.log("User is signed out");
        currentUser = null;
        // Try to sign in anonymously again
        signInAnonymously();
      }
    });
  };

  // ---=== Firebase Data Functions ===---
  
  // Load settings from Firebase
  const loadSettingsFromFirebase = async () => {
    if (!currentUser) return false;
    
    try {
      const settingsRef = collection(db, SETTINGS_COLLECTION);
      const q = query(settingsRef, where("userId", "==", currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const settingsDoc = querySnapshot.docs[0];
        settings = settingsDoc.data();
        hourlyRateInput.value = settings.hourlyRate.toFixed(2);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error loading settings from Firebase:", error);
      return false;
    }
  };

  // Save settings to Firebase
  const saveSettingsToFirebase = async () => {
    if (!currentUser) return false;
    
    try {
      const settingsRef = collection(db, SETTINGS_COLLECTION);
      const q = query(settingsRef, where("userId", "==", currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Update existing settings
        const settingsDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, SETTINGS_COLLECTION, settingsDoc.id), settings);
      } else {
        // Create new settings
        await addDoc(collection(db, SETTINGS_COLLECTION), {
          ...settings,
          userId: currentUser.uid,
          createdAt: Timestamp.now()
        });
      }
      return true;
    } catch (error) {
      console.error("Error saving settings to Firebase:", error);
      return false;
    }
  };

  // Load entries from Firebase
  const loadEntriesFromFirebase = async () => {
    if (!currentUser) return false;
    
    try {
      const entriesRef = collection(db, ENTRIES_COLLECTION);
      const q = query(
        entriesRef, 
        where("userId", "==", currentUser.uid),
        orderBy("date", "desc")
      );
      const querySnapshot = await getDocs(q);
      
      entries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return true;
    } catch (error) {
      console.error("Error loading entries from Firebase:", error);
      return false;
    }
  };

  // Load all data from Firebase
  const loadDataFromFirebase = async () => {
    const settingsLoaded = await loadSettingsFromFirebase();
    const entriesLoaded = await loadEntriesFromFirebase();
    
    if (!settingsLoaded || !entriesLoaded) {
      // If Firebase load fails, fall back to local storage
      loadDataFromLocalStorage();
    }
    
    // Sync any pending operations
    syncPendingOperations();
    
    // Render the UI
    renderEntries();
  };

  // Add entry to Firebase
  const addEntryToFirebase = async (entry) => {
    if (!currentUser || !isOnline) return false;
    
    try {
      const docRef = await addDoc(collection(db, ENTRIES_COLLECTION), {
        ...entry,
        userId: currentUser.uid,
        createdAt: Timestamp.now()
      });
      
      // Update the entry ID with the Firebase document ID
      entry.id = docRef.id;
      
      return true;
    } catch (error) {
      console.error("Error adding entry to Firebase:", error);
      // Queue for later sync
      addPendingOperation('add', entry);
      return false;
    }
  };

  // Update entry in Firebase
  const updateEntryInFirebase = async (entry) => {
    if (!currentUser || !isOnline) return false;
    
    try {
      await updateDoc(doc(db, ENTRIES_COLLECTION, entry.id), {
        ...entry,
        updatedAt: Timestamp.now()
      });
      
      return true;
    } catch (error) {
      console.error("Error updating entry in Firebase:", error);
      // Queue for later sync
      addPendingOperation('update', entry);
      return false;
    }
  };

  // Delete entry from Firebase
  const deleteEntryFromFirebase = async (entryId) => {
    if (!currentUser || !isOnline) return false;
    
    try {
      await deleteDoc(doc(db, ENTRIES_COLLECTION, entryId));
      return true;
    } catch (error) {
      console.error("Error deleting entry from Firebase:", error);
      // Queue for later sync
      addPendingOperation('delete', { id: entryId });
      return false;
    }
  };

  // ---=== Offline Support Functions ===---
  
  // Load data from localStorage (fallback/offline mode)
  const loadDataFromLocalStorage = () => {
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
        "Error loading entries from local storage.",
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
        "Error loading settings from local storage.",
        "error",
        5000
      );
    }

    // Apply loaded settings to the input
    hourlyRateInput.value = settings.hourlyRate.toFixed(2);
  };

  // Save data to localStorage (for offline support)
  const saveDataToLocalStorage = () => {
    try {
      localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entries));
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error("Error saving data to localStorage:", e);
      showStatusMessage(
        settingsStatusSpan,
        "Error: Could not save data locally. Storage might be full.",
        "error",
        6000
      );
    }
  };

  // Queue operations for later sync
  const addPendingOperation = (type, data) => {
    try {
      let pendingOps = JSON.parse(localStorage.getItem(PENDING_OPERATIONS_KEY) || '[]');
      pendingOps.push({ type, data, timestamp: Date.now() });
      localStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(pendingOps));
    } catch (e) {
      console.error("Error saving pending operation:", e);
    }
  };

  // Sync pending operations when back online
  const syncPendingOperations = async () => {
    if (!currentUser || !isOnline) return;
    
    try {
      const pendingOps = JSON.parse(localStorage.getItem(PENDING_OPERATIONS_KEY) || '[]');
      if (pendingOps.length === 0) return;
      
      console.log(`Syncing ${pendingOps.length} pending operations...`);
      
      const successfulOps = [];
      
      for (const op of pendingOps) {
        let success = false;
        
        switch (op.type) {
          case 'add':
            success = await addEntryToFirebase(op.data);
            break;
          case 'update':
            success = await updateEntryInFirebase(op.data);
            break;
          case 'delete':
            success = await deleteEntryFromFirebase(op.data.id);
            break;
          case 'settings':
            success = await saveSettingsToFirebase();
            break;
        }
        
        if (success) {
          successfulOps.push(op);
        }
      }
      
      // Remove successful operations from pending list
      if (successfulOps.length > 0) {
        const remainingOps = pendingOps.filter(op => 
          !successfulOps.some(sOp => 
            sOp.type === op.type && sOp.timestamp === op.timestamp
          )
        );
        
        localStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(remainingOps));
        
        console.log(`Synced ${successfulOps.length} operations, ${remainingOps.length} remaining.`);
        
        if (successfulOps.length > 0 && remainingOps.length === 0) {
          showStatusMessage(
            entryStatusSpan, 
            "All data synced to cloud successfully!",
            "success", 
            3000
          );
        }
      }
    } catch (e) {
      console.error("Error syncing pending operations:", e);
    }
  };

  // ---=== Core UI Functions ===---

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
  const handleSaveSettings = async () => {
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
    
    // Save to Firebase if online
    let firebaseSaved = false;
    if (currentUser && isOnline) {
      firebaseSaved = await saveSettingsToFirebase();
    }
    
    if (!firebaseSaved) {
      // Queue for later or if Firebase save failed
      addPendingOperation('settings', settings);
    }
    
    // Always save locally for offline support
    saveDataToLocalStorage();
    
    renderEntries(); // Re-render entries with new rate calculation
    showStatusMessage(settingsStatusSpan, `Rate saved: $${rate.toFixed(2)}`);
  };

  const handleAddOrUpdateEntry = async (isUpdate = false) => {
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
      if (!confirm("End time is earlier than or the same as start time. Is this an overnight shift?")) {
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
    };

    let firebaseSuccess = false;

    if (isUpdate) {
      const index = entries.findIndex((e) => e.id === id);
      if (index !== -1) {
        entries[index] = entryData;
        
        // Try to update in Firebase
        if (currentUser && isOnline) {
          firebaseSuccess = await updateEntryInFirebase(entryData);
        }
        
        if (!firebaseSuccess) {
          // Queue for sync later
          addPendingOperation('update', entryData);
        }
        
        showStatusMessage(entryStatusSpan, "Entry updated successfully.");
      } else {
        showStatusMessage(
          entryStatusSpan,
          "Error: Entry not found for update.",
          "error"
        );
        clearForm();
        return;
      }
    } else {
      // Try to add to Firebase
      if (currentUser && isOnline) {
        firebaseSuccess = await addEntryToFirebase(entryData);
      }
      
      if (!firebaseSuccess) {
        // Queue for sync later
        addPendingOperation('add', entryData);
      }
      
      entries.push(entryData);
      showStatusMessage(entryStatusSpan, "Entry added successfully.");
    }

    // Always save locally for offline access
    saveDataToLocalStorage();
    renderEntries();
    clearForm();
  };

  const handleTableActions = async (event) => {
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
        let firebaseSuccess = false;
        
        // Try to delete from Firebase
        if (currentUser && isOnline) {
          firebaseSuccess = await deleteEntryFromFirebase(entryId);
        }
        
        if (!firebaseSuccess) {
          // Queue for sync later
          addPendingOperation('delete', { id: entryId });
        }
        
        // Remove from local array
        entries = entries.filter((e) => e.id !== entryId);
        saveDataToLocalStorage();
        renderEntries();
        
        showStatusMessage(entryStatusSpan, "Entry deleted.");
        
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
    }
  };

  // ---=== Network Status Monitoring ===---
  window.addEventListener('online', () => {
    isOnline = true;
    console.log('App is online');
    showStatusMessage(
      entryStatusSpan, 
      "Connection restored. Syncing data...", 
      "success", 
      3000
    );
    syncPendingOperations();
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    console.log('App is offline');
    showStatusMessage(
      entryStatusSpan, 
      "You are offline. Changes will be saved locally and synced when online.", 
      "error", 
      5000
    );
  });

  // ---=== Initialization ===---
  const initializeApp = async () => {
    // First try to load from localStorage in case we're offline
    loadDataFromLocalStorage();
    
    // Set default date in the form
    clearForm();
    
    // Initial render with whatever data we have 
    renderEntries();

    // Setup auth listener and sign in anonymously if needed
    setupAuthListener();
    if (!auth.currentUser) {
      await signInAnonymously();
    }

    // Attach Event Listeners
    saveSettingsBtn.addEventListener("click", handleSaveSettings);
    addEntryBtn.addEventListener("click", () => handleAddOrUpdateEntry(false));
    updateEntryBtn.addEventListener("click", () => handleAddOrUpdateEntry(true));
    cancelEditBtn.addEventListener("click", clearForm);

    // Use event delegation for edit/delete buttons in the table
    entriesTbody.addEventListener("click", handleTableActions);

    filterBtn.addEventListener("click", handleFilter);