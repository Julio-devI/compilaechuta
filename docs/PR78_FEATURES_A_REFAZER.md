# Funcionalidades a refazer apos o merge do PR 78

## Contexto

O PR 78 centraliza o estado do chat IA do frontend em `frontend/src/contexts/ChatContext.tsx` e sincroniza a experiencia entre o drawer e a pagina `/chat-ia`.

A branch `fix/ai-agent-final-hardening` tambem alterou o mesmo nucleo funcional, mas usando `frontend/src/contexts/AiAgentChatContext.tsx` e adicionando protecoes e recursos que o PR 78 nao cobre completamente.

Depois que o PR 78 for mergeado, a estrategia recomendada e usar o `ChatContext.tsx` dele como base e portar apenas as funcionalidades abaixo. Nao vale manter os dois contextos ao mesmo tempo, porque isso criaria duas fontes de verdade para mensagens, sessao ativa, historico e estado de carregamento.

## 1. Fila de perguntas durante resposta em andamento

### Motivacao

O usuario pode enviar mais de uma pergunta enquanto o agente ainda esta respondendo. Sem fila, a UI precisa bloquear o envio ou aceitar requisicoes concorrentes que podem voltar fora de ordem.

### Problema

O PR 78 centraliza `isTyping`, `sendQuestion` e `inputValue`, mas ainda trata o envio como uma operacao unica em andamento. Se o usuario tentar enviar outra pergunta durante `isTyping`, a implementacao tende a bloquear o botao, ignorar a pergunta ou permitir concorrencia sem ordenacao garantida.

### Solucao encontrada na branch atual

A branch atual adiciona `pendingQuestions` ao estado do chat e mantem uma `pendingQuestionsRef` sincronizada. Quando `sendQuestion` recebe texto enquanto `isTyping` esta ativo, a pergunta e adicionada a fila em vez de iniciar outra requisicao imediatamente.

Quando a resposta atual termina, o fluxo remove a primeira pergunta da fila e chama `processQuestion` para processar o proximo item. A UI tambem mostra a lista de perguntas na fila e permite remover itens pendentes.

### Como refazer por cima do PR 78

Adicionar ao `ChatContext.tsx` do PR 78:

- `pendingQuestions: string[]`
- `setPendingQuestions`
- uma ref interna para evitar closure obsoleta
- um metodo para remover pergunta pendente por indice
- processamento sequencial dentro de `sendQuestion` ou em uma funcao interna `processQuestion`

No drawer e na pagina cheia, renderizar o bloco "Na fila" abaixo da area de mensagens e acima do input.

## 2. Protecao contra resposta atrasada em conversa trocada

### Motivacao

O usuario pode trocar de conversa, apagar uma conversa ou iniciar uma nova conversa enquanto uma chamada ao agente ainda esta em andamento.

### Problema

Sem uma protecao explicita, uma resposta atrasada pode ser aplicada na conversa errada. Isso causa mistura de mensagens, historico visual incorreto e risco de exibir dados de uma sessao que o usuario ja abandonou.

### Solucao encontrada na branch atual

A branch atual usa `conversationTokenRef`. Toda troca estrutural de conversa incrementa esse token:

- nova conversa
- carregar conversa do historico
- apagar conversa ativa

Cada requisicao captura o token atual antes de chamar o agente. Quando a resposta volta, o codigo confere se o token ainda e o mesmo. Se nao for, a resposta e ignorada.

### Como refazer por cima do PR 78

Adicionar uma ref de controle dentro do `ChatContext.tsx`:

- incrementar o token em `handleNovaConversa`
- incrementar o token em `handleConversaHistorico`
- incrementar o token quando a conversa ativa apagada for resetada
- capturar o token antes de `askAgent` e `getSuggestions`
- ignorar sucesso, erro e `finally` se o token mudou

Essa protecao deve ficar no contexto, nao em cada componente visual.

## 3. Tabela dinamica para dados sem grafico adequado

### Motivacao

Nem toda resposta com `data` deve virar grafico. Algumas respostas retornam linhas tabulares, listas ou valores que ficam mais legiveis como tabela.

### Problema

O PR 78 preserva a renderizacao de grafico via `AgentChart`, mas nao cobre a alternativa de renderizar uma tabela quando `data` existe e `chart` e nulo ou inadequado.

### Solucao encontrada na branch atual

A branch atual adiciona:

- `frontend/src/components/AgentDataTable.tsx`
- `frontend/src/lib/agentDataDisplay.ts`
- `shouldShowAgentDataTable(chart, data)`

O helper decide quando a tabela deve aparecer. A UI renderiza um bloco expansivel "Visualizar tabela" nas mensagens do assistente.

