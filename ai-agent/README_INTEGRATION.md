# Guia de Integração Backend: Módulo `ai-agent`

Este documento orienta o time de backend a consumir o módulo Python do agente de IA Text-to-SQL da V-Commerce. O conteúdo abaixo foi validado contra a implementação atual em `src/vcommerce_ai_agent/agent.py`, `src/vcommerce_ai_agent/core/config.py`, `src/vcommerce_ai_agent/core/exceptions.py`, `src/vcommerce_ai_agent/database/db.py`, `src/vcommerce_ai_agent/llm/sql_generator.py`, `src/vcommerce_ai_agent/llm/insight_generator.py` e os testes unitários do contrato.

## Visão Geral

O backend deve consumir a classe pública `VCommerceAgent`. Ela recebe perguntas em português brasileiro, gera SQL via LLM, valida a consulta, executa no SQLite Gold e retorna uma resposta estruturada para API, logs e frontend.

Fluxo interno:

```text
Pergunta do usuário
  -> validação de input
  -> carregamento do schema SQLite
  -> Chamada 1 ao LLM para gerar SQL
  -> validação de segurança e schema do SQL
  -> execução read-only no SQLite
  -> mascaramento reversível de dados sensíveis antes da Chamada 2
  -> Chamada 2 ao LLM para gerar insight
  -> restauração local dos tokens nos textos exibíveis
  -> AgentResponse
```

O agente não cria tabelas, não popula dados e não gerencia migrações. O banco SQLite é responsabilidade do backend.

Quando a query retorna colunas marcadas como sensíveis no `schema_descriptions.json`, o agente substitui esses valores por tokens temporários antes de enviar os dados ao Gemini na Chamada 2. A restauração acontece localmente antes da montagem do `AgentResponse`. O contrato público não muda: `user_response.data` continua trazendo as linhas reais retornadas pelo banco, enquanto o mapa `token -> valor real` nunca é retornado, persistido no histórico ou exposto em `developer_debug`.

## Pré-requisitos

- Python 3.11+.
- Dependências instaladas a partir do pacote local `ai-agent/pyproject.toml`.
- Banco SQLite Gold já criado e populado.
- Variável `GEMINI_API_KEY` disponível no ambiente do processo. Em desenvolvimento local, ela pode vir do `.env` do backend carregado antes do import ou do `.env` do `ai-agent`.
- Caminho do banco informado explicitamente em `VCommerceAgent(db_path=...)`. Se usar `DB_PATH`, o backend deve ler a variável e repassar o valor ao construtor.
- Opcionalmente, arquivo externo de descrições do schema informado via `schema_descriptions_path`.

Variáveis reconhecidas:

| Variável | Uso |
|---|---|
| `GEMINI_API_KEY` | Chave obrigatória para chamadas ao Gemini. A falha aparece como erro estruturado `LLM_AUTHENTICATION_ERROR`. |
| `DB_PATH` | Caminho padrão do SQLite, caso o backend opte por ler do ambiente e repassar ao agente. |
| `LLM_TEMPERATURE_INSIGHT` | Temperatura da Chamada 2. Padrão atual: `0.3`. |
| `LLM_TEMPERATURE_SUGGESTIONS` | Temperatura da geração de sugestões iniciais (`initial_suggestions`). Padrão atual: `0.5`. |

## Instalação e Importação no Backend

O módulo agora é um pacote Python instalável chamado `vcommerce-ai-agent`, com pacote importável `vcommerce_ai_agent`. O backend não deve depender de `PYTHONPATH` como fluxo normal de integração.

Durante o desenvolvimento local, instale o agente em modo editable a partir do ambiente virtual do backend:

```bash
pip install -e ../ai-agent
```

Se o backend controlar dependências por `requirements.txt`, adicione:

```text
-e ../ai-agent
```

Depois disso, o import fica estável:

```python
from vcommerce_ai_agent import VCommerceAgent
```

Também é possível importar do módulo interno se o backend preferir:

```python
from vcommerce_ai_agent.agent import VCommerceAgent
```

