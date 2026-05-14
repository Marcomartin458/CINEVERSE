'use strict';

/* ═════════════════════════════════════
   CONSTANTES DE API
   Ajusta API_BASE con la URL que te da ngrok (sin / al final)
═════════════════════════════════════ */
const API_BASE  = 'https://cineverse-backend-qjbu.onrender.com'; // ← sin / al final
const API_PELI  = `${API_BASE}/api/peliculas`;
const API_USERS = `${API_BASE}/api/usuarios`;
const API_FAVS  = `${API_BASE}/api/favoritos`;

/* ═════════════════════════════════════
   ESTADO GLOBAL
═════════════════════════════════════ */
let todasLasPeliculas = [];
let generoActivo      = 'todos';
let destacadasIds     = JSON.parse(localStorage.getItem('cineverse_destacadas') || 'null');
let currentUser       = null;
let favoritosSet      = new Set();
let peliculaDestacada = null;   // ← película que se está mostrando en el hero

/* ═════════════════════════════════════
   HERO BACKDROPS
═════════════════════════════════════ */
const HERO_BACKDROPS_BY_GENRE = {
  'ACCION':          'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=1920&q=80&auto=format&fit=crop',
  'COMEDIA':         'https://images.unsplash.com/photo-1543536448-d209d2d13a1c?w=1920&q=80&auto=format&fit=crop',
  'DRAMA':           'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1920&q=80&auto=format&fit=crop',
  'FANTASIA':        'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920&q=80&auto=format&fit=crop',
  'TERROR':          'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=1920&q=80&auto=format&fit=crop',
  'CIENCIA_FICCION': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80&auto=format&fit=crop',
  'AVENTURA':        'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1920&q=80&auto=format&fit=crop'
};
const HERO_FALLBACK = 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1920&q=80&auto=format&fit=crop';
const HERO_BACKDROPS_BY_TITLE = {
  'Cómo entrenar a tu dragón':     'https://image.tmdb.org/t/p/original/zIcZPq0flPhjp4C8v8O5p6Nyipw.jpg',
  'Ratatouille':                   'https://images.squarespace-cdn.com/content/v1/60241cb68df65b530cd84d95/4ddd2f0b-299d-44c0-bcae-79c258e88b36/world.jpg',
  'Los Increíbles':                'https://w0.peakpx.com/wallpaper/936/625/HD-wallpaper-the-incredibles-2-10k-poster-the-incredibles-2-movies-animated-movies.jpg',
  'Toy Story':                     'https://m.media-amazon.com/images/I/818uD-gmD2L.jpg',
  'Shrek':                         'https://www.shreksadventure.com/media/dakft2tv/shreks-home.jpg',
  'Del revés (Inside Out)':        'https://bleedingcool.com/wp-content/uploads/2024/03/inside_out_two_ver12-2000x1125.jpg',
  'Kung Fu Panda':                 'https://cdn.wallpapersafari.com/13/25/KdXqa4.jpg',
  'Big Hero 6':                    'https://images5.alphacoders.com/679/679630.jpg',
  'Gru, mi villano favorito':      'https://image.tmdb.org/t/p/original/i428ahSEoj2ju9xu1NLxstYJROb.jpg',
  'Up':                            'https://m.media-amazon.com/images/M/MV5BMTQxMDA0MDI4MV5BMl5BanBnXkFtZTcwMTU5OTIzMw@@._V1_.jpg',
  'Buscando a Nemo':               'https://beforesandafters.com/wp-content/uploads/2020/07/Reef13.jpg',
  'Frozen':                        'https://assets.puzzlefactory.com/puzzle/314/972/original.jpg',
  'Brave (Indomable)':             'https://i.pinimg.com/736x/72/f8/19/72f819ee1140136bbae1d94035048b98.jpg',
  'La bella y la bestia':          'https://m.media-amazon.com/images/I/61sXMH9A3EL._AC_UF894,1000_QL80_.jpg',
  'Pesadilla antes de Navidad':    'https://filasiete.com/wp-content/uploads/2020/12/pesadillantesdenavidad.jpg',
  'Coraline':                      'https://hpph.ams3.cdn.digitaloceanspaces.com/2990/conversions/Coraline-landscape.jpg',
  'Monstruos, S.A.':               'https://hips.hearstapps.com/hmg-prod/images/monstruos-s-a-fotogramas-1616021342.jpg',
  'Wall-E':                        'https://images.squarespace-cdn.com/content/v1/607954dfdc8ad650fd2ef6a3/1620956909088-7JR5VDLSTVUHBYXIX7GX/WALL-E_photo.jpg',
  'Spider-Man: Un nuevo universo': 'https://image.tmdb.org/t/p/original/14F6gMaRjzgsN6EEpiwH87R1I00.jpg',
  'El gigante de hierro':          'https://pics.filmaffinity.com/the_iron_giant-989794722-large.jpg',
  'El libro de la selva':          'https://www.intercreatives.com/wp-content/uploads/2017/03/libro_de_la_selva-1024x576.jpg'
};

function getHeroBackdrop(pelicula) {
  if (!pelicula) return HERO_FALLBACK;
  if (HERO_BACKDROPS_BY_TITLE[pelicula.titulo]) return HERO_BACKDROPS_BY_TITLE[pelicula.titulo];
  if (pelicula.genero && HERO_BACKDROPS_BY_GENRE[pelicula.genero]) return HERO_BACKDROPS_BY_GENRE[pelicula.genero];
  return HERO_FALLBACK;
}

