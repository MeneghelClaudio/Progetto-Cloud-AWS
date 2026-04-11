// Impostato in base al mese in corso (formato YYYY-MM)
const currentMonthId = "2026-04"; 

// Recupero container
const timelineContainer = document.getElementById('timeline');

// Controllo esistenza container (evita errori runtime)
if (!timelineContainer) {
    console.error("Elemento #timeline non trovato nel DOM");
}

// Funzione per abbreviare "Ottobre 2025" in "Ott '25"
function abbreviaMese(stringaMese) {
    if (!stringaMese) return "";
    
    const parti = stringaMese.split(" ");
    if (parti.length < 2) return stringaMese;

    const meseCorto = parti[0].substring(0, 3);
    const annoCorto = parti[1].substring(2);

    return `${meseCorto} '${annoCorto}`;
}

// Funzione per creare i tag html
function createTags(items) {
    if (!items || items.length === 0) {
        return '<p class="empty-text">Nessun dato</p>';
    }

    return `
        <div class="tags-container">
            ${items.map(item => `<span class="tag">${item}</span>`).join('')}
        </div>
    `;
}

// Funzione principale di caricamento
async function loadTimeline() {
    try {
        const response = await fetch('data.json');

        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}`);
        }

        const timelineData = await response.json();

        // Pulizia container (evita duplicazioni)
        timelineContainer.innerHTML = "";

        timelineData.forEach((item, index) => {
            let statusClass = "status-future";

            if (item.id < currentMonthId) statusClass = "status-completed";
            if (item.id === currentMonthId) statusClass = "status-current";

            // Layout fisso - tutti sopra la linea
            const tooltipClass = "tooltip-top";
            const labelClass = "label-bottom";

            // Gestione bordi
            let edgeClass = "";
            if (index === 0) edgeClass = "first-node";
            if (index === timelineData.length - 1) edgeClass = "last-node";

            const element = document.createElement('div');
            element.className = `node-container ${statusClass} ${tooltipClass} ${labelClass} ${edgeClass}`;

            element.innerHTML = `
                <div class="timeline-dot"></div>
                <div class="month-label">${abbreviaMese(item.mese)}</div>
                
                <div class="info-card">
                    <div class="card-title">${item.mese}</div>
                    <p class="card-desc">${item.descrizione}</p>
                    
                    <div class="section-title">📚 Materie</div>
                    ${createTags(item.materie)}
                    
                    <div class="section-title">🛠️ Strumenti</div>
                    ${createTags(item.strumenti)}
                    
                    <div class="section-title">💻 Linguaggi</div>
                    ${createTags(item.linguaggi)}
                    
                    <div class="section-title">🖥️ Ambienti</div>
                    ${createTags(item.ambienti)}
                </div>
            `;

            timelineContainer.appendChild(element);
        });

    } catch (error) {
        console.error("Errore nel caricamento JSON:", error);

        timelineContainer.innerHTML = `
            <div style="text-align: center; color: #f87171; background: #450a0a; padding: 1rem; border-radius: 8px;">
                <p><strong>Errore di caricamento dati.</strong></p>
                <p style="font-size: 0.8rem; margin-top: 0.5rem;">
                    Verifica che il file <code>data.json</code> sia presente e valido.
                </p>
            </div>
        `;
    }
}

// Avvio caricamento
loadTimeline();