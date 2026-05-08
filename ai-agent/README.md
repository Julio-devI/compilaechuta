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
> Cada decisão contém: contexto, decisão, justificativa e implicações.

---

### DA-01: Arquitetura de Duas Chamadas ao LLM

- **Contexto:** O agente precisa traduzir perguntas em SQL e depois transformar dados brutos em insights legíveis.
- **Decisão:** Dividir o fluxo em duas chamadas independentes ao LLM: Chamada 1 (gera SQL a partir do schema + pergunta) e Chamada 2 (gera insight a partir dos dados + SQL + pergunta).
- **Justificativa:** A divisão em duas chamadas permite especializar cada etapa com prompts, temperaturas e parâmetros próprios. Além disso, isola falhas: se o SQL gerado for inválido ou a pergunta estiver fora do escopo, não há custo de uma segunda chamada ao LLM. A separação de responsabilidades também facilita manutenção, testes unitários e auditoria do SQL gerado.
- **Implicações:** O tempo total de resposta é a soma das duas latências do LLM. O custo em tokens é dividido em duas chamadas menores, o que melhora a previsibilidade do consumo de quota.

---

### DA-02: Escolha do Google Gemini 2.5 Flash

- **Contexto:** O case exige um modelo LLM para gerar SQL e insights em português.
- **Decisão:** Utilizar o modelo `gemini-2.5-flash` como padrão, via PydanticAI.
- **Justificativa:** O Gemini 2.5 Flash oferece melhor capacidade de reasoning para joins e agregações SQL, reduzindo a taxa de erros na Chamada 1. Além disso, para o volume de uso esperado neste projeto, o limite de tokens diários (250.000 tokens/minuto) não será alcançado antes do limite de requisições diárias (20 req/dia), permitindo o uso do modelo mais potente sem restrições práticas.
- **Implicações:** O módulo depende da disponibilidade e dos termos de uso da API Google Gemini. A troca para outro provedor exigiria adaptação no `llm_client.py`.

---

### DA-03: Guardrails em Duas Camadas

- **Status:** Pendente de implementação (`feat/ai-agent-guardrails`).
- **Contexto:** O agente executa SQL gerado por um LLM e recebe entrada direta do usuário, o que expõe o sistema a riscos de injeção de prompt e queries destrutivas.
- **Decisão:** (a ser implementado) Camada 1 — filtrar tabelas sensíveis no schema enviado ao LLM; Camada 2 — validar SQL gerado antes da execução.
- **Justificativa:** (a ser definido na branch `feat/ai-agent-guardrails`)
- **Implicações:** (a ser definido)

---

### DA-04: Separação de Schema Técnico e Metadados de Negócio

- **Contexto:** O LLM precisa entender tanto a estrutura física do banco quanto o significado de negócio das colunas.
- **Decisão:** Manter o schema técnico extraído dinamicamente do SQLite (`PRAGMA table_info`, `PRAGMA foreign_key_list`) em `db.py`, e os metadados descritivos (descrições de tabelas/colunas e exemplos de valores) em um arquivo JSON estático (`schema_descriptions.json`). A combinação ocorre em `schema.py`.
- **Justificativa:** O schema técnico muda sempre que o time de engenharia de dados altera o banco, portanto precisa ser dinâmico. Já os metadados de negócio são conhecimento de domínio mantido pelo time de dados/análise e não mudam automaticamente — manter em JSON estático evita dependência de comentários no banco e permite versionamento separado.
- **Implicações:** O arquivo `schema_descriptions.json` precisa ser atualizado manualmente quando novas tabelas/colunas forem adicionadas ao modelo de dados. Tabelas ausentes no JSON ainda aparecem no prompt, mas sem descrições.

---

### DA-05: Conexão Read-Only ao Banco SQLite

- **Contexto:** O agente executa SQL gerado por um LLM, o que representa risco de segurança.
- **Decisão:** A URI de conexão no `db.py` sempre inclui `?mode=ro`, forçando o SQLite a recusar qualquer operação de escrita.
- **Justificativa:** A conexão read-only impede a execução de queries destrutivas (DELETE, DROP, UPDATE, INSERT) mesmo que o LLM as gere por engano ou por tentativa de injeção de prompt. Funciona como uma camada de segurança independente da validação sintática em Python.
- **Implicações:** O agente não pode executar queries que criem tabelas temporárias ou views. O backend deve garantir que o arquivo `.db` tenha permissões de leitura.

---

### DA-06: Tratamento de Erros do LLM com Exceções de Domínio

