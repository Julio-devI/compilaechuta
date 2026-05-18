import {
  createContext,
  useContext,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import type { ChartSuggestion } from '@/services/aiAgentService'

const DEFAULT_CHAT_KEY = 'chat-ia'

export interface AiAgentMessage {
  id: number
  type: 'user' | 'assistant'
  content: string
  timestamp: string
  suggestions?: string[]
  sources_text?: string | null
  data?: Array<Record<string, unknown>> | null
  chart?: ChartSuggestion | null
}

interface AiAgentChatState {
  messages: AiAgentMessage[]
  sessionId: string
  activeConversation: string | null
  initialSuggestions: string[]
  isTyping: boolean
  pendingQuestions: string[]
}

interface AiAgentChatContextValue {
  selectedChatKey: string
  setSelectedChatKey: Dispatch<SetStateAction<string>>
  getChatState: (chatKey: string) => AiAgentChatState
  setChatState: (
    chatKey: string,
    updater: SetStateAction<AiAgentChatState>,
  ) => void
  nextMessageId: (chatKey: string) => number
  resetChat: (chatKey: string) => void
}

interface AiAgentChatActions {
  messages: AiAgentMessage[]
  setMessages: Dispatch<SetStateAction<AiAgentMessage[]>>
  sessionId: string
  setSessionId: Dispatch<SetStateAction<string>>
  activeConversation: string | null
  setActiveConversation: Dispatch<SetStateAction<string | null>>
  initialSuggestions: string[]
  setInitialSuggestions: Dispatch<SetStateAction<string[]>>
  isTyping: boolean
  setIsTyping: Dispatch<SetStateAction<boolean>>
  pendingQuestions: string[]
  setPendingQuestions: Dispatch<SetStateAction<string[]>>
  selectedChatKey: string
  setSelectedChatKey: Dispatch<SetStateAction<string>>
  nextMessageId: () => number
  resetActiveConversation: () => void
}

const AiAgentChatContext = createContext<AiAgentChatContextValue | null>(null)

function createEmptyChatState(): AiAgentChatState {
  return {
    messages: [],
    sessionId: crypto.randomUUID(),
    activeConversation: null,
    initialSuggestions: [],
    isTyping: false,
    pendingQuestions: [],
  }
}

function applyStateAction<T>(current: T, action: SetStateAction<T>): T {
  return typeof action === 'function'
    ? (action as (value: T) => T)(current)
    : action
}

export function AiAgentChatProvider({ children }: { children: ReactNode }) {
  const [selectedChatKey, setSelectedChatKey] = useState(DEFAULT_CHAT_KEY)
  const [chats, setChats] = useState<Record<string, AiAgentChatState>>(() => ({
    [DEFAULT_CHAT_KEY]: createEmptyChatState(),
  }))
  const initialChatStateByChatKeyRef = useRef<Record<string, AiAgentChatState>>({})
  const messageIdByChatKeyRef = useRef<Record<string, number>>({})

  const getInitialChatState = (chatKey: string) => {
    if (!initialChatStateByChatKeyRef.current[chatKey]) {
      initialChatStateByChatKeyRef.current[chatKey] = createEmptyChatState()
    }
    return initialChatStateByChatKeyRef.current[chatKey]
  }

  const getChatState = (chatKey: string) => {
    return chats[chatKey] ?? getInitialChatState(chatKey)
  }

  const setChatState = (
    chatKey: string,
    updater: SetStateAction<AiAgentChatState>,
  ) => {
    setChats(prev => {
      const current = prev[chatKey] ?? getInitialChatState(chatKey)
      return {
        ...prev,
        [chatKey]: applyStateAction(current, updater),
      }
    })
  }

  const nextMessageId = (chatKey: string) => {
    const next = (messageIdByChatKeyRef.current[chatKey] ?? 0) + 1
    messageIdByChatKeyRef.current[chatKey] = next
    return next
  }

  const resetChat = (chatKey: string) => {
    messageIdByChatKeyRef.current[chatKey] = 0
    setChats(prev => ({
      ...prev,
      [chatKey]: createEmptyChatState(),
    }))
  }

  return (
    <AiAgentChatContext.Provider
      value={{
        selectedChatKey,
        setSelectedChatKey,
        getChatState,
        setChatState,
        nextMessageId,
        resetChat,
      }}
    >
      {children}
    </AiAgentChatContext.Provider>
  )
}

export function useAiAgentChat(chatKey?: string): AiAgentChatActions {
  const context = useContext(AiAgentChatContext)
  if (!context) {
    throw new Error('useAiAgentChat deve ser usado dentro de AiAgentChatProvider.')
  }

  const resolvedChatKey = chatKey ?? context.selectedChatKey
  const state = context.getChatState(resolvedChatKey)

  return {
    messages: state.messages,
    setMessages: action =>
      context.setChatState(resolvedChatKey, current => ({
        ...current,
        messages: applyStateAction(current.messages, action),
      })),
    sessionId: state.sessionId,
    setSessionId: action =>
      context.setChatState(resolvedChatKey, current => ({
        ...current,
        sessionId: applyStateAction(current.sessionId, action),
      })),
    activeConversation: state.activeConversation,
    setActiveConversation: action =>
      context.setChatState(resolvedChatKey, current => ({
        ...current,
        activeConversation: applyStateAction(current.activeConversation, action),
      })),
    initialSuggestions: state.initialSuggestions,
    setInitialSuggestions: action =>
      context.setChatState(resolvedChatKey, current => ({
        ...current,
        initialSuggestions: applyStateAction(current.initialSuggestions, action),
      })),
    isTyping: state.isTyping,
    setIsTyping: action =>
      context.setChatState(resolvedChatKey, current => ({
        ...current,
        isTyping: applyStateAction(current.isTyping, action),
      })),
    pendingQuestions: state.pendingQuestions,
    setPendingQuestions: action =>
      context.setChatState(resolvedChatKey, current => ({
        ...current,
        pendingQuestions: applyStateAction(current.pendingQuestions, action),
      })),
    selectedChatKey: context.selectedChatKey,
    setSelectedChatKey: context.setSelectedChatKey,
    nextMessageId: () => context.nextMessageId(resolvedChatKey),
    resetActiveConversation: () => context.resetChat(resolvedChatKey),
  }
}
