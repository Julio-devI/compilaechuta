import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { toast } from 'sonner'
import {
    askAgent,
    getSuggestions,
    listSessions,
    getSessionDetail,
    deleteSession,
    type ChartSuggestion,
    type SessionSummary,
} from '@/services/aiAgentService'

export interface Message {
    id: number
    type: 'user' | 'assistant'
    content: string
    timestamp: string
    suggestions?: string[]
    sources_text?: string | null
    data?: Array<Record<string, unknown>> | null
    chart?: ChartSuggestion | null
}

export interface ConversaHistorico {
    id: string
    titulo: string
    timestamp: string
}

interface ChatContextType {
    mensagens: Message[]
    inputValue: string
    setInputValue: (val: string) => void
    isTyping: boolean
    conversaAtiva: string | null
    sessionId: string
    expandedCharts: Set<number>
    toggleChart: (id: number) => void
    conversasHistorico: ConversaHistorico[]
    searchHistorico: string
    setSearchHistorico: (val: string) => void
    suggestions: string[]
    isDrawerOpen: boolean
    setDrawerOpen: (val: boolean) => void
    lastRoute: string
    setLastRoute: (val: string) => void
    sendQuestion: (text: string) => Promise<void>
    handleConversaHistorico: (id: string) => Promise<void>
    handleNovaConversa: () => void
    handleDeleteConversation: (id: string) => Promise<void>
    runSugestaoCommand: () => Promise<void>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

function nowHHmm(): string {
    return new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    })
}

function formatSessionTimestamp(iso: string): string {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ''
    const today = new Date()
    const sameDay =
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
    if (sameDay) {
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
        })
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function summaryToHistorico(s: SessionSummary): ConversaHistorico {
    return {
        id: s.session_id,
        titulo: s.title,
        timestamp: formatSessionTimestamp(s.updated_at),
    }
}

