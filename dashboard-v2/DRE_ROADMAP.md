# ROADMAP E MEMÓRIA OPERACIONAL DO DRE (Mar Brasil)

> **Importante:** Este arquivo atua como a memória persistente e operacional do módulo DRE. Ele deve ser lido no início das interações e continuamente atualizado a cada nova fase completada, decisão tomada ou alteração estrutural.

## 📊 Histórico e Fases Executadas

### Fase 1: Fundação Técnica (Abril 2026)
- **Status:** Concluído
- **O que foi feito:** Migração da estrutura HTML/Bootstrap para Next.js (App Router). Separação em camadas (`dre.service.ts`), mantendo ingestão manual de CSV em memória. Tabela de cálculo com as fórmulas legadas replicadas.

### Fase 2: Interface Executiva e Analítica (Abril 2026)
- **Status:** Concluído
- **O que foi feito:** Substituição por UI Tailwind. Implementação de KPIs operacionais no topo. Integração com Recharts para *Composição de Custos* e *Evolução*. Adição do Modal de Detalhamento Evolutivo para linhas e cards. Exportação nativa via `window.print()`. Modificação das rotas globais (`/page.tsx`).

---

## 🎯 Decisões Estratégicas Vigentes

1. **Dual-Mode Architecture (Lite vs Pro):** O sistema deve continuar suportando um modo "Lite" baseado estritamente na leitura em memória de CSV, sem bloquear o usuário por falta de conectividade com banco de dados.
2. **Governança Fechada (MVP Comercial):** A parametrização de regras da DRE não terá interface de cliente no primeiro momento. As definições de templates serão mantidas e controladas pelo Backoffice.
3. **Sem Over-Engineering Inicial:** Adiada a necessidade de Event Sourcing completo e integrações pesadas com LLMs. Foco inicial em "Confiança de Dados via Drill-down" e "Alertas Determinísticos".

---

## 🚀 Próximas Etapas (Visão Evolutiva)

### Bloco 1: MVP Comercial (Modo "Lite")
- **Status:** Concluído
- **O que foi feito:** 
  - **Simulador In-Memory (V1):** Adicionado painel sobreposto ativado pelo header com sliders de multiplicadores (+/- %) para Receitas, Custos e Despesas, recalculando FCL instantaneamente.
  - **Drill-down de Confiança Básico (Lineage Lite):** Modal atualizado para possuir abas (Gráfico vs Transações), mostrando as linhas reais do CSV que deram origem ao total de cada mês na DRE.
  - **Alertas Determinísticos Locais:** Criado `dre-alerts.service.ts` para capturar desvios de margem > 5%, escalada de custos/despesas > 15% e quedas de receita consecutivas, sendo renderizados pelo novo componente `SmartAlerts`.

### Bloco 2: Arquitetura Evolutiva de Médio Prazo (Modo Pro)
- **Persistência Supabase Opcional:** Criar infraestrutura para quem desejar operar o DRE sincronizado em banco.
- **DRE Engine JSON:** Retirar a constante fixa `ESTRUTURA_DRE` do código e consumir templates predefinidos (parametrizados via Backoffice).
- **PDF Paginated (jsPDF):** Geração de relatório PDF sofisticado e timbrado, abandonando o `window.print`.

### Bloco 3: Visão DRE 3.0 Futura
- **Event Sourcing de Classificação:** Trilha auditável completa de mudanças de categoria no tempo.
- **Configurador Visual de Regras:** Editor restrito de agrupamentos da estrutura DRE para o cliente.
- **Agente LLM Background:** Relatórios semanais narrativos via Inteligência Artificial que cruzam o DRE atual com metas ou anomalias históricas.

---

## ⚠️ Riscos e Observações Abertas

- **Risco de Divergência de Regras (Linha Serviços):** Existe uma observação pós-homologação de possível anomalia na subtração `Serviços - Consórcios`. O assunto está congelado temporariamente aguardando um novo set de validação confiável vindo do Omie.
- **Convivência de Lançamentos:** A rota `/lancamentos.html` permanece em sua versão legada e sem integração com a lógica Next.js atual, aguardando fase própria de modernização.
