"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { Search, User, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Employee {
  id: string;
  full_name: string;
  responsible_name?: string;
  email?: string;
  phone?: string;
  job_role?: string;
}

interface SmartContactPickerProps {
  onSelect: (employee: Employee | null) => void;
  defaultValue?: string;
}

export function SmartContactPicker({ onSelect, defaultValue = "" }: SmartContactPickerProps) {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const searchEmployees = async () => {
      if (query.trim().length < 3) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, responsible_name, email, phone, job_role")
        .or(`full_name.ilike.%${query}%,responsible_name.ilike.%${query}%`)
        .limit(5);

      if (!error && data) {
        setSuggestions(data);
      }
      setLoading(false);
      setShowDropdown(true);
    };

    const timer = setTimeout(searchEmployees, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (emp: Employee) => {
    setQuery(emp.full_name);
    setSuggestions([]);
    setShowDropdown(false);
    onSelect(emp);
  };

  const handleClear = () => {
    setQuery("");
    onSelect(null);
    setShowDropdown(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 Transition-colors group-focus-within:text-primary" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Comece a digitar o nome do colaborador..."
          className="pl-10 h-12 rounded-xl border-slate-200 focus-visible:ring-primary/20 focus-visible:border-primary/40 font-medium"
        />
        {loading && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <Loader2 className="size-4 animate-spin text-primary" />
          </div>
        )}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="size-4 text-slate-400" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showDropdown && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Sugestões (PeopleBoard)</span>
            </div>
            {suggestions.map((emp) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => handleSelect(emp)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors border-b border-slate-50 last:border-none"
              >
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <User className="size-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">
                    {emp.responsible_name || emp.full_name}
                  </div>
                  {emp.responsible_name && emp.responsible_name !== emp.full_name ? (
                    <div className="text-[10px] text-slate-400 uppercase font-medium">
                      {emp.full_name}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 uppercase font-black">
                      {emp.job_role || "Colaborador"}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
