// ── Stato globale ─────────────────────────────────────────────────────────────
let map = null;           // mappa centrale operativa
let pickMap = null;       // mappa di selezione coordinate nel form
let pickMarker = null;    // marker sulla mappa di selezione
let mapMarkers = [];      // marker sulla mappa centrale
let pollInterval = null;  // intervallo polling

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadStats();
    loadMyEmergencies();
    initPickMap();

    document.getElementById('emergencyForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createEmergency();
    });

    // Ricerca indirizzo con Enter
    document.getElementById('addressSearch').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); searchAddress(); }
    });
});

// ── Auth ──────────────────────────────────────────────────────────────────────
async function checkAuth() {
    try {
        const res = await fetch('/api/check-auth', { credentials: 'include' });
        const data = await res.json();
        if (!data.authenticated) window.location.href = '/login/';
    } catch {
        window.location.href = '/login/';
    }
}

// ── Mappa selezione coordinate (form operatore) ───────────────────────────────
function initPickMap() {
    pickMap = L.map('pickMap', { zoomControl: true }).setView([41.8719, 12.5674], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(pickMap);

    pickMap.on('click', (e) => {
        setPickedLocation(e.latlng.lat, e.latlng.lng);
    });
}

function setPickedLocation(lat, lng) {
    const latFixed = parseFloat(lat.toFixed(6));
    const lngFixed = parseFloat(lng.toFixed(6));
    document.getElementById('emergencyLat').value = latFixed;
    document.getElementById('emergencyLng').value = lngFixed;

    if (pickMarker) {
        pickMarker.setLatLng([latFixed, lngFixed]);
    } else {
        pickMarker = L.marker([latFixed, lngFixed], { draggable: true }).addTo(pickMap);
        pickMarker.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            document.getElementById('emergencyLat').value = pos.lat.toFixed(6);
            document.getElementById('emergencyLng').value = pos.lng.toFixed(6);
        });
    }
    pickMap.setView([latFixed, lngFixed], Math.max(pickMap.getZoom(), 13));

    const status = document.getElementById('geoStatus');
    status.textContent = `✓ Posizione: ${latFixed}, ${lngFixed}`;
    status.className = 'geo-status success';
}

function clearLocation() {
    document.getElementById('emergencyLat').value = '';
    document.getElementById('emergencyLng').value = '';
    document.getElementById('geoStatus').textContent = '';
    document.getElementById('geoStatus').className = 'geo-status';
    if (pickMarker) { pickMap.removeLayer(pickMarker); pickMarker = null; }
}