/* ═════════════════════════════════════
   AUTH — sesión localStorage
═════════════════════════════════════ */
function restoreSession() {
  const id     = localStorage.getItem('cv_userId');
  const nombre = localStorage.getItem('cv_userName');
  const email  = localStorage.getItem('cv_userEmail');
  if (id && nombre) currentUser = { id: parseInt(id, 10), nombre, email: email || '' };
}

function saveSession(usuario) {
  currentUser = { id: usuario.id, nombre: usuario.nombre, email: usuario.email || '' };
  localStorage.setItem('cv_userId',    String(usuario.id));
  localStorage.setItem('cv_userName',  usuario.nombre);
  localStorage.setItem('cv_userEmail', usuario.email || '');
}

function clearSession() {
  currentUser = null;
  favoritosSet.clear();
  localStorage.removeItem('cv_userId');
  localStorage.removeItem('cv_userName');
  localStorage.removeItem('cv_userEmail');
}

function isLoggedIn() { return currentUser !== null; }

/* ═════════════════════════════════════
   AUTH — API (con header para ngrok)
═════════════════════════════════════ */
async function apiLogin(email, password) {
  const res = await fetch(`${API_USERS}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => 'Error de servidor');
    throw new Error(msg || 'Email o contraseña incorrectos');
  }
  return res.json();
}

async function apiRegistro(nombre, email, password) {
  const res = await fetch(`${API_USERS}/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
    body: JSON.stringify({ nombre, email, password })
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => 'Error de servidor');
    throw new Error(msg || 'No se pudo registrar');
  }
  return res.json();
}

