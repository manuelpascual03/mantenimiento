"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Building, Truck, Calendar, X, Plus, FileText, CheckCircle, RefreshCw } from "lucide-react";

export default function ServiciosExternos() {
  const [activeSubTab, setActiveSubTab] = useState<'base_datos' | 'historial'>('base_datos');
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [historialServicios, setHistorialServicios] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const { perfil } = useAuth();

  // Modales
  const [showModalProveedor, setShowModalProveedor] = useState(false);
  const [showModalServicio, setShowModalServicio] = useState(false);

  // Formulario Proveedor
  const [nuevoProv, setNuevoProv] = useState({ nombre: "", especialidad: "", contacto: "" });

  const cargarDatos = async () => {
    try {
      setCargando(true);
      
      // 1. Cargar proveedores
      const { data: provs } = await supabase
        .from("proveedores")
        .select("*")
        .order("nombre", { ascending: true });
      setProveedores(provs || []);

      // 2. Cargar historial de OTs que fueron asignadas a servicios externos
      const { data: servs } = await supabase
        .from("ordenes_trabajo")
        .select(`
          id, numero_ot, descripcion, fecha_completada, fecha_creacion, estado_ot,
          maquinas (nombre, numero_maquina),
          proveedores ! proveedor_id (nombre)
        `)
        .not("proveedor_id", "is", null)
        .order("fecha_creacion", { ascending: false });
      setHistorialServicios(servs || []);

    } catch (err: any) {
      console.error("Error cargando servicios externos:", err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleCrearProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoProv.nombre) return;
    try {
      const { error } = await supabase.from("proveedores").insert([nuevoProv]);
      if (error) throw error;
      alert("PROVEEDOR REGISTRADO CORRECTAMENTE");
      setNuevoProv({ nombre: "", especialidad: "", contacto: "" });
      setShowModalProveedor(false);
      cargarDatos();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-slate-50 text-left">
      <div className="h-[env(safe-area-inset-top)] w-full md:hidden" />

      {/* ENCABEZADO */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">Servicios Externos</h1>
          </div>
        </div>

        {/* ACCIONES FLOTANTES CON TU ESTILO */}
        {(perfil?.rol === 'admin' || perfil?.rol === 'supervisor') && (
          <div className="flex gap-3">
            <button 
              onClick={() => setShowModalProveedor(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus size={14} /> Nuevo Proveedor
            </button>
          </div>
        )}
      </div>

      {/* SUBPESTAÑAS ESTILO SUB-HEADER SUPERIOR */}
      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveSubTab('base_datos')} 
          className={`pb-4 px-2 flex-1 md:flex-none flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 ${activeSubTab === 'base_datos' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400'}`}
        >
          <Building size={14} /> Base de Datos
        </button>
        <button 
          onClick={() => setActiveSubTab('historial')} 
          className={`pb-4 px-2 flex-1 md:flex-none flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 ${activeSubTab === 'historial' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400'}`}
        >
          <Calendar size={14} /> Historial de Servicios
        </button>
      </div>

      {/* CONTENIDO CONTINGENTE */}
      {activeSubTab === 'base_datos' ? (
        <div className="hidden md:block bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Proveedor / Empresa</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Especialidad / Rubro</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Contacto / Teléfono</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Alta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-900">
              {proveedores.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">No hay proveedores registrados en la base de datos.</td></tr>
              ) : (
                proveedores.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-900 uppercase text-sm flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-600" /> {p.nombre}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-slate-600 font-black text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded uppercase">{p.especialidad || 'General'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-500">{p.contacto || 'Sin registrar'}</td>
                    <td className="px-6 py-4 text-center text-[10px] font-mono text-slate-400">{new Date(p.fecha_creacion).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* SUBPESTAÑA HISTORIAL: TARJETAS SATINADAS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {historialServicios.length === 0 ? (
            <div className="col-span-full bg-white border border-slate-200 rounded-[32px] p-12 text-center text-slate-400 text-sm italic font-medium">
              No se registran intervenciones de servicios externos hasta la fecha.
            </div>
          ) : (
            historialServicios.map((sh) => (
              <div key={sh.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start border-b border-slate-50 pb-3">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Orden de Trabajo</span>
                    <span className="font-mono font-black text-lg text-slate-900">#{sh.numero_ot}</span>
                  </div>
                  <span className={`text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter ${sh.estado_ot === 'completada' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {sh.estado_ot}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Proveedor Encargado</p>
                    <span className="text-sm font-black text-slate-800 uppercase flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-slate-500" /> {sh.proveedores?.nombre || 'Externo General'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Activo Vinculado</p>
                    <span className="text-xs font-bold text-slate-600 uppercase">
                      {sh.maquinas ? `[${sh.maquinas.numero_maquina}] ${sh.maquinas.nombre}` : 'Infraestructura / Sector'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs italic text-slate-600">
                    "{sh.descripcion}"
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                  <button 
                    onClick={() => alert("Módulo de facturas y archivos: Próximamente en desarrollo (Punto 5 Ampliado)")}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-600 text-[9px] font-black uppercase tracking-widest transition-colors"
                  >
                    <FileText size={14} /> Factura / Reporte
                  </button>
                  <span className="text-[9px] font-mono text-slate-400">
                    {sh.fecha_completada ? new Date(sh.fecha_completada).toLocaleDateString() : 'En proceso'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL ALTA PROVEEDOR */}
      {showModalProveedor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <span className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Truck className="text-emerald-600 w-5 h-5" /> Registrar Proveedor
              </span>
              <button onClick={() => setShowModalProveedor(false)} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCrearProveedor} className="p-6 space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Nombre de la Empresa *</label>
                <input 
                  type="text" 
                  required
                  value={nuevoProv.nombre}
                  onChange={(e) => setNuevoProv({...nuevoProv, nombre: e.target.value})}
                  placeholder="EJ: ABC BOBINADOS S.A."
                  className="w-full bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl p-3 outline-none focus:border-emerald-500 uppercase transition-all text-slate-800"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Especialidad / Tarea Común</label>
                <input 
                  type="text" 
                  value={nuevoProv.especialidad}
                  onChange={(e) => setNuevoProv({...nuevoProv, especialidad: e.target.value})}
                  placeholder="EJ: REPARACIÓN DE MOTORES / NEUMÁTICA"
                  className="w-full bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl p-3 outline-none focus:border-emerald-500 uppercase transition-all text-slate-800"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Canal de Contacto (Tel / Mail)</label>
                <input 
                  type="text" 
                  value={nuevoProv.contacto}
                  onChange={(e) => setNuevoProv({...nuevoProv, contacto: e.target.value})}
                  placeholder="EJ: 11-3422-9988 / INFO@ABC.COM"
                  className="w-full bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl p-3 outline-none focus:border-emerald-500 transition-all text-slate-800"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowModalProveedor(false)}
                  className="w-1/3 py-3.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="w-2/3 py-3.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-md"
                >
                  Confirmar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}