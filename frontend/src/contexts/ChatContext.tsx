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

interface ChatContextValue {
  selectedChatKey: string
  setSelectedChatKey: Dispatch<SetStateAction<string>>
  getChatState: (chatKey: string) => AiAgentChatState
  setChatState: (
    chatKey: string,
    updater: SetStateAction<AiAgentChatState>,
  ) => void
  nextMessageId: (chatKey: string) => number
  resetChat: (chatKey: string) => void
  getPendingQuestions: (chatKey: string) => string[]
  replacePendingQuestions: (chatKey: string, questions: string[]) => void
  appendPendingQuestion: (chatKey: string, question: string) => string[]
  removePendingQuestion: (chatKey: string, indexToRemove: number) => string[]
  shiftPendingQuestion: (chatKey: string) => string | null
  getConversationToken: (chatKey: string) => number
  invalidateConversation: (chatKey: string) => number
  isConversationTokenCurrent: (chatKey: string, token: number) => boolean
  isDrawerOpen: boolean
  setDrawerOpen: Dispatch<SetStateAction<boolean>>
  lastRoute: string
  setLastRoute: Dispatch<SetStateAction<string>>
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
  appendPendingQuestion: (question: string) => string[]
  removePendingQuestion: (indexToRemove: number) => string[]
  shiftPendingQuestion: () => string | null
  selectedChatKey: string
  setSelectedChatKey: Dispatch<SetStateAction<string>>
  nextMessageId: () => number
  resetActiveConversation: () => void
  getConversationToken: () => number
  invalidateConversation: () => number
  isConversationTokenCurrent: (token: number) => boolean
  isDrawerOpen: boolean
  setDrawerOpen: Dispatch<SetStateAction<boolean>>
  lastRoute: string
  setLastRoute: Dispatch<SetStateAction<string>>
}

const ChatContext = createContext<ChatContextValue | null>(null)

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

export function ChatProvider({ children }: { children: ReactNode }) {
  const [selectedChatKey, setSelectedChatKey] = useState(DEFAULT_CHAT_KEY)
  const [chats, setChats] = useState<Record<string, AiAgentChatState>>(() => ({
    [DEFAULT_CHAT_KEY]: createEmptyChatState(),
  }))
  const [isDrawerOpen, setDrawerOpen] = useState(false)
  const [lastRoute, setLastRoute] = useState('/dashboard')
  const initialChatStateByChatKeyRef = useRef<Record<string, AiAgentChatState>>({})
  const messageIdByChatKeyRef = useRef<Record<string, number>>({})
  const pendingQuestionsByChatKeyRef = useRef<Record<string, string[]>>({})
  const conversationTokenByChatKeyRef = useRef<Record<string, number>>({})

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
    pendingQuestionsByChatKeyRef.current[chatKey] = []
    initialChatStateByChatKeyRef.current[chatKey] = createEmptyChatState()
    setChats(prev => ({
      ...prev,
      [chatKey]: createEmptyChatState(),
    }))
  }

  const getPendingQuestions = (chatKey: string) => {
    return pendingQuestionsByChatKeyRef.current[chatKey] ?? getChatState(chatKey).pendingQuestions
  }

  const replacePendingQuestions = (chatKey: string, questions: string[]) => {
    pendingQuestionsByChatKeyRef.current[chatKey] = questions
    setChatState(chatKey, current => ({
      ...current,
      pendingQuestions: questions,
    }))
  }

  const appendPendingQuestion = (chatKey: string, question: string) => {
    const nextQuestions = [...getPendingQuestions(chatKey), question]
    replacePendingQuestions(chatKey, nextQuestions)
    return nextQuestions
  }

  const removePendingQuestion = (chatKey: string, indexToRemove: number) => {
    const nextQuestions = getPendingQuestions(chatKey).filter(
      (_, index) => index !== indexToRemove,
    )
    replacePendingQuestions(chatKey, nextQuestions)
    return nextQuestions
  }

  const shiftPendingQuestion = (chatKey: string) => {
    const [nextQuestion, ...remainingQuestions] = getPendingQuestions(chatKey)
    replacePendingQuestions(chatKey, remainingQuestions)
    return nextQuestion ?? null
  }

  const getConversationToken = (chatKey: string) => {
    return conversationTokenByChatKeyRef.current[chatKey] ?? 0
  }

  const invalidateConversation = (chatKey: string) => {
    const nextToken = getConversationToken(chatKey) + 1
    conversationTokenByChatKeyRef.current[chatKey] = nextToken
    return nextToken
  }

  const isConversationTokenCurrent = (chatKey: string, token: number) => {
    return getConversationToken(chatKey) === token
  }

  return (
    <ChatContext.Provider
      value={{
        selectedChatKey,
        setSelectedChatKey,
        getChatState,
        setChatState,
        nextMessageId,
        resetChat,
        getPendingQuestions,
        replacePendingQuestions,
        appendPendingQuestion,
        removePendingQuestion,
        shiftPendingQuestion,
        getConversationToken,
        invalidateConversation,
        isConversationTokenCurrent,
        isDrawerOpen,
        setDrawerOpen,
        lastRoute,
        setLastRoute,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat deve ser usado dentro de ChatProvider.')
  }
  return context
}

export function useAiAgentChat(chatKey?: string): AiAgentChatActions {
  const context = useChat()
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
    setPendingQuestions: action => {
      const nextQuestions = applyStateAction(
        context.getPendingQuestions(resolvedChatKey),
        action,
      )
      context.replacePendingQuestions(resolvedChatKey, nextQuestions)
    },
    appendPendingQuestion: question =>
      context.appendPendingQuestion(resolvedChatKey, question),
    removePendingQuestion: indexToRemove =>
      context.removePendingQuestion(resolvedChatKey, indexToRemove),
    shiftPendingQuestion: () => context.shiftPendingQuestion(resolvedChatKey),
    selectedChatKey: context.selectedChatKey,
    setSelectedChatKey: context.setSelectedChatKey,
    nextMessageId: () => context.nextMessageId(resolvedChatKey),
    resetActiveConversation: () => context.resetChat(resolvedChatKey),
    getConversationToken: () => context.getConversationToken(resolvedChatKey),
    invalidateConversation: () => context.invalidateConversation(resolvedChatKey),
    isConversationTokenCurrent: token =>
      context.isConversationTokenCurrent(resolvedChatKey, token),
    isDrawerOpen: context.isDrawerOpen,
    setDrawerOpen: context.setDrawerOpen,
    lastRoute: context.lastRoute,
    setLastRoute: context.setLastRoute,
  }
}
