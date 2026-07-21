"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Historial() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [maquinas, setMaquinas] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroMaquina, setFiltroMaquina] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargarDatos = async () => {
    setCargando(true);
    const { data: m } = await supabase.from("maquinas").select("id, nombre, numero_maquina");
    setMaquinas(m || []);

    // Traemos todos los registros completados incluyendo ot_responsables para la asignación múltiple
    let query = supabase
      .from("ordenes_trabajo")
      .select(`
        *,
        maquinas(nombre, numero_maquina),
        perfiles!tecnico_id(nombre_completo),
        proveedores!proveedor_id(nombre),
        ot_responsables(
          id,
          tipo,
          tecnico_id,
          proveedor_id,
          perfiles:tecnico_id(nombre_completo),
          proveedores:proveedor_id(nombre)
        )
      `)
      .eq("estado_ot", "completada");

    if (filtroMaquina) query = query.eq("maquina_id", filtroMaquina);

    const { data } = await query.order("fecha_completada", { ascending: false });
    setRegistros(data || []);
    setCargando(false);
  };

  const maquinasFiltradas = maquinas.filter(m => 
    m.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    m.numero_maquina.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Función para obtener y formatear la lista completa de responsables asignados
  const obtenerTextoResponsables = (reg: any) => {
    if (reg.es_externo_general) return "EXTERNO GENERAL";

    const resp = reg.ot_responsables || [];
    const nombres: string[] = [];

    resp.forEach((r: any) => {
      if (r.tipo === 'interno' && r.perfiles?.nombre_completo) {
        nombres.push(r.perfiles.nombre_completo);
      } else if (r.tipo === 'externo' && r.proveedores?.nombre) {
        nombres.push(`EXT: ${r.proveedores.nombre}`);
      }
    });

    // Fallback retrocompatible para OTs guardadas previamente
    if (nombres.length === 0) {
      if (reg.proveedores?.nombre) nombres.push(`EXT: ${reg.proveedores.nombre}`);
      else if (reg.perfiles?.nombre_completo) nombres.push(reg.perfiles.nombre_completo);
    }

    return nombres.length > 0 ? nombres.join(", ") : "Sin asignar";
  };

  // Función interna para formatear fecha y hora de forma segura
  const formatearFechaHora = (fechaStr: string | null) => {
    if (!fechaStr) return "Sin registrar";
    const d = new Date(fechaStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Función interna para calcular la duración neta de parada (Parada OT -> Finalización)
  const calcularTiempoParada = (inicioStr: string, finStr: string | null) => {
    if (!finStr) return "En progreso";
    const inicio = new Date(inicioStr).getTime();
    const fin = new Date(finStr).getTime();
    const diffMs = fin - inicio;
    if (diffMs <= 0 || isNaN(diffMs)) return "0h 0m";
    
    const diffMins = Math.floor(diffMs / 60000);
    const horas = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${horas}h ${mins}m`;
  };

  // Función interna para calcular la duración real de trabajo (Inicio Trabajo -> Finalización)
  const calcularTiempoTrabajo = (inicioStr: string | null, finStr: string | null) => {
    if (!inicioStr || !finStr) return "Sin registrar";
    const inicio = new Date(inicioStr).getTime();
    const fin = new Date(finStr).getTime();
    const diffMs = fin - inicio;
    if (diffMs <= 0 || isNaN(diffMs)) return "0h 0m";
    
    const diffMins = Math.floor(diffMs / 60000);
    const horas = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${horas}h ${mins}m`;
  };

  // Función interna auxiliar para normalizar el nombre del equipo o sector edilicio
  const obtenerIdentificadorEquipo = (reg: any) => {
    if (reg.categoria === 'edilicio') {
      return `[INFRAESTRUCTURA] ${reg.sector || "Sin sector detallado"}`;
    }
    if (reg.maquinas) {
      return `[${reg.maquinas.numero_maquina}] ${reg.maquinas.nombre}`;
    }
    return "Equipo no especificado";
  };

  // --- FUNCIÓN EXPORTAR EXCEL ---
  const exportarExcel = () => {
    const dataExportar = registros.map(reg => ({
      "FECHA PARADA": formatearFechaHora(reg.fecha_creacion),
      "FECHA INICIO TRABAJO": formatearFechaHora(reg.fecha_inicio_real),
      "FECHA DE FINALIZACION": formatearFechaHora(reg.fecha_completada),
      "TIEMPO PARADA": calcularTiempoParada(reg.fecha_creacion, reg.fecha_completada),
      "TIEMPO TRABAJO": calcularTiempoTrabajo(reg.fecha_inicio_real, reg.fecha_completada),
      Fecha: new Date(reg.fecha_completada).toLocaleDateString(),
      Equipo: obtenerIdentificadorEquipo(reg),
      Diagnóstico: reg.descripcion,
      Causa_Real: reg.causa_real || "Sin detallar",
      "Responsable(s)": obtenerTextoResponsables(reg)
    }));

    const ws = XLSX.utils.json_to_sheet(dataExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial");
    XLSX.writeFile(wb, `Historial_Mantenimiento_${new Date().toLocaleDateString()}.xlsx`);
  };

  // --- FUNCIÓN EXPORTAR PDF ---
  const exportarPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("Historial de Reparaciones y Métricas de Tiempo - MiCRO", 14, 15);
    
    const tableData = registros.map(reg => [
      formatearFechaHora(reg.fecha_creacion),
      formatearFechaHora(reg.fecha_inicio_real),
      formatearFechaHora(reg.fecha_completada),
      calcularTiempoParada(reg.fecha_creacion, reg.fecha_completada),
      calcularTiempoTrabajo(reg.fecha_inicio_real, reg.fecha_completada),
      obtenerIdentificadorEquipo(reg),
      `Sup: ${reg.descripcion}\nReal: ${reg.causa_real || "-"}`,
      obtenerTextoResponsables(reg)
    ]);

    autoTable(doc, {
      head: [['Fecha Parada', 'Inicio Trabajo', 'Fecha Fin', 'Tiempo Parada', 'Tiempo Trabajo', 'Equipo / Sector', 'Diagnóstico vs Causa', 'Responsable(s)']],
      body: tableData,
      startY: 20,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 8 }
    });

    doc.save(`Historial_MiCRO_${new Date().toLocaleDateString()}.pdf`);
  };

  useEffect(() => { cargarDatos(); }, [filtroMaquina]);

  return (
    <main className="flex-1 p-8 bg-slate-50 space-y-8 text-left">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">Historial de Reparaciones</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          {/* BOTONES DE EXPORTACIÓN */}
          <div className="flex gap-2">
            <button 
              onClick={exportarExcel}
              className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-slate-50 transition-all shadow-sm"
            >
              Excel
            </button>
            <button 
              onClick={exportarPDF}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-emerald-500 transition-all shadow-sm"
            >
              PDF
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">1. Buscar máquina</label>
            <input 
              type="text"
              placeholder="Ej: Centro..."
              className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:border-emerald-500 w-full sm:w-48"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">2. Seleccionar Equipo</label>
            <select 
              className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:border-emerald-500 cursor-pointer w-full sm:w-64"
              value={filtroMaquina}
              onChange={(e) => setFiltroMaquina(e.target.value)}
            >
              <option value="">Todos los equipos ({maquinasFiltradas.length})</option>
              {maquinasFiltradas.map(m => (
                <option key={m.id} value={m.id}>[{m.numero_maquina}] {m.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* TABLA DE REGISTROS */}
      <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Fecha</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Equipo / Ubicación</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Diagnóstico y Causa Real</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Responsable(s)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {cargando ? (
              <tr><td colSpan={4} className="p-12 text-center italic text-slate-400 font-bold uppercase text-[10px]">Analizando registros...</td></tr>
            ) : registros.map((reg) => (
              <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-xs font-bold text-slate-500">
                  {new Date(reg.fecha_completada).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-black text-slate-900 uppercase">
                    {reg.categoria === 'edilicio' ? (
                      <span className="text-amber-600">
                        [INFRAESTRUCTURA] <span className="text-slate-600">{reg.sector || "Sin sector"}</span>
                      </span>
                    ) : (
                      <>
                        <span className="text-emerald-600">[{reg.maquinas?.numero_maquina}]</span> {reg.maquinas?.nombre}
                      </>
                    )}
                  </span>
                </td>
                <td className="px-6 py-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-[8px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-black uppercase">Sup</span>
                    <p className="text-xs text-slate-500 font-medium">{reg.descripcion}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[8px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-black uppercase">Real</span>
                    <p className="text-xs text-slate-900 font-bold">{reg.causa_real || "Sin detallar"}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase">
                  {obtenerTextoResponsables(reg)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}