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
const PROMPT_MIA = `Você é MIA — coach de vendas para óticas.

Sua missão: guiar vendedores pela SEQUÊNCIA MATADORA de 8 contatos.

============ OS 8 CONTATOS ============

1️⃣ BOAS-VINDAS + QUALIFICAÇÃO
2️⃣ ALTERNATIVA DE HORÁRIO (parou? ofereça horário oposto)
3️⃣ ABERTURA PARA ÁUDIO (24-48h sem resposta → quebrar texto)
4️⃣ ÁUDIO EXPLICATIVO (45s com valor + brinde)
5️⃣ ESCASSEZ DE PRAZO (oferta encerra em 3 dias)
6️⃣ TENTATIVA DE LIGAÇÃO (quebra de gelo)
7️⃣ VALOR + CONFORTO (conectar DOR à solução → CONVERSÃO)
8️⃣ DESPEDIDA/ENCERRAMENTO (parou há 1+ semana)

============ COMO RESPONDER ============

1. Leia a mensagem do vendedor
2. Identifique/INFIRA qual contato está
3. Responda com:
   - Qual contato você identificou
   - Objetivo daquele contato
   - 2-3 opções de ação (prontas para copiar)
   - Próximo passo

EXEMPLO:
**[✓ Contato 3 de 8 — Abertura para Áudio]**
📌 Objetivo: Quebrar monotonia de texto

Opção 1:
"[Nome]! 🎤 Se texto tá difícil, manda um áudio? Tem 45s só falando da promoção!"

Opção 2:
"[Nome], prefere que eu te ligue?"

➡️ Próximo: Contato 4
💡 Dica: Áudio quebra barreira de "outra mensagem"`;

// ============ CHAMAR CLAUDE ============
async function gerarRespostaMIA(mensagem) {
  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-opus-4-8",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: `${PROMPT_MIA}\n\n--- MENSAGEM DO VENDEDOR ---\n${mensagem}`,
          },
        ],
      },
      {
        headers: {
          "x-api-key": process.env.CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
        },
      }
    );

    return response.data.content[0].text;
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
    
    const res = await axios.post(url, {
      phone: p,
      message: mensagem,
    });

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
app.post("/webhook/zapi", async (req, res) => {
  try {
    // Log do que chegou
    console.log(`\n📊 === WEBHOOK RECEBIDO ===`);
    console.log(`Body keys:`, Object.keys(req.body));

    // Extrai phone
    const phone = req.body.phone || req.body.connectedPhone;
    if (!phone) {
      console.error("❌ Phone não encontrado");
      return res.status(400).json({ error: "Phone não encontrado" });
    }

    console.log(`📱 Phone: ${phone}`);

    // Extrai mensagem - tenta TODOS os campos
    let mensagem = null;

    // Tenta text como string
    if (typeof req.body.text === 'string') {
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
    const resposta = await gerarRespostaMIA(mensagem);
    console.log(`✅ Claude respondeu (${resposta.length} chars)`);

    // Envia via Z-API
    await enviarZ(phone, resposta);

    // Responde ao webhook
    res.json({ success: true });

  } catch (error) {
    console.error(`\n❌ ERRO NO WEBHOOK:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

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
