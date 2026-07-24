/**
 * 🤖 BOT MIA v3 — SIMPLIFICADO E ROBUSTO
 * Ferramenta proprietária de Lumen + OFC
 */

const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

// ============ PROMPT ============
const PROMPT_MIA = `Você é MIA — consultora de vendas (braço direito) de óticas, ferramenta proprietária de Lumen + OFC.

REGRA DE OURO: SEJA BREVE. Isso é WhatsApp, não relatório. Máximo 5-6 linhas no total. Tom casual, direto, de colega pra colega — nunca formal, nunca institucional, nunca com títulos ou bullet points de curso.

REGRA 1: SE FALTA CONTEXTO → PERGUNTA DIAGNÓSTICA
Pergunta rapidinho (1 linha) pra entender melhor. Ex: "Há quanto tempo parou?" "Qual é a real objeção?"
Nada mais nessa resposta — só a pergunta, sem adiantar conteúdo.

REGRA 2: SE TEM CONTEXTO → NO MÁXIMO 2 OPÇÕES DE MENSAGEM
Cada opção: 1-2 frases curtas, prontas pra copiar e colar no WhatsApp.
- Opção A: [mensagem curta]
- Opção B: [mensagem curta, ângulo diferente]

REGRA 3: NO MÁXIMO 1 LINHA DE MENTORIA (opcional, use raramente)
Só inclua se agregar de verdade — na maioria das vezes, omita. Se incluir, é 1 frase curta puxando UM destes princípios (nunca mais de um, nunca em parágrafo):
amortecimento (acolher antes de contornar) · nunca desconto primeiro · motivo concreto pro recontato · tratar o lead como VIP · entender a necessidade antes de vender · ouvir mais, falar menos · pós-venda em 15-30 dias fideliza mais que promoção · o atendimento individual decide a venda · venda (gerar desejo) vem antes de negociação (fechar condição).

REGRA 4: PERGUNTA SOBRE CONTEXTO SE RELEVANTE
Se faltar um dado prático (ticket, primeira venda ou retenção, lead qualificado), pergunte em 1 linha só.

OS 8 CONTATOS (referência interna, NÃO cite como "Contato X" nas respostas):
1=Boas-vindas+qualif 2=Alt.horário 3=Abertura áudio 4=Áudio explicativo 5=Escassez 6=Ligação 7=Valor+conforto 8=Despedida
A maioria das vendas só se concretiza a partir do 4º/5º contato.

NÃO responda como "Contato X". NÃO use markdown pesado, títulos ou listas longas. Responda como se estivesse digitando rápido pelo celular pra um amigo vendedor.`;
// ============ CHAMAR CLAUDE ============
// ============ MEMÓRIA DE CONVERSA (por vendedor/telefone) ============
const historicos = new Map(); // phone -> { mensagens: [...], atualizadoEm: timestamp }
const HISTORICO_MAX_MENSAGENS = 10; // ~5 idas e vindas
const HISTORICO_EXPIRA_MS = 3 * 60 * 60 * 1000; // 3 horas sem mensagem = começa assunto novo

function obterHistorico(phone) {
  const h = historicos.get(phone);
  if (!h) return [];
  if (Date.now() - h.atualizadoEm > HISTORICO_EXPIRA_MS) {
    historicos.delete(phone);
    return [];
  }
  return h.mensagens;
}

function salvarHistorico(phone, mensagens) {
  const cortado = mensagens.slice(-HISTORICO_MAX_MENSAGENS);
  historicos.set(phone, { mensagens: cortado, atualizadoEm: Date.now() });
}

async function gerarRespostaMIA(phone, mensagem, imagemUrl = null) {
  try {
    let contentUsuario = [];

    if (imagemUrl) {
      contentUsuario.push({
        type: "image",
        source: {
          type: "url",
          url: imagemUrl,
        },
      });
    }
    contentUsuario.push({ type: "text", text: mensagem });

    const historico = obterHistorico(phone);
    const mensagensParaClaude = [
      ...historico,
      { role: "user", content: contentUsuario },
    ];

    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-opus-4-8",
        max_tokens: 400,
        system: PROMPT_MIA,
        messages: mensagensParaClaude,
      },
      {
        headers: {
          "x-api-key": process.env.CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
        },
      }
    );

    const respostaTexto = response.data.content[0].text;

    // Salva os dois lados da conversa para a MIA lembrar na próxima mensagem
    salvarHistorico(phone, [
      ...mensagensParaClaude,
      { role: "assistant", content: respostaTexto },
    ]);

    return respostaTexto;
  } catch (error) {
    console.error("❌ Claude API error:", error.message);
    throw error;
  }
}

