"use client";

import * as React from "react";
import { ChevronsUpDown, Plus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useOrg } from "@/hooks/use-org";
import { cn } from "@/lib/utils";

export function TeamSwitcher() {
  const { isMobile } = useSidebar();
  const { organizations, currentOrg, setCurrentOrg } = useOrg();

  if (!currentOrg) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={(props) => (
              <SidebarMenuButton
                {...props}
                size="lg"
                className={cn(
                  "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-14 rounded-2xl border border-white/5 bg-white/5 transition-all duration-300 hover:bg-white/10",
                  props.className
                )}
              >
                <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-orange-500 shadow-lg shadow-orange-500/20 text-white transform transition-transform group-hover:scale-105">
                  <span className="text-base font-black italic tracking-tighter">
                    {currentOrg.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                  <span className="truncate font-black uppercase tracking-tight text-[11px] text-orange-500/80">
                    Dashboard Financeiro
                  </span>
                  <span className="truncate font-bold text-white text-sm">
                    {currentOrg.name}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 opacity-50" />
              </SidebarMenuButton>
            )}
          />
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Organizações
            </DropdownMenuLabel>
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => setCurrentOrg(org)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  {org.name.charAt(0).toUpperCase()}
                </div>
                {org.name}
                <DropdownMenuShortcut>⌘{organizations.indexOf(org) + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">Adicionar org</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
