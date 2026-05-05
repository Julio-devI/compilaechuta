# ai-agent — Módulo de Agente de IA (Text-to-SQL)

Módulo Python independente que traduz perguntas em linguagem natural (português) para queries SQL, executa contra o banco de dados da V-Commerce e retorna insights de negócio estruturados.

## Requisitos

- Python 3.11+
- Banco SQLite com tabelas Gold já populado (gerenciado pelo backend)
- Chave de API do Google Gemini (`GEMINI_API_KEY`)

## Instalação

```bash
cd ai-agent
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # preencher GEMINI_API_KEY e DB_PATH
```

## Uso Programático

```python
import asyncio
from src.agent import VCommerceAgent

agent = VCommerceAgent(db_path='../backend/data/vcommerce.db')
response = asyncio.run(agent.ask('Quais os 10 produtos mais vendidos?'))
print(response.text)
```

## Estrutura

- `src/agent.py` — Classe pública `VCommerceAgent`
- `src/sql_generator.py` — Chamada 1: NL → SQL
- `src/insight_generator.py` — Chamada 2: dados → insight
- `src/db.py` — Conexão e execução SQL
- `src/schema.py` — Extração e formatação do schema do banco
- `src/guardrails.py` — Validações de segurança
- `src/config.py` — Configurações centralizadas
- `src/prompts/` — System prompts em arquivos `.txt`
- `tests/` — Testes automatizados (pytest)

## Testes

```bash
pytest tests/ -v
```

## Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `GEMINI_API_KEY` | Chave da API Google Gemini |
| `DB_PATH` | Caminho para o banco SQLite do backend |
| `LLM_MODEL` | Modelo Gemini (padrão: `gemini-2.5-flash`) |
| `QUERY_TIMEOUT_SECONDS` | Timeout de execução SQL (padrão: 10) |
| `MAX_ROWS` | Limite de linhas retornadas (padrão: 1000) |

## Limitações Conhecidas

- O agente depende do schema do banco Gold estar atualizado.
- Memória de conversa é mantida em memória (não persistente).
- Gráficos são sugeridos pelo agente; o frontend decide se renderiza.

## Decisões Arquiteturais

> Registro das decisões arquiteturais tomadas durante o desenvolvimento do projeto.
> Cada decisão deve conter: contexto, decisão, justificativa e implicações.

---

### DA-01: Arquitetura de Duas Chamadas ao LLM

- **Contexto:**
- **Decisão:**
- **Justificativa:**
- **Implicações:**

---

### DA-02: Escolha do Google Gemini 2.5 Flash

- **Contexto:**
- **Decisão:**
- **Justificativa:**
- **Implicações:**

---

### DA-03: Guardrails em Duas Camadas

- **Contexto:**
- **Decisão:**
- **Justificativa:**
- **Implicações:**

---

## Documentação

- `docs/PRD_AI_Agent_Text_to_SQL.md` — Especificação completa
- `docs/TODO.md` — Todo-list de implementação
