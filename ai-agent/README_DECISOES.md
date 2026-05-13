# Decisões Arquiteturais — V-Commerce CRM 360: Agente de IA

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

- **Contexto:** O agente precisa de um modelo LLM capaz de gerar SQL válido e insights em português brasileiro.
- **Decisão:** Utilizar o modelo `gemini-2.5-flash` como padrão, via PydanticAI.
- **Justificativa:** O Gemini 2.5 Flash oferece melhor capacidade de reasoning para joins e agregações SQL, reduzindo a taxa de erros na Chamada 1. Além disso, para o volume de uso esperado neste projeto, o limite de tokens diários (250.000 tokens/minuto) não será alcançado antes do limite de requisições diárias (20 req/dia), permitindo o uso do modelo mais potente sem restrições práticas.
- **Implicações:** O módulo depende da disponibilidade e dos termos de uso da API Google Gemini. A troca para outro provedor exigiria adaptação no `llm_client.py`.

---

### DA-03: Guardrails em Três Camadas

- **Contexto:** O agente executa SQL gerado por um LLM e recebe entrada direta do usuário, o que expõe o sistema a riscos de injeção de prompt e queries destrutivas.
- **Decisão:** Organizar os guardrails em três camadas sequenciais:
  - **Camada 1 (pré-LLM):** validação do input do usuário — rejeita string vazia, limita tamanho da pergunta.
  - **Camada 2 (pós-LLM):** validação do SQL gerado — remove comentários, bloqueia queries destrutivas, detecta múltiplos statements, valida allowlist de tabelas/colunas contra o schema real e verifica semântica das colunas referenciadas.
  - **Camada 3 (execução):** conexão SQLite read-only (`?mode=ro`), timeout de execução e truncamento de resultados.
- **Justificativa:** A divisão em camadas permite que cada etapa do pipeline tenha validações específicas. A Camada 1 elimina inputs degenerados antes de consumir tokens do LLM. A Camada 2 garante que apenas queries SELECT válidas e contra tabelas existentes sejam executadas. A Camada 3 é uma proteção de último recurso ao nível do driver do banco, independente de toda a lógica Python.
- **Implicações:** Queries inválidas são bloqueadas o mais cedo possível, economizando chamadas ao LLM e protegendo o banco. A ordem das camadas é rígida: Camada 1 → Camada 2 → execução → Camada 3.

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

### DA-13: Formatos de Saída Distintos por Chamada (Markdown para SQL, JSON para Insight)

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

### DA-14: Schema Extraído em Runtime, Não Versionado

- **Contexto:** O allowlist de tabelas e colunas e a validação semântica exigem validar se identificadores no SQL existem no schema real do banco. Uma alternativa seria manter um arquivo intermediário (ex.: YAML ou JSON) versionado junto ao código, contendo a lista de tabelas e colunas permitidas.
- **Decisão:** Não manter arquivo intermediário versionado. O schema é extraído do SQLite via `PRAGMA table_info()` em runtime, cacheado em memória, e usado diretamente pelos guardrails.
- **Justificativa:** Um arquivo intermediário versionado cria um ponto de falha adicional: se o banco evolui e o arquivo não é atualizado, os guardrails passam a rejeitar queries válidas ou aceitar queries contra tabelas removidas. Extrair o schema diretamente do SQLite em runtime garante que o allowlist de tabelas e colunas e a validação semântica sempre validem contra o estado atual do banco, eliminando divergência. O cache em memória, invalidado via `invalidate_schema()`, mantém performance sem sacrificar consistência.
- **Implicações:** O schema usado pelos guardrails sempre reflete o estado atual do banco. O cache em memória é invalidado junto com o schema do agente via `invalidate_schema()`.

---

### DA-15: Allowlist Configurável com Exclusão de Tabelas Sensíveis

