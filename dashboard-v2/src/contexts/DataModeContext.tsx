"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type DataMode = "production" | "test";

interface DataModeContextType {
  dataMode: DataMode;
  setDataMode: (mode: DataMode) => void;
  isTestMode: boolean;
}

const DataModeContext = createContext<DataModeContextType | undefined>(undefined);

export function DataModeProvider({ children }: { children: ReactNode }) {
  const [dataMode, setDataModeState] = useState<DataMode>("production");

  useEffect(() => {
    const saved = localStorage.getItem("dataMode") as DataMode;
    if (saved && (saved === "production" || saved === "test")) {
      setDataModeState(saved);
    }
  }, []);

  const setDataMode = (mode: DataMode) => {
    setDataModeState(mode);
    localStorage.setItem("dataMode", mode);
    // Recarregar a página para aplicar a mudança
    window.location.reload();
  };

  return (
    <DataModeContext.Provider value={{ 
      dataMode, 
      setDataMode, 
      isTestMode: dataMode === "test" 
    }}>
      {children}
    </DataModeContext.Provider>
  );
}

export function useDataMode() {
  const context = useContext(DataModeContext);
  if (context === undefined) {
    throw new Error("useDataMode must be used within DataModeProvider");
  }
  return context;
}
