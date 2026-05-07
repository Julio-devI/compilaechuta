import { useState } from 'react'
import { Send, Bot, User, Sparkles, TrendingUp, Users, ShoppingCart, HelpCircle, Lightbulb, BarChart } from 'lucide-react'

interface Message {
  id: number
  type: 'user' | 'assistant'
  content: string
  timestamp: string
}

const sugestoes = [
  { icon: TrendingUp, texto: 'Qual foi a receita do último mês?' },
  { icon: Users, texto: 'Quantos novos clientes tivemos essa semana?' },
  { icon: ShoppingCart, texto: 'Quais são os produtos mais vendidos?' },
  { icon: BarChart, texto: 'Faça uma análise do desempenho de vendas' },
]

const mensagensIniciais: Message[] = [
  {
    id: 1,
    type: 'assistant',
    content: 'Olá! Sou o assistente IA da V-Commerce. Posso ajudá-lo com análises de dados, relatórios, insights sobre vendas, clientes e muito mais. Como posso ajudar você hoje?',
    timestamp: '10:00'
  }
]

export function ChatIA() {
  const [mensagens, setMensagens] = useState<Message[]>(mensagensIniciais)
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const handleEnviar = () => {
    if (!inputValue.trim()) return

    const novaMensagemUser: Message = {
      id: mensagens.length + 1,
      type: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }

    setMensagens([...mensagens, novaMensagemUser])
    setInputValue('')
    setIsTyping(true)

    // Simular resposta da IA
    setTimeout(() => {
      const respostas: Record<string, string> = {
        'receita': 'Com base nos dados do último mês, a receita total foi de **R$ 350.000**, representando um aumento de **12,5%** em comparação ao mês anterior. Os principais contribuidores foram:\n\n• Eletrônicos: R$ 125.000 (35,7%)\n• Informática: R$ 87.500 (25%)\n• Áudio: R$ 63.000 (18%)\n\nO ticket médio subiu para R$ 285,00, indicando que os clientes estão comprando produtos de maior valor.',
        'clientes': 'Esta semana tivemos **234 novos clientes** cadastrados, um aumento de **15%** em relação à semana anterior.\n\n📊 **Distribuição por região:**\n• Sudeste: 45%\n• Sul: 25%\n• Nordeste: 18%\n• Centro-Oeste: 8%\n• Norte: 4%\n\n✅ **Taxa de conversão:** 3,2% (acima da média do setor)',
        'produtos': 'Os **Top 5 produtos mais vendidos** deste mês são:\n\n1. 📱 **Smartphone Galaxy S24** - 892 unidades (R$ 3.8M)\n2. 💻 **Notebook Dell Inspiron** - 456 unidades (R$ 1.6M)\n3. 🎧 **Fone Bluetooth JBL** - 1.234 unidades (R$ 369k)\n4. 🎮 **Console PS5** - 567 unidades (R$ 2.5M)\n5. 📺 **Smart TV 55" LG** - 234 unidades (R$ 655k)\n\nDestaque: Fones Bluetooth tiveram aumento de 45% nas vendas!',
        'análise': 'Aqui está uma **análise completa do desempenho de vendas**:\n\n📈 **Métricas Principais:**\n• Receita Total: R$ 4.2M (+18,5% YoY)\n• Pedidos: 310.000 (+12,3%)\n• Ticket Médio: R$ 285 (+8,2%)\n• Taxa de Conversão: 3,8%\n\n🎯 **Pontos de Atenção:**\n• Estoque de Fones JBL está baixo (12 unidades)\n• Taxa de cancelamento subiu 0,5%\n\n💡 **Recomendações:**\n1. Reabastecer estoque de produtos populares\n2. Investir em campanhas para região Norte\n3. Melhorar processo de entrega'
      }

      let resposta = 'Entendi sua pergunta! Deixe-me analisar os dados disponíveis e fornecer uma resposta detalhada. Posso ajudar com informações sobre vendas, clientes, produtos e muito mais. Poderia ser mais específico sobre o que você gostaria de saber?'
      
      const inputLower = inputValue.toLowerCase()
      if (inputLower.includes('receita') || inputLower.includes('faturamento')) {
        resposta = respostas['receita']
      } else if (inputLower.includes('cliente')) {
        resposta = respostas['clientes']
      } else if (inputLower.includes('produto') || inputLower.includes('vendido')) {
        resposta = respostas['produtos']
      } else if (inputLower.includes('análise') || inputLower.includes('desempenho')) {
        resposta = respostas['análise']
      }

      const novaMensagemIA: Message = {
        id: mensagens.length + 2,
        type: 'assistant',
        content: resposta,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }

      setMensagens(prev => [...prev, novaMensagemIA])
      setIsTyping(false)
    }, 1500)
  }

  const handleSugestao = (texto: string) => {
    setInputValue(texto)
  }

  return (
    <div className="p-8 h-[calc(100vh-80px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#1E5EFF] to-[#8B5CF6] rounded-2xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">Chat IA</h1>
            <p className="text-[#64748B]">Assistente inteligente para análise de dados</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 px-3 py-1.5 bg-[#00C48C]/10 text-[#00C48C] rounded-full text-sm font-medium">
            <span className="w-2 h-2 bg-[#00C48C] rounded-full animate-pulse" />
            Online
          </span>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-2xl border border-[#E2E8F0] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {mensagens.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.type === 'user' ? 'bg-[#1E5EFF]' : 'bg-gradient-to-br from-[#1E5EFF] to-[#8B5CF6]'
                }`}>
                  {msg.type === 'user' ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className={`max-w-[70%] ${msg.type === 'user' ? 'text-right' : ''}`}>
                  <div className={`p-4 rounded-2xl ${
                    msg.type === 'user' 
                      ? 'bg-[#1E5EFF] text-white rounded-tr-none' 
                      : 'bg-[#F8FAFC] text-[#1E293B] rounded-tl-none'
                  }`}>
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>
                  <span className="text-xs text-[#94A3B8] mt-1 inline-block">{msg.timestamp}</span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E5EFF] to-[#8B5CF6] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-[#F8FAFC] p-4 rounded-2xl rounded-tl-none">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-[#94A3B8] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-[#94A3B8] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-[#94A3B8] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-[#E2E8F0]">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEnviar()}
                placeholder="Digite sua pergunta..."
                className="flex-1 px-4 py-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]/20 focus:border-[#1E5EFF]"
              />
              <button
                onClick={handleEnviar}
                disabled={!inputValue.trim()}
                className="w-12 h-12 bg-[#1E5EFF] rounded-xl flex items-center justify-center text-white hover:bg-[#1E5EFF]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 space-y-6">
          {/* Sugestões */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
            <h3 className="font-bold text-[#1E293B] mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-[#FFD60A]" />
              Sugestões
            </h3>
            <div className="space-y-2">
              {sugestoes.map((sugestao, index) => {
                const Icon = sugestao.icon
                return (
                  <button
                    key={index}
                    onClick={() => handleSugestao(sugestao.texto)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#F8FAFC] transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#1E5EFF]/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-[#1E5EFF]" />
                    </div>
                    <span className="text-sm text-[#64748B]">{sugestao.texto}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Capacidades */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
            <h3 className="font-bold text-[#1E293B] mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#1E5EFF]" />
              O que posso fazer
            </h3>
            <div className="space-y-3 text-sm text-[#64748B]">
              <p>• Analisar dados de vendas e receita</p>
              <p>• Gerar insights sobre clientes</p>
              <p>• Identificar tendências de mercado</p>
              <p>• Comparar períodos e métricas</p>
              <p>• Sugerir ações estratégicas</p>
              <p>• Responder perguntas sobre o negócio</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
