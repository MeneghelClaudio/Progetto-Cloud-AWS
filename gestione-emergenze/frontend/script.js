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
        const response = await fetch('/api/auth', {
            credentials: 'include'
        });
        const data = await response.json();
        if (!data.authenticated) {
            window.location.href = '/login/';
        }
    } catch {
        window.location.href = '/login/';
    }
}

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

async function loadMyEmergencies() {
    try {
        const res = await fetch('/api/emergencies/my');
        const emergencies = await res.json();
        document.getElementById('myEmergencies').innerHTML = emergencies.map(e => createEmergencyHTML(e, false)).join('');
    } catch (err) {
        console.error('Errore:', err);
    }
}

async function loadAllEmergencies() {
    try {
        const res = await fetch('/api/emergencies');
        const emergencies = await res.json();
        document.getElementById('allEmergencies').innerHTML = emergencies.map(e => createEmergencyHTML(e, true)).join('');
        updateMap(emergencies);
    } catch (err) {
        console.error('Errore:', err);
    }
}

function createEmergencyHTML(e, showActions) {
    const statusLabel = e.status === 'in_carico' ? 'In Carico' : e.status;
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
            loadStats();
            loadMyEmergencies();
            loadAllEmergencies();
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
    }
}

function initMap() {
    if (map) return;
    
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;
    
    map = L.map('map').setView([41.8719, 12.5674], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
}

function updateMap(emergencies) {
    if (!map) return;
    
    markers.forEach(m => map.removeLayer(m));
    markers.length = 0;
    
    const activeEmergencies = emergencies.filter(e => 
        e.status !== 'chiusa' && 
        e.status !== 'annullata' && 
        e.latitude && 
        e.longitude
    );
    
    activeEmergencies.forEach(e => {
        const color = e.status === 'aperta' ? 'red' : 'blue';
        const marker = L.circleMarker([e.latitude, e.longitude], {
            color: color,
            fillColor: color,
            fillOpacity: 0.7,
            radius: 10
        }).addTo(map).bindPopup(`${e.type.toUpperCase()}<br>${e.status}`);
        markers.push(marker);
    });
    
    if (markers.length > 0) {
        map.fitBounds(L.featureGroup(markers).getBounds());
    }
}