"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { perfil } = useAuth();

  const allLinks = [
    { name: "Inicio", href: "/", code: "I", roles: ['admin', 'supervisor', 'operario'] },
    { name: "Ordenes", href: "/ordenes", code: "O", roles: ['admin', 'supervisor', 'operario'] },
    { name: "Histórico OT", href: "/historial", code: "H", roles: ['admin'] },
    { name: "Máquinas", href: "/activos", code: "M", roles: ['admin'] },
    { name: "Calendario Preventivos", href: "/preventivos", code: "C", roles: ['admin', 'operario'] },
    { name: "Servicios Externos", href: "/servicios-externos", code: "SE", roles: ['admin'] },
    { name: "Stock Repuestos", href: "/stock", code: "S", roles: ['admin'] },
  ];

  const links = allLinks.filter(link => link.roles.includes(perfil?.rol || ""));

  return (
    <>
      {/* BACKDROP: Fondo oscuro que aparece al abrir */}
      <div 
        onClick={onClose}
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* SIDEBAR: El panel que sale de la izquierda */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-white z-[101] shadow-2xl transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-[env(safe-area-inset-top)] w-full" />
        
        <div className="p-8 flex items-center justify-between">
          <h1 className="text-2xl font-black text-emerald-600 tracking-tighter">CMMS MiCRO</h1>
          <button onClick={onClose} className="text-slate-300 font-black">X</button>
        </div>

        <nav className="flex-1 px-6 space-y-2">
          {links.map((link) => (
            <Link 
              key={link.name} 
              href={link.href} 
              onClick={onClose}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-black transition-all ${pathname === link.href ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <span className="text-sm opacity-65 font-mono">{link.code}</span>
              <span className="text-sm tracking-tight">{link.name}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}