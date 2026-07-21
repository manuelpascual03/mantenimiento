"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabase";
import { X, UserCheck, FileText } from "lucide-react";

interface AssignmentProps {
  maquina: any;
  onClose: () => void;
  onUpdated: () => void;
}

export function PreventiveAssignmentModal({ maquina, onClose, onUpdated }: AssignmentProps) {
  const [mounted, setMounted] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [tecnicoId, setTecnicoId] = useState(maquina?.tecnico_asignado_id || "");
  
  // Obtenemos la fecha de hoy en formato YYYY-MM-DD como valor por defecto seguro
  const hoy = new Date().toISOString().split("T")[0];
  const [fechaEstimada, setFechaEstimada] = useState(hoy);

  useEffect(() => { 
    setMounted(true);
    const fetchTecnicos = async () => {
      const { data } = await supabase.from("perfiles").select("id, nombre_completo").eq("rol", "operario");
      setTecnicos(data || []);
    };
    fetchTecnicos();
  }, [maquina]);

  const handleSave = async () => {
    setCargando(true);
    try {
      // 1. Actualizamos el técnico por defecto en la máquina si se modificó en el selector
      const { error: errorMaquina } = await supabase
        .from("maquinas")
        .update({ tecnico_asignado_id: tecnicoId || null })
        .eq("id", maquina.id);

      if (errorMaquina) throw errorMaquina;

      // 2. Disparamos una nueva orden de trabajo de tipo preventivo usando la columna nativa fecha_estimada
      const { error: errorOT } = await supabase
        .from("ordenes_trabajo")
        .insert({
          maquina_id: maquina.id,
          tecnico_id: tecnicoId || null,
          descripcion: "Preventivo programado desde el planificador",
          tipo_mantenimiento: "preventivo",
          tipo_ot: "preventivo", // Asignamos tipo_ot consistente con el mantenimiento
          categoria: "maquinaria",
          prioridad: "media",
          estado_ot: "pendiente",
          sector: maquina.sector || "Producción",
          estado_maquina_al_crear: "operativo",
          fecha_estimada: fechaEstimada // Mapeo correcto con tu columna real de Supabase
        });

      if (errorOT) throw errorOT;

      alert("ORDEN DE TRABAJO GENERADA CORRECTAMENTE");
      onUpdated();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setCargando(false);
    }
  };

  if (!mounted || !maquina) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white border border-slate-200 rounded-[32px] p-10 w-full max-w-sm shadow-2xl text-left animate-in zoom-in duration-200">
        
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-300 hover:text-slate-900 transition-colors">
          <X size={20} />
        </button>

        <div className="mb-8">
          <span className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.3em] mb-2 block">Mantenimiento Preventivo</span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            Asignar responsable
          </h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase mt-2">#{maquina.numero_maquina} — {maquina.nombre}</p>
        </div>

        <div className="space-y-6">
          {/* CONTROL 1: SELECCIÓN DE TÉCNICO */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seleccionar Técnico</label>
            <div className="relative">
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-[11px] font-black text-slate-900 uppercase tracking-widest outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                value={tecnicoId}
                onChange={(e) => setTecnicoId(e.target.value)}
              >
                <option value="">Pendiente de asignación</option>
                {tecnicos.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre_completo}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">▼</div>
            </div>
          </div>

          {/* CONTROL 2: SELECCIÓN DE FECHA ESTIMADA (Planeada) */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Ejecución</label>
            <div className="relative">
              <input 
                type="date"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-[11px] font-black text-slate-900 uppercase tracking-widest outline-none focus:border-emerald-500 cursor-pointer"
                value={fechaEstimada}
                onChange={(e) => setFechaEstimada(e.target.value)}
              />
            </div>
          </div>

          {/* BOTÓN VER INSTRUCTIVO: Siempre visible, desactivado estéticamente si no tiene URL cargada */}
          <div className="pt-2">
            <button
              type="button"
              disabled={!maquina.url_instructivo}
              onClick={() => {
                if (maquina.url_instructivo) window.open(maquina.url_instructivo, "_blank");
              }}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-colors border ${
                maquina.url_instructivo
                  ? "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-100 cursor-pointer"
                  : "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
              }`}
            >
              <FileText size={14} />
              {maquina.url_instructivo ? "Ver instructivo" : "Sin instructivo cargado"}
            </button>
          </div>

          {/* ACCIONES FINALES */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
            <button 
              onClick={handleSave}
              disabled={cargando}
              className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserCheck size={14} />
              {cargando ? "GUARDANDO..." : "CONFIRMAR"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}