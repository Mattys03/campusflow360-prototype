/* CampusFlow 360 - Engine com Permissoes, Triagem e Tabs */

const API_URL = "http://localhost:3001/api";

let currentRole = null;

let tickets = JSON.parse(localStorage.getItem("campusflow360_tickets")) || [
    {
        id: 106,
        solicitante: "Prof. Jaiminho Neto",
        matricula: "2-998822",
        local: "Bloco B - Sala 201",
        equipamento: "Datashow (Tombamento #1293)",
        prioridade: "Alta",
        titulo: "Datashow com superaquecimento",
        descricao: "Datashow nao liga e esta com a luz de superaquecimento piscando em vermelho.",
        status: "Aberto",
        timestamp: "14:22",
        hasPhoto: true
    },
    {
        id: 105,
        solicitante: "Guilherme S.",
        matricula: "1-99999999",
        local: "Bloco A - Lab 102",
        equipamento: "Computador (Tombamento #2203)",
        prioridade: "Media",
        titulo: "Portas USB traseiras inoperantes",
        descricao: "Mouse e teclado nao estao sendo reconhecidos pelas portas USB traseiras.",
        status: "Aberto",
        timestamp: "13:50",
        hasPhoto: false
    },
    {
        id: 104,
        solicitante: "Prof. Ana Lucia",
        matricula: "2-771144",
        local: "Bloco A - Lab 104",
        equipamento: "Infraestrutura de Rede (Roteador)",
        prioridade: "Alta",
        titulo: "Quedas intermitentes de conexao Wi-Fi",
        descricao: "Conexao wi-fi caindo de 5 em 5 minutos durante a aula pratica.",
        status: "Em Atendimento",
        timestamp: "14:45",
        hasPhoto: true
    }
];

let historicalRoomFailures = JSON.parse(localStorage.getItem("campusflow360_failures")) || {
    "Bloco B - Sala 201": 19,
    "Bloco A - Lab 102": 14,
    "Bloco A - Lab 104": 8,
    "Bloco C - Auditorio Principal": 3
};

let isPhotoAttached = false;
let preventiveApplied = localStorage.getItem("campusflow360_preventive") === "true";

const priorityWeight = { "Alta": 3, "Media": 2, "Baixa": 1 };

function saveLocal() {
    localStorage.setItem("campusflow360_tickets", JSON.stringify(tickets));
    localStorage.setItem("campusflow360_failures", JSON.stringify(historicalRoomFailures));
    localStorage.setItem("campusflow360_preventive", preventiveApplied.toString());
}

// DOM Elements
const loginOverlay = document.getElementById("login-overlay");
const appMain = document.getElementById("app-main");
const userRoleLabel = document.getElementById("user-role-label");
const ticketForm = document.getElementById("ticket-form");
const solicitanteName = document.getElementById("solicitante-name");
const solicitanteEnrollment = document.getElementById("solicitante-enrollment");
const ticketLocation = document.getElementById("ticket-location");
const ticketEquipment = document.getElementById("ticket-equipment");
const ticketPriority = document.getElementById("ticket-priority");
const priorityGroup = document.getElementById("priority-group");
const ticketTitle = document.getElementById("ticket-title");
const ticketDescription = document.getElementById("ticket-description");
const fileUploadTrigger = document.getElementById("file-upload-trigger");
const uploadFeedback = document.getElementById("upload-feedback");
const ticketsQueue = document.getElementById("tickets-queue");
const kpiPendingCount = document.getElementById("kpi-pending-count");
const kpiCriticalIndex = document.getElementById("kpi-critical-index");
const kpiTriageCount = document.getElementById("kpi-triage-count");
const kpiTriageCard = document.getElementById("kpi-triage-card");
const toast = document.getElementById("toast");
const defectiveRoomsList = document.getElementById("defective-rooms-list");
const btnPreventiveMaintenance = document.getElementById("btn-preventive-maintenance");
const riskBarBlocoB = document.getElementById("risk-bar-bloco-b");
const riskBarBlocoA = document.getElementById("risk-bar-bloco-a");
const triageList = document.getElementById("triage-list");
const triageTabCount = document.getElementById("triage-tab-count");

// Tab elements
const tabBtnAbertura = document.getElementById("tab-btn-abertura");
const tabBtnTriagem = document.getElementById("tab-btn-triagem");
const tabBtnFila = document.getElementById("tab-btn-fila");
const tabBtnAnalise = document.getElementById("tab-btn-analise");

