// ── Stato globale ─────────────────────────────────────────────────────────────
let map = null;
let mapMarkers = [];
let pollInterval = null;

// Mappa modale selezione
let pickMap = null;
let pickMarker = null;
let pendingLat = null;
let pendingLng = null;

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadStats();
    loadMyEmergencies();

    document.getElementById('emergencyForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createEmergency();
    });

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
    } catch { window.location.href = '/login/'; }
}

// ── Modale mappa ──────────────────────────────────────────────────────────────
function openMapModal() {
    document.getElementById('mapModal').style.display = 'flex';
    // Inizializza la mappa la prima volta
    if (!pickMap) {
        pickMap = L.map('pickMap').setView([41.8719, 12.5674], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(pickMap);
        pickMap.on('click', (e) => setPickedLocation(e.latlng.lat, e.latlng.lng));
    }
    // Se ci sono già coordinate nel form, posiziona marker
    const lat = parseFloat(document.getElementById('emergencyLat').value);
    const lng = parseFloat(document.getElementById('emergencyLng').value);
    if (!isNaN(lat) && !isNaN(lng)) {
        setPickedLocation(lat, lng, false);
    }
    setTimeout(() => pickMap.invalidateSize(), 100);
}

function closeMapModal() {
    document.getElementById('mapModal').style.display = 'none';
    document.getElementById('searchResults').style.display = 'none';
}

function closeMapModalIfBg(e) {
    if (e.target === document.getElementById('mapModal')) closeMapModal();
}

function setPickedLocation(lat, lng, fly = true) {
    const latF = parseFloat(parseFloat(lat).toFixed(6));
    const lngF = parseFloat(parseFloat(lng).toFixed(6));
    pendingLat = latF;
    pendingLng = lngF;

    if (pickMarker) {
        pickMarker.setLatLng([latF, lngF]);
    } else {
        pickMarker = L.marker([latF, lngF], { draggable: true }).addTo(pickMap);
        pickMarker.on('dragend', (e) => {
            const p = e.target.getLatLng();
            setPickedLocation(p.lat, p.lng, false);
        });
    }
    if (fly) pickMap.flyTo([latF, lngF], Math.max(pickMap.getZoom(), 13));
    document.getElementById('modalCoords').textContent = `📍 ${latF}, ${lngF}`;
}

function confirmMapModal() {
    if (pendingLat !== null && pendingLng !== null) {
        document.getElementById('emergencyLat').value = pendingLat;
        document.getElementById('emergencyLng').value = pendingLng;
        const s = document.getElementById('geoStatus');
        s.textContent = `✓ Posizione: ${pendingLat}, ${pendingLng}`;
        s.className = 'geo-status success';
    }
    closeMapModal();
}

function clearLocation() {
    document.getElementById('emergencyLat').value = '';
    document.getElementById('emergencyLng').value = '';
    document.getElementById('geoStatus').textContent = '';
    document.getElementById('geoStatus').className = 'geo-status';
    document.getElementById('locationName').value = '';
    document.getElementById('locationNameHint').textContent = '';
    document.getElementById('locationNameHint').className = 'geo-status';
    pendingLat = null; pendingLng = null;
    if (pickMarker && pickMap) { pickMap.removeLayer(pickMarker); pickMarker = null; }
    document.getElementById('modalCoords').textContent = 'Nessuna posizione selezionata';
}


// ── Reverse geocoding: coordinate → nome luogo (Nominatim) ───────────────────
async function reverseGeocode(lat, lng) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17&accept-language=it`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.display_name) {
            // Prendi le prime 3 parti (es. "Via Roma, Milano, Lombardia")
            return data.display_name.split(',').slice(0, 3).join(',').trim();
        }
    } catch { /* silenzioso */ }
    return null;
}

// Imposta location_name nel campo e mostra hint
function setLocationName(name, hint) {
    const input = document.getElementById('locationName');
    const hintEl = document.getElementById('locationNameHint');
    if (name && !input.value) {  // non sovrascrivere se l'utente ha già scritto qualcosa
        input.value = name;
    }
    if (hint) {
        hintEl.textContent = hint;
        hintEl.className = 'geo-status success';
    }
}

// ── GPS ───────────────────────────────────────────────────────────────────────
function useMyLocation() {
    const btn = document.getElementById('geoBtn');
    const status = document.getElementById('geoStatus');
    if (!navigator.geolocation) {
        status.textContent = 'GPS non disponibile (richiede HTTPS).';
        status.className = 'geo-status error';
        return;
    }
    btn.disabled = true;
    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            btn.disabled = false;
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            document.getElementById('emergencyLat').value = lat.toFixed(6);
            document.getElementById('emergencyLng').value = lng.toFixed(6);
            status.textContent = `✓ GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            status.className = 'geo-status success';
            // Reverse geocoding automatico
            const hint = document.getElementById('locationNameHint');
            hint.textContent = 'Ricerca indirizzo...';
            hint.className = 'geo-status';
            const name = await reverseGeocode(lat.toFixed(6), lng.toFixed(6));
            if (name) setLocationName(name, `✓ Indirizzo rilevato automaticamente`);
            else { hint.textContent = ''; }
        },
        (err) => {
            btn.disabled = false;
            const msgs = { 1: 'Permesso negato (richiede HTTPS).', 2: 'Posizione non disponibile.', 3: 'Timeout.' };
            status.textContent = msgs[err.code] || 'Errore GPS.';
            status.className = 'geo-status error';
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// ── Ricerca indirizzo (Nominatim) ─────────────────────────────────────────────
async function searchAddress() {
    const query = document.getElementById('addressSearch').value.trim();
    if (!query) return;
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '<div class="search-item loading">Ricerca...</div>';
    resultsDiv.style.display = 'block';
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=it`;
        const res = await fetch(url);
        const data = await res.json();
        if (!data.length) { resultsDiv.innerHTML = '<div class="search-item">Nessun risultato.</div>'; return; }
        resultsDiv.innerHTML = data.map(r => `
            <div class="search-item" onclick="selectResult(${r.lat},${r.lon},'${r.display_name.replace(/'/g,"\\'")}')">
                📍 ${r.display_name}
            </div>`).join('');
    } catch { resultsDiv.innerHTML = '<div class="search-item error">Errore ricerca.</div>'; }
}

function selectResult(lat, lng, label) {
    document.getElementById('searchResults').style.display = 'none';
    const shortLabel = label.split(',').slice(0,3).join(',').trim();
    document.getElementById('addressSearch').value = label.split(',').slice(0,2).join(',');
    setPickedLocation(parseFloat(lat), parseFloat(lng));
    setLocationName(shortLabel, '✓ Luogo dalla ricerca');
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('#addressSearch') && !e.target.closest('#searchResults') && !e.target.closest('.btn-search')) {
        const r = document.getElementById('searchResults');
        if (r) r.style.display = 'none';
    }
});

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats() {
    try {
        const res = await fetch('/api/emergencies/stats', { credentials: 'include' });
        const s = await res.json();
        document.getElementById('countOpen').textContent = s.open;
        document.getElementById('countInCarico').textContent = s.in_carico;
        document.getElementById('countClosed').textContent = s.closed;
        document.getElementById('avgDuration').textContent = s.avg_duration ? Math.round(s.avg_duration) : '-';
    } catch {}
}

// ── Liste ─────────────────────────────────────────────────────────────────────
async function loadMyEmergencies() {
    try {
        const res = await fetch('/api/emergencies/my', { credentials: 'include' });
        const list = await res.json();
        document.getElementById('myEmergencies').innerHTML =
            list.length ? list.map(e => emergencyCard(e, false)).join('') : '<p class="empty">Nessuna segnalazione.</p>';
    } catch {}
}

async function loadAllEmergencies() {
    try {
        const res = await fetch('/api/emergencies', { credentials: 'include' });
        const list = await res.json();
        document.getElementById('allEmergencies').innerHTML =
            list.length ? list.map(e => emergencyCard(e, true)).join('') : '<p class="empty">Nessuna segnalazione.</p>';
        updateMap(list);
        loadStats();
    } catch {}
}

function emergencyCard(e, showActions) {
    const labels = { aperta:'Aperta', in_carico:'In Carico', chiusa:'Chiusa', annullata:'Annullata' };
    return `
        <div class="emergency-item">
            <div class="header">
                <span class="type">${e.type.toUpperCase()}</span>
                <span class="status ${e.status}">${labels[e.status]||e.status}</span>
            </div>
            ${e.username ? `<div class="meta-user">👤 ${e.username}</div>` : ''}
            ${e.location_name ? `<div class="location-name">📌 ${e.location_name}</div>` : ''}
            <div class="desc">${e.description}</div>
            <div class="meta">${e.latitude ? `🌐 ${parseFloat(e.latitude).toFixed(4)}, ${parseFloat(e.longitude).toFixed(4)} · ` : ''}${new Date(e.created_at).toLocaleString('it-IT')}</div>
            ${showActions && e.status!=='chiusa' && e.status!=='annullata' ? `
            <div class="emergency-actions">
                ${e.status==='aperta' ? `<button class="btn-action btn-take" onclick="updateStatus(${e.id},'in_carico')">Prendi in Carico</button>` : ''}
                <button class="btn-action btn-close"  onclick="updateStatus(${e.id},'chiusa')">Chiudi</button>
                <button class="btn-action btn-cancel" onclick="updateStatus(${e.id},'annullata')">Annulla</button>
            </div>` : ''}
        </div>`;
}

// ── Crea emergenza ────────────────────────────────────────────────────────────
async function createEmergency() {
    const latVal = document.getElementById('emergencyLat').value;
    const lngVal = document.getElementById('emergencyLng').value;

    if (!latVal || !lngVal) {
        showToast('La posizione è obbligatoria. Usa GPS o seleziona sulla mappa.', true);
        return;
    }

    const data = {
        type: document.getElementById('emergencyType').value,
        description: document.getElementById('emergencyDesc').value,
        latitude: latVal,
        longitude: lngVal,
        location_name: document.getElementById('locationName').value.trim() || null
    };
    try {
        const res = await fetch('/api/emergencies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        if (res.ok) {
            document.getElementById('emergencyForm').reset();
            document.getElementById('locationName').value = '';
            document.getElementById('locationNameHint').textContent = '';
            clearLocation();
            loadStats(); loadMyEmergencies();
            if (document.getElementById('centralView').style.display !== 'none') loadAllEmergencies();
            showToast('Segnalazione inviata!');
        } else {
            const err = await res.json();
            showToast(err.error || 'Errore invio', true);
        }
    } catch { showToast('Errore di connessione', true); }
}

async function updateStatus(id, status) {
    try {
        const res = await fetch(`/api/emergencies/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status })
        });
        if (res.ok) { loadStats(); loadMyEmergencies(); loadAllEmergencies(); }
        else showToast('Errore aggiornamento', true);
    } catch { showToast('Errore connessione', true); }
}

