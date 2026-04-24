export default function Page() {
  return (
    <main style={{
      minHeight: '100vh',
      padding: '40px',
      background: 'linear-gradient(135deg, #0B111F 0%, #0B1220 45%, #111827 100%)',
      color: '#E5E7EB',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>

      {/* HEADER */}
      <div style={{ marginBottom: 30 }}>
        <h1 style={{
          fontSize: 32,
          fontWeight: 700,
          color: '#F59E0B'
        }}>
          Gerar Conteúdo
        </h1>

        <p style={{
          color: '#94A3B8',
          marginTop: 8
        }}>
          Criar posts, matérias e roteiros com IA
        </p>
      </div>

      {/* CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 20
      }}>

        {['Post Instagram', 'Notícia', 'Legenda', 'Roteiro'].map(item => (
          <div
            key={item}
            style={{
              background: 'rgba(17, 24, 39, 0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: 24,
              cursor: 'pointer',
              transition: '0.3s'
            }}
          >
            <h3 style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600
            }}>
              {item}
            </h3>

            <p style={{
              marginTop: 10,
              fontSize: 14,
              color: '#94A3B8'
            }}>
              Clique para acessar
            </p>
          </div>
        ))}

      </div>

    </main>
  )
}