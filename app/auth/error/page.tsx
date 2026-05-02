export default function AuthError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] w-full" style={{ marginLeft: '-260px' }}>
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Acesso Negado</h1>
        <p className="text-gray-600 mt-3 leading-relaxed">
          Seu email não tem autorização para acessar o Super Agente.
        </p>
        <p className="text-sm text-gray-500 mt-6 pt-6 border-t border-gray-100">
          Entre em contato com o administrador do sistema.
        </p>
        <a href="/login" className="mt-6 inline-block w-full bg-gray-900 text-white font-medium py-3 px-4 rounded-xl hover:bg-gray-800 transition-colors">
          Voltar para o Login
        </a>
      </div>
    </div>
  );
}
