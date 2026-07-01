// Teacher-specific JavaScript

// STATE
const T = {
  teacherId: null, teacherName: null, subject: null,
  sessionToken: localStorage.getItem('teacherSessionToken') || null
};

// SESSION CHECK
async function checkSession() {
  if (!T.sessionToken) return false;
  
  try {
    const res = await fetch('/api/check-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: T.sessionToken })
    });
    const data = await res.json();
    
    if (data.ok && data.role === 'teacher') {
      T.teacherId = data.id;
      T.teacherName = data.name;
      T.subject = data.subject;
      return true;
    }
  } catch {}
  
  localStorage.removeItem('teacherSessionToken');
  T.sessionToken = null;
  return false;
}

// AUTH
async function doLogin() {
  const id = document.getElementById('inId').value.trim();
  const password = document.getElementById('inPassword').value.trim();
  if (!id) {
    toast('Please enter your Teacher ID', 'err');
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
      body: JSON.stringify({ id, password, role: 'teacher' }) 
    }).then(r => r.json());
    
    hideLoader();
    
    if (res.ok) {
      T.sessionToken = res.token;
      localStorage.setItem('teacherSessionToken', res.token);
      
      T.teacherId = res.id;
      T.teacherName = res.name;
      T.subject = res.subject;
      
      document.getElementById('loginErr').style.display = 'none';
      
      window.location.href = 'teacher-dashboard.html';
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
  if (T.sessionToken) {
    await fetch('/api/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: T.sessionToken })
    }).catch(() => {});
  }
  
  localStorage.removeItem('teacherSessionToken');
  
  Object.assign(T, { 
    teacherId:null, teacherName:null, subject: null,
    sessionToken: null
  });
  
  window.location.href = 'teacher-login.html';
}

// LOAD EXAMS
async function loadExams() {
  document.getElementById('examList').innerHTML = '<div class="empty-exams"><i class="fa fa-spinner fa-spin"></i>Loading exams…</div>';
  try {
    const exams = await fetch('/api/exams').then(r => r.json());
    
    if (!exams.length) {
      document.getElementById('examList').innerHTML = `<div class="empty-exams"><i class="fa fa-folder-open"></i>No exams found.<br>Upload exam files to get started.</div>`;
      return;
    }
    
    document.getElementById('examList').innerHTML = exams.map(e => `
      <div class="exam-item">
        <div class="exam-item-info">
          <div class="exam-item-name">${e.name}</div>
          <div class="exam-item-meta">
            <span><i class="fa fa-question-circle"></i> ${e.questionCount} questions</span>
            <span><i class="fa fa-clock-o"></i> ${e.duration} min</span>
            ${e.subject ? `<span><i class="fa fa-book"></i> ${e.subject}</span>` : ''}
            ${e.class ? `<span><i class="fa fa-users"></i> ${e.class}</span>` : ''}
          </div>
        </div>
        <div class="exam-item-actions">
          <button class="btn-sm btn-outline" onclick="toggleExamStatus('${e.filename}', ${e.active !== false})">
            <i class="fa fa-${e.active !== false ? 'toggle-on' : 'toggle-off'}"></i> ${e.active !== false ? 'Disable' : 'Enable'}
          </button>
          <button class="btn-sm btn-danger" onclick="deleteExam('${e.filename}')">
            <i class="fa fa-trash"></i>
          </button>
        </div>
      </div>`).join('');
  } catch {
    document.getElementById('examList').innerHTML = `<div class="empty-exams"><i class="fa fa-exclamation-triangle"></i>Could not load exams. Check server connection.</div>`;
  }
}

// TOGGLE EXAM STATUS
async function toggleExamStatus(filename, currentStatus) {
  showLoader('Updating exam status…');
  try {
    const res = await fetch('/api/toggle-exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, teacherEnabled: !currentStatus })
    });
    const data = await res.json();
    
    hideLoader();
    if (data.ok) {
      toast('Exam status updated', 'ok');
      loadExams();
    } else {
      toast('Failed to update exam status', 'err');
    }
  } catch {
    hideLoader();
    toast('Error updating exam status', 'err');
  }
}