- **Contexto:** A API Gemini pode falhar por diversos motivos (autenticação, quota, timeout, erro interno).
- **Decisão:** Criar uma hierarquia de exceções customizadas (`LLMError` e subclasses) em `exceptions.py`, mapeando erros técnicos do Google API Core para exceções de domínio com mensagens amigáveis em português.
- **Justificativa:** O backend FastAPI precisa retornar HTTP status codes distintos para cada tipo de falha (401 para autenticação, 429 para quota, 503 para indisponibilidade). Usar exceções de domínio desacopla o backend da biblioteca do Google, evitando que o time de backend precise importar dependências do provedor de LLM apenas para tratar erros.
- **Implicações:** Novos erros do provedor exigem atualização do mapeamento em `exceptions.py`. O contrato de erro é controlado pelo módulo `ai-agent`.

---

### DA-07: Retry com Backoff Exponencial

- **Contexto:** Chamadas à API externa são suscetíveis a instabilidades temporárias.
- **Decisão:** O `LLMAgent` (`llm_client.py`) realiza até 3 tentativas automáticas, com espera crescente de 1s, 2s e 4s, apenas para erros transientes (503, 500, 502, timeout).
- **Justificativa:** Retry com backoff exponencial reduz a taxa de falhas visíveis ao usuário sem sobrecarregar a API em momentos de instabilidade. Aplicar apenas em erros transientes evita reenvio desnecessário em falhas permanentes (autenticação, quota excedida ou requisição inválida).
- **Implicações:** O tempo de resposta pode aumentar em até 7 segundos adicionais em cenários de instabilidade. Erros de autenticação e quota não são repetidos, evitando consumo desnecessário de tokens.

---

### DA-08: Temperatura Diferenciada por Chamada

- **Contexto:** SQL exige precisão, mas insights beneficiam-se de uma resposta mais natural.
- **Decisão:** Temperatura `0.0` na Chamada 1 (SQL — determinístico) e `0.3` na Chamada 2 (insight — criativo mas controlado).
- **Justificativa:** SQL é uma linguagem formal: variações criativas na sintaxe aumentam o risco de erros de execução. Temperatura zero maximiza a reprodutibilidade e correção da query. Já o insight é texto em português, onde uma temperatura moderada (0.3) produz respostas mais naturais e contextualizadas sem inventar dados.
- **Implicações:** A Chamada 1 tende a gerar SQLs parecidos para perguntas similares. A Chamada 2 pode produzir variações de redação para o mesmo conjunto de dados.

---

### DA-09: Prompts em Arquivos Externos (.txt)

- **Contexto:** Os system prompts são extensos e precisam ser iterados sem alterar código Python.
- **Decisão:** Manter `sql_system.txt` e `insight_system.txt` em `src/prompts/`, carregados em runtime com substituição de placeholders (`{schema}`, `{question}`, `{data}`, `{sql}`).
- **Justificativa:** Prompts em arquivos externos permitem ajustes de engenharia de prompt (few-shot examples, regras de formatação) sem reimplantação de código. Isso acelera iterações com o time de dados e facilita testes A/B de diferentes versões de prompt.
- **Implicações:** O módulo depende da presença dos arquivos `.txt` no filesystem em tempo de execução. Alterações nos prompts não exigem novo build do pacote Python.

---

### DA-10: Truncamento de Dados para Preservar Context Window

- **Contexto:** O prompt da Chamada 2 inclui os dados brutos retornados pelo banco, que podem ser grandes.
- **Decisão:** Limitar em 100 linhas (`_MAX_ROWS_FOR_INSIGHT_PROMPT`) os dados enviados ao LLM na Chamada 2, enquanto o `AgentResponse` ainda retorna o dataset completo ao frontend.
- **Justificativa:** O context window do modelo é um recurso finito e caro. Enviar milhares de linhas ao prompt aumenta o tempo de resposta, o custo em tokens e o risco de truncamento da resposta pelo provedor. O truncamento preserva a capacidade do LLM de gerar o insight, enquanto o frontend continua recebendo todos os dados para renderização.
- **Implicações:** O insight textual é baseado em uma amostra das primeiras 100 linhas. Para datasets muito grandes, o resumo pode não refletir padrões presentes apenas no final do resultado (ex: ordenação DESC).

---

### DA-11: Cache Lazy do Schema

- **Contexto:** O schema do banco não muda com frequência, mas extraí-lo a cada pergunta é custoso.
- **Decisão:** `VCommerceAgent` mantém o schema formatado em memória (`self._schema_text`) e só o recarrega quando `invalidate_schema()` é chamado.
- **Justificativa:** A extração do schema envolve múltiplas queries PRAGMA no SQLite e a montagem de um texto longo. Como o schema muda apenas quando o time de dados publica uma nova versão do banco, cache em memória reduz a latência de todas as perguntas subsequentes em até 50-100ms.
- **Implicações:** O backend deve chamar `invalidate_schema()` após atualizações do banco. Em cenários de múltiplas instâncias do agente, cada instância mantém seu próprio cache.

---

### DA-12: Validação Sintática de SQL no Código (Pré-Execução)

