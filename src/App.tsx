import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Facturas from "./pages/Facturas";
import Inventario from "./pages/Inventario";
import AbrirCaja from "./pages/AbrirCaja";
import Ventas from "./pages/Ventas";
import Usuarios from "./pages/Usuarios";
import Compradores from "./pages/Compradores";
import Locales from "./pages/Locales";
import Remisiones from "./pages/Remisiones";
import Pedidos from "./pages/Pedidos";
import Proveedores from './pages/Proveedores';
import Tallas from './pages/Tallas';
import FacturasVenta from './pages/FacturasVenta';
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/facturas" element={<ProtectedRoute><AdminRoute><Facturas /></AdminRoute></ProtectedRoute>} />
    <Route path="/inventario" element={<ProtectedRoute><Inventario /></ProtectedRoute>} />
    <Route path="/abrir-caja" element={<ProtectedRoute><AbrirCaja /></ProtectedRoute>} />
    <Route path="/remisiones" element={<ProtectedRoute><Remisiones /></ProtectedRoute>} />
    <Route path="/ventas" element={<ProtectedRoute><Ventas /></ProtectedRoute>} />
    <Route path="/pedidos" element={<ProtectedRoute><Pedidos /></ProtectedRoute>} />
    <Route path="/facturas-venta" element={<ProtectedRoute><FacturasVenta /></ProtectedRoute>} />
    <Route path="/compradores" element={<ProtectedRoute><Compradores /></ProtectedRoute>} />
    <Route path="/proveedores" element={<ProtectedRoute><AdminRoute><Proveedores /></AdminRoute></ProtectedRoute>} />
    <Route path="/tallas" element={<ProtectedRoute><AdminRoute><Tallas /></AdminRoute></ProtectedRoute>} />
    <Route path="/locales" element={<ProtectedRoute><AdminRoute><Locales /></AdminRoute></ProtectedRoute>} />
    <Route path="/usuarios" element={<ProtectedRoute><AdminRoute><Usuarios /></AdminRoute></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