/* ═════════════════════════════════════
   FAVORITOS — API
═════════════════════════════════════ */
async function cargarFavoritosDesdeAPI() {
  if (!isLoggedIn()) { favoritosSet.clear(); return; }
  try {
    const res = await fetch(`${API_FAVS}/usuario/${currentUser.id}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    if (!res.ok) return;
    const lista = await res.json();
    favoritosSet = new Set(lista.map(f => f.peliculaId));
  } catch (err) {
    console.warn('[Cineverse] No se pudieron cargar favoritos:', err);
  }
}

async function toggleFavorito(peliculaId) {
  if (!isLoggedIn()) {
    showToast('Inicia sesión para guardar favoritos.', 'error');
    abrirModal('login');
    return;
  }
  const esFav = favoritosSet.has(peliculaId);
  try {
    if (esFav) {
      const res = await fetch(`${API_FAVS}/${currentUser.id}/${peliculaId}`, {
        method: 'DELETE',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (!res.ok && res.status !== 404) throw new Error();
      favoritosSet.delete(peliculaId);
    } else {
      const res = await fetch(API_FAVS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ usuarioId: currentUser.id, peliculaId })
      });
      if (!res.ok && res.status !== 409) throw new Error();
      favoritosSet.add(peliculaId);
    }
    aplicarFiltro(generoActivo, false);
  } catch {
    showToast('Error al actualizar favoritos.', 'error');
  }
}

/* ═════════════════════════════════════
   BOTÓN "MI LISTA" DEL HERO
═════════════════════════════════════ */
function agregarDestacadaAFavoritos() {
  if (!peliculaDestacada) {
    showToast('No hay película destacada en este momento.', 'error');
    return;
  }
  toggleFavorito(peliculaDestacada.id);
}

/* ═════════════════════════════════════
   UI — BOTÓN USUARIO NAVBAR
═════════════════════════════════════ */
function renderNavUser() {
  const container = document.getElementById('navUser');
  if (!container) return;
  if (isLoggedIn()) {
    const inicial = currentUser.nombre.charAt(0).toUpperCase();
    container.innerHTML = `
      <button class="nav__user-btn" id="navUserBtn" aria-label="Menú de usuario">
        <div class="nav__user-avatar">${inicial}</div>
        <span>${currentUser.nombre.split(' ')[0]}</span>
      </button>`;
    document.getElementById('navUserBtn')?.addEventListener('click', () => {
      const s = document.getElementById('sidebar');
      s?.classList.add('sidebar--open'); s?.removeAttribute('aria-hidden');
    });
  } else {
    container.innerHTML = `<button class="nav__login-btn" id="navLoginBtn">Iniciar sesión</button>`;
    document.getElementById('navLoginBtn')?.addEventListener('click', () => abrirModal('login'));
  }
  refreshCursorTargets();
}

/* ═════════════════════════════════════
   UI — ZONA USUARIO SIDEBAR
═════════════════════════════════════ */
function renderSidebarUser() {
  const area = document.getElementById('sidebarUserArea');
  if (!area) return;
  if (isLoggedIn()) {
    const inicial = currentUser.nombre.charAt(0).toUpperCase();
    area.innerHTML = `
      <div class="sidebar__user-info">
        <div class="sidebar__avatar">${inicial}</div>
        <div>
          <div class="sidebar__user-name">${esc(currentUser.nombre)}</div>
          <div class="sidebar__user-email">${esc(currentUser.email)}</div>
        </div>
      </div>
      <button class="sidebar__logout" id="btnLogout">Cerrar sesión</button>`;
    document.getElementById('btnLogout')?.addEventListener('click', handleLogout);
  } else {
    area.innerHTML = `
      <div class="sidebar__login-prompt">
        <p>Accede para gestionar el catálogo y guardar tus favoritas.</p>
        <button class="sidebar__login-btn" id="sidebarLoginBtn">Iniciar sesión</button>
      </div>`;
    document.getElementById('sidebarLoginBtn')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.remove('sidebar--open');
      document.getElementById('sidebar')?.setAttribute('aria-hidden', 'true');
      abrirModal('login');
    });
  }
  refreshCursorTargets();
}

function updateAuthUI() { renderNavUser(); renderSidebarUser(); }

/* ═════════════════════════════════════
   ACCIONES AUTH
═════════════════════════════════════ */
async function handleLoginSuccess(usuario) {
  saveSession(usuario);
  cerrarModal();
  updateAuthUI();
  await cargarFavoritosDesdeAPI();
  aplicarFiltro(generoActivo, false);
  showToast(`Bienvenido, ${usuario.nombre.split(' ')[0]}.`, 'success');
}

function handleLogout() {
  clearSession();
  updateAuthUI();
  aplicarFiltro(generoActivo, false);
  showToast('Sesión cerrada.', 'info');
}

/* ═════════════════════════════════════
   MODAL AUTH
═════════════════════════════════════ */
function abrirModal(tab = 'login') {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  modal.classList.add('open');
  modal.removeAttribute('aria-hidden');
  document.body.style.overflow = 'hidden';
  switchModalTab(tab);
  setTimeout(() => modal.querySelector('.modal__input')?.focus(), 80);
}

function cerrarModal() {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  limpiarErroresModal();
}

function switchModalTab(tab) {
  const pl = document.getElementById('panelLogin');
  const pr = document.getElementById('panelRegistro');
  const tl = document.getElementById('tabLogin');
  const tr = document.getElementById('tabReg');
  if (tab === 'login') {
    pl?.classList.remove('hidden'); pr?.classList.add('hidden');
    tl?.classList.add('active'); tr?.classList.remove('active');
    tl?.setAttribute('aria-selected', 'true'); tr?.setAttribute('aria-selected', 'false');
  } else {
    pl?.classList.add('hidden'); pr?.classList.remove('hidden');
    tl?.classList.remove('active'); tr?.classList.add('active');
    tl?.setAttribute('aria-selected', 'false'); tr?.setAttribute('aria-selected', 'true');
  }
  limpiarErroresModal();
}

function limpiarErroresModal() {
  ['loginError','regError'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
  document.querySelectorAll('.modal__input').forEach(i => i.classList.remove('error'));
}

function initAuthModal() {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  document.getElementById('modalOverlay')?.addEventListener('click', cerrarModal);
  document.getElementById('modalClose')?.addEventListener('click', cerrarModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) cerrarModal(); });
  modal.querySelectorAll('.modal__tab').forEach(t => t.addEventListener('click', () => switchModalTab(t.dataset.tab)));
  modal.querySelectorAll('.modal__switch-btn').forEach(b => b.addEventListener('click', () => switchModalTab(b.dataset.switch)));

  /* LOGIN */
  document.getElementById('btnLogin')?.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail')?.value.trim();
    const pass  = document.getElementById('loginPassword')?.value;
    const errEl = document.getElementById('loginError');
    limpiarErroresModal();
    if (!email || !pass) { if (errEl) errEl.textContent = 'Rellena todos los campos.'; return; }
    const btn = document.getElementById('btnLogin');
    btn.disabled = true; btn.textContent = 'Entrando…';
    try {
      await handleLoginSuccess(await apiLogin(email, pass));
    } catch (err) {
      if (errEl) errEl.textContent = err.message || 'Error al iniciar sesión.';
      ['loginEmail','loginPassword'].forEach(id => document.getElementById(id)?.classList.add('error'));
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Entrar`;
    }
  });
  ['loginEmail','loginPassword'].forEach(id =>
    document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btnLogin')?.click(); }));

  /* REGISTRO */
  document.getElementById('btnRegistro')?.addEventListener('click', async () => {
    const nombre = document.getElementById('regNombre')?.value.trim();
    const email  = document.getElementById('regEmail')?.value.trim();
    const pass   = document.getElementById('regPassword')?.value;
    const errEl  = document.getElementById('regError');
    limpiarErroresModal();
    if (!nombre || !email || !pass) { if (errEl) errEl.textContent = 'Rellena todos los campos.'; return; }
    if (pass.length < 6) { if (errEl) errEl.textContent = 'Contraseña mínimo 6 caracteres.'; document.getElementById('regPassword')?.classList.add('error'); return; }
    const btn = document.getElementById('btnRegistro');
    btn.disabled = true; btn.textContent = 'Registrando…';
    try {
      await handleLoginSuccess(await apiRegistro(nombre, email, pass));
    } catch (err) {
      if (errEl) errEl.textContent = err.message || 'Error al registrarse.';
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg> Registrarse`;
    }
  });
  ['regNombre','regEmail','regPassword'].forEach(id =>
    document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btnRegistro')?.click(); }));
}

/* ═════════════════════════════════════
   CURSOR PERSONALIZADO
═════════════════════════════════════ */
const cursorDot  = document.getElementById('cursorDot');
const cursorRing = document.getElementById('cursorRing');
let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX; mouseY = e.clientY;
  if (cursorDot) { cursorDot.style.left = mouseX + 'px'; cursorDot.style.top = mouseY + 'px'; }
});
(function tickCursor() {
  ringX += (mouseX - ringX) * 0.1; ringY += (mouseY - ringY) * 0.1;
  if (cursorRing) { cursorRing.style.left = ringX + 'px'; cursorRing.style.top = ringY + 'px'; }
  requestAnimationFrame(tickCursor);
})();

function onCursorEnter() { document.body.classList.add('cursor-hover'); }
function onCursorLeave() { document.body.classList.remove('cursor-hover'); }

function refreshCursorTargets() {
  document.querySelectorAll('a, button, .film-card, .filter-pill, .nav__dropdown-item').forEach(el => {
    el.removeEventListener('mouseenter', onCursorEnter);
    el.removeEventListener('mouseleave', onCursorLeave);
    el.addEventListener('mouseenter', onCursorEnter);
    el.addEventListener('mouseleave', onCursorLeave);
  });
}

/* ═════════════════════════════════════
   NAVBAR SCROLL
═════════════════════════════════════ */
window.addEventListener('scroll', () => {
  document.getElementById('mainNav')?.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

/* ═════════════════════════════════════
   SIDEBAR
═════════════════════════════════════ */
function initSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const menuBtn  = document.getElementById('menuBtn');
  const closeBtn = document.getElementById('sidebarClose');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!sidebar) return;
  const open  = () => { sidebar.classList.add('sidebar--open'); sidebar.removeAttribute('aria-hidden'); menuBtn?.setAttribute('aria-expanded','true'); };
  const close = () => { sidebar.classList.remove('sidebar--open'); sidebar.setAttribute('aria-hidden','true'); menuBtn?.setAttribute('aria-expanded','false'); };
  menuBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && sidebar.classList.contains('sidebar--open')) close(); });
  sidebar.querySelectorAll('[data-filter]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault(); aplicarFiltro(link.dataset.filter); close();
      document.querySelector('.catalog')?.scrollIntoView({ behavior:'smooth', block:'start' });
    });
  });
}

/* ═════════════════════════════════════
   BÚSQUEDA MÓVIL
═════════════════════════════════════ */
function initMobileSearch() {
  const btn   = document.getElementById('searchBtnMobile');
  const bar   = document.getElementById('searchMobileBar');
  const closeB= document.getElementById('searchMobileClose');
  const input = document.getElementById('searchInputMobile');
  if (!btn || !bar) return;
  const open  = () => { bar.classList.add('open'); bar.removeAttribute('aria-hidden'); btn.setAttribute('aria-expanded','true'); setTimeout(()=>input?.focus(),80); };
  const close = () => { bar.classList.remove('open'); bar.setAttribute('aria-hidden','true'); btn.setAttribute('aria-expanded','false'); if(input){input.value='';aplicarFiltro(generoActivo,false);} };
  btn.addEventListener('click', open);
  closeB?.addEventListener('click', close);
  document.addEventListener('keydown', e => { if(e.key==='Escape' && bar.classList.contains('open')) close(); });
  if (input) {
    let tid;
    input.addEventListener('input', () => { clearTimeout(tid); tid = setTimeout(()=>buscar(input.value), 220); });
  }
}

/* ═════════════════════════════════════
   TOAST
═════════════════════════════════════ */
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast-msg toast-msg--${type}`;
  t.setAttribute('role', 'status');
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.classList.add('toast-msg--exit');
    t.addEventListener('animationend', () => t.remove(), { once: true });
  }, 3200);
}

/* ═════════════════════════════════════
   MARQUEE
═════════════════════════════════════ */
function fillMarquee(peliculas) {
  const track = document.getElementById('marqueeTrack');
  if (!track || !peliculas.length) return;
  const items = peliculas.map(p => p.titulo).join(' ✦ ');
  track.textContent = items + ' ✦ ' + items;
}

/* ═════════════════════════════════════
   HERO  (actualiza también peliculaDestacada)
═════════════════════════════════════ */
function updateHero(pelicula) {
  if (!pelicula) return;
  peliculaDestacada = pelicula;   // ← guardamos la película actual del hero
  const $ = id => document.getElementById(id);
  const heroImg = getHeroBackdrop(pelicula);
  const bgImg = $('heroBgImg'), bgRgb = $('heroBgRgb');
  if (bgImg) bgImg.style.backgroundImage = `url('${heroImg}')`;
  if (bgRgb) bgRgb.style.backgroundImage = `url('${heroImg}')`;
  const titulo = $('heroTitulo');
  if (titulo) { titulo.textContent = pelicula.titulo; titulo.setAttribute('data-text', pelicula.titulo); }
  const desc = $('heroDescripcion'); if (desc) desc.textContent = pelicula.descripcion || '';
  const genre = $('heroGenre'); if (genre) genre.textContent = (pelicula.genero ?? '—').replaceAll('_',' ');
  const director = $('heroDirector'); if (director) director.textContent = pelicula.director ?? '—';

  // Botón "Ver ahora" redirige al link si existe
  const playBtn = $('heroPlayBtn');
  if (playBtn) {
    playBtn.onclick = null;
    if (pelicula.link) {
      playBtn.onclick = () => window.open(pelicula.link, '_blank');
    } else {
      playBtn.onclick = () => showToast('No hay enlace disponible.', 'info');
    }
  }
}

/* ═════════════════════════════════════
   SKELETONS
═════════════════════════════════════ */
function mostrarSkeletons(n = 8) {
  const c = document.getElementById('contenedorPeliculas'); if (!c) return;
  c.innerHTML = Array.from({ length: n }, () => `
    <div class="film-card-skeleton" aria-hidden="true">
      <div class="skeleton skeleton--img"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton--text" style="width:55%;height:9px;margin-bottom:8px"></div>
        <div class="skeleton skeleton--text" style="width:88%;height:13px;margin-bottom:6px"></div>
        <div class="skeleton skeleton--text" style="width:65%;height:9px"></div>
      </div>
    </div>`).join('');
}

/* ═════════════════════════════════════
   ESCAPE HTML
═════════════════════════════════════ */
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/* ═════════════════════════════════════
   RENDER CARDS  (con enlace en el icono de play)
═════════════════════════════════════ */
function renderPeliculas(peliculas) {
  const contenedor = document.getElementById('contenedorPeliculas');
  const counter    = document.getElementById('catalogCount');
  if (!contenedor) return;
  if (counter) counter.textContent = `${peliculas.length} título${peliculas.length !== 1 ? 's' : ''}`;

  if (!peliculas.length) {
    contenedor.innerHTML = `
      <div class="empty-state" role="status">
        <div class="empty-state__title">Sin resultados</div>
        <p class="empty-state__sub">No hay películas para este filtro.</p>
      </div>`;
    return;
  }

  const editIcon   = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
  const deleteIcon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z"/></svg>`;
  const playIcon   = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
  const adminActions = isLoggedIn() ? `
    <button class="film-card__btn film-card__btn--edit"   data-action="editar"  data-id="ID_PH">${editIcon} Editar</button>
    <button class="film-card__btn film-card__btn--delete" data-action="borrar"  data-id="ID_PH">${deleteIcon}</button>` : '';

  contenedor.innerHTML = peliculas.map((p, i) => {
    const safeTitulo  = esc(p.titulo);
    const placeholder = `https://placehold.co/400x600/0d0d1a/c8a96e?text=${encodeURIComponent(p.titulo || '')}`;
    const imagenUrl   = p.imagen || placeholder;
    const isFav       = favoritosSet.has(p.id);
    const anio        = p.anio ? `<span class="film-card__year">${esc(String(p.anio))}</span>` : '';
    const actions     = adminActions.replaceAll('ID_PH', String(p.id));

    // Construir el icono de play como enlace si hay link, si no como simple div
    const playButton = p.link
      ? `<a href="${esc(p.link)}" target="_blank" rel="noopener" class="film-card__play" aria-label="Reproducir ${safeTitulo}">${playIcon}</a>`
      : `<div class="film-card__play" aria-hidden="true">${playIcon}</div>`;

    return `
    <article class="film-card" data-id="${esc(String(p.id))}" aria-label="${safeTitulo}">
      <div class="film-card__media">
        <span class="film-card__num" aria-hidden="true">№ ${String(i+1).padStart(2,'0')}</span>
        <img src="${esc(imagenUrl)}" alt="Póster de ${safeTitulo}" loading="lazy" class="film-card__img"
             onerror="this.src='${placeholder}';this.onerror=null;">
        ${playButton}
      </div>
      <div class="film-card__info">
        <div class="film-card__meta">
          <span class="film-card__genre">${esc(p.genero)?.replaceAll('_',' ') || '—'}</span>${anio}
        </div>
        <h3 class="film-card__title">${safeTitulo}</h3>
        ${p.descripcion ? `<p class="film-card__desc">${esc(p.descripcion)}</p>` : ''}
        ${p.director    ? `<p class="film-card__director">Dir. ${esc(p.director)}</p>` : ''}
        <div class="film-card__actions">
          ${actions}
          <button class="film-card__btn film-card__btn--fav ${isFav ? 'film-card__btn--fav-active' : ''}"
            data-action="favorito" data-id="${p.id}"
            aria-label="${isFav ? 'Quitar de' : 'Añadir a'} favoritos: ${safeTitulo}"
            aria-pressed="${isFav}">${isFav ? '❤️' : '🤍'}</button>
        </div>
      </div>
    </article>`;
  }).join('');

  initCardTilt();
  refreshCursorTargets();
  animateCardsIn();
}

/* ═════════════════════════════════════
   DELEGACIÓN GLOBAL DE EVENTOS
═════════════════════════════════════ */
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id     = parseInt(btn.dataset.id, 10);
  switch (action) {
    case 'editar':           editarPelicula(id);   break;
    case 'borrar':           confirmDeleteMovie(id, todasLasPeliculas.find(p => p.id === id)?.titulo); break;
    case 'favorito':         toggleFavorito(id);   break;
    case 'guardar-edicion':  guardarEdicion(id);   break;
    case 'cancelar-edicion': cancelarEdicion(id);  break;
  }
});

