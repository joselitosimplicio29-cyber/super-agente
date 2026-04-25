"use client"

import Link from "next/link"
import { useState } from "react"

const navItems = [
  { href: "/chat",       label: "Chat",       icon: "💬" },
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
  const [aberto, setAberto] = useState(false)

  return (
    <>
      {/* Botão hamburguer fixo */}
      <button
        onClick={() => setAberto(!aberto)}
        style={{
          position: "fixed", top: 16, left: 16, zIndex: 1000,
          width: 40, height: 40, borderRadius: 10,
          background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)",
          color: "#F59E0B", fontSize: 18, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
        }}>
        {aberto ? "✕" : "☰"}
      </button>

      {/* Overlay escuro */}
      {aberto && (
        <div
          onClick={() => setAberto(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 998,
            background: "rgba(0,0,0,0.5)"
          }}
        />
      )}

      {/* Menu deslizante */}
      <aside style={{
        position: "fixed", top: 0, left: aberto ? 0 : -220,
        width: 220, height: "100vh", zIndex: 999,
        background: "#1E293B", borderRight: "1px solid rgba(255,255,255,0.08)",
        display: "flex", flexDirection: "column",
        transition: "left 0.25s ease",
        boxShadow: aberto ? "4px 0 24px rgba(0,0,0,0.4)" : "none"
      }}>
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <span style={{ color: "#F59E0B", fontWeight: 800, fontSize: 16 }}>Super Agente</span>
          <p style={{ color: "#475569", fontSize: 11, margin: "4px 0 0" }}>TV Sertão Livre</p>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setAberto(false)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", color: "#94A3B8",
                textDecoration: "none", fontSize: 14,
                borderRadius: 8, marginBottom: 2
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </aside>
    </>
  )
}