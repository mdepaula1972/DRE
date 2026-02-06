# 📘 Instruções de Deploy - Migração para Supabase

## ✅ Passo 1: Executar Script SQL no Supabase

1. **Acesse o Supabase Dashboard**
   - Vá para: <https://ngtjhwswbbivqajtpjvg.supabase.co>
   - Faça login

2. **Abra o SQL Editor**
   - No menu lateral, clique em **"SQL Editor"**
   - Clique em **"New query"**

3. **Cole e Execute o Script**
   - Abra o arquivo: `migrations/001_gestao_integrada.sql`
   - Copie TODO o conteúdo do arquivo
   - Cole no SQL Editor do Supabase
   - Clique em **"Run"** (ou pressione `Ctrl+Enter`)

4. **Verificar Sucesso**
   - Você deve ver a mensagem: `✅ Migration concluída com sucesso!`
   - Verifique se as tabelas foram criadas:
     - Vá em **"Table Editor"**
     - Confirme que existem: `notas_fiscais`, `impostos_trimestrais`
     - Verifique que `contratos_base` tem os novos campos (tem_iss, aliquota_iss, etc.)

---

## ✅ Passo 2: Deploy da API no Vercel

A API já está criada no arquivo `/api/gestao-integrada.js`.

**Opções de Deploy:**

### Opção A: Via GitHub (Recomendado)

1. Commite o arquivo `api/gestao-integrada.js` para o repositório
2. Aguarde o deploy automático do Vercel
3. Teste o endpoint: `https://seu-dominio.vercel.app/api/gestao-integrada?type=init`

### Opção B: Deploy Manual

1. No Vercel Dashboard, vá até seu projeto
2. Navegue até a aba **"Deployments"**
3. Clique em **"Redeploy"**

**Verificar Deploy:**

```bash
# Teste o endpoint de inicialização
curl "https://seu-dominio.vercel.app/api/gestao-integrada?type=init"

# Resposta esperada:
{
  "success": true,
  "contratos": [...]
}
```

---

## ✅ Passo 3: Atualizar Cadastro de Contratos

### A) Adicionar Campos na Interface

Os campos de ISS/ICMS precisam ser adicionados ao formulário de contratos existente.

**Localização**: `contratos.html`

**Campos a Adicionar** (após os campos existentes):

```html
<!-- Seção de Configuração de Impostos -->
<div class="modal-section">
  <h6 class="text-uppercase fw-bold mb-3">Configuração de Impostos</h6>
  
  <div class="row">
    <div class="col-md-6 mb-3">
      <div class="form-check mb-2">
        <input class="form-check-input" type="checkbox" id="inputTemISS">
        <label class="form-check-label" for="inputTemISS">
          Este contrato tem ISS?
        </label>
      </div>
      <div id="grupoISS" style="display: none;">
        <label class="form-label small">Alíquota ISS (%)</label>
        <input type="number" step="0.01" min="0" max="100" 
               class="form-control form-control-sm" 
               id="inputAliquotaISS" placeholder="Ex: 2.5">
      </div>
    </div>
    
    <div class="col-md-6 mb-3">
      <div class="form-check mb-2">
        <input class="form-check-input" type="checkbox" id="inputTemICMS">
        <label class="form-check-label" for="inputTemICMS">
          Este contrato tem ICMS?
        </label>
      </div>
      <div id="grupoICMS" style="display: none;">
        <label class="form-label small">Alíquota ICMS (%)</label>
        <input type="number" step="0.01" min="0" max="100" 
               class="form-control form-control-sm" 
               id="inputAliquotaICMS" placeholder="Ex: 12">
      </div>
    </div>
  </div>
  
  <div class="form-check">
    <input class="form-check-input" type="checkbox" id="inputPorEquipamentos">
    <label class="form-check-label" for="inputPorEquipamentos">
      <strong>Faturamento por número de equipamentos</strong>
      <small class="d-block text-muted">Marque se o valor do contrato depende da quantidade de equipamentos</small>
    </label>
  </div>
</div>

<script>
// Lógica de toggle dos campos
document.getElementById('inputTemISS').addEventListener('change', function() {
  document.getElementById('grupoISS').style.display = this.checked ? 'block' : 'none';
});

document.getElementById('inputTemICMS').addEventListener('change', function() {
  document.getElementById('grupoICMS').style.display = this.checked ? 'block' : 'none';
});
</script>
```

