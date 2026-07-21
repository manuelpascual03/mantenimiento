"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { usePathname, useRouter } from "next/navigation";

export function LayoutManager({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false); // <--- Controla si el Sidebar flota o se esconde
  const pathname = usePathname();
  const router = useRouter();

  const rutasPublicas = ["/login", "/forgot-password", "/update-password"];
  const esRutaPublica = rutasPublicas.includes(pathname);

  // EFECTO: Al cambiar de página (pathname), cerramos el menú automáticamente
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading) {
      if (!user && !esRutaPublica) {
        router.push("/login");
      } 
      else if (user && pathname === "/login") {
        router.push("/");
      }
    }
  }, [user, loading, pathname, router, esRutaPublica]);

  if (loading) return <div className="bg-white h-screen w-full" />;

  if (esRutaPublica) {
    return <div className="min-h-screen bg-white w-full">{children}</div>;
  }

  if (!user) return <div className="bg-white h-screen w-full" />;

  return (
    // relative y overflow-hidden para que el Sidebar no se escape de la pantalla
    <div className="relative flex h-screen w-full overflow-hidden bg-slate-50">
      
      {/* 1. SIDEBAR: Ahora recibe isOpen y la función onClose para cerrarlo desde adentro */}
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* 2. HEADER: Ahora recibe onOpenMenu para activar el botón de las 3 líneas */}
        <Header onOpenMenu={() => setIsMenuOpen(true)} />

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}