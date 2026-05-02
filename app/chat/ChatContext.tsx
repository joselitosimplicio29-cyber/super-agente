'use client'

import { createContext, useContext, useState, useCallback } from 'react'

interface ChatContextType {
  refreshKey: number
  triggerRefresh: () => void
}

const ChatContext = createContext<ChatContextType>({
  refreshKey: 0,
  triggerRefresh: () => {},
})

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0)

  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  return (
    <ChatContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  return useContext(ChatContext)
}
