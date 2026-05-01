"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { 
  Zap, Home, MessageSquare, Folder, Image as ImageIcon, 
  FileText, Smartphone, LayoutTemplate, 
  Sparkles, Calendar, DollarSign, History, 
  LayoutDashboard, StickyNote, Settings
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
          background: #020617;
          border-right: 1px solid rgba(255,255,255,0.05);
          display: flex;
          flex-direction: column;
          height: 100vh;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .brand-header {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(to bottom, rgba(16, 185, 129, 0.05), transparent);
        }

        .brand-title {
          font-weight: 700;
          font-size: 19px;
          letter-spacing: -0.03em;
          color: #F8FAFC;
          background: linear-gradient(to right, #F8FAFC, #94A3B8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .nav-menu {
          flex: 1;
          overflow-y: auto;
          padding: 12px 16px;
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
          border: 1px solid transparent;
        }

        .nav-item.active {
          background: rgba(16, 185, 129, 0.1);
          color: #10B981;
          border: 1px solid rgba(16, 185, 129, 0.2);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .nav-item:hover:not(.active) {
          background: rgba(255, 255, 255, 0.03);
          color: #F8FAFC;
          transform: translateX(4px);
        }

        .section-title {
          font-size: 11px;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 28px 0 12px 14px;
        }

        .sidebar-footer {
          padding: 20px;
          border-top: 1px solid rgba(255,255,255,0.05);
          background: rgba(0,0,0,0.2);
        }

        .plan-card {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.4) 100%);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 20px;
          padding: 18px;
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
        }

        .plan-card::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .plan-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .plan-label {
          font-size: 11px;
          font-weight: 600;
          color: #10B981;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .plan-name {
          font-weight: 700;
          font-size: 15px;
          margin-bottom: 6px;
          color: #F8FAFC;
        }

        .plan-desc {
          font-size: 12px;
          color: #94A3B8;
          line-height: 1.6;
          margin-bottom: 16px;
        }

        .plan-btn {
          width: 100%;
          padding: 10px;
          background: #10B981;
          border: none;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          color: #FFFFFF;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }

        .plan-btn:hover {
          background: #059669;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
        }

        .client-select {
          width: 100%;
          appearance: none;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 500;
          color: #F8FAFC;
          cursor: pointer;
          outline: none;
          transition: all 0.2s;
        }

        .client-select:focus {
          border-color: #10B981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
        }
      `}</style>

      <div className="brand-header">
        <Zap size={24} fill="#FACC15" color="#FACC15" />
        <span className="brand-title">Super Agente</span>
      </div>

      <nav className="nav-menu">
        <div style={{ marginBottom: 16 }}>
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
        <div className="plan-card">
          <div className="plan-header">
            <Sparkles size={16} color="#8B5CF6" />
            <span className="plan-label">Status</span>
          </div>
          <div className="plan-name">Agente Ativo</div>
          <p className="plan-desc">Pronto para auxiliar na sua produção diária.</p>
          <button className="plan-btn">Configurações</button>
        </div>

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
    </aside>
  )
}