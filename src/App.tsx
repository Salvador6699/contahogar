import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import BudgetPage from "./pages/BudgetPage";
import HistoryPage from "./pages/HistoryPage";
import ComparisonPage from "./pages/ComparisonPage";
import AveragesPage from "./pages/AveragesPage";
import SettingsPage from "./pages/SettingsPage";
import TransferPage from "./pages/TransferPage";
import GuidePage from "./pages/GuidePage";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";
import SplashScreen from "./components/SplashScreen";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
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
              <Route path="/transferir" element={<TransferPage />} />
              <Route path="/guia" element={<GuidePage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