- **Contexto:** O banco pode conter tabelas sensíveis (ex.: dados de usuários do sistema, auditoria, logs internos) que não devem ser expostas ao agente nem consultadas pelos analistas de negócio. O allowlist de tabelas e colunas alimenta tanto o schema enviado ao prompt do LLM quanto as validações dos guardrails da Camada 2. Se uma tabela sensível aparecer no prompt, o LLM pode gerar SQL consultando-a — mesmo que o allowlist técnico a bloqueie depois.
- **Decisão:** `excluded_tables` é um parâmetro do construtor `VCommerceAgent.__init__(db_path, excluded_tables=None)`. O backend passa o conjunto de tabelas sensíveis ao instanciar o agente. Esse conjunto é aplicado em dois pontos: (1) `format_schema()` omite as tabelas do texto enviado ao prompt do LLM, e (2) `build_allowlist()` omite as mesmas tabelas do allowlist usado pelos guardrails G9 e G10. O filtro é aplicado em runtime e reflete o estado atual do banco.
- **Justificativa:** O backend conhece o schema completo do sistema e controla quais tabelas são sensíveis. O módulo ai-agent não deve precisar saber quais tabelas são sensíveis — ele apenas aplica o filtro recebido via parâmetro de construtor. Isso desacopla a política de segurança (backend) da implementação técnica (ai-agent). Filtrar apenas no allowlist dos guardrails (Camada 2) não é suficiente: o LLM ainda vê a tabela no schema e pode alucinar queries válidas sintaticamente mas inválidas semanticamente (ex.: JOIN com tabela sensível usando colunas que não existem). Remover a tabela do prompt elimina a alucinação por construção.
- **Implicações:** O backend controla a lista de tabelas sensíveis e as passa ao instanciar `VCommerceAgent`. Tabelas excluídas ficam invisíveis para o LLM e bloqueadas pelos guardrails. O cache do schema (`invalidate_schema()`) invalida o allowlist junto, garantindo consistência após mudanças.

---

### DA-16: Loop de Autocorreção via LLM para Falhas da Camada 2

- **Contexto:** O LLM ocasionalmente alucina tabelas ou colunas inexistentes. Quando os guardrails da Camada 2 rejeitam o SQL gerado, a alternativa seria devolver imediatamente uma mensagem de erro genérica ao usuário, encerrando o fluxo.
- **Decisão:** Em vez de rejeitar imediatamente, o agente tenta corrigir o SQL automaticamente usando o próprio LLM. O pipeline captura o `GuardrailError`, monta um prompt de correção contendo o SQL problemático, a descrição técnica do erro e o schema disponível, e reinvoca o LLM. O processo se repete até 3 tentativas com backoff exponencial (1s, 2s, 4s). Se esgotar, retorna mensagem genérica ao usuário.
- **Justificativa:** Erros de geração SQL são invisíveis ao usuário final: ele apenas percebe que a pergunta não foi respondida. Subir um erro genérico imediato gera frustração e interrompe o fluxo de uso. Ao usar o próprio LLM para corrigir o SQL, o agente tenta recuperar automaticamente de alucinações de schema (tabelas ou colunas inexistentes) — o tipo mais comum de falha da Camada 2 — sem exigir que o usuário reformule a pergunta. Isso melhora a percepção de confiabilidade do sistema e reduz o atrito na experiência do chat.
- **Implicações:** Latência adicional de até 3 chamadas ao LLM em caso de falha (até ~7s de backoff). O trade-off é taxa de sucesso maior sem intervenção manual. O loop de autocorreção aplica-se apenas à Camada 2 (pós-LLM); falhas da Camada 1 (input do usuário) e Camada 3 (execução no banco) não disparam retry, pois não são recuperáveis via regeneração de SQL.

---

### DA-17: Parâmetros de Infraestrutura como Argumentos de Construtor

- **Contexto:** O módulo ai-agent é consumido pelo backend FastAPI como uma biblioteca. Configurações como limite de linhas (`max_rows`), timeout de queries (`query_timeout_seconds`) e modelo LLM (`llm_model`) precisam variar conforme o contexto de uso: uma tela de preview pode exigir apenas 50 linhas, enquanto uma exportação pode precisar de 1000; usuários comuns podem usar um modelo mais rápido, enquanto analistas podem usar um modelo mais poderoso.
- **Decisão:** `max_rows`, `query_timeout_seconds` e `llm_model` são parâmetros opcionais do construtor `VCommerceAgent`, com valores padrão hardcoded (`1000`, `10`, `gemini-2.5-flash`). Não existem variáveis de ambiente correspondentes.
- **Justificativa:** Configurações globais (variáveis de ambiente ou constantes de módulo) impedem que o backend crie múltiplas instâncias do agente com behaviors distintos no mesmo processo. Parâmetros de construtor permitem que o backend defina a policy por instância: `agent_preview = VCommerceAgent(db_path, max_rows=50)` vs. `agent_export = VCommerceAgent(db_path, max_rows=1000)`. Defaults hardcoded garantem que o agente funcione corretamente mesmo quando o backend não passar nenhum valor, sem exigir configuração obrigatória.
- **Implicações:** O backend FastAPI controla esses parâmetros ao instanciar `VCommerceAgent`. O módulo ai-agent não precisa de arquivo `.env` para essas configurações. Testes podem criar instâncias com valores baixos sem alterar o ambiente do sistema.

---

### DA-18: Histórico de Conversa Inclui SQL Gerado

