"use client";

import * as React from "react";
import {
  Building2,
  FileText,
  LayoutDashboard,
  Settings2,
  Share2,
  ShieldCheck,
  Bell,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/layout/nav-user";
import { TeamSwitcher } from "@/components/layout/team-switcher";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import Link from "next/link";

const data = {
  version: "v2.3",
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Empresas",
      url: "/companies",
      icon: Building2,
    },
    {
      title: "Documentos",
      url: "/documents",
      icon: FileText,
    },
    {
      title: "Compartilhamento",
      url: "/sharing",
      icon: Share2,
    },
  ],
  secondary: [
    {
      title: "Governança",
      url: "/governance",
      icon: ShieldCheck,
    },
    {
      title: "Alertas",
      url: "/alerts",
      icon: Bell,
    },
    {
      title: "Configurações",
      url: "/settings",
      icon: Settings2,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">
            Navegação Principal
          </SidebarGroupLabel>
          <SidebarMenu className="gap-2">
            {data.navMain.map((item) => {
              const isActive = pathname === item.url;
              return (
                <SidebarMenuItem key={item.title} className="relative group">
                  {isActive && (
                    <div className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_12px_rgba(242,145,27,0.5)] z-10" />
                  )}
                  <SidebarMenuButton 
                    tooltip={item.title}
                    isActive={isActive}
                    render={(buttonProps) => (
                      <Link 
                        {...buttonProps} 
                        href={item.url} 
                        className={cn(
                            "h-11 rounded-xl px-3 flex items-center gap-4 transition-all duration-300",
                            isActive 
                                ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10" 
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <item.icon className={cn("size-5 transition-transform duration-300", isActive && "scale-110")} />
                        <span className="font-bold tracking-tight">{item.title}</span>
                      </Link>
                    )}
                  />
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="mt-auto border-t border-white/5 pt-4">
          <SidebarGroupLabel className="px-2 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Ferramentas & Suporte
          </SidebarGroupLabel>
          <SidebarMenu className="gap-2">
            {data.secondary.map((item) => {
              const isActive = pathname === item.url;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    tooltip={item.title}
                    isActive={isActive}
                    render={(buttonProps) => (
                      <Link 
                        {...buttonProps} 
                        href={item.url} 
                        className={cn(
                            "h-10 rounded-xl px-3 flex items-center gap-4 transition-all duration-300",
                            isActive 
                                ? "bg-white/10 text-white" 
                                : "text-slate-500 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <item.icon className="size-4 opacity-70" />
                        <span className="font-semibold text-xs tracking-tight">{item.title}</span>
                      </Link>
                    )}
                  />
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-white/5 p-4">
        <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Versão do Sistema</span>
            <span className="text-[10px] font-black text-primary px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                {data.version}
            </span>
        </div>
        <NavUser 
          user={{
            name: "Admin Hub",
            email: "admin@corporativo.com",
            avatar: "",
          }} 
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