## Onde Configurar as Variáveis de Ambiente

Quando o `ai-agent` é consumido como dependência local do backend, as variáveis devem ficar no ambiente do próprio backend: `.env` do backend em desenvolvimento local, secrets/variáveis do container em homologação e produção, ou qualquer mecanismo equivalente já usado pelo backend.

Não é necessário manter um `.env` específico para o `ai-agent` nesse cenário. O arquivo `ai-agent/.env` continua útil apenas para execução isolada do módulo, por exemplo smoke tests ou testes manuais rodados diretamente dentro de `ai-agent/`.

O pacote carrega automaticamente `backend/.env` como padrão durante o primeiro import de `vcommerce_ai_agent`. Se `backend/.env` não existir, `ai-agent/.env` é aceito como fallback para execução isolada do módulo. Variáveis já exportadas no processo têm precedência sobre ambos os arquivos.

O backend pode continuar carregando seu `.env` no bootstrap, mas isso não é mais obrigatório apenas para atender o import do agente:

```python
from dotenv import load_dotenv

load_dotenv()

from vcommerce_ai_agent import VCommerceAgent
```

Configuração recomendada no `.env` do backend:

```env
GEMINI_API_KEY=sua-chave-aqui
DB_PATH=/app/data/vcommerce.db
SCHEMA_DESCRIPTIONS_PATH=/app/config/schema_descriptions.json
LLM_TEMPERATURE_INSIGHT=0.3
```

Observações importantes:

- `GEMINI_API_KEY` é lida diretamente pelo módulo do agente.
- `LLM_TEMPERATURE_INSIGHT` também é lida diretamente pelo módulo do agente e é opcional.
- `DB_PATH` não é usado automaticamente pelo construtor; o backend deve ler essa variável e repassar em `VCommerceAgent(db_path=...)`.
- `SCHEMA_DESCRIPTIONS_PATH` é uma convenção recomendada para o backend; o agente só usa esse caminho quando ele é repassado em `schema_descriptions_path=...`.

Constantes internas relevantes:

| Constante | Valor padrão | Uso |
|---|---:|---|
| `LLM_MODEL` | `gemini-2.5-flash` | Modelo padrão. Pode ser sobrescrito no construtor. |
| `QUERY_TIMEOUT_SECONDS` | `10` | Timeout padrão de execução SQL. |
| `MAX_ROWS` | `1000` | Máximo de linhas retornadas ao backend. |
| `MAX_INPUT_CHARS` | `500` | Tamanho máximo da pergunta. |
| `MAX_HISTORY_TURNS` | `20` | Máximo de pares pergunta/resposta mantidos em memória. |

## Instanciação do Agente

Assinatura do construtor:

```python
def __init__(
    self,
    db_path: str,
    excluded_tables: set[str] | None = None,
    max_rows: int = 1000,
    query_timeout_seconds: int = 10,
    llm_model: str = "gemini-2.5-flash",
    schema_descriptions_path: str | Path | None = None,
) -> None:
```

Parâmetros:

| Parâmetro | Obrigatório | Descrição |
|---|---:|---|
| `db_path` | Sim | Caminho absoluto ou relativo para o arquivo SQLite. A conexão é aberta em modo read-only para arquivos em disco. |
| `excluded_tables` | Não | Tabelas que não devem ser enviadas ao LLM nem permitidas pelos guardrails. Útil para ocultar tabelas sensíveis. |
| `max_rows` | Não | Limite de linhas retornadas ao backend. Se o resultado exceder o limite, `user_response.truncated` será `True`. |
| `query_timeout_seconds` | Não | Timeout de execução SQL. Estouro retorna erro estruturado em `developer_debug.error`. |
| `llm_model` | Não | Nome do modelo Gemini usado nas duas chamadas ao LLM. |
| `schema_descriptions_path` | Não | Caminho para um JSON externo com aliases, descrições e exemplos do schema. Se omitido, usa o arquivo padrão empacotado no agente. |

Exemplo recomendado para FastAPI:

```python
import os

from vcommerce_ai_agent import VCommerceAgent

agent = VCommerceAgent(
    db_path=os.environ["DB_PATH"],
    schema_descriptions_path=os.environ.get("SCHEMA_DESCRIPTIONS_PATH"),
    excluded_tables={"usuarios", "auditoria"},
)
```

Para APIs HTTP com múltiplas sessões de chat, a memória de conversa é responsabilidade do agente, mas a concorrência é responsabilidade do backend. O backend deve persistir o histórico exportado pelo agente como um dado opaco associado ao `session_id`, serializar chamadas concorrentes da mesma sessão e restaurar o histórico antes de chamar `ask()`.

## Funções Públicas Disponíveis

### `async ask(question: str) -> AgentResponse`

Processa uma pergunta do usuário.

Comportamento:

- Aceita perguntas em português brasileiro.
- Retorna sempre `AgentResponse` para falhas esperadas do pipeline.
- Não levanta exceção para input vazio, input longo, tipo inválido, erro de LLM, erro de SQL ou timeout de banco; esses casos viram `status="error"`.
- Perguntas fora do escopo viram `status="out_of_scope"`.
- Apenas interações com `status="success"` são adicionadas ao histórico.

Exemplo:

```python
response = await agent.ask("Quais foram os 10 produtos com maior receita?")

if response.status == "success":
    return response.user_response

if response.status == "out_of_scope":
    return response.user_response

logger.warning(
    "Falha no agente",
    extra={
        "code": response.developer_debug.error.code,
        "stage": response.developer_debug.error.stage,
        "sql": response.developer_debug.sql,
    },
)
return response.user_response
```

### `async initial_suggestions(history: list[dict[str, str | None]] | None = None) -> list[str]`

Retorna 5 sugestões de perguntas para o chat. Quando o histórico está vazio ou ausente, retorna uma lista fixa e imutável sem chamar o LLM. Quando o histórico da conversa é fornecido, gera 5 perguntas de follow-up contextuais via LLM. Em caso de falha esperada, retorna a lista fixa.

```python
# Carregamento inicial do chat (sem histórico, sem chamada ao LLM)
suggestions = await agent.initial_suggestions()

# Durante a conversa (com histórico, gera follow-ups via LLM)
history = agent.export_history()
suggestions = await agent.initial_suggestions(history=history)
```

Comportamento:

- Sem histórico: retorna lista fixa com latência zero, sem consumir chamadas ao LLM.
- Com histórico: o método é assíncrono e consome 1 chamada ao LLM.
- Não altera o histórico interno do agente (`self._history`).
- Não executa queries no banco.
- Retorna exatamente 5 perguntas em português brasileiro.
- Falhas esperadas retornam a lista fixa sem quebrar o backend.

Exemplo de uso em um endpoint FastAPI para sugestões contextuais:

```python
from typing import Any

from pydantic import BaseModel, Field


class SuggestionsRequest(BaseModel):
    history: list[dict[str, str | None]] = Field(default_factory=list)


@router.post("/ai-agent/suggestions")
async def get_suggestions(payload: SuggestionsRequest) -> dict[str, Any]:
    suggestions = await agent.initial_suggestions(
        history=payload.history or None
    )
    return {"suggestions": suggestions}
```

### `invalidate_schema() -> None`

Limpa o cache interno do schema. Use quando o backend trocar o banco, atualizar tabelas Gold ou alterar metadados de schema.

```python
agent.invalidate_schema()
```

Na próxima chamada a `ask()`, o agente recarrega o schema técnico do SQLite e os metadados de negócio.

### `clear_history() -> None`

Limpa a memória da conversa da instância atual.

```python
agent.clear_history()
```

Use ao iniciar uma nova conversa quando a mesma instância for reaproveitada.

### `export_history() -> list[dict[str, str | None]]`

Exporta o histórico atual em formato serializável.

Formato:

```python
[
    {"role": "user", "content": "Pergunta anterior", "sql": None},
    {"role": "assistant", "content": "Resposta anterior", "sql": "SELECT ..."},
]
```

