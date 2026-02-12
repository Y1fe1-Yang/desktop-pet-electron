/**
 * Settings Panel Logic
 * Handles settings UI and communication with main process
 */

// Get DOM elements
const animationSpeedSlider = document.getElementById('animation-speed');
const animationSpeedValue = document.getElementById('animation-speed-value');
const movementSpeedSlider = document.getElementById('movement-speed');
const movementSpeedValue = document.getElementById('movement-speed-value');
const soundEnabledToggle = document.getElementById('sound-enabled');
const autoStartToggle = document.getElementById('auto-start');
const saveStatus = document.getElementById('save-status');

let saveTimeout = null;

/**
 * Load current settings from main process
 */
async function loadSettings() {
  try {
    const settings = await window.electronAPI.getSettings();

    // Update UI with current settings
    animationSpeedSlider.value = settings.animationSpeed;
    animationSpeedValue.textContent = `${settings.animationSpeed.toFixed(1)}x`;

    movementSpeedSlider.value = settings.movementSpeed;
    movementSpeedValue.textContent = `${settings.movementSpeed.toFixed(1)}x`;

    soundEnabledToggle.checked = settings.soundEnabled;
    autoStartToggle.checked = settings.autoStart;

    console.log('Settings loaded:', settings);
  } catch (error) {
    console.error('Failed to load settings:', error);
    showSaveStatus('Failed to load settings', 'error');
  }
}

/**
 * Save settings to main process
 */
async function saveSettings(settingsUpdate) {
  try {
    const result = await window.electronAPI.updateSettings(settingsUpdate);

    if (result.success) {
      showSaveStatus('Settings saved successfully', 'success');
    } else {
      showSaveStatus('Failed to save settings', 'error');
    }
  } catch (error) {
    console.error('Failed to save settings:', error);
    showSaveStatus('Failed to save settings', 'error');
  }
}

/**
 * Show save status message
 */
function showSaveStatus(message, type) {
  saveStatus.textContent = message;
  saveStatus.className = `save-status ${type}`;

  // Clear previous timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // Hide after 3 seconds
  saveTimeout = setTimeout(() => {
    saveStatus.style.display = 'none';
    saveStatus.className = 'save-status';
  }, 3000);
}

/**
 * Debounced save function for slider changes
 */
let debounceTimeout = null;
function debouncedSave(settingsUpdate) {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }

  debounceTimeout = setTimeout(() => {
    saveSettings(settingsUpdate);
  }, 500);
}

/**
 * Event listeners
 */

// Animation speed slider
animationSpeedSlider.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  animationSpeedValue.textContent = `${value.toFixed(1)}x`;
  debouncedSave({ animationSpeed: value });
});

// Movement speed slider
movementSpeedSlider.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  movementSpeedValue.textContent = `${value.toFixed(1)}x`;
  debouncedSave({ movementSpeed: value });
});

// Sound enabled toggle
soundEnabledToggle.addEventListener('change', (e) => {
  saveSettings({ soundEnabled: e.target.checked });
});

// Auto-start toggle
autoStartToggle.addEventListener('change', (e) => {
  saveSettings({ autoStart: e.target.checked });
});

/**
 * Initialize settings panel
 */
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
});
