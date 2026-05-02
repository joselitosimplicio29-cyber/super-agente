'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Globe, Briefcase, Trash2, Search, Plus } from 'lucide-react'

interface Client {
  id: string
  nome: string
  nicho: string
  instagram: string
  created_at: string
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  
  // Form state
  const [nome, setNome] = useState('')
  const [instagram, setInstagram] = useState('')
  const [nicho, setNicho] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchClientes()
  }, [])

  async function fetchClientes() {
    setLoading(true)
    try {
      const res = await fetch('/api/cadastrar-cliente')
      const data = await res.json()
      if (data.success) {
        setClientes(data.clientes)
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault()
    if (!nome) return

    setSaving(true)
    try {
      const res = await fetch('/api/cadastrar-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, instagram, nicho })
      })
      const data = await res.json()
      if (data.success) {
        setClientes([data.cliente, ...clientes])
        setShowModal(false)
        setNome('')
        setInstagram('')
        setNicho('')
      }
    } catch (error) {
      console.error('Erro ao adicionar cliente:', error)
    } finally {
      setSaving(false)
    }
  }

  const filteredClientes = clientes.filter(c => 
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.nicho?.toLowerCase().includes(search.toLowerCase()) ||
    c.instagram?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="clientes-container">
      <style>{`
        .clientes-container {
          padding: 40px;
          max-width: 1200px;
          margin: 0 auto;
          color: #F8FAFC;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
        }

        .title-area h1 {
          font-size: 32px;
          font-weight: 800;
          background: linear-gradient(to right, #F8FAFC, #10B981);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 8px;
        }

        .title-area p {
          color: #94A3B8;
          font-size: 16px;
        }

        .actions {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .search-bar {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          width: 300px;
        }

        .search-bar input {
          background: transparent;
          border: none;
          color: white;
          outline: none;
          font-size: 14px;
          width: 100%;
        }

        .btn-primary {
          background: #10B981;
          color: white;
          border: none;
          border-radius: 12px;
          padding: 12px 20px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          background: #059669;
          transform: translateY(-2px);
        }

        .clients-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
        }

        .client-card {
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 24px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .client-card:hover {
          background: rgba(16, 185, 129, 0.05);
          border-color: rgba(16, 185, 129, 0.2);
          transform: translateY(-4px);
        }

        .client-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .client-avatar {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #10B981, #3B82F6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 18px;
          color: white;
        }

        .client-info h3 {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .client-details {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #94A3B8;
          font-size: 13px;
        }

        .detail-item svg {
          color: #10B981;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }

        .modal {
          background: #0F172A;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 32px;
          width: 100%;
          max-width: 450px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .modal h2 {
          margin-bottom: 24px;
          font-size: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          color: #94A3B8;
        }

        .form-group input {
          width: 100%;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 16px;
          color: white;
          outline: none;
        }

        .form-group input:focus {
          border-color: #10B981;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 32px;
        }

        .btn-ghost {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94A3B8;
          padding: 12px 20px;
          border-radius: 12px;
          cursor: pointer;
        }
      `}</style>

      <div className="header">
        <div className="title-area">
          <h1>Clientes</h1>
          <p>Gerencie sua base de clientes e identidades visuais.</p>
        </div>
        <div className="actions">
          <div className="search-bar">
            <Search size={18} color="#64748B" />
            <input 
              type="text" 
              placeholder="Buscar clientes..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} />
            Novo Cliente
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <p>Carregando clientes...</p>
        </div>
      ) : (
        <div className="clients-grid">
          {filteredClientes.map((cliente) => (
            <div key={cliente.id} className="client-card">
              <div className="client-header">
                <div className="client-avatar">
                  {cliente.nome.charAt(0).toUpperCase()}
                </div>
                <div className="client-info" style={{ flex: 1, marginLeft: 16 }}>
                  <h3>{cliente.nome}</h3>
                  <div className="detail-item">
                    <Briefcase size={14} />
                    {cliente.nicho || 'Nicho não definido'}
                  </div>
                </div>
              </div>
              <div className="client-details">
                <div className="detail-item">
                  <Globe size={14} />
                  {cliente.instagram ? `@${cliente.instagram.replace('@', '')}` : 'Sem Instagram'}
                </div>
                <div className="detail-item" style={{ marginTop: 8 }}>
                  <span style={{ opacity: 0.5 }}>Cadastrado em {new Date(cliente.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
              <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
                <button style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#F8FAFC', cursor: 'pointer', fontSize: 12 }}>Editar</button>
                <button style={{ padding: '8px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#EF4444', cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Novo Cliente</h2>
            <form onSubmit={handleAddClient}>
              <div className="form-group">
                <label>Nome do Cliente</label>
                <input 
                  type="text" 
                  required 
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Pizzaria do João"
                />
              </div>
              <div className="form-group">
                <label>Nicho / Ramo</label>
                <input 
                  type="text" 
                  value={nicho}
                  onChange={(e) => setNicho(e.target.value)}
                  placeholder="Ex: Alimentação"
                />
              </div>
              <div className="form-group">
                <label>Instagram</label>
                <input 
                  type="text" 
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="Ex: @pizzaria_joao"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}