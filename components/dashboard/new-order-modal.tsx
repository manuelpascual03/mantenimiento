"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Building, Settings, MapPin } from "lucide-react"; // Sumamos MapPin para el sector

export function NewOrderModal({ onOrderCreated }: { onOrderCreated: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [maquinas, setMaquinas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [categoria, setCategoria] = useState<'maquinaria' | 'edilicio'>('maquinaria');
  const { user } = useAuth();

  useEffect(() => {
    setMounted(true);
    const fetchMaquinas = async () => {
      const { data } = await supabase.from("maquinas").select("id, nombre, numero_maquina").order("numero_maquina");
      setMaquinas(data || []);
    };
    fetchMaquinas();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return alert("Sesión no válida");
    
    setCargando(true);
    const formData = new FormData(e.currentTarget);
    const maquinaId = categoria === 'maquinaria' ? formData.get("maquina_id") : null;
    const sector = categoria === 'edilicio' ? formData.get("sector") : null;

    try {
      const { data: nuevaOT, error } = await supabase
        .from("ordenes_trabajo")
        .insert([{
          maquina_id: maquinaId,
          categoria: categoria,
          sector: sector, // Guardamos el sector edilicio
          descripcion: formData.get("descripcion"),
          prioridad: formData.get("prioridad"),
          tipo_mantenimiento: formData.get("tipo_mantenimiento"),
          creado_por: user.id,
          estado_maquina_al_crear: categoria === 'maquinaria' ? formData.get("estado_maquina") : 'operativo'
        }])
        .select("*, maquinas(nombre)")
        .single();

      if (error) throw error;

      if (nuevaOT) {
        fetch("/api/notify-admin-ot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            numero_ot: nuevaOT.numero_ot,
            maquina_nombre: nuevaOT.categoria === 'edilicio' ? `Edilicio: ${sector}` : nuevaOT.maquinas?.nombre,
            descripcion: nuevaOT.descripcion,
            prioridad: nuevaOT.prioridad
          })
        }).catch(err => console.error("Error mail:", err));
      }

      onOrderCreated(); 
      setIsOpen(false);
      alert("Orden #" + nuevaOT.numero_ot + " generada.");

    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-sm">
        + Nueva Orden
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>
          <div className="relative bg-white border border-slate-200 rounded-[32px] p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
            
            <div className="mb-8">
              <span className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em]">Solicitud de Servicio</span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tighter">Nueva Orden de Trabajo</h2>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
              <button type="button" onClick={() => setCategoria('maquinaria')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${categoria === 'maquinaria' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>
                <Settings size={14} /> Maquinaria
              </button>
              <button type="button" onClick={() => setCategoria('edilicio')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${categoria === 'edilicio' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>
                <Building size={14} /> Edilicio
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              <div className="space-y-4">
                {/* CAMPO DINÁMICO: Máquina o Sector [cite: 2026-02-27] */}
                {categoria === 'maquinaria' ? (
                  <div className="flex flex-col gap-2 animate-in slide-in-from-top-1 duration-200">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Máquina Afectada</label>
                    <select name="maquina_id" required className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 outline-none focus:border-emerald-500 transition-colors">
                      <option value="">Seleccionar equipo...</option>
                      {maquinas.map(m => (
                        <option key={m.id} value={m.id}>[{m.numero_maquina}] {m.nombre}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 animate-in slide-in-from-top-1 duration-200">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <MapPin size={10} className="text-emerald-600" /> Sector / Área Afectada
                    </label>
                    <input name="sector" required type="text" className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 outline-none focus:border-emerald-500 transition-colors" placeholder="Ej: Baños, Oficinas..." />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción del Problema</label>
                  <textarea name="descripcion" required rows={3} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 outline-none focus:border-emerald-500 transition-colors resize-none" placeholder="¿Qué necesita reparación?"></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prioridad</label>
                    <select name="prioridad" className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 outline-none focus:border-emerald-500 transition-colors">
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                      <option value="critica">Crítica</option>
                      <option value="baja">Baja</option>
                    </select>
                  </div>
                  {categoria === 'maquinaria' && (
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado del Equipo</label>
                      <select name="estado_maquina" className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 outline-none focus:border-emerald-500 transition-colors">
                        <option value="parada">Parada (No operativa)</option>
                        <option value="operativo_con_falla">Operativa con Falla</option>
                      </select>
                    </div>
                  )}
                </div>
                <input type="hidden" name="tipo_mantenimiento" value="correctivo" />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
                <button type="submit" disabled={cargando} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50">
                  {cargando ? "Generando..." : "Crear Orden"}
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