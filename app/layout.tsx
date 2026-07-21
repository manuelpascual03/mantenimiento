import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { LayoutManager } from "../components/dashboard/layout-manager";
import type { Metadata, Viewport } from "next";

const inter = Inter({ subsets: ["latin"] });

// 1. CONFIGURACIÓN DEL VIEWPORT (Control de zoom y colores de sistema)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#10b981", // Verde MiCRO para la barra del navegador
};

// 2. CONFIGURACIÓN DE IDENTIDAD (Pestaña, Logo y App Nativa)
export const metadata: Metadata = {
  title: "CMMS MiCRO",
  description: "Sistema de Gestión de Mantenimiento MiCRO",
  manifest: "/manifest.json",
  // Vinculamos el icono que subiste a la carpeta public
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CMMS MiCRO",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          {/* El LayoutManager controla los accesos y la visualización de la barra lateral */}
          <LayoutManager>{children}</LayoutManager>
        </AuthProvider>
      </body>
    </html>
  );
}