// ── GPS ───────────────────────────────────────────────────────────────────────
function useMyLocation() {
    const btn = document.getElementById('geoBtn');
    const status = document.getElementById('geoStatus');
    if (!navigator.geolocation) {
        status.textContent = 'Geolocalizzazione non supportata (richiede HTTPS).';
        status.className = 'geo-status error';
        return;
    }
    btn.disabled = true;
    btn.textContent = '⏳ Rilevamento...';
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            btn.disabled = false;
            btn.textContent = '📍 Usa GPS';
            setPickedLocation(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
            btn.disabled = false;
            btn.textContent = '📍 Usa GPS';
            const msgs = { 1: 'Permesso negato (richiede HTTPS su EC2).', 2: 'Posizione non disponibile.', 3: 'Timeout. Riprova.' };
            status.textContent = msgs[err.code] || 'Errore geolocalizzazione.';
            status.className = 'geo-status error';
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// ── Ricerca indirizzo (Nominatim / OpenStreetMap) ─────────────────────────────
async function searchAddress() {
    const query = document.getElementById('addressSearch').value.trim();
    if (!query) return;
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '<div class="search-item loading">Ricerca in corso...</div>';
    resultsDiv.style.display = 'block';

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=it`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'it' } });
        const data = await res.json();
        if (data.length === 0) {
            resultsDiv.innerHTML = '<div class="search-item">Nessun risultato trovato.</div>';
            return;
        }
        resultsDiv.innerHTML = data.map(r => `
            <div class="search-item" onclick="selectResult(${r.lat}, ${r.lon}, '${r.display_name.replace(/'/g, "\\'")}')">
                📍 ${r.display_name}
            </div>
        `).join('');
    } catch {
        resultsDiv.innerHTML = '<div class="search-item error">Errore durante la ricerca.</div>';
    }
}

function selectResult(lat, lng, label) {
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('addressSearch').value = label.split(',').slice(0, 2).join(',');
    setPickedLocation(parseFloat(lat), parseFloat(lng));
}

// Chiudi risultati cliccando altrove
document.addEventListener('click', (e) => {
    if (!e.target.closest('#addressSearch') && !e.target.closest('#searchResults') && !e.target.closest('.btn-search')) {
        const r = document.getElementById('searchResults');
        if (r) r.style.display = 'none';
    }
});

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats() {
    try {
        const res = await fetch('/api/emergencies/stats');
        const stats = await res.json();
        document.getElementById('countOpen').textContent = stats.open;
        document.getElementById('countInCarico').textContent = stats.in_carico;
        document.getElementById('countClosed').textContent = stats.closed;
        document.getElementById('avgDuration').textContent =
            stats.avg_duration ? Math.round(stats.avg_duration) + ' min' : '-';
    } catch (err) {
        console.error('Errore stats:', err);
    }
}

// ── Liste emergenze ───────────────────────────────────────────────────────────
async function loadMyEmergencies() {
    try {
        const res = await fetch('/api/emergencies/my');
        const list = await res.json();
        document.getElementById('myEmergencies').innerHTML =
            list.length ? list.map(e => emergencyCard(e, false)).join('') :
            '<p class="empty">Nessuna segnalazione.</p>';
    } catch (err) { console.error(err); }
}

async function loadAllEmergencies() {
    try {
        const res = await fetch('/api/emergencies');
        const list = await res.json();
        document.getElementById('allEmergencies').innerHTML =
            list.length ? list.map(e => emergencyCard(e, true)).join('') :
            '<p class="empty">Nessuna segnalazione.</p>';
        updateMap(list);
        loadStats();
    } catch (err) { console.error(err); }
}

function emergencyCard(e, showActions) {
    const labels = { aperta: 'Aperta', in_carico: 'In Carico', chiusa: 'Chiusa', annullata: 'Annullata' };
    const label = labels[e.status] || e.status;
    return `
        <div class="emergency-item">
            <div class="header">
                <span class="type">${e.type.toUpperCase()}</span>
                <span class="status ${e.status}">${label}</span>
            </div>
            ${e.username ? `<div class="meta-user">👤 ${e.username}</div>` : ''}
            <div class="desc">${e.description}</div>
            <div class="meta">
                ${e.latitude ? `📍 ${parseFloat(e.latitude).toFixed(4)}, ${parseFloat(e.longitude).toFixed(4)} · ` : ''}
                ${new Date(e.created_at).toLocaleString('it-IT')}
            </div>
            ${showActions && e.status !== 'chiusa' && e.status !== 'annullata' ? `
            <div class="emergency-actions">
                ${e.status === 'aperta' ? `<button class="btn-action btn-take" onclick="updateStatus(${e.id},'in_carico')">Prendi in Carico</button>` : ''}
                <button class="btn-action btn-close" onclick="updateStatus(${e.id},'chiusa')">Chiudi</button>
                <button class="btn-action btn-cancel" onclick="updateStatus(${e.id},'annullata')">Annulla</button>
            </div>` : ''}
        </div>`;
}

// ── Crea emergenza ────────────────────────────────────────────────────────────
async function createEmergency() {
    const latVal = document.getElementById('emergencyLat').value;
    const lngVal = document.getElementById('emergencyLng').value;
    const data = {
        type: document.getElementById('emergencyType').value,
        description: document.getElementById('emergencyDesc').value,
        latitude: latVal || null,
        longitude: lngVal || null
    };
    try {
        const res = await fetch('/api/emergencies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            document.getElementById('emergencyForm').reset();
            clearLocation();
            loadStats();
            loadMyEmergencies();
            if (document.getElementById('centralView').style.display !== 'none') loadAllEmergencies();
            showToast('Segnalazione inviata con successo!');
        } else {
            const err = await res.json();
            showToast(err.error || 'Errore invio segnalazione', true);
        }
    } catch { showToast('Errore di connessione', true); }
}

// ── Aggiorna stato ────────────────────────────────────────────────────────────
async function updateStatus(id, status) {
    try {
        const res = await fetch(`/api/emergencies/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (res.ok) { loadStats(); loadMyEmergencies(); loadAllEmergencies(); }
        else showToast('Errore aggiornamento stato', true);
    } catch { showToast('Errore di connessione', true); }
}

// ── Switch vista ──────────────────────────────────────────────────────────────
function switchView(view) {
    document.querySelectorAll('.btn-view').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    if (view === 'operator') {
        document.getElementById('operatorView').style.display = 'grid';
        document.getElementById('centralView').style.display = 'none';
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    } else {
        document.getElementById('operatorView').style.display = 'none';
        document.getElementById('centralView').style.display = 'grid';
        loadAllEmergencies();
        initMainMap();
        setTimeout(() => { if (map) map.invalidateSize(); }, 300);
        // Polling ogni 10 secondi per aggiornamenti in tempo reale
        pollInterval = setInterval(loadAllEmergencies, 10000);
    }
}

// ── Mappa centrale operativa ──────────────────────────────────────────────────
function initMainMap() {
    if (map) return;
    map = L.map('map').setView([41.8719, 12.5674], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
}

function updateMap(emergencies) {
    if (!map) return;
    mapMarkers.forEach(m => map.removeLayer(m));
    mapMarkers = [];

    const active = emergencies.filter(e =>
        e.status !== 'chiusa' && e.status !== 'annullata' && e.latitude && e.longitude
    );

    active.forEach(e => {
        const color = e.status === 'aperta' ? '#ef4444' : '#3b82f6';
        const m = L.circleMarker([parseFloat(e.latitude), parseFloat(e.longitude)], {
            color, fillColor: color, fillOpacity: 0.85, radius: 11, weight: 2
        }).addTo(map).bindPopup(`
            <strong>${e.type.toUpperCase()}</strong><br>
            ${e.description}<br>
            <em>${e.status === 'in_carico' ? 'In Carico' : 'Aperta'}</em><br>
            <small>${e.username || ''}</small>
        `);
        mapMarkers.push(m);
    });

    if (mapMarkers.length > 0) {
        map.fitBounds(L.featureGroup(mapMarkers).getBounds(), { padding: [40, 40] });
    }
}

// ── Toast notifica ────────────────────────────────────────────────────────────
function showToast(msg, isError = false) {
    let t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = 'toast' + (isError ? ' toast-error' : '');
    t.style.display = 'block';
    setTimeout(() => { t.style.display = 'none'; }, 3000);
}
