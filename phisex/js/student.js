// Student-specific JavaScript

// STATE
const S = {
  studentId: null, studentName: null, studentClass: null,
  examFile: null, examName: null,
  questions: [], answers: {}, marked: new Set(),
  current: 0, timeLeft: 0, timer: null,
  tabViolations: 0, submitted: false,
  sessionInterval: null, netInterval: null, examPollInterval: null,
  sessionToken: localStorage.getItem('examSessionToken') || null,
  isLeaving: false,
  tabWarnedOnce: false,
  tabCountdownTimer: null,
  heartbeatInterval: null,
  submitRetries: 0,
  maxSubmitRetries: 3
};

// SESSION CHECK
async function checkSession() {
  if (!S.sessionToken) return false;
  
  try {
    const res = await fetch('/api/check-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: S.sessionToken })
    });
    const data = await res.json();
    
    if (data.ok) {
      S.studentId = data.id;
      S.studentName = data.name;
      S.studentClass = data.class;
      S.role = data.role;
      return true;
    }
  } catch {}
  
  localStorage.removeItem('examSessionToken');
  S.sessionToken = null;
  return false;
}

// HEARTBEAT - Send periodic heartbeat to maintain session
function startHeartbeat() {
  clearInterval(S.heartbeatInterval);
  S.heartbeatInterval = setInterval(async () => {
    if (!S.sessionToken) {
      clearInterval(S.heartbeatInterval);
      return;
    }
    try {
      await fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: S.sessionToken })
      });
    } catch {}
  }, 30000); // Send heartbeat every 30 seconds
}

// AUTH
async function doLogin() {
  const id = document.getElementById('inId').value.trim();
  const password = document.getElementById('inPassword').value.trim();
  if (!id) {
    toast('Please enter your Student ID', 'err');
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
      body: JSON.stringify({ id, password, role: 'student' }) 
    }).then(r => r.json());
    
    hideLoader();
    
    if (res.ok) {
      S.sessionToken = res.token;
      localStorage.setItem('examSessionToken', res.token);
      
      S.studentId = res.id;
      S.studentName = res.name;
      S.studentClass = res.class;
      
      document.getElementById('loginErr').style.display = 'none';
      
      startHeartbeat();
      
      window.location.href = 'student-dashboard.html';
    } else if (res.error === 'User already logged in on another device') {
      document.getElementById('loginErr').innerHTML = '<i class="fa fa-exclamation-circle"></i> This account is already logged in on another device.';
      document.getElementById('loginErr').style.display = 'block';
    } else {
      document.getElementById('loginErr').innerHTML = '<i class="fa fa-exclamation-circle"></i> Invalid Student ID. Please try again.';
      document.getElementById('loginErr').style.display = 'block';
    }
  } catch { 
    hideLoader();
    document.getElementById('loginErr').innerHTML = '<i class="fa fa-exclamation-circle"></i> Cannot connect to server.'; 
    document.getElementById('loginErr').style.display = 'block'; 
  }
}

async function doLogout() {
  if (S.sessionToken) {
    await fetch('/api/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: S.sessionToken })
    }).catch(() => {});
  }
  
  localStorage.removeItem('examSessionToken');
  clearInterval(S.timer); 
  clearInterval(S.sessionInterval); 
  clearInterval(S.netInterval);
  clearInterval(S.heartbeatInterval);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('beforeunload', onBeforeUnload);
  document.exitFullscreen?.();
  
  Object.assign(S, { 
    studentId:null, studentName:null, studentClass: null,
    examFile:null, examName:null, 
    questions:[], answers:{}, marked:new Set(), 
    current:0, timeLeft:0, timer:null, 
    sessionInterval:null, sessionToken: null,
    heartbeatInterval: null,
    isLeaving: false
  });
  
  window.location.href = 'student-login.html';
}

// CHECK TAKEN EXAMS
async function checkTakenExams() {
  try {
    const res = await fetch(`/api/student-taken-exams/${encodeURIComponent(S.studentId)}`);
    const data = await res.json();
    return { takenExams: data.takenExams || [], count: data.count || 0 };
  } catch {
    return { takenExams: [], count: 0 };
  }
}

