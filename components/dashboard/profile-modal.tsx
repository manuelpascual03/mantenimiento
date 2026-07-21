"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

export function ProfileModal() {
  const { perfil, user, obtenerPerfil } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cargando, setCargando] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre_completo: "",
    rol: "operario"
  });

  useEffect(() => {
    setMounted(true);
    if (perfil) {
      setFormData({
        nombre_completo: perfil.nombre_completo || "",
        rol: perfil.rol || "operario"
      });
    }
  }, [perfil]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validacion para evitar el error de "id de null"
    if (!user?.id) {
      alert("Error: No se encontro una sesion activa");
      return;
    }

    setCargando(true);
    try {
      const { error } = await supabase
        .from("perfiles")
        .update({
          nombre_completo: formData.nombre_completo,
          rol: formData.rol,
          actualizado_at: new Date().toISOString()
        })
        .eq("id", user.id); // Usamos user.id directamente para mayor seguridad

      if (error) throw error;
      
      await obtenerPerfil(user.id);
      setIsOpen(false);
    } catch (err: any) {
      alert("Error al actualizar perfil: " + err.message);
    } finally {
      setCargando(false);
    }
  };

  if (!mounted) return null;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="text-[10px] font-black text-emerald-600 uppercase tracking-tight hover:text-emerald-500 cursor-pointer"
      >
        Editar Perfil
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>
          <div className="relative bg-white border border-slate-200 rounded-3xl p-8 w-full max-w-md shadow-2xl text-left">
            <div className="mb-8">
              <span className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em]">Configuracion de Usuario</span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tighter">Mi Perfil</h2>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre Completo</label>
                  <input 
                    type="text" 
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 outline-none focus:border-emerald-500 transition-colors"
                    value={formData.nombre_completo}
                    onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})}
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Rol en Planta</label>
                  <select 
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 outline-none focus:border-emerald-500 transition-colors"
                    value={formData.rol}
                    onChange={(e) => setFormData({...formData, rol: e.target.value})}
                  >
                    <option value="operario">Operario</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={cargando}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  {cargando ? "Guardando..." : "Actualizar Datos"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}