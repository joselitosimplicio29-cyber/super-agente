"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { 
  MessageSquare, Folder, Smartphone, LayoutTemplate, 
  Sparkles, Calendar, DollarSign, History, 
  LayoutDashboard, StickyNote, ChevronRight
} from 'lucide-react'

interface Client {
  id: string
  nome: string
}

export default function Sidebar() {
  const pathname = usePathname()
  const [clientes, setClientes] = useState<Client[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState<string>("")

  useEffect(() => {
    fetch('/api/cadastrar-cliente')
      .then(r => r.json())
      .then(d => {
        if (d.clientes) setClientes(d.clientes)
      })
      .catch(() => {})
  }, [])

  if (pathname.startsWith('/chat')) return null

  const navItems = [
    { href: "/chat",       label: "Chat",        icon: <MessageSquare size={18} /> },
    { href: "/",           label: "Dashboard",   icon: <LayoutDashboard size={18} /> },
    { href: "/midia",      label: "Mídia",       icon: <Smartphone size={18} /> },
    { href: "/clientes",   label: "Clientes",    icon: <Folder size={18} /> },
    { href: "/agenda",     label: "Agenda",      icon: <Calendar size={18} /> },
    { href: "/financeiro", label: "Financeiro",  icon: <DollarSign size={18} /> },
    { href: "/historico",  label: "Histórico",   icon: <History size={18} /> },
    { href: "/kanban",     label: "Kanban",      icon: <LayoutTemplate size={18} /> },
    { href: "/notas",      label: "Notas",       icon: <StickyNote size={18} /> },
  ]

  return (
    <aside className="sidebar">
      <style>{`
        .sidebar {
          width: 260px;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(20px);
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          height: 100vh;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .brand-header {
          padding: 24px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-logo-container {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #10B981, #3B82F6);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }

        .brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-title {
          font-weight: 800;
          font-size: 16px;
          letter-spacing: -0.02em;
          color: #F8FAFC;
        }

        .brand-subtitle {
          font-size: 10px;
          font-weight: 600;
          color: #64748B;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .nav-menu {
          flex: 1;
          overflow-y: auto;
          padding: 0 12px;
        }

        .nav-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          color: #94A3B8;
          text-decoration: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          margin-bottom: 4px;
        }

        .nav-item.active {
          background: rgba(16, 185, 129, 0.1);
          color: #10B981;
          font-weight: 600;
        }

        .nav-item:hover:not(.active) {
          background: rgba(255, 255, 255, 0.03);
          color: #F8FAFC;
        }

        .nav-item svg {
          flex-shrink: 0;
          opacity: 0.7;
        }

        .nav-item.active svg {
          opacity: 1;
        }

        .section-title {
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 24px 0 12px 14px;
        }

        .sidebar-footer {
          padding: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .status-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .status-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          background: #10B981;
          border-radius: 50%;
          box-shadow: 0 0 8px #10B981;
        }

        .status-label {
          font-size: 11px;
          font-weight: 700;
          color: #10B981;
          text-transform: uppercase;
        }

        .status-title {
          font-weight: 700;
          font-size: 14px;
          color: #F8FAFC;
          margin-bottom: 4px;
        }

        .status-desc {
          font-size: 12px;
          color: #64748B;
          line-height: 1.4;
        }

        .client-select-wrapper {
          position: relative;
        }

        .client-select {
          width: 100%;
          appearance: none;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 500;
          color: #F8FAFC;
          cursor: pointer;
          outline: none;
          transition: all 0.2s;
        }

        .client-select:focus {
          border-color: #10B981;
          background: rgba(15, 23, 42, 0.8);
        }

        .nav-menu::-webkit-scrollbar { width: 4px; }
        .nav-menu::-webkit-scrollbar-track { background: transparent; }
        .nav-menu::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 4px; }
      `}</style>

      <div className="brand-header">
        <div className="brand-logo-container">
          <Sparkles size={20} color="#FFFFFF" fill="#FFFFFF" />
        </div>
        <div className="brand-text">
          <span className="brand-title">Super Agente</span>
          <span className="brand-subtitle">TV Sertão Livre</span>
        </div>
      </div>

      <nav className="nav-menu">
        <div>
          {navItems.slice(0, 2).map(item => (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`nav-item ${pathname === item.href ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="section-title">Produção</div>
        <div>
          {navItems.slice(2).map(item => (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`nav-item ${pathname === item.href ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="status-card">
          <div className="status-header">
            <div className="status-indicator" />
            <span className="status-label">Agente Ativo</span>
          </div>
          <div className="status-title">Pronto para auxiliar</div>
          <p className="status-desc">Selecione um cliente para contextualizar a IA.</p>
        </div>

        <div className="client-select-wrapper">
          <select
            value={clienteSelecionado}
            onChange={e => setClienteSelecionado(e.target.value)}
            className="client-select"
          >
            <option value="">Selecione um cliente</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
      </div>
    </aside>
  )
}