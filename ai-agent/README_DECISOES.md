# Decisões Arquiteturais: V-Commerce CRM 360, Agente de IA

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

- **Justificativa:** Das opções avaliadas, o Gemini 2.5 Flash oferece a melhor capacidade de *reasoning* para *joins* e agregações SQL, bem como maior precisão na análise de problemas e dados complexos, reduzindo substancialmente a taxa de erros em ambas as chamadas. Para cenários onde a redução de custos de API fosse a prioridade absoluta, o Gemini 2.5 Flash Lite poderia ser considerado como uma alternativa viável.

- **Implicações:** O módulo depende da disponibilidade e dos termos de uso da API Google Gemini. A troca para outro provedor exigiria adaptação no `llm_client.py`.

---

### DA-03: Guardrails em Três Camadas

- **Contexto:** O agente executa SQL gerado por um LLM e recebe entrada direta do usuário, o que expõe o sistema a riscos de injeção de prompt e queries destrutivas.

- **Decisão:** Organizar os guardrails em três camadas sequenciais:

  - **Camada 1 (pré-LLM):** validação do input do usuário. Rejeita string vazia e limita tamanho da pergunta.

  - **Camada 2 (pós-LLM):** validação do SQL gerado. Remove comentários, bloqueia queries destrutivas, detecta múltiplos statements, valida allowlist de tabelas/colunas contra o schema real e verifica semântica das colunas referenciadas.

  - **Camada 3 (execução):** conexão SQLite read-only (`?mode=ro`), timeout de execução e truncamento de resultados.

- **Justificativa:** A divisão em camadas permite que cada etapa do pipeline tenha validações específicas. A Camada 1 elimina inputs degenerados antes de consumir tokens do LLM. A Camada 2 garante que apenas queries SELECT válidas e contra tabelas existentes sejam executadas. A Camada 3 é uma proteção de último recurso ao nível do driver do banco, independente de toda a lógica Python.

- **Implicações:** Queries inválidas são bloqueadas o mais cedo possível, economizando chamadas ao LLM e protegendo o banco. A ordem das camadas é rígida: Camada 1 → Camada 2 → execução → Camada 3.

---

### DA-04: Separação de Schema Técnico e Metadados de Negócio

- **Contexto:** O LLM precisa entender tanto a estrutura física do banco quanto o significado de negócio das colunas.

- **Decisão:** Manter o schema técnico extraído dinamicamente do SQLite (`PRAGMA table_info`, `PRAGMA foreign_key_list`) em `db.py`, e os metadados descritivos (descrições de tabelas/colunas e exemplos de valores) em um arquivo JSON estático (`schema_descriptions.json`). A combinação ocorre em `schema.py`.

- **Justificativa:** O schema técnico muda sempre que o time de engenharia de dados altera o banco, portanto precisa ser dinâmico. Já os metadados de negócio são conhecimento de domínio mantido pelo time de dados/análise e não mudam automaticamente. Mantê-los em JSON estático evita dependência de comentários no banco e permite versionamento separado.

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

### DA-08: Prompts em Arquivos Externos (.txt)

- **Contexto:** Os system prompts são extensos e precisam ser iterados sem alterar código Python.

- **Decisão:** Manter `sql_system.txt` e `insight_system.txt` em `src/vcommerce_ai_agent/llm/prompts/`, carregados em runtime com substituição de placeholders (`{schema}`, `{question}`, `{data}`, `{sql}`).

- **Justificativa:** Prompts em arquivos externos permitem ajustes de engenharia de prompt (few-shot examples, regras de formatação) sem reimplantação de código. Isso acelera iterações com o time de dados e facilita testes A/B de diferentes versões de prompt.

- **Implicações:** O módulo depende da presença dos arquivos `.txt` no filesystem em tempo de execução. Alterações nos prompts não exigem novo build do pacote Python.

---

### DA-09: Truncamento de Dados para Preservar Context Window

- **Contexto:** O prompt da Chamada 2 inclui os dados brutos retornados pelo banco, que podem ser grandes.

- **Decisão:** Limitar em 100 linhas (`_MAX_ROWS_FOR_INSIGHT_PROMPT`) os dados enviados ao LLM na Chamada 2, enquanto o `AgentResponse` ainda retorna o dataset completo ao frontend.

- **Justificativa:** O context window do modelo é um recurso finito e caro. Enviar milhares de linhas ao prompt aumenta o tempo de resposta, o custo em tokens e o risco de truncamento da resposta pelo provedor. O truncamento preserva a capacidade do LLM de gerar o insight, enquanto o frontend continua recebendo todos os dados para renderização.

- **Implicações:** O insight textual é baseado em uma amostra das primeiras 100 linhas. Para datasets muito grandes, o resumo pode não refletir padrões presentes apenas no final do resultado (ex: ordenação DESC).

---

