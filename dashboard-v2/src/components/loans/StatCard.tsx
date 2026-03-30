"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  trend?: string;
  color?: "blue" | "red" | "green" | "emerald" | "purple" | "amber" | "sky" | "slate";
  description?: string;
  size?: "default" | "large";
}

const colorMap = {
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-200",
    iconBg: "bg-blue-600",
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-200",
    iconBg: "bg-red-500",
  },
  green: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    border: "border-emerald-200",
    iconBg: "bg-emerald-500",
  },
  emerald: {
    bg: "bg-teal-50",
    text: "text-teal-600",
    border: "border-teal-200",
    iconBg: "bg-teal-500",
  },
  purple: {
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    border: "border-indigo-200",
    iconBg: "bg-indigo-500",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-200",
    iconBg: "bg-amber-500",
  },
  sky: {
    bg: "bg-sky-50",
    text: "text-sky-600",
    border: "border-sky-200",
    iconBg: "bg-sky-500",
  },
  slate: {
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
    iconBg: "bg-slate-500",
  },
};

export function StatCard({ title, value, icon, trend, color = "blue", description, size = "default" }: StatCardProps) {
  const colors = colorMap[color];
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 transition-all hover:shadow-md"
    >
      <div className="flex items-center gap-4">
        <div className={`${colors.iconBg} p-3 rounded-xl text-white shrink-0`}>
          {icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {title}
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <h3 className={`font-black text-slate-900 tabular-nums ${size === "large" ? "text-2xl" : "text-xl"}`}>
              {value}
            </h3>
            {trend && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${trend.startsWith('+') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {trend}
              </span>
            )}
          </div>
          {description && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
