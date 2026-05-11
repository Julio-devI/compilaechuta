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

if resp2.status == "success" and resp2.presentation:
    print(resp2.presentation.activity)
    for section in resp2.presentation.answer_sections:
        print(section.title, section.content)

if resp2.error:
    print(resp2.error.code, resp2.error.message)

# Persistência de sessão (opcional para o backend)
history = agent.export_history()  # Retorna list[dict] serializável
# ... salva em Redis/Banco de dados ...
# ... restaura em uma nova requisição ...
agent.import_history(history)

# Inicia nova conversa
agent.clear_history()
```

## Contrato de Resposta

`VCommerceAgent.ask(question)` retorna um `AgentResponse` com contrato estável para o backend:

```python
@dataclass
class ChartSuggestion:
    type: Literal["bar", "line", "pie", "area"]
    x_axis: str | None
    y_axis: str | None
    title: str

@dataclass
class ResponseSection:
    title: str
    content: str

@dataclass
class DataSource:
    table: str
    label: str | None
    description: str | None

@dataclass
class SourcesSummary:
    text: str
    tables: list[DataSource]

@dataclass
class ResponsePresentation:
    activity: str
    answer_sections: list[ResponseSection]
    sources_summary: SourcesSummary | None

@dataclass
class ResponseError:
    code: str
    message: str
    stage: Literal[
        "input",
        "schema",
        "sql_generation",
        "sql_validation",
        "database",
        "insight_generation",
        "llm",
    ]
    retryable: bool

@dataclass
class AgentResponse:
    status: Literal["success", "error", "out_of_scope"]
    text: str
    presentation: ResponsePresentation | None
    data: list[dict] | None
    chart: ChartSuggestion | None
    sql: str
    error: ResponseError | None
    out_of_scope: bool
    truncated: bool = False
```

Regras do contrato:

- `status` define o estado principal: `success`, `error` ou `out_of_scope`.
- `error` é sempre `None` em sucesso e fora de escopo; em falha contém `ResponseError`.
- `sql` é metadado técnico para o backend, útil para auditoria e debug. Não deve ser renderizado no frontend.
- `data` sempre vem do banco após execução do SQL validado. A Chamada 2 não decide, altera nem sintetiza dados.
- Em sucesso com resultado escalar, `data` continua sendo lista de dicts, ex.: `[{"receita_total": 12345.67}]`.
- Em sucesso sem linhas, `data` é `[]`.
- Em erro ou fora de escopo sem execução, `data` é `None`.
- `presentation` contém a resposta textual estruturada para UI: comentário inicial, seções e resumo de fontes.
- `presentation.sources_summary.tables[].table` e `label` usam aliases de negócio. O agente prioriza `display_name` em `schema_descriptions.json` e, se ausente, infere um nome seguro removendo prefixos técnicos como `dim_`, `fato_` e `gold_`.
- `chart` é apenas sugestão. Se o tipo ou os eixos não forem compatíveis com `data`, o agente retorna `chart=None`.

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

Para garantir opacidade de erro no frontend, violações de segurança continuam usando mensagem amigável genérica: *"Não foi possível processar sua pergunta. Tente reformulá-la."*

O backend recebe detalhes em `AgentResponse.error`, com `code`, `stage`, `message` e `retryable`. A mensagem é em português para que o desenvolvedor consiga diagnosticar a falha sem consultar documentação externa.

| Stage | Código (`ResponseError.code`) | Retry | Descrição |
| :--- | :--- | :---: | :--- |
| `input` | `EMPTY_INPUT` | Não | Input nulo ou somente espaços em branco. |
| `input` | `INPUT_TOO_LONG` | Não | Pergunta excedeu `MAX_INPUT_CHARS`. |
| `input` | `PROMPT_INJECTION` | Não | Regex barrou ataque de persona ou exfiltração. |
| `schema` | `SCHEMA_LOAD_ERROR` | Não | Falha ao carregar schema técnico ou metadados de negócio. |
| `sql_generation` | `SQL_PARSE_ERROR` | Sim | Chamada 1 retornou SQL inválido ou malformado. |
| `sql_validation` | `DESTRUCTIVE_QUERY` | Não | Guardrail bloqueou instrução não-SELECT. |
| `sql_validation` | `MULTIPLE_STATEMENTS` | Não | Guardrail detectou múltiplos statements. |
| `sql_validation` | `SCHEMA_VIOLATION_ALLOWLIST` | Não | SQL usa tabela ou coluna inexistente no schema permitido. |
| `sql_validation` | `SCHEMA_VIOLATION_SEMANTIC` | Não | SQL referencia coluna fora da tabela/alias correto. |
| `database` | `EXECUTION_TIMEOUT` | Sim | Query excedeu `QUERY_TIMEOUT_SECONDS`. |
| `database` | `DB_EXECUTION_ERROR` | Não | SQLite recusou ou falhou ao executar a query. |
| `insight_generation` | `INSIGHT_PARSE_ERROR` | Sim | Chamada 2 retornou JSON malformado ou fora do contrato após retries. |
| `llm` | `LLM_AUTHENTICATION_ERROR` | Não | Chave ausente, inválida, expirada ou sem permissão para o modelo. |
| `llm` | `LLM_RATE_LIMIT_ERROR` | Sim | Limite de requisições por minuto atingido. Aguarde antes de tentar novamente. |
| `llm` | `LLM_QUOTA_ERROR` | Não | Quota diária ou de plano atingida. Nova tentativa imediata tende a falhar. |
| `llm` | `LLM_TIMEOUT_ERROR` | Sim | API Gemini demorou demais para responder. |
| `llm` | `LLM_UNAVAILABLE_ERROR` | Sim | Serviço Gemini temporariamente indisponível. |
| `llm` | `LLM_INVALID_REQUEST_ERROR` | Não | Requisição inválida, modelo inexistente ou prompt fora dos limites aceitos. |
| `llm` | `LLM_INTERNAL_ERROR` | Sim | Erro interno/transiente no provedor. |
| `llm` | `LLM_UNKNOWN_ERROR` | Não | Falha não categorizada ao chamar o LLM. |

## Limitações Conhecidas

- O agente depende do schema do banco Gold estar atualizado.
- A memória de conversa é mantida no estado da instância do agente. Para persistência entre requisições HTTP, o backend deve serializar os dados via `export_history()` e restaurá-los com `import_history()`.
- Gráficos são sugeridos pelo agente; o frontend decide se renderiza.
- O agente aplica guardrails de segurança em três camadas (input, SQL gerado e execução), mas não substituem uma auditoria manual de queries críticas.
- A detecção de perguntas fora do escopo não utiliza classificador por LLM adicional — o escopo é controlado exclusivamente pelo prompt do SQL (marcador `FORA_DO_ESCOPO`) e pelos guardrails da Camada 2 (allowlist e validação semântica), economizando requisições à API.
- A validação semântica de colunas (`validate_semantic_schema`) usa um mapeamento flat de aliases. Se subqueries ou CTEs distintas reutilizarem o mesmo alias, podem ocorrer falsos positivos ou negativos. Queries com aliases colidentes são raras em geração por LLM; será revisado na branch `feat/ai-agent-extras`.

## Decisões Arquiteturais

As decisões arquiteturais do projeto estão documentadas em [`README_DECISOES.md`](README_DECISOES.md).
