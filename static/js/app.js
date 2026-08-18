const API = window.location.origin;
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || '{}');

// ===== DARK MODE =====
function toggleDark() {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('dark', document.documentElement.classList.contains('dark') ? '1' : '0');
  updateDarkIcons();
}
function updateDarkIcons() {
  const isDark = document.documentElement.classList.contains('dark');
  document.querySelectorAll('#dark-toggle, #dark-toggle-cat, .admin-view .dark-toggle').forEach(el => {
    if (el) el.textContent = isDark ? '☀️' : '🌙';
  });
}
if (localStorage.getItem('dark') === '1') {
  document.documentElement.classList.add('dark');
  updateDarkIcons();
}

// ===== VIEWS =====
function showView(name) {
  document.querySelectorAll('#login-view,#register-view,#status-view,#catalog-view,#admin-view').forEach(v => v.classList.add('hidden'));
  document.getElementById(name + '-view').classList.remove('hidden');
  if (name === 'catalog') loadBooks();
  if (name === 'admin') { loadPending(); loadAudit(); }
}

function showAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden'));
  document.getElementById('tab-' + tab).classList.remove('hidden');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('border-blue-500', 'text-blue-600'));
  document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.classList.add('border-blue-500', 'text-blue-600');
}

// ===== AUTH =====
async function login() {
  const username = document.getElementById('login-user').value;
  const password = document.getElementById('login-pass').value;
  const err = document.getElementById('login-error');
  err.classList.add('hidden');
  try {
    const res = await fetch(`${API}/api/token`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username, password})
    });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.detail; err.classList.remove('hidden'); return; }
    token = data.access_token; user = data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    const payload = JSON.parse(atob(token.split('.')[1]));
    user.role = payload.role;
    user.status = payload.status;
    if (user.status === 'pending') showStatus('pending');
    else if (user.status === 'rejected') showStatus('rejected');
    else showCatalog();
  } catch (e) { err.textContent = 'Error de conexión'; err.classList.remove('hidden'); }
}

async function register() {
  const username = document.getElementById('reg-user').value;
  const password = document.getElementById('reg-pass').value;
  const err = document.getElementById('register-error');
  const ok = document.getElementById('register-ok');
  err.classList.add('hidden'); ok.classList.add('hidden');
  try {
    const res = await fetch(`${API}/api/register`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username, password})
    });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.detail; err.classList.remove('hidden'); return; }
    ok.innerHTML = `✅ ${data.mensaje}`;
    ok.classList.remove('hidden');
    document.getElementById('reg-user').value = '';
    document.getElementById('reg-pass').value = '';
  } catch (e) { err.textContent = 'Error de conexión'; err.classList.remove('hidden'); }
}

function logout() {
  localStorage.removeItem('token'); localStorage.removeItem('user');
  token = null; user = {};
  showView('login');
}

function showStatus(status) {
  document.getElementById('status-user').textContent = user.username || '';
  if (status === 'pending') {
    document.getElementById('status-icon').textContent = '⏳';
    document.getElementById('status-title').textContent = 'Cuenta pendiente';
    document.getElementById('status-msg').textContent = 'Tu solicitud de acceso está siendo revisada por el administrador. Te notificaremos cuando sea aprobada.';
  } else {
    document.getElementById('status-icon').textContent = '🚫';
    document.getElementById('status-title').textContent = 'Acceso rechazado';
    document.getElementById('status-msg').textContent = 'El administrador ha rechazado tu solicitud de acceso. Si crees que es un error, contacta con él.';
  }
  showView('status');
}

function showCatalog() {
  const adminBtn = document.getElementById('admin-btn');
  const uploadBtn = document.getElementById('upload-btn');
  const roleBadge = document.getElementById('user-role-badge');
  document.getElementById('user-name').textContent = user.username || '';
  if (user.role === 'admin') {
    adminBtn.classList.remove('hidden');
    uploadBtn.classList.remove('hidden');
    roleBadge.classList.remove('hidden');
    roleBadge.textContent = 'Admin';
    roleBadge.className = 'text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300';
  } else {
    adminBtn.classList.add('hidden');
    uploadBtn.classList.add('hidden');
    roleBadge.classList.add('hidden');
  }
  showView('catalog');
}

// ===== CATALOG =====
let searchTimeout;
function debounceSearch() { clearTimeout(searchTimeout); searchTimeout = setTimeout(loadBooks, 300); }

async function loadBooks() {
  const grid = document.getElementById('book-grid');
  const empty = document.getElementById('empty-state');
  const q = document.getElementById('search-input').value;
  const genre = document.getElementById('filter-genre').value;
  const year = document.getElementById('filter-year').value;
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (genre) params.set('genre', genre);
  if (year) params.set('year', year);
  try {
    const res = await fetch(`${API}/api/books?${params}`, {headers: {'Authorization': `Bearer ${token}`}});
    if (res.status === 403) { logout(); return; }
    const books = await res.json();
    grid.innerHTML = '';
    if (books.length === 0) { empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    books.forEach(b => {
      const card = document.createElement('div');
      card.className = 'bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer';
      card.onclick = () => window.location.href = `/static/reader.html?id=${b.id}`;
      const coverSrc = b.cover_path ? `${API}/${b.cover_path}` : '';
      card.innerHTML = `
        <div class="aspect-[3/4] bg-gray-200 dark:bg-gray-700 overflow-hidden">
          ${coverSrc ? `<img src="${coverSrc}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center text-4xl text-gray-400">📖</div>'}
        </div>
        <div class="p-3">
          <p class="font-semibold text-sm truncate">${b.title}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${b.author} · ${b.genre || ''}</p>
          ${b.year ? `<p class="text-xs text-gray-400 dark:text-gray-500">${b.year}</p>` : ''}
          <div class="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div class="bg-blue-500 h-1.5 rounded-full" style="width:${b.percentage}%"></div>
          </div>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">${b.percentage}% · ${b.current_page}/${b.total_pages} pág</p>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (e) { console.error(e); }
}

async function loadFilters() {
  try {
    const [genres, years] = await Promise.all([
      fetch(`${API}/api/books/genres`, {headers: {'Authorization': `Bearer ${token}`}}).then(r => r.json()),
      fetch(`${API}/api/books/years`, {headers: {'Authorization': `Bearer ${token}`}}).then(r => r.json())
    ]);
    const gSel = document.getElementById('filter-genre');
    gSel.innerHTML = '<option value="">Todos los géneros</option>' + genres.map(g => `<option value="${g}">${g}</option>`).join('');
    const ySel = document.getElementById('filter-year');
    ySel.innerHTML = '<option value="">Todos los años</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
  } catch (e) {}
}

// ===== UPLOAD FORM =====
function openUploadForm(input) {
  document.getElementById('up-file').files = input.files;
  document.getElementById('up-filename').textContent = input.files[0]?.name || '';
  showView('admin');
  showAdminTab('subir');
}

async function uploadBook() {
  const file = document.getElementById('up-file').files[0];
  if (!file) { showMsg('up-msg', 'Selecciona un archivo PDF', 'red'); return; }
  const title = document.getElementById('up-title').value.trim();
  if (!title) { showMsg('up-msg', 'El título es obligatorio', 'red'); return; }
  const fd = new FormData();
  fd.append('file', file);
  fd.append('title', title);
  fd.append('author', document.getElementById('up-author').value.trim() || 'Desconocido');
  fd.append('genre', document.getElementById('up-genre').value.trim() || 'General');
  fd.append('year', document.getElementById('up-year').value || '');
  fd.append('publisher', document.getElementById('up-publisher').value.trim() || '');
  fd.append('isbn', document.getElementById('up-isbn').value.trim() || '');
  fd.append('description', document.getElementById('up-description').value.trim() || '');
  try {
    const res = await fetch(`${API}/api/books/upload`, {
      method: 'POST', headers: {'Authorization': `Bearer ${token}`}, body: fd
    });
    const data = await res.json();
    if (!res.ok) { showMsg('up-msg', data.detail || 'Error', 'red'); return; }
    showMsg('up-msg', `✅ "${data.title}" subido (${data.total_pages} páginas)`, 'green');
    document.getElementById('up-title').value = '';
    document.getElementById('up-author').value = 'Desconocido';
    document.getElementById('up-genre').value = 'General';
    document.getElementById('up-year').value = '';
    document.getElementById('up-publisher').value = '';
    document.getElementById('up-isbn').value = '';
    document.getElementById('up-description').value = '';
    document.getElementById('up-file').value = '';
    document.getElementById('up-filename').textContent = '';
    loadBooks();
  } catch (e) { showMsg('up-msg', 'Error de conexión', 'red'); }
}

function showMsg(id, text, color) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = `mt-3 text-sm p-2 rounded-lg ${color === 'red' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'}`;
  el.classList.remove('hidden');
}

// ===== ADMIN: PENDING =====
async function loadPending() {
  try {
    const res = await fetch(`${API}/api/admin/users`, {headers: {'Authorization': `Bearer ${token}`}});
    if (res.status === 403) { logout(); return; }
    const users = await res.json();
    const pending = users.filter(u => u.status === 'pending' && u.role !== 'admin');
    const list = document.getElementById('pending-list');
    const noPending = document.getElementById('no-pending');
    if (pending.length === 0) { list.innerHTML = ''; noPending.classList.remove('hidden'); return; }
    noPending.classList.add('hidden');
    list.innerHTML = pending.map(u => `
      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 flex flex-wrap justify-between items-center gap-3">
        <div>
          <p class="font-semibold">${u.username}</p>
          <p class="text-xs text-gray-500">Registrado: ${new Date(u.created_at).toLocaleString()}</p>
        </div>
        <div class="flex gap-2">
          <button onclick="approveUser(${u.id})" class="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-700">✅ Aprobar</button>
          <button onclick="rejectUser(${u.id})" class="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-600">❌ Rechazar</button>
        </div>
      </div>
    `).join('');
  } catch (e) {}
}

async function approveUser(id) {
  await fetch(`${API}/api/admin/users/${id}/approve`, {method: 'POST', headers: {'Authorization': `Bearer ${token}`}});
  loadPending();
}

async function rejectUser(id) {
  await fetch(`${API}/api/admin/users/${id}/reject`, {method: 'POST', headers: {'Authorization': `Bearer ${token}`}});
  loadPending();
}

// ===== ADMIN: AUDIT =====
async function loadAudit() {
  try {
    const res = await fetch(`${API}/api/admin/audit`, {headers: {'Authorization': `Bearer ${token}`}});
    const logs = await res.json();
    const tbody = document.getElementById('audit-body');
    tbody.innerHTML = logs.map(l => `
      <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
        <td class="p-2 text-xs whitespace-nowrap">${new Date(l.created_at).toLocaleString()}</td>
        <td class="p-2 font-medium">${l.username}</td>
        <td class="p-2">${l.action}</td>
        <td class="p-2 text-gray-500 dark:text-gray-400 text-xs hidden md:table-cell max-w-xs truncate">${l.details || ''}</td>
      </tr>
    `).join('');
  } catch (e) {}
}

// ===== INIT =====
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    user.role = payload.role;
    user.username = payload.username;
    user.status = payload.status;
    if (user.status === 'pending') showStatus('pending');
    else if (user.status === 'rejected') showStatus('rejected');
    else { showCatalog(); loadFilters(); }
  } catch (e) { logout(); }
} else {
  showView('login');
}
