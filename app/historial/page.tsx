"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import ExcelJS from "exceljs";
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

    if (nombres.length === 0) {
      if (reg.proveedores?.nombre) nombres.push(`EXT: ${reg.proveedores.nombre}`);
      else if (reg.perfiles?.nombre_completo) nombres.push(reg.perfiles.nombre_completo);
    }

    return nombres.length > 0 ? nombres.join(", ") : "Sin asignar";
  };

  const formatearFechaHora = (fechaStr: string | null) => {
    if (!fechaStr) return "Sin registrar";
    const d = new Date(fechaStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // --- CÁLCULOS NUMÉRICOS EXACTOS IGUALES AL HOME (SIN CAMBIOS) ---

  const obtenerHorasDecimalesParada = (reg: any) => {
    const esDeMaquinaria = reg.categoria !== 'edilicio';
    const provocoParadaReal = reg.estado_maquina_al_crear === "parada";
    
    if (!esDeMaquinaria || !provocoParadaReal || !reg.fecha_creacion || !reg.fecha_completada) {
      return 0;
    }

    const inicio = new Date(reg.fecha_creacion).getTime();
    const fin = new Date(reg.fecha_completada).getTime();
    const diffMs = fin - inicio;
    
    if (diffMs <= 0 || isNaN(diffMs)) return 0;
    return Number((diffMs / (1000 * 60 * 60)).toFixed(2));
  };

  const obtenerHorasDecimalesTrabajo = (reg: any) => {
    if (!reg.fecha_inicio_real || !reg.fecha_completada) return 0;
    const inicio = new Date(reg.fecha_inicio_real).getTime();
    const fin = new Date(reg.fecha_completada).getTime();
    const diffMs = fin - inicio;
    
    if (diffMs <= 0 || isNaN(diffMs)) return 0;
    return Number((diffMs / (1000 * 60 * 60)).toFixed(2));
  };

  const obtenerObjetoFecha = (fechaStr: string | null) => {
    if (!fechaStr) return null;
    const d = new Date(fechaStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const obtenerIdentificadorEquipo = (reg: any) => {
    if (reg.categoria === 'edilicio') {
      return `[INFRAESTRUCTURA] ${reg.sector || "Sin sector detallado"}`;
    }
    if (reg.maquinas) {
      return `[${reg.maquinas.numero_maquina}] ${reg.maquinas.nombre}`;
    }
    return "Equipo no especificado";
  };

  // --- EXPORTAR EXCEL: HISTORIAL PROLIJO + DASHBOARD KPI VISUAL ---
  const exportarExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "MiCRO";
    workbook.created = new Date();

    const VERDE = "FF10B981";
    const VERDE_OSCURO = "FF064E3B";
    const VERDE_CLARO = "FFECFDF5";
    const GRIS_TEXTO = "FF475569";
    const GRIS_CLARO = "FFF8FAFC";

    // ========== HOJA 1: HISTORIAL REPARACIONES ==========
    const wsDatos = workbook.addWorksheet("Historial Reparaciones");

    wsDatos.columns = [
      { header: "N° OT", key: "ot", width: 10 },
      { header: "FECHA PARADA", key: "fechaParada", width: 20 },
      { header: "FECHA INICIO TRABAJO", key: "fechaInicio", width: 20 },
      { header: "FECHA DE FINALIZACION", key: "fechaFin", width: 20 },
      { header: "TIEMPO PARADA (HS)", key: "tParada", width: 16 },
      { header: "TIEMPO TRABAJO (HS)", key: "tTrabajo", width: 16 },
      { header: "CATEGORIA", key: "categoria", width: 14 },
      { header: "ESTADO INICIAL MÁQUINA", key: "estadoInicial", width: 18 },
      { header: "EQUIPO / UBICACIÓN", key: "equipo", width: 30 },
      { header: "DIAGNÓSTICO INICIAL", key: "diagnostico", width: 30 },
      { header: "CAUSA REAL", key: "causaReal", width: 30 },
      { header: "RESPONSABLE(S)", key: "responsables", width: 24 },
    ];

    registros.forEach(reg => {
      wsDatos.addRow({
        ot: reg.numero_ot ? Number(reg.numero_ot) : null,
        fechaParada: reg.categoria === 'edilicio' ? null : obtenerObjetoFecha(reg.fecha_creacion),
        fechaInicio: obtenerObjetoFecha(reg.fecha_inicio_real),
        fechaFin: obtenerObjetoFecha(reg.fecha_completada),
        tParada: obtenerHorasDecimalesParada(reg),
        tTrabajo: obtenerHorasDecimalesTrabajo(reg),
        categoria: reg.categoria === 'edilicio' ? "Infraestructura" : "Maquinaria",
        estadoInicial: reg.estado_maquina_al_crear || "N/A",
        equipo: obtenerIdentificadorEquipo(reg),
        diagnostico: reg.descripcion || "-",
        causaReal: reg.causa_real || "Sin detallar",
        responsables: obtenerTextoResponsables(reg),
      });
    });

    const headerRow = wsDatos.getRow(1);
    headerRow.eachCell(cell => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE } };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 10 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    headerRow.height = 22;
    wsDatos.autoFilter = { from: "A1", to: "L1" };
    wsDatos.views = [{ state: "frozen", ySplit: 1 }];

    wsDatos.getColumn("ot").numFmt = "0";
    ["fechaParada", "fechaInicio", "fechaFin"].forEach(k => {
      wsDatos.getColumn(k).numFmt = "dd/mm/yyyy hh:mm";
    });
    ["tParada", "tTrabajo"].forEach(k => {
      wsDatos.getColumn(k).numFmt = "0.00";
    });

    wsDatos.eachRow((row, i) => {
      if (i > 1 && i % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRIS_CLARO } };
        });
      }
    });

    // ========== HOJA 2: DASHBOARD KPIS (VISUAL) ==========
    const anioActual = new Date().getFullYear();
    const registrosMaquinariaAnioActual = registros.filter(r => 
      r.categoria !== 'edilicio' && 
      new Date(r.fecha_completada).getFullYear() === anioActual
    );

    const totalOTsMaquinariaAnio = registrosMaquinariaAnioActual.length;
    const totalOTsParadaEfectiva = registrosMaquinariaAnioActual.filter(r => r.estado_maquina_al_crear === "parada").length;

    const totalHsParadaAnual = Number(registrosMaquinariaAnioActual.reduce((acc, r) => acc + obtenerHorasDecimalesParada(r), 0).toFixed(1));
    const totalHsTrabajoAnual = Number(registrosMaquinariaAnioActual.reduce((acc, r) => acc + obtenerHorasDecimalesTrabajo(r), 0).toFixed(1));

    const mttrHsPromedio = totalOTsMaquinariaAnio > 0 ? Number((totalHsTrabajoAnual / totalOTsMaquinariaAnio).toFixed(2)) : 0;
    const porcentajeParadaEfectiva = totalOTsMaquinariaAnio > 0 ? Number(((totalOTsParadaEfectiva / totalOTsMaquinariaAnio) * 100).toFixed(1)) : 0;

    const paradasPorEquipo: { [key: string]: { horas: number; intervenciones: number } } = {};
    registrosMaquinariaAnioActual.forEach(r => {
      const eq = obtenerIdentificadorEquipo(r);
      const hs = obtenerHorasDecimalesParada(r);
      if (!paradasPorEquipo[eq]) {
        paradasPorEquipo[eq] = { horas: 0, intervenciones: 0 };
      }
      paradasPorEquipo[eq].horas = Number((paradasPorEquipo[eq].horas + hs).toFixed(2));
      paradasPorEquipo[eq].intervenciones += 1;
    });

    const wsKPI = workbook.addWorksheet("Análisis");
    wsKPI.columns = [{ width: 3 }, { width: 42 }, { width: 20 }, { width: 24 }, { width: 3 }];

    // Título
    wsKPI.mergeCells("B2:D2");
    const tituloCell = wsKPI.getCell("B2");
    tituloCell.value = `PANEL DE INDICADORES DE MANTENIMIENTO — AÑO ${anioActual}`;
    tituloCell.font = { bold: true, size: 14, color: { argb: VERDE_OSCURO } };
    tituloCell.alignment = { vertical: "middle" };
    wsKPI.getRow(2).height = 28;

    // Tarjetas de KPI (label + valor destacado)
    const kpis: { label: string; valor: number | string; sub?: string }[] = [
      { label: "Total OTs Maquinaria Completadas", valor: totalOTsMaquinariaAnio },
      { label: "OTs con Parada Efectiva de Producción", valor: totalOTsParadaEfectiva, sub: `${porcentajeParadaEfectiva}% del total de OTs` },
      { label: "Horas Totales de Parada Anual", valor: `${totalHsParadaAnual} Hs` },
      { label: "Horas Totales de Trabajo Real", valor: `${totalHsTrabajoAnual} Hs` },
      { label: "MTTR Promedio por Reparación", valor: `${mttrHsPromedio} Hs`, sub: "Tiempo medio entre inicio de trabajo y cierre de OT" },
    ];

    let fila = 4;
    kpis.forEach(k => {
      const labelCell = wsKPI.getCell(`B${fila}`);
      labelCell.value = k.label;
      labelCell.font = { bold: true, size: 10, color: { argb: GRIS_TEXTO } };
      labelCell.alignment = { vertical: "middle" };

      const valorCell = wsKPI.getCell(`C${fila}`);
      valorCell.value = k.valor;
      valorCell.font = { bold: true, size: 13, color: { argb: "FF059669" } };
      valorCell.alignment = { vertical: "middle", horizontal: "right" };
      valorCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_CLARO } };

      if (k.sub) {
        const subCell = wsKPI.getCell(`D${fila}`);
        subCell.value = k.sub;
        subCell.font = { italic: true, size: 9, color: { argb: "FF94A3B8" } };
        subCell.alignment = { vertical: "middle" };
      }

      wsKPI.getRow(fila).height = 22;
      fila++;
    });

    fila += 1;

    // Ranking de paradas por equipo, con Data Bar nativa de Excel
    wsKPI.mergeCells(`B${fila}:D${fila}`);
    const subtitulo = wsKPI.getCell(`B${fila}`);
    subtitulo.value = "RANKING DE HORAS DE PARADA POR EQUIPO";
    subtitulo.font = { bold: true, size: 11, color: { argb: VERDE_OSCURO } };
    fila++;

    ["B", "C", "D"].forEach((col, idx) => {
      const c = wsKPI.getCell(`${col}${fila}`);
      c.value = ["Equipo", "Horas de Parada", "Intervenciones (OTs)"][idx];
      c.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE } };
      c.alignment = { horizontal: idx === 0 ? "left" : "center", vertical: "middle" };
    });
    wsKPI.getRow(fila).height = 20;
    fila++;

    const ranking = Object.entries(paradasPorEquipo).sort((a, b) => b[1].horas - a[1].horas);
    const primeraFilaDatos = fila;

    ranking.forEach(([equipo, datos]) => {
      wsKPI.getCell(`B${fila}`).value = equipo;
      wsKPI.getCell(`C${fila}`).value = datos.horas;
      wsKPI.getCell(`C${fila}`).numFmt = "0.00";
      wsKPI.getCell(`C${fila}`).alignment = { horizontal: "center" };
      wsKPI.getCell(`D${fila}`).value = datos.intervenciones;
      wsKPI.getCell(`D${fila}`).alignment = { horizontal: "center" };
      fila++;
    });
    const ultimaFilaDatos = fila - 1;

    // Data Bar nativa: barra horizontal proporcional a las horas de parada
    if (ranking.length > 0) {
      wsKPI.addConditionalFormatting({
        ref: `C${primeraFilaDatos}:C${ultimaFilaDatos}`,
        rules: [
          {
            type: "dataBar",
            cfvo: [{ type: "min" }, { type: "max" }],
            color: { argb: VERDE },
            priority: 1,
          } as any,
        ],
      });
    }

    // ========== DESCARGA ==========
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Historial_Mantenimiento_${new Date().toLocaleDateString().replace(/\//g, "-")}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // --- EXPORTAR PDF (SIN CAMBIOS) ---
  const exportarPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("Historial de Reparaciones y Métricas de Tiempo - MiCRO", 14, 15);
    
    const tableData = registros.map(reg => [
      reg.numero_ot ? String(reg.numero_ot) : "-",
      formatearFechaHora(reg.fecha_creacion),
      formatearFechaHora(reg.fecha_inicio_real),
      formatearFechaHora(reg.fecha_completada),
      `${obtenerHorasDecimalesParada(reg)} Hs`,
      `${obtenerHorasDecimalesTrabajo(reg)} Hs`,
      obtenerIdentificadorEquipo(reg),
      `Sup: ${reg.descripcion}\nReal: ${reg.causa_real || "-"}`,
      obtenerTextoResponsables(reg)
    ]);

    autoTable(doc, {
      head: [['N° OT', 'Fecha Parada', 'Inicio Trabajo', 'Fecha Fin', 'T. Parada', 'T. Trabajo', 'Equipo / Sector', 'Diagnóstico vs Causa', 'Responsable(s)']],
      body: tableData,
      startY: 20,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 8 }
    });

    doc.save(`Historial_MiCRO_${new Date().toLocaleDateString().replace(/\//g, "-")}.pdf`);
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
              className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
            >
              Excel
            </button>
            <button 
              onClick={exportarPDF}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-emerald-500 transition-all shadow-sm cursor-pointer"
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
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">OT</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Fecha</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Equipo / Ubicación</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Diagnóstico y Causa Real</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Responsable(s)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {cargando ? (
              <tr><td colSpan={5} className="p-12 text-center italic text-slate-400 font-bold uppercase text-[10px]">Analizando registros...</td></tr>
            ) : registros.map((reg) => (
              <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-xs font-black text-emerald-600">
                  {reg.numero_ot || "-"}
                </td>
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