- **Contexto:** A memória de conversa (US-IA-05) exige que o agente entenda perguntas de follow-up como "E no mês passado?" ou "Filtre por eletrônicos". Para que a Chamada 1 (geração de SQL) resolva essas referências corretamente, ela precisa saber não apenas o que o usuário perguntou antes, mas também qual SQL foi gerado e executado.
- **Decisão:** O campo `content` do role `assistant` no histórico passado a `ask()` inclui o SQL gerado (`sql`) além do insight textual (`text`). O formato do histórico é `[{"role": "user"|"assistant", "content": str, "sql": str | None}]`.
- **Justificativa:** Sem o agente entender o histórico completo (incluindo o SQL), não faz sentido implementar a memória. O SQL é o artefato técnico que conecta a pergunta anterior ao resultado concreto. Se o usuário pergunta "Qual a receita do mês?" e depois "E do mês passado?", a Chamada 1 precisa ver o SQL anterior (`SELECT SUM(...) WHERE mes = ...`) para saber exatamente qual filtro temporal alterar. Apenas o insight textual ("A receita foi R$ 125.340") não contém informação suficiente para gerar o SQL de follow-up com precisão.
- **Implicações:** O backend precisa armazenar o campo `sql` do `AgentResponse` junto ao histórico da sessão. O volume de dados por interação no histórico aumenta, mas o impacto é desprezível frente ao custo de falhas na resolução de follow-ups.

---

### DA-19: Limite Padrão de 20 Turnos no Histórico

- **Contexto:** O histórico de conversa é injetado nos prompts da Chamada 1 e Chamada 2, consumindo tokens do context window do modelo. É necessário definir um limite para evitar estouro.
- **Decisão:** O limite padrão de turnos no histórico é de 20 (20 pares pergunta/resposta, totalizando até 40 mensagens). O valor é configurável via `config.py`.
- **Justificativa:** O projeto utiliza o free tier da API Gemini, onde o fator limitante é o número de requisições diárias (não tokens por requisição). Como o Gemini 2.5 Flash possui um context window grande, o custo de enviar um histórico mais longo não impacta a quota diária. Um limite de 20 turnos permite conversas longas sem risco de atingir limites de contexto, maximizando a utilidade da memória.
- **Implicações:** Conversas com mais de 20 turnos terão as interações mais antigas descartadas. O valor pode ser ajustado via constante configurável sem alteração de código.

---

### DA-20: Constante de Configuração `MAX_HISTORY_TURNS`

- **Contexto:** O limite de turnos no histórico precisa ser parametrizado e acessível centralmente.
- **Decisão:** A constante é nomeada `MAX_HISTORY_TURNS` e reside em `config.py`, com valor padrão `20`.
- **Justificativa:** *Pendente — justificativa não fornecida pelo desenvolvedor.*
- **Implicações:** Todos os módulos que processam histórico (`agent.py`, `sql_generator.py`, `insight_generator.py`) importam o limite de `config.py`. O backend pode eventualmente sobrescrever via parâmetro de construtor, seguindo o padrão de DA-17.

---

### DA-21: Injeção Bidirecional do Histórico nos Prompts

- **Contexto:** O agente realiza duas chamadas ao LLM com propósitos distintos (Chamada 1: gerar SQL; Chamada 2: gerar insight). Cada chamada precisa de contexto conversacional diferente para resolver follow-ups corretamente.
- **Decisão:** O histórico de conversa é injetado como texto estruturado nos prompts de **ambas** as chamadas:
  - **Chamada 1 (SQL):** recebe perguntas anteriores + SQLs gerados, permitindo resolver referências como "E no mês passado?" (sabe qual filtro temporal alterar).
  - **Chamada 2 (Insight):** recebe perguntas anteriores + insights textuais, mantendo coerência narrativa entre respostas.
- **Justificativa:** *Pendente — justificativa não fornecida pelo desenvolvedor.*
- **Implicações:** O volume de tokens por chamada aumenta proporcionalmente ao tamanho do histórico. A injeção é feita via blocos de texto nos prompts (não via `message_history` nativo do PydanticAI), pois as duas chamadas usam agentes distintos com system prompts diferentes — misturar respostas SQL com respostas de insight no histórico nativo quebraria o contexto de cada chamada.

---

### DA-22: Gerenciamento Stateful do Histórico pelo ai-agent

