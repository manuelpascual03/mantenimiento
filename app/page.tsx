"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { KPICards } from "../components/dashboard/kpi-cards";
import { AssetGrid } from "../components/dashboard/asset-grid";
import { NewOrderModal } from "../components/dashboard/new-order-modal";
import { PerformanceCharts } from "../components/dashboard/performance-charts";
import { Brain, Sparkles, X } from "lucide-react";

export default function Home() {
  const { perfil } = useAuth();
  const [stats, setStats] = useState({ 
    pendientes: 0, 
    totalMaquinas: 0, 
    disponibilidad: 100, 
    mttr: 0, 
    mtbf: 0,
    horasParadaAnual: 0,
    costoParadaAnual: 0
  });
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [misTareas, setMisTareas] = useState<any[]>([]);
  const [cargandoTareas, setCargandoTareas] = useState(false);

  const [mtbfPorMaquina, setMtbfPorMaquina] = useState<{[key: string]: number}>({});
  const [mttrPorMaquina, setMttrPorMaquina] = useState<{[key: string]: number}>({});

  const [consultandoId, setConsultandoId] = useState<string | null>(null);
  const [respuestasIA, setRespuestasIA] = useState<{[key: string]: string}>({});

  const [reporteGlobal, setReporteGlobal] = useState<string | null>(null);
  const [generandoReporte, setGenerandoReporte] = useState(false);

  // --- BASE PARA COSTOS FINANCIEROS (REQUERIMIENTO PUNTO 4) ---
  const COSTO_POR_HORA_PARADA = 0; 

  // Lógica para disparar el cruce de alertas preventivas y de stock crítico en segundo plano
  const ejecutarAuditoriaAlertas = async () => {
    if (perfil?.rol === 'admin') {
      try {
        await supabase.rpc("verificar_alertas_preventivos_y_stock");
      } catch (error) {
        console.error("Error al auditar alertas de pañol/preventivos:", error);
      }
    }
  };

  const obtenerStats = async () => {
    try {
      const filtroSector = (perfil?.rol === 'supervisor' && perfil?.sector) ? perfil.sector : null;

      let maqQuery = supabase.from("maquinas").select("id, estado, fecha_creacion, sector");
      if (filtroSector) maqQuery = maqQuery.eq("sector", filtroSector);
      const { data: maquinas } = await maqQuery;
      
      const total = maquinas?.length || 0;
      const idsMaquinas = maquinas?.map(m => m.id) || [];

      const filtroMaquinasString = idsMaquinas.length > 0 ? `maquina_id.in.(${idsMaquinas.join(',')})` : `maquina_id.is.null`;

      let historyQuery = supabase.from("ordenes_trabajo").select("*");
      if (filtroSector) {
        historyQuery = historyQuery.or(`${filtroMaquinasString},sector.eq."${filtroSector}"`);
      }
      const { data: history } = await historyQuery.order("fecha_creacion", { ascending: true });

      const eventos: any[] = [];
      const indStats: {[key: string]: { mttr: number, fallas: number }} = {};
      maquinas?.forEach(m => { indStats[m.id] = { mttr: 0, fallas: 0 }; });

      const anioActual = new Date().getFullYear();
      let minutosTotalesParadaAnual = 0;

      (history || []).forEach((ot) => {
        if (ot.fecha_creacion && ot.maquina_id && indStats[ot.maquina_id]) {
          eventos.push({ time: new Date(ot.fecha_creacion).getTime(), tipo: 'falla', id: ot.maquina_id, duracion: 0 });
          indStats[ot.maquina_id].fallas++;
        }
        if (ot.fecha_completada && ot.maquina_id && indStats[ot.maquina_id]) {
          const duracion = (new Date(ot.fecha_completada).getTime() - new Date(ot.fecha_creacion).getTime()) / 60000;
          eventos.push({ time: new Date(ot.fecha_completada).getTime(), tipo: 'reparacion', id: ot.maquina_id, duracion });
          indStats[ot.maquina_id].mttr += duracion;

          // CORRECCIÓN MATEMÁTICA Y FILTRADO ESTRICTO REAL DE PUNTOS DE PARADA
          const esDeMaquinaria = ot.categoria !== "edilicio";
          const esAnioActual = new Date(ot.fecha_completada).getFullYear() === anioActual;
          const estaCompletada = ot.estado_ot === "completada";
          const provocoParadaReal = ot.estado_maquina_al_crear === "parada";

          // Solo acumulamos si cumple rigurosamente todas las condiciones operativas de parada real
          if (esDeMaquinaria && esAnioActual && estaCompletada && provocoParadaReal && duracion > 0) {
            minutosTotalesParadaAnual += duracion;
          }
        }
      });

      // Conversión de minutos limpios filtrados a Horas reales con un decimal
      const horasParadaAnualCalculadas = minutosTotalesParadaAnual > 0 
        ? parseFloat((minutosTotalesParadaAnual / 60).toFixed(1))
        : 0;
        
      const costoParadaAnualCalculado = horasParadaAnualCalculadas * COSTO_POR_HORA_PARADA;

      eventos.sort((a, b) => a.time - b.time);
      let paradas = new Set();
      let mttrTotalGlobal = 0;
      let reparacionesGlobal = 0;
      const chartData: any[] = [];

      eventos.forEach(ev => {
        if (ev.tipo === 'falla') paradas.add(ev.id);
        else { paradas.delete(ev.id); mttrTotalGlobal += ev.duracion; reparacionesGlobal++; }
        
        const dispPunto = total > 0 ? ((total - paradas.size) / total) * 100 : 100;
        const mttrPunto = reparacionesGlobal > 0 ? mttrTotalGlobal / reparacionesGlobal : 0;
        
        chartData.push({
          fecha: new Date(ev.time).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }),
          disponibilidad: Math.round(dispPunto),
          mttr: Math.round(mttrPunto)
        });
      });

      const dataProcesada = chartData.slice(-30);
      const paradasAhora = maquinas?.filter(m => m.estado === 'parada').length || 0;

      const ahora = new Date().getTime();
      let tiempoTotalFlota = 0;
      
      const mtbfMap: {[key: string]: number} = {};
      const mttrMap: {[key: string]: number} = {};
      maquinas?.forEach(m => {
        const creacion = new Date(m.fecha_creacion).getTime();
        const tiempoTotalM = (ahora - creacion) / 60000;
        tiempoTotalFlota += tiempoTotalM;
        
        const uptimeM = tiempoTotalM - indStats[m.id].mttr;
        mtbfMap[m.id] = indStats[m.id].fallas > 0 ? Math.round((uptimeM / indStats[m.id].fallas) / 60) : 0;
        mttrMap[m.id] = indStats[m.id].fallas > 0 ? Math.round(indStats[m.id].mttr / indStats[m.id].fallas) : 0;
      });

      setMtbfPorMaquina(mtbfMap);
      setMttrPorMaquina(mttrMap);

      const uptimeTotalGlobal = tiempoTotalFlota - mttrTotalGlobal;
      const mtbfGlobal = reparacionesGlobal > 0 ? uptimeTotalGlobal / reparacionesGlobal : 0;

      let pendQuery = supabase.from("ordenes_trabajo").select("*", { count: 'exact', head: true }).eq("estado_ot", "pendiente");
      if (filtroSector) {
        pendQuery = pendQuery.or(`${filtroMaquinasString},sector.eq."${filtroSector}"`);
      }
      const { count: pendientes } = await pendQuery;

      setStats({
        pendientes: pendientes || 0,
        totalMaquinas: total,
        disponibilidad: Math.round(total > 0 ? ((total - paradasAhora) / total) * 100 : 100),
        mttr: dataProcesada.length > 0 ? dataProcesada[dataProcesada.length - 1].mttr : 0,
        mtbf: Math.round(mtbfGlobal / 60),
        horasParadaAnual: horasParadaAnualCalculadas,
        costoParadaAnual: costoParadaAnualCalculado
      });
      setHistoricalData(dataProcesada);
    } catch (err) { console.error(err); }
  };

  const obtenerMisTareas = async () => {
    if (!perfil?.id || perfil.rol !== 'operario') return;
    try {
      setCargandoTareas(true);
      const { data, error } = await supabase.from("ordenes_trabajo").select("*, maquinas(*)").eq("tecnico_id", perfil.id).in("estado_ot", ["pendiente", "en_progreso"]).order("prioridad", { ascending: false });
      if (error) throw error;
      setMisTareas(data || []);
    } catch (err) { console.error(err); }
    finally { setCargandoTareas(false); }
  };

  const consultarIA = async (tarea: any) => {
    setConsultandoId(tarea.id);
    try {
      const { data: historial } = await supabase.from("ordenes_trabajo").select("descripcion, causa_real").eq("maquina_id", tarea.maquina_id).eq("estado_ot", "completada").limit(2);
      const response = await fetch('/api/ai-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: tarea.descripcion,
          maquina: tarea.maquinas?.nombre,
          historial: historial || []
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setRespuestasIA(prev => ({ ...prev, [tarea.id]: data.response }));
    } catch (err) {
      setRespuestasIA(prev => ({ ...prev, [tarea.id]: "El asistente no está disponible ahora." }));
    } finally {
      setConsultandoId(null);
    }
  };

  const generarReporteAdmin = async () => {
    setGenerandoReporte(true);
    try {
      const resumenPlanta = { indicadores: stats, total_maquinas: stats.totalMaquinas };
      const response = await fetch('/api/ai-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: "Generar un reporte ejecutivo del estado de la planta.",
          maquina: "Dashboard Global",
          historial: resumenPlanta
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setReporteGlobal(data.response);
    } catch (err) {
      setReporteGlobal("Error al generar el reporte.");
    } finally {
      setGenerandoReporte(false);
    }
  };

  // Efecto principal para cargas de datos iniciales y sincronización Realtime
  useEffect(() => { 
    obtenerStats(); 
    obtenerMisTareas(); 
    ejecutarAuditoriaAlertas();

    // Suscripción Realtime a la tabla de notificaciones para captar cualquier alerta al instante
    const channel = supabase
      .channel("schema-notificaciones-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones" },
        () => {
          obtenerStats();
          // Forzamos al hook de notificaciones a enterarse de que hay un nuevo cambio
          window.dispatchEvent(new Event("visibilitychange"));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ordenes_trabajo" },
        () => {
          obtenerStats();
          obtenerMisTareas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [perfil]);

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50 text-left">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tighter leading-none">
            {perfil?.sector ? `Panel: ${perfil.sector}` : 'Página principal'}
          </h1>
          <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mt-1">
            {perfil?.rol === 'operario' ? 'Tareas Asignadas' : ''}
          </p>
        </div>
        {perfil?.rol !== 'operario' && <NewOrderModal onOrderCreated={obtenerStats} />}
      </div>
      
      {/* SECCIÓN OPERARIOS: TAREAS */}
      {perfil?.rol === 'operario' && (
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Mis Pendientes</h2>
            <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-3 py-1 rounded-full uppercase">{misTareas.length} Activas</span>
          </div>
          <div className="divide-y divide-slate-100">
            {cargandoTareas ? (<div className="p-12 text-center text-slate-400 italic font-black uppercase text-[10px]">Sincronizando...</div>) : misTareas.length === 0 ? (<div className="p-12 text-center text-slate-400 text-sm font-black uppercase">Sin órdenes asignadas.</div>) : (
              misTareas.map((tarea) => (
                <div key={tarea.id} className="p-6 hover:bg-slate-50 transition-all space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-emerald-600 font-black text-xs">#{tarea.numero_ot}</span>
                        <span className="text-xs font-black text-slate-900 uppercase">
                          <span className="text-emerald-600">[{tarea.maquinas?.numero_maquina}]</span> {tarea.maquinas?.nombre}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 font-bold leading-tight">{tarea.descripcion}</p>
                    </div>
                    <button onClick={() => consultarIA(tarea)} disabled={consultandoId === tarea.id} className="w-full md:w-auto bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-4 py-3 rounded-xl shadow-md active:scale-95 transition-all">{consultandoId === tarea.id ? "Analizando..." : "✨ Diagnóstico IA"}</button>
                  </div>
                  {respuestasIA[tarea.id] && (
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                      <p className="text-xs text-emerald-900 font-black italic leading-relaxed">{respuestasIA[tarea.id]}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECCIÓN ADMIN: KPIs Y CHARTS */}
      {perfil?.rol === 'admin' && (
        <>
          <KPICards 
            pendingCount={stats.pendientes} 
            disponibilidad={stats.disponibilidad} 
            totalMachines={stats.totalMaquinas} 
            mttr={stats.mttr} 
            mtbf={stats.mtbf} 
            horasParadaAnual={stats.horasParadaAnual}
            costoParadaAnual={stats.costoParadaAnual}
          />
          <div className="bg-white p-6 rounded-[32px] border border-slate-200">
            <PerformanceCharts data={historicalData} />
          </div>

          <div className="pt-4 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Estado de Activos</h2>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1 italic">Tiempo real</p>
              </div>
              <button onClick={generarReporteAdmin} disabled={generandoReporte} className="text-[9px] font-black uppercase text-slate-400 hover:text-emerald-600 transition-colors flex items-center gap-2">
                <Brain size={12} /> {generandoReporte ? "Generando..." : "Informe IA"}
              </button>
            </div>

            {reporteGlobal && (
              <div className="bg-slate-900 text-white p-6 rounded-[32px] relative border-l-8 border-emerald-500 shadow-2xl">
                <button onClick={() => setReporteGlobal(null)} className="absolute top-4 right-4 text-white/20 hover:text-white"><X size={16} /></button>
                <p className="text-sm font-bold leading-relaxed pr-8 italic">{reporteGlobal}</p>
              </div>
            )}

            <AssetGrid mtbfData={mtbfPorMaquina} mttrData={mttrPorMaquina} filtroSector={perfil?.sector} />
          </div>
        </>
      )}
    </main>
  );
}