import { useState, useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import ScrollToTop from "./components/ScrollToTop";
import AppLayout from "./components/AppLayout";

import { syncFromBackend, loadData } from "@/lib/storage";
import { syncAndSaveRecurringTransactions } from "@/lib/recurrence";

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
import NotFound from "./pages/NotFound";

const App = () => {

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      // Intentar sincronizar con el backend antes de arrancar
      await syncFromBackend();
      
      // Sincronizar transacciones recurrentes
      const data = loadData();
      syncAndSaveRecurringTransactions(data);
      
      setIsReady(true);
    };
    
    initApp();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Sonner />

        
        {isReady && (
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/historial" element={<HistoryPage />} />
                <Route path="/comparativa" element={<ComparisonPage />} />
                <Route path="/ajustes" element={<SettingsPage />} />
                <Route path="/backup" element={<BackupPage />} />
                <Route path="/transferir" element={<TransferPage />} />
                <Route path="/buscar" element={<SearchPage />} />
                <Route path="/presupuestos" element={<BudgetPage />} />
                <Route path="/ahorros" element={<SavingsPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        )}
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;
