import { useState, useRef, useEffect } from 'react'
import { Send, Bot, Sparkles, TrendingUp, Users, BarChart, Search, X, Settings, MessageSquare, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ConversaHistorico, ChatQuickAction, ChatRespostas } from '../services/chatService'
import { getConversasHistorico, getChatQuickActions, getChatRespostas, resolveResposta } from '../services/chatService'

interface Message {
  id: number
  type: 'user' | 'assistant'
  content: string
  timestamp: string
}

const iconMap: Record<ChatQuickAction['iconName'], LucideIcon> = {
  TrendingUp,
  MessageSquare,
  Users,
  BarChart,
}

export function ChatIA() {
  const [mensagens, setMensagens] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [conversaAtiva, setConversaAtiva] = useState<number | null>(null)
  const [searchHistorico, setSearchHistorico] = useState('')
  const [conversasHistorico, setConversasHistorico] = useState<ConversaHistorico[]>([])
  const [quickActions, setQuickActions] = useState<ChatQuickAction[]>([])
  const [respostas, setRespostas] = useState<ChatRespostas>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getConversasHistorico().then(setConversasHistorico)
    getChatQuickActions().then(setQuickActions)
    getChatRespostas().then(setRespostas)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, isTyping])

  const handleEnviar = () => {
    if (!inputValue.trim()) return

    const currentInput = inputValue

    setMensagens(prev => [
      ...prev,
      {
        id: Date.now(),
        type: 'user',
        content: currentInput,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setInputValue('')
    setIsTyping(true)

    setTimeout(() => {
      const resposta = resolveResposta(currentInput, respostas)
      setMensagens(prev => [
        ...prev,
        {
          id: Date.now(),
          type: 'assistant',
          content: resposta,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
      setIsTyping(false)
    }, 1500)
  }

  const handleNovaConversa = () => {
    setMensagens([])
    setConversaAtiva(null)
    setInputValue('')
  }

  const handleConversaHistorico = (id: number) => {
    setConversaAtiva(id)
    setMensagens([
      {
        id: 1,
        type: 'assistant',
        content: 'Olá! Estou retomando esta conversa. Como posso continuar te ajudando?',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      },
    ])
  }

  const filteredConversas = conversasHistorico.filter(c =>
    c.titulo.toLowerCase().includes(searchHistorico.toLowerCase())
  )

  return (
    <div
      className="fixed inset-y-0 right-0 z-10 flex flex-col"
      style={{ left: '80px', background: 'var(--chat-bg)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--chat-border)', background: 'var(--chat-header-bg)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-linear-to-br from-[#1E5EFF] to-[#8B5CF6] rounded-xl flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-semibold text-foreground">Agente IA</span>
        </div>

        <p className="text-xs text-muted-foreground">
          Produzido por <span className="font-semibold text-foreground">V-Commerce</span>
        </p>

        <div className="flex items-center gap-1">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted hover:text-foreground rounded-lg transition-colors hover:bg-(--chat-item-hover)">
            <Settings className="w-3.5 h-3.5" />
            Opções
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted hover:text-foreground rounded-lg transition-colors hover:bg-(--chat-item-hover)">
            <X className="w-3.5 h-3.5" />
            Fechar
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar */}
        <div
          className="w-72 flex flex-col shrink-0"
          style={{ borderRight: '1px solid var(--chat-border)', background: 'var(--chat-sidebar-bg)' }}
        >
          <div className="p-4" style={{ borderBottom: '1px solid var(--chat-border)' }}>
            <h2 className="text-xs font-semibold mb-3 leading-snug text-muted">
              Histórico de Conversas{' '}
              <span style={{ color: 'var(--chat-accent)' }}>Agente IA</span>
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchHistorico}
                onChange={e => setSearchHistorico(e.target.value)}
                placeholder="Pesquisar..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg focus:outline-none transition-colors text-foreground placeholder:text-muted-foreground"
                style={{ background: 'var(--chat-input-bg)', border: '1px solid var(--chat-border)' }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {filteredConversas.map(conversa => (
              <button
                key={conversa.id}
                onClick={() => handleConversaHistorico(conversa.id)}
                className="w-full text-left p-3 rounded-xl transition-colors"
                style={{
                  background: conversaAtiva === conversa.id ? 'var(--chat-history-active-bg)' : 'transparent',
                  border: conversaAtiva === conversa.id
                    ? '1px solid var(--chat-history-active-border)'
                    : '1px solid transparent',
                }}
                onMouseEnter={e => {
                  if (conversaAtiva !== conversa.id)
                    e.currentTarget.style.background = 'var(--chat-item-hover)'
                }}
                onMouseLeave={e => {
                  if (conversaAtiva !== conversa.id)
                    e.currentTarget.style.background = 'transparent'
                }}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare
                    className="w-3.5 h-3.5 mt-0.5 shrink-0"
                    style={{ color: conversaAtiva === conversa.id ? 'var(--chat-accent)' : undefined }}
                    color={conversaAtiva === conversa.id ? undefined : 'var(--color-muted-foreground)'}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium leading-snug text-foreground"
                      style={{
                        color: conversaAtiva === conversa.id ? 'var(--chat-accent)' : undefined,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {conversa.titulo}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">{conversa.timestamp}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="p-3" style={{ borderTop: '1px solid var(--chat-border)' }}>
            <button
              onClick={handleNovaConversa}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1E5EFF] hover:bg-[#1E5EFF]/90 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova conversa
            </button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {mensagens.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-14 h-14 bg-linear-to-br from-[#1E5EFF] to-[#8B5CF6] rounded-2xl flex items-center justify-center mb-5">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-1.5">Olá! Como posso te ajudar?</h2>
              <p className="text-sm text-muted mb-8">Pergunte qualquer coisa sobre seu negócio</p>
              <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                {quickActions.map((action, i) => {
                  const Icon = iconMap[action.iconName]
                  return (
                    <button
                      key={i}
                      onClick={() => setInputValue(action.texto)}
                      className="flex items-center gap-3 p-4 rounded-xl text-left transition-all"
                      style={{ background: 'var(--chat-quick-card-bg)', border: '1px solid var(--chat-border)' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--chat-accent)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--chat-border)')}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(30,94,255,0.12)' }}
                      >
                        <Icon className="w-4 h-4" style={{ color: 'var(--chat-accent)' }} />
                      </div>
                      <span className="text-sm font-medium leading-tight text-foreground">{action.texto}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {mensagens.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: msg.type === 'user'
                        ? '#1E5EFF'
                        : 'linear-gradient(135deg, #1E5EFF, #8B5CF6)',
                    }}
                  >
                    {msg.type === 'user' ? (
                      <span className="text-white text-[10px] font-bold">EU</span>
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className={`max-w-[75%] flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className="px-4 py-3 text-sm whitespace-pre-line leading-relaxed"
                      style={
                        msg.type === 'user'
                          ? { background: '#1E5EFF', color: 'white', borderRadius: '1rem', borderTopRightRadius: '4px' }
                          : {
                              background: 'var(--chat-msg-ai-bg)',
                              border: '1px solid var(--chat-border)',
                              color: 'var(--color-foreground)',
                              borderRadius: '1rem',
                              borderTopLeftRadius: '4px',
                            }
                      }
                    >
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1">{msg.timestamp}</span>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1E5EFF, #8B5CF6)' }}
                  >
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div
                    className="px-4 py-3"
                    style={{
                      background: 'var(--chat-msg-ai-bg)',
                      border: '1px solid var(--chat-border)',
                      borderRadius: '1rem',
                      borderTopLeftRadius: '4px',
                    }}
                  >
                    <div className="flex gap-1 items-center h-4">
                      <span className="w-2 h-2 rounded-full bg-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 shrink-0" style={{ borderTop: '1px solid var(--chat-border)' }}>
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all focus-within:ring-1 focus-within:ring-[#1E5EFF]/30"
              style={{ background: 'var(--chat-input-bg)', border: '1px solid var(--chat-border)' }}
            >
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEnviar()}
                placeholder="Pergunte à V-Commerce..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                onClick={handleEnviar}
                disabled={!inputValue.trim()}
                className="flex flex-col items-center gap-0.5 shrink-0 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed text-[#1E5EFF] dark:text-white"
              >
                <Send className="w-4 h-4" />
                <span className="text-[9px] leading-none text-muted-foreground">enviar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
