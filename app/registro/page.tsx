"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function Registro() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [mensaje, setMensaje] = useState("");

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: nombre }
      }
    });

    if (error) setMensaje("Error: " + error.message);
    else setMensaje("¡Cuenta creada! Revisa tu email para confirmar.");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 p-6">
      <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 w-full max-w-md shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Crear cuenta Mant X</h1>
        <p className="text-slate-400 text-center mb-8 text-sm">Ingresa tus datos para acceder al CMMS.</p>

        <form onSubmit={handleRegistro} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Nombre Completo</label>
            <input required type="text" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500"
              value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
            <input required type="email" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Contraseña</label>
            <input required type="password" title="Mínimo 6 caracteres" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500"
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-500/20">
            Crear Cuenta
          </button>
        </form>

        {mensaje && <p className="mt-4 text-center text-sm text-emerald-400 bg-emerald-400/10 p-2 rounded">{mensaje}</p>}
        
        <p className="mt-6 text-center text-slate-500 text-sm">
          ¿Ya tienes cuenta? <Link href="/login" className="text-blue-400 hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}