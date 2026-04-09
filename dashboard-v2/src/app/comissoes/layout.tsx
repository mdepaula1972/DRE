import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gestão de Comissões | Mar Brasil",
  description: "Controle de recebimentos e divisão de comissões por contrato",
};

export default function ComissoesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
