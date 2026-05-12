import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Maximize2, Send, Bot, Sparkles, HelpCircle, FileText, Zap, Lightbulb, History } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ChatQuickAction, ChatRespostas } from '../services/chatService'
import { getChatQuickActions, getChatRespostas, resolveResposta } from '../services/chatService'

interface Message {
  id: number
  type: 'user' | 'assistant'
  content: string
  timestamp: string
}

const iconMap: Record<ChatQuickAction['iconName'], LucideIcon> = {
  TrendingUp: Zap,
  MessageSquare: FileText,
  Users: HelpCircle,
  BarChart: Lightbulb,
}

export function ChatIADrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [mensagens, setMensagens] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [quickActions, setQuickActions] = useState<ChatQuickAction[]>([])
  const [respostas, setRespostas] = useState<ChatRespostas>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
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

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-40 transition-all duration-300 bg-linear-to-br from-[#1E5EFF] to-[#8B5CF6] hover:scale-110 ${
          isOpen ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'
        }`}
      >
        <Sparkles className="w-6 h-6 text-white" />
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(0,0,0,0.4)' }}
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-100 z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ background: 'var(--chat-bg)', borderLeft: '1px solid var(--chat-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--chat-border)', background: 'var(--chat-header-bg)' }}
        >
          <button
            onClick={() => { navigate('/chat-ia'); setIsOpen(false) }}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-(--chat-item-hover)"
            title="Expandir"
          >
            <Maximize2 className="w-4 h-4 text-muted" />
          </button>

          <p className="text-xs text-muted-foreground">
            Produzido por <span className="font-semibold text-foreground">V-Commerce</span>
          </p>

          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-(--chat-item-hover)"
          >
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        {/* Chat content */}
        {mensagens.length === 0 ? (
          <div className="flex-1 flex flex-col px-6 py-8">
            <h2 className="text-2xl font-bold text-foreground mb-8 leading-tight">
              Olá! Como posso te ajudar?
            </h2>

            <div className="space-y-1">
              {quickActions.map((action, i) => {
                const Icon = iconMap[action.iconName]
                return (
                  <button
                    key={i}
                    onClick={() => setInputValue(action.texto)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors hover:bg-(--chat-item-hover) group"
                  >
                    <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--chat-accent)' }} />
                    <span className="text-sm transition-colors" style={{ color: 'var(--chat-accent)' }}>
                      {action.texto}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {mensagens.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    msg.type === 'user' ? 'bg-[#1E5EFF]' : 'bg-linear-to-br from-[#1E5EFF] to-[#8B5CF6]'
                  }`}
                >
                  {msg.type === 'user' ? (
                    <span className="text-white text-[9px] font-bold">EU</span>
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <div className={`max-w-[80%] flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className="px-3 py-2.5 text-sm leading-relaxed"
                    style={
                      msg.type === 'user'
                        ? { background: '#1E5EFF', color: 'white', borderRadius: '0.75rem', borderTopRightRadius: '4px' }
                        : {
                            background: 'var(--chat-msg-ai-bg)',
                            border: '1px solid var(--chat-border)',
                            color: 'var(--color-foreground)',
                            borderRadius: '0.75rem',
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
                <div className="w-7 h-7 rounded-full bg-linear-to-br from-[#1E5EFF] to-[#8B5CF6] flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div
                  className="px-3 py-2.5"
                  style={{
                    background: 'var(--chat-msg-ai-bg)',
                    border: '1px solid var(--chat-border)',
                    borderRadius: '0.75rem',
                    borderTopLeftRadius: '4px',
                  }}
                >
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input area */}
        <div className="p-4 shrink-0" style={{ borderTop: '1px solid var(--chat-border)' }}>
          <div
            className="rounded-2xl px-4 pt-3 pb-3 focus-within:ring-1 focus-within:ring-[#1E5EFF]/30 transition-all"
            style={{ background: 'var(--chat-input-bg)', border: '1px solid var(--chat-border)' }}
          >
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEnviar()}
              placeholder="Pergunte sobre a V-Commerce..."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none mb-3"
            />
            <div className="flex items-center justify-between">
              <button
                onClick={() => { navigate('/chat-ia'); setIsOpen(false) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-foreground transition-colors"
                style={{ background: 'var(--chat-msg-ai-bg)' }}
              >
                <History className="w-3 h-3" />
                Abrir Histórico de Conversas
              </button>
              <button
                onClick={handleEnviar}
                disabled={!inputValue.trim()}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: '#1E5EFF', opacity: inputValue.trim() ? 1 : 0.3 }}
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
