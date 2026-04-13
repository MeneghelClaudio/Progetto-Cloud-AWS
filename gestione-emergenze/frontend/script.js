let map;
const markers = [];

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadStats();
    loadMyEmergencies();

    document.getElementById('emergencyForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createEmergency();
    });
});

async function checkAuth() {
    try {
        const response = await fetch('/api/check-auth', { credentials: 'include' });
        const data = await response.json();
        if (!data.authenticated) {
            window.location.href = '/login/';
        }
    } catch {
        window.location.href = '/login/';
    }
}

// ── Geolocation ──────────────────────────────────────────────
function useMyLocation() {
    const btn = document.getElementById('geoBtn');
    const status = document.getElementById('geoStatus');

    if (!navigator.geolocation) {
        status.textContent = 'Geolocalizzazione non supportata dal browser.';
        status.className = 'geo-status error';
        return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ Rilevamento...';
    status.textContent = '';
    status.className = 'geo-status';

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude.toFixed(6);
            const lng = pos.coords.longitude.toFixed(6);
            document.getElementById('emergencyLat').value = lat;
            document.getElementById('emergencyLng').value = lng;
            btn.disabled = false;
            btn.textContent = '📍 Usa posizione';
            status.textContent = `✓ Posizione rilevata: ${lat}, ${lng}`;
            status.className = 'geo-status success';
        },
        (err) => {
            btn.disabled = false;
            btn.textContent = '📍 Usa posizione';
            const msgs = {
                1: 'Permesso negato. Abilita la geolocalizzazione nel browser.',
                2: 'Posizione non disponibile.',
                3: 'Timeout. Riprova.'
            };
            status.textContent = msgs[err.code] || 'Errore sconosciuto.';
            status.className = 'geo-status error';
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// ── Stats ────────────────────────────────────────────────────
async function loadStats() {
    try {
        const res = await fetch('/api/emergencies/stats');
        const stats = await res.json();
        document.getElementById('countOpen').textContent = stats.open;
        document.getElementById('countInCarico').textContent = stats.in_carico;
        document.getElementById('countClosed').textContent = stats.closed;
        document.getElementById('avgDuration').textContent = stats.avg_duration ? Math.round(stats.avg_duration) : '-';
    } catch (err) {
        console.error('Errore stats:', err);
    }
}

// ── Lists ────────────────────────────────────────────────────
async function loadMyEmergencies() {
    try {
        const res = await fetch('/api/emergencies/my');
        const emergencies = await res.json();
        document.getElementById('myEmergencies').innerHTML =
            emergencies.length ? emergencies.map(e => createEmergencyHTML(e, false)).join('') : '<p class="empty">Nessuna segnalazione.</p>';
    } catch (err) {
        console.error('Errore:', err);
    }
}

async function loadAllEmergencies() {
    try {
        const res = await fetch('/api/emergencies');
        const emergencies = await res.json();
        document.getElementById('allEmergencies').innerHTML =
            emergencies.length ? emergencies.map(e => createEmergencyHTML(e, true)).join('') : '<p class="empty">Nessuna segnalazione.</p>';
        updateMap(emergencies);
    } catch (err) {
        console.error('Errore:', err);
    }
}

function createEmergencyHTML(e, showActions) {
    const statusLabel = e.status === 'in_carico' ? 'In Carico' : e.status.charAt(0).toUpperCase() + e.status.slice(1);
    return `
        <div class="emergency-item">
            <div class="header">
                <span class="type">${e.type.toUpperCase()}</span>
                <span class="status ${e.status}">${statusLabel}</span>
            </div>
            <div class="desc">${e.description}</div>
            <div class="meta">Lat: ${e.latitude || '-'}, Lng: ${e.longitude || '-'} | ${new Date(e.created_at).toLocaleString()}</div>
            ${showActions && e.status !== 'chiusa' && e.status !== 'annullata' ? `
            <div class="emergency-actions">
                ${e.status === 'aperta' ? `<button class="btn-action btn-take" onclick="updateStatus(${e.id}, 'in_carico')">Prendi in Carico</button>` : ''}
                <button class="btn-action btn-close" onclick="updateStatus(${e.id}, 'chiusa')">Chiudi</button>
                <button class="btn-action btn-cancel" onclick="updateStatus(${e.id}, 'annullata')">Annulla</button>
            </div>` : ''}
        </div>
    `;
}

// ── Create / Update ──────────────────────────────────────────
async function createEmergency() {
    const data = {
        type: document.getElementById('emergencyType').value,
        description: document.getElementById('emergencyDesc').value,
        latitude: document.getElementById('emergencyLat').value || null,
        longitude: document.getElementById('emergencyLng').value || null
    };

    try {
        const res = await fetch('/api/emergencies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            document.getElementById('emergencyForm').reset();
            document.getElementById('geoStatus').textContent = '';
            loadStats();
            loadMyEmergencies();
            // Se la vista centrale è aperta, aggiorna anche quella
            if (document.getElementById('centralView').style.display !== 'none') {
                loadAllEmergencies();
            }
            alert('Segnalazione inviata!');
        } else {
            const err = await res.json();
            alert(err.error || 'Errore invio segnalazione');
        }
    } catch (err) {
        alert('Errore di connessione');
    }
}

async function updateStatus(id, status) {
    try {
        const res = await fetch(`/api/emergencies/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        if (res.ok) {
            loadStats();
            loadMyEmergencies();
            loadAllEmergencies();
        } else {
            alert('Errore aggiornamento stato');
        }
    } catch (err) {
        alert('Errore di connessione');
    }
}

// ── View toggle ──────────────────────────────────────────────
function switchView(view) {
    document.querySelectorAll('.btn-view').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    if (view === 'operator') {
        document.getElementById('operatorView').style.display = 'grid';
        document.getElementById('centralView').style.display = 'none';
    } else {
        document.getElementById('operatorView').style.display = 'none';
        document.getElementById('centralView').style.display = 'grid';
        loadAllEmergencies();
        initMap();
        setTimeout(() => { if (map) map.invalidateSize(); }, 300);
    }
}

// ── Map ──────────────────────────────────────────────────────
function initMap() {
    if (map) return;
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    map = L.map('map').setView([41.8719, 12.5674], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
}

function updateMap(emergencies) {
    if (!map) return;

    markers.forEach(m => map.removeLayer(m));
    markers.length = 0;

    const active = emergencies.filter(e =>
        e.status !== 'chiusa' &&
        e.status !== 'annullata' &&
        e.latitude &&
        e.longitude
    );

    active.forEach(e => {
        const color = e.status === 'aperta' ? '#ef4444' : '#f97316';
        const marker = L.circleMarker([parseFloat(e.latitude), parseFloat(e.longitude)], {
            color: color,
            fillColor: color,
            fillOpacity: 0.8,
            radius: 10,
            weight: 2
        }).addTo(map).bindPopup(`
            <strong>${e.type.toUpperCase()}</strong><br>
            ${e.description}<br>
            <em>${e.status === 'in_carico' ? 'In Carico' : e.status}</em>
        `);
        markers.push(marker);
    });

    if (markers.length > 0) {
        map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [40, 40] });
    }
}
