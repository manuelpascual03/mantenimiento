"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { NewOrderModal } from "../../components/dashboard/new-order-modal";
import { EditOrderModal } from "../../components/dashboard/edit-order-modal";
import { Building, Wrench, MapPin, X, RefreshCw, ChevronRight, User, Truck, Check } from "lucide-react";

export default function Ordenes() {
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [activeTab, setActiveTab] = useState<'maquinaria' | 'edilicio'>('maquinaria');
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<any>(null);
  const { perfil } = useAuth();

  // ESTADO LOCAL DE FILTRADO POR ESTADO DE ORDEN
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "pendiente" | "en_progreso" | "completada">("todos");

  // Estados para controlar el menú desplegable custom en cascada
  const [menuAbiertoOtId, setMenuAbiertoOtId] = useState<string | null>(null);
  const [subMenuVisible, setSubMenuVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar el menú si se hace click afuera de él
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuAbiertoOtId(null);
        setSubMenuVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const obtenerDatos = async (silencioso = false) => {
    try {
      if (!silencioso) setCargando(true);
      
      // Cargar operarios internos
      const { data: dataTecnicos } = await supabase.from("perfiles").select("id, nombre_completo").eq("rol", "operario");
      setTecnicos(dataTecnicos || []);

      // Cargar proveedores de servicios externos
      const { data: dataProvs } = await supabase.from("proveedores").select("id, nombre").order("nombre", { ascending: true });
      setProveedores(dataProvs || []);

      let query: any = supabase.from("ordenes_trabajo").select(`
        *,
        maquinas (nombre, numero_maquina, sector),
        perfil_creador:perfiles!creado_por (nombre_completo),
        perfil_tecnico:perfiles!tecnico_id (nombre_completo),
        proveedores ! proveedor_id (nombre),
        ot_responsables (
          id,
          tipo,
          tecnico_id,
          proveedor_id,
          perfiles:tecnico_id (nombre_completo),
          proveedores:proveedor_id (nombre)
        )
      `);

      if (perfil?.rol === 'operario') {
        query = query.eq("tecnico_id", perfil.id);
      } else if (perfil?.rol === 'supervisor' && perfil?.sector) {
        const { data: maqSector } = await supabase.from("maquinas").select("id").eq("sector", perfil.sector);
        const idsMaquinas = maqSector?.map(m => m.id) || [];
        const filtroMaquinasString = idsMaquinas.length > 0 ? `maquina_id.in.(${idsMaquinas.join(',')})` : `maquina_id.is.null`;
        query = query.or(`${filtroMaquinasString},sector.eq."${perfil.sector}"`);
      }

      const { data, error } = await query.order("fecha_creacion", { ascending: false });
      if (error) throw error;
      setOrdenes(data || []);
    } catch (err: any) { 
      console.error("Error:", err.message); 
    } finally { 
      if (!silencioso) setCargando(false); 
    }
  };

  // FILTRADO COMBINADO DE CATEGORÍA Y ESTADO
  const ordenesFiltradas = ordenes.filter(ot => {
    const cumpleCategoria = (ot.categoria || 'maquinaria') === activeTab;
    const cumpleEstado =
      filtroEstado === "todos"
        ? true
        : ot.estado_ot === filtroEstado ||
          (filtroEstado === "en_progreso" && ot.estado_ot === "en_proceso");
    return cumpleCategoria && cumpleEstado;
  });

  // Asignación Múltiple / Toggling de Responsables con actualización fluida sin salto
  const toggleResponsable = async (ot: any, tipo: "interno" | "externo" | "externo_general" | "ninguno", targetId: string) => {
    try {
      if (tipo === "ninguno") {
        setOrdenes(prev => prev.map(o => o.id === ot.id ? { ...o, ot_responsables: [], tecnico_id: null, proveedor_id: null, es_externo_general: false } : o));
        
        await supabase.from("ot_responsables").delete().eq("orden_id", ot.id);
        await supabase.from("ordenes_trabajo").update({ tecnico_id: null, proveedor_id: null, es_externo_general: false }).eq("id", ot.id);
        obtenerDatos(true);
        return;
      }

      if (tipo === "externo_general") {
        setOrdenes(prev => prev.map(o => o.id === ot.id ? { ...o, ot_responsables: [], tecnico_id: null, proveedor_id: null, es_externo_general: true } : o));

        await supabase.from("ot_responsables").delete().eq("orden_id", ot.id);
        await supabase.from("ordenes_trabajo").update({ tecnico_id: null, proveedor_id: null, es_externo_general: true }).eq("id", ot.id);
        obtenerDatos(true);
        return;
      }

      const responsablesActuales = ot.ot_responsables || [];
      const yaExiste = responsablesActuales.some((r: any) => 
        tipo === 'interno' ? r.tecnico_id === targetId : r.proveedor_id === targetId
      );

      let nuevosResponsables = [...responsablesActuales];
      if (yaExiste) {
        nuevosResponsables = nuevosResponsables.filter((r: any) => 
          tipo === 'interno' ? r.tecnico_id !== targetId : r.proveedor_id !== targetId
        );
      } else {
        const itemTecnico = tecnicos.find(t => t.id === targetId);
        const itemProveedor = proveedores.find(p => p.id === targetId);
        
        nuevosResponsables.push({
          orden_id: ot.id,
          tipo: tipo,
          tecnico_id: tipo === 'interno' ? targetId : null,
          proveedor_id: tipo === 'externo' ? targetId : null,
          perfiles: tipo === 'interno' && itemTecnico ? { nombre_completo: itemTecnico.nombre_completo } : null,
          proveedores: tipo === 'externo' && itemProveedor ? { nombre: itemProveedor.nombre } : null
        });
      }

      setOrdenes(prev => prev.map(o => o.id === ot.id ? { ...o, ot_responsables: nuevosResponsables, es_externo_general: false } : o));

      if (yaExiste) {
        await supabase.from("ot_responsables").delete().match({
          orden_id: ot.id,
          ...(tipo === 'interno' ? { tecnico_id: targetId } : { proveedor_id: targetId })
        });
      } else {
        await supabase.from("ot_responsables").insert({
          orden_id: ot.id,
          tipo: tipo,
          ...(tipo === 'interno' ? { tecnico_id: targetId } : { proveedor_id: targetId })
        });
      }

      await supabase.from("ordenes_trabajo").update({ es_externo_general: false }).eq("id", ot.id);

      obtenerDatos(true);
    } catch (err: any) { 
      alert("Error: " + err.message); 
    }
  };

  const renderBotonTexto = (ot: any) => {
    if (ot.es_externo_general) return "EXTERNO";

    const resp = ot.ot_responsables || [];
    const nombres: string[] = [];

    resp.forEach((r: any) => {
      if (r.tipo === 'interno' && r.perfiles?.nombre_completo) {
        nombres.push(r.perfiles.nombre_completo);
      } else if (r.tipo === 'externo' && r.proveedores?.nombre) {
        nombres.push(`EXT: ${r.proveedores.nombre}`);
      }
    });

    if (nombres.length === 0) {
      if (ot.proveedores?.nombre) nombres.push(`EXT: ${ot.proveedores.nombre}`);
      else if (ot.perfil_tecnico?.nombre_completo) nombres.push(ot.perfil_tecnico.nombre_completo);
    }

    if (nombres.length === 0) return "Sin Asignar";
    if (nombres.length === 1) return nombres[0];
    return `${nombres[0]} +${nombres.length - 1}`;
  };

  const borrarOrden = async (id: string) => {
    if (!confirm("¿Eliminar esta orden?")) return;
    await supabase.from("ordenes_trabajo").delete().eq("id", id);
    obtenerDatos();
  };

  const formatearFechaHora = (fechaStr: string | null) => {
    if (!fechaStr) return "Pendiente";
    const d = new Date(fechaStr);
    return `${d.toLocaleDateString()} — ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} HS`;
  };

  const calcularTiempoParada = (inicioStr: string, finStr: string | null) => {
    if (!finStr) return "En ejecución";
    const inicio = new Date(inicioStr).getTime();
    const fin = new Date(finStr).getTime();
    const diffMs = fin - inicio;
    if (diffMs <= 0 || isNaN(diffMs)) return "0h 0m";
    
    const diffMins = Math.floor(diffMs / 60000);
    const horas = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${horas} HORAS y ${mins} MINUTOS`;
  };

  const calcularTiempoTrabajo = (inicioStr: string | null, finStr: string | null) => {
    if (!inicioStr) return "Pendiente";
    const inicio = new Date(inicioStr).getTime();
    const fin = finStr ? new Date(finStr).getTime() : new Date().getTime();
    const diffMs = fin - inicio;
    if (diffMs <= 0 || isNaN(diffMs)) return "0h 0m";
    
    const diffMins = Math.floor(diffMs / 60000);
    const horas = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${horas} HORAS y ${mins} MINUTOS`;
  };

  useEffect(() => { obtenerDatos(); }, [perfil]);

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-slate-50 text-left">
      <div className="h-[env(safe-area-inset-top)] w-full md:hidden" />

      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">Gestión de OT</h1>
            <button 
              onClick={() => obtenerDatos()} 
              disabled={cargando}
              className={`p-2 rounded-xl border border-slate-200 bg-white shadow-sm transition-all active:scale-90 ${cargando ? 'animate-spin text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}
            >
              <RefreshCw size={16} />
            </button>
          </div>
          <p className="text-emerald-600 tracking-tight italic font-medium">
            {cargando ? "Actualizando..." : ""}
          </p>
        </div>
        {(perfil?.rol === 'admin' || perfil?.rol === 'supervisor') && (
          <NewOrderModal onOrderCreated={obtenerDatos} />
        )}
      </div>

      {/* PESTAÑAS DE CATEGORÍA Y DESPLEGABLE NEUTRO DE FILTRADO */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 border-b border-slate-200 pb-4">
        <div className="flex gap-4">
          <button onClick={() => setActiveTab('maquinaria')} className={`pb-2 px-2 flex-1 md:flex-none flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'maquinaria' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400'}`}>
            <Wrench size={14} /> Maquinaria
          </button>
          <button onClick={() => setActiveTab('edilicio')} className={`pb-2 px-2 flex-1 md:flex-none flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'edilicio' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400'}`}>
            <Building size={14} /> Infraestructura
          </button>
        </div>

        {/* SELECTOR DESPLEGABLE NEUTRO SIN COLORES */}
        <div className="flex items-center gap-2">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as any)}
            className="bg-white border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-sm outline-none focus:border-slate-400 cursor-pointer transition-all w-full md:w-auto"
          >
            <option value="todos">Filtrar</option>
            <option value="pendiente">Pendientes</option>
            <option value="en_progreso">En Progreso</option>
            <option value="completada">Completadas</option>
          </select>
        </div>
      </div>

      {/* TABLA DESKTOP CON SEMÁFORO */}
      <div className="hidden md:block bg-white rounded-[32px] border border-slate-200 overflow-visible shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-400 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">N OT</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">{activeTab === 'maquinaria' ? 'Equipo / Activo' : 'Sector / Área'}</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Estado</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Responsable</th>
              <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-900">
            {cargando && ordenes.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-black uppercase text-[10px]">Sincronizando...</td></tr>
            ) : ordenesFiltradas.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">No tienes órdenes asignadas.</td></tr>
            ) : (
              ordenesFiltradas.map((ot) => (
                <tr key={ot.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-emerald-600 font-black">#{ot.numero_ot}</td>
                  <td className="px-6 py-4 cursor-pointer" onClick={() => setOrdenSeleccionada(ot)}>
                    <div className="flex items-center gap-2">
                      {ot.categoria === 'edilicio' ? (
                        <><MapPin className="w-3.5 h-3.5 text-amber-500" /><span className="text-sm font-black text-slate-900 uppercase hover:underline">{ot.sector || 'Sin sector'}</span></>
                      ) : (
                        <><span className="font-mono text-emerald-600 font-black text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">#{ot.maquinas?.numero_maquina}</span><span className="text-sm font-black text-slate-900 uppercase hover:underline">{ot.maquinas?.nombre}</span></>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        ot.estado_ot === 'pendiente' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 
                        ot.estado_ot === 'en_progreso' || ot.estado_ot === 'en_proceso' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]' : 
                        'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                      }`} />
                      <span className="text-[9px] font-black uppercase tracking-tighter text-slate-500">
                        {ot.estado_ot?.replace('_', ' ')}
                      </span>
                    </div>
                  </td>

                  {/* MENÚ CASCADA FLOTANTE PERSONALIZADO CON SELECCIÓN MÚLTIPLE */}
                  <td className="px-6 py-4 text-center relative">
                    {perfil?.rol === 'admin' && ot.estado_ot === 'pendiente' ? (
                      <div className="inline-block text-left" ref={menuAbiertoOtId === ot.id ? menuRef : null}>
                        <button
                          onClick={() => {
                            if (menuAbiertoOtId === ot.id) {
                              setMenuAbiertoOtId(null);
                              setSubMenuVisible(false);
                            } else {
                              setMenuAbiertoOtId(ot.id);
                              setSubMenuVisible(false);
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 text-[10px] font-black uppercase rounded-md p-1 outline-none text-slate-700 cursor-pointer flex items-center justify-between gap-1 px-2"
                        >
                          <span>{renderBotonTexto(ot)}</span>
                          <span className="text-[8px] text-slate-400">▼</span>
                        </button>

                        {/* MENÚ PRINCIPAL DEL DESPLEGABLE */}
                        {menuAbiertoOtId === ot.id && (
                          <div className="absolute left-1/2 -translate-x-1/2 mt-1 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-1 duration-100">
                            <button
                              onClick={() => toggleResponsable(ot, "ninguno", "")}
                              className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase text-slate-400 hover:bg-slate-50 transition-colors"
                            >
                              Borrar Asignaciones
                            </button>
                            
                            <div className="border-t border-slate-100 my-1" />

                            {/* Opción Técnicos Internos */}
                            <div className="relative group">
                              <div className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-black uppercase text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                                <span className="flex items-center gap-1.5"><User size={12} className="text-slate-400" /> Interno</span>
                                <ChevronRight size={12} className="text-slate-400" />
                              </div>
                              
                              <div className="absolute left-full top-0 ml-0.5 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl hidden group-hover:block py-2 max-h-48 overflow-y-auto z-[70]">
                                {tecnicos.length === 0 ? (
                                  <span className="block px-4 py-2 text-[9px] italic text-slate-400 uppercase">No hay operarios</span>
                                ) : (
                                  tecnicos.map(t => {
                                    const asignado = (ot.ot_responsables || []).some((r: any) => r.tipo === 'interno' && r.tecnico_id === t.id) || ot.tecnico_id === t.id;
                                    return (
                                      <button
                                        key={t.id}
                                        onClick={() => toggleResponsable(ot, "interno", t.id)}
                                        className={`w-full text-left px-4 py-1.5 text-[10px] font-bold uppercase transition-colors flex items-center justify-between ${asignado ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                      >
                                        <span>{t.nombre_completo}</span>
                                        {asignado && <Check size={12} className="text-emerald-600" />}
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                            {/* Opción Servicio Externo */}
                            <div 
                              className="relative"
                              onMouseEnter={() => setSubMenuVisible(true)}
                              onMouseLeave={() => setSubMenuVisible(false)}
                            >
                              <div className={`w-full flex items-center justify-between px-4 py-2 text-[10px] font-black uppercase cursor-pointer transition-colors ${subMenuVisible ? 'bg-slate-50 text-emerald-600' : 'text-slate-700 hover:bg-slate-50'}`}>
                                <span className="flex items-center gap-1.5"><Truck size={12} className={subMenuVisible ? 'text-emerald-500' : 'text-slate-400'} /> Externo</span>
                                <ChevronRight size={12} className={subMenuVisible ? 'text-emerald-500' : 'text-slate-400'} />
                              </div>
                              
                              {subMenuVisible && (
                                <div className="absolute left-full top-0 ml-0.5 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent animate-in fade-in slide-in-from-left-1 duration-100 z-[70]">
                                  <button
                                    onClick={() => toggleResponsable(ot, "externo_general", "")}
                                    className={`w-full text-left px-4 py-2 text-[10px] font-black hover:bg-emerald-50 transition-colors border-b border-slate-100 uppercase tracking-tighter flex items-center justify-between ${ot.es_externo_general ? 'bg-amber-50 text-amber-700' : 'text-emerald-600'}`}
                                  >
                                    <span>Externo</span>
                                    {ot.es_externo_general && <Check size={12} className="text-amber-600" />}
                                  </button>
                                  
                                  {proveedores.length === 0 ? (
                                    <span className="block px-4 py-2 text-[9px] italic text-slate-400 uppercase">Sin proveedores</span>
                                  ) : (
                                    proveedores.map(p => {
                                      const asignado = (ot.ot_responsables || []).some((r: any) => r.tipo === 'externo' && r.proveedor_id === p.id) || ot.proveedor_id === p.id;
                                      return (
                                        <button
                                          key={p.id}
                                          onClick={() => toggleResponsable(ot, "externo", p.id)}
                                          className={`w-full text-left px-4 py-1.5 text-[10px] font-bold uppercase transition-colors flex items-center justify-between ${asignado ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                          <span>{p.nombre}</span>
                                          {asignado && <Check size={12} className="text-emerald-600" />}
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>

                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] font-black text-slate-400 uppercase">
                        {renderBotonTexto(ot)}
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-4 items-center">
                      {perfil?.rol !== 'operario' && <EditOrderModal orden={ot} onOrderUpdated={() => obtenerDatos(true)} />}
                      {perfil?.rol === 'admin' && <button onClick={() => borrarOrden(ot.id)} className="text-slate-300 hover:text-red-600 transition-colors text-[10px] font-black uppercase">Borrar</button>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* VISTA MÓVIL (TARJETAS ORIGINALES) */}
      <div className="md:hidden space-y-4 pb-10">
        {ordenesFiltradas.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-black uppercase italic">Sin tareas pendientes</div>
        ) : (
          ordenesFiltradas.map((ot) => (
            <div 
              key={ot.id} 
              onClick={() => setOrdenSeleccionada(ot)}
              className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm active:scale-95 transition-all space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <span className="font-mono text-emerald-600 font-black text-lg">#{ot.numero_ot}</span>
                <div className={`w-3 h-3 rounded-full ${
                  ot.estado_ot === 'pendiente' ? 'bg-red-500' : 
                  ot.estado_ot === 'en_progreso' || ot.estado_ot === 'en_proceso' ? 'bg-amber-400' : 
                  'bg-emerald-500'
                }`} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Equipo / Ubicación</p>
                <span className="text-sm font-black text-slate-900 uppercase leading-tight block">
                  {ot.categoria === 'edilicio' ? ot.sector : `[${ot.maquinas?.numero_maquina}] ${ot.maquinas?.nombre}`}
                </span>
              </div>
              <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase">
                  Resp: {renderBotonTexto(ot)}
                </span>
                <span className={`text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter ${ot.prioridad === 'alta' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>{ot.prioridad || 'normal'}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL DETALLE ORIGINAL */}
      {ordenSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-emerald-600 tracking-tighter">#{ordenSeleccionada.numero_ot}</span>
                <div className={`w-3 h-3 rounded-full ${
                  ordenSeleccionada.estado_ot === 'pendiente' ? 'bg-red-500' : 
                  ordenSeleccionada.estado_ot === 'en_progreso' || ordenSeleccionada.estado_ot === 'en_proceso' ? 'bg-amber-400' : 
                  'bg-emerald-500'
                }`} />
              </div>
              <button onClick={() => setOrdenSeleccionada(null)} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tight mb-3">Descripción de la falla</p>
                <p className="text-sm font-bold text-slate-700 leading-relaxed italic whitespace-pre-wrap">
                  "{ordenSeleccionada.descripcion || 'Sin descripción.'}"
                </p>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-200/60 pb-2">Línea de Tiempo Operativa</p>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-black text-slate-500 uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" /> Parada de máquina:
                    </span>
                    <span className="font-mono font-bold text-slate-800">{formatearFechaHora(ordenSeleccionada.fecha_creacion)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-black text-slate-500 uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> Inicio de trabajo:
                    </span>
                    <span className="font-mono font-bold text-slate-800">{formatearFechaHora(ordenSeleccionada.fecha_inicio_real)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-black text-slate-500 uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Finalización de trabajo:
                    </span>
                    <span className="font-mono font-bold text-slate-800">{formatearFechaHora(ordenSeleccionada.fecha_completada)}</span>
                  </div>
                  
                  {ordenSeleccionada.estado_ot === 'completada' && (
                    <>
                      <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-200/60">
                        <span className="font-black text-emerald-600 uppercase flex items-center gap-2">
                          Tiempo Parada:
                        </span>
                        <span className="font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          {calcularTiempoParada(ordenSeleccionada.fecha_creacion, ordenSeleccionada.fecha_completada)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] pt-1">
                        <span className="font-black text-emerald-600 uppercase flex items-center gap-2">
                          Tiempo Trabajo:
                        </span>
                        <span className="font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          {calcularTiempoTrabajo(ordenSeleccionada.fecha_inicio_real, ordenSeleccionada.fecha_completada)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Estado Actual</span>
                  <span className={`text-[10px] font-black uppercase ${
                    ordenSeleccionada.estado_ot === 'pendiente' ? 'text-red-500' : 
                    ordenSeleccionada.estado_ot === 'en_progreso' || ordenSeleccionada.estado_ot === 'en_proceso' ? 'text-amber-500' : 
                    'text-emerald-500'
                  }`}>
                    {ordenSeleccionada.estado_ot?.replace('_', ' ')}
                  </span>
                </div>
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <span className="text-[8px] font-black text-slate-400 uppercase block mb-1 tracking-widest">Prioridad</span>
                  <span className="text-[10px] font-black text-slate-900 uppercase">{ordenSeleccionada.prioridad || 'Normal'}</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button onClick={() => setOrdenSeleccionada(null)} className="px-8 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl">Entendido</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}