### Como refazer por cima do PR 78

Portar `AgentDataTable.tsx`, `agentDataDisplay.ts` e os testes associados. Depois, em `ChatIADrawer.tsx` e `ChatIA.tsx` do PR 78:

- importar `AgentDataTable`
- importar `shouldShowAgentDataTable`
- criar estado local `expandedTables`
- renderizar a tabela expansivel quando o helper retornar `true`

Essa feature nao precisa entrar no contexto global. O estado de expansao da tabela pode continuar local em cada view.

## 4. Contexto da pagina enviado ao agente

### Motivacao

O agente responde melhor quando sabe de qual area do sistema a pergunta foi feita. Uma pergunta enviada em `/pedidos` pode ter intencao diferente de uma pergunta enviada em `/clientes`.

### Problema

O PR 78 centraliza `sendQuestion`, mas nao preserva necessariamente a informacao de rota como contexto de pagina para a chamada `askAgent`.

### Solucao encontrada na branch atual

A branch atual adiciona uma funcao que converte `location.pathname` em `AiAgentPageContext`, com valores como:

- `dashboard`
- `clientes`
- `pedidos`
- `produtos`
- `suporte`
- `categorias`
- `relatorios`

No drawer, `askAgent` recebe a pergunta, a sessao e o contexto da pagina.

### Como refazer por cima do PR 78

Existem duas opcoes:

1. Passar `pageContext` como parametro opcional de `sendQuestion`.
2. Manter a conversao de rota no drawer e chamar `sendQuestion(text, pageContext)`.

A segunda opcao e mais simples, porque o contexto visual sabe a rota atual. A pagina `/chat-ia` pode chamar `sendQuestion(text)` sem contexto ou usar o ultimo contexto conhecido, se isso for mantido no `ChatContext`.

## 5. Historico completo no drawer

### Motivacao

O drawer precisa ser util sem obrigar o usuario a abrir a pagina cheia. Acesso rapido ao historico reduz troca de tela e preserva o fluxo de trabalho.

### Problema

O PR 78 centraliza historico e permite navegar para a pagina cheia, mas a branch atual adiciona um historico operavel diretamente no drawer, com busca, carregamento e nova conversa.

### Solucao encontrada na branch atual

O drawer ganhou:

- botao "Nova conversa"
- painel de historico recolhivel
- busca local no historico
- carregamento de sessoes com `listSessions`
- abertura de conversa com `getSessionDetail`
- fechamento do painel apos selecionar conversa

### Como refazer por cima do PR 78

Reaproveitar as funcoes ja existentes no `ChatContext.tsx` do PR 78 para evitar duplicacao:

- `conversasHistorico`
- `handleConversaHistorico`
- `handleNovaConversa`
- `searchHistorico`
- `setSearchHistorico`

Adicionar apenas a UI do painel no drawer. Se o PR 78 mantiver carregamento de historico so na pagina cheia, mover ou expor a rotina de refresh pelo contexto.

## 6. Reset seguro ao apagar ou trocar conversa

### Motivacao

Apagar a conversa ativa ou trocar de conversa durante uma resposta em andamento deve limpar estado visual e estado assíncrono de forma consistente.

### Problema

Sem reset completo, podem sobrar mensagens, graficos expandidos, perguntas pendentes, `isTyping` ou input antigo apos trocar de sessao.

### Solucao encontrada na branch atual

A branch atual reseta de forma coordenada:

- mensagens
- conversa ativa
- input
- fila de perguntas
- `isTyping`
- graficos expandidos
- tabelas expandidas
- token de conversa

### Como refazer por cima do PR 78

Revisar `handleNovaConversa`, `handleConversaHistorico` e `handleDeleteConversation` no `ChatContext.tsx` do PR 78 e garantir que eles limpem:

- fila de perguntas
- estado de resposta em andamento
- estado de expansao que estiver no contexto
- token anti-resposta-antiga
- input atual

Estados visuais locais, como tabela expandida, devem ser resetados nos componentes quando a conversa mudar.

## 7. Sugestao como interacao visivel no historico

### Motivacao

Quando o usuario usa `/sugestao`, a acao deve aparecer como uma interacao compreensivel no historico, nao como uma resposta solta do assistente.

### Problema

Se `/sugestao` apenas adiciona uma mensagem do assistente, o historico fica sem o motivo daquela resposta. Isso reduz rastreabilidade da conversa.

### Solucao encontrada na branch atual

A branch atual adiciona uma mensagem do usuario com o texto:

`Estou sem ideias do que perguntar agora. Com base no que conversamos ate aqui, pode me sugerir algumas perguntas?`

