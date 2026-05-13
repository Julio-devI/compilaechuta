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

# O agente lembra automaticamente do contexto (stateful)
resp1 = asyncio.run(agent.ask('Quais os 10 produtos mais vendidos?'))
resp2 = asyncio.run(agent.ask('E apenas na região Sul?'))  # Pergunta de follow-up
print(resp2.text)

# Persistência de sessão (opcional para o backend)
history = agent.export_history()  # Retorna list[dict] serializável
# ... salva em Redis/Banco de dados ...
# ... restaura em uma nova requisição ...
agent.import_history(history)

# Inicia nova conversa
agent.clear_history()
```

## Estrutura

- `src/agent.py` — Classe pública `VCommerceAgent` (Facade)
- `src/core/` — Configurações e tratamento de erros customizados
- `src/database/` — Conexão, execução SQL e extração de schema
- `src/llm/` — Geração de prompts, chamadas à API Gemini e clientes LLM
- `src/security/` — Validações de segurança e guardrails
- `tests/unit/` — Testes automatizados rápidos e isolados
- `tests/integration/` — Smoke tests contra a API real e banco sintético

## Testes

```bash
# Testes unitários (rápidos, sem consumo de cota API)
pytest tests/unit/ -v

# Smoke tests de integração (consomem cota API)
pytest tests/integration/ -v
# ou rodar os scripts python manualmente
```

## Smoke Test

O smoke test executa o fluxo completo de ponta a ponta contra a API Gemini real. Ele é **autocontido**: cria um banco SQLite temporário com schema mínimo e dados sintéticos, executa 5 perguntas variadas e remove o banco ao final.

### Pré-requisitos

1. Ambiente virtual ativado e dependências instaladas (`pip install -r requirements.txt`).
2. Arquivo `.env` na raiz do projeto com a chave da API:
   ```bash
   GEMINI_API_KEY=sua-chave-aqui
   ```

### Como executar

```bash
python tests/integration/smoke_test.py
python tests/integration/smoke_test_guardrails.py
python tests/integration/smoke_test_memory.py
```

### O que o script faz

1. **Cria um banco SQLite temporário** com as tabelas principais (`dim_cliente`, `dim_produto`, `fato_vendas`, `fato_suporte_ticket`, `fato_avaliacoes_pedido`, `dim_tempo`) e dados sintéticos mínimos para os domínios.
2. **Instancia `VCommerceAgent`** apontando para esse banco.
3. **Executa perguntas com orçamento explícito de chamadas**, aguardando 75 segundos após cada interação que consome LLM para respeitar o limite de 5 requisições/minuto da Gemini:
   - **Vendas:** Receita por região, ticket médio
   - **Suporte:** Produtos com mais tickets, tempo médio de resolução
   - **Avaliações:** NPS por categoria, melhores avaliações
   - **Clientes:** Distribuição por segmento, filtro por região
   - **Edge cases:** Pergunta fora do escopo (piada), pergunta ambígua ("Qual a receita?")
4. **Remove o banco temporário** automaticamente ao final (bloco `try/finally`).

> **Nota:** Os tempos de resposta variam conforme a latência da API Gemini. Perguntas de fluxo feliz disparam 2 chamadas ao LLM (geração de SQL + geração de insight), perguntas fora do escopo normalmente disparam 1 chamada, e bloqueios pré-LLM disparam 0 chamadas. Cada script valida o orçamento antes de executar o próximo cenário e não deve ultrapassar 20 requisições planejadas por chave. Para reduzir estouro de quota, os smoke tests usam 1 tentativa por chamada LLM; retries continuam habilitados no agente em uso normal. Os limites dos smoke tests são constantes hardcoded e centralizadas em `tests/integration/smoke_test_config.py`, pois refletem limites fixos do free tier.

## Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `GEMINI_API_KEY` | Chave da API Google Gemini |
| `DB_PATH` | Caminho para o banco SQLite do backend |
| `LLM_TEMPERATURE_INSIGHT` | Temperatura da Chamada 2 (padrão: 0.3) |

## Guardrails e Códigos de Erro

Para garantir o "Error Opacity" no frontend, todas as violações de segurança retornam a mesma mensagem amigável para o usuário final: *"Não foi possível processar sua pergunta. Tente reformulá-la."* 

No entanto, o agente repassa um `error_code` silencioso no `AgentResponse` (acessível apenas pelo backend) permitindo auditoria, logs e ações preventivas (como timeout de usuários infratores).

| Camada | Função Interna | Error Code (`AgentResponse.error_code`) | Descrição |
| :--- | :--- | :--- | :--- |
| **1 (Input)** | `validate_empty_input` | `EMPTY_INPUT` | Input nulo ou somente espaços em branco. |
| **1 (Input)** | `validate_input_length` | `INPUT_TOO_LONG` | Excedeu `MAX_INPUT_CHARS`. |
| **1 (Input)** | `validate_prompt_injection`| `PROMPT_INJECTION` | Regex barrou ataque de persona ou exfiltração. |
| **2 (SQL)** | `validate_destructive_queries`| `DESTRUCTIVE_QUERY` | AST barrou instrução não-SELECT. |
| **2 (SQL)** | `validate_multiple_statements`| `MULTIPLE_STATEMENTS` | Múltiplos statements injetados (`;`). |
| **2 (SQL)** | `validate_table_column_allowlist`| `SCHEMA_VIOLATION_ALLOWLIST`| Uso de tabela/coluna inexistente no schema. |
| **2 (SQL)** | `validate_semantic_schema` | `SCHEMA_VIOLATION_SEMANTIC` | Coluna não pertence à tabela no JOIN/FROM. |
| **2 (SQL)** | `sqlglot.parse_one` | `SQL_PARSE_ERROR` | LLM alucinou sintaxe irrecuperável. |
| **3 (DB)** | `Database.execute_query` | `EXECUTION_TIMEOUT` | Query demorou acima de `QUERY_TIMEOUT_SECONDS`. |
| **3 (DB)** | `Database.execute_query` | `DB_EXECUTION_ERROR` | Banco bloqueou (ex: modo read-only ou erro interno). |

## Limitações Conhecidas

- O agente depende do schema do banco Gold estar atualizado.
- A memória de conversa é mantida no estado da instância do agente. Para persistência entre requisições HTTP, o backend deve serializar os dados via `export_history()` e restaurá-los com `import_history()`.
- Gráficos são sugeridos pelo agente; o frontend decide se renderiza.
- O agente aplica guardrails de segurança em três camadas (input, SQL gerado e execução), mas não substituem uma auditoria manual de queries críticas.
- A detecção de perguntas fora do escopo não utiliza classificador por LLM adicional — o escopo é controlado exclusivamente pelo prompt do SQL (marcador `FORA_DO_ESCOPO`) e pelos guardrails da Camada 2 (allowlist e validação semântica), economizando requisições à API.
- A validação semântica de colunas (`validate_semantic_schema`) usa um mapeamento flat de aliases. Se subqueries ou CTEs distintas reutilizarem o mesmo alias, podem ocorrer falsos positivos ou negativos. Queries com aliases colidentes são raras em geração por LLM; será revisado na branch `feat/ai-agent-extras`.

## Decisões Arquiteturais

As decisões arquiteturais do projeto estão documentadas em [`README_DECISOES.md`](README_DECISOES.md).
