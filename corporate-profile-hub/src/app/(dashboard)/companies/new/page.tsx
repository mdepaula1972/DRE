"use client";

import { NewCompanyForm } from "@/modules/companies/forms/new-company-form";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NewCompanyPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cadastrar Empresa</h2>
          <p className="text-muted-foreground">
            Adicione uma nova empresa ao seu hub corporativo.
          </p>
        </div>
      </div>

      <NewCompanyForm />
    </div>
  );
}