// Character counters
const counterName = document.getElementById("counter-name");
const counterMatricula = document.getElementById("counter-matricula");
const counterTitle = document.getElementById("counter-title");
const counterDesc = document.getElementById("counter-desc");

// Role Selection
window.selectRole = function(role) {
    currentRole = role;
    loginOverlay.style.display = "none";
    appMain.style.display = "block";

    const roleLabels = {
        aluno_professor: "Aluno / Professor",
        gestao: "Gestao",
        admin: "Administrador"
    };
    userRoleLabel.textContent = roleLabels[role] || role;

    applyPermissions();
    init();
};

// Back to login
const btnBackLogin = document.getElementById("btn-back-login");
btnBackLogin.addEventListener("click", () => {
    appMain.style.display = "none";
    loginOverlay.style.display = "flex";
    currentRole = null;
});

function applyPermissions() {
    tabBtnAbertura.style.display = "";
    tabBtnTriagem.style.display = "";
    tabBtnFila.style.display = "";
    tabBtnAnalise.style.display = "";
    kpiTriageCard.style.display = "";

    if (currentRole === "aluno_professor") {
        // ONLY: open tickets (no priority, no triage, no queue, no analysis)
        tabBtnTriagem.style.display = "none";
        tabBtnFila.style.display = "none";
        tabBtnAnalise.style.display = "none";
        kpiTriageCard.style.display = "none";
        priorityGroup.style.display = "none";
    } else if (currentRole === "gestao") {
        // CAN: open tickets, triage, view queue (read-only), view analysis (read-only)
        // CANNOT: choose priority when opening, change ticket status, run preventive maintenance
        priorityGroup.style.display = "none";
    } else {
        // ADMIN: full access - can open with priority, triage, change status, run maintenance
        priorityGroup.style.display = "";
    }

    switchTab("tab-abertura");
}

// Tab Navigation
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const tabId = btn.getAttribute("data-tab");
        switchTab(tabId);
    });
});

function switchTab(tabId) {
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));

    const panel = document.getElementById(tabId);
    if (panel) panel.classList.add("active");

    const btn = document.querySelector(`[data-tab="${tabId}"]`);
    if (btn) btn.classList.add("active");
}

// Character Counters
function setupCharCounters() {
    function bindCounter(input, counter, max) {
        if (!input || !counter) return;
        const update = () => {
            const len = input.value.length;
            counter.textContent = `${len}/${max}`;
            counter.className = "char-counter";
            if (len >= max) counter.classList.add("danger");
            else if (len >= max * 0.8) counter.classList.add("warning");
        };
        input.addEventListener("input", update);
        update();
    }
    bindCounter(solicitanteName, counterName, 100);
    bindCounter(solicitanteEnrollment, counterMatricula, 20);
    bindCounter(ticketTitle, counterTitle, 50);
    bindCounter(ticketDescription, counterDesc, 500);
}

// Toast
function showToast(message, type) {
    toast.textContent = message;
    toast.className = "toast";
    if (type === "error") toast.style.borderLeftColor = "var(--accent-rose)";
    else if (type === "cyan") toast.style.borderLeftColor = "var(--accent-cyan)";
    else toast.style.borderLeftColor = "var(--accent-blue)";
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 4000);
}

// Init
async function init() {
    setupCharCounters();
    setupEventListeners();
    await syncWithBackend();
    updateDashboard();
}

async function syncWithBackend() {
    try {
        const response = await fetch(`${API_URL}/tickets`, { method: 'GET', mode: 'cors' });
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) tickets = result.data;
        }
        const failuresRes = await fetch(`${API_URL}/failures`, { method: 'GET', mode: 'cors' });
        if (failuresRes.ok) {
            const result = await failuresRes.json();
            if (result.success && result.data) historicalRoomFailures = result.data;
        }
    } catch (err) {
        console.warn("Servidor REST offline. Executando em modo standalone.");
    }
}

function updateDashboard() {
    renderTriageList();
    renderQueue();
    calculateKpis();
    renderDefectiveRooms();
    updatePredictions();
    saveLocal();
}

