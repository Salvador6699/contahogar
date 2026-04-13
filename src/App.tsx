import { useState, useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import BudgetPage from "./pages/BudgetPage";
import HistoryPage from "./pages/HistoryPage";
import ComparisonPage from "./pages/ComparisonPage";
import AveragesPage from "./pages/AveragesPage";
import SettingsPage from "./pages/SettingsPage";
import BackupPage from "./pages/BackupPage";
import TransferPage from "./pages/TransferPage";
import GuidePage from "./pages/GuidePage";
import ManagementPage from "./pages/ManagementPage";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";
import SplashScreen from "./components/SplashScreen";
import { processRecurringTransactions } from "@/lib/automation";

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Run automation on start
    processRecurringTransactions();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Sonner />
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/presupuestos" element={<BudgetPage />} />
            <Route path="/historial" element={<HistoryPage />} />
            <Route path="/comparativa" element={<ComparisonPage />} />
            <Route path="/medias" element={<AveragesPage />} />
            <Route path="/ajustes" element={<SettingsPage />} />
            <Route path="/backup" element={<BackupPage />} />
            <Route path="/transferir" element={<TransferPage />} />
            <Route path="/guia" element={<GuidePage />} />
            <Route path="/gestion" element={<ManagementPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;
