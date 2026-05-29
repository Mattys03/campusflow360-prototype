const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let tickets = [
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

let historicalRoomFailures = {
    "Bloco B - Sala 201": 19,
    "Bloco A - Lab 102": 14,
    "Bloco A - Lab 104": 8,
    "Bloco C - Auditorio Principal": 3
};

let preventiveApplied = false;

// GET /api/tickets
app.get('/api/tickets', (req, res) => {
    res.status(200).json({ success: true, data: tickets });
});

// POST /api/tickets
app.post('/api/tickets', (req, res) => {
    const { solicitante, matricula, local, equipamento, prioridade, titulo, descricao, hasPhoto, status } = req.body;

    if (!solicitante || !matricula || !local || !equipamento || !titulo || !descricao) {
        return res.status(400).json({ success: false, message: "Preencha todos os campos obrigatorios." });
    }

    if (solicitante.length > 100) {
        return res.status(400).json({ success: false, message: "Nome do solicitante: maximo 100 caracteres." });
    }

    if (matricula.length > 20) {
        return res.status(400).json({ success: false, message: "Matricula: maximo 20 caracteres." });
    }

    if (titulo.length > 50) {
        return res.status(400).json({ success: false, message: "Titulo: maximo 50 caracteres." });
    }

    if (descricao.length > 500) {
        return res.status(400).json({ success: false, message: "Descricao: maximo 500 caracteres." });
    }

    if (!matricula.startsWith("1-") && !matricula.startsWith("2-")) {
        return res.status(400).json({ success: false, message: "Matricula fora dos padroes letivos." });
    }

    const ticketId = Math.max(...tickets.map(t => t.id), 100) + 1;
    const newTicket = {
        id: ticketId,
        solicitante,
        matricula,
        local,
        equipamento,
        prioridade: prioridade || "Pendente Triagem",
        titulo,
        descricao,
        status: status || "Pendente Triagem",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hasPhoto: !!hasPhoto
    };

    tickets.push(newTicket);
    preventiveApplied = false;

    res.status(201).json({ success: true, message: "Chamado registrado com sucesso!", data: newTicket });
});

// PUT /api/tickets/:id/triage - Define prioridade de um chamado pendente
app.put('/api/tickets/:id/triage', (req, res) => {
    const ticketId = parseInt(req.params.id);
    const { prioridade } = req.body;

    if (!prioridade || !["Alta", "Media", "Baixa"].includes(prioridade)) {
        return res.status(400).json({ success: false, message: "Prioridade invalida." });
    }

    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) {
        return res.status(404).json({ success: false, message: "Chamado nao encontrado." });
    }

    ticket.prioridade = prioridade;
    ticket.status = "Aberto";
    preventiveApplied = false;

    res.status(200).json({ success: true, message: `Chamado #${ticketId} triado com prioridade ${prioridade}`, data: ticket });
});

// PUT /api/tickets/:id/status
app.put('/api/tickets/:id/status', (req, res) => {
    const ticketId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status || !["Aberto", "Em Atendimento", "Concluido"].includes(status)) {
        return res.status(400).json({ success: false, message: "Status invalido." });
    }

    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) {
        return res.status(404).json({ success: false, message: "Chamado nao encontrado." });
    }

    const oldStatus = ticket.status;
    ticket.status = status;
    preventiveApplied = false;

    if (status === "Concluido" && oldStatus !== "Concluido") {
        historicalRoomFailures[ticket.local] = (historicalRoomFailures[ticket.local] || 0) + 1;
    } else if (status !== "Concluido" && oldStatus === "Concluido") {
        historicalRoomFailures[ticket.local] = Math.max(0, (historicalRoomFailures[ticket.local] || 1) - 1);
    }

    res.status(200).json({
        success: true,
        message: `Status do chamado #${ticketId} atualizado para ${status}`,
        data: ticket,
        failures: historicalRoomFailures
    });
});

// GET /api/failures
app.get('/api/failures', (req, res) => {
    res.status(200).json({ success: true, data: historicalRoomFailures });
});

// PUT /api/maintenance
app.put('/api/maintenance', (req, res) => {
    preventiveApplied = true;
    res.status(200).json({ success: true, message: "Roteiro de manutencao preventiva registrado e aplicado." });
});

// GET /api/dashboard
app.get('/api/dashboard', (req, res) => {
    const active = tickets.filter(t => t.status !== "Concluido" && t.status !== "Pendente Triagem");
    const pendingCount = active.length;
    const criticalCount = active.filter(t => t.prioridade === "Alta").length;
    const criticalIndex = pendingCount === 0 ? 0 : Math.round((criticalCount / pendingCount) * 100);

    res.status(200).json({
        success: true,
        data: {
            pendingCount,
            criticalIndex: `${criticalIndex}%`,
            triagePending: tickets.filter(t => t.status === "Pendente Triagem").length
        }
    });
});

app.listen(PORT, () => {
    console.log(`\n========================================================`);
    console.log(`CampusFlow 360 API Server rodando em: http://localhost:${PORT}`);
    console.log(`========================================================\n`);
});
