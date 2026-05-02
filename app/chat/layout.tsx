'use client'

import { ChatProvider } from './ChatContext'
import ChatSidebar from './ChatSidebar'

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ChatProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <ChatSidebar />
        <main style={{ flex: 1, overflow: 'auto', background: '#FFFFFF' }}>
          {children}
        </main>
      </div>
    </ChatProvider>
  )
}
