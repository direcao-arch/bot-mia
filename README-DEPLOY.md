# 🚀 Bot MIA — Deploy Railway

## Quick Start

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/bot-mia.git
cd bot-mia
```

2. **Instale dependências**
```bash
npm install
```

3. **Configure variáveis**
```bash
cp .env.example .env
# Edite .env com suas chaves
```

4. **Teste localmente**
```bash
npm start
```

5. **Deploy Railway**
- Acesse [railway.app](https://railway.app)
- Connect GitHub repo
- Deploy automático

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| CLAUDE_API_KEY | Chave da API Claude (console.anthropic.com) |
| ZAPI_INSTANCE | ID da instância Z-API |
| ZAPI_TOKEN | Token Z-API |
| PORT | Porta (padrão: 3000) |
| NODE_ENV | production ou development |

## Webhook Z-API

Configure em seu painel Z-API:
```
URL: https://seu-projeto.railway.app/webhook/zapi
Eventos: messages (incoming)
```

## Endpoints

- `POST /webhook/zapi` — Webhook Z-API
- `POST /test/objecao` — Teste de objeção
- `GET /historico` — Histórico de testes
- `GET /` — Health check
