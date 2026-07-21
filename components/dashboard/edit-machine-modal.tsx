"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export function EditMachineModal({ maquina, onMachineUpdated }: { maquina: any, onMachineUpdated: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [formData, setFormData] = useState({ ...maquina });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setCargando(true);

    const fileName = `${maquina.numero_maquina}-${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('manuales') // RECUERDA: Crear el bucket 'manuales' como PUBLIC en Supabase
      .upload(fileName, file);

    if (uploadError) {
      alert("Error: " + uploadError.message);
    } else {
      const { data } = supabase.storage.from('manuales').getPublicUrl(fileName);
      setFormData({ ...formData, url_manual: data.publicUrl });
      alert("PDF cargado. Dale a 'Actualizar' para guardar el link.");
    }
    setCargando(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    await supabase.from("maquinas").update(formData).eq("id", maquina.id);
    setIsOpen(false);
    onMachineUpdated();
    setCargando(false);
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="text-slate-500 hover:text-blue-400 cursor-pointer p-1">✏️</button>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 text-left">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Editar {maquina.numero_maquina}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white" 
                value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} />
              
              <div className="grid grid-cols-2 gap-4">
                <input className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white" 
                  value={formData.marca} onChange={(e) => setFormData({...formData, marca: e.target.value})} placeholder="Marca" />
                <input className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white" 
                  value={formData.modelo} onChange={(e) => setFormData({...formData, modelo: e.target.value})} placeholder="Modelo" />
              </div>

              <div className="border-2 border-dashed border-slate-700 p-4 rounded-lg text-center">
                <p className="text-xs text-slate-400 mb-2">Subir Manual Técnico (PDF)</p>
                <input type="file" accept=".pdf" onChange={handleFileUpload} className="text-xs text-slate-400 file:bg-blue-600 file:border-0 file:text-white file:rounded-md file:px-2 cursor-pointer" />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-slate-400">Cancelar</button>
                <button type="submit" disabled={cargando} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">
                  {cargando ? "Procesando..." : "Actualizar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}