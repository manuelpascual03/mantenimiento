"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabase";

export function EditOrderModal({ orden, onOrderUpdated }: { orden: any, onOrderUpdated: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [formData, setFormData] = useState({ 
    estado_ot: orden.estado_ot,
    causa_real: orden.causa_real || "" 
  });

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
      const updateData: any = { 
        estado_ot: formData.estado_ot,
        causa_real: formData.causa_real
      };

      const ahora = new Date().toISOString();

      // Hito 2: Guardar fecha_inicio_real al pasar a en progreso
      if ((formData.estado_ot === "en_progreso" || formData.estado_ot === "en_proceso") && !orden.fecha_inicio_real) {
        updateData.fecha_inicio_real = ahora;
      }

      // Hito 3: Guardar fecha_completada al finalizar
      if (formData.estado_ot === "completada" && !orden.fecha_completada) {
        updateData.fecha_completada = ahora;
        if (!orden.fecha_inicio_real) {
          updateData.fecha_inicio_real = ahora;
        }
      }

      const { error } = await supabase
        .from("ordenes_trabajo")
        .update(updateData)
        .eq("id", orden.id);

      if (error) throw error;
      setIsOpen(false);
      onOrderUpdated(); 
    } catch (err: any) {
      alert("Error al actualizar: " + err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="text-slate-400 hover:text-emerald-600 p-1 cursor-pointer transition-colors">✏️</button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>
          
          <div className="relative bg-white border border-slate-200 rounded-[32px] p-10 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-black text-slate-900 mb-6 text-left tracking-tighter">Gestionar OT #{orden.numero_ot}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Diagnóstico Inicial (Supervisor)</p>
                  <p className="text-sm font-medium text-slate-600">{orden.descripcion}</p>
                </div>

                <div className="flex flex-col gap-2 text-left">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Causa Real / Reparación Realizada</label>
                  <textarea 
                    className="bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 min-h-[100px] transition-all"
                    placeholder="Ej: Se reemplazó relé de control quemado..."
                    value={formData.causa_real}
                    onChange={(e) => setFormData({...formData, causa_real: e.target.value})}
                  />
                </div>

                <div className="flex flex-col gap-2 text-left">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Estado Final</label>
                  <select 
                    className="bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all cursor-pointer"
                    value={formData.estado_ot} 
                    onChange={(e) => setFormData({ ...formData, estado_ot: e.target.value })}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_progreso">En Progreso</option>
                    <option value="completada">Completada</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={cargando}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {cargando ? "Guardando..." : "Cerrar y Documentar"}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}