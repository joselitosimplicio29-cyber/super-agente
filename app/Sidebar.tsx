"use client"

import Link from "next/link"

const navItems = [
    { href: "/chat", label: "Chat", icon: "💬" },
  { href: "/",           label: "Dashboard",  icon: "⬛" },
  { href: "/gerar",      label: "Gerar",      icon: "✨" },
  { href: "/midia",      label: "Mídia",      icon: "🎬" },
  { href: "/clientes",   label: "Clientes",   icon: "👥" },
  { href: "/agenda",     label: "Agenda",     icon: "📅" },
  { href: "/financeiro", label: "Financeiro", icon: "💰" },
  { href: "/historico",  label: "Histórico",  icon: "📋" },
  { href: "/kanban",     label: "Kanban",     icon: "🗂️" },
  { href: "/notas",      label: "Notas",      icon: "📝" },
]

export default function Sidebar() {
  return (
    <aside style={{ width: 200, background: "#1E293B", minHeight: "100vh", padding: "24px 0", display: "flex", flexDirection: "column", gap: 4, borderRight: "1px solid #ffffff10", flexShrink: 0 }}>
      <div style={{ padding: "0 16px 24px", borderBottom: "1px solid #ffffff10", marginBottom: 8 }}>
        <span style={{ color: "#F59E0B", fontWeight: 800, fontSize: 16 }}>Super Agente</span>
        <p style={{ color: "#475569", fontSize: 11, margin: "2px 0 0" }}>TV Sertão Livre</p>
      </div>
      {navItems.map(item => (
        <Link key={item.href} href={item.href}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", color: "#94A3B8", textDecoration: "none", fontSize: 14, borderRadius: 8, margin: "0 8px" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#ffffff10")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <span style={{ fontSize: 16 }}>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </aside>
  )
}
