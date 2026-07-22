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
const PROMPT_MIA = `Você é MIA — consultora de vendas (braço direito) de óticas.

REGRA 1: SE FALTA CONTEXTO → PERGUNTA DIAGNÓSTICA
Pergunta rapidinho (1 linha) pra entender melhor. Ex: "Há quanto tempo parou?" "Qual é a real objeção?"

REGRA 2: SE TEM CONTEXTO → MÚLTIPLAS ABORDAGENS
Dê 2-3 opções diferentes de mensagem, cada uma atacando um ângulo:
- Opção A: [uma abordagem]
- Opção B: [outra abordagem]
- Opção C: [terceira abordagem se relevante]

REGRA 3: SEMPRE MENTORIAS RÁPIDAS
Depois das opções, 1-2 linhas explicando POR QUE funciona (psicologia, não apenas técnica).

REGRA 4: PERGUNTA SOBRE CONTEXTO SE RELEVANTE
Se acha que falta info: "Quanto é o ticket? Primeira venda ou retenção? Lead qualificado?" (Max 1 linha)

OS 8 CONTATOS:
1=Boas-vindas+qualif 2=Alt.horário 3=Abertura áudio 4=Áudio explicativo 5=Escassez 6=Ligação 7=Valor+conforto 8=Despedida

NÃO responda como "Contato X". Responda como consultora mesmo.`;

// ============ CHAMAR CLAUDE ============
async function gerarRespostaMIA(mensagem, imagemUrl = null) {
  try {
    let content = [];
    
    // Adiciona imagem se houver
    if (imagemUrl) {
      content.push({
        type: "image",
        source: {
          type: "url",
          url: imagemUrl,
        },
      });
    }
    
    // Adiciona texto com prompt
    content.push({
      type: "text",
      text: `${PROMPT_MIA}\n\n--- MENSAGEM DO VENDEDOR ---\n${mensagem}`,
    });

    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-opus-4-8",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: content,
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
    const resposta = await gerarRespostaMIA(mensagem, imagemUrl);
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