// DELETE EXAM
async function deleteExam(filename) {
  if (!confirm('Are you sure you want to delete this exam?')) return;
  
  showLoader('Deleting exam…');
  try {
    const res = await fetch('/api/delete-exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    });
    const data = await res.json();
    
    hideLoader();
    if (data.ok) {
      toast('Exam deleted successfully', 'ok');
      loadExams();
    } else {
      toast('Failed to delete exam', 'err');
    }
  } catch {
    hideLoader();
    toast('Error deleting exam', 'err');
  }
}

// LOAD RESULTS
async function loadResults() {
  document.getElementById('resultsList').innerHTML = '<div class="empty-exams"><i class="fa fa-spinner fa-spin"></i>Loading results…</div>';
  try {
    const results = await fetch('/api/results').then(r => r.json());
    
    if (!results.length) {
      document.getElementById('resultsList').innerHTML = `<div class="empty-exams"><i class="fa fa-folder-open"></i>No results found yet.</div>`;
      return;
    }
    
    document.getElementById('resultsList').innerHTML = results.map(r => `
      <div class="result-item">
        <div class="result-info">
          <div class="result-student">${r.student}</div>
          <div class="result-exam">${r.exam}</div>
        </div>
        <div class="result-score">${r.percentage}%</div>
      </div>`).join('');
  } catch {
    document.getElementById('resultsList').innerHTML = `<div class="empty-exams"><i class="fa fa-exclamation-triangle"></i>Could not load results.</div>`;
  }
}

// LOAD ACTIVE STUDENTS
let allActiveStudents = [];

async function loadActiveStudents() {
  document.getElementById('activeStudentsList').innerHTML = '<div class="empty-exams"><i class="fa fa-spinner fa-spin"></i>Loading active students…</div>';
  try {
    const students = await fetch('/api/active-students').then(r => r.json());
    allActiveStudents = students;
    renderActiveStudents(students);
  } catch {
    document.getElementById('activeStudentsList').innerHTML = `<div class="empty-exams"><i class="fa fa-exclamation-triangle"></i>Could not load active students.</div>`;
  }
}

function renderActiveStudents(students) {
  if (!students.length) {
    document.getElementById('activeStudentsList').innerHTML = `<div class="empty-exams"><i class="fa fa-folder-open"></i>No active students found.</div>`;
    return;
  }
  
  document.getElementById('activeStudentsList').innerHTML = students.map(s => `
    <div class="student-item">
      <div class="student-info">
        <div class="student-name">${s.name} (${s.id})</div>
        <div class="student-meta">
          <span><i class="fa fa-users"></i> ${s.class || 'N/A'}</span>
          ${s.exam ? `<span><i class="fa fa-file-text"></i> ${s.exam}</span>` : ''}
          <span><i class="fa fa-clock-o"></i> ${formatLastSeen(s.lastSeen)}</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        ${s.exam ? `<span class="student-status in-exam">In Exam</span>` : '<span class="student-status">Online</span>'}
        <button class="btn-sm btn-danger" onclick="logoutStudent('${s.token}', '${s.id}', '${s.name.replace(/'/g, "\\'")}')">
          <i class="fa fa-sign-out"></i> Logout
        </button>
      </div>
    </div>`).join('');
}

function formatLastSeen(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

// FILTER AND SEARCH STUDENTS
function filterStudents() {
  const searchTerm = document.getElementById('searchStudents').value.toLowerCase();
  const classFilter = document.getElementById('filterClass').value;
  
  const filtered = allActiveStudents.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm) || 
                         s.id.toLowerCase().includes(searchTerm);
    const matchesClass = !classFilter || s.class === classFilter;
    return matchesSearch && matchesClass;
  });
  
  renderActiveStudents(filtered);
}

// LOGOUT STUDENT
async function logoutStudent(token, studentId, studentName) {
  if (!confirm(`Are you sure you want to logout ${studentName}?`)) return;
  
  showLoader('Logging out student…');
  try {
    const res = await fetch('/api/force-logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: studentId })
    });
    const data = await res.json();
    
    hideLoader();
    if (data.ok) {
      toast(`${studentName} logged out successfully`, 'ok');
      loadActiveStudents();
      loadAllStudents();
    } else {
      toast('Failed to logout student', 'err');
    }
  } catch {
    hideLoader();
    toast('Error logging out student', 'err');
  }
}

// LOAD ALL STUDENTS
let allStudentsList = [];

async function loadAllStudents() {
  document.getElementById('allStudentsList').innerHTML = '<div class="empty-exams"><i class="fa fa-spinner fa-spin"></i>Loading all students…</div>';
  try {
    const students = await fetch('/api/students').then(r => r.json());
    allStudentsList = students;
    renderAllStudents(students);
  } catch {
    document.getElementById('allStudentsList').innerHTML = `<div class="empty-exams"><i class="fa fa-exclamation-triangle"></i>Could not load students.</div>`;
  }
}

function renderAllStudents(students) {
  if (!students.length) {
    document.getElementById('allStudentsList').innerHTML = `<div class="empty-exams"><i class="fa fa-folder-open"></i>No students found.</div>`;
    return;
  }
  
  document.getElementById('allStudentsList').innerHTML = students.map(s => `
    <div class="student-item">
      <div class="student-info">
        <div class="student-name">${s.name} (${s.id})</div>
        <div class="student-meta">
          <span><i class="fa fa-users"></i> ${s.class || 'N/A'}</span>
          <span><i class="fa fa-venus-mars"></i> ${s.gender || 'N/A'}</span>
          ${s.isActive ? `<span><i class="fa fa-circle" style="color:#059669;font-size:8px;"></i> Online</span>` : '<span><i class="fa fa-circle" style="color:#9ca3af;font-size:8px;"></i> Offline</span>'}
          ${s.currentExam ? `<span><i class="fa fa-file-text"></i> ${s.currentExam}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        ${s.isActive ? `<span class="student-status in-exam">Active</span>` : '<span class="student-status">Inactive</span>'}
        ${s.isActive ? `<button class="btn-sm btn-danger" onclick="logoutStudent('', '${s.id}', '${s.name.replace(/'/g, "\\'")}')">
          <i class="fa fa-sign-out"></i> Logout
        </button>` : ''}
      </div>
    </div>`).join('');
}

// FILTER AND SEARCH ALL STUDENTS
function filterAllStudents() {
  const searchTerm = document.getElementById('searchAllStudents').value.toLowerCase();
  const classFilter = document.getElementById('filterAllClass').value;
  
  const filtered = allStudentsList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm) || 
                         s.id.toLowerCase().includes(searchTerm);
    const matchesClass = !classFilter || s.class === classFilter;
    return matchesSearch && matchesClass;
  });
  
  renderAllStudents(filtered);
}