### B) Atualizar Lógica de Salvamento

No arquivo `contratos.js`, ao salvar um contrato, incluir os novos campos:

```javascript
// Ao criar/editar contrato, incluir:
const contratoData = {
  nome_contrato: ...,
  empresa: ...,
  // NOVOS CAMPOS:
  tem_iss: document.getElementById('inputTemISS').checked,
  aliquota_iss: document.getElementById('inputTemISS').checked ? 
    parseFloat(document.getElementById('inputAliquotaISS').value) : 0,
  tem_icms: document.getElementById('inputTemICMS').checked,
  aliquota_icms: document.getElementById('inputTemICMS').checked ? 
    parseFloat(document.getElementById('inputAliquotaICMS').value) : 0,
  contrato_por_equipamentos: document.getElementById('inputPorEquipamentos').checked
};
```

---

## ✅ Passo 4: Migrar Contratos Existentes

Se você já tem contratos cadastrados, eles precisam dos novos campos. Você pode:

### Opção A: Atualizar Via SQL (Rápido)

```sql
-- Executar no Supabase SQL Editor para atualizar contratos existentes
-- Exemplo: marcar contratos específicos

UPDATE contratos_base 
SET 
  tem_iss = true,
  aliquota_iss = 2.5,
  tem_icms = false,
  aliquota_icms = 0,
  contrato_por_equipamentos = false
WHERE nome_contrato = 'Nome do Contrato';

-- Repetir para cada contrato conforme necessário
```

### Opção B: Atualizar Via Interface (Recomendado)

1. Acesse a página de contratos
2. Edite cada contrato individualmente
3. Configure os campos de ISS/ICMS conforme apropriado
4. Salve

---

## ✅ Passo 5: Testar o Sistema

### Teste 1: Carregar Página

1. Abra `gestao-integrada.html` no navegador
2. Verifique o console do navegador (F12)
3. Deve aparecer: `[Supabase] Inicialização completa`

### Teste 2: Criar Nova NF

1. Clique em "Nova NF"
2. Selecione um contrato
3. Preencha os dados
4. Verifique o preview de impostos
5. Salve

### Teste 3: Validar no Supabase

1. Vá ao Supabase → Table Editor → `notas_fiscais`
2. Confirme que a NF foi salva
3. Verifique se os impostos foram calculados corretamente

### Teste 4: Configurar Imposto Trimestral

1. Clique em "Config. Impostos Trimestrais"
2. Selecione o ano (2026)
3. Informe o valor bruto do Q1
4. Salve
5. Verifique no Supabase → `impostos_trimestrais`

---

## ⚠️ Troubleshooting

### Erro: "Configuração do Supabase incompleta"

- Verifique as variáveis de ambiente no Vercel:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

### Erro: "Tabela não existe"

- Execute novamente o script SQL migration
- Verifique se não há erros no SQL Editor

### Erro: "Permissão negada" (RLS)

- Verifique as políticas RLS no Supabase
- Certifique-se de estar autenticado

### NFs não aparecem na tabela

- Abra o console do navegador (F12)
- Verifique se há erros no carregamento
- Teste o endpoint diretamente: `/api/gestao-integrada?type=invoices`

---

## 📋 Checklist de Deploy

- [ ] Script SQL executado no Supabase
- [ ] Tabelas criadas (notas_fiscais, impostos_trimestrais)
- [ ] Campos adicionados em contratos_base
- [ ] API deployada no Vercel
- [ ] Endpoint testado e funcionando
- [ ] Interface de contratos atualizada
- [ ] Contratos existentes migrados
- [ ] Teste completo de criação de NF
- [ ] Teste de impostos trimestrais
- [ ] Validação de dados no Supabase

---

## 🎯 Próximos Passos

Após completar o deploy:

1. **Cadastrar Configurações Iniciais**
   - Configure impostos trimestrais de 2026
   - Revise e ajuste contratos existentes

2. **Começar a Usar**
   - Cadastre as primeiras NFs
   - Teste o fluxo de pagamento e comissões

3. **Monitorar**
   - Acompanhe os logs do Vercel
   - Verifique integridade dos dados no Supabase
   - Valide cálculos de impostos

---

**Dúvidas ou problemas?** Consulte os logs ou reporte issues!