/* ═════════════════════════════════════
   MODAL DE CONFIRMACIÓN (Bootstrap)
═════════════════════════════════════ */
let pendingDeleteId = null;

function confirmDeleteMovie(id, title) {
  pendingDeleteId = id;
  document.getElementById('deleteMovieTitle').textContent = title;
  const modalEl = document.getElementById('confirmDeleteModal');
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// Botón confirmar del modal
document.getElementById('confirmDeleteBtn')?.addEventListener('click', async () => {
  if (pendingDeleteId !== null) {
    await borrarPeliculaConfirmado(pendingDeleteId);
    pendingDeleteId = null;
    const modalEl = document.getElementById('confirmDeleteModal');
    bootstrap.Modal.getInstance(modalEl)?.hide();
  }
});

/* ═════════════════════════════════════
   BORRAR (eliminación real)
═════════════════════════════════════ */
async function borrarPeliculaConfirmado(id) {
  if (!isLoggedIn()) { showToast('Inicia sesión para eliminar películas.', 'error'); abrirModal('login'); return; }
  const pelicula = todasLasPeliculas.find(p => p.id === id);
  if (!pelicula) return;
  try {
    const res = await fetch(`${API_PELI}/${id}`, {
      method: 'DELETE',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    if (!res.ok) throw new Error();
    showToast(`"${pelicula.titulo}" eliminada.`, 'success');
    cargarPeliculas();
  } catch {
    showToast('Error al eliminar la película.', 'error');
  }
}

// Función original de borrado (ya no se usa, pero se conserva por si acaso)
async function borrarPelicula(id) {
  if (!isLoggedIn()) { showToast('Inicia sesión para eliminar películas.', 'error'); abrirModal('login'); return; }
  const pelicula = todasLasPeliculas.find(p => p.id === id); if (!pelicula) return;
  if (!confirm(`¿Eliminar "${pelicula.titulo}" de forma permanente?\nEsta acción no se puede deshacer.`)) return;
  try {
    const res = await fetch(`${API_PELI}/${id}`, {
      method: 'DELETE',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    if (!res.ok) throw new Error();
    showToast(`"${pelicula.titulo}" eliminada.`, 'success');
    cargarPeliculas();
  } catch { showToast('Error al eliminar la película.', 'error'); }
}

/* ═════════════════════════════════════
   EDITAR (con header ngrok)
═════════════════════════════════════ */
function editarPelicula(id) {
  if (!isLoggedIn()) { showToast('Inicia sesión para editar películas.', 'error'); abrirModal('login'); return; }
  const pelicula = todasLasPeliculas.find(p => p.id === id); if (!pelicula) return;
  const card = document.querySelector(`.film-card[data-id="${id}"]`); if (!card) return;
  card.dataset.originalHTML = card.innerHTML;
  const ph = `https://placehold.co/400x600/0d0d1a/c8a96e?text=${encodeURIComponent(pelicula.titulo||'')}`;
  card.innerHTML = `
    <div class="film-card__media">
      <img src="${esc(pelicula.imagen)||ph}" alt="" class="film-card__img" style="opacity:.55"
           onerror="this.src='${ph}';this.onerror=null;">
    </div>
    <div class="film-card__info">
      <input  class="film-card__input"  id="editTitulo_${id}"      value="${esc(pelicula.titulo)}"      placeholder="Título *">
      <input  class="film-card__input"  id="editDirector_${id}"    value="${esc(pelicula.director)}"    placeholder="Director *">
      <select class="film-card__select" id="editGenero_${id}">
        <option value="">Género *</option>
        <option value="ACCION">Acción</option><option value="COMEDIA">Comedia</option>
        <option value="DRAMA">Drama</option><option value="FANTASIA">Fantasía</option>
        <option value="TERROR">Terror</option><option value="CIENCIA_FICCION">Ciencia Ficción</option>
        <option value="AVENTURA">Aventura</option>
      </select>
      <textarea class="film-card__input film-card__textarea" id="editDescripcion_${id}" placeholder="Descripción">${esc(pelicula.descripcion)}</textarea>
      <input  class="film-card__input"  id="editImagen_${id}"      value="${esc(pelicula.imagen)}"      placeholder="URL imagen">
      <input  class="film-card__input"  id="editLink_${id}"        value="${esc(pelicula.link)}"        placeholder="Enlace público (YouTube, etc.)">
      <div class="film-card__form-actions">
        <button class="film-card__btn film-card__btn--edit"   data-action="guardar-edicion"  data-id="${id}">✓ Guardar</button>
        <button class="film-card__btn film-card__btn--delete" data-action="cancelar-edicion" data-id="${id}">✕ Cancelar</button>
      </div>
    </div>`;
  const sel = document.getElementById(`editGenero_${id}`);
  if (sel) sel.value = pelicula.genero || '';
}

function cancelarEdicion(id) {
  const card = document.querySelector(`.film-card[data-id="${id}"]`);
  if (card?.dataset.originalHTML) { card.innerHTML = card.dataset.originalHTML; delete card.dataset.originalHTML; }
}

async function guardarEdicion(id) {
  if (!isLoggedIn()) return;
  const pelicula = todasLasPeliculas.find(p => p.id === id); if (!pelicula) return;
  const titulo      = document.getElementById(`editTitulo_${id}`)?.value.trim();
  const director    = document.getElementById(`editDirector_${id}`)?.value.trim();
  const genero      = document.getElementById(`editGenero_${id}`)?.value;
  const descripcion = document.getElementById(`editDescripcion_${id}`)?.value.trim();
  const imagen      = document.getElementById(`editImagen_${id}`)?.value.trim();
  const link        = document.getElementById(`editLink_${id}`)?.value.trim();
  if (!titulo || !director || !genero) { showToast('Título, director y género son obligatorios.', 'error'); return; }
  try {
    const res = await fetch(`${API_PELI}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ ...pelicula, titulo, director, genero, descripcion, imagen, link })
    });
    if (!res.ok) throw new Error();
    showToast(`"${titulo}" actualizada.`, 'success');
    cargarPeliculas();
  } catch { showToast('Error al actualizar la película.', 'error'); }
}

/* ═════════════════════════════════════
   AÑADIR  (ahora incluye campo link)
═════════════════════════════════════ */
function mostrarFormularioNuevaPelicula() {
  if (!isLoggedIn()) { showToast('Inicia sesión para añadir películas.', 'error'); abrirModal('login'); return; }
  if (document.querySelector('.film-card--form')) return;
  const contenedor = document.getElementById('contenedorPeliculas'); if (!contenedor) return;
  const formCard = document.createElement('article');
  formCard.className = 'film-card film-card--form';
  formCard.innerHTML = `
    <div class="film-card__media"><span class="form-placeholder-img">🎬<br>Nueva película</span></div>
    <div class="film-card__info">
      <input  class="film-card__input" id="nuevoTitulo"      placeholder="Título *" required>
      <input  class="film-card__input" id="nuevoDirector"    placeholder="Director *" required>
      <select class="film-card__select" id="nuevoGenero" required>
        <option value="">Género *</option>
        <option value="ACCION">Acción</option><option value="COMEDIA">Comedia</option>
        <option value="DRAMA">Drama</option><option value="FANTASIA">Fantasía</option>
        <option value="TERROR">Terror</option><option value="CIENCIA_FICCION">Ciencia Ficción</option>
        <option value="AVENTURA">Aventura</option>
      </select>
      <textarea class="film-card__input film-card__textarea" id="nuevoDescripcion" placeholder="Descripción"></textarea>
      <input  class="film-card__input" id="nuevoImagen" placeholder="URL de la imagen">
      <input  class="film-card__input" id="nuevoLink"   placeholder="Enlace público (YouTube, etc.)">
      <div class="film-card__form-actions">
        <button class="film-card__btn film-card__btn--edit"   id="btnGuardarNueva">✓ Guardar</button>
        <button class="film-card__btn film-card__btn--delete" id="btnCancelarNueva">✕ Cancelar</button>
      </div>
    </div>`;
  contenedor.prepend(formCard);
  document.getElementById('btnGuardarNueva')?.addEventListener('click', guardarNuevaPelicula);
  document.getElementById('btnCancelarNueva')?.addEventListener('click', cancelarNuevaPelicula);
  setTimeout(() => document.getElementById('nuevoTitulo')?.focus(), 80);
}

function cancelarNuevaPelicula() { document.querySelector('.film-card--form')?.remove(); }

async function guardarNuevaPelicula() {
  if (!isLoggedIn()) return;
  const titulo      = document.getElementById('nuevoTitulo')?.value.trim();
  const director    = document.getElementById('nuevoDirector')?.value.trim();
  const genero      = document.getElementById('nuevoGenero')?.value;
  const descripcion = document.getElementById('nuevoDescripcion')?.value.trim();
  const imagen      = document.getElementById('nuevoImagen')?.value.trim();
  const link        = document.getElementById('nuevoLink')?.value.trim();
  if (!titulo || !director || !genero) { showToast('Título, director y género son obligatorios.', 'error'); return; }
  try {
    const res = await fetch(API_PELI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ titulo, director, genero, descripcion, imagen, link })
    });
    if (!res.ok) throw new Error();
    showToast(`"${titulo}" añadida correctamente.`, 'success');
    cancelarNuevaPelicula();
    cargarPeliculas();
  } catch { showToast('Error al añadir la película.', 'error'); }
}

/* ═════════════════════════════════════
   CARD TILT 3D
═════════════════════════════════════ */
function initCardTilt() {
  const isTouch = window.matchMedia('(hover: none)').matches;
  document.querySelectorAll('.film-card:not(.film-card--form)').forEach(card => {
    if (isTouch) {
      card.addEventListener('click', e => {
        if (e.target.closest('[data-action]')) return;
        document.querySelectorAll('.film-card.touch-active').forEach(c => { if (c !== card) c.classList.remove('touch-active'); });
        card.classList.toggle('touch-active');
      }, { passive: true });
    } else {
      card.addEventListener('mouseenter', () => { card.style.transition = 'transform 0.08s linear, box-shadow 0.4s, border-color 0.4s'; });
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width  - 0.5) * 2;
        const y = ((e.clientY - r.top)  / r.height - 0.5) * 2;
        card.style.transform = `perspective(900px) rotateY(${x*7}deg) rotateX(${-y*7}deg) scale(1.025) translateZ(8px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.55s cubic-bezier(0.16,1,0.3,1), box-shadow 0.55s, border-color 0.4s';
        card.style.transform  = 'perspective(900px) rotateY(0) rotateX(0) scale(1) translateZ(0)';
      });
    }
  });
}

/* ═════════════════════════════════════
   GSAP
═════════════════════════════════════ */
function animateCardsIn() {
  if (typeof gsap !== 'undefined')
    gsap.fromTo('.film-card', { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.055, ease: 'power3.out' });
}

function initScrollAnimations() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.from('.catalog__eyebrow, .catalog__title, .catalog__count', {
    scrollTrigger: { trigger: '.catalog', start: 'top 85%' },
    opacity: 0, y: 20, duration: 0.7, stagger: 0.12, ease: 'power3.out'
  });
}

/* ═════════════════════════════════════
   CURTAIN TRANSITION
═════════════════════════════════════ */
function curtainTransition(callback) {
  const curtain = document.getElementById('curtain');
  if (!curtain) { callback?.(); return; }
  curtain.classList.remove('curtain--opening');
  curtain.classList.add('curtain--closing');
  setTimeout(() => {
    callback?.();
    curtain.classList.remove('curtain--closing');
    curtain.classList.add('curtain--opening');
    setTimeout(() => curtain.classList.remove('curtain--opening'), 600);
  }, 560);
}

/* ═════════════════════════════════════
   CARGA DE PELÍCULAS (con header ngrok)
═════════════════════════════════════ */
async function cargarPeliculas() {
  mostrarSkeletons();
  try {
    const res = await fetch(API_PELI, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    todasLasPeliculas = await res.json();
    if (!destacadasIds || !Array.isArray(destacadasIds)) {
      const shuffled = [...todasLasPeliculas].sort(() => Math.random() - 0.5);
      destacadasIds = shuffled.slice(0, 5).map(p => p.id);
      localStorage.setItem('cineverse_destacadas', JSON.stringify(destacadasIds));
    }
    const featured = todasLasPeliculas[Math.floor(Math.random() * todasLasPeliculas.length)];
    updateHero(featured);
    fillMarquee(todasLasPeliculas);
    aplicarFiltro(generoActivo, false);
  } catch (err) {
    console.error('[Cineverse] Error al cargar películas:', err);
    showToast('No se pudo conectar con el servidor.', 'error');
    renderPeliculas([]);
  }
}

/* ═════════════════════════════════════
   BÚSQUEDA
═════════════════════════════════════ */
function buscar(q) {
  q = q.trim().toLowerCase();
  if (!q) { aplicarFiltro(generoActivo, false); return; }
  renderPeliculas(todasLasPeliculas.filter(p =>
    p.titulo?.toLowerCase().includes(q) || p.director?.toLowerCase().includes(q) ||
    p.genero?.toLowerCase().includes(q) || p.descripcion?.toLowerCase().includes(q)
  ));
}

/* ═════════════════════════════════════
   FILTRO
═════════════════════════════════════ */
function aplicarFiltro(genero, animate = true) {
  generoActivo = genero;
  let filtradas;
  if (genero === 'destacadas')      filtradas = todasLasPeliculas.filter(p => destacadasIds?.includes(p.id));
  else if (genero === 'favoritas')  filtradas = todasLasPeliculas.filter(p => favoritosSet.has(p.id));
  else if (genero === 'todos')      filtradas = todasLasPeliculas;
  else filtradas = todasLasPeliculas.filter(p => p.genero?.toLowerCase().trim() === genero.toLowerCase().trim());

  const updateUI = () => {
    renderPeliculas(filtradas);
    document.querySelectorAll('.filter-pill').forEach(b => {
      const active = b.dataset.genero === genero;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
  };
  if (animate) curtainTransition(updateUI);
  else updateUI();
}

/* ═════════════════════════════════════
   BOOT
═════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  restoreSession();
  initSidebar();
  initMobileSearch();
  initAuthModal();
  refreshCursorTargets();
  initScrollAnimations();
  updateAuthUI();
  if (isLoggedIn()) await cargarFavoritosDesdeAPI();
  cargarPeliculas();

  document.querySelectorAll('.filter-pill').forEach(pill =>
    pill.addEventListener('click', () => aplicarFiltro(pill.dataset.genero)));

  document.querySelectorAll('.nav__link[data-filter]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault(); aplicarFiltro(link.dataset.filter);
      document.querySelector('.catalog')?.scrollIntoView({ behavior:'smooth', block:'start' });
    });
  });

  document.querySelectorAll('.nav__dropdown-item[data-genero]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault(); aplicarFiltro(item.dataset.genero);
      document.querySelector('.catalog')?.scrollIntoView({ behavior:'smooth', block:'start' });
    });
  });

  document.getElementById('btnAgregarPelicula')?.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('sidebar')?.classList.remove('sidebar--open');
    document.getElementById('sidebar')?.setAttribute('aria-hidden','true');
    mostrarFormularioNuevaPelicula();
    document.querySelector('.catalog')?.scrollIntoView({ behavior:'smooth', block:'start' });
  });

  // Botón "Mi lista" del hero
  document.getElementById('btnMiLista')?.addEventListener('click', agregarDestacadaAFavoritos);

  let searchTid;
  document.getElementById('searchInput')?.addEventListener('input', e => {
    clearTimeout(searchTid);
    searchTid = setTimeout(() => buscar(e.target.value), 220);
  });
});
