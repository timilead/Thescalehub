// SECTION 0: FIREBASE CONFIGURATION
// ====================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD7G0hRDVgIrPe41DcZbOYr7IQNVgiYfbg",
  authDomain: "thescalehub-af93c.firebaseapp.com",
  projectId: "thescalehub-af93c",
  storageBucket: "thescalehub-af93c.firebasestorage.app",
  messagingSenderId: "505853196686",
  appId: "1:505853196686:web:f696da2ad65db81b9e0cdf",
  measurementId: "G-JW2LTBEMFW"
};

const ADMIN_EMAILS = ['lovotimi@gmail.com'];

// Global Firebase state
let firebaseReady = false;
let currentUser = null;
let db = null;
let auth = null;
let currentPage = 'home';

/** Initialize Firebase - called on DOMContentLoaded */

function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK not loaded. Running in local mode.');
      return;
    }
    if (FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY_HERE') {
      console.warn('Firebase not configured. Running in local mode. Update FIREBASE_CONFIG in app.js.');
      return;
    }

    firebase.initializeApp(FIREBASE_CONFIG);
    auth = firebase.auth();
    db = firebase.firestore();
    firebaseReady = true;

    // Auth state observer
    
    auth.onAuthStateChanged((user) => {
      currentUser = user;
      renderNavbar(currentPage);
    });

    console.log('Firebase initialized successfully.');
  } catch (err) {
    console.error('Firebase init error:', err);
    firebaseReady = false;
  }
}

document.addEventListener('DOMContentLoaded', initFirebase);


// =====================================

// SECTION 1: AUTHENTICATION

// =====================================

function isAuthenticated() {
  if (!firebaseReady) return true;
  
  // local mode — allow access
  
  return currentUser !== null;
}

function isAdmin() {
  if (!currentUser) return false;
  return ADMIN_EMAILS.includes(currentUser.email.toLowerCase());
}

function requireAuth(msg) {
  if (!isAuthenticated()) {
    showAuthModal('register', msg || 'Create a free account to continue learning.');
    return false;
  }
  return true;
}

/** Show the Auth modal */
function showAuthModal(mode, message) {
  mode = mode || 'register';
  message = message || '';
  const existing = document.getElementById('authModal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'authModal';
  overlay.className = 'auth-overlay';
  overlay.innerHTML = `
    <div class="auth-card">
      <button class="auth-close" onclick="closeAuthModal()">&times;</button>
      <div class="auth-header">
        <div class="auth-brand"><span class="logo-icon">📈</span> TheScaleHub</div>
        ${message ? `<p class="auth-msg">${message}</p>` : ''}
        <div class="auth-tabs">
          <button class="auth-tab ${mode === 'login' ? 'active' : ''}" onclick="switchAuthTab('login')">Log In</button>
          <button class="auth-tab ${mode === 'register' ? 'active' : ''}" onclick="switchAuthTab('register')">Register</button>
        </div>
      </div>

      <!-- Login -->
      
      <form id="loginForm" class="${mode === 'login' ? '' : 'hidden'}" onsubmit="return handleLogin(event)">
        <div class="form-group"><label>Email</label><input type="email" id="loginEmail" required placeholder="you@example.com"></div>
        <div class="form-group"><label>Password</label><input type="password" id="loginPass" required placeholder="Your password" minlength="6"></div>
        <div id="loginError" class="auth-error hidden"></div>
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%;" id="loginBtn">🔑 Log In</button>
      </form>

      <!-- Register -->
      
      <form id="registerForm" class="${mode === 'register' ? '' : 'hidden'}" onsubmit="return handleRegister(event)">
        <div class="form-group"><label>Full Name</label><input type="text" id="regName" required placeholder="Your full name"></div>
        <div class="form-group"><label>Email</label><input type="email" id="regEmail" required placeholder="you@example.com"></div>
        <div class="form-group"><label>Password</label><input type="password" id="regPass" required placeholder="At least 6 characters" minlength="6"></div>
        <div class="form-group"><label>Referral Code <span style="color:var(--gray-400);font-weight:400;">(optional)</span></label><input type="text" id="regRef" placeholder="e.g. TSH-ABCD1234"></div>
        <div id="regError" class="auth-error hidden"></div>
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%;" id="regBtn">🚀 Create Account</button>
      </form>

      <p class="auth-legal">By continuing you agree to our <a href="privacy.html">Privacy Policy</a></p>
    </div>
  `;

  document.body.appendChild(overlay);

  // Pre-fill referral code from URL
  
  const ref = new URLSearchParams(window.location.search).get('ref');
  if (ref) { const el = document.getElementById('regRef'); if (el) el.value = ref; }

  requestAnimationFrame(() => overlay.classList.add('active'));
}

function closeAuthModal() {
  const m = document.getElementById('authModal');
  if (m) { m.classList.remove('active'); setTimeout(() => m.remove(), 300); }
}

function switchAuthTab(tab) {
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
}

async function handleLogin(e) {
  e.preventDefault();
  if (!firebaseReady) { showErr('login', 'Firebase not configured.'); return false; }
  const btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.textContent = 'Logging in...'; hideErr('login');
  try {
    await auth.signInWithEmailAndPassword(
      document.getElementById('loginEmail').value,
      document.getElementById('loginPass').value
    );
    closeAuthModal();
    location.reload();
  } catch (err) { showErr('login', friendlyError(err.code)); }
  finally { btn.disabled = false; btn.textContent = '🔑 Log In'; }
  return false;
}

async function handleRegister(e) {
  e.preventDefault();
  if (!firebaseReady) { showErr('reg', 'Firebase not configured.'); return false; }
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const pass = document.getElementById('regPass').value;
  const refCode = document.getElementById('regRef').value.trim();
  const btn = document.getElementById('regBtn');
  btn.disabled = true; btn.textContent = 'Creating account...'; hideErr('reg');
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    await cred.user.updateProfile({ displayName: name });
    const myRefCode = 'TSH-' + cred.user.uid.substring(0, 8).toUpperCase();
    await db.collection('users').doc(cred.user.uid).set({
      name, email,
      referralCode: myRefCode,
      referredBy: refCode || null,
      referralCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      isAdmin: ADMIN_EMAILS.includes(email.toLowerCase())
    });
    if (refCode) await processReferral(refCode, cred.user.uid, email);
    closeAuthModal();
    location.reload();
  } catch (err) { showErr('reg', friendlyError(err.code)); }
  finally { btn.disabled = false; btn.textContent = '🚀 Create Account'; }
  return false;
}