// Triage List
function renderTriageList() {
    if (!triageList) return;
    const pending = tickets.filter(t => t.status === "Pendente Triagem");

    triageTabCount.textContent = pending.length;

    if (pending.length === 0) {
        triageList.innerHTML = '<div class="empty-state"><i class="fa-solid fa-check-circle"></i>Nenhum chamado pendente de triagem.</div>';
        return;
    }

    triageList.innerHTML = pending.map(ticket => `
        <div class="triage-item" id="triage-${ticket.id}">
            <div class="triage-meta">
                <span>CHAMADO #00${ticket.id}</span>
                <span>${ticket.timestamp}</span>
            </div>
            <h4>${ticket.titulo}</h4>
            <div class="triage-info">
                <span><i class="fa-solid fa-user"></i> ${ticket.solicitante}</span>
                <span><i class="fa-solid fa-id-card"></i> ${ticket.matricula}</span>
                <span><i class="fa-solid fa-location-dot"></i> ${ticket.local}</span>
                <span><i class="fa-solid fa-server"></i> ${ticket.equipamento}</span>
            </div>
            <p class="triage-desc">"${ticket.descricao}"</p>
            <div class="triage-actions">
                <button class="btn-triage alta" onclick="triageTicket(${ticket.id}, 'Alta')"><i class="fa-solid fa-arrow-up"></i> Alta</button>
                <button class="btn-triage media" onclick="triageTicket(${ticket.id}, 'Media')"><i class="fa-solid fa-minus"></i> Media</button>
                <button class="btn-triage baixa" onclick="triageTicket(${ticket.id}, 'Baixa')"><i class="fa-solid fa-arrow-down"></i> Baixa</button>
            </div>
        </div>
    `).join('');
}

window.triageTicket = async function(ticketId, prioridade) {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    ticket.prioridade = prioridade;
    ticket.status = "Aberto";
    preventiveApplied = false;

    try {
        await fetch(`${API_URL}/tickets/${ticketId}/triage`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            mode: "cors",
            body: JSON.stringify({ prioridade })
        });
    } catch (err) {
        console.warn("Servidor offline - Triagem salva localmente.");
    }

    updateDashboard();
    showToast(`Chamado #00${ticketId} triado como ${prioridade} e encaminhado para a fila.`, "cyan");
};

// Queue Rendering
function renderQueue() {
    if (!ticketsQueue) return;

    // Only show tickets that passed triage
    const triaged = tickets.filter(t => t.status !== "Pendente Triagem");

    triaged.sort((a, b) => {
        if (priorityWeight[a.prioridade] !== priorityWeight[b.prioridade]) {
            return (priorityWeight[b.prioridade] || 0) - (priorityWeight[a.prioridade] || 0);
        }
        return b.id - a.id;
    });

    if (triaged.length === 0) {
        ticketsQueue.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i>Nenhum chamado ativo na fila.</div>';
        return;
    }

    ticketsQueue.innerHTML = triaged.map(ticket => {
        const isCompleted = ticket.status === "Concluido";
        const opacity = isCompleted ? "opacity:0.5;" : "";
        const canChangeStatus = currentRole === "admin";

        let statusHtml;
        if (canChangeStatus) {
            statusHtml = `
                <select class="status-dropdown" id="status-${ticket.id}" onchange="changeTicketStatus(${ticket.id}, this.value)">
                    <option value="Aberto" ${ticket.status === 'Aberto' ? 'selected' : ''}>Aberto</option>
                    <option value="Em Atendimento" ${ticket.status === 'Em Atendimento' ? 'selected' : ''}>Em Atendimento</option>
                    <option value="Concluido" ${ticket.status === 'Concluido' ? 'selected' : ''}>Concluido</option>
                </select>
            `;
        } else {
            statusHtml = `<span class="badge badge-${ticket.status === 'Aberto' ? 'alert' : ticket.status === 'Em Atendimento' ? 'amber' : 'success'}">${ticket.status}</span>`;
        }

        return `
            <div class="ticket-item priority-${ticket.prioridade}" style="${opacity}">
                <div class="ticket-meta-header">
                    <span class="ticket-id">CHAMADO #00${ticket.id}</span>
                    <span class="priority-badge p-badge-${ticket.prioridade}">${ticket.prioridade}</span>
                </div>
                <div>
                    <h3 class="ticket-title">${ticket.titulo}</h3>
                    <div class="ticket-loc-eq">
                        <span><i class="fa-solid fa-location-dot"></i> ${ticket.local}</span>
                        <span><i class="fa-solid fa-server"></i> ${ticket.equipamento}</span>
                    </div>
                </div>
                <p class="ticket-desc">"${ticket.descricao}"</p>
                ${ticket.hasPhoto ? '<div class="ticket-attachment"><i class="fa-solid fa-paperclip"></i><span>Ver anexo: imagem_defeito.jpg</span></div>' : ''}
                <div class="ticket-control-row">
                    <span class="status-label">Solicitado por: <strong>${ticket.solicitante}</strong> as ${ticket.timestamp}</span>
                    <div>${statusHtml}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Defective Rooms
function renderDefectiveRooms() {
    if (!defectiveRoomsList) return;

    const activeCounts = {};
    tickets.forEach(t => {
        if (t.status !== "Concluido" && t.status !== "Pendente Triagem") {
            activeCounts[t.local] = (activeCounts[t.local] || 0) + 1;
        }
    });

    const mergedRooms = Object.keys(historicalRoomFailures).map(room => {
        const activeCount = activeCounts[room] || 0;
        const historicalCount = historicalRoomFailures[room];
        return { room, totalCount: historicalCount + activeCount, activeCount };
    });

    mergedRooms.sort((a, b) => b.totalCount - a.totalCount);

    defectiveRoomsList.innerHTML = mergedRooms.map((item, index) => {
        let badgeColor = "var(--accent-blue)";
        if (index === 0) badgeColor = "var(--accent-rose)";
        else if (index === 1) badgeColor = "var(--accent-amber)";

        return `
            <div class="room-row">
                <div class="room-info">
                    <span style="color:${badgeColor}; font-weight:800; margin-right:4px;">#${index + 1}</span>
                    <i class="fa-solid fa-circle-exclamation" style="color:${badgeColor};"></i>
                    <span>${item.room}</span>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    ${item.activeCount > 0 ? `<span class="badge badge-alert" style="font-size:9px; padding:2px 6px; animation:pulse 1.5s infinite;">+${item.activeCount} ativo</span>` : ''}
                    <span class="room-count-badge">${item.totalCount} chamados</span>
                </div>
            </div>
        `;
    }).join('');
}

// KPIs
function calculateKpis() {
    const activeTickets = tickets.filter(t => t.status !== "Concluido" && t.status !== "Pendente Triagem");
    const totalPendingCount = activeTickets.length;
    const triagePending = tickets.filter(t => t.status === "Pendente Triagem").length;

    kpiPendingCount.textContent = totalPendingCount;
    kpiTriageCount.textContent = triagePending;

    if (totalPendingCount === 0) {
        kpiCriticalIndex.textContent = "0%";
        return;
    }

    const criticalTicketsCount = activeTickets.filter(t => t.prioridade === "Alta").length;
    const criticalPercentage = Math.round((criticalTicketsCount / totalPendingCount) * 100);
    kpiCriticalIndex.textContent = `${criticalPercentage}%`;
}

// Predictions
function updatePredictions() {
    if (!riskBarBlocoB || !riskBarBlocoA) return;

    if (preventiveApplied) {
        riskBarBlocoB.style.width = "5%";
        riskBarBlocoB.textContent = "5% (Seguro)";
        riskBarBlocoB.style.background = "var(--accent-emerald)";
        riskBarBlocoA.style.width = "12%";
        riskBarBlocoA.textContent = "12% (Seguro)";
        riskBarBlocoA.style.background = "var(--accent-emerald)";
    } else {
        const activeB = tickets.filter(t => t.local.includes("Bloco B") && t.status !== "Concluido" && t.status !== "Pendente Triagem").length;
        const histB = historicalRoomFailures["Bloco B - Sala 201"] || 0;
        const riskB = Math.min(99, Math.round(20 + (histB * 2.5) + (activeB * 18)));

        const activeA = tickets.filter(t => t.local.includes("Bloco A") && t.status !== "Concluido" && t.status !== "Pendente Triagem").length;
        const histA = (historicalRoomFailures["Bloco A - Lab 102"] || 0) + (historicalRoomFailures["Bloco A - Lab 104"] || 0);
        const riskA = Math.min(99, Math.round(15 + (histA * 1.5) + (activeA * 12)));

        riskBarBlocoB.style.width = `${riskB}%`;
        riskBarBlocoB.textContent = `${riskB}%`;
        riskBarBlocoB.style.background = riskB < 35 ? "var(--accent-emerald)" : riskB < 70 ? "var(--accent-amber)" : "var(--accent-rose)";

        riskBarBlocoA.style.width = `${riskA}%`;
        riskBarBlocoA.textContent = `${riskA}%`;
        riskBarBlocoA.style.background = riskA < 35 ? "var(--accent-emerald)" : riskA < 70 ? "var(--accent-amber)" : "var(--accent-rose)";
    }
}

// Event Listeners
function setupEventListeners() {
    ticketForm.addEventListener("submit", handleTicketSubmit);

    fileUploadTrigger.addEventListener("click", () => {
        isPhotoAttached = true;
        uploadFeedback.classList.remove("hidden");
        showToast("Foto da avaria anexada com sucesso!");
    });

    btnPreventiveMaintenance.addEventListener("click", async () => {
        if (currentRole === "gestao") {
            return showToast("Sem permissao. Apenas Admin pode executar manutencao preventiva.", "error");
        }

        preventiveApplied = true;
        showToast("Roteiro de Manutencao Preventiva disparado! Risco reduzido.", "cyan");

        try {
            await fetch(`${API_URL}/maintenance`, { method: "PUT", headers: { "Content-Type": "application/json" }, mode: "cors" });
        } catch (err) {
            console.warn("Servidor offline - Manutencao salva localmente.");
        }

        updateDashboard();
    });
}

// Ticket Submit
async function handleTicketSubmit(e) {
    e.preventDefault();

    const solicitante = solicitanteName.value.trim();
    const matricula = solicitanteEnrollment.value.trim();
    const local = ticketLocation.value;
    const equipamento = ticketEquipment.value;
    const titulo = ticketTitle.value.trim();
    const descricao = ticketDescription.value.trim();

    if (!matricula.startsWith("1-") && !matricula.startsWith("2-")) {
        showToast("Abertura bloqueada! Matricula com padrao invalido.", "error");
        return;
    }

    let prioridade;
    let status;

    if (currentRole === "admin") {
        prioridade = ticketPriority.value;
        status = "Aberto";
    } else {
        prioridade = "Pendente Triagem";
        status = "Pendente Triagem";
    }

    const ticketId = Math.max(...tickets.map(t => t.id), 100) + 1;
    const newTicket = {
        id: ticketId,
        solicitante,
        matricula,
        local,
        equipamento,
        prioridade,
        titulo,
        descricao,
        status,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hasPhoto: isPhotoAttached
    };

    tickets.push(newTicket);
    isPhotoAttached = false;
    if (status === "Aberto") preventiveApplied = false;
    uploadFeedback.classList.add("hidden");

    try {
        const response = await fetch(`${API_URL}/tickets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            mode: "cors",
            body: JSON.stringify(newTicket)
        });
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                const index = tickets.findIndex(t => t.id === ticketId);
                if (index !== -1) tickets[index] = result.data;
            }
        }
    } catch (err) {
        console.warn("Servidor offline - Chamado salvo localmente.");
    }

    updateDashboard();
    ticketForm.reset();

    if (status === "Pendente Triagem") {
        showToast(`Chamado #00${newTicket.id} enviado para triagem da Gestao.`);
    } else {
        showToast(`Chamado #00${newTicket.id} aberto com prioridade ${prioridade}.`);
    }
}

// Change Ticket Status (Admin only)
window.changeTicketStatus = async function(ticketId, newStatus) {
    if (currentRole !== "admin") {
        showToast("Sem permissao para alterar status.", "error");
        return;
    }

    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const oldStatus = ticket.status;
    ticket.status = newStatus;
    preventiveApplied = false;

    if (newStatus === "Concluido" && oldStatus !== "Concluido") {
        historicalRoomFailures[ticket.local] = (historicalRoomFailures[ticket.local] || 0) + 1;
        showToast(`Chamado #00${ticketId} concluido e arquivado.`);
    } else if (newStatus !== "Concluido" && oldStatus === "Concluido") {
        historicalRoomFailures[ticket.local] = Math.max(0, (historicalRoomFailures[ticket.local] || 1) - 1);
        showToast(`Chamado #00${ticketId} reaberto: ${newStatus}`);
    } else {
        showToast(`Chamado #00${ticketId} alterado para: ${newStatus}`);
    }

    try {
        const response = await fetch(`${API_URL}/tickets/${ticketId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            mode: "cors",
            body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.failures) historicalRoomFailures = result.failures;
        }
    } catch (err) {
        console.warn("Servidor offline - Status salvo localmente.");
    }

    updateDashboard();
};