- **Contexto:** A memória de conversa pode ser gerenciada pelo backend (passando `history` como parâmetro a cada chamada) ou pelo próprio módulo ai-agent (mantendo estado interno). O backend é desenvolvido por outro time e possui suas próprias responsabilidades.
- **Decisão:** O `VCommerceAgent` gerencia o histórico internamente em `self._history`. O método `ask(question)` armazena automaticamente cada par pergunta/resposta após uma interação bem-sucedida. O agente é responsável por truncar o histórico ao limite de `MAX_HISTORY_TURNS` e por formatar a injeção nos prompts. O método `clear_history()` permite reset explícito.
- **Justificativa:** Gerenciar contexto de conversa é responsabilidade natural do agente — ele já mantém estado interno (cache de schema). Centralizar a lógica de memória no ai-agent simplifica a integração para o backend (que só precisa chamar `ask()`) e garante que o formato do histórico injetado nos prompts seja controlado pelo módulo que sabe como usá-lo. O backend não precisa conhecer detalhes internos como a inclusão de SQL ou a estratégia de truncamento.
- **Implicações:** O backend precisa criar uma instância de `VCommerceAgent` por sessão de chat (não pode compartilhar entre usuários). O histórico é mantido em memória e perdido se a instância for destruída, a menos que o backend utilize a API de export/import (DA-23).

---

### DA-23: API de Export/Import para Persistência Opcional pelo Backend

- **Contexto:** O gerenciamento stateful pelo ai-agent (DA-22) resolve o caso de uso padrão, mas o histórico é perdido se o servidor reiniciar ou a instância for destruída. O backend pode desejar persistir sessões de chat em banco de dados ou cache distribuído.
- **Decisão:** O `VCommerceAgent` expõe dois métodos adicionais:
  - `export_history() -> list[dict]` — retorna o histórico atual em formato serializável (JSON-compatível).
  - `import_history(history: list[dict]) -> None` — restaura o histórico a partir de um snapshot previamente exportado.
  O agente gerencia tudo internamente por padrão; o backend só usa export/import se quiser persistência entre restarts.
- **Justificativa:** Manter a abordagem de gerenciamento interno (DA-22) como padrão simplifica o uso comum. Expor export/import permite que o backend adicione persistência sem alterar o módulo ai-agent, respeitando o princípio de que funcionalidades opcionais não devem complicar o fluxo principal. O formato serializável (`list[dict]`) é agnóstico de tecnologia de armazenamento — o backend pode usar Redis, PostgreSQL, filesystem ou qualquer outro mecanismo.
- **Implicações:** O contrato de `export_history`/`import_history` torna-se parte da interface pública do agente. Alterações no formato interno do histórico exigem migração ou versionamento do snapshot. O `import_history` valida o formato recebido e aplica o truncamento de `MAX_HISTORY_TURNS` automaticamente.

---

### DA-24: Prompt de Correção SQL Também Recebe Histórico de Conversa

- **Contexto:** O loop de autocorreção (DA-16) reinvoca o LLM com um prompt de correção quando os guardrails da Camada 2 rejeitam o SQL gerado. Em cenários de follow-up com memória de conversa (DA-21), o SQL original foi gerado com contexto conversacional. Se o prompt de correção não receber esse mesmo contexto, o LLM perde as referências necessárias para gerar uma correção válida.
- **Decisão:** O template `sql_correction_system.txt` recebe o placeholder `{history}`, e a função `generate_sql_correction()` aceita o parâmetro `history`, propagando o mesmo histórico usado na geração original do SQL.
- **Justificativa:** Sem o contexto conversacional, o prompt de correção trataria a pergunta de follow-up (ex: "E no mês passado?") como uma pergunta isolada, gerando SQL sem relação com a interação anterior. Isso anularia o benefício da memória de conversa exatamente no cenário em que ela é mais necessária — quando o LLM alucina tabelas ou colunas ao tentar resolver referências contextuais.
- **Implicações:** O custo em tokens do prompt de correção aumenta proporcionalmente ao tamanho do histórico, mas o impacto é marginal dado que correções são raras (menos de 10% das chamadas) e o histórico já é truncado a 20 turnos (DA-19).
### DA-25: Reorganiza��o da Estrutura de Diret�rios por Dom�nio
- **Contexto:** A estrutura original agrupava todos os arquivos no diret�rio src/ raiz e 	ests/ raiz, misturando componentes de diferentes naturezas (LLM, banco de dados, seguran�a) e tipos de teste (unit�rios r�pidos e smoke tests lentos de integra��o).
- **Decis�o:** Refatorar a arquitetura de pastas agrupando os arquivos por dom�nio de responsabilidade: src/core, src/database, src/llm, src/security e separando os testes em 	ests/unit/ e 	ests/integration/. O gent.py atua como facade na raiz do src/.
- **Justificativa:** *Pendente � justificativa n�o fornecida pelo desenvolvedor.*
- **Implica��es:** Todos os imports internos do projeto foram remapeados. As automa��es de CI/CD podem agora isolar a execu��o da pasta 	ests/unit/ sem consumir a cota de tokens da API do Gemini e separar testes de integra��o na pipeline de homologa��o.
