"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabase";
import { X, UserCheck, FileText, Calendar, Edit2, Lock, CheckCircle2, RotateCcw, User, Truck, Check } from "lucide-react";

interface AssignmentProps {
  maquina: any;
  onClose: () => void;
  onUpdated: () => void;
}

export function PreventiveAssignmentModal({ maquina, onClose, onUpdated }: AssignmentProps) {
  const [mounted, setMounted] = useState(false);
  const [cargando, setCargando] = useState(false);
  
  // Listas de datos
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);

  // Estados de Selección
  const [tecnicosSeleccionados, setTecnicosSeleccionados] = useState<string[]>(
    maquina?.tecnico_asignado_id ? [maquina.tecnico_asignado_id] : []
  );
  const [proveedoresSeleccionados, setProveedoresSeleccionados] = useState<string[]>([]);
  const [esExternoGeneral, setEsExternoGeneral] = useState(Boolean(maquina?.es_externo_general));

  // Control del Menú Desplegable
  const [tabResponsable, setTabResponsable] = useState<"interno" | "externo">("interno");

  const fechaExistente = maquina?.proximo_preventivo 
    ? new Date(maquina.proximo_preventivo).toISOString().split("T")[0] 
    : new Date().toISOString().split("T")[0];

  const [fechaEstimada, setFechaEstimada] = useState(fechaExistente);
  const [bloqueado, setBloqueado] = useState(Boolean(maquina?.preventivo_confirmado));

  useEffect(() => {
    setMounted(true);
    const fetchData = async () => {
      // Cargar operarios
      const { data: dataTecnicos } = await supabase.from("perfiles").select("id, nombre_completo").eq("rol", "operario");
      setTecnicos(dataTecnicos || []);

      // Cargar proveedores externos
      const { data: dataProvs } = await supabase.from("proveedores").select("id, nombre").order("nombre", { ascending: true });
      setProveedores(dataProvs || []);
    };
    fetchData();
  }, [maquina]);

  // Manejadores de Toggling
  const toggleTecnico = (id: string) => {
    setEsExternoGeneral(false);
    setTecnicosSeleccionados(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleProveedor = (id: string) => {
    setEsExternoGeneral(false);
    setProveedoresSeleccionados(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleExternoGeneral = () => {
    setEsExternoGeneral(prev => !prev);
    if (!esExternoGeneral) {
      setTecnicosSeleccionados([]);
      setProveedoresSeleccionados([]);
    }
  };

  const handleSave = async () => {
    setCargando(true);
    try {
      // Primer técnico como fallback para compatibilidad previa
      const primerTecnico = tecnicosSeleccionados.length > 0 ? tecnicosSeleccionados[0] : null;

      const { error: errorMaquina } = await supabase
        .from("maquinas")
        .update({ 
          tecnico_asignado_id: primerTecnico,
          proximo_preventivo: fechaEstimada ? new Date(fechaEstimada).toISOString() : null,
          preventivo_confirmado: true
        })
        .eq("id", maquina.id);

      if (errorMaquina) throw errorMaquina;

      alert("PROGRAMACIÓN CONFIRMADA CON ÉXITO");
      onUpdated();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleDesprogramar = async () => {
    if (!confirm("¿Deseas liberar/desprogramar esta fecha? Volverá al estado tentativo sin confirmar.")) return;
    
    setCargando(true);
    try {
      const { error: errorMaquina } = await supabase
        .from("maquinas")
        .update({ 
          preventivo_confirmado: false,
          tecnico_asignado_id: null
        })
        .eq("id", maquina.id);

      if (errorMaquina) throw errorMaquina;

      alert("PREVENTIVO LIBERADO CORRECTAMENTE");
      onUpdated();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setCargando(false);
    }
  };

  // Texto resumido para la vista del selector
  const renderResumenResponsables = () => {
    if (esExternoGeneral) return "EXTERNO GENERAL";
    const nombres: string[] = [];

    tecnicosSeleccionados.forEach(id => {
      const t = tecnicos.find(item => item.id === id);
      if (t) nombres.push(t.nombre_completo);
    });

    proveedoresSeleccionados.forEach(id => {
      const p = proveedores.find(item => item.id === id);
      if (p) nombres.push(`EXT: ${p.nombre}`);
    });

    if (nombres.length === 0) return "Sin Asignar / Pendiente";
    if (nombres.length === 1) return nombres[0];
    return `${nombres[0]} +${nombres.length - 1} asignados`;
  };

  if (!mounted || !maquina) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white border border-slate-200 rounded-[32px] p-8 w-full max-w-sm shadow-2xl text-left animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-300 hover:text-slate-900 transition-colors">
          <X size={20} />
        </button>

        <div className="mb-6">
          <span className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.3em] mb-2 flex items-center gap-1.5">
            <CheckCircle2 size={12} /> Mantenimiento Preventivo
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            Programar Ejecución
          </h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase mt-2">
            #{maquina.numero_maquina} — {maquina.nombre}
          </p>
        </div>

        <div className="space-y-5">
          {/* CONTROL 1: SELECCIÓN DE FECHA CON BLOQUEO / EDICIÓN */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Calendar size={12} />
                Fecha de Ejecución
              </label>
              {bloqueado && (
                <button
                  type="button"
                  onClick={() => setBloqueado(false)}
                  className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 transition-all"
                >
                  <Edit2 size={10} /> Editar
                </button>
              )}
            </div>

            <div className="relative">
              <input 
                type="date"
                disabled={bloqueado}
                className={`w-full border rounded-2xl p-4 text-[11px] font-black uppercase tracking-widest outline-none transition-all ${
                  bloqueado
                    ? "bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 cursor-pointer shadow-sm"
                }`}
                value={fechaEstimada}
                onChange={(e) => setFechaEstimada(e.target.value)}
              />
              {bloqueado && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Lock size={14} />
                </div>
              )}
            </div>
            {bloqueado ? (
              <span className="text-[9px] font-bold text-emerald-600 ml-1">
                Fecha confirmada por Admin.
              </span>
            ) : (
              <span className="text-[9px] font-bold text-amber-600 ml-1">
                Fecha tentativa (libre / sin confirmar).
              </span>
            )}
          </div>

          {/* CONTROL 2: SELECCIÓN MÚLTIPLE DE RESPONSABLES (INTERNOS / EXTERNOS) */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Asignar Responsables
            </label>
            
            {/* Cabecera / Resumen actual */}
            <div className="bg-slate-900 text-white p-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex justify-between items-center">
              <span>{renderResumenResponsables()}</span>
            </div>

            {/* Pestañas de Cambio */}
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTabResponsable("interno")}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1 ${
                  tabResponsable === "interno" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                }`}
              >
                <User size={12} /> Internos
              </button>
              <button
                type="button"
                onClick={() => setTabResponsable("externo")}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1 ${
                  tabResponsable === "externo" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                }`}
              >
                <Truck size={12} /> Externos
              </button>
            </div>

            {/* Contenedor con Scroll de Opciones */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 max-h-40 overflow-y-auto space-y-1">
              {tabResponsable === "interno" ? (
                tecnicos.length === 0 ? (
                  <span className="block p-2 text-[9px] italic text-slate-400 uppercase">Sin operarios registrados</span>
                ) : (
                  tecnicos.map(t => {
                    const sel = tecnicosSeleccionados.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTecnico(t.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-between ${
                          sel ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span>{t.nombre_completo}</span>
                        {sel && <Check size={12} className="text-emerald-600" />}
                      </button>
                    );
                  })
                )
              ) : (
                <>
                  {/* Comodín Externo General */}
                  <button
                    type="button"
                    onClick={toggleExternoGeneral}
                    className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-between border ${
                      esExternoGeneral ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-white text-emerald-600 border-slate-100 hover:bg-slate-100"
                    }`}
                  >
                    <span>Externo General</span>
                    {esExternoGeneral && <Check size={12} className="text-amber-600" />}
                  </button>

                  {/* Lista de Proveedores Específicos */}
                  {proveedores.map(p => {
                    const sel = proveedoresSeleccionados.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProveedor(p.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-between ${
                          sel ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span>{p.nombre}</span>
                        {sel && <Check size={12} className="text-emerald-600" />}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* BOTÓN VER INSTRUCTIVO */}
          <div className="pt-1">
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

          {/* OPCIÓN DE DESPROGRAMAR / LIBERAR (Solo si estaba confirmado) */}
          {maquina.preventivo_confirmado && (
            <button
              type="button"
              onClick={handleDesprogramar}
              disabled={cargando}
              className="w-full flex items-center justify-center gap-2 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
            >
              <RotateCcw size={12} />
              Liberar
            </button>
          )}

          {/* ACCIONES FINALES */}
          <div className="flex gap-3 pt-2">
            <button 
              onClick={onClose} 
              className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={cargando}
              className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserCheck size={14} />
              {cargando ? "GUARDANDO..." : "CONFIRMAR FECHA"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}