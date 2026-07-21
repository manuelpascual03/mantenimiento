"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) setMensaje("Error: " + error.message);
    else setMensaje("¡Listo! Revisá tu mail para el link de acceso.");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white p-10 rounded-[32px] border border-slate-200 shadow-sm space-y-2">
        <h1 className="text-2xl font-black text-slate-900 tracking-tighter">Recuperar Acceso</h1>
        <p className="text-1x1 text-emerald-600 font-bold tracking-tight">Ingresá tu mail de recuperación</p>
        
        <form onSubmit={handleReset} className="space-y-4">
          <input 
            type="email" 
            placeholder="mail@mail.com" 
            className="w-full p-4  border border-slate-200 rounded-2xl text 2x1 font-black tracking-tight outline-none focus:border-emerald-500 transition-all"
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
          <button className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-md">
            Enviar Link de Recuperación
          </button>
        </form>
        {mensaje && <p className="text-center text-[10px] font-black text-emerald-600 uppercase italic">{mensaje}</p>}
      </div>
    </main>
  );
}