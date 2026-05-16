"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon | ReactNode;
  description?: string;
  trend?: string;
  color?: "primary" | "success" | "warning" | "danger" | "info";
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend,
  color = "primary"
}: StatCardProps) {
  
  const colorMap = {
    primary: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    success: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    warning: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    danger: "text-red-500 bg-red-500/10 border-red-500/20",
    info: "text-sky-500 bg-sky-500/10 border-sky-500/20",
  };

  const renderIcon = () => {
    if (!Icon) return null;
    
    // Se for um componente (função ou ForwardRef object)
    if (typeof Icon === "function" || (typeof Icon === "object" && "render" in Icon)) {
      const IconComp = Icon as any;
      return <IconComp className="size-6" />;
    }
    
    // Se já for um elemento JSX
    return Icon;
  };

  return (
    <Card className="relative bg-white border-slate-100 overflow-hidden group transition-all duration-300 hover:border-orange-500/30 hover:shadow-xl hover:shadow-slate-200/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={cn(
            "p-3 rounded-2xl transition-all duration-300 group-hover:scale-110",
            colorMap[color]
          )}>
            {renderIcon()}
          </div>
          {trend && (
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {trend}
            </span>
          )}
        </div>
        
        <div className="mt-5 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 group-hover:text-slate-600 transition-colors">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-4xl font-mono font-bold tracking-tighter text-slate-900 group-hover:text-orange-500 transition-colors">
              {value}
            </h3>
          </div>
          {description && (
            <p className="text-xs font-medium text-slate-500">
              {description}
            </p>
          )}
        </div>
      </CardContent>
      {/* Glow Effect */}
      <div className="absolute -right-4 -bottom-4 size-24 bg-orange-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </Card>
  );
}