### DA-10: Cache Lazy do Schema

- **Contexto:** O schema do banco não muda com frequência, mas extraí-lo a cada pergunta é custoso.

- **Decisão:** `VCommerceAgent` mantém o schema formatado em memória (`self._schema_text`) e só o recarrega quando `invalidate_schema()` é chamado.

- **Justificativa:** A extração do schema envolve múltiplas queries PRAGMA no SQLite e a montagem de um texto longo. Como o schema muda apenas quando o time de dados publica uma nova versão do banco, cache em memória reduz a latência de todas as perguntas subsequentes em até 50-100ms.

- **Implicações:** O backend deve chamar `invalidate_schema()` após atualizações do banco. Em cenários de múltiplas instâncias do agente, cada instância mantém seu próprio cache.

---

### DA-11: Formatos de Saída Distintos por Chamada (Markdown para SQL, JSON para Insight)

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

### DA-12: Schema Extraído em Runtime, Não Versionado

- **Contexto:** O allowlist de tabelas e colunas e a validação semântica exigem validar se identificadores no SQL existem no schema real do banco. Uma alternativa seria manter um arquivo intermediário (ex.: YAML ou JSON) versionado junto ao código, contendo a lista de tabelas e colunas permitidas.

- **Decisão:** Não manter arquivo intermediário versionado. O schema é extraído do SQLite via `PRAGMA table_info()` em runtime, cacheado em memória, e usado diretamente pelos guardrails.

- **Justificativa:** Um arquivo intermediário versionado cria um ponto de falha adicional: se o banco evolui e o arquivo não é atualizado, os guardrails passam a rejeitar queries válidas ou aceitar queries contra tabelas removidas. Extrair o schema diretamente do SQLite em runtime garante que o allowlist de tabelas e colunas e a validação semântica sempre validem contra o estado atual do banco, eliminando divergência. O cache em memória, invalidado via `invalidate_schema()`, mantém performance sem sacrificar consistência.

- **Implicações:** O schema usado pelos guardrails sempre reflete o estado atual do banco. O cache em memória é invalidado junto com o schema do agente via `invalidate_schema()`.

---

### DA-13: Allowlist Configurável com Exclusão de Tabelas Sensíveis

- **Contexto:** O banco pode conter tabelas sensíveis (ex.: dados de usuários do sistema, auditoria, logs internos) que não devem ser expostas ao agente nem consultadas pelos analistas de negócio. O allowlist de tabelas e colunas alimenta tanto o schema enviado ao prompt do LLM quanto as validações dos guardrails da Camada 2. Se uma tabela sensível aparecer no prompt, o LLM pode gerar SQL consultando-a, mesmo que o allowlist técnico a bloqueie depois.

- **Decisão:** `excluded_tables` é um parâmetro do construtor `VCommerceAgent.__init__(db_path, excluded_tables=None)`. O backend passa o conjunto de tabelas sensíveis ao instanciar o agente. Esse conjunto é aplicado em dois pontos: (1) `format_schema()` omite as tabelas do texto enviado ao prompt do LLM, e (2) `build_allowlist()` omite as mesmas tabelas do allowlist usado pelos guardrails G9 e G10. O filtro é aplicado em runtime e reflete o estado atual do banco.

- **Justificativa:** O backend conhece o schema completo do sistema e controla quais tabelas são sensíveis. O módulo ai-agent não deve precisar saber quais tabelas são sensíveis; ele apenas aplica o filtro recebido via parâmetro de construtor. Isso desacopla a política de segurança (backend) da implementação técnica (ai-agent). Filtrar apenas no allowlist dos guardrails (Camada 2) não é suficiente: o LLM ainda vê a tabela no schema e pode alucinar queries válidas sintaticamente mas inválidas semanticamente (ex.: JOIN com tabela sensível usando colunas que não existem). Remover a tabela do prompt elimina a alucinação por construção.

- **Implicações:** O backend controla a lista de tabelas sensíveis e as passa ao instanciar `VCommerceAgent`. Tabelas excluídas ficam invisíveis para o LLM e bloqueadas pelos guardrails. O cache do schema (`invalidate_schema()`) invalida o allowlist junto, garantindo consistência após mudanças.

---

### DA-14: Loop de Autocorreção via LLM para Falhas da Camada 2

- **Contexto:** O LLM ocasionalmente alucina tabelas ou colunas inexistentes. Quando os guardrails da Camada 2 rejeitam o SQL gerado, a alternativa seria devolver imediatamente uma mensagem de erro genérica ao usuário, encerrando o fluxo.

- **Decisão:** Em vez de rejeitar imediatamente, o agente tenta corrigir o SQL automaticamente usando o próprio LLM. O pipeline captura o `GuardrailError`, monta um prompt de correção contendo o SQL problemático, a descrição técnica do erro e o schema disponível, e reinvoca o LLM. O processo se repete até 3 tentativas com backoff exponencial (1s, 2s, 4s). Se esgotar, retorna mensagem genérica ao usuário.

