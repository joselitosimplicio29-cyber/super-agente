export default function Page() {
  return (
    <main style={{
      minHeight: '100vh',
      padding: '40px',
      background: 'linear-gradient(135deg, #0B111F 0%, #0B1220 45%, #111827 100%)',
      color: '#E5E7EB',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>

      <h1 style={{ fontSize: 32, fontWeight: 700, color: '#F59E0B' }}>
        Histórico
      </h1>

      <p style={{ color: '#94A3B8', marginTop: 10 }}>
        Aqui ficam as atividades e ações realizadas
      </p>

    </main>
  )
}