O backend pode persistir esse retorno em Redis, banco relacional ou storage de sessão.

### `import_history(history: list[dict[str, str | None]]) -> None`

Restaura o histórico em uma instância do agente.

Validações aplicadas:

- `history` deve ser lista.
- Cada item deve ser dicionário.
- `role` deve alternar entre `user` e `assistant`.
- O histórico deve ter pares completos `user/assistant`.
- Entrada `user` deve ter `sql` ausente ou `None`.
- Entrada `assistant` deve ter `sql` como string não vazia.
- O conteúdo é truncado automaticamente para os últimos `MAX_HISTORY_TURNS` turnos.

Erros de formato levantam `ValueError`. O backend deve tratar essa exceção como erro de persistência/sessão, não como erro do usuário final.

## Memória de Conversa e Concorrência

O `ai-agent` é responsável por manejar a memória de conversa:

- Define o formato do histórico.
- Valida snapshots recebidos por `import_history()`.
- Trunca o histórico para `MAX_HISTORY_TURNS`.
- Injeta o histórico nos prompts da Chamada 1 e da Chamada 2.
- Atualiza o histórico após uma resposta com `status="success"`.
- Exporta um snapshot serializável via `export_history()`.

O backend é responsável por concorrência e ciclo de vida da sessão:

- Associar o histórico a um `session_id`.
- Persistir o snapshot retornado por `export_history()`.
- Recuperar o histórico antes de uma nova pergunta.
- Aplicar lock por `session_id` para impedir duas perguntas simultâneas na mesma conversa.
- Definir expiração, limpeza e isolamento entre usuários.

O backend não deve editar manualmente o conteúdo do histórico. Trate o retorno de `export_history()` como dado opaco: armazene e devolva ao agente com `import_history()`.

Fluxo recomendado:

```python
async with lock_by_session(session_id):
    history = await history_store.get(session_id)

    agent = VCommerceAgent(
        db_path=os.environ["DB_PATH"],
        schema_descriptions_path=os.environ.get("SCHEMA_DESCRIPTIONS_PATH"),
        excluded_tables={"usuarios", "auditoria"},
    )

    if history:
        agent.import_history(history)

    response = await agent.ask(question)

    await history_store.set(session_id, agent.export_history())

    return response
```

Uma instância global compartilhada de `VCommerceAgent` não deve ser usada para conversas de múltiplos usuários se a memória estiver ativa, porque `_history` é estado da instância. O backend pode criar uma instância por request e restaurar o histórico, ou manter instâncias por sessão desde que também controle expiração e lock por `session_id`.

## Serialização

As respostas são `dataclasses`. Para converter em JSON:

```python
from dataclasses import asdict

payload = asdict(response)
```

## Exemplo de Endpoint FastAPI

Exemplo ilustrativo. Ajuste nomes de schemas HTTP ao padrão do backend.

```python
from dataclasses import asdict
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from vcommerce_ai_agent import VCommerceAgent

router = APIRouter()


class AskRequest(BaseModel):
    question: str
    history: list[dict[str, str | None]] | None = None


@router.post("/ai-agent/ask")
async def ask_agent(payload: AskRequest) -> dict[str, Any]:
    agent = VCommerceAgent(db_path="/caminho/para/vcommerce.db")

    if payload.history is not None:
        agent.import_history(payload.history)

    response = await agent.ask(payload.question)
    history = agent.export_history()

    return {
        "response": asdict(response),
        "history": history,
    }
```

O exemplo acima mostra o agente recebendo o histórico pela request apenas para simplificar. Em produção, prefira buscar e salvar o histórico em storage do backend por `session_id`, aplicando lock por sessão conforme descrito na seção de memória e concorrência.

## Contrato de Resposta

`ask()` retorna:

```python
@dataclass
class AgentResponse:
    status: Literal["success", "error", "out_of_scope"]
    user_response: UserResponse
    developer_debug: DeveloperDebug
```

### `status`