async function handleLogout() {
  if (firebaseReady && auth) { await auth.signOut(); currentUser = null; }
  localStorage.removeItem('courseProgress');
  window.location.href = 'index.html';
}

function showErr(f, m) { const el = document.getElementById(f + 'Error'); if (el) { el.textContent = m; el.classList.remove('hidden'); } }
function hideErr(f) { const el = document.getElementById(f + 'Error'); if (el) el.classList.add('hidden'); }
function friendlyError(code) {
  const map = {
    'auth/email-already-in-use': 'Email already registered. Try logging in.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/too-many-requests': 'Too many attempts. Try later.',
    'auth/invalid-credential': 'Invalid email or password.',
  };
  return map[code] || 'An error occurred. Please try again.';
}


// =====================================

// SECTION 2: REFERRAL SYSTEM

// =====================================

async function processReferral(refCode, newUid, newEmail) {
  if (!firebaseReady || !db) return;
  try {
    const snap = await db.collection('users').where('referralCode', '==', refCode).limit(1).get();
    if (!snap.empty) {
      const referrerId = snap.docs[0].id;
      await db.collection('referrals').add({
        referrerId, referredId: newUid, referredEmail: newEmail,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await db.collection('users').doc(referrerId).update({
        referralCount: firebase.firestore.FieldValue.increment(1)
      });
    }
  } catch (err) { console.error('Referral error:', err); }
}

async function getUserData() {
  if (!firebaseReady || !currentUser) return null;
  try {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    return doc.exists ? doc.data() : null;
  } catch (e) { return null; }
}


// =====================================

// SECTION 3: PROGRESS MANAGEMENT

// =====================================

function getProgress() {
  const s = localStorage.getItem('courseProgress');
  return s ? JSON.parse(s) : { completedModules: [], quizScores: {} };
}
function saveProgress(p) { localStorage.setItem('courseProgress', JSON.stringify(p)); }

function completeModule(moduleId, score) {
  const p = getProgress();
  if (!p.completedModules.includes(moduleId)) p.completedModules.push(moduleId);
  p.quizScores[moduleId] = score;
  saveProgress(p);
}

function isModuleUnlocked(id) {
  if (id === 1) return true;
  return getProgress().completedModules.includes(id - 1);
}
function isModuleCompleted(id) { return getProgress().completedModules.includes(id); }
function getProgressPercentage() { return Math.round((getProgress().completedModules.length / MODULES.length) * 100); }
function isCourseComplete() { return getProgress().completedModules.length === MODULES.length; }
function resetProgress() { localStorage.removeItem('courseProgress'); }


// =====================================

// SECTION 4: NAVIGATION

// =====================================

function renderNavbar(activePage) {
  currentPage = activePage;
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const loggedIn = firebaseReady && currentUser;
  const adm = isAdmin();
  const initial = currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : '?';
  const displayName = currentUser?.displayName || currentUser?.email || '';

  nav.innerHTML = `
    <nav class="navbar" role="navigation">
      <div class="navbar-inner">
        <a href="index.html" class="navbar-logo">
          <span class="logo-icon">📈</span>
          <span>TheScaleHub Academy</span>
        </a>
        <div class="navbar-links" id="navLinks">
          <a href="index.html" class="${activePage === 'home' ? 'active' : ''}">Home</a>
          <a href="dashboard.html" class="${activePage === 'dashboard' ? 'active' : ''}">Dashboard</a>
          <a href="blog.html" class="${activePage === 'blog' ? 'active' : ''}">Blog</a>
          <a href="video-course.html" class="${activePage === 'video' ? 'active' : ''}" style="display:inline-flex;align-items:center;gap:0.35rem;">🎬 Video Course <span class="nav-soon-badge">SOON</span></a>
          <a href="about.html" class="${activePage === 'about' ? 'active' : ''}">About</a>
          <a href="contact.html" class="${activePage === 'contact' ? 'active' : ''}">Contact</a>
          ${adm ? `<a href="admin.html" class="${activePage === 'admin' ? 'active' : ''}">⚙️ Admin</a>` : ''}
          ${isCourseComplete() ? `<a href="complete.html" class="${activePage === 'complete' ? 'active' : ''}">🏆 Certificate</a>` : ''}
          ${loggedIn
            ? `<div class="nav-user-wrap">
                <button class="nav-user-btn" onclick="document.getElementById('userDrop').classList.toggle('open')">
                  <span class="nav-avatar">${initial}</span>
                  <span class="nav-uname">${displayName}</span>
                </button>
                <div class="nav-dropdown" id="userDrop">
                  <div class="nav-drop-email">${currentUser.email}</div>
                  <a href="dashboard.html">📊 Dashboard</a>
                  ${adm ? '<a href="admin.html">⚙️ Admin Panel</a>' : ''}
                  <button onclick="handleLogout()">🚪 Log Out</button>
                </div>
              </div>`
            : `<button onclick="showAuthModal('login')" class="btn btn-sm nav-login-btn">Login / Register</button>`
          }
        </div>
        <button class="navbar-toggle" onclick="toggleNav()" aria-label="Toggle menu">☰</button>
      </div>
    </nav>
  `;
}

function toggleNav() {
  const l = document.getElementById('navLinks');
  if (l) l.classList.toggle('open');
}

// Close dropdown on outside click

document.addEventListener('click', (e) => {
  const d = document.getElementById('userDrop');
  if (d && !e.target.closest('.nav-user-wrap')) d.classList.remove('open');
});


// =====================================

// SECTION 5: DASHBOARD RENDERING

// =====================================

async function renderDashboard() {
  const progress = getProgress();
  const pct = getProgressPercentage();
  const bar = document.getElementById('progressBar');
  const txt = document.getElementById('progressText');
  if (bar) bar.style.width = pct + '%';
  if (txt) txt.textContent = `${progress.completedModules.length} of ${MODULES.length} modules completed (${pct}%)`;

  // Referral section
  await renderReferralSection();

  // Module cards
  const grid = document.getElementById('modulesGrid');
  if (!grid) return;

  grid.innerHTML = MODULES.map(mod => {
    const completed = isModuleCompleted(mod.id);
    const unlocked = isModuleUnlocked(mod.id);
    let cls = '', icon = '', label = '';
    if (completed) { cls = 'completed'; icon = '✅'; label = 'Completed'; }
    else if (unlocked) { icon = '▶️'; label = 'Start'; }
    else { cls = 'locked'; icon = '🔒'; label = 'Locked'; }

    const scoreHtml = progress.quizScores[mod.id] !== undefined
      ? `<br><small style="color:var(--success);">Score: ${progress.quizScores[mod.id]}%</small>` : '';

    const needsAuth = mod.id > 1 && !isAuthenticated();
    const click = needsAuth
      ? `showAuthModal('register','Create a free account to access Module ${mod.id}.')`
      : (unlocked ? `window.location.href='module.html?id=${mod.id}'` : 'void(0)');

    return `
      <div class="module-card ${cls}" onclick="${click}" title="${!unlocked ? 'Complete previous module first' : ''}">
        <div class="module-number">${completed ? '✓' : mod.id}</div>
        <div class="module-info">
          <h3>${mod.title}</h3>
          <p>${mod.description}${scoreHtml}</p>
        </div>
        <div class="module-status" title="${label}">${icon}</div>
      </div>
    `;
  }).join('');
}

async function renderReferralSection() {
  const c = document.getElementById('referralSection');
  if (!c) return;
  if (!firebaseReady || !currentUser) {
    c.innerHTML = `
      <div class="referral-card">
        <div class="referral-icon-big">🔗</div>
        <h3>Refer & Earn</h3>
        <p>Log in to get your personal referral link and share it with friends!</p>
        <button onclick="showAuthModal('login','Log in to get your referral link.')" class="btn btn-primary btn-sm">Get Referral Link</button>
      </div>`;
    return;
  }
  const data = await getUserData();
  const code = data?.referralCode || ('TSH-' + currentUser.uid.substring(0, 8).toUpperCase());
  const count = data?.referralCount || 0;
  const link = window.location.origin + '/index.html?ref=' + code;
  c.innerHTML = `
    <div class="referral-card">
      <div class="referral-top"><div class="referral-icon-big">🔗</div><div><h3>Your Referral Link</h3><p>Share and earn rewards when people sign up!</p></div></div>
      <div class="ref-link-box">
        <input type="text" value="${link}" id="refLinkInput" readonly>
        <button onclick="copyRef()" class="btn btn-primary btn-sm" id="copyRefBtn">📋 Copy</button>
      </div>
      <div class="ref-stats">
        <div class="ref-stat"><div class="ref-stat-num">${count}</div><div class="ref-stat-lbl">Referrals</div></div>
        <div class="ref-stat"><div class="ref-stat-num">${code}</div><div class="ref-stat-lbl">Your Code</div></div>
      </div>
    </div>`;
}

function copyRef() {
  const i = document.getElementById('refLinkInput');
  i.select(); i.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(i.value).catch(() => document.execCommand('copy'));
  const b = document.getElementById('copyRefBtn');
  b.textContent = '✅ Copied!';
  setTimeout(() => b.textContent = '📋 Copy', 2000);
}


// =====================================

// SECTION 6: MODULE RENDERING

// =====================================

function getModuleIdFromURL() {
  return parseInt(new URLSearchParams(window.location.search).get('id')) || 1;
}

function renderModule() {
  const id = getModuleIdFromURL();
  const mod = MODULES.find(m => m.id === id);
  if (!mod) { document.getElementById('lessonContent').innerHTML = '<p>Module not found.</p>'; return; }

  // Auth gate for modules 2+
  if (id > 1 && !isAuthenticated()) {
    document.getElementById('lessonContent').innerHTML = `
      <div style="text-align:center;padding:3rem 1.5rem;">
        <div style="font-size:3rem;margin-bottom:1rem;">🔐</div>
        <h2>Account Required</h2>
        <p>Create a free account to access Module ${id} and beyond.</p>
        <button onclick="showAuthModal('register','Register to continue learning.')" class="btn btn-primary btn-lg mt-3">Create Free Account</button>
        <p class="mt-2"><a href="dashboard.html" style="color:var(--accent);">← Back to Dashboard</a></p>
      </div>`;
    return;
  }

  // Progression gate
  if (!isModuleUnlocked(id)) {
    document.getElementById('lessonContent').innerHTML = `
      <div style="text-align:center;padding:3rem;">
        <h2>🔒 Module Locked</h2>
        <p>Complete Module ${id - 1} first.</p>
        <a href="dashboard.html" class="btn btn-primary mt-3">Back to Dashboard</a>
      </div>`;
    return;
  }

  const header = document.getElementById('moduleHeader');
  if (header) header.innerHTML = `
    <div class="container-narrow">
      <div class="breadcrumb"><a href="dashboard.html">Dashboard</a> &nbsp;/&nbsp; Module ${mod.id}</div>
      <h1>Module ${mod.id}: ${mod.title}</h1>
      <p>${mod.description}</p>
    </div>`;
  document.title = `Module ${mod.id}: ${mod.title} | TheScaleHub`;

  const content = document.getElementById('lessonContent');
  if (!content) return;
  content.innerHTML = `
    <div class="container-narrow">
      <div class="lesson-content">${mod.content}</div>
      <div class="quiz-section" id="quizSection">
        <h2>📝 Module ${mod.id} Quiz</h2>
        <p class="quiz-intro">You need at least ${PASS_THRESHOLD}% to pass and unlock the next module.</p>
        <form id="quizForm" onsubmit="return submitQuiz(event,${mod.id})">
          ${mod.quiz.map((q, i) => `
            <div class="quiz-question">
              <h4>Question ${i + 1}: ${q.question}</h4>
              <div class="quiz-options">
                ${q.options.map((o, j) => `<label><input type="radio" name="q${i}" value="${j}" required><span>${o}</span></label>`).join('')}
              </div>
            </div>`).join('')}
          <div class="quiz-actions"><button type="submit" class="btn btn-primary btn-lg">Submit Quiz</button></div>
        </form>
      </div>
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin:2rem 0 4rem;">
        ${id > 1 ? `<a href="module.html?id=${id - 1}" class="btn btn-secondary">← Previous</a>` : '<span></span>'}
        <a href="dashboard.html" class="btn btn-secondary">Back to Dashboard</a>
      </div>
    </div>`;
}


// =====================================

// SECTION 7: QUIZ SUBMISSION

// =====================================

function submitQuiz(e, moduleId) {
  e.preventDefault();
  const mod = MODULES.find(m => m.id === moduleId);
  if (!mod) return false;
  const form = document.getElementById('quizForm');
  let correct = 0;
  mod.quiz.forEach((q, i) => {
    const sel = form.querySelector(`input[name="q${i}"]:checked`);
    if (sel && parseInt(sel.value) === q.correct) correct++;
  });
  const score = Math.round((correct / mod.quiz.length) * 100);
  const passed = score >= PASS_THRESHOLD;
  if (passed) completeModule(moduleId, score);

  sessionStorage.setItem('lastQuizResult', JSON.stringify({
    moduleId, score, correct, total: mod.quiz.length, passed,
    moduleTitle: mod.title,
    requiresAuth: moduleId === 1 && passed && !isAuthenticated()
  }));
  window.location.href = 'result.html';
  return false;
}


// =====================================

// SECTION 8: RESULT PAGE

// =====================================

function renderResult() {
  const raw = sessionStorage.getItem('lastQuizResult');
  if (!raw) { window.location.href = 'dashboard.html'; return; }
  const r = JSON.parse(raw);
  const container = document.getElementById('resultContent');
  if (!container) return;
  const next = r.moduleId + 1;
  const hasNext = next <= MODULES.length;
  const done = isCourseComplete();
  const needsAuth = r.requiresAuth;

  let actionsHtml = '';
  if (needsAuth) {
    actionsHtml = `
      <div class="tip-box" style="text-align:left;margin:1.5rem 0;">
        <div class="tip-box-title">🔐 Create an Account to Continue</div>
        <p>Great job on Module 1! Register for free to unlock the remaining 9 modules.</p>
      </div>
      <div class="result-actions">
        <button onclick="showAuthModal('register','Register to unlock Module 2!')" class="btn btn-success btn-lg">🚀 Create Free Account</button>
        <a href="dashboard.html" class="btn btn-secondary">Dashboard</a>
      </div>`;
  } else {
    actionsHtml = `
      <p>${r.passed
        ? (done ? 'You completed the entire course!' : (hasNext ? 'Next module unlocked.' : ''))
        : `You need ${PASS_THRESHOLD}% to pass. Review and retry.`}</p>
      <div class="result-actions">
        ${!r.passed ? `<a href="module.html?id=${r.moduleId}" class="btn btn-primary">🔄 Retry</a>` : ''}
        ${r.passed && done ? `<a href="complete.html" class="btn btn-success btn-lg">🏆 Certificate</a>` : ''}
        ${r.passed && hasNext && !done ? `<a href="module.html?id=${next}" class="btn btn-success">Next Module →</a>` : ''}
        <a href="dashboard.html" class="btn btn-secondary">Dashboard</a>
      </div>`;
  }

  container.innerHTML = `
    <div class="result-card">
      <div class="result-icon ${r.passed ? 'pass' : 'fail'}">${r.passed ? '🎉' : '😔'}</div>
      <h1>${r.passed ? 'Congratulations!' : 'Not Quite There'}</h1>
      <p>Module ${r.moduleId}: ${r.moduleTitle}</p>
      <div class="score ${r.passed ? 'pass' : 'fail'}">${r.score}%</div>
      <p>${r.correct} of ${r.total} correct</p>
      ${actionsHtml}
    </div>`;
}


// =====================================

// SECTION 9: CERTIFICATE

// =====================================

function renderCertificate() {
  if (!isCourseComplete()) { window.location.href = 'dashboard.html'; return; }
  const c = document.getElementById('certificateContent');
  if (!c) return;
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const p = getProgress();
  const avg = Math.round(Object.values(p.quizScores).reduce((a, b) => a + b, 0) / Object.values(p.quizScores).length);
  const name = currentUser?.displayName || 'Student';

  c.innerHTML = `
    <div class="certificate">
      <div class="certificate-badge">🏆</div>
      <h1>Certificate of Completion</h1>
      <h2>This certifies that</h2>
      <p class="congrats">${name}</p>
      <h2>has successfully completed</h2>
      <p class="course-name">"${COURSE_TITLE}"</p>
      <p style="color:var(--gray-600);">All ${MODULES.length} modules · Average score: ${avg}%</p>
      <hr style="border:none;border-top:2px solid var(--gray-200);margin:1.5rem 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
        <p class="date" style="margin:0;">Completed on ${today}</p>
        <div style="text-align:right;">
          <p style="font-weight:700;color:var(--primary);margin:0;">📈 TheScaleHub</p>
          <p style="font-size:0.85rem;color:var(--gray-500);margin:0;">Certified Learning Platform</p>
        </div>
      </div>
      <div style="margin-top:2rem;display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">
        <button onclick="window.print()" class="btn btn-primary">🖨️ Print</button>
        <a href="dashboard.html" class="btn btn-secondary">Dashboard</a>
        <button onclick="if(confirm('Erase all progress?')){resetProgress();location.href='index.html';}" class="btn btn-danger btn-sm">Reset</button>
      </div>
    </div>`;
}


// =====================================

// SECTION 10: BLOG

// =====================================

async function renderBlogPosts(containerId, limit) {
  containerId = containerId || 'blogGrid';
  limit = limit || 50;
  const c = document.getElementById(containerId);
  if (!c) return;
  if (!firebaseReady || !db) {
    c.innerHTML = `
      <div class="blog-empty">
        <div style="font-size:3rem;margin-bottom:1rem;">📝</div>
        <h3>Blog Coming Soon</h3>
        <p>We're preparing great business growth content. Check back soon!</p>
      </div>`;
    return;
  }
  c.innerHTML = '<div class="blog-loading"><div class="spinner-sm"></div><p>Loading posts...</p></div>';
  try {
    let snap;
    // TRY 1: Compound query (needs Firestore composite index)
    try {
      snap = await db.collection('posts')
        .where('published', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
    } catch (indexErr) {
      // The compound query failed — likely missing composite index.
      // Log the error — Firestore gives a direct link to create the index.
      console.warn('Blog: Compound query failed (index needed). Falling back to simple query.');
      console.warn('Click this link in the error below to create the index automatically:');
      console.error(indexErr);
      // TRY 2: Fallback — get ALL posts, filter in JS
      const allSnap = await db.collection('posts').get();
      const publishedDocs = allSnap.docs
        .filter(doc => doc.data().published === true)
        .sort((a, b) => {
          const aTime = a.data().createdAt ? a.data().createdAt.toMillis() : 0;
          const bTime = b.data().createdAt ? b.data().createdAt.toMillis() : 0;
          return bTime - aTime;
        })
        .slice(0, limit);
      // Create a fake snapshot-like object
      snap = { empty: publishedDocs.length === 0, docs: publishedDocs };
    }
    if (snap.empty) {
      c.innerHTML = `<div class="blog-empty"><div style="font-size:3rem;margin-bottom:1rem;">📝</div><h3>No Posts Yet</h3><p>Stay tuned for business growth tips!</p></div>`;
      return;
    }
    c.innerHTML = snap.docs.map(doc => {
      const p = doc.data();
      let dateStr = '';
      try {
        if (p.createdAt && p.createdAt.toDate) {
          dateStr = p.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } else if (p.updatedAt && p.updatedAt.toDate) {
          dateStr = p.updatedAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        }
      } catch (e) { dateStr = 'Recent'; }
      const excerpt = p.excerpt || (p.content ? p.content.substring(0, 150) + '...' : '');
      const postUrl = 'blog-post.html?id=' + doc.id;
      return `
        <a href="${postUrl}" class="blog-card" style="text-decoration:none;color:inherit;cursor:pointer;">
          ${p.imageUrl ? `<div class="blog-card-img" style="background-image:url('${p.imageUrl}')"></div>` : `<div class="blog-card-img blog-card-img-placeholder"><span>📝</span></div>`}
          <div class="blog-card-body">
            <div class="blog-card-date">${dateStr}</div>
            <h3>${p.title || 'Untitled Post'}</h3>
            <p>${excerpt}</p>
            <span class="blog-read-more">Read Full Post →</span>
          </div>
        </a>`;
    }).join('');
    console.log('Blog: Loaded ' + snap.docs.length + ' posts successfully.');
  } catch (err) {
    console.error('Blog load error:', err);
    c.innerHTML = `<div class="blog-empty"><h3>⚠️ Unable to Load Posts</h3><p>Error: ${err.message || 'Unknown error'}. Check browser console for details.</p></div>`;
  }
}

// ==========================================
// SECTION 10B: SINGLE BLOG POST VIEW
// ==========================================
async function renderFullBlogPost() {
  const container = document.getElementById('blogPostContainer');
  if (!container) return;
  // Get post ID from URL
  const postId = new URLSearchParams(window.location.search).get('id');
  if (!postId) {
    container.innerHTML = `
      <div class="blog-post-error">
        <div style="font-size:3rem;margin-bottom:1rem;">🔍</div>
        <h2>Post Not Found</h2>
        <p>No post ID was provided.</p>
        <a href="blog.html" class="btn btn-primary mt-3">← Back to Blog</a>
      </div>`;
    return;
  }
  if (!firebaseReady || !db) {
    container.innerHTML = `
      <div class="blog-post-error">
        <div style="font-size:3rem;margin-bottom:1rem;">⚙️</div>
        <h2>Firebase Not Configured</h2>
        <p>Blog posts require Firebase to be set up.</p>
        <a href="blog.html" class="btn btn-primary mt-3">← Back to Blog</a>
      </div>`;
    return;
  }
  // Show loading
  container.innerHTML = `
    <div class="blog-post-loading">
      <div class="spinner-sm"></div>
      <p style="margin-top:1rem;color:var(--gray-500);">Loading post...</p>
    </div>`;
  try {
    const doc = await db.collection('posts').doc(postId).get();
    if (!doc.exists) {
      container.innerHTML = `
        <div class="blog-post-error">
          <div style="font-size:3rem;margin-bottom:1rem;">😕</div>
          <h2>Post Not Found</h2>
          <p>This post may have been removed or the link is incorrect.</p>
          <a href="blog.html" class="btn btn-primary mt-3">← Back to Blog</a>
        </div>`;
      return;
    }
    const post = doc.data();
    // Format date
    let dateStr = '';
    let fullDateStr = '';
    try {
      if (post.createdAt && post.createdAt.toDate) {
        const d = post.createdAt.toDate();
        dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        fullDateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      } else if (post.updatedAt && post.updatedAt.toDate) {
        const d = post.updatedAt.toDate();
        dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        fullDateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      }
    } catch (e) { dateStr = 'Recent'; fullDateStr = 'Recently published'; }
    // Format content — convert plain text line breaks to HTML paragraphs
    let formattedContent = formatBlogContent(post.content || '');
    // Set page title
    document.title = (post.title || 'Blog Post') + ' | TheScaleHub';
    // Build the page
    container.innerHTML = `
      <!-- Hero Header -->
      <section class="blog-post-hero">
        <div style="max-width:800px;margin:0 auto;">
          <div class="breadcrumb">
            <a href="index.html">Home</a> &nbsp;/&nbsp; <a href="blog.html">Blog</a> &nbsp;/&nbsp; ${post.title || 'Post'}
          </div>
          <h1>${post.title || 'Untitled Post'}</h1>
          <div class="blog-post-meta">
            ${dateStr ? `<span>📅 ${fullDateStr}</span>` : ''}
            ${post.authorName ? `<span>✍️ ${post.authorName}</span>` : ''}
            ${post.content ? `<span>📖 ${Math.ceil(post.content.split(/\s+/).length / 200)} min read</span>` : ''}
          </div>
        </div>
      </section>
      <!-- Cover Image -->
      ${post.imageUrl ? `
        <div class="blog-post-cover">
          <img src="${post.imageUrl}" alt="${post.title || 'Blog post image'}" onerror="this.parentElement.style.display='none'">
        </div>` : ''}
      <!-- Post Body -->
      <div class="blog-post-body">
        <div class="blog-post-content">
          ${formattedContent}
        </div>
        <!-- External Link -->
        ${post.link ? `
          <div class="blog-post-external">
            <p>📎 This post references an external resource:</p>
            <a href="${post.link}" target="_blank" rel="noopener" class="btn btn-primary">Visit External Link →</a>
          </div>` : ''}
        <!-- Actions -->
        <div class="blog-post-actions">
          <a href="blog.html" class="btn btn-secondary">← Back to Blog</a>
          <div class="blog-post-share">
            <span>Share:</span>
            <button class="share-btn" onclick="shareBlogPost('twitter')" title="Share on Twitter">𝕏</button>
            <button class="share-btn" onclick="shareBlogPost('whatsapp')" title="Share on WhatsApp">💬</button>
            <button class="share-btn" onclick="shareBlogPost('copy')" title="Copy link" id="copyLinkBtn">🔗</button>
          </div>
        </div>
      </div>
      <!-- Related CTA -->
      <section class="section section-alt" style="text-align:center;">
        <div style="max-width:600px;margin:0 auto;padding:0 1.5rem;">
          <h2>Want to Learn More?</h2>
          <p style="color:var(--gray-500);margin-bottom:2rem;">Take our free 10-module course on fixing low sales and growing your business.</p>
          <a href="dashboard.html" class="btn btn-primary btn-lg">🚀 Start Free Course</a>
        </div>
      </section>
    `;
    console.log('Blog post loaded:', post.title);
  } catch (err) {
    console.error('Error loading blog post:', err);
    container.innerHTML = `
      <div class="blog-post-error">
        <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
        <h2>Error Loading Post</h2>
        <p>${err.message || 'An unexpected error occurred.'}</p>
        <a href="blog.html" class="btn btn-primary mt-3">← Back to Blog</a>
      </div>`;
  }
}
/**
 * Format plain text blog content into proper HTML.
 * Handles: line breaks → paragraphs, **bold**, *italic*, URLs, markdown-like headers
 */
function formatBlogContent(text) {
  if (!text) return '<p>No content available.</p>';
  // If the content already contains HTML tags, return as-is
  if (/<[a-z][\s\S]*>/i.test(text) && (text.includes('<p>') || text.includes('<h') || text.includes('<div') || text.includes('<br'))) {
    return text;
  }
  // Split into paragraphs by double newlines
  let paragraphs = text.split(/\n\s*\n/);
  let html = paragraphs.map(para => {
    para = para.trim();
    if (!para) return '';
    // Check for markdown-style headers
    if (para.startsWith('### ')) {
      return '<h3>' + escapeAndFormat(para.substring(4)) + '</h3>';
    }
    if (para.startsWith('## ')) {
      return '<h2>' + escapeAndFormat(para.substring(3)) + '</h2>';
    }
    if (para.startsWith('# ')) {
      return '<h2>' + escapeAndFormat(para.substring(2)) + '</h2>';
    }
    // Check for bullet points (lines starting with - or *)
    const lines = para.split('\n');
    const isList = lines.every(l => /^\s*[-*•]\s/.test(l.trim()) || l.trim() === '');
    if (isList && lines.filter(l => l.trim()).length > 0) {
      const items = lines
        .filter(l => l.trim())
        .map(l => '<li>' + escapeAndFormat(l.replace(/^\s*[-*•]\s*/, '')) + '</li>')
        .join('');
      return '<ul>' + items + '</ul>';
    }
    // Check for numbered lists
    const isNumberedList = lines.every(l => /^\s*\d+[.)]\s/.test(l.trim()) || l.trim() === '');
    if (isNumberedList && lines.filter(l => l.trim()).length > 0) {
      const items = lines
        .filter(l => l.trim())
        .map(l => '<li>' + escapeAndFormat(l.replace(/^\s*\d+[.)]\s*/, '')) + '</li>')
        .join('');
      return '<ol>' + items + '</ol>';
    }
    // Regular paragraph — handle single newlines as <br>
    const formattedPara = para.split('\n').map(line => escapeAndFormat(line.trim())).join('<br>');
    return '<p>' + formattedPara + '</p>';
  }).filter(Boolean).join('\n');
  return html || '<p>' + text + '</p>';
}
/**
 * Apply inline formatting: **bold**, *italic*, and auto-link URLs
 */
function escapeAndFormat(text) {
  // Convert **bold**
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Convert *italic*
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Auto-link URLs
  text = text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  return text;
}
/**
 * Share blog post on different platforms
 */
function shareBlogPost(platform) {
  const url = window.location.href;
  const title = document.title;
  switch (platform) {
    case 'twitter':
      window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(url), '_blank');
      break;
    case 'whatsapp':
      window.open('https://wa.me/?text=' + encodeURIComponent(title + ' ' + url), '_blank');
      break;
    case 'copy':
      navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('copyLinkBtn');
        if (btn) { btn.textContent = '✅'; setTimeout(() => btn.textContent = '🔗', 2000); }
      }).catch(() => {
        // Fallback
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        const btn = document.getElementById('copyLinkBtn');
        if (btn) { btn.textContent = '✅'; setTimeout(() => btn.textContent = '🔗', 2000); }
      });
      break;
  }
}

