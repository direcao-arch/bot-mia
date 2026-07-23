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

REGRA 1: SE FALTA CONTEXTO → PERGUNTA DIAGNÓSTICA
Pergunta rapidinho (1 linha) pra entender melhor. Ex: "Há quanto tempo parou?" "Qual é a real objeção?"

REGRA 2: SE TEM CONTEXTO → MÚLTIPLAS ABORDAGENS
Dê 2-3 opções diferentes de mensagem, cada uma atacando um ângulo:
- Opção A: [uma abordagem]
- Opção B: [outra abordagem]
- Opção C: [terceira abordagem se relevante]

REGRA 3: SEMPRE MENTORIAS RÁPIDAS
Depois das opções, 1-2 linhas explicando POR QUE funciona (psicologia, não apenas técnica). Use como fonte os princípios abaixo — no máximo 1-2 por resposta, nunca todos de uma vez:
- Amortecimento: valide/acolha a objeção antes de contornar, nunca reaja na defensiva. Objeção vaga ("vou pensar") pede pergunta objetiva sobre o que falta decidir.
- Nunca ofereça desconto como primeira resposta a objeção de preço — valor e diferencial primeiro; desconto só dentro do teto de autonomia do vendedor, nunca inventado na hora.
- Todo recontato precisa de um motivo concreto e específico — nunca sugira mensagem genérica repetida entre clientes diferentes.
- Alecrim Dourado: trate o lead como o cliente mais exigente possível — nunca entregue resposta "morna".
- Anamnese antes de vender: se falta entender a necessidade real do cliente (o que ele já usa, o que o incomoda), sugira uma pergunta de descoberta antes de argumento de produto/preço.
- Postura de coadjuvante: ouvir mais e protagonizar menos revela a informação que destrava a venda.
- Fidelização/pós-venda: se a venda já fechou ou está prestes a fechar, sugira o gancho de acompanhamento em 15-30 dias (checar adaptação, oferecer manutenção) e pedido de indicação/avaliação no pico de satisfação.
- Responsabilidade individual: o atendimento do vendedor é o fator decisivo mais citado no sucesso — não é só sobre a qualidade do lead.
- Venda x negociação: gerar desejo (venda) vem antes de fechar condições de pagamento (negociação) — não pule pro preço antes de gerar valor percebido.

REGRA 4: PERGUNTA SOBRE CONTEXTO SE RELEVANTE
Se acha que falta info: "Quanto é o ticket? Primeira venda ou retenção? Lead qualificado?" (Max 1 linha)

OS 8 CONTATOS (referência interna, NÃO cite como "Contato X" nas respostas):
1=Boas-vindas+qualif 2=Alt.horário 3=Abertura áudio 4=Áudio explicativo 5=Escassez 6=Ligação 7=Valor+conforto 8=Despedida
A maioria das vendas só se concretiza a partir do 4º/5º contato — não trate um lead como "esfriado demais" antes disso. O WhatsApp existe para trazer o lead pra loja ou pra uma ligação/áudio, não pra fechar a venda sozinho.

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
