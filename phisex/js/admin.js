// Admin-specific JavaScript

// STATE
const A = {
  adminId: null, adminName: null,
  sessionToken: localStorage.getItem('adminSessionToken') || null
};

// SESSION CHECK
async function checkSession() {
  if (!A.sessionToken) return false;
  
  try {
    const res = await fetch('/api/check-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: A.sessionToken })
    });
    const data = await res.json();
    
    if (data.ok && data.role === 'admin') {
      A.adminId = data.id;
      A.adminName = data.name;
      return true;
    }
  } catch {}
  
  localStorage.removeItem('adminSessionToken');
  A.sessionToken = null;
  return false;
}

// AUTH
async function doLogin() {
  const id = document.getElementById('inId').value.trim();
  const password = document.getElementById('inPassword').value.trim();
  if (!id) {
    toast('Please enter your Admin ID', 'err');
    return;
  }
  if (!password) {
    toast('Please enter your Password', 'err');
    return;
  }
  
  showLoader('Signing in…');
  
  try {
    const res = await fetch('/api/login', { 
      method:'POST', 
      headers:{'Content-Type':'application/json'}, 
      body: JSON.stringify({ id, password, role: 'admin' }) 
    }).then(r => r.json());
    
    hideLoader();
    
    if (res.ok) {
      A.sessionToken = res.token;
      localStorage.setItem('adminSessionToken', res.token);
      
      A.adminId = res.id;
      A.adminName = res.name;
      
      document.getElementById('loginErr').style.display = 'none';
      
      window.location.href = 'admin-dashboard.html';
    } else {
      document.getElementById('loginErr').innerHTML = '<i class="fa fa-exclamation-circle"></i> Invalid credentials. Please try again.';
      document.getElementById('loginErr').style.display = 'block';
    }
  } catch { 
    hideLoader();
    document.getElementById('loginErr').innerHTML = '<i class="fa fa-exclamation-circle"></i> Cannot connect to server.'; 
    document.getElementById('loginErr').style.display = 'block'; 
  }
}

async function doLogout() {
  if (A.sessionToken) {
    await fetch('/api/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: A.sessionToken })
    }).catch(() => {});
  }
  
  localStorage.removeItem('adminSessionToken');
  
  Object.assign(A, { 
    adminId:null, adminName:null,
    sessionToken: null
  });
  
  window.location.href = 'admin-login.html';
}

// LOAD USERS
async function loadUsers() {
  document.getElementById('usersList').innerHTML = '<div class="empty-exams"><i class="fa fa-spinner fa-spin"></i>Loading users…</div>';
  try {
    const res = await fetch('/api/users');
    const data = await res.json();
    
    if (!data || !data.students || !data.students.length) {
      document.getElementById('usersList').innerHTML = `<div class="empty-exams"><i class="fa fa-folder-open"></i>No users found.</div>`;
      return;
    }
    
    document.getElementById('usersList').innerHTML = data.students.map(u => `
      <div class="user-item">
        <div class="user-info">
          <div class="user-name">${u.name}</div>
          <div class="user-id">ID: ${u.id}</div>
          <div class="user-class">${u.class || 'N/A'}</div>
        </div>
        <div class="user-actions">
          <button class="btn-sm btn-outline" onclick="resetPassword('${u.id}')">
            <i class="fa fa-key"></i> Reset Password
          </button>
        </div>
      </div>`).join('');
  } catch {
    document.getElementById('usersList').innerHTML = `<div class="empty-exams"><i class="fa fa-exclamation-triangle"></i>Could not load users.</div>`;
  }
}

// RESET PASSWORD
async function resetPassword(userId) {
  const newPassword = prompt('Enter new password for this user:');
  if (!newPassword) return;
  
  showLoader('Resetting password…');
  try {
    const res = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newPassword })
    });
    const data = await res.json();
    
    hideLoader();
    if (data.ok) {
      toast('Password reset successfully', 'ok');
    } else {
      toast('Failed to reset password', 'err');
    }
  } catch {
    hideLoader();
    toast('Error resetting password', 'err');
  }
}

// LOAD AUDIT LOG
async function loadAuditLog() {
  document.getElementById('auditList').innerHTML = '<div class="empty-exams"><i class="fa fa-spinner fa-spin"></i>Loading audit log…</div>';
  try {
    const res = await fetch('/api/audit');
    const data = await res.json();
    
    if (!data || !data.length) {
      document.getElementById('auditList').innerHTML = `<div class="empty-exams"><i class="fa fa-folder-open"></i>No audit entries found.</div>`;
      return;
    }
    
    document.getElementById('auditList').innerHTML = data.map(entry => `
      <div class="audit-item">
        <div class="audit-info">
          <div class="audit-action">${entry.action}</div>
          <div class="audit-details">${entry.details || ''}</div>
        </div>
        <div class="audit-time">${new Date(entry.timestamp).toLocaleString()}</div>
      </div>`).join('');
  } catch {
    document.getElementById('auditList').innerHTML = `<div class="empty-exams"><i class="fa fa-exclamation-triangle"></i>Could not load audit log.</div>`;
  }
}
