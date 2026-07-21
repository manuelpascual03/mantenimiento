"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabase";

interface PreventiveConfigProps {
  maquina: any;
  onClose: () => void;
  onUpdated: () => void;
}

export function PreventiveConfigModal({ maquina, onClose, onUpdated }: PreventiveConfigProps) {
  const [mounted, setMounted] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    frecuencia_preventivo_dias: maquina?.frecuencia_preventivo_dias || 0,
    ultimo_preventivo: maquina?.ultimo_preventivo ? new Date(maquina.ultimo_preventivo).toISOString().slice(0, 10) : "",
    tecnico_asignado_id: maquina?.tecnico_asignado_id || ""
  });

  useEffect(() => { 
    setMounted(true);
    const fetchTecnicos = async () => {
      // Cargamos los operarios disponibles [cite: 2026-03-10]
      const { data } = await supabase
        .from("perfiles")
        .select("id, nombre_completo")
        .eq("rol", "operario");
      setTecnicos(data || []);
    };
    fetchTecnicos();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
      const { error } = await supabase
        .from("maquinas")
        .update({
          frecuencia_preventivo_dias: parseInt(formData.frecuencia_preventivo_dias.toString()),
          ultimo_preventivo: formData.ultimo_preventivo || null,
          tecnico_asignado_id: formData.tecnico_asignado_id || null // Guardamos el técnico [cite: 2026-03-10]
        })
        .eq("id", maquina.id);

      if (error) throw error;
      onUpdated();
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    } finally {
      setCargando(false);
    }
  };

  if (!mounted || !maquina) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
      
      <div className="relative bg-white border border-slate-200 rounded-[32px] p-10 w-full max-w-md shadow-2xl text-left animate-in zoom-in duration-200">
        
        <div className="mb-10">
          <span className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.3em] mb-2 block">Ingeniería MiCRO</span>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            Planificar: {maquina.numero_maquina}
          </h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase mt-2">{maquina.nombre}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          <div className="space-y-6">
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Frecuencia (Días)</label>
              <input 
                type="number" 
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 outline-none focus:border-emerald-500 transition-all font-black"
                value={formData.frecuencia_preventivo_dias}
                onChange={(e) => setFormData({...formData, frecuencia_preventivo_dias: e.target.value})}
              />
            </div>

            {/* SELECTOR DE TÉCNICO ASIGNADO [cite: 2026-03-10] */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Técnico Asignado</label>
              <div className="relative">
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[11px] font-black text-slate-900 uppercase tracking-widest outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                  value={formData.tecnico_asignado_id}
                  onChange={(e) => setFormData({...formData, tecnico_asignado_id: e.target.value})}
                >
                  <option value="">Pendiente de asignación</option>
                  {tecnicos.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre_completo}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de último Service</label>
              <input 
                type="date" 
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 outline-none focus:border-emerald-500 transition-all font-black [color-scheme:light]"
                value={formData.ultimo_preventivo}
                onChange={(e) => setFormData({...formData, ultimo_preventivo: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-6 flex gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={cargando}
              className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 shadow-xl shadow-slate-200 transition-all disabled:opacity-50 active:scale-95"
            >
              {cargando ? "Sincronizando..." : "Guardar Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}