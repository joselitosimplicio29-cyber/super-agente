'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Plus, MessageSquare, MoreHorizontal, Pencil, Trash2, Zap,
  LayoutDashboard, Smartphone, Folder, Calendar, DollarSign,
  History, LayoutTemplate, StickyNote, Settings, ChevronUp, X, LogOut
} from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { useChatContext } from './ChatContext'

interface Conversation {
  id: string
  titulo: string
  ultima_mensagem: string
  created_at: string
  updated_at: string
  criado_em?: string
}

interface GroupedConversations { label: string; items: Conversation[] }

function groupByDate(conversations: Conversation[]): GroupedConversations[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000)
  const groups: Record<string, Conversation[]> = { Hoje: [], Ontem: [], 'Últimos 7 dias': [], 'Mais antigas': [] }

  for (const conv of conversations) {
    const date = new Date(conv.updated_at || conv.created_at || conv.criado_em || '')
    if (date >= today) groups['Hoje'].push(conv)
    else if (date >= yesterday) groups['Ontem'].push(conv)
    else if (date >= sevenDaysAgo) groups['Últimos 7 dias'].push(conv)
    else groups['Mais antigas'].push(conv)
  }
  return Object.entries(groups).filter(([, items]) => items.length > 0).map(([label, items]) => ({ label, items }))
}

const navItems = [
  { href: '/',           label: 'Dashboard',   icon: <LayoutDashboard size={16} /> },
  { href: '/midia',      label: 'Mídia',       icon: <Smartphone size={16} /> },
  { href: '/clientes',   label: 'Clientes',    icon: <Folder size={16} /> },
  { href: '/agenda',     label: 'Agenda',      icon: <Calendar size={16} /> },
  { href: '/financeiro', label: 'Financeiro',  icon: <DollarSign size={16} /> },
  { href: '/historico',  label: 'Histórico',   icon: <History size={16} /> },
  { href: '/kanban',     label: 'Kanban',      icon: <LayoutTemplate size={16} /> },
  { href: '/notas',      label: 'Notas',       icon: <StickyNote size={16} /> },
]

