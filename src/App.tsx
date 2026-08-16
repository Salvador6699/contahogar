import { useState, useEffect } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ScrollToTop from "./components/ScrollToTop";
import AppLayout from "./components/AppLayout";
import { AutoBackupManager } from "./components/AutoBackupManager";

import { AuthProvider } from "./contexts/AuthContext";
import { TeamProvider } from "./contexts/TeamContext";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";

import TeamSelectPage from "./pages/auth/TeamSelectPage";

import { syncRecurringTransactionsToSupabase } from "@/lib/recurrence";

import Index from "./pages/Index";
import HistoryPage from "./pages/HistoryPage";
import ComparisonPage from "./pages/ComparisonPage";
import SettingsPage from "./pages/SettingsPage";
import BackupPage from "./pages/BackupPage";
import TransferPage from "./pages/TransferPage";
import SearchPage from "./pages/SearchPage";
import BudgetPage from "./pages/BudgetPage";
import SavingsPage from "./pages/SavingsPage";
import FavoritesPage from "./pages/FavoritesPage";
import LoansPage from "./pages/LoansPage";
import NotFound from "./pages/NotFound";
import TeamsPage from "./pages/TeamsPage";
import UpcomingPage from "./pages/UpcomingPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 2,
    },
  },
});

const App = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      // Sincronizar transacciones recurrentes en Supabase
      try {
        await syncRecurringTransactionsToSupabase();
      } catch (error) {
        console.error("Error sincronizando transacciones recurrentes:", error);
      }
      setIsReady(true);
    };
    
    initApp();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          
          {isReady && (
            <AuthProvider>
              <TeamProvider>
                <BrowserRouter>
                  <AutoBackupManager />
                  <ScrollToTop />
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    
                    {/* Rutas Protegidas */}
                    <Route element={<ProtectedRoute />}>
                      <Route path="/select-team" element={<TeamSelectPage />} />
                      
                      <Route element={<AppLayout />}>
                        <Route path="/" element={<Index />} />
                        <Route path="/historial" element={<HistoryPage />} />
                        <Route path="/comparativa" element={<ComparisonPage />} />
                        <Route path="/ajustes" element={<SettingsPage />} />
                        <Route path="/equipos" element={<TeamsPage />} />
                        <Route path="/backup" element={<BackupPage />} />
                        <Route path="/transferir" element={<TransferPage />} />
                        <Route path="/buscar" element={<SearchPage />} />
                        <Route path="/presupuestos" element={<BudgetPage />} />
                        <Route path="/ahorros" element={<SavingsPage />} />
                        <Route path="/prestamos" element={<LoansPage />} />
                        <Route path="/favorites" element={<FavoritesPage />} />
                        <Route path="/proximos" element={<UpcomingPage />} />
                      </Route>
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TeamProvider>
            </AuthProvider>
          )}
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
