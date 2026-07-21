"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter, usePathname } from "next/navigation"; // Importamos navegación

interface AuthContextType {
  user: any;
  perfil: any | null;
  obtenerPerfil: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname(); // Capturamos la ruta actual

  const obtenerPerfil = async (userId: string) => {
    const { data } = await supabase
      .from("perfiles")
      .select("*")
      .eq("id", userId)
      .single();
    setPerfil(data);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPerfil(null);
    router.push("/login");
  };

  // 1. Sincronización de Sesión
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        obtenerPerfil(session.user.id);
      } else {
        setPerfil(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Guardia de Rutas (Evita que te pateen al login) [cite: 2026-03-04]
  useEffect(() => {
    // Definimos las páginas que NO requieren estar logueado
    const rutasPublicas = ['/login', '/forgot-password', '/update-password'];
    
    // Si terminó de cargar, no hay usuario y la ruta NO es pública, mandamos al login
    if (!loading && !user && !rutasPublicas.includes(pathname)) {
      router.push("/login");
    }
  }, [user, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, perfil, obtenerPerfil, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
};