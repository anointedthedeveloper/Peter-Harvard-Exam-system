// Common utility functions

// Toast notifications
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.innerHTML = `<i class="fa fa-${type === 'err' ? 'exclamation-circle' : 'check-circle'}"></i> ${msg}`;
  el.className = 'show ' + type;
  setTimeout(() => el.className = '', 3000);
}

// Loader
function showLoader(text) {
  const loaderText = document.getElementById('loaderText');
  if (loaderText) {
    loaderText.innerHTML = `<i class="fa fa-spinner fa-spin"></i> ${text || 'Loading…'}`;
  }
  const loaderOverlay = document.getElementById('loaderOverlay');
  if (loaderOverlay) {
    loaderOverlay.style.display = 'flex';
  }
}

function hideLoader() {
  const loaderOverlay = document.getElementById('loaderOverlay');
  if (loaderOverlay) {
    loaderOverlay.style.display = 'none';
  }
}

// Modals
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('show');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('show');
}

// Screen management
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
  const screen = document.getElementById(id);
  if (screen) screen.style.display = 'flex';
}

// Shuffle array (Fisher-Yates algorithm for proper randomization)
function shuffle(arr) {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Network indicator
async function updateNetIndicator() {
  try {
    const info = await fetch('/api/info').then(r => r.json());
    const nets = info.networks || [];
    const connected = nets.length > 0;
    
    ['netIcon', 'netIcon2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.className = connected ? 'fa fa-wifi' : 'fa fa-exclamation-triangle';
    });
    
    const label = connected ? 'Connected' : 'Offline';
    ['netLabel', 'netLabel2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = label;
    });
  } catch {
    ['netIcon', 'netIcon2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.className = 'fa fa-exclamation-triangle';
    });
    ['netLabel', 'netLabel2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Offline';
    });
  }
}
