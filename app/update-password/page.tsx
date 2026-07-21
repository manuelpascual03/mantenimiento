"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const router = useRouter();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) setMensaje("Error: " + error.message);
    else {
      setMensaje("Contraseña actualizada. Redirigiendo...");
      setTimeout(() => router.push("/login"), 2000);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white p-10 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
        <h1 className="text-3xl font-bold text-emerald-600 tracking-tighter">Nueva Clave</h1>
        <form onSubmit={handleUpdate} className="space-y-4">
          <input 
            type="password" 
            placeholder="Nueva contraseña" 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] font-black tracking-tight outline-none focus:border-emerald-500 transition-all"
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
          <button className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[14px] font-black hover:bg-emerald-600 transition-all shadow-md">
            Confirmar Cambio
          </button>
        </form>
        {mensaje && <p className="text-center text-[10px] font-black text-emerald-600 uppercase">{mensaje}</p>}
      </div>
    </main>
  );
}