export default function ChatSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { refreshKey, triggerRefresh } = useChatContext()
  const { data: session } = useSession()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/chat/conversations')
      .then(res => res.json())
      .then(data => setConversations(data.conversations || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [refreshKey])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null)
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const grouped = groupByDate(conversations)
  const activeId = pathname.startsWith('/chat/') ? pathname.split('/chat/')[1]?.split('?')[0] : null

  async function handleRename(convId: string, newTitle: string) {
    const trimmed = newTitle.trim()
    setEditingId(null)
    if (!trimmed) return
    setConversations(prev => prev.map(c => (c.id === convId ? { ...c, titulo: trimmed } : c)))
    await fetch(`/api/chat/conversations/${convId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: trimmed }),
    })
  }

  async function handleDelete(convId: string) {
    if (!confirm('Tem certeza que quer deletar essa conversa?')) return
    setConversations(prev => prev.filter(c => c.id !== convId))
    setMenuOpen(null)
    await fetch(`/api/chat/conversations/${convId}`, { method: 'DELETE' })
    if (activeId === convId) router.push('/chat')
    triggerRefresh()
  }

  return (
    <aside className="cs">
      <style>{`
        .cs {
          width: 300px;
          background: #111827;
          display: flex;
          flex-direction: column;
          height: 100%;
          flex-shrink: 0;
          color: #E5E7EB;
        }

        /* ═══ BRAND ═══ */
        .cs-brand {
          padding: 16px 16px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .cs-brand-icon {
          width: 34px; height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, #F97316, #EA580C);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .cs-brand-title { font-weight: 700; font-size: 15px; color: #FFFFFF; }
        .cs-brand-sub { font-size: 10px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.06em; }

        /* ═══ NEW CONV BTN ═══ */
        .cs-new-btn-wrap { padding: 12px 12px 4px; }
        .cs-new-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(255,255,255,0.08);
          color: #E5E7EB;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .cs-new-btn:hover { background: rgba(255,255,255,0.12); color: #FFFFFF; }

        /* ═══ CONV LIST ═══ */
        .cs-list { flex: 1; overflow-y: auto; padding: 4px 8px 12px; }
        .cs-list::-webkit-scrollbar { width: 4px; }
        .cs-list::-webkit-scrollbar-track { background: transparent; }
        .cs-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .cs-group-label {
          font-size: 11px; font-weight: 600; color: #6B7280;
          text-transform: uppercase; letter-spacing: 0.06em;
          padding: 14px 8px 6px; user-select: none;
        }

        /* ═══ CONV ITEM ═══ */
        .cs-item-wrap { position: relative; margin-bottom: 1px; }
        .cs-item {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 8px; border: none;
          background: transparent; cursor: pointer; text-align: left;
          transition: all 0.12s; color: #D1D5DB;
        }
        .cs-item:hover { background: rgba(255,255,255,0.06); color: #FFFFFF; }
        .cs-item.active { background: rgba(255,255,255,0.1); color: #FFFFFF; }
        .cs-item-icon {
          width: 24px; height: 24px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .cs-item-text { flex: 1; min-width: 0; }
        .cs-item-title {
          font-size: 13px; font-weight: 500; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis; display: block; line-height: 1.3;
        }
        .cs-item.active .cs-item-title { font-weight: 600; }
        .cs-item-preview {
          font-size: 11px; color: #6B7280; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis; display: block; line-height: 1.3; margin-top: 1px;
        }

        /* ═══ 3-DOT MENU ═══ */
        .cs-menu-trigger {
          position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
          width: 26px; height: 26px; border-radius: 6px; border: none;
          background: transparent; color: #6B7280; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: all 0.12s;
        }
        .cs-item-wrap:hover .cs-menu-trigger, .cs-menu-trigger.open { opacity: 1; }
        .cs-menu-trigger:hover { background: rgba(255,255,255,0.1); color: #D1D5DB; }

        .cs-dropdown {
          position: absolute; right: 2px; top: calc(100% - 2px);
          background: #1F2937; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          z-index: 100; min-width: 150px; padding: 4px;
          animation: csDropIn 0.1s ease-out;
        }
        @keyframes csDropIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .cs-dropdown-item {
          width: 100%; display: flex; align-items: center; gap: 8px;
          padding: 7px 12px; border: none; background: transparent;
          border-radius: 6px; font-size: 13px; color: #D1D5DB; cursor: pointer;
          transition: background 0.1s;
        }
        .cs-dropdown-item:hover { background: rgba(255,255,255,0.08); }
        .cs-dropdown-item.danger { color: #F87171; }
        .cs-dropdown-item.danger:hover { background: rgba(248,113,113,0.1); }

        .cs-rename-input {
          width: 100%; background: rgba(255,255,255,0.1); border: 1.5px solid #F97316;
          border-radius: 6px; padding: 3px 8px; font-size: 13px; color: #FFFFFF;
          outline: none; font-family: inherit;
        }

        /* ═══ FOOTER / NAV MENU ═══ */
        .cs-footer {
          border-top: 1px solid rgba(255,255,255,0.08);
          padding: 8px 12px;
          position: relative;
        }
        .cs-user-btn {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 10px; border: none;
          background: transparent; cursor: pointer; color: #D1D5DB;
          transition: all 0.12s; text-align: left;
        }
        .cs-user-btn:hover { background: rgba(255,255,255,0.06); }
        .cs-user-avatar {
          width: 32px; height: 32px; border-radius: 8px;
          background: linear-gradient(135deg, #F97316, #EA580C);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 14px; color: #FFFFFF; flex-shrink: 0;
        }
        .cs-user-name { font-size: 13px; font-weight: 500; flex: 1; color: #E5E7EB; }
        .cs-user-status {
          display: flex; align-items: center; gap: 4px;
          font-size: 11px; color: #6B7280; margin-top: 1px;
        }
        .cs-status-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #10B981;
        }

        /* ═══ NAV PANEL ═══ */
        .cs-nav-panel {
          position: absolute; bottom: calc(100% + 4px); left: 8px; right: 8px;
          background: #1F2937; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; box-shadow: 0 -8px 32px rgba(0,0,0,0.4);
          padding: 6px; z-index: 200;
          animation: csNavIn 0.15s ease-out;
        }
        @keyframes csNavIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .cs-nav-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 10px 6px; margin-bottom: 2px;
        }
        .cs-nav-title { font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.06em; }
        .cs-nav-close {
          background: transparent; border: none; color: #6B7280; cursor: pointer;
          padding: 2px; border-radius: 4px; display: flex;
        }
        .cs-nav-close:hover { color: #D1D5DB; }
        .cs-nav-item {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 8px; border: none;
          background: transparent; cursor: pointer; text-align: left;
          font-size: 13px; font-weight: 500; color: #D1D5DB;
          transition: all 0.1s; text-decoration: none;
        }
        .cs-nav-item:hover { background: rgba(255,255,255,0.08); color: #FFFFFF; }
        .cs-nav-item svg { color: #9CA3AF; flex-shrink: 0; }
        .cs-nav-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 4px 0; }

        /* ═══ FOOTER ═══ */
        .cs-footer {
          border-top: 1px solid rgba(255,255,255,0.08);
          padding: 8px 12px;
          position: relative;
          flex-shrink: 0;
        }
        .cs-user-btn {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 10px; border: none;
          background: transparent; cursor: pointer; color: #D1D5DB;
          transition: all 0.12s; text-align: left;
        }
        .cs-user-btn:hover { background: rgba(255,255,255,0.06); }
        .cs-user-avatar {
          width: 32px; height: 32px; border-radius: 8px;
          background: linear-gradient(135deg, #F97316, #EA580C);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 14px; color: #FFFFFF; flex-shrink: 0;
        }
        .cs-user-name { font-size: 13px; font-weight: 500; flex: 1; color: #E5E7EB; }
        .cs-user-status {
          display: flex; align-items: center; gap: 4px;
          font-size: 11px; color: #6B7280; margin-top: 1px;
        }
        .cs-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #10B981; }

        .cs-empty { padding: 32px 16px; text-align: center; color: #6B7280; font-size: 13px; line-height: 1.6; }
        .cs-loading { display: flex; justify-content: center; gap: 4px; padding: 24px; }
        .cs-loading span { width: 6px; height: 6px; border-radius: 50%; background: #4B5563; animation: csDot 1.2s ease-in-out infinite; }
        .cs-loading span:nth-child(2) { animation-delay: 0.15s; }
        .cs-loading span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes csDot { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }
      `}</style>

      {/* BRAND */}
      <div className="cs-brand">
        <div className="cs-brand-icon"><Zap size={18} color="#FFFFFF" /></div>
        <div>
          <div className="cs-brand-title">Super Agente</div>
          <div className="cs-brand-sub">Inteligência que resolve</div>
        </div>
      </div>

      {/* NEW CONVERSATION */}
      <div className="cs-new-btn-wrap">
        <button onClick={() => router.push('/chat')} className="cs-new-btn">
          <Plus size={16} /> Nova conversa
        </button>
      </div>

      {/* CONVERSATION LIST */}
      <div className="cs-list" ref={menuRef}>
        {loading ? (
          <div className="cs-loading"><span /><span /><span /></div>
        ) : grouped.length === 0 ? (
          <div className="cs-empty">Nenhuma conversa ainda.<br />Comece digitando!</div>
        ) : (
          grouped.map(group => (
            <div key={group.label}>
              <div className="cs-group-label">{group.label}</div>
              {group.items.map(conv => (
                <div key={conv.id} className="cs-item-wrap">
                  <button
                    onClick={() => { if (editingId !== conv.id) router.push(`/chat/${conv.id}`) }}
                    className={`cs-item ${activeId === conv.id ? 'active' : ''}`}
                  >
                    <div className="cs-item-text">
                      {editingId === conv.id ? (
                        <input autoFocus defaultValue={conv.titulo || ''} className="cs-rename-input"
                          onClick={e => e.stopPropagation()}
                          onBlur={e => handleRename(conv.id, e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRename(conv.id, e.currentTarget.value)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                        />
                      ) : (
                        <>
                          <span className="cs-item-title">{conv.titulo || 'Nova conversa'}</span>
                          {conv.ultima_mensagem && <span className="cs-item-preview">{conv.ultima_mensagem}</span>}
                        </>
                      )}
                    </div>
                  </button>
                  <button
                    className={`cs-menu-trigger ${menuOpen === conv.id ? 'open' : ''}`}
                    onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === conv.id ? null : conv.id) }}
                  >
                    <MoreHorizontal size={14} />
                  </button>
                  {menuOpen === conv.id && (
                    <div className="cs-dropdown">
                      <button className="cs-dropdown-item" onClick={e => { e.stopPropagation(); setMenuOpen(null); setEditingId(conv.id) }}>
                        <Pencil size={13} /> Renomear
                      </button>
                      <button className="cs-dropdown-item danger" onClick={e => { e.stopPropagation(); handleDelete(conv.id) }}>
                        <Trash2 size={13} /> Deletar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* FOOTER — USER MENU */}
      <div className="cs-footer" ref={navRef}>
        {navOpen && (
          <div className="cs-nav-panel">
            <div className="cs-nav-header">
              <span className="cs-nav-title">Navegação</span>
              <button className="cs-nav-close" onClick={() => setNavOpen(false)}><X size={14} /></button>
            </div>
            {navItems.map(item => (
              <a key={item.href} href={item.href} className="cs-nav-item" onClick={() => setNavOpen(false)}>
                {item.icon} {item.label}
              </a>
            ))}
            <div className="cs-nav-divider" />
            <a href="/configuracoes" className="cs-nav-item" onClick={() => setNavOpen(false)}>
              <Settings size={16} /> Configurações
            </a>
            <button className="cs-nav-item" onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut size={16} /> Sair
            </button>
          </div>
        )}
        <button className="cs-user-btn" onClick={() => setNavOpen(!navOpen)}>
          {session?.user?.image ? (
            <img src={session.user.image} alt={session.user.name || "User"} className="cs-user-avatar" style={{ border: 'none', objectFit: 'cover' }} />
          ) : (
            <div className="cs-user-avatar">{session?.user?.name?.[0] || 'U'}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cs-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session?.user?.name || 'Usuário'}</div>
            <div className="cs-user-status"><div className="cs-status-dot" /> {(session?.user as any)?.role === 'admin' ? 'Admin' : 'Agente ativo'}</div>
          </div>
          <ChevronUp size={16} color="#6B7280" style={{ flexShrink: 0, transform: navOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>
    </aside>
  )
}