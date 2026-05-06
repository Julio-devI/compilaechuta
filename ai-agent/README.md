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

O smoke test executa o fluxo completo de ponta a ponta contra a API Gemini real, usando um banco SQLite temporário com dados sintéticos.

### Como executar

1. Certifique-se de que o ambiente virtual está ativado e as dependências instaladas.
2. Exporte a chave da API Gemini:
   ```bash
   export GEMINI_API_KEY='sua-chave-aqui'
   ```
3. Execute o script:
   ```bash
   python tests/smoke_test.py
   ```

### O que o script faz

- Cria um banco SQLite temporário com 5 tabelas (`clientes`, `produtos`, `pedidos`, `tickets_suporte`, `avaliacoes`) e dados sintéticos mínimos.
- Instancia `VCommerceAgent` apontando para esse banco.
- Envia 3 perguntas sequenciais:
  1. **"Quais os produtos mais vendidos?"** — valida geração de SQL SELECT + ranking + sugestão de gráfico.
  2. **"Qual o NPS médio por categoria de produto?"** — valida JOIN + agregação + insight com dados tabulares.
  3. **"Me conte uma piada"** — valida detecção de pergunta fora do escopo (`out_of_scope=True`).
- Remove o banco temporário ao final.

### Resultado esperado

```
Criando banco de teste temporário...
Banco criado em: /tmp/...

============================================================
Pergunta: Quais os produtos mais vendidos?
============================================================
✅ SUCESSO (4.12s)
   SQL  : SELECT p.nome AS produto, COUNT(ped.id) AS total_vendas ...
   Texto: Consultando a tabela de pedidos, os produtos mais vendidos são...
   Dados: 5 linha(s)
   Gráfico: bar (x=produto, y=total_vendas)

============================================================
Pergunta: Qual o NPS médio por categoria de produto?
============================================================
✅ SUCESSO (3.85s)
   SQL  : SELECT p.categoria, ROUND(AVG(a.nps), 1) AS nps_medio ...
   Texto: Analisando as avaliações pós-compra por categoria...
   Dados: 2 linha(s)
   Gráfico: bar (x=categoria, y=nps_medio)

============================================================
Pergunta: Me conte uma piada
============================================================
⛔ FORA DO ESCOPO (1.23s)
   Texto: FORA_DO_ESCOPO: Esta pergunta não está relacionada a dados...

Banco temporário removido.
```

> **Nota:** Os tempos de resposta variam conforme a latência da API Gemini. Se alguma chamada falhar com erro de autenticação ou quota, o script exibirá `❌ ERRO` com a mensagem correspondente.

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
