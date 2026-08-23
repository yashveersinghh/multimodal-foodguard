import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { Navbar } from "./components/Navbar";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { Dashboard } from "./pages/Dashboard";
import { Analyzer } from "./pages/Analyzer";
import { Results } from "./pages/Results";
import { History } from "./pages/History";
import { About } from "./pages/About";

import { AnalysisResult } from "./types";

const queryClient = new QueryClient();

type ViewState = "dashboard" | "analyzer" | "results" | "history" | "about";

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewState>("dashboard");

  // Initialize history state from localStorage or empty array
  const [history, setHistory] = useState<AnalysisResult[]>(() => {
    const saved = localStorage.getItem("foodguard_history");
    return saved ? JSON.parse(saved) : [];
  });

  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(
    null,
  );

  // Enforce light theme and set root background to match design
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.backgroundColor = "#FAF8F5";
    document.body.style.backgroundColor = "#FAF8F5";
  }, []);

  // Sync history updates to localStorage
  useEffect(() => {
    localStorage.setItem("foodguard_history", JSON.stringify(history));
  }, [history]);

  const handleAnalysisComplete = (res: AnalysisResult) => {
    setCurrentResult(res);
    setHistory((prev) => [res, ...prev]);
    setCurrentView("results");
  };

  const handleOpenResult = (res: AnalysisResult) => {
    setCurrentResult(res);
    setCurrentView("results");
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#FAF8F5] text-[#111111] antialiased selection:bg-[#E06D53]/20">
      <Navbar
        currentView={currentView}
        setView={(v) => setCurrentView(v as ViewState)}
        historyCount={history.length}
      />

      <main className="flex-1 w-full flex flex-col pb-0">
        {currentView === "dashboard" && (
          <Dashboard onStart={() => setCurrentView("analyzer")} />
        )}

        {currentView === "analyzer" && (
          <Analyzer
            onComplete={handleAnalysisComplete}
            onBack={() => setCurrentView("dashboard")}
          />
        )}

        {currentView === "results" && currentResult && (
          <Results
            result={currentResult}
            onNewAnalysis={() => setCurrentView("analyzer")}
          />
        )}

        {currentView === "results" && !currentResult && (
          <div className="flex-1 flex items-center justify-center p-12 text-center text-black/50 text-sm">
            No analysis result selected. Run a scan to view results.
          </div>
        )}

        {currentView === "history" && (
          <History
            history={history}
            onOpenResult={handleOpenResult}
            onClear={() => setHistory([])}
          />
        )}

        {currentView === "about" && <About />}
      </main>

      <MobileBottomNav
        currentView={currentView}
        setView={(v) => setCurrentView(v as ViewState)}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;