| Valor | Significado |
|---|---|
| `success` | SQL foi gerado, validado, executado e o insight foi produzido. |
| `error` | Houve falha controlada em input, schema, LLM, SQL, banco ou insight. |
| `out_of_scope` | A pergunta não pode ser respondida com os dados ou escopo permitido. |

### `UserResponse`

Payload seguro para frontend:

```python
@dataclass
class UserResponse:
    answer_text: str
    sources_text: str | None
    data: list[dict] | None
    chart: ChartSuggestion | None
    truncated: bool
```

Campos:

| Campo | Descrição |
|---|---|
| `answer_text` | Texto principal em português para exibição ao usuário. |
| `sources_text` | Resumo curto e sanitizado das fontes consultadas. Pode ser `None`. |
| `data` | Linhas retornadas pelo banco. Em sucesso é uma lista, inclusive para resultado escalar ou vazio. Em erro/fora de escopo sem execução é `None`. |
| `chart` | Sugestão opcional de gráfico. |
| `truncated` | `True` quando o banco retornou mais linhas do que `max_rows`. |

Regras importantes:

- `data` vem diretamente do banco após SQL validado.
- A Chamada 2 não altera nem sintetiza `data`.
- Em sucesso com resultado escalar, `data` continua lista de dicts, por exemplo `[{"receita_total": 12345.67}]`.
- Em sucesso sem linhas, `data` é `[]`.
- Nomes físicos de tabelas só são sanitizados nos textos humanos se houver um `display_name` configurado no arquivo `schema_descriptions.json`. No SQL técnico, eles nunca são alterados.

### `ChartSuggestion`

```python
@dataclass
class ChartSuggestion:
    type: Literal["bar", "line", "pie", "area"]
    x_axis: str | None
    y_axis: str | None
    title: str
```

Regras:

- `type` mapeia diretamente para Recharts: `bar`, `line`, `pie`, `area`.
- `x_axis` e `y_axis`, quando presentes, correspondem a chaves existentes em `data`.
- O campo `chart` é **opcional e decisão do agente**. O agente retorna `chart=None` por padrão, preenchendo apenas quando o usuário solicita explicitamente uma visualização (verbos como "mostre", "exiba", "plote", "gráfico de") ou quando os dados possuem padrão visual claro (ranking, série temporal, proporção limitada).
- Respostas escalares (valor único, total, média) e listagens detalhadas sem agregação retornam `chart=None`.
- Se o tipo ou eixos forem inválidos, o agente retorna `chart=None`.
- O frontend deve sempre tratar `chart` como opcional; quando `chart=None` e `data` existe, renderiza como tabela.

### `DeveloperDebug`

Payload técnico para logs e auditoria:

```python
@dataclass
class DeveloperDebug:
    sql: str
    error: ResponseError | None
    total_time_ms: float | None = None
    sql_generation_time_ms: float | None = None
    query_execution_time_ms: float | None = None
    insight_generation_time_ms: float | None = None
    tokens_used: int | None = None
```

Regras:

- `sql` pode conter quebras de linha e nomes físicos de tabelas.
- `sql` não deve ser renderizado para usuário final.
- `error` é `None` em sucesso e fora de escopo.
- Os tempos podem ser `None` quando a etapa correspondente não chegou a executar.
- `tokens_used` soma tokens das chamadas ao LLM quando o provedor disponibiliza essa métrica.

### `ResponseError`

```python
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
```

`message` é destinada ao backend/logs. Para o frontend, use `user_response.answer_text`. O backend mapeia alguns códigos específicos (como `EMPTY_INPUT`, `LLM_RATE_LIMIT_ERROR`) para mensagens amigáveis no `answer_text` antes de enviar ao frontend, enquanto os demais permanecem com uma mensagem genérica de falha técnica.

## Códigos de Erro