- **Contexto:** O LLM pode gerar SQL inesperado ou malicioso.
- **Decisão:** `_validate_syntax()` em `sql_generator.py` garante que a query comece apenas com `SELECT` ou `WITH`, rejeitando DDL/DML antes da execução.
- **Justificativa:** A validação sintática em Python serve como primeira linha de defesa contra injeção de prompt e alucinações do modelo. É mais rápida e barata do que depender apenas do SQLite read-only, pois evita o custo de uma chamada ao banco para descobrir que a query é inválida.
- **Implicações:** Queries com CTEs complexos ou subqueries entre parênteses são aceitas desde que o statement principal seja SELECT. A validação não analisa a semântica da query (ex: tabelas inexistentes), apenas o tipo de comando.

---

### DA-04: Formatos de Saída Distintos por Chamada (Markdown para SQL, JSON para Insight)

- **Contexto:** O agente realiza duas chamadas sequenciais ao LLM. A primeira gera código SQL; a segunda gera uma resposta estruturada com insight textual, dados tabulares e metadados de gráfico. Foi necessário definir o formato de saída ideal para cada uma.

- **Decisão:**
  - **Chamada 1 (SQL):** O LLM retorna a query dentro de um bloco markdown `` ```sql ... ``` ``.
  - **Chamada 2 (Insight):** O LLM retorna um objeto JSON válido com campos `text`, `data` e `chart`.

- **Justificativa:**
  - SQL é código multi-linha com aspas simples; forçá-lo dentro de um campo JSON exigiria escaping complexo e aumentaria a taxa de alucinação do LLM. Blocos markdown (` ```sql `) são o padrão nativo do treinamento de LLMs, garantindo maior aderência e extração trivial via regex.
  - O insight possui múltiplos campos tipados (`text`, `data`, `chart`); JSON é o formato estruturado ideal para contratos backend/frontend, permitindo parse direto e validação programática.
  - Separar os formatos otimiza a confiabilidade de cada pipeline: a Chamada 1 produz um artefato técnico para o `db.py`; a Chamada 2 produz um contrato de API para o backend/frontend.

- **Implicações:**
  - O parser do SQL deve ser resiliente a blocos markdown mal fechados pelo LLM.
  - O parser do insight deve tolerar markdown inadvertido (ex: `` ```json ``) antes de tentar extrair o JSON puro.
  - O prompt do insight deve evitar contradições (instruir "sem markdown" mas exemplificar com `` ```json `` pode induzir o modelo ao erro).

---

### DA-13: Schema Extraído em Runtime, Não Versionado

- **Contexto:** O allowlist de tabelas e colunas e a validação semântica exigem validar se identificadores no SQL existem no schema real. O documento de planejamento sugeria um arquivo intermediário versionado, mas isso introduz risco de divergência com o banco.
- **Decisão:** Não versionar arquivo intermediário. O schema é extraído do SQLite via `PRAGMA table_info()` em runtime, cacheado em memória, e usado diretamente pelos guardrails.
- **Justificativa:** Versionar um schema intermediário cria um ponto de falha adicional: se o banco evolui e o arquivo não é atualizado, os guardrails passam a rejeitar queries válidas ou aceitar queries contra tabelas removidas. Extrair o schema diretamente do SQLite em runtime garante que o allowlist de tabelas e colunas e a validação semântica sempre validem contra o estado atual do banco, eliminando divergência. O cache em memória, invalidado via `invalidate_schema()`, mantém performance sem sacrificar consistência.
- **Implicações:** O schema usado pelos guardrails sempre reflete o estado atual do banco. O cache em memória é invalidado junto com o schema do agente via `invalidate_schema()`.

---

### DA-15: Allowlist Configurável com Exclusão de Tabelas Sensíveis

- **Contexto:** O banco pode conter tabelas sensíveis (ex.: dados de usuários do sistema, auditoria, logs internos) que não devem ser expostas ao agente nem consultadas pelos analistas de negócio.
- **Decisão:** A função `build_allowlist()` aceita um parâmetro opcional `excluded_tables: set[str]` que omite tabelas específicas do allowlist. Tabelas excluídas não aparecem no prompt do LLM e são rejeitadas pelos guardrails caso o LLM as alucine.
- **Justificativa:** O allowlist alimenta tanto o schema enviado ao prompt do LLM quanto as validações dos guardrails. Se uma tabela sensível for omitida do allowlist, ela desaparece do contexto do modelo, eliminando por construção a possibilidade de alucinação. Essa abordagem é mais robusta do que filtrar apenas no momento da execução, pois impede a geração de SQL inválido antes mesmo da primeira chamada ao LLM.
- **Implicações:** O backend pode configurar `excluded_tables` via variável de ambiente ou configuração. Tabelas excluídas ficam invisíveis para o LLM e bloqueadas pelos guardrails, protegendo dados sensíveis sem alterar o banco.
