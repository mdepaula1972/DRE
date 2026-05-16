import os
import requests
from dotenv import load_dotenv

load_dotenv()

URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_SERVICE_KEY")
# Usando a API de RPC ou SQL se disponível, ou apenas tentando inserir um registro com a nova coluna
# No Supabase REST, se a coluna não existe, a inserção falha.
# Vou tentar verificar se o usuário pode rodar SQL via Dashboard ou se eu crio uma tabela nova.

# Mas antes, vou atualizar o script de sincronização para JÁ prever essa coluna.
# Se ela não existir, o Supabase vai avisar e eu peço para você criar ou tento criar via RPC.
