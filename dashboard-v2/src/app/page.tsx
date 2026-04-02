import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";
import { APP_VERSION } from "@/version";
import { 
  Receipt, 
  TrendingUp, 
  PieChart, 
  CreditCard, 
  ShieldCheck, 
  Gauge, 
  FileText, 
  BadgeDollarSign, 
  Users, 
  Landmark,
  HandCoins
} from "lucide-react";

export const metadata: Metadata = {
  title: `Mar Brasil | Portal Financeiro ${APP_VERSION}`,
  description: "Portal de Gestão Inteligente",
};

export default function LandingPage() {
  const SATELLITES = [
    { href: "/gestao-integrada.html", icon: Receipt, title: "Gestão Integrada", sub: "Faturamento & Impostos" },
    { href: "/dre.html", icon: TrendingUp, title: "DRE Gerencial", sub: "Visão Financeira" },
    { href: "/analise-setorial.html", icon: PieChart, title: "Análise Setorial", sub: "Custos por Área" },
    { href: "/parcelamentos.html", icon: CreditCard, title: "Parcelamentos", sub: "Controle de Dívidas" },
    { href: "/peopleboard", icon: Users, title: "PeopleBoard", sub: "Gestão Cockpit RH" },
    { href: "/seguros.html", icon: ShieldCheck, title: "Seguros", sub: "Gestão de Apólices" },
    { href: "/indicadores_v2.html", icon: Gauge, title: "Indicadores", sub: "KPIs Estratégicos" },
    { href: "/contratos.html", icon: FileText, title: "Contratos", sub: "Vínculo Faturamento" },
    { href: "/comissoes.html", icon: BadgeDollarSign, title: "Comissões", sub: "Divisão Equipe" },
    { href: "/mutuos.html", icon: Landmark, title: "Mútuos & Dividendos", sub: "Transferências" },
  ];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.scene}>
        <div className={`${styles.orbitalRing} ${styles.ring1}`}></div>
        <div className={`${styles.orbitalRing} ${styles.ring2}`}></div>

        <div className={styles.core}>
          <div className={styles.coreGlow}></div>
          <img 
            src="/mar-brasil-logo.png" 
            alt="Logo Mar Brasil" 
            className={styles.coreImg}
          />
        </div>

        {/* Orbs / Satellites */}
        {SATELLITES.map((sat, idx) => {
          const angle = idx * (360 / SATELLITES.length);
          const Icon = sat.icon;
          
          return (
            <div 
              key={idx} 
              className={styles.satelliteWrapper} 
              style={{ '--start-angle': `${angle}deg`, animationDuration: '60s' } as React.CSSProperties}
            >
              {sat.href.endsWith(".html") ? (
                <a href={sat.href} className={styles.satellite}>
                  <Icon size={40} strokeWidth={1.5} />
                  <span>{sat.title}</span>
                  <p>{sat.sub}</p>
                </a>
              ) : (
                <Link href={sat.href} className={styles.satellite}>
                  <Icon size={40} strokeWidth={1.5} />
                  <span>{sat.title}</span>
                  <p>{sat.sub}</p>
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.hudInfo}>
        Mar Brasil<br />
        Portal de Gestão Inteligente
      </div>

      <div className={styles.hudVersion}>
        v{APP_VERSION.replace('v', '')}
      </div>
    </div>
  );
}
