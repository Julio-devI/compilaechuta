# ai-agent: Módulo de Agente de IA (Text-to-SQL)

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
pip install -e ".[test]"
cp .env.example .env      # preencher GEMINI_API_KEY e DB_PATH
```

## Uso Programático

```python
import asyncio
from vcommerce_ai_agent import VCommerceAgent

agent = VCommerceAgent(
    db_path='../backend/data/vcommerce.db',
    schema_descriptions_path='../backend/config/schema_descriptions.json',
)

# O agente lembra automaticamente do contexto (stateful)
resp1 = asyncio.run(agent.ask('Quais os 10 produtos mais vendidos?'))
resp2 = asyncio.run(agent.ask('E apenas na região Sul?'))  # Pergunta de follow-up
print(resp2.status)
print(resp2.user_response.answer_text)
print(resp2.user_response.sources_text)

if resp2.developer_debug.error:
    print(resp2.developer_debug.error.code, resp2.developer_debug.error.message)

# Persistência de sessão (opcional para o backend)
history = agent.export_history()  # Retorna list[dict] serializável
# ... o backend salva em Redis/Banco de dados por session_id ...
# ... em uma nova requisição, o backend restaura em uma nova instância ...
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
class UserResponse:
    answer_text: str
    sources_text: str | None
    data: list[dict] | None
    chart: ChartSuggestion | None
    truncated: bool

@dataclass
class DeveloperDebug:
    sql: str
    error: ResponseError | None
    total_time_ms: float | None = None
    sql_generation_time_ms: float | None = None
    query_execution_time_ms: float | None = None
    insight_generation_time_ms: float | None = None
    tokens_used: int | None = None

@dataclass
class AgentResponse:
    status: Literal["success", "error", "out_of_scope"]
    user_response: UserResponse
    developer_debug: DeveloperDebug
```

Regras do contrato:

- `status` define o estado principal: `success`, `error` ou `out_of_scope`.
- `status == "out_of_scope"` substitui o antigo booleano `out_of_scope`.
- `user_response` agrupa apenas dados seguros para o frontend: `answer_text`, `sources_text`, `data`, `chart` e `truncated`.
- `user_response.answer_text` contém a resposta analítica principal. Em erro técnico, contém mensagem genérica segura. Em fora de escopo, contém a explicação sem o marcador técnico `FORA_DO_ESCOPO`.
- `user_response.sources_text` contém um bloco curto em linguagem empresarial explicando de onde vieram os dados consultados, no estilo `Fonte de dados consultada: Cruzamento da base de Vendas com Produtos e Calendário (...)`, ou `None` quando não houver fontes aplicáveis.
- `developer_debug` agrupa dados técnicos para logs e auditoria: `sql`, `error`, tempos de execução (`total_time_ms`, `sql_generation_time_ms`, `query_execution_time_ms`, `insight_generation_time_ms`) e consumo de tokens (`tokens_used`).
- `developer_debug.sql` é metadado técnico bruto para o backend, útil para auditoria, debug e reexecução. Não é sanitizado, pode conter quebras de linha e nomes físicos de tabelas, e não deve ser renderizado no frontend.
- `developer_debug.error` é sempre `None` em sucesso e fora de escopo; em falhas esperadas de uso normal contém `ResponseError` com `code`, `stage`, `message` e `retryable`.
- `data` sempre vem do banco após execução do SQL validado. A Chamada 2 não decide, altera nem sintetiza dados.
- Em sucesso com resultado escalar, `data` continua sendo lista de dicts, ex.: `[{"receita_total": 12345.67}]`.
- Em sucesso sem linhas, `data` é `[]`.
- Em erro ou fora de escopo sem execução, `data` é `None`.
- Textos humanos (`answer_text`, `sources_text` e títulos de gráfico) não devem expor nomes físicos nem prefixos técnicos de tabelas. Essa regra não se aplica ao campo técnico `developer_debug.sql`.
- `chart` é apenas sugestão. Se o tipo ou os eixos não forem compatíveis com `data`, o agente retorna `chart=None`.

## Estrutura

- `pyproject.toml`: Metadados de pacote instalável e dependências
- `src/vcommerce_ai_agent/agent.py`: Classe pública `VCommerceAgent` (Facade)
- `src/vcommerce_ai_agent/core/`: Configurações e tratamento de erros customizados
- `src/vcommerce_ai_agent/database/`: Conexão, execução SQL e extração de schema
- `src/vcommerce_ai_agent/llm/`: Geração de prompts, chamadas à API Gemini e clientes LLM
- `src/vcommerce_ai_agent/security/`: Validações de segurança, guardrails e mascaramento reversível de dados sensíveis
- `tests/unit/`: Testes automatizados rápidos e isolados
- `tests/integration/`: Smoke tests contra a API real e banco sintético

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

1. Ambiente virtual ativado e dependências instaladas (`pip install -e ".[test]"`).
2. Arquivo `.env` na raiz do projeto com a chave da API:
   ```bash
   GEMINI_API_KEY=sua-chave-aqui
   ```

### Como executar

```bash
python tests/integration/smoke_test.py
python tests/integration/smoke_test_guardrails.py
python tests/integration/smoke_test_memory.py
python tests/integration/smoke_test_anonymization.py
python tests/integration/smoke_test_sensitive_data_masking.py
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