- **Justificativa:** Erros de geração SQL são invisíveis ao usuário final: ele apenas percebe que a pergunta não foi respondida. Subir um erro genérico imediato gera frustração e interrompe o fluxo de uso. Ao usar o próprio LLM para corrigir o SQL, o agente tenta recuperar automaticamente de alucinações de schema (tabelas ou colunas inexistentes, o tipo mais comum de falha da Camada 2) sem exigir que o usuário reformule a pergunta. Isso melhora a percepção de confiabilidade do sistema e reduz o atrito na experiência do chat.

- **Implicações:** Latência adicional de até 3 chamadas ao LLM em caso de falha (até ~7s de backoff). O trade-off é taxa de sucesso maior sem intervenção manual. O loop de autocorreção aplica-se apenas à Camada 2 (pós-LLM); falhas da Camada 1 (input do usuário) e Camada 3 (execução no banco) não disparam retry, pois não são recuperáveis via regeneração de SQL.

---

### DA-15: Parâmetros de Infraestrutura como Argumentos de Construtor

- **Contexto:** O módulo ai-agent é consumido pelo backend FastAPI como uma biblioteca. Configurações como limite de linhas (`max_rows`), timeout de queries (`query_timeout_seconds`) e modelo LLM (`llm_model`) precisam variar conforme o contexto de uso: uma tela de preview pode exigir apenas 50 linhas, enquanto uma exportação pode precisar de 1000; usuários comuns podem usar um modelo mais rápido, enquanto analistas podem usar um modelo mais poderoso.

- **Decisão:** `max_rows`, `query_timeout_seconds` e `llm_model` são parâmetros opcionais do construtor `VCommerceAgent`, com valores padrão hardcoded (`1000`, `10`, `gemini-2.5-flash`). Não existem variáveis de ambiente correspondentes.

- **Justificativa:** Configurações globais (variáveis de ambiente ou constantes de módulo) impedem que o backend crie múltiplas instâncias do agente com behaviors distintos no mesmo processo. Parâmetros de construtor permitem que o backend defina a policy por instância: `agent_preview = VCommerceAgent(db_path, max_rows=50)` vs. `agent_export = VCommerceAgent(db_path, max_rows=1000)`. Defaults hardcoded garantem que o agente funcione corretamente mesmo quando o backend não passar nenhum valor, sem exigir configuração obrigatória.

- **Implicações:** O backend FastAPI controla esses parâmetros ao instanciar `VCommerceAgent`. O módulo ai-agent não precisa de arquivo `.env` para essas configurações. Testes podem criar instâncias com valores baixos sem alterar o ambiente do sistema.

---

### DA-16: Histórico de Conversa Inclui SQL Gerado

- **Contexto:** A memória de conversa (US-II-05) exige que o agente entenda perguntas de follow-up como "E no mês passado?" ou "Filtre por eletrônicos". Para que a Chamada 1 (geração de SQL) resolva essas referências corretamente, ela precisa saber não apenas o que o usuário perguntou antes, mas também qual SQL foi gerado e executado.

- **Decisão:** O campo `content` do role `assistant` no histórico passado a `ask()` inclui o SQL gerado (`sql`) além do insight textual (`text`). O formato do histórico é `[{"role": "user"|"assistant", "content": str, "sql": str | None}]`.

- **Justificativa:** Sem o agente entender o histórico completo (incluindo o SQL), não faz sentido implementar a memória. O SQL é o artefato técnico que conecta a pergunta anterior ao resultado concreto. Se o usuário pergunta "Qual a receita do mês?" e depois "E do mês passado?", a Chamada 1 precisa ver o SQL anterior (`SELECT SUM(...) WHERE mes = ...`) para saber exatamente qual filtro temporal alterar. Apenas o insight textual ("A receita foi R$ 125.340") não contém informação suficiente para gerar o SQL de follow-up com precisão.

- **Implicações:** O backend precisa armazenar o campo `sql` do `AgentResponse` junto ao histórico da sessão. O volume de dados por interação no histórico aumenta, mas o impacto é desprezível frente ao custo de falhas na resolução de follow-ups.

---

### DA-17: Injeção Bidirecional do Histórico nos Prompts

- **Contexto:** O agente realiza duas chamadas ao LLM com propósitos distintos (Chamada 1: gerar SQL; Chamada 2: gerar insight). Cada chamada precisa de contexto conversacional diferente para resolver follow-ups corretamente.

- **Decisão:** O histórico de conversa é injetado como texto estruturado nos prompts de **ambas** as chamadas:

  - **Chamada 1 (SQL):** recebe perguntas anteriores + SQLs gerados, permitindo resolver referências como "E no mês passado?" (sabe qual filtro temporal alterar).

  - **Chamada 2 (Insight):** recebe perguntas anteriores + insights textuais, mantendo coerência narrativa entre respostas.

