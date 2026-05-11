-- 1. Remover duplicatas mantendo o registro mais recente
DELETE FROM omie_financas_unificado a
USING omie_financas_unificado b
WHERE a.id < b.id
  AND a.empresa_nome = b.empresa_nome
  AND a.omie_id = b.omie_id
  AND a.tipo_registro = b.tipo_registro
  AND a.departamento_nome = b.departamento_nome;

-- 2. Adicionar restrição de unicidade para evitar futuras duplicatas
ALTER TABLE omie_financas_unificado 
ADD CONSTRAINT unique_omie_record UNIQUE (empresa_nome, omie_id, tipo_registro, departamento_nome);
