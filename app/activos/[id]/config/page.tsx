"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "../../../../lib/supabase";
import Link from "next/link";
import { Trash2, Wrench, Package, FileText, AlertTriangle, Save, ArrowLeft, UploadCloud, FileCheck, Loader2 } from "lucide-react";

export default function ConfigMaquinaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [maquina, setMaquina] = useState<any>(null);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [repuestosDisponibles, setRepuestosDisponibles] = useState<any[]>([]);
  const [repuestosAsignados, setRepuestosAsignados] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // Estados nuevos para la gestión del archivo PDF por arrastre
  const [subiendoPdf, setSubiendoPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfNombre, setPdfNombre] = useState("");
  const [arrastrando, setArrastrando] = useState(false);

  const fetchData = async () => {
    try {
      setCargando(true);
      const { data: mq } = await supabase.from("maquinas").select("*").eq("id", id).single();
      setMaquina(mq);
      if (mq?.url_instructivo) {
        setPdfUrl(mq.url_instructivo);
        // Intentar extraer el nombre del archivo de la URL
        const partes = mq.url_instructivo.split("/");
        setPdfNombre(decodeURIComponent(partes[partes.length - 1]));
      }

      const { data: users } = await supabase.from("perfiles").select("id, nombre_completo").eq("rol", "operario");
      setTecnicos(users || []);

      const { data: assigned } = await supabase
        .from("maquina_repuestos")
        .select("*, repuestos(nombre, codigo)")
        .eq("maquina_id", id);
      setRepuestosAsignados(assigned || []);

      const { data: allParts } = await supabase.from("repuestos").select("*").order("nombre");
      setRepuestosDisponibles(allParts || []);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  // Función para procesar y subir el archivo PDF a Supabase Storage
  const manejarSubidaArchivo = async (file: File) => {
    if (!file || file.type !== "application/pdf") {
      alert("Por favor, selecciona o arrastra únicamente un archivo PDF.");
      return;
    }

    try {
      setSubiendoPdf(true);
      // Creamos un nombre único para evitar colisiones en el storage
      const extension = file.name.split(".").pop();
      const nombreLimpio = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
      const nombreArchivo = `${id}_${nombreLimpio}_${Date.now()}.${extension}`;

      const { data, error } = await supabase.storage
        .from("instructivos-preventivos")
        .upload(nombreArchivo, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) throw error;

      // Obtener la URL pública del archivo subido
      const { data: publicUrlData } = supabase.storage
        .from("instructivos-preventivos")
        .getPublicUrl(nombreArchivo);

      setPdfUrl(publicUrlData.publicUrl);
      setPdfNombre(file.name);
    } catch (err: any) {
      console.error(err);
      alert("Error al subir el archivo: " + err.message);
    } finally {
      setSubiendoPdf(false);
    }
  };

  const manejarDragOver = (e: any) => {
    e.preventDefault();
    setArrastrando(true);
  };

  const manejarDragLeave = () => {
    setArrastrando(false);
  };

  const manejarDrop = (e: any) => {
    e.preventDefault();
    setArrastrando(false);
    const archivos = e.dataTransfer.files;
    if (archivos.length > 0) {
      manejarSubidaArchivo(archivos[0]);
    }
  };

  const actualizarPlan = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const { error } = await supabase.from("maquinas").update({
      frecuencia_preventivo_dias: formData.get("frecuencia"),
      ultimo_preventivo: formData.get("ultimo") || null,
      proximo_preventivo: formData.get("proximo") || null, // Mapeo de la fecha de inicio de planificación
      tecnico_asignado_id: formData.get("tecnico_id") || null, // Mantenemos tu flujo/columna intacta
      url_instructivo: pdfUrl // Guardamos la URL del PDF cargado mediante el Storage
    }).eq("id", id);

    if (error) alert("Error: " + error.message);
    else {
      alert("PLANIFICACIÓN ACTUALIZADA");
      fetchData();
    }
  };

  const eliminarPlan = async () => {
    if (!confirm("¿Eliminar toda la planificación preventiva?")) return;
    await supabase.from("maquinas").update({
      frecuencia_preventivo_dias: 0,
      ultimo_preventivo: null,
      proximo_preventivo: null,
      tecnico_asignado_id: null,
      tecnico_assigned_id: null,
      url_instructivo: null
    }).eq("id", id);
    setPdfUrl("");
    setPdfNombre("");
    alert("Plan eliminado");
    fetchData();
  };

  if (cargando) return <div className="p-12 font-black text-slate-400 uppercase tracking-tight">Sincronizando...</div>;

  return (
    <main className="flex-1 min-h-screen bg-slate-50 p-8 md:p-12 space-y-10 text-left">
      
      {/* CABECERA */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-8">
        <div className="flex items-center gap-6">
          <Link href="/activos" className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">Configuración</h1>
            <p className="text-emerald-600 text-[14px] font-black tracking-tight mt-2 ">
              Máquina {maquina?.numero_maquina} — {maquina?.nombre}
            </p>
          </div>
        </div>
        <button onClick={eliminarPlan} className="flex items-center gap-2 px-6 py-3 text-red-400 hover:text-red-600 font-black text-[9px] uppercase tracking-widest transition-colors">
          <AlertTriangle size={14} /> Eliminar Planificación
        </button>
      </div>

      <form onSubmit={actualizarPlan} className="space-y-10">
        
        {/* BLOQUE SUPERIOR: PLANIFICACIÓN */}
        <section className="bg-white border border-slate-200 p-10 rounded-[40px] shadow-sm space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Wrench size={20} /></div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Planificación</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* FRECUENCIA CON ALTURA FIJA */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Frecuencia (Días)</label>
              <div className="relative h-20">
                <input 
                  name="frecuencia" 
                  type="number" 
                  defaultValue={maquina?.frecuencia_preventivo_dias} 
                  className="w-full h-full bg-slate-50 border border-slate-100 rounded-2xl px-6 text-[16px] font-black text-slate-900 outline-none focus:border-emerald-500 transition-all" 
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">Días</span>
              </div>
            </div>
            
            {/* FECHA INICIO DE PLANIFICACIÓN (NUEVO CAMPO - PUNTO 2) */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Inicio de Planificación</label>
              <div className="h-20">
                <input 
                  name="proximo" 
                  type="date" 
                  defaultValue={maquina?.proximo_preventivo?.slice(0, 10)} 
                  className="w-full h-full bg-slate-50 border border-slate-100 rounded-2xl px-6 text-lg font-black text-slate-900 outline-none focus:border-emerald-500 transition-all [color-scheme:light]" 
                />
              </div>
            </div>

            {/* FECHA ÚLTIMO MANTENIMIENTO */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Último Mantenimiento</label>
              <div className="h-20">
                <input 
                  name="ultimo" 
                  type="date" 
                  defaultValue={maquina?.ultimo_preventivo?.slice(0, 10)} 
                  className="w-full h-full bg-slate-50 border border-slate-100 rounded-2xl px-6 text-lg font-black text-slate-900 outline-none focus:border-emerald-500 transition-all [color-scheme:light]" 
                />
              </div>
            </div>

            {/* RESPONSABLE CON ALTURA FIJA */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsable</label>
              <div className="relative h-20">
                <select 
                  name="tecnico_id" 
                  defaultValue={maquina?.tecnico_asignado_id} 
                  className="w-full h-full bg-slate-50 border border-slate-100 rounded-2xl px-6 text-[11px] font-black text-slate-900 uppercase outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                >
                  <option value="">Pendiente de asignación</option>
                  {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre_completo}</option>)}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">▼</div>
              </div>
            </div>
          </div>
        </section>

        {/* BLOQUE MEDIO: REPUESTOS */}
        <section className="bg-white border border-slate-200 p-10 rounded-[40px] shadow-sm space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Package size={20} /></div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Repuestos Necesarios</h2>
          </div>

          <div className="flex flex-col md:flex-row gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <select id="new_part" className="flex-1 bg-white border border-slate-200 rounded-xl p-4 text-[10px] font-black text-slate-900 uppercase tracking-tight outline-none">
              <option value="">Seleccionar repuesto del inventario...</option>
              {repuestosDisponibles.map(r => <option key={r.id} value={r.id}>[{r.codigo}] {r.nombre}</option>)}
            </select>
            <input id="new_qty" type="number" placeholder="Cant." className="w-full md:w-32 bg-white border border-slate-200 rounded-xl p-4 text-center font-black outline-none focus:border-emerald-500" />
            <button 
              type="button"
              onClick={async () => {
                const rId = (document.getElementById("new_part") as HTMLSelectElement).value;
                const qty = (document.getElementById("new_qty") as HTMLInputElement).value;
                if (!rId || !qty) return;
                await supabase.from("maquina_repuestos").insert({ maquina_id: id, repuesto_id: rId, cantidad_necesaria: qty });
                fetchData();
              }}
              className="px-10 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all"
            >
              Vincular Insumo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {repuestosAsignados.map(item => (
              <div key={item.id} className="flex justify-between items-center p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-900 uppercase">[{item.repuestos?.codigo}] {item.repuestos?.nombre}</span>
                  <span className="text-[9px] text-emerald-600 font-black uppercase mt-1 tracking-widest">CANTIDAD: {item.cantidad_necesaria}</span>
                </div>
                <button 
                  type="button"
                  onClick={async () => { await supabase.from("maquina_repuestos").delete().eq("id", item.id); fetchData(); }} 
                  className="p-3 text-slate-300 hover:text-red-500 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* BLOQUE INFERIOR: DOCUMENTACIÓN ACTUALIZADO CON ZONA DE ARRASTRE - PUNTO 1 */}
        <section className="bg-white border border-slate-200 p-10 rounded-[40px] shadow-sm space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><FileText size={20} /></div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Instructivo del Preventivo</h2>
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Carga de Instructivo Paso a Paso (PDF)</label>
            
            <div
              onDragOver={manejarDragOver}
              onDragLeave={manejarDragLeave}
              onDrop={manejarDrop}
              onClick={() => document.getElementById("input-file-pdf")?.click()}
              className={`w-full min-h-[160px] border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer bg-slate-50/50 ${
                arrastrando ? "border-emerald-500 bg-emerald-50/20" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                id="input-file-pdf"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const archivos = e.target.files;
                  if (archivos && archivos.length > 0) manejarSubidaArchivo(archivos[0]);
                }}
              />

              {subiendoPdf ? (
                <>
                  <Loader2 size={32} className="text-emerald-500 animate-spin" />
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Subiendo instructivo al servidor...</p>
                </>
              ) : pdfUrl ? (
                <>
                  <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                    <FileCheck size={28} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight max-w-md break-all">{pdfNombre || "instructivo_preventivo.pdf"}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Archivo cargado con éxito. Arrastra otro para reemplazarlo.</p>
                  </div>
                </>
              ) : (
                <>
                  <UploadCloud size={32} className="text-slate-400 group-hover:text-slate-600" />
                  <div className="text-center">
                    <p className="text-xs font-black text-slate-700 uppercase tracking-tight">Arrastrá el PDF instructivo acá</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">O hacé clic para explorar tus archivos de Excel/PDF</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* PIE DE PÁGINA */}
        <div className="flex justify-end gap-4 pt-4">
          <Link href="/activos" className="px-10 py-5 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all">
            Descartar
          </Link>
          <button 
            type="submit" 
            disabled={subiendoPdf}
            className="px-16 py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} /> Confirmar
          </button>
        </div>

      </form>
    </main>
  );
}