- **Justificativa:** Injetar o histórico em ambas as chamadas permite que o agente interprete o contexto conversacional de forma completa, viabilizando follow-ups vagos como "E o ano anterior?" ou "E o vendedor X?". A Chamada 1 precisa das perguntas e SQLs anteriores para resolver referências temporais e filtros implícitos; a Chamada 2 precisa das perguntas e insights anteriores para manter coerência narrativa entre respostas consecutivas. O consumo adicional de tokens gerado pela injeção pode se tornar um problema dependendo da extensão da conversa; contudo, isso é ativamente mitigado pela variável `MAX_HISTORY_TURNS`, que trunca o histórico e limita o contexto, mantendo o consumo de tokens sob controle.
- **Implicações:** O volume de tokens por chamada aumenta proporcionalmente ao tamanho do histórico. A injeção é feita via blocos de texto nos prompts (não via `message_history` nativo do PydanticAI), pois as duas chamadas usam agentes distintos com system prompts diferentes. Misturar respostas SQL com respostas de insight no histórico nativo quebraria o contexto de cada chamada.

---

### DA-18: Gerenciamento Stateful do Histórico pelo ai-agent

- **Contexto:** A memória de conversa pode ser gerenciada pelo backend (passando `history` como parâmetro a cada chamada) ou pelo próprio módulo ai-agent (mantendo estado interno). O backend é desenvolvido por outro time e possui suas próprias responsabilidades.

- **Decisão:** O `VCommerceAgent` gerencia o histórico internamente em `self._history`. O método `ask(question)` armazena automaticamente cada par pergunta/resposta após uma interação bem-sucedida. O agente é responsável por truncar o histórico ao limite de `MAX_HISTORY_TURNS` e por formatar a injeção nos prompts. O método `clear_history()` permite reset explícito.

- **Justificativa:** Gerenciar contexto de conversa é responsabilidade natural do agente, que já mantém estado interno (cache de schema). Centralizar a lógica de memória no ai-agent simplifica a integração para o backend (que só precisa chamar `ask()`) e garante que o formato do histórico injetado nos prompts seja controlado pelo módulo que sabe como usá-lo. O backend não precisa conhecer detalhes internos como a inclusão de SQL ou a estratégia de truncamento.

- **Implicações:** O backend não deve compartilhar uma instância stateful de `VCommerceAgent` entre usuários quando a memória estiver ativa. Para APIs HTTP, a fronteira detalhada em DA-27 recomenda que o backend persista o snapshot exportado pelo agente por `session_id`, restaure esse snapshot em uma instância isolada e aplique lock por sessão para controlar concorrência.

---

### DA-19: API de Export/Import para Persistência Opcional pelo Backend

- **Contexto:** O gerenciamento stateful pelo ai-agent (DA-18) resolve o caso de uso padrão, mas o histórico é perdido se o servidor reiniciar ou a instância for destruída. O backend pode desejar persistir sessões de chat em banco de dados ou cache distribuído.

- **Decisão:** O `VCommerceAgent` expõe dois métodos adicionais:

  - `export_history() -> list[dict]`: retorna o histórico atual em formato serializável (JSON-compatível).

  - `import_history(history: list[dict]) -> None`: restaura o histórico a partir de um snapshot previamente exportado.

  O agente gerencia tudo internamente por padrão; o backend só usa export/import se quiser persistência entre restarts.

- **Justificativa:** Manter a abordagem de gerenciamento interno (DA-18) como padrão simplifica o uso comum. Expor export/import permite que o backend adicione persistência sem alterar o módulo ai-agent, respeitando o princípio de que funcionalidades opcionais não devem complicar o fluxo principal. O formato serializável (`list[dict]`) é agnóstico de tecnologia de armazenamento, permitindo que o backend use Redis, PostgreSQL, filesystem ou qualquer outro mecanismo.

- **Implicações:** O contrato de `export_history`/`import_history` torna-se parte da interface pública do agente. Alterações no formato interno do histórico exigem migração ou versionamento do snapshot. O `import_history` valida o formato recebido e aplica o truncamento de `MAX_HISTORY_TURNS` automaticamente.

---

### DA-20: Estrutura de Diretórios por Domínio e Separação de Testes

- **Contexto:** O módulo gerencia componentes de naturezas muito distintas, incluindo comunicação com LLM, validações de banco de dados e políticas de segurança de dados sensíveis. A suíte de testes também possui necessidades diversas, abrangendo desde validações puramente lógicas até validações fim a fim que acionam a API de IA externa.

