# ID Visual - Dash Mar Brasil (v1.6+)

> **Padrão Estético: Ember Cockpit**  
> Uma interface voltada para performance, profundidade e contraste extremo.

---

## 🎨 Paleta de Cores Oficial

### 🌑 Fundo Principal (Deep Base)
- **Black Abyss**: `#0A0A0A`
  - Utilizado em fundos de página, sidebars e containers de baixo nível.

### 🔥 Degradê Ember (Oficial)
Este degradê representa a energia e o movimento do sistema.

| Nível | Nome | Hex | Aplicação |
| :--- | :--- | :--- | :--- |
| **Deep** | Ember Core | `#C2410C` | Sombras, estados ativos profundos. |
| **Mid** | Blaze Mid | `#EA580C` | Cor de transição para degradês. |
| **Primary** | Ignition | `#F97316` | Botões, ícones principais, bordas de destaque. |
| **Light** | Glow Tip | `#FB923C` | Hovers, brilhos superficiais, textos de destaque. |

### ⚪ Tipografia e Contraste
- **Pure White**: `#FFFFFF`
  - Para todos os textos críticos, títulos e ícones sobre fundo escuro.

---

## 🛠️ Utilidades CSS (Tokens)

```css
:root {
  --cockpit-bg: #0A0A0A;
  --cockpit-primary: #F97316;
  --cockpit-primary-core: #C2410C;
  --cockpit-primary-mid: #EA580C;
  --cockpit-primary-glow: #FB923C;
  --cockpit-foreground: #FFFFFF;
  
  --cockpit-gradient: linear-gradient(135deg, #C2410C 0%, #F97316 50%, #FB923C 100%);
}
```

---

## 📐 Diretrizes de Aplicação (Somente Página de Empresas)
1. **Background**: Sempre `#0A0A0A`.
2. **Cards**: Fundo com leve transparência (`#161616` ou similar) e bordas finas com o tom `Ember Core`.
3. **Botões**: Devem usar o `--cockpit-gradient` para impacto máximo.
4. **Ficha de Detalhamento**: Manter o contraste Pure White sobre o Black Abyss.

---

## 🔡 Tipografia - Três Famílias, Três Funções

A voz tipográfica é composta por três fontes que equilibram tecnologia, legibilidade e precisão.

### 1. Space Grotesk (Bold 700 / Medium 500)
- **Função**: Display / Headings / Wordmark
- **Tamanhos**:
  - Hero (Títulos Principais): `72-96px`
  - Section (Títulos de Seção): `36-48px`
  - Subtitle: `20-24px`
- **Tracking**: +2% a +4% (especialmente no wordmark).

### 2. Inter (Medium 500 / Regular 400)
- **Função**: Body Text / UI / Parágrafos
- **Tamanhos**:
  - Body: `16-18px`
  - Caption: `12-14px`
- **Legenda**: Inter 14px `#71717A` (Cinza neutro).

### 3. JetBrains Mono (Bold 700 / Regular 400)
- **Função**: Métricas / Dados / Código
- **Tamanhos**:
  - Metric: `32-48px`
- **Uso**: Todos os campos numéricos, CNPJ, Datas e Valores Financeiros.
