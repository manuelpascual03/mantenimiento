"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link"; // Necesario para que el botón funcione

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState(""); 
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);

    try {
      if (isRegistering) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nombre_completo: nombre }
          }
        });
        if (signUpError) throw signUpError;
        alert("Cuenta creada. Ahora podés ingresar.");
        setIsRegistering(false);
      } else {
        // LOGIN
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;

        // VALIDACIÓN DE ESTADO DE ESPERA
        const { data: perfil, error: perfilError } = await supabase
          .from("perfiles")
          .select("rol")
          .eq("id", authData.user.id)
          .single();

        if (perfil?.rol === 'pendiente') {
          await supabase.auth.signOut();
          throw new Error("CUENTA EN ESPERA DE APROBACIÓN");
        }

        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "Error en la autenticación");
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm text-left">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter">SG Mantenimiento</h1>
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
            {isRegistering ? "Crear nueva cuenta" : "Ingreso"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-[10px] font-black text-red-500 uppercase bg-red-50 p-2 rounded-lg text-center border border-red-100">
              {error}
            </p>
          )}

          {isRegistering && (
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nombre Completo</label>
              <input
                type="text"
                placeholder="Juan Pérez"
                className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-sm font-bold outline-none focus:border-emerald-500 transition-all"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-1 text-left">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Email</label>
            <input
              type="email"
              placeholder="tu-usuario@micro.com.ar"
              className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-sm font-bold outline-none focus:border-emerald-500 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1 text-left">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-sm font-bold outline-none focus:border-emerald-500 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-md shadow-emerald-600/10 cursor-pointer disabled:opacity-50"
          >
            {cargando ? "Procesando..." : isRegistering ? "Registrarse" : "Entrar"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-4">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
            }}
            className="text-[10px] font-black text-slate-400 hover:text-emerald-600 uppercase tracking-widest transition-colors cursor-pointer text-left"
          >
            {isRegistering ? "¿Ya tenés cuenta? Ingresá" : "¿No tenés cuenta? Registrate"}
          </button>

          {/* BOTÓN OLVIDASTE TU CONTRASEÑA - USANDO TUS CLASES */}
          {!isRegistering && (
            <Link 
              href="/forgot-password"
              className="text-[10px] font-black text-slate-400 hover:text-emerald-600 uppercase tracking-widest transition-colors cursor-pointer text-left"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}