// ============ ENVIAR Z-API ============
async function enviarZ(phone, mensagem) {
  try {
    // Garante que phone é string
    let p = String(phone).replace(/[^0-9+]/g, '');
    
    // Adiciona 55 se não tiver
    if (!p.startsWith('55') && !p.startsWith('+55')) {
      p = '55' + p;
    }

    const url = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE}/token/${process.env.ZAPI_TOKEN}/send-text`;

    console.log(`📤 Enviando para Z-API... [${p}]`);
    
    const res = await axios.post(
      url,
      {
        phone: p,
        message: mensagem,
      },
      {
        headers: {
          "Client-Token": process.env.ZAPI_CLIENT_TOKEN,
        },
      }
    );

    console.log(`✅ Enviado com sucesso!`);
  } catch (error) {
    console.error(`❌ Z-API error: ${error.message}`);
    if (error.response?.data) {
      console.error(`   Response:`, error.response.data);
    }
    throw error;
  }
}

// ============ WEBHOOK ============
// ============ DEDUPLICAÇÃO (Z-API às vezes reenvia o mesmo evento) ============
const mensagensProcessadas = new Set();
const MENSAGENS_PROCESSADAS_MAX = 500;

function marcarSeNova(messageId) {
  if (!messageId) return true;
  if (mensagensProcessadas.has(messageId)) return false;
  mensagensProcessadas.add(messageId);
  if (mensagensProcessadas.size > MENSAGENS_PROCESSADAS_MAX) {
    mensagensProcessadas.delete(mensagensProcessadas.values().next().value);
  }
  return true;
}

// ============ PAUSA DE EMERGÊNCIA (trava respostas automáticas na hora) ============
let miaPausada = false; // Retomada por pedido da Katia em 24/07, apos deploy da trava de connectedPhone
const ADMIN_SECRET = process.env.ADMIN_SECRET || "troque-este-segredo";

app.get("/admin/pausar", (req, res) => {
  if (req.query.secret !== ADMIN_SECRET) return res.status(403).json({ error: "não autorizado" });
  miaPausada = true;
  console.log("⏸️  MIA PAUSADA manualmente — não vai responder até retomar.");
  res.json({ pausada: true });
});

app.get("/admin/retomar", (req, res) => {
  if (req.query.secret !== ADMIN_SECRET) return res.status(403).json({ error: "não autorizado" });
  miaPausada = false;
  console.log("▶️  MIA retomada — voltou a responder normalmente.");
  res.json({ pausada: false });
});

app.get("/admin/debug-env", (req, res) => {
  res.json({
    hasAdminSecret: !!process.env.ADMIN_SECRET,
    adminSecretLength: (process.env.ADMIN_SECRET || "").length,
    hasZapiInstance: !!process.env.ZAPI_INSTANCE,
    hasZapiToken: !!process.env.ZAPI_TOKEN,
    hasResendKey: !!process.env.RESEND_API_KEY,
  });
});

app.get("/admin/status-pausa", (req, res) => {
  if (req.query.secret !== ADMIN_SECRET) return res.status(403).json({ error: "não autorizado" });
  res.json({ pausada: miaPausada });
});

// Número/instância dedicada da MIA no Z-API. Qualquer webhook que chegue
// com um connectedPhone diferente deste NÃO é da instância da MIA — é
// outro número (pessoal, outro projeto, etc.) e deve ser ignorado.
// Hardcoded como fallback porque variáveis de ambiente no Railway já
// falharam em propagar corretamente (ver ADMIN_SECRET).
const NUMERO_MIA_DEDICADO = process.env.NUMERO_MIA_DEDICADO || "555194753651";

app.post("/webhook/zapi", async (req, res) => {
  // Responde IMEDIATAMENTE pro Z-API não esperar o processamento (Claude + envio)
  // e reenviar o mesmo evento por timeout.
  res.status(200).json({ received: true });

  console.log(`🔍 DIAGNOSTICO: connectedPhone=${req.body.connectedPhone} | phone=${req.body.phone} | fromMe=${req.body.fromMe} | senderName=${req.body.senderName} | chatName=${req.body.chatName}`);

  // TRAVA DE SEGURANÇA: só processa webhooks que vieram da instância
  // exclusiva da MIA. Se o Z-API (por engano de configuração de webhook,
  // ou instância errada) mandar evento de outro número — como o WhatsApp
  // pessoal/comercial da Katia — a MIA ignora e NÃO responde.
  if (req.body.connectedPhone && req.body.connectedPhone !== NUMERO_MIA_DEDICADO) {
    console.log(`🚫 Webhook de instância diferente da MIA (connectedPhone=${req.body.connectedPhone} ≠ ${NUMERO_MIA_DEDICADO}) — ignorado.`);
    return;
  }

  if (miaPausada) {
    console.log("⏸️  MIA pausada — ignorando mensagem recebida.");
    return;
  }

  try {
    console.log(`\n📊 === WEBHOOK RECEBIDO ===`);
    console.log(`Body keys:`, Object.keys(req.body));

    const messageId = req.body.messageId;
    if (!marcarSeNova(messageId)) {
      console.log(`⏭️  Duplicata ignorada (messageId: ${messageId})`);
      return;
    }

    // Extrai phone
    const phone = req.body.phone || req.body.connectedPhone;
    if (!phone) {
      console.error("❌ Phone não encontrado");
      return;
    }

    console.log(`📱 Phone: ${phone}`);

    // Extrai mensagem ou imagem
    let mensagem = null;
    let imagemUrl = null;

    // Verifica se é IMAGEM
    if (req.body.image?.imageUrl) {
      imagemUrl = req.body.image.imageUrl;
      mensagem = req.body.image.caption || "Vendedor enviou uma imagem";
      console.log(`📸 Imagem recebida: ${imagemUrl}`);
    }
    // Tenta text como string
    else if (typeof req.body.text === 'string') {
      mensagem = req.body.text;
      console.log(`✅ Obtido de: text (string)`);
    }
    // Tenta text como JSON
    else if (req.body.text) {
      mensagem = JSON.stringify(req.body.text);
      console.log(`✅ Obtido de: text (JSON stringificado)`);
    }
    // Tenta message
    else if (req.body.message) {
      mensagem = String(req.body.message);
      console.log(`✅ Obtido de: message`);
    }
    // Tenta messages array
    else if (req.body.messages?.[0]?.text) {
      mensagem = String(req.body.messages[0].text);
      console.log(`✅ Obtido de: messages[0].text`);
    }
    // Fallback
    else {
      mensagem = "Vendedor enviou uma mensagem";
      console.log(`⚠️  Usando fallback`);
    }

    console.log(`💬 Mensagem: "${mensagem.substring(0, 50)}..."`);

    // Processa com Claude
    console.log(`🤖 Processando com Claude...`);
    const resposta = await gerarRespostaMIA(phone, mensagem, imagemUrl);
    console.log(`✅ Claude respondeu (${resposta.length} chars)`);

    // Envia via Z-API
    await enviarZ(phone, resposta);

  } catch (error) {
    console.error(`\n❌ ERRO NO WEBHOOK:`, error.message);
  }
});

// ============ MONITORAMENTO DE CONEXÃO (alerta por email se o WhatsApp da MIA cair) ============
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ALERTA_EMAIL_PARA = process.env.ALERTA_EMAIL_PARA || "direcao@fyassessoria.com";
let ultimoStatusConectado = true; // assume conectado no boot; só alerta em queda real detectada

async function enviarAlertaEmail(assunto, corpo) {
  if (!RESEND_API_KEY) {
    console.log(`⚠️  RESEND_API_KEY não configurada — alerta não enviado (${assunto})`);
    return;
  }
  try {
    await axios.post(
      "https://api.resend.com/emails",
      {
        from: "MIA Monitor <onboarding@resend.dev>",
        to: [ALERTA_EMAIL_PARA],
        subject: assunto,
        text: corpo,
      },
      {
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`📧 Alerta enviado: ${assunto}`);
  } catch (error) {
    console.error("❌ Erro ao enviar email de alerta:", error.response?.data || error.message);
  }
}

async function verificarConexaoZAPI() {
  try {
    const url = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE}/token/${process.env.ZAPI_TOKEN}/status`;
    const res = await axios.get(url, {
      headers: { "Client-Token": process.env.ZAPI_CLIENT_TOKEN },
    });

    const conectado = res.data?.connected === true;
    console.log(`🔎 Checagem de conexão Z-API: ${conectado ? "conectado ✅" : "DESCONECTADO ⚠️"}`);

    if (!conectado && ultimoStatusConectado) {
      await enviarAlertaEmail(
        "⚠️ MIA desconectada do WhatsApp",
        "A instância do WhatsApp da MIA caiu. Escaneie o QR code de novo no painel Z-API para reconectar."
      );
    } else if (conectado && !ultimoStatusConectado) {
      await enviarAlertaEmail(
        "✅ MIA reconectada",
        "A instância do WhatsApp da MIA voltou a ficar conectada normalmente."
      );
    }

    ultimoStatusConectado = conectado;
  } catch (error) {
    console.error("❌ Erro ao verificar status Z-API:", error.response?.data || error.message);
  }
}

// Roda a cada 1 hora, e uma vez 30s depois do boot
setInterval(verificarConexaoZAPI, 60 * 60 * 1000);
setTimeout(verificarConexaoZAPI, 30 * 1000);

// ============ HEALTH CHECK ============
app.get("/", (req, res) => {
  res.json({
    status: "🟢 BOT MIA v3 Online",
    webhook: "/webhook/zapi",
  });
});

// ============ START ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════╗
║    🤖 BOT MIA v3                  ║
║    Status: ONLINE                  ║
║    Porta: ${PORT}                        ║
╚════════════════════════════════════╝
  `);
});
