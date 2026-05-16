"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

interface OrgContextType {
  organizations: Organization[];
  currentOrg: Organization | null;
  setCurrentOrg: (org: Organization) => void;
  isLoading: boolean;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOrgs() {
      try {
        // Direct fetch without user check for Dev Mode
        const { data, error } = await supabase
          .from("organizations")
          .select("id, name, slug, plan")
          .order("name");

        if (error) {
          console.error("Supabase Error fetching orgs:", error);
        }

        if (data && data.length > 0) {
          setOrganizations(data);
          const savedOrgId = localStorage.getItem("selected_org_id");
          const found = data.find(o => o.id === savedOrgId);
          setCurrentOrg(found || data[0]);
        } else {
          console.warn("No organizations found in database.");
        }
      } catch (err) {
        console.error("Critical error in useOrg:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrgs();
  }, []);

  const handleSetCurrentOrg = (org: Organization) => {
    setCurrentOrg(org);
    localStorage.setItem("selected_org_id", org.id);
  };

  return (
    <OrgContext.Provider
      value={{
        organizations,
        currentOrg,
        setCurrentOrg: handleSetCurrentOrg,
        isLoading,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return context;
}