| Stage | Código | Retry | Quando ocorre |
|---|---|---:|---|
| `input` | `EMPTY_INPUT` | Não | Pergunta vazia ou só espaços. |
| `input` | `INPUT_TOO_LONG` | Não | Pergunta acima de `MAX_INPUT_CHARS`. |
| `input` | `INVALID_INPUT_TYPE` | Não | `question` não é `str`. |
| `input` | `PROMPT_INJECTION` | Não | Guardrail detectou tentativa de prompt injection ou exfiltração de prompt. |
| `schema` | `SCHEMA_LOAD_ERROR` | Não | Falha ao carregar schema técnico ou metadados. |
| `sql_generation` | `SQL_PARSE_ERROR` | Sim | LLM retornou SQL inválido/malformado. |
| `sql_validation` | `DESTRUCTIVE_QUERY` | Não | SQL não é leitura segura. |
| `sql_validation` | `MULTIPLE_STATEMENTS` | Não | SQL contém mais de um statement. |
| `sql_validation` | `SQL_PARSE_ERROR` | Não | SQL não pôde ser parseado durante a validação de segurança após tentativas de correção. |
| `sql_validation` | `SCHEMA_VIOLATION_ALLOWLIST` | Não | SQL usa tabela/coluna fora do schema permitido. |
| `sql_validation` | `SCHEMA_VIOLATION_SEMANTIC` | Não | SQL referencia coluna fora da tabela/alias correto. |
| `sql_validation` | `SENSITIVE_DATA_MASKING_ERROR` | Não | Falha ao mascarar coluna sensível antes da Chamada 2, por exemplo `SELECT *` inseguro ou agregação `MIN`/`MAX` sobre dado pessoal. |
| `database` | `EXECUTION_TIMEOUT` | Sim | Query excedeu timeout configurado. |
| `database` | `DB_EXECUTION_ERROR` | Não | SQLite falhou ao executar a query. |
| `insight_generation` | `INSIGHT_PARSE_ERROR` | Sim | Chamada 2 retornou JSON fora do contrato. |
| `llm` | `LLM_AUTHENTICATION_ERROR` | Não | Chave ausente, inválida ou sem permissão. |
| `llm` | `LLM_RATE_LIMIT_ERROR` | Sim | Rate limit por minuto. |
| `llm` | `LLM_QUOTA_ERROR` | Não | Quota diária ou de plano atingida. |
| `llm` | `LLM_TIMEOUT_ERROR` | Sim | Timeout na API Gemini. |
| `llm` | `LLM_UNAVAILABLE_ERROR` | Sim | Serviço temporariamente indisponível. |
| `llm` | `LLM_INVALID_REQUEST_ERROR` | Não | Requisição inválida ou modelo indisponível. |
| `llm` | `LLM_INTERNAL_ERROR` | Sim | Erro interno do provedor. |
| `llm` | `LLM_UNKNOWN_ERROR` | Não | Falha não categorizada. |
| (interno) | `UNKNOWN_GUARDRAIL` | Não | Fallback defensivo interno. Nunca emitido pelos guardrails atuais; existe como valor padrão do `GuardrailError` para extensões futuras. |

## Tratamento Recomendado no Backend

Use `status` para decidir o fluxo HTTP:

- `success`: retornar `200`.
- `out_of_scope`: retornar `200` com mensagem de fora de escopo para o frontend.
- `error`: retornar `200` para que a UI exiba o `user_response.answer_text` (que agora contém uma mensagem amigável mapeada no backend a partir do código de erro), ou mapear para `4xx/5xx` interno conforme a política do backend.

Use `developer_debug.error.retryable` para decidir se a UI pode sugerir nova tentativa automática/manual.

Não exponha no frontend:

- `developer_debug.sql`.
- `developer_debug.error.message`.
- Nomes físicos de tabelas presentes em SQL.

Pode expor no frontend:

- `user_response.answer_text`.
- `user_response.sources_text`.
- `user_response.data`.
- `user_response.chart`.
- `user_response.truncated`.

## Descrições do Schema

O agente sempre extrai o schema técnico diretamente do SQLite. O arquivo `schema_descriptions.json` complementa esse schema com conhecimento de negócio:

