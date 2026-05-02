"use client";
import { signIn } from "next-auth/react";
import { Zap } from "lucide-react";

export default function Login() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F3F4F6] w-full" style={{ marginLeft: '-260px' }}>
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full flex flex-col items-center">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30">
          <Zap size={32} color="#FFFFFF" fill="currentColor" />
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900 tracking-tight">Super Agente</h1>
        <p className="text-gray-500 text-center mb-10 text-sm tracking-wide uppercase font-semibold">Inteligência que resolve</p>
        
        <button
          onClick={() => signIn("google", { callbackUrl: "/chat" })}
          className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm text-gray-700 font-medium"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Entrar com Google
        </button>
      </div>
    </div>
  );
}