Depois chama `getSuggestions(sessionId)` e adiciona a resposta do assistente com a lista de sugestoes.

### Como refazer por cima do PR 78

Atualizar `runSugestaoCommand` no `ChatContext.tsx` para:

- adicionar mensagem do usuario antes da chamada
- usar o mesmo token anti-resposta-antiga
- respeitar a fila de perguntas no `finally`
- manter a resposta com `suggestions`

## 8. Provider condicionado a usuario autenticado

### Motivacao

O chat IA e uma funcionalidade autenticada. Evitar provider em rotas publicas reduz chamadas e estado desnecessario antes do login.

### Problema

O PR 78 envolve a aplicacao com `ChatProvider` de forma ampla. Se alguma inicializacao do contexto fizer chamadas de historico ou sugestoes antes da autenticacao, isso pode gerar erro, toast indevido ou requisicao sem token.

### Solucao encontrada na branch atual

A branch atual criou `AuthenticatedAiAgentChatProvider`, que so renderiza `AiAgentChatProvider` quando `isAuthenticated` e verdadeiro.

### Como refazer por cima do PR 78

Manter a ideia, mas usando `ChatProvider`:

- criar `AuthenticatedChatProvider`
- ler `isAuthenticated` de `AuthContext`
- renderizar `children` sem provider quando nao autenticado
- garantir que `ChatIADrawer` e `ChatIA` so sejam usados dentro de rotas protegidas

## 9. Testes de regressao do chat IA

### Motivacao

As mudancas do chat IA envolvem estado assíncrono, fila, historico e renderizacao condicional. Isso e uma area propensa a regressao.

### Problema

Os testes da branch atual foram escritos contra `AiAgentChatContext` e contra a estrutura atual dos componentes. Depois do PR 78, esses testes nao devem ser aplicados literalmente.

### Solucao encontrada na branch atual

A branch atual amplia testes de:

- drawer
- fila de perguntas
- renderizacao de dados
- servico do agente
- configuracao de API

### Como refazer por cima do PR 78

Reescrever os testes contra `ChatProvider` e `useChat`. Priorizar os cenarios:

- enviar pergunta enquanto `isTyping` adiciona item na fila
- finalizar resposta processa o proximo item da fila
- trocar conversa ignora resposta atrasada
- deletar conversa ativa limpa estado
- resposta com `data` sem `chart` mostra tabela
- `askAgent` recebe `pageContext` quando a pergunta vem do drawer

## 10. Ajustes de contrato com backend e servico do agente

### Motivacao

Parte do hardening da branch atual depende de contratos ajustados no backend e no servico frontend.

### Problema

Mesmo que o PR 78 resolva a UX do chat, ele nao cobre todas as alteracoes em `aiAgentService.ts`, `apiConfig.ts`, schemas do backend e endpoints de sessao.

### Solucao encontrada na branch atual

A branch atual ajusta:

- configuracao central de API no frontend
- chamadas de sessao do agente
- testes de servico
- endpoints e schemas do backend para sessoes
- logs e configuracoes do ai-agent

### Como refazer por cima do PR 78

Depois do merge do PR 78, conferir o contrato usado por `ChatContext.tsx`:

- assinatura de `askAgent`
- retorno de `listSessions`
- retorno de `getSessionDetail`
- comportamento de `deleteSession`
- suporte a `pageContext`

Portar primeiro os contratos de servico e backend. Depois adaptar o contexto e os componentes.

## Ordem recomendada para refazer

1. Portar contratos de servico e backend necessarios para o chat.
2. Adicionar token anti-resposta-antiga no `ChatContext.tsx`.
3. Adicionar fila de perguntas no `ChatContext.tsx`.
4. Portar tabela dinamica.
5. Portar `pageContext` no envio do drawer.
6. Reforcar reset seguro de conversa.
7. Adicionar historico completo no drawer, se ainda estiver ausente.
8. Adaptar testes de regressao para o `ChatProvider` do PR 78.

## O que nao portar

Nao portar `frontend/src/contexts/AiAgentChatContext.tsx` como arquivo novo depois do merge do PR 78.

Nao manter dois contextos para o chat IA.

Nao substituir o `ChatContext.tsx` inteiro do PR 78 sem antes comparar o fluxo de minimizar, expandir e voltar para a ultima rota.

Nao trazer nomes de estado em portugues para novos identificadores, se for possivel evitar. O projeto exige identificadores em ingles, entao novos campos devem preferir `messages`, `activeConversation`, `pendingQuestions` e `lastRoute`. Se o PR 78 ja tiver nomes em portugues, o ideal e migrar em um refactor separado para reduzir risco.