- `display_name`: alias exibível/empresarial da tabela.
- `description`: descrição da tabela ou coluna.
- `columns`: metadados das colunas.
- `examples`: exemplos de valores para orientar o LLM.
- `sensitive`: marca uma coluna como sensível para mascaramento antes da Chamada 2.
- `mask_label`: prefixo usado nos tokens temporários, como `Cliente_1` ou `Pedido_1`.

O pacote inclui um arquivo padrão em `src/vcommerce_ai_agent/database/schema_descriptions.json`, mas em produção o backend deve preferir um arquivo externo configurável:

```python
agent = VCommerceAgent(
    db_path="/app/data/vcommerce.db",
    schema_descriptions_path="/app/config/schema_descriptions.json",
)
```

Estrutura esperada:

- A raiz do JSON deve conter obrigatoriamente o objeto `tables`.
- As chaves dentro de `tables` devem ser os nomes físicos das tabelas no SQLite.
- As chaves dentro de `columns` devem ser os nomes físicos das colunas no SQLite.
- `display_name` agora atua como a única forma de traduzir nomes técnicos para termos de negócio na UI (o agente não remove mais prefixos como `fato_` magicamente). Se omitido, o nome da tabela física será exibido ao usuário.
- `description`, `columns` e `examples` são metadados opcionais, mas fortemente recomendados para melhorar a qualidade do SQL gerado pelo modelo.

Exemplo curto e completo:

```json
{
  "tables": {
    "fato_vendas": {
      "display_name": "vendas",
      "description": "Tabela fato com vendas realizadas.",
      "columns": {
        "id_cliente": {
          "description": "Chave estrangeira para a tabela dim_cliente.",
          "examples": [101, 102]
        },
        "valor_total_venda": {
          "description": "Valor total da venda em reais.",
          "examples": [129.9, 259.8]
        }
      }
    },
    "dim_cliente": {
      "display_name": "clientes",
      "description": "Dimensão com dados cadastrais dos clientes.",
      "columns": {
        "id_cliente": {
          "description": "Identificador único do cliente.",
          "examples": [101, 102]
        },
        "nome_cliente": {
          "description": "Nome completo ou razão social do cliente.",
          "examples": ["Maria Silva", "Loja Exemplo Ltda"],
          "sensitive": true,
          "mask_label": "Cliente"
        },
        "regiao": {
          "description": "Região comercial do cliente.",
          "examples": ["Sul", "Sudeste"]
        }
      }
    }
  }
}
```

Validações aplicadas no carregamento:

- O arquivo deve ser JSON válido.
- O campo `tables` é obrigatório e deve ser um objeto.
- Cada tabela deve ter metadados em objeto.
- `display_name` e `description`, quando presentes, devem ser strings.
- `columns`, quando presente, deve ser objeto.
- Cada coluna deve ter metadados em objeto.
- `examples`, quando presente, deve ser lista.
- `sensitive`, quando presente, deve ser booleano.
- `mask_label`, quando presente, deve ser string não vazia.

Se a estrutura for inválida, `ask()` retorna `status="error"` com `developer_debug.error.stage == "schema"` e `code == "SCHEMA_LOAD_ERROR"`.

Quando o backend alterar o arquivo externo em runtime, chame:

```python
agent.invalidate_schema()
```

Isso força o recarregamento do schema técnico e das descrições na próxima pergunta.

## Segurança e Guardrails

O agente aplica validações em camadas:

- Input vazio, longo demais ou tipo inválido.
- Detecção de prompt injection e pedido de exfiltração de instruções.
- Apenas queries `SELECT` são permitidas. Qualquer operação não-SELECT (incluindo `DELETE`, `DROP`, `UPDATE`, `INSERT`, `ALTER`, `TRUNCATE`, `CREATE`, `REPLACE`, `ATTACH`, `DETACH`, `PRAGMA`, `VACUUM` e outras) é bloqueada automaticamente via análise AST.
- Bloqueio de múltiplos statements.
- Bloqueio de tabelas/colunas fora do allowlist extraído do schema real.
- Validação semântica de colunas por tabela/alias.
- Mascaramento reversível de colunas sensíveis antes da Chamada 2.
- Adição automática de `LIMIT` quando a query não possui limite.
- Execução SQLite em modo read-only para arquivos em disco.