> **Nota:** Os tempos de resposta variam conforme a latência da API Gemini. Perguntas de fluxo feliz disparam 2 chamadas ao LLM (geração de SQL + geração de insight), perguntas fora do escopo normalmente disparam 1 chamada, e bloqueios pré-LLM disparam 0 chamadas. Cada script valida o orçamento antes de executar o próximo cenário e não deve ultrapassar 20 requisições planejadas por chave. Para reduzir estouro de quota, os smoke tests usam 1 tentativa por chamada LLM; retries continuam habilitados no agente em uso normal. Os limites dos smoke tests são constantes hardcoded e centralizadas em `tests/integration/smoke_tests_config.py`, pois refletem limites fixos do free tier.

O script `smoke_test_anonymization.py` valida o fluxo principal de mascaramento reversível em três cenários: consulta agregada sem dado sensível, consulta simples com nome de cliente e consulta complexa com joins entre Vendas, Clientes, Produtos e Calendário. O cenário complexo confirma múltiplos prefixos de tokens (`Cliente_`, `Email_`, `Telefone_`, `Documento_`, `Pedido_`), restauração dos valores reais na resposta final e ausência de tokens no texto exibido ao usuário.

O script `smoke_test_sensitive_data_masking.py` compara cenários com e sem mascaramento reversível, capturando os dados enviados à Chamada 2, o JSON bruto retornado pelo LLM e a resposta final restaurada pelo agente. Ele aceita `ANON_SMOKE_RUNS` e `ANON_SMOKE_QUESTION` para controlar a quantidade de rodadas ou executar uma pergunta customizada.

## Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `GEMINI_API_KEY` | Chave da API Google Gemini |
| `DB_PATH` | Caminho para o banco SQLite do backend |
| `LLM_TEMPERATURE_INSIGHT` | Temperatura da Chamada 2 (padrão: 0.3) |

## Guardrails e Códigos de Erro

Para garantir opacidade de erro no frontend, falhas técnicas continuam usando mensagem amigável genérica em `user_response.answer_text`: *"Não foi possível processar sua pergunta. Tente reformulá-la."*

O backend recebe detalhes em `AgentResponse.developer_debug.error`, com `code`, `stage`, `message` e `retryable`. A mensagem é em português para que o desenvolvedor consiga diagnosticar a falha sem consultar documentação externa.

| Stage | Código (`ResponseError.code`) | Retry | Descrição |
| :--- | :--- | :---: | :--- |
| `input` | `EMPTY_INPUT` | Não | Input nulo ou somente espaços em branco. |
| `input` | `INPUT_TOO_LONG` | Não | Pergunta excedeu `MAX_INPUT_CHARS`. |
| `input` | `INVALID_INPUT_TYPE` | Não | Tipo do parâmetro `question` diferente de `str`. |
| `input` | `PROMPT_INJECTION` | Não | Regex barrou ataque de persona ou exfiltração. |
| `schema` | `SCHEMA_LOAD_ERROR` | Não | Falha ao carregar schema técnico ou metadados de negócio. |
| `sql_generation` | `SQL_PARSE_ERROR` | Sim | Chamada 1 retornou SQL inválido ou malformado. |
| `sql_validation` | `DESTRUCTIVE_QUERY` | Não | Guardrail bloqueou instrução não-SELECT. |
| `sql_validation` | `MULTIPLE_STATEMENTS` | Não | Guardrail detectou múltiplos statements. |
| `sql_validation` | `SCHEMA_VIOLATION_ALLOWLIST` | Não | SQL usa tabela ou coluna inexistente no schema permitido. |
| `sql_validation` | `SCHEMA_VIOLATION_SEMANTIC` | Não | SQL referencia coluna fora da tabela/alias correto. |
| `sql_validation` | `SENSITIVE_DATA_MASKING_ERROR` | Não | Falha ao mascarar coluna sensível antes da Chamada 2 (ex: SELECT * inseguro ou agregação MIN/MAX sobre dado pessoal). |
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
- A memória de conversa é manejada pelo agente e mantida no estado da instância. Para APIs com múltiplas sessões, o backend deve persistir o snapshot de `export_history()` por `session_id`, restaurá-lo com `import_history()` e aplicar lock por sessão para evitar chamadas concorrentes na mesma conversa.
- O backend pode informar um `schema_descriptions_path` externo para manter descrições, aliases e exemplos do schema fora do pacote instalável.
- Gráficos são sugeridos pelo agente; o frontend decide se renderiza.
- O agente aplica guardrails de segurança em três camadas (input, SQL gerado e execução), mas não substituem uma auditoria manual de queries críticas.
- A detecção de perguntas fora do escopo não utiliza classificador por LLM adicional. O escopo é controlado exclusivamente pelo prompt do SQL (marcador `FORA_DO_ESCOPO`) e pelos guardrails da Camada 2 (allowlist e validação semântica), economizando requisições à API.
- Dados sensíveis (ex: `nome_cliente`) são mascarados por tokens temporários antes do envio ao LLM na Chamada 2. A classificação de sensibilidade é determinística e baseada no `schema_descriptions.json`. A resposta final restaura os valores reais localmente, mas o mapa de reversão nunca cruza a fronteira do processo.

## Decisões Arquiteturais

As decisões arquiteturais do projeto estão documentadas em [`README_DECISOES.md`](README_DECISOES.md).