// ── Switch vista ──────────────────────────────────────────────────────────────
function switchView(view) {
    document.querySelectorAll('.btn-view').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    if (view === 'operator') {
        document.getElementById('operatorView').style.display = 'block';
        document.getElementById('centralView').style.display = 'none';
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    } else {
        document.getElementById('operatorView').style.display = 'none';
        document.getElementById('centralView').style.display = 'block';
        loadAllEmergencies();
        initMainMap();
        setTimeout(() => { if (map) map.invalidateSize(); }, 300);
        pollInterval = setInterval(loadAllEmergencies, 10000);
    }
}

// ── Mappa centrale ────────────────────────────────────────────────────────────
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
    const active = emergencies.filter(e => e.status!=='chiusa' && e.status!=='annullata' && e.latitude && e.longitude);
    active.forEach(e => {
        const color = e.status==='aperta' ? '#ef4444' : '#3b82f6';
        const m = L.circleMarker([parseFloat(e.latitude), parseFloat(e.longitude)], {
            color, fillColor: color, fillOpacity: 0.85, radius: 11, weight: 2
        }).addTo(map).bindPopup(`<strong>${e.type.toUpperCase()}</strong><br>${e.description}<br><em>${e.status==='in_carico'?'In Carico':'Aperta'}</em>`);
        mapMarkers.push(m);
    });
    if (mapMarkers.length > 0) map.fitBounds(L.featureGroup(mapMarkers).getBounds(), { padding: [40,40] });
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, isError=false) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id='toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = 'toast' + (isError ? ' toast-error' : '');
    t.style.display = 'block';
    setTimeout(() => { t.style.display = 'none'; }, 3000);
}