// GET AVAILABLE EXAMS COUNT
async function getAvailableExamsCount() {
  try {
    const res = await fetch(`/api/available-exams-count/${encodeURIComponent(S.studentId)}?class=${encodeURIComponent(S.studentClass || '')}`);
    const data = await res.json();
    return data.available || 0;
  } catch {
    return 0;
  }
}

// LOAD EXAMS
async function loadExams() {
  document.getElementById('examList').innerHTML = '<div class="empty-exams"><i class="fa fa-spinner fa-spin"></i>Loading exams…</div>';
  try {
    const url = S.studentClass ? `/api/exams?class=${encodeURIComponent(S.studentClass)}` : '/api/exams';
    const exams = await fetch(url).then(r => r.json());
    
    const { takenExams } = await checkTakenExams();
    const activeExams = exams.filter(e => e.active !== false);
    
    if (!activeExams.length) {
      document.getElementById('examList').innerHTML = `<div class="empty-exams"><i class="fa fa-folder-open"></i>No exams available for your class (${S.studentClass || 'SS 1'}).<br>Please check with your teacher.</div>`;
      return;
    }
    
    document.getElementById('examList').innerHTML = activeExams.map(e => {
      const hasTaken = takenExams.includes(e.filename);
      return `
      <div class="exam-card ${hasTaken ? 'taken' : ''}">
        <div class="exam-icon"><i class="fa ${hasTaken ? 'fa-check-circle' : 'fa-file-text'}"></i></div>
        <div class="exam-info">
          <div class="exam-name">${e.name} ${hasTaken ? '<span style="color:#666;font-size:12px;">(Completed)</span>' : ''}</div>
          <div class="exam-meta">
            <span><i class="fa fa-clock-o"></i> ${e.duration} min</span>
            <span><i class="fa fa-question-circle"></i> ${e.questionCount} questions</span>
            ${e.subject ? `<span><i class="fa fa-book"></i> ${e.subject}</span>` : ''}
            ${e.class ? `<span><i class="fa fa-users"></i> ${e.class}</span>` : '<span><i class="fa fa-globe"></i> All Classes</span>'}
          </div>
        </div>
        ${hasTaken 
          ? '<button class="btn-start" style="background:#999;cursor:not-allowed;" disabled><i class="fa fa-check"></i> Already Taken</button>'
          : `<button class="btn-start" onclick="openRules('${e.filename}', '${e.name.replace(/'/g,"\\'")}', ${e.questionCount}, ${e.duration})"><i class="fa fa-play"></i> Start</button>`
        }
      </div>`;
    }).join('');
    
    document.getElementById('selectSub').textContent = `${activeExams.length} exam${activeExams.length>1?'s':''} available for your class`;
  } catch {
    document.getElementById('examList').innerHTML = `<div class="empty-exams"><i class="fa fa-exclamation-triangle"></i>Could not load exams. Check server connection.</div>`;
  }
}

// OPEN RULES
function openRules(filename, name, qcount, duration) {
  fetch(`/api/has-taken-exam/${encodeURIComponent(S.studentId)}/${encodeURIComponent(filename)}`)
    .then(r => r.json())
    .then(data => {
      if (data.hasTaken) {
        toast('You have already taken this exam', 'err');
        loadExams();
        return;
      }
      
      S.examFile = filename;
      S.examName = name;
      localStorage.setItem('examFile', filename);
      localStorage.setItem('examName', name);
      localStorage.setItem('examQcount', qcount);
      localStorage.setItem('examDuration', duration);
      
      window.location.href = 'student-rules.html';
    })
    .catch(() => {
      S.examFile = filename;
      S.examName = name;
      localStorage.setItem('examFile', filename);
      localStorage.setItem('examName', name);
      localStorage.setItem('examQcount', qcount);
      localStorage.setItem('examDuration', duration);
      
      window.location.href = 'student-rules.html';
    });
}

// CONTINUE AFTER SUBMIT
async function continueAfterSubmit() {
  showLoader('Checking available exams…');
  const availableCount = await getAvailableExamsCount();
  hideLoader();
  
  if (availableCount > 0) {
    window.location.href = 'student-dashboard.html';
    toast(`${availableCount} more exam(s) available`, 'ok');
  } else {
    window.location.href = 'student-completed.html';
  }
}

// SHOW COMPLETION SCREEN
async function showCompletionScreen() {
  try {
    const results = await fetch('/api/results').then(r => r.json());
    const studentResults = Array.isArray(results) ? results.filter(r => r.studentId === S.studentId) : [];
    const totalExams = studentResults.length;
    const avgScore = totalExams > 0 
      ? Math.round(studentResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalExams)
      : 0;
    
    document.getElementById('completedTotal').textContent = totalExams;
    document.getElementById('completedAvg').textContent = avgScore + '%';
  } catch {
    document.getElementById('completedTotal').textContent = '0';
    document.getElementById('completedAvg').textContent = '0%';
  }
}

// BEGIN EXAM
async function beginExam() {
  showLoader('Loading exam questions…');
  try {
    const data = await fetch('/api/exam/' + encodeURIComponent(S.examFile)).then(r => r.json());
    hideLoader();
    if (data.error) { alert(data.error || 'Exam unavailable.'); return; }
    if (!data || !data.questions || !data.questions.length) { alert('Could not load exam questions. Try again.'); return; }

    if (data.class && S.studentClass && data.class.toLowerCase() !== S.studentClass.toLowerCase()) {
      alert('This exam is not available for your class.');
      window.location.href = 'student-dashboard.html';
      return;
    }

    S.questions = shuffle(data.questions).map((q, i) => ({ ...q, _idx: i, _options: shuffleOpts(q) }));
    S.answers = {};
    S.marked = new Set();
    S.current = 0;
    S.submitted = false;
    S.tabViolations = 0;
    S.tabWarnedOnce = false;
    if (S.tabCountdownTimer) { clearInterval(S.tabCountdownTimer); S.tabCountdownTimer = null; }
    S.timeLeft = (data.duration || 30) * 60;
    S.examName = data.exam;

    loadDraft();

    document.getElementById('etExamName').innerHTML = `<i class="fa fa-file-text"></i> ${data.exam}`;
    document.getElementById('etStudent').innerHTML = `<i class="fa fa-user"></i> ${S.studentName}`;
    document.getElementById('subStudentName').innerHTML = `<i class="fa fa-user"></i> ${S.studentName}`;
    document.getElementById('subExamName').innerHTML = `<i class="fa fa-file-text"></i> ${data.exam}`;
    document.getElementById('violBadge').innerHTML = `<i class="fa fa-exclamation-triangle"></i> <span>0</span>`;

    buildQGrid();
    renderQuestion();
    startTimer();
    startSessionPing();
    setupTabTracking();

    window.scrollTo(0, 0);
    document.documentElement.requestFullscreen?.().catch(() => {});
  } catch (e) {
    hideLoader();
    alert('Error loading exam: ' + e.message);
  }
}

// TAB TRACKING
function handleTabViolation(autoSubmit = false) {
  if (S.submitted) return;
  
  S.tabViolations++;
  
  fetch('/api/tabviolation', { 
    method:'POST', 
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ studentId: S.studentId, student: S.studentName, exam: S.examName, count: S.tabViolations }) 
  }).catch(() => {});

  const badge = document.getElementById('violBadge');
  badge.innerHTML = `<i class="fa fa-exclamation-triangle"></i> <span>${S.tabViolations}</span>`;
  badge.classList.add('warn');

  const warningBar = document.getElementById('tabWarningBar');
  warningBar.classList.add('show');
  
  if (autoSubmit) {
    setTimeout(() => {
      if (!S.submitted) doSubmit();
    }, 500);
  }
}

function onVisibilityChange() {
  if (S.submitted) return;
  
  if (document.visibilityState === 'hidden') {
    S.tabViolations++;
    fetch('/api/tabviolation', { 
      method:'POST', 
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ studentId: S.studentId, student: S.studentName, exam: S.examName, count: S.tabViolations }) 
    }).catch(() => {});
    
    const badge = document.getElementById('violBadge');
    badge.innerHTML = `<i class="fa fa-exclamation-triangle"></i> <span>${S.tabViolations}</span>`;
    badge.classList.add('warn');
    document.getElementById('tabWarningBar').classList.add('show');
    
    if (!S.tabWarnedOnce) {
      S.tabWarnedOnce = true;
      const warningBar = document.getElementById('tabWarningBar');
      document.getElementById('tabWarningText').innerHTML = 
        'WARNING: You left the exam tab! <strong>Return immediately or your exam will be submitted in <span id="tabCountdown">30</span>s!</strong>';
      
      let countdown = 30;
      const cdEl = () => document.getElementById('tabCountdown');
      if (S.tabCountdownTimer) clearInterval(S.tabCountdownTimer);
      S.tabCountdownTimer = setInterval(() => {
        countdown--;
        if (cdEl()) cdEl().textContent = countdown;
        if (countdown <= 0) {
          clearInterval(S.tabCountdownTimer);
          S.tabCountdownTimer = null;
          if (!S.submitted) doSubmit();
        }
      }, 1000);
    } else {
      if (S.tabCountdownTimer) clearInterval(S.tabCountdownTimer);
      setTimeout(() => {
        if (!S.submitted) doSubmit();
      }, 500);
    }
  } else if (document.visibilityState === 'visible') {
    if (S.tabWarnedOnce && S.tabCountdownTimer) {
      clearInterval(S.tabCountdownTimer);
      S.tabCountdownTimer = null;
      document.getElementById('tabWarningText').innerHTML = 
        'WARNING: Tab violation recorded! <strong>If you leave this tab again, your exam will be AUTOMATICALLY SUBMITTED!</strong>';
      openModal('modalTabWarn');
    }
  }
}

function onBeforeUnload(e) {
  if (S.submitted) return;
  openModal('modalTabWarn');
  e.preventDefault();
  e.returnValue = 'If you leave this page, your exam will be submitted!';
  return 'If you leave this page, your exam will be submitted!';
}

function setupTabTracking() {
  document.removeEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('beforeunload', onBeforeUnload);
  window.addEventListener('beforeunload', onBeforeUnload);
}

// DRAFT SAVE/LOAD
function saveDraft() {
  if (!S.studentId || !S.examFile) return;
  try {
    localStorage.setItem(`draft_${S.studentId}_${S.examFile}`, JSON.stringify({
      answers: S.answers, marked: [...S.marked], timeLeft: S.timeLeft
    }));
  } catch {}
}

function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(`draft_${S.studentId}_${S.examFile}`));
    if (d) {
      if (d.answers) S.answers = d.answers;
      if (d.marked) S.marked = new Set(d.marked);
      if (d.timeLeft && d.timeLeft > 0) S.timeLeft = d.timeLeft;
    }
  } catch {}
}

function clearDraft() {
  try { localStorage.removeItem(`draft_${S.studentId}_${S.examFile}`); } catch {}
}

// SESSION PING
function startSessionPing() {
  clearInterval(S.sessionInterval);
  S.sessionInterval = setInterval(() => {
    if (S.submitted) { clearInterval(S.sessionInterval); return; }
    const answered = Object.keys(S.answers).length;
    fetch('/api/session', { 
      method:'POST', 
      headers:{'Content-Type':'application/json'}, 
      body: JSON.stringify({
        studentId: S.studentId, student: S.studentName, exam: S.examName,
        timeLeft: S.timeLeft, answered, total: S.questions.length,
        tabViolations: S.tabViolations, status: 'active'
      }) 
    }).catch(() => {});
    saveDraft();
  }, 10000);
}

// TIMER
function startTimer() {
  clearInterval(S.timer);
  updateTimerDisplay();
  S.timer = setInterval(() => {
    S.timeLeft--;
    updateTimerDisplay();
    if (S.timeLeft <= 0) { clearInterval(S.timer); doSubmit(); }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(S.timeLeft / 60), s = S.timeLeft % 60;
  const el = document.getElementById('timer');
  el.innerHTML = `<i class="fa fa-hourglass-${S.timeLeft < 60 ? 'empty' : 'half'}"></i> <span>${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}</span>`;
  el.className = 'timer' + (S.timeLeft < 60 ? ' danger' : S.timeLeft < 300 ? ' warn' : '');
}

// QUESTION FUNCTIONS
function shuffleOpts(q) {
  return shuffle(['A','B','C','D'].filter(k => q[k] !== undefined).map(k => ({ key: k, text: q[k] })));
}

function buildQGrid() {
  document.getElementById('qGrid').innerHTML = S.questions.map((_, i) => `
    <div class="qb ${i === S.current ? 'current' : ''} ${S.answers[i] ? 'answered' : ''} ${S.marked.has(i) ? 'marked' : ''}"
      onclick="goTo(${i})">${i + 1}</div>`).join('');
}

function renderQuestion() {
  const q = S.questions[S.current];
  const total = S.questions.length;
  const answered = Object.keys(S.answers).length;

  document.getElementById('qNum').innerHTML = `<i class="fa fa-question-circle"></i> QUESTION ${S.current + 1} OF ${total}`;
  
  let tableHTML = '';
  if (q.Table && q.Table.headers && q.Table.data) {
    tableHTML = '<table class="question-table">';
    tableHTML += '<tr>' + q.Table.headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
    tableHTML += '<tr>' + q.Table.data.map(d => `<td>${d}</td>`).join('') + '</tr>';
    tableHTML += '</table>';
  }
  
  document.getElementById('qText').innerHTML = tableHTML + q.question;

  const markBtn = document.getElementById('markBtn');
  markBtn.className = 'q-mark-btn' + (S.marked.has(S.current) ? ' marked' : '');
  markBtn.innerHTML = S.marked.has(S.current) 
    ? '<i class="fa fa-flag"></i> Marked for Review' 
    : '<i class="fa fa-flag-o"></i> Mark for Review';

  document.getElementById('optsList').innerHTML = q._options.map(opt => `
    <div class="opt ${S.answers[S.current] === opt.key ? 'selected' : ''}" onclick="selectAns('${opt.key}')">
      <div class="opt-key">${opt.key}</div>
      <div class="opt-text">${opt.text}</div>
    </div>`).join('');

  document.getElementById('btnPrev').disabled = S.current === 0;
  document.getElementById('btnNext').disabled = S.current === total - 1;

  document.getElementById('progressText').innerHTML = `<i class="fa fa-pie-chart"></i> ${answered} of ${total} answered`;
  document.getElementById('progFill').style.width = `${(answered / total) * 100}%`;

  buildQGrid();
  updateSubmitLock();
}

function selectAns(key) {
  if (S.submitted) return;
  S.answers[S.current] = key;
  saveDraft();
  renderQuestion();
}

function toggleMark() {
  if (S.marked.has(S.current)) S.marked.delete(S.current);
  else S.marked.add(S.current);
  renderQuestion();
}

function navigate(dir) {
  const next = S.current + dir;
  if (next >= 0 && next < S.questions.length) { S.current = next; renderQuestion(); }
}

function goTo(i) { S.current = i; renderQuestion(); }

function updateSubmitLock() {
  const answered = Object.keys(S.answers).length;
  const total = S.questions.length;
  const pct = total > 0 ? (answered / total) * 100 : 0;
  const threshold = 60;
  const unlocked = pct >= threshold;
  const btn = document.getElementById('btnSubmitSidebar');
  const info = document.getElementById('submitLockInfo');
  if (btn) {
    btn.style.opacity = unlocked ? '1' : '0.4';
    btn.style.pointerEvents = unlocked ? 'all' : 'none';
  }
  if (info) {
    info.textContent = unlocked
      ? `${answered}/${total} answered (${Math.round(pct)}%)`
      : `Answer ${threshold}% to unlock (${answered}/${total})`;
  }
}

// SUBMIT
function confirmSubmit() {
  const answered = Object.keys(S.answers).length;
  const total = S.questions.length;
  const unanswered = total - answered;
  document.getElementById('modalSubmitMsg').innerHTML = unanswered > 0
    ? `You have answered ${answered} of ${total} questions. ${unanswered} question${unanswered > 1 ? 's are' : ' is'} unanswered. Are you sure you want to submit?`
    : `You have answered all ${total} questions. Are you sure you want to submit?`;
  openModal('modalSubmit');
}

async function doSubmit() {
  if (S.submitted) return;
  S.submitted = true;
  
  clearInterval(S.timer);
  clearInterval(S.sessionInterval);
  clearInterval(S.heartbeatInterval);
  document.getElementById('tabWarningBar').classList.remove('show');
  closeModal('modalSubmit'); closeModal('modalTabWarn');
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('beforeunload', onBeforeUnload);
  
  showLoader('Submitting exam…');

  let score = 0;
  const answerArr = S.questions.map((q, i) => {
    const ans = S.answers[i] || null;
    if (ans === q.answer) score++;
    return ans;
  });
  const total = S.questions.length;
  const pct = Math.round((score / total) * 100);

  S.submitRetries = 0;
  const submitSuccess = await submitWithRetry({
    student: S.studentName, studentId: S.studentId, exam: S.examName,
    examFilename: S.examFile,
    score, total, percentage: pct, answers: answerArr,
    tabViolations: S.tabViolations
  });

  if (submitSuccess) {
    hideLoader();
    clearDraft();
    document.exitFullscreen?.().catch(() => {});
    
    const availableCount = await getAvailableExamsCount();
    if (availableCount > 0) {
      window.location.href = 'student-submitted.html';
    } else {
      window.location.href = 'student-completed.html';
    }
  } else {
    hideLoader();
    S.submitted = false;
    showSubmitErrorModal();
  }
}

async function submitWithRetry(submitData) {
  for (let attempt = 1; attempt <= S.maxSubmitRetries; attempt++) {
    try {
      const res = await fetch('/api/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });
      
      if (res.ok) {
        const data = await res.json();
        
        if (data.highestMark !== undefined) {
          const highestMarkEl = document.getElementById('highestMarkDisplay');
          if (highestMarkEl) {
            highestMarkEl.textContent = `Class Highest: ${data.highestMark}%`;
            highestMarkEl.style.display = 'block';
          }
        }
        return true;
      }
    } catch (e) {
      console.error(`Submit attempt ${attempt} failed:`, e.message);
    }
    
    if (attempt < S.maxSubmitRetries) {
      showLoader(`Connection failed. Retrying in 10 seconds... (${attempt}/${S.maxSubmitRetries})`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  return false;
}

function showSubmitErrorModal() {
  const errorModal = document.createElement('div');
  errorModal.className = 'modal-overlay';
  errorModal.style.display = 'flex';
  errorModal.innerHTML = `
    <div class="modal danger-modal">
      <div class="modal-header">
        <i class="fa fa-exclamation-triangle"></i>
        <h3>Submission Failed</h3>
        <p><strong>Not connected to server. Contact admin.</strong></p>
        <p style="margin-top:8px;font-size:13px;color:#555;">Your exam answers have been saved locally. Please try again when connection is restored.</p>
      </div>
      <div class="modal-body">
        <div class="modal-actions">
          <button class="primary" onclick="retrySubmit()">Try Again</button>
          <button onclick="closeSubmitErrorModal()">Cancel</button>
        </div>
      </div>
    </div>
  `;
  errorModal.id = 'modalSubmitError';
  document.body.appendChild(errorModal);
}

function closeSubmitErrorModal() {
  const modal = document.getElementById('modalSubmitError');
  if (modal) {
    modal.remove();
  }
}

async function retrySubmit() {
  closeSubmitErrorModal();
  await doSubmit();
}

function backToSelect() {
  window.location.href = 'student-dashboard.html';
}

// KEYBOARD SHORTCUTS
document.addEventListener('keydown', e => {
  const inExam = document.getElementById('s-exam') && document.getElementById('s-exam').style.display !== 'none';
  if (!inExam) return;
  
  const blocked = [
    e.ctrlKey && ['c','v','x','a','p','s','u'].includes(e.key.toLowerCase()),
    e.metaKey && ['c','v','x','a','p','s','u'].includes(e.key.toLowerCase()),
    e.key === 'F12', e.key === 'F5',
    e.ctrlKey && e.shiftKey && ['i','j','c'].includes(e.key.toLowerCase()),
    e.altKey && e.key === 'Tab'
  ];
  if (blocked.some(Boolean)) { 
    e.preventDefault(); 
    handleTabViolation(true);
    return;
  }

  if (e.key === 'n' || e.key === 'N' || e.key === 'ArrowRight') { navigate(1); e.preventDefault(); return; }
  if (e.key === 'p' || e.key === 'P' || e.key === 'ArrowLeft') { navigate(-1); e.preventDefault(); return; }
  if (['a','b','c','d'].includes(e.key.toLowerCase())) {
    e.preventDefault();
    const key = e.key.toUpperCase();
    const q = S.questions[S.current];
    if (q && q._options.find(o => o.key === key)) { selectAns(key); return; }
  }
});