- **Decisão:** Estruturar o código-fonte por domínio sob `src/vcommerce_ai_agent/` (`core/`, `database/`, `llm/` e `security/`), expondo apenas o `agent.py` como *facade* público. O conjunto de testes é dividido fisicamente em `tests/unit/`, `tests/integration/` (ambos operando de forma offline com mocks locais da API) e `tests/smoke/` (testes reais que consomem a API de inteligência artificial).

- **Justificativa:** O agrupamento por domínio facilita a leitura e manutenção, além de tornar explícita a fronteira de responsabilidade de cada componente interno. O isolamento físico dos testes garante que todos os testes automatizados sejam sempre executados sem preocupação com limites de API, seja por um dev após uma modificação do código ou uma possível esteira CI/CD de validação. Os testes que dependem de rede e geram custos de API ficam restritos à pasta de *smoke tests*, sendo executados de forma separada sob demanda.

- **Implicações:** A esteira de integração contínua (CI) executa a suíte de testes offline a cada commit sem consumir recursos financeiros da API do provedor LLM e sem risco de falhas por indisponibilidade de rede. A validação do comportamento real do modelo fica isolada em um gatilho separado na esteira de desenvolvimento.

---

### DA-21: Rastreabilidade Backend vs Opacidade Frontend via Error Codes de Guardrail

- **Contexto:** Os guardrails barram consultas indevidas retornando sempre uma mensagem genérica por questões de segurança. Contudo, essa opacidade também escondia a causa real do backend, impedindo auditorias e logs detalhados.

- **Decisão:** Refatorar `GuardrailError` e `AgentResponse` para incorporar um `error_code` interno, mapeando cada função de segurança e erro de banco de dados (Camadas 1, 2 e 3). A mensagem genérica ao usuário final é mantida intacta.

- **Justificativa:** Em um sistema real com múltiplos usuários, é necessário que o backend identifique a violação exata para poder aplicar tratativas punitivas adequadas (ex: aplicar *timeout* ou banimento automático em usuários que tentarem realizar *prompt injection* de forma maliciosa).

- **Implicações:** O backend (consumidor do pacote `ai-agent`) passa a ter a capacidade de monitorar exatamente o motivo das falhas baseadas em segurança e infraestrutura local (ex: `PROMPT_INJECTION`, `EXECUTION_TIMEOUT`). Testes automatizados deverão ser atualizados para validar o `error_code`.

---

### DA-22: Separação de Resposta Analítica e Origem dos Dados

- **Contexto:** O backend precisa consumir separadamente o texto principal da resposta e a explicação sobre a origem dos dados.
- **Decisão:** O `AgentResponse` expõe `answer_text` (resposta analítica principal) e `sources_text` (explicação curta sobre a origem dos dados) como campos distintos dentro de `user_response`. O campo técnico `sql` permanece bruto, formatado e executável, sem sanitização.
- **Justificativa:** O campo `sources_text` é um requisito direto do case do projeto. Ele permite que o analista de dados identifique a origem dos dados retornados pelo agente e realize verificação manual quando necessário. Separar `answer_text` e `sources_text` em campos distintos dá ao frontend autonomia para renderizar cada seção de forma independente (ex.: destaque visual para fontes) e permite que o backend armazene ou audite as fontes separadamente da resposta analítica.
- **Implicações:** O backend pode renderizar ou armazenar resposta e fontes separadamente. Textos humanos continuam usando aliases de negócio e ocultando prefixos físicos de tabelas, enquanto `sql` continua adequado para auditoria técnica.

---

### DA-23: Separação de Payload Público e Debug Técnico

- **Contexto:** O backend precisa distinguir com clareza quais campos podem ser enviados ao frontend e quais campos existem apenas para auditoria, logs e troubleshooting.
- **Decisão:** Adicionar `user_response` e `developer_debug` ao `AgentResponse` como grupos explícitos para consumo do frontend e do backend.
- **Justificativa:** Separar payload público e debug técnico reduz ambiguidade de integração e evita que SQL, erros internos ou metadados técnicos sejam tratados como conteúdo de usuário. O backend sabe exatamente quais campos encaminhar ao frontend (`user_response`) e quais manter apenas em logs e auditoria (`developer_debug`).
- **Implicações:** O backend novo deve preferir `user_response` para o frontend e `developer_debug` para logs. As descrições longas das fontes permanecem internas ao agente, enquanto `sources_text` expõe apenas uma explicação curta e empresarial.

---

### DA-24: Contrato Enxuto Para Integração Inicial

- **Contexto:** O contrato entre backend e agente precisava ser simplificado para facilitar a integração inicial.
- **Decisão:** O `AgentResponse` expõe apenas `status`, `user_response` e `developer_debug`. O payload de erro técnico permanece disponível ao backend em `developer_debug.error`.
- **Justificativa:** Como ainda não há consumidor do contrato, um formato enxuto desde o início permite uma integração mais clara. O backend precisa receber erros estruturados de uso normal do agente para diagnosticar falhas sem expor detalhes técnicos ao frontend.
- **Implicações:** O backend deve tratar `AgentResponse` como envelope de integração e encaminhar apenas `user_response` ao frontend. Logs, auditoria, SQL gerado e erros mapeados devem usar `developer_debug`.

---

### DA-25: Pacote Python Instalável Para Integração com Backend

- **Contexto:** A integração anterior dependia de adicionar manualmente o diretório `ai-agent/` ao `PYTHONPATH`, e o pacote importável se chamava genericamente `src`, o que torna a integração com o backend mais frágil e menos explícita.
- **Decisão:** Transformar o módulo em um pacote Python instalável via `pyproject.toml`, com nome de distribuição `vcommerce-ai-agent` e pacote importável `vcommerce_ai_agent`. A estrutura passa a ser `src/vcommerce_ai_agent/`, e a API pública principal é reexportada em `vcommerce_ai_agent.__init__`.
- **Justificativa:** Como o módulo é desenvolvido separadamente dos demais componentes do monorepo, a evolução para pacote instalável é natural. A importação via `pip install` permite o total desacoplamento do ai-agent em relação ao frontend e ao backend, eliminando dependência de manipulação de `PYTHONPATH` e tornando o contrato de integração explícito pelo nome do pacote (`vcommerce_ai_agent`).
- **Implicações:** O backend deve instalar o agente como dependência local, por exemplo com `pip install -e ../ai-agent`, e importar `VCommerceAgent` via `from vcommerce_ai_agent import VCommerceAgent`. Imports internos, testes e documentação passam a referenciar o pacote nomeado, reduzindo dependência de manipulação manual de path.

---

### DA-26: Descrições de Schema Configuráveis Pelo Backend

- **Contexto:** O arquivo `schema_descriptions.json` contém aliases, descrições e exemplos usados pelo LLM para interpretar o schema técnico extraído do SQLite. Em produção, tabelas e colunas podem mudar, ou novos aliases podem ser necessários sem alteração de código do pacote instalável.
- **Decisão:** Adicionar o parâmetro `schema_descriptions_path` ao `VCommerceAgent`, permitindo que o backend informe um JSON externo de descrições do schema. O arquivo padrão empacotado continua existindo como fallback quando o parâmetro não é informado. O carregamento valida a estrutura do JSON antes de usá-lo.
- **Justificativa:** O backend precisa conseguir atualizar descrições, aliases e exemplos quando tabelas ou colunas mudarem, sem editar arquivos dentro do pacote instalado nem depender de nova versão do módulo para ajustes de metadados de negócio.
- **Implicações:** O backend pode manter o arquivo de descrições como configuração própria e chamar `invalidate_schema()` após alterações em runtime. Se o JSON externo estiver ausente, malformado ou fora da estrutura esperada, o agente retorna erro estruturado na etapa `schema` com código `SCHEMA_LOAD_ERROR`.

---

### DA-27: Fronteira Entre Memória de Conversa e Concorrência

- **Contexto:** O agente mantém memória de conversa internamente para resolver perguntas de follow-up, mas a aplicação backend pode atender múltiplas sessões e múltiplas requisições simultâneas.
- **Decisão:** O `ai-agent` é responsável por manejar a memória de conversa: formato do histórico, validação, truncamento, injeção nos prompts, atualização após respostas bem-sucedidas e exportação/importação do snapshot. O backend é responsável por concorrência e ciclo de vida da sessão: associação por `session_id`, persistência do snapshot, isolamento entre usuários, expiração e lock por sessão.
- **Justificativa:** O módulo é completamente agnóstico ao backend. Assumir responsabilidade por concorrência e gestão de múltiplos usuários acoplaria o ai-agent a detalhes de infraestrutura que variam entre stacks. Se o módulo fosse migrado para outra implementação ou outro backend, toda essa lógica precisaria ser refeita. Definir a fronteira de responsabilidades garante que cada componente tenha papel claro e independente: o agente cuida do domínio conversacional, o backend cuida do ciclo de vida das sessões.
- **Implicações:** O backend deve tratar o histórico exportado pelo agente como dado opaco e não editar manualmente seu conteúdo. Em APIs HTTP, o fluxo recomendado é recuperar o histórico por `session_id`, instanciar/restaurar o agente, chamar `ask()`, persistir `export_history()` e serializar requisições simultâneas da mesma sessão com lock. Uma instância global compartilhada de `VCommerceAgent` não deve ser usada para conversas de múltiplos usuários com memória ativa.

---

### DA-28: Parser SQL Baseado em AST com `sqlglot`

- **Contexto:** Os guardrails precisam validar SQL gerado por LLM além de padrões textuais simples, incluindo CTEs, aliases, subqueries, escopos de colunas e referências correlacionadas.
- **Decisão:** Usar `sqlglot` como parser SQL e AST para validar comandos permitidos, múltiplos escopos, allowlist de tabelas/colunas, pertencimento semântico das colunas e extração de fontes consultadas.
- **Justificativa:** Validar SQL via regex enrijece as verificações e torna as expressões frágeis diante de variações sintáticas como CTEs, subqueries e aliases. O `sqlglot` já oferece pronta a maioria das validações necessárias (parsing, extração de tabelas/colunas, resolução de escopos), resultando em código mais limpo e com melhor desempenho do que uma bateria de expressões regulares manuais.
- **Implicações:** `sqlglot` passa a ser dependência de runtime do pacote. Os guardrails deixam de depender apenas de regex para interpretar SQL e passam a validar a estrutura parseada da query. Mudanças de versão do `sqlglot` podem afetar parsing, semântica de escopos e compatibilidade com dialeto SQLite.

---

### DA-29: Fora de Escopo Sem Classificador LLM Dedicado

- **Contexto:** O agente precisa rejeitar perguntas que não podem ser respondidas com o schema disponível, mas cada chamada adicional ao LLM aumenta latência e consumo de quota.
- **Decisão:** Não criar uma chamada LLM separada para classificação de escopo. A Chamada 1 retorna o marcador `FORA_DO_ESCOPO` quando a pergunta é ambígua ou impossível de responder; o pipeline detecta esse marcador antes dos guardrails de SQL e retorna `status="out_of_scope"`. Pedidos explícitos por tabelas ocultas, internas ou fora do schema são bloqueados antes do LLM por padrões locais.
- **Justificativa:** O principal motivo é dar ao agente de geração de SQL uma saída explícita para perguntas que ele não consegue responder, mitigando fortemente alucinações. Sem essa saída, o modelo seria forçado a inventar SQL para qualquer pergunta recebida. Além disso, eliminar uma chamada LLM dedicada reduz custo e latência, otimizando o uso da API.
- **Implicações:** O controle de escopo fica distribuído entre prompt de SQL, detecção local do marcador e guardrails de schema. O agente economiza uma chamada LLM por pergunta, mas a qualidade da classificação de escopo depende da aderência do modelo ao prompt e da cobertura das validações locais.

---

### DA-30: Fontes Exibíveis Derivadas do SQL Validado

- **Contexto:** O frontend precisa exibir uma explicação curta sobre a origem dos dados sem expor nomes físicos de tabelas, enquanto o backend precisa manter o SQL bruto para auditoria técnica.
- **Decisão:** Derivar `sources_text` no código a partir do SQL validado e executado, usando AST para extrair tabelas reais, aliases de negócio de `schema_descriptions.json` e sanitização de nomes físicos. O texto de fontes gerado pelo LLM é tratado apenas como fallback quando não há fontes extraídas do SQL.
- **Justificativa:** Derivar as fontes diretamente do SQL executado garante 100% de certeza sobre a origem dos dados, independentemente do que o LLM afirme ter consultado. Depender apenas do LLM para descrever as fontes pode causar problemas para os analistas que utilizam a plataforma, já que o modelo pode alucinar tabelas não consultadas ou omitir tabelas que foram. O texto gerado pelo LLM é mantido como fallback, criando redundância: se a extração via AST falhar, o fallback ainda cumpre a função.
- **Implicações:** A origem exibida ao usuário fica ancorada nas tabelas efetivamente consultadas, reduzindo dependência do LLM para metadados de proveniência. O módulo precisa manter a lógica de extração/sanitização sincronizada com o contrato de `schema_descriptions.json` e com a estratégia de ocultação de tabelas sensíveis.

---

### DA-31: Mascaramento Reversível Antes da Chamada 2

- **Contexto:** A Chamada 2 recebe os dados retornados pela query SQL para gerar insights. Quando esses dados contêm colunas sensíveis, enviar os valores reais ao LLM expõe informações da empresa ao provedor do modelo de IA.
- **Decisão:** Mascarar valores sensíveis depois da execução SQL e antes da Chamada 2, usando tokens temporários por requisição (ex.: `Email_1`, `Cliente_1`) e um mapa local de reversão mantido apenas em memória. A Chamada 2 recebe somente dados mascarados. Após o retorno do LLM, o agente substitui os tokens pelos valores reais antes de montar o `AgentResponse`.
- **Justificativa:** O objetivo do mascaramento é proteger os dados sensíveis da empresa exclusivamente na fronteira de comunicação com o provedor do LLM (Gemini), impedindo que essas informações sejam enviadas à API externa. Este mascaramento reversível é restrito ao agente; o processo é revertido antes da resposta final, garantindo que o usuário da plataforma receba os dados reais de forma transparente e não perceba diferença no output.
- **Implicações:** O `schema_descriptions.json` passa a marcar colunas sensíveis que devem ser mascaradas antes da Chamada 2. O mapa `token -> valor real` não pode ser enviado ao LLM, retornado no contrato, serializado no histórico ou registrado em logs. A resposta final pode voltar a conter os valores reais quando a política da plataforma permitir exibição ao usuário autorizado. O contrato atual de comunicação com o backend deve permanecer inalterado; mascaramento e reversão são responsabilidades internas do módulo `ai-agent`.

---

### DA-32: Sugestões Iniciais Dinâmicas Baseadas no Schema

- **Contexto:** O backend precisa expor um botão de perguntas de exemplo no início do chat. Essas perguntas devem ser úteis para o banco disponível, mas não devem depender de histórico conversacional.
- **Decisão:** `initial_suggestions(previous_suggestions=None)` passa a gerar 5 perguntas dinamicamente via LLM, usando o schema formatado, um prompt dedicado e, quando informado, o conjunto de perguntas já exibidas ao usuário. Em caso de falha esperada, o método retorna uma lista local de 5 perguntas balanceadas por domínio, também evitando perguntas anteriores quando houver alternativas disponíveis.
- **Justificativa:** O recurso é acionado no início da conversa e pode ser usado várias vezes pelo botão de perguntas de exemplo. As sugestões devem refletir o banco disponível, não depender do contexto conversacional e evitar repetir perguntas já exibidas ao usuário. O fallback local mantém a experiência estável quando a API do LLM estiver indisponível ou retornar payload inválido.
- **Implicações:** A chamada de sugestões passa a ser assíncrona e pode consumir uma chamada ao LLM. O backend deve usar `await agent.initial_suggestions(previous_suggestions=...)`, repassando as perguntas já renderizadas no chat quando o usuário solicitar novas sugestões, e tratar o retorno como uma lista sempre segura para exibição.

---

### DA-33: Formato Apresentacional do Insight com Seções Estruturadas

- **Contexto:** O contrato original da Chamada 2 previa um JSON simples com `text`, `data` e `chart`, mas essa estrutura plana dificultava a separação entre resposta analítica, origem dos dados e sanitização de nomes físicos. Além disso, a introdução do mascaramento reversível (DA-31) exigia que o código pudesse restaurar tokens sensíveis em múltiplos campos textuais de forma granular.

- **Decisão:** Adotar um formato apresentacional composto por `activity` (frase curta sobre o que foi analisado), `answer_sections` (lista de seções com `title` e `content`), `sources_summary` (objeto com `text` descrevendo as fontes consultadas) e `chart` (sugestão de gráfico). O código no `agent.py` monta `answer_text` concatenando `activity` e as seções, enquanto `sources_text` é derivado preferencialmente do SQL executado e usa `sources_summary` do LLM apenas como fallback.

- **Justificativa:** A estrutura em seções permite sanitizar nomes físicos de tabelas e restaurar tokens sensíveis em cada campo textual separadamente, sem depender de parsing ad hoc de um bloco de texto único. A separação explícita de `sources_summary` permite que o código valide e substitua a descrição de fontes pelo texto derivado do SQL real (DA-30), garantindo precisão na proveniência dos dados. O frontend recebe textos já processados e seguros, enquanto o backend mantém o SQL bruto em `developer_debug`.

- **Implicações:** O prompt da Chamada 2 precisa instruir o LLM a retornar o novo formato. O parser em `insight_generator.py` valida campos obrigatórios (`activity`, `answer_sections`) e trata `sources_summary` como opcional. O código de montagem da resposta no `agent.py` precisa concatenar as seções em `answer_text` e extrair `sources_text` de `sources_summary`, aplicando sanitização e restauração de tokens em ambos.

---

### DA-34: Gráficos como Decisão Opcional do Agente

- **Contexto:** O campo `chart` sempre existiu no contrato de resposta, mas não era tratado como uma decisão arquitetural central do agente. O frontend recebia `chart` em toda resposta bem-sucedida, o que criava a expectativa de que um gráfico deveria sempre ser renderizado.

- **Decisão:** O agente (via LLM na Chamada 2) decide conscientemente quando retornar `chart` preenchido ou `null`. O prompt da Chamada 2 foi atualizado para instruir o LLM a retornar `chart: null` por padrão, preenchendo o campo apenas quando o usuário solicita explicitamente uma visualização ou quando os dados possuem padrão visual claro (ranking, série temporal, proporção limitada).

- **Justificativa:** Tira a responsabilidade do frontend de sempre produzir um gráfico. Remove o clutter visual para o usuário; perguntas simples (valor único, listagem detalhada) não precisam de gráfico como resposta. O agente respeita a intenção explícita do usuário quando solicita visualizações.

- **Implicações:** O frontend deve sempre tratar `chart` como opcional; quando `chart=None` e `data` existe, renderiza como tabela. O orçamento de chamadas LLM não muda (Chamada 2 já existia). O smoke test `smoke_test_chart_decision.py` valida a decisão do agente em cenários variados.
