import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Empréstimos - Mar Brasil",
  description: "Consolidação, acompanhamento e histórico gerencial de empréstimos",
};

export default function LoansLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
