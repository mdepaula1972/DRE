import requests
import json

# Local URL (if running locally) or Vercel URL
URL = "http://localhost:3000/api/omie/sync-period"
# Since I can't reach localhost:3000 from here easily if it's not running, 
# I'll check if I can just simulate the logic.

# Actually, I'll just check the Supabase table again to see if ANY row was added today.
import os
from dotenv import load_dotenv
load_dotenv()

def check_recent():
    url = os.getenv('SUPABASE_URL') + '/rest/v1/omie_raw?select=id,sync_at&order=sync_at.desc&limit=5'
    headers = {'apikey': os.getenv('SUPABASE_SERVICE_KEY'), 'Authorization': 'Bearer ' + os.getenv('SUPABASE_SERVICE_KEY')}
    res = requests.get(url, headers=headers).json()
    print("Recent items in omie_raw:")
    for r in res:
        print(r)

if __name__ == "__main__":
    check_recent()