// =====================================

// SECTION 11: ADMIN

// =====================================

async function renderAdminPanel() {
  const c = document.getElementById('adminContent');
  if (!c) return;
  if (!firebaseReady) {
    c.innerHTML = '<div style="text-align:center;padding:3rem;"><h2>⚠️ Firebase Not Configured</h2><p>Set up Firebase in app.js to use the admin panel.</p></div>';
    return;
  }
  if (!isAdmin()) {
    c.innerHTML = '<div style="text-align:center;padding:3rem;"><h2>🔒 Access Denied</h2><p>Admin privileges required.</p><a href="index.html" class="btn btn-primary mt-3">Go Home</a></div>';
    return;
  }
  await loadAdminPosts();
}

async function loadAdminPosts() {
  const c = document.getElementById('adminPostsList');
  if (!c || !firebaseReady || !db) return;
  try {
    let snap;
    // Try ordered query first, fallback to unordered if index missing
    try {
      snap = await db.collection('posts').orderBy('createdAt', 'desc').get();
    } catch (indexErr) {
      console.warn('Admin: orderBy query failed, falling back to unordered fetch.');
      console.error(indexErr);
      snap = await db.collection('posts').get();
    }
    if (snap.empty) { c.innerHTML = '<p style="text-align:center;color:var(--gray-500);padding:2rem;">No posts yet. Create your first post above!</p>'; return; }
    c.innerHTML = snap.docs.map(doc => {
      const p = doc.data();
      let date = 'Draft';
      try {
        if (p.createdAt && p.createdAt.toDate) date = p.createdAt.toDate().toLocaleDateString();
        else if (p.updatedAt && p.updatedAt.toDate) date = p.updatedAt.toDate().toLocaleDateString();
      } catch (e) { date = 'Recent'; }
      return `
        <div class="admin-post-row">
          <div class="admin-post-info"><h4>${p.title || 'Untitled'}</h4><p>${date} · ${p.published ? '<span style="color:var(--success)">Published</span>' : '<span style="color:var(--warning)">Draft</span>'}</p></div>
          <div class="admin-post-btns">
            <button onclick="editPost('${doc.id}')" class="btn btn-sm btn-secondary">✏️</button>
            <button onclick="deletePost('${doc.id}')" class="btn btn-sm btn-danger">🗑️</button>
          </div>
        </div>`;
    }).join('');
    console.log('Admin: Loaded ' + snap.docs.length + ' posts.');
  } catch (err) {
    console.error('Admin load error:', err);
    c.innerHTML = '<p style="text-align:center;color:var(--danger);padding:2rem;">Error loading posts: ' + (err.message || 'Unknown error') + '</p>';
  }
}
async function handleCreatePost(e) {
  e.preventDefault();
  if (!firebaseReady || !isAdmin()) return false;
  const btn = document.getElementById('postSubmitBtn');
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const data = {
      title: document.getElementById('postTitle').value,
      content: document.getElementById('postContent').value,
      excerpt: document.getElementById('postContent').value.substring(0, 150),
      link: document.getElementById('postLink').value || '',
      imageUrl: document.getElementById('postImage').value || '',
      published: document.getElementById('postPublished').checked,
      authorId: currentUser.uid,
      authorName: currentUser.displayName || currentUser.email,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const editId = document.getElementById('editPostId').value;
    if (editId) { await db.collection('posts').doc(editId).update(data); }
    else { data.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await db.collection('posts').add(data); }
    document.getElementById('postForm').reset();
    document.getElementById('editPostId').value = '';
    document.getElementById('postFormTitle').textContent = 'Create New Post';
    await loadAdminPosts();
    showAdminMsg(editId ? 'Post updated!' : 'Post published!');
  } catch (err) { showAdminMsg('Error saving post.', true); }
  finally { btn.disabled = false; btn.textContent = '📝 Publish Post'; }
  return false;
}

