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

## Smoke Test

O smoke test executa o fluxo completo de ponta a ponta contra a API Gemini real. Ele é **autocontido**: cria um banco SQLite temporário com schema mínimo e dados sintéticos, executa 10 perguntas variadas e remove o banco ao final.

### Pré-requisitos

1. Ambiente virtual ativado e dependências instaladas (`pip install -r requirements.txt`).
2. Arquivo `.env` na raiz do projeto com a chave da API:
   ```bash
   GEMINI_API_KEY=sua-chave-aqui
   ```

### Como executar

```bash
python tests/smoke_test.py
```

### O que o script faz

1. **Cria um banco SQLite temporário** com 5 tabelas (`clientes`, `produtos`, `pedidos`, `tickets_suporte`, `avaliacoes`) e dados sintéticos mínimos para os 3 domínios.
2. **Instancia `VCommerceAgent`** apontando para esse banco.
3. **Executa 10 perguntas em lotes de 2**, com intervalo de 60 segundos entre lotes para respeitar o rate limit do free tier da Gemini:
   - **Vendas:** Receita por região, ticket médio
   - **Suporte:** Produtos com mais tickets, tempo médio de resolução
   - **Avaliações:** NPS por categoria, melhores avaliações
   - **Clientes:** Distribuição por segmento, filtro por região
   - **Edge cases:** Pergunta fora do escopo (piada), pergunta ambígua ("Qual a receita?")
4. **Remove o banco temporário** automaticamente ao final (bloco `try/finally`).

> **Nota:** Os tempos de resposta variam conforme a latência da API Gemini. Cada pergunta dispara **2 chamadas ao LLM** (geração de SQL + geração de insight), totalizando 20 chamadas no teste completo. O script respeita automaticamente o limite de 5 requisições/minuto do free tier. Se o limite diário for atingido, o script exibirá `[ERRO]` com a mensagem de `RESOURCE_EXHAUSTED`.

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