O backend ainda deve manter seus próprios controles de autenticação, autorização, rate limit por usuário e auditoria.

## Observações Operacionais

- A primeira chamada após inicializar o agente carrega e formata o schema; chamadas seguintes usam cache.
- Chame `invalidate_schema()` depois de mudanças no banco ou no arquivo de descrições.
- O prompt de insight recebe no máximo 100 linhas de dados para preservar contexto, mas `user_response.data` mantém as linhas retornadas pelo banco até `max_rows`.
- Dados sensíveis retornados pela query são mascarados antes da Chamada 2 e restaurados localmente nos textos exibíveis.
- Falhas transitórias do LLM têm retry automático interno com backoff.
- Perguntas fora do escopo não retornam `ResponseError`; elas usam `status="out_of_scope"`.
- Pedidos por tabelas ocultas, internas ou fora do schema autorizado são bloqueados antes da chamada ao LLM.

## Logging e Observabilidade

O pacote emite eventos estruturados via `logging.getLogger("vcommerce_ai_agent")`. O backend deve configurar handlers, nível e formato. O pacote **nunca** chama `logging.basicConfig`.

Exemplo de configuração mínima no backend:

```python
import logging

vcommerce_logger = logging.getLogger("vcommerce_ai_agent")
vcommerce_logger.setLevel(logging.INFO)

# Opcional: adicionar um handler se o root logger ainda nao estiver configurado
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(name)s - %(levelname)s - %(message)s"))
vcommerce_logger.addHandler(handler)
```

Eventos úteis para dashboards:

| Evento | Nível | Campos úteis para dashboards |
|---|---|---|
| `ask_started` | INFO | `model` |
| `schema_loaded` | INFO | `elapsed_ms` |
| `sql_generated` | INFO | `elapsed_ms`, `tokens_used`, `model` |
| `layer_2_blocked` | WARNING | `error_code`, `stage`, `attempt` |
| `query_executed` | INFO | `elapsed_ms`, `rows_count`, `truncated` |
| `sensitive_masking_applied` | INFO | `masked_columns_count` |
| `insight_generated` | INFO | `elapsed_ms`, `tokens_used`, `model` |
| `ask_finished` | INFO | `status`, `total_time_ms`, `tokens_used`, `error_code` |
| `llm_retry_attempted` | INFO | `attempt`, `error_code`, `backoff_seconds` |

Interpretação de níveis:

- `INFO` indica progresso normal do pipeline.
- `WARNING` indica tentativas de ataque (prompt injection, `layer_2_blocked`) ou situações que exigem atenção. O backend pode usar esses eventos para alertas de segurança.

O pacote garante que nenhum log contém PII: a pergunta do usuário, dados do banco, mapa de tokens e nomes de colunas sensíveis nunca aparecem nos extras dos eventos. O campo `sql` é incluído apenas em eventos de erro, como `layer_2_blocked`, para facilitar auditoria de tentativas maliciosas.

## Checklist de Integração

1. Instalar o pacote local com `pip install -e ../ai-agent` ou adicionar `-e ../ai-agent` ao `requirements.txt` do backend.
2. Importar `VCommerceAgent` via `from vcommerce_ai_agent import VCommerceAgent`.
3. Configurar `GEMINI_API_KEY`.
4. Passar `db_path` válido para `VCommerceAgent`.
5. Passar `schema_descriptions_path` externo se o backend for controlar aliases e descrições.
6. Definir `excluded_tables` para tabelas sensíveis.
7. Implementar endpoint assíncrono chamando `await agent.ask(question)`.
8. Serializar `AgentResponse` com `dataclasses.asdict`.
9. Persistir o snapshot de histórico por `session_id` se o chat precisar de follow-up entre requests.
10. Aplicar lock por `session_id` para serializar perguntas simultâneas da mesma conversa.
11. Usar `developer_debug` apenas para logs/auditoria.
12. Chamar `invalidate_schema()` quando o schema Gold ou as descrições mudarem.
