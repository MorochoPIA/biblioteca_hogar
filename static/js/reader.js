const API = window.location.origin;
const token = localStorage.getItem('token');
const bookId = new URLSearchParams(window.location.search).get('id');
let pdfDoc = null, pageNum = 1, totalPages = 0;
const canvas = document.getElementById('pdf-render');
const ctx = canvas.getContext('2d');
const pageNumSpan = document.getElementById('page-num');
const pageCountSpan = document.getElementById('page-count');

if (!token || !bookId) window.location.href = '/static/index.html';

function toggleDark() {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('dark', document.documentElement.classList.contains('dark') ? '1' : '0');
  document.getElementById('dark-toggle-r').textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
}
if (localStorage.getItem('dark') === '1') {
  document.documentElement.classList.add('dark');
  document.getElementById('dark-toggle-r').textContent = '☀️';
}

async function loadBook() {
  try {
    const res = await fetch(`${API}/api/books/${bookId}`, {headers: {'Authorization': `Bearer ${token}`}});
    if (!res.ok) { window.location.href = '/static/index.html'; return; }
    const book = await res.json();
    pageNum = book.current_page || 1;
    document.title = `Leyendo - ${book.title}`;
    const pdfRes = await fetch(`${API}/api/books/${bookId}/file`, {headers: {'Authorization': `Bearer ${token}`}});
    const pdfData = await pdfRes.arrayBuffer();
    pdfDoc = await pdfjsLib.getDocument({data: pdfData}).promise;
    totalPages = pdfDoc.numPages;
    pageCountSpan.textContent = totalPages;
    renderPage(pageNum);
  } catch (e) { console.error(e); }
}

function renderPage(num) {
  if (!pdfDoc) return;
  pdfDoc.getPage(num).then(page => {
    const container = document.getElementById('reader-container');
    const maxWidth = container.clientWidth - 16;
    let scale = 1.5;
    const viewport = page.getViewport({scale});
    if (viewport.width > maxWidth) scale = (maxWidth / viewport.width) * 1.2;
    const scaled = page.getViewport({scale});
    canvas.height = scaled.height;
    canvas.width = scaled.width;
    page.render({canvasContext: ctx, viewport: scaled});
    pageNumSpan.textContent = num;
    pageNum = num;
    saveProgressDebounced(num);
  });
}

function nextPage() { if (pageNum < totalPages) renderPage(pageNum + 1); }
function prevPage() { if (pageNum > 1) renderPage(pageNum - 1); }

let timeoutId;
function saveProgressDebounced(currentPage) {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    fetch(`${API}/api/progress/${bookId}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
      body: JSON.stringify({current_page: currentPage})
    });
  }, 1000);
}

function goBack() { window.location.href = '/static/index.html'; }

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextPage();
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevPage();
});

let touchX = 0;
document.addEventListener('touchstart', e => { touchX = e.changedTouches[0].screenX; });
document.addEventListener('touchend', e => {
  const diff = touchX - e.changedTouches[0].screenX;
  if (Math.abs(diff) > 50) diff > 0 ? nextPage() : prevPage();
});

window.addEventListener('resize', () => { if (pdfDoc) renderPage(pageNum); });
loadBook();
