"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { 
  MessageSquare, Folder, Smartphone, LayoutTemplate, 
  Sparkles, Calendar, DollarSign, History, 
  LayoutDashboard, StickyNote
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

  // Hide on /chat routes — chat has its own sidebar
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
          background: #FFFFFF;
          border-right: 1px solid #E5E7EB;
          display: flex;
          flex-direction: column;
          height: 100vh;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .brand-header {
          padding: 18px 20px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid #F3F4F6;
        }

        .brand-logo {
          width: 36px;
          height: 36px;
          object-fit: contain;
          flex-shrink: 0;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .brand-title {
          font-weight: 700;
          font-size: 15px;
          letter-spacing: -0.02em;
          color: #0F1B33;
        }

        .brand-subtitle {
          font-size: 10px;
          font-weight: 500;
          color: #6B7280;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .nav-menu {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .nav-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 9px 12px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          color: #4B5563;
          text-decoration: none;
          transition: all 0.15s ease;
          margin-bottom: 2px;
          border: 1px solid transparent;
        }

        .nav-item.active {
          background: #F3F4F6;
          color: #0F1B33;
          font-weight: 600;
        }

        .nav-item:hover:not(.active) {
          background: #F9FAFB;
          color: #0F1B33;
        }

        .nav-item svg {
          flex-shrink: 0;
          color: inherit;
        }

        .section-title {
          font-size: 11px;
          font-weight: 600;
          color: #9CA3AF;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin: 20px 0 8px 12px;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid #F3F4F6;
        }

        .plan-card {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 12px;
        }

        .plan-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
        }

        .plan-label {
          font-size: 10px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .plan-name {
          font-weight: 700;
          font-size: 14px;
          margin-bottom: 4px;
          color: #0F1B33;
        }

        .plan-desc {
          font-size: 12px;
          color: #6B7280;
          line-height: 1.5;
          margin-bottom: 12px;
        }

        .plan-btn {
          width: 100%;
          padding: 8px 12px;
          background: #FFFFFF;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .plan-btn:hover {
          background: #F9FAFB;
          border-color: #9CA3AF;
        }

        .client-select {
          width: 100%;
          appearance: none;
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          outline: none;
          transition: all 0.15s ease;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 36px;
        }

        .client-select:focus {
          border-color: #F59E0B;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
        }

        .client-select:hover {
          border-color: #D1D5DB;
        }

        .nav-menu::-webkit-scrollbar {
          width: 6px;
        }
        .nav-menu::-webkit-scrollbar-track {
          background: transparent;
        }
        .nav-menu::-webkit-scrollbar-thumb {
          background: #E5E7EB;
          border-radius: 3px;
        }
        .nav-menu::-webkit-scrollbar-thumb:hover {
          background: #D1D5DB;
        }
      `}</style>

      <div className="brand-header">
        <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/10">
          <Sparkles size={20} color="#FFFFFF" fill="currentColor" />
        </div>
        <div className="brand-text">
          <span className="brand-title">Super Agente</span>
          <span className="brand-subtitle">Inteligência que resolve</span>
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
        <div className="plan-card">
          <div className="plan-header">
            <Sparkles size={14} color="#F59E0B" />
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