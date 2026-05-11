import os
import requests
from dotenv import load_dotenv
from pathlib import Path

env_path = Path("d:/DRE-V30 - LANÇAMENTOS FALHOS/.env")
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def run_sql(sql):
    url = f"{SUPABASE_URL}/rest/v1/"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "X-Client-Info": "supabase-js/2.39.7"
    }
    # Supabase REST doesn't support arbitrary SQL. 
    # I need to use the /rpc/exec_sql or similar if exists, 
    # but usually I use a direct postgres connection.
    # Since I don't have psycopg2, I'll use the browser tool to run it in Supabase SQL Editor if possible.
    
    print("Cannot run arbitrary SQL via REST API without a specific RPC function.")
    print("Please run the SQL in fix_duplicates.sql manually in Supabase SQL Editor.")

if __name__ == "__main__":
    with open("d:/DRE-V30 - LANÇAMENTOS FALHOS/scratch/fix_duplicates.sql", "r") as f:
        print(f.read())