async function editPost(id) {
  if (!firebaseReady) return;
  try {
    const doc = await db.collection('posts').doc(id).get();
    if (!doc.exists) return;
    const p = doc.data();
    document.getElementById('postTitle').value = p.title;
    document.getElementById('postContent').value = p.content;
    document.getElementById('postLink').value = p.link || '';
    document.getElementById('postImage').value = p.imageUrl || '';
    document.getElementById('postPublished').checked = p.published;
    document.getElementById('editPostId').value = id;
    document.getElementById('postFormTitle').textContent = 'Edit Post';
    document.getElementById('postSubmitBtn').textContent = '💾 Update Post';
    document.getElementById('postForm').scrollIntoView({ behavior: 'smooth' });
  } catch (err) { console.error(err); }
}

async function deletePost(id) {
  if (!confirm('Delete this post?') || !firebaseReady) return;
  try { await db.collection('posts').doc(id).delete(); await loadAdminPosts(); showAdminMsg('Post deleted.'); }
  catch (err) { console.error(err); }
}

function showAdminMsg(msg, isError) {
  const el = document.getElementById('adminMsg');
  if (!el) return;
  el.textContent = msg;
  el.className = 'admin-msg ' + (isError ? 'error' : 'success');
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}


// =====================================

// SECTION 12: LANDING PAGE HELPERS

// =====================================

function renderCurriculum() {
  const c = document.getElementById('curriculumList');
  if (!c) return;
  c.innerHTML = MODULES.map(m => `
    <div class="curriculum-item"><div class="curriculum-num">${m.id}</div><span>${m.title}</span></div>
  `).join('');
}


// =====================================

// SECTION 13: FOOTER

// =====================================

function renderFooter() {
  const f = document.getElementById('footer');
  if (!f) return;
  f.innerHTML = `
    <div class="footer">
      <div class="footer-brand-row">
        <span class="logo-icon" style="font-size:1.25rem;">📈</span>
        <span style="font-weight:800;color:rgba(255,255,255,0.9);font-size:1.1rem;">TheScaleHub</span>
      </div>
      <div class="footer-links">
        <a href="about.html">About</a>
        <a href="blog.html">Blog</a>
        <a href="contact.html">Contact</a>
        <a href="privacy.html">Privacy Policy</a>
        <a href="dashboard.html">Dashboard</a>
      </div>
      <div class="footer-powered">Powered by <strong>TheScaleHub</strong></div>
      <p>&copy; ${new Date().getFullYear()} TheScaleHub. All rights reserved.</p>
    </div>`;
}
