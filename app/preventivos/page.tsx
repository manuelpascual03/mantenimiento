"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { PreventiveAssignmentModal } from "../../components/dashboard/preventive-assignment-modal";

export default function PreventivosPage() {
  const { perfil } = useAuth();
  const [maquinas, setMaquinas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fechaVista, setFechaVista] = useState(new Date());
  const [maquinaSeleccionada, setMaquinaSeleccionada] = useState<any>(null);
  const [mostrarModal, setMostrarModal] = useState(false);

  const hoy = new Date();
  const anio = fechaVista.getFullYear();
  const mes = fechaVista.getMonth();
  
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const primerDiaSemana = new Date(anio, mes, 1).getDay();

  const obtenerMaquinas = async () => {
    try {
      setCargando(true);
      // Disparar la verificación automática al cargar el módulo
      await supabase.rpc("disparar_ordenes_preventivas_diarias");

      const { data, error } = await supabase
        .from("maquinas")
        .select("*, perfiles:tecnico_asignado_id (nombre_completo)")
        .not("proximo_preventivo", "is", null)
        .order("proximo_preventivo", { ascending: true });

      if (error) throw error;
      setMaquinas(data || []);
    } catch (err: any) {
      console.error("Error:", err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { obtenerMaquinas(); }, []);

  const cambiarMes = (offset: number) => {
    setFechaVista(new Date(anio, mes + offset, 1));
  };

  const diasArray = Array.from({ length: diasEnMes }, (_, i) => i + 1);
  const celdasVacias = Array.from({ length: primerDiaSemana }, (_, i) => i);

  const proximos = maquinas.filter(m => {
    const fechaPrev = new Date(m.proximo_preventivo);
    const difDias = (fechaPrev.getTime() - hoy.getTime()) / (1000 * 3600 * 24);
    return difDias >= -1 && difDias <= 30;
  });

  const nombreMes = fechaVista.toLocaleString('es-AR', { month: 'long' });
  const tituloCalendario = `${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} ${anio}`;

  if (cargando) return <div className="p-12 font-black text-slate-400  tracking-tight italic">Sincronizando...</div>;

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50 text-left">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tighter leading-none">Planificación de Preventivos</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* CALENDARIO MES VISTA */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
            <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">{tituloCalendario}</h2>
            <div className="flex gap-2">
              <button onClick={() => cambiarMes(-1)} className="px-3 py-1.5 bg-slate-100 text-slate-900 rounded-xl hover:bg-slate-200 font-black">←</button>
              <button onClick={() => setFechaVista(new Date())} className="px-5 py-1.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Hoy</button>
              <button onClick={() => cambiarMes(1)} className="px-3 py-1.5 bg-slate-100 text-slate-900 rounded-xl hover:bg-slate-200 font-black">→</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center mb-2">
            {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(dia => (
              <div key={dia} className="text-[9px] font-black text-slate-300 uppercase py-1">{dia}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {celdasVacias.map(i => <div key={`empty-${i}`} className="h-16 md:h-20 bg-slate-50/50 rounded-2xl border border-transparent"></div>)}
            {diasArray.map(dia => {
              const fechaBuscada = new Date(anio, mes, dia).toISOString().split('T')[0];
              const mantenimientosDelDia = maquinas.filter(m => m.proximo_preventivo?.startsWith(fechaBuscada));
              const esHoy = hoy.getDate() === dia && hoy.getMonth() === mes && hoy.getFullYear() === anio;

              return (
                <div key={dia} className={`h-16 md:h-20 p-2 border rounded-2xl flex flex-col transition-all ${esHoy ? "border-emerald-500 bg-emerald-50 shadow-sm" : "border-slate-100 bg-white"}`}>
                  <span className={`text-[9px] font-black ${esHoy ? "text-emerald-600" : "text-slate-300"} text-right mb-1`}>{dia}</span>
                  <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
                    {mantenimientosDelDia.map(m => (
                      <div 
                        key={m.id} 
                        onClick={() => { setMaquinaSeleccionada(m); setMostrarModal(true); }}
                        className={`text-[7px] font-black px-1.5 py-1 rounded-md truncate uppercase cursor-pointer transition-colors ${
                          m.preventivo_confirmado 
                            ? "bg-slate-900 text-white hover:bg-emerald-600" 
                            : "bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200"
                        }`}
                        title={m.preventivo_confirmado ? "Fecha Confirmada" : "Fecha Tentativa"}
                      >
                        {m.preventivo_confirmado ? "✓ " : "⏳ "}{m.numero_maquina}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LISTA LATERAL: PRÓXIMOS 30 DÍAS */}
        <div className="bg-white border border-slate-200 rounded-[32px] p-6 flex flex-col h-[550px] md:h-[650px] shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Próximos 30 días</h2>
            {perfil?.rol !== 'operario' && (
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight mt-2">Haz clic para confirmar fecha y asignación</p>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {proximos.length === 0 ? (
              <div className="text-center text-slate-300 text-[9px] font-black uppercase mt-20 italic">Sin tareas próximas.</div>
            ) : (
              proximos.map(m => {
                const fechaPrev = new Date(m.proximo_preventivo);
                const vencido = fechaPrev < new Date(new Date().setHours(0,0,0,0));
                const confirmado = m.preventivo_confirmado;

                return (
                  <div 
                    key={m.id} 
                    onClick={() => { setMaquinaSeleccionada(m); setMostrarModal(true); }}
                    className={`p-4 rounded-[20px] border transition-all cursor-pointer group ${
                      vencido ? 'bg-red-50 border-red-100' : 
                      confirmado ? 'bg-slate-50 border-slate-100 hover:border-emerald-300' :
                      'bg-amber-50/50 border-amber-100 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase text-emerald-600 tracking-tighter">#{m.numero_maquina}</span>
                        <h3 className="font-black text-slate-900 text-[11px] leading-tight uppercase">{m.nombre}</h3>
                      </div>
                      <div className="flex gap-1">
                        {!confirmado && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[7px] font-black rounded-md border border-amber-200 uppercase tracking-tighter">Sin Confirmar</span>}
                        {vencido && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[7px] font-black rounded-md border border-red-200 uppercase tracking-tighter">Atrasado</span>}
                      </div>
                    </div>
                    <div className="space-y-1.5 border-t border-slate-200/50 pt-2">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-slate-400 font-black uppercase tracking-widest">Fecha:</span>
                        <span className={`font-black ${vencido ? 'text-red-600' : 'text-slate-900'}`}>{fechaPrev.toLocaleDateString('es-AR')}</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-slate-400 font-black uppercase tracking-widest">Responsable:</span>
                        <span className="font-black text-slate-900 uppercase truncate max-w-[100px]">{m.perfiles?.nombre_completo || "Pendiente"}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {mostrarModal && (
        <PreventiveAssignmentModal 
          maquina={maquinaSeleccionada} 
          onClose={() => setMostrarModal(false)} 
          onUpdated={() => {
            obtenerMaquinas();
            setMostrarModal(false);
          }} 
        />
      )}
    </main>
  );
}