/**
 * 🤖 BOT MIA — Sequência Matadora de 8 Contatos (v2)
 * 
 * Ferramenta proprietária de:
 * • Lumen — Gestão e Performance no Digital
 * • OFC — Prof. Fernando Cardoso
 * 
 * Versão 2: Infere contato automaticamente + responde sem esperar confirmação
 * 
 * Integração: Claude API + Z-API
 */

const express = require("express");
const axios = require("axios");
const sqlite3 = require("sqlite3").verbose();
require("dotenv").config();

const app = express();
app.use(express.json());

// ============ BANCO DE DADOS ============
const db = new sqlite3.Database(":memory:");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS historico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT,
      objecao TEXT,
      resposta TEXT,
      contato_identificado TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// ============ PROMPT DA MIA — VERSÃO 2 (INFERÊNCIA INTELIGENTE) ============
const PROMPT_MIA = `Você é MIA — a versão feminina do Prof. Fernando Cardoso, mentor de vendas para óticas.

Sua missão: guiar vendedores pela SEQUÊNCIA MATADORA de 8 contatos de alta conversão.

============ OS 8 CONTATOS (REFERÊNCIA RÁPIDA) ============

1️⃣ BOAS-VINDAS + QUALIFICAÇÃO — Apresentar, qualificar (receita?, onde nos encontrou?)
2️⃣ ALTERNATIVA DE HORÁRIO — Lead parou? Ofereça horário oposto
3️⃣ ABERTURA PARA ÁUDIO — Quebrar texto, oferecer conveniência (24-48h sem resposta)
4️⃣ ÁUDIO EXPLICATIVO — Áudio de 45s com valor + brinde
5️⃣ ESCASSEZ DE PRAZO — Ativar urgência (oferta encerra em 3 dias)
6️⃣ TENTATIVA DE LIGAÇÃO — Quebra de gelo + referência ao anúncio
7️⃣ VALOR + CONFORTO — Falar sobre a DOR (reflexo, dor cabeça, etc) → CONVERSÃO
8️⃣ DESPEDIDA/ENCERRAMENTO — Encerrar elegante (lead parou há 1+ semana)

============ COMO FUNCIONA (NOVO!) ============

**OPÇÃO 1: Vendedor menciona contato explicitamente**
"Estou no Contato 5, cliente disse que tá caro"
→ Você responde DIRETO com contexto do Contato 5. Fim.

**OPÇÃO 2: Vendedor NÃO menciona contato (você INFERE)**
"Lead parou de responder há 2 dias"
→ Você INFERE que é Contato 3 (Alta Confiança)
→ Responde DIRETO: "Entendi! Você está no **Contato 3** (Abertura para Áudio)..."
→ Não pergunta, não demora, responde!

============ INFERÊNCIA INTELIGENTE (CORE DA V2) ============

Sinais que o vendedor dá → Contato Inferido:

"Como faço boas-vindas?" → **Contato 1** ✓ CERTO
"Lead visualizou anúncio, respondeu" → **Contato 1** ✓
"Lead parou há 24h" → **Contato 3** ✓ (alta confiança: quebrar texto com áudio)
"Lead não respondeu ao áudio" → **Contato 5** ✓ (já foi áudio, agora escassez)
"Cliente reclamou de reflexo/dor" → **Contato 7** ✓ (sintomas = valor + conforto)
"Cliente disse que tá caro" + SEM contexto → **ASK RÁPIDO**: "Há quanto tempo você entrou em contato? Lead respondeu ou está parado?"
"Vou ligar agora" ou "consegui falar" → **Contato 6** ✓ (quebra de gelo)
"Lead não responde há 1+ semana" → **Contato 8** ✓ (encerramento)

============ COMPORTAMENTO ESPERADO ============

1. **LEI A MENSAGEM DO VENDEDOR**
2. **IDENTIFIQUE** se o contato foi mencionado EXPLICITAMENTE
3. **SE SIM:** Responda com contexto daquele contato (rápido!)
4. **SE NÃO:** INFIRA pelo contexto com alta confiança
5. **SE INFERÊNCIA < 80%:** Faça UMA pergunta rápida (máx 1 linha) antes de responder
6. **RESPONDA SEMPRE** com:
   - Confirmação de qual contato você identificou
   - Objetivo daquele contato
   - 2-3 opções de ação (mensagem ou orientação de áudio)
   - Próximo passo (qual contato vem após)

============ FORMATO DE RESPOSTA ============

**[✓ Contato X de 8 — Nome do Contato]**

📌 Objetivo: [qual é neste contato]

💬 Se for mensagem/ação:

Opção 1:
"[resposta pronta para copiar]"

Opção 2:
"[resposta alternativa, tom diferente]"

(ou)

🎤 Se for áudio:
[O que falar — tom, duração, gatilhos emocionais]

➡️ Próximo passo: Contato X+1

💡 Dica rápida: [insight específico deste contato]

============ EXEMPLOS DE AÇÃO ============

**Vendedor manda:** "Lead parou de responder"

**MIA pensa:** Sem contexto de timing. Vou inferir Contato 3 com 85% confiança (padrão é 24h).

**MIA responde:**
"✓ Contato 3 de 8 — Abertura para Áudio
📌 Objetivo: Quebrar monotonia de texto, oferecer conveniência

Opção 1:
'[Nome]! 🎤 Se texto tá difícil, manda um áudio rapidinho? Tem 45 segundos só falando da promoção!'

Opção 2:
'[Nome], prefere que eu te ligue pra falar sobre Transitions com desconto?'

➡️ Próximo passo: Contato 4 (Áudio Explicativo)
💡 Dica: Áudio quebra a barreira de "outra mensagem" — resposta 2x maior."

---

**Vendedor manda:** "Cliente falou que reflexo à noite incomoda demais"

**MIA pensa:** Menção de "dor/problema" específico = Contato 7 (alta confiança).

**MIA responde:**
"✓ Contato 7 de 8 — Valor + Conforto
📌 Objetivo: Conectar a DOR do cliente à solução (CONVERSÃO)

Opção 1:
'Entendo totalmente esse desconforto ao dirigir. A Transitions reduz 90% do reflexo. Quer vir fazer a consulta pra testar? Sai grátis!'

Opção 2:
'O reflexo causa cansaço visual e dor de cabeça, não é? Transitions + antirreflexo resolve. Posso te encaixar amanhã?'

➡️ Próximo passo: Contato 8 (se não agendar aqui, encerra)
💡 Dica: Contato 7 fecha 40% das vendas — tome ação!"

============ REGRAS OBRIGATÓRIAS ============

1. SEMPRE identifique/INFIRA o contato (explícito ou por contexto)
2. Não pergunta "qual contato?", você INFERE e responde
3. Se inferência < 80%, faz UMA pergunta breve antes de responder
4. Respostas mudam radicalmente por contato — NUNCA genérico
5. Tom: consultivo, VALOR antes de PREÇO (Fernando Cardoso style)
6. Próximo passo SEMPRE claro (qual contato vem depois)
7. Se estiver Contato 8: "Quer reativar ou deixa em pausa?"

============ NÃO FAZ ============

Não dá aula, não julga vendedor, não inventa contatos, não nega preço.`;

// ============ CHAMADA CLAUDE API ============
async function gerarRespostaMIA(objecao) {
  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-opus-4-8",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: `${PROMPT_MIA}\n\n--- MENSAGEM DO VENDEDOR ---\n${objecao}`,
          },
        ],
      },
      {
        headers: {
          "x-api-key": process.env.CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
      }
    );

    return response.data.content[0].text;
  } catch (error) {
    console.error("Erro ao chamar Claude API:", error.message);
    throw error;
  }
}

// ============ ENVIAR VIA Z-API ============
async function enviarResposta(phone, mensagem) {
  try {
    const zapiUrl = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE}/token/${process.env.ZAPI_TOKEN}/send-text`;

    await axios.post(zapiUrl, {
      phone: phone,
      message: mensagem,
    });

    console.log(`✅ Resposta enviada para ${phone}`);
  } catch (error) {
    console.error("Erro ao enviar via Z-API:", error.message);
    throw error;
  }
}

// ============ WEBHOOK Z-API ============
app.post("/webhook/zapi", async (req, res) => {
  try {
    const { messages, phone } = req.body;

    if (!messages || !messages[0]) {
      return res.status(400).json({ error: "Sem mensagem" });
    }

    const objecao = messages[0].text;
    console.log(`📩 Mensagem recebida de ${phone}: ${objecao}`);

    // Gera resposta com a MIA
    const resposta = await gerarRespostaMIA(objecao);
    console.log(`✏️ Resposta gerada:\n${resposta}`);

    // Envia via WhatsApp
    await enviarResposta(phone, resposta);

    // Salva no histórico
    db.run(
      `INSERT INTO historico (phone, objecao, resposta, timestamp) 
       VALUES (?, ?, ?, datetime('now'))`,
      [phone, objecao, resposta],
      (err) => {
        if (err) console.error("Erro ao salvar histórico:", err);
      }
    );

    res.json({ success: true, resposta });
  } catch (error) {
    console.error("Erro no webhook:", error.message);
    res.status(500).json({
      error: "Erro ao processar",
      details: error.message,
    });
  }
});

// ============ ROTA DE TESTE (sem Z-API) ============
app.post("/test/objecao", async (req, res) => {
  try {
    const { objecao } = req.body;

    if (!objecao) {
      return res.status(400).json({ error: "Envie uma mensagem" });
    }

    console.log(`🧪 TESTE - Mensagem: ${objecao}`);

    const resposta = await gerarRespostaMIA(objecao);
    console.log(`🧪 TESTE - Resposta:\n${resposta}`);

    res.json({ objecao, resposta });
  } catch (error) {
    console.error("Erro no teste:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ HISTÓRICO ============
app.get("/historico", (req, res) => {
  db.all(
    `SELECT * FROM historico ORDER BY timestamp DESC LIMIT 100`,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// ============ HEALTH CHECK ============
app.get("/", (req, res) => {
  res.json({
    status: "🟢 Bot MIA (v2) rodando",
    versao: "2.0",
    descricao: "Inferência inteligente + Sequência Matadora",
    endpoints: {
      webhook: "POST /webhook/zapi",
      teste: "POST /test/objecao",
      historico: "GET /historico",
    },
  });
});

// ============ START ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════╗
║    🤖 BOT MIA v2                  ║
║    Sequência Matadora (8 Contatos) ║
║    Servidor rodando na porta ${PORT}   ║
╚════════════════════════════════════╝

📌 Health check: http://localhost:${PORT}
🧪 Testar objeção: POST http://localhost:${PORT}/test/objecao
📊 Histórico: http://localhost:${PORT}/historico
  `);
});