export function ChatProvider({ children }: { children: ReactNode }) {
    const [mensagens, setMensagens] = useState<Message[]>([])
    const [inputValue, setInputValue] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [conversaAtiva, setConversaAtiva] = useState<string | null>(null)
    const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID())
    const [expandedCharts, setExpandedCharts] = useState<Set<number>>(new Set())
    const [conversasHistorico, setConversasHistorico] = useState<ConversaHistorico[]>([])
    const [searchHistorico, setSearchHistorico] = useState('')
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [isDrawerOpen, setDrawerOpen] = useState(false)
    const [lastRoute, setLastRoute] = useState('/dashboard')

    const messageIdRef = useRef(0)

    const toggleChart = (messageId: number) => {
        setExpandedCharts(prev => {
            const next = new Set(prev)
            if (next.has(messageId)) next.delete(messageId)
            else next.add(messageId)
            return next
        })
    }

    const nextMessageId = () => {
        messageIdRef.current += 1
        return messageIdRef.current
    }

    const refreshSessions = async () => {
        try {
            const sessions = await listSessions()
            setConversasHistorico(sessions.map(summaryToHistorico))
            return sessions
        } catch (err) {
            toast.error((err as Error).message)
            return []
        }
    }

    const loadInitialSuggestions = async () => {
        try {
            const { suggestions: list } = await getSuggestions('')
            setSuggestions(list)
        } catch (err) {
            toast.error((err as Error).message)
        }
    }

    useEffect(() => {
        const initChat = async () => {
            const sessions = await refreshSessions()
            const lastSessionId = sessionStorage.getItem('ai_agent_last_session')

            if (lastSessionId && sessions && sessions.length > 0) {
                const sessionExists = sessions.find(s => s.session_id === lastSessionId)
                if (sessionExists) {
                    handleConversaHistorico(lastSessionId)
                    return
                }
            }
            loadInitialSuggestions()
        }
        initChat()
    }, [])

    const sendQuestion = async (rawText: string) => {
        const text = rawText.trim()
        if (!text) return

        setMensagens(prev => [
            ...prev,
            {
                id: nextMessageId(),
                type: 'user',
                content: text,
                timestamp: nowHHmm(),
            },
        ])
        setInputValue('')
        setIsTyping(true)

        try {
            const response = await askAgent(text, sessionId)
            const assistantText =
                response.user_response.answer_text ||
                (response.status === 'out_of_scope'
                    ? 'Não consegui responder a essa pergunta com os dados disponíveis.'
                    : 'Ocorreu um erro ao processar a resposta.')

            setMensagens(prev => [
                ...prev,
                {
                    id: nextMessageId(),
                    type: 'assistant',
                    content: assistantText,
                    timestamp: nowHHmm(),
                    sources_text: response.user_response.sources_text,
                    data: response.user_response.data,
                    chart: response.user_response.chart,
                },
            ])

            if (response.status === 'success') {
                refreshSessions()
                setConversaAtiva(sessionId)
                sessionStorage.setItem('ai_agent_last_session', sessionId)
            }
        } catch (err) {
            const message = (err as Error).message
            toast.error(message)
            setMensagens(prev => [
                ...prev,
                {
                    id: nextMessageId(),
                    type: 'assistant',
                    content: `Ops, algo deu errado: ${message}`,
                    timestamp: nowHHmm(),
                },
            ])
        } finally {
            setIsTyping(false)
        }
    }

    const handleNovaConversa = () => {
        setMensagens([])
        setConversaAtiva(null)
        setInputValue('')
        setSessionId(crypto.randomUUID())
        setExpandedCharts(new Set())
        setIsTyping(false)
        loadInitialSuggestions()
        sessionStorage.removeItem('ai_agent_last_session')
    }

    const handleConversaHistorico = async (id: string) => {
        setConversaAtiva(id)
        setSessionId(id)
        setInputValue('')
        setIsTyping(false)
        sessionStorage.setItem('ai_agent_last_session', id)
        try {
            const detail = await getSessionDetail(id)
            const mapped: Message[] = detail.history.map(entry => ({
                id: nextMessageId(),
                type: entry.role,
                content: entry.content,
                timestamp: '',
                sources_text: entry.sources_text,
                data: entry.data,
                chart: entry.chart,
            }))
            setMensagens(mapped)
            setExpandedCharts(new Set())
        } catch (err) {
            toast.error((err as Error).message)
        }
    }

    const handleDeleteConversation = async (id: string) => {
        const deletedActiveConversation = conversaAtiva === id
        try {
            await deleteSession(id)
            setConversasHistorico(prev => prev.filter(conversa => conversa.id !== id))
            toast.success('Conversa apagada com sucesso.')

            if (deletedActiveConversation) {
                handleNovaConversa()
            }
        } catch (err) {
            toast.error((err as Error).message)
            throw err
        }
    }

    const runSugestaoCommand = async () => {
        setIsTyping(true)
        try {
            const { suggestions: list } = await getSuggestions(sessionId)
            setMensagens(prev => [
                ...prev,
                {
                    id: nextMessageId(),
                    type: 'assistant',
                    content: 'Aqui vão algumas sugestões para você:',
                    timestamp: nowHHmm(),
                    suggestions: list,
                },
            ])
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setIsTyping(false)
        }
    }

    return (
        <ChatContext.Provider
            value={{
                mensagens,
                inputValue,
                setInputValue,
                isTyping,
                conversaAtiva,
                sessionId,
                expandedCharts,
                toggleChart,
                conversasHistorico,
                searchHistorico,
                setSearchHistorico,
                suggestions,
                isDrawerOpen,
                setDrawerOpen,
                lastRoute,
                setLastRoute,
                sendQuestion,
                handleConversaHistorico,
                handleNovaConversa,
                handleDeleteConversation,
                runSugestaoCommand,
            }}
        >
            {children}
        </ChatContext.Provider>
    )
}

export function useChat() {
    const context = useContext(ChatContext)
    if (context === undefined) {
        throw new Error('useChat deve ser usado dentro de um ChatProvider')
    }
    return context
}