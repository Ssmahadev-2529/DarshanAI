"""
Database Backup & Disaster Recovery Utility for DARSHANAI 2.0
Supports both production PostgreSQL instances and local SQLite fallbacks.
"""

import os
import sys
import shutil
import subprocess
from datetime import datetime

# Add root directory to python path
sys.path.insert(0, os.path.abspath("."))
from backend.config import settings

BACKUP_DIR = os.path.join(os.getcwd(), "backups")
os.makedirs(BACKUP_DIR, exist_ok=True)

def backup_database():
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    db_url = settings.DATABASE_URL

    print(f"[*] Initiating database backup at {datetime.utcnow().isoformat()} UTC...")
    print(f"[*] Engine configured: {db_url.split('://')[0]}")

    if db_url.startswith("sqlite"):
        db_path = db_url.replace("sqlite:///", "").replace("sqlite://", "")
        # Resolve path
        if not os.path.isabs(db_path):
            db_path = os.path.abspath(db_path)

        if not os.path.exists(db_path):
            print(f"[!] Warning: SQLite database file not found at {db_path}")
            return False

        backup_file = os.path.join(BACKUP_DIR, f"darshanai_sqlite_{timestamp}.db")
        shutil.copy2(db_path, backup_file)
        file_size_kb = round(os.path.getsize(backup_file) / 1024, 2)
        print(f"[+] SQLite database successfully backed up:")
        print(f"    File: {backup_file}")
        print(f"    Size: {file_size_kb} KB")
        return True

    elif db_url.startswith("postgresql"):
        backup_file = os.path.join(BACKUP_DIR, f"darshanai_postgres_{timestamp}.sql")
        cmd = f"pg_dump {db_url} -f {backup_file}"
        try:
            subprocess.run(cmd, shell=True, check=True)
            print(f"[+] PostgreSQL database dump created successfully: {backup_file}")
            return True
        except subprocess.CalledProcessError as e:
            print(f"[-] pg_dump execution failed: {e}")
            return False
    else:
        print(f"[!] Unsupported database URI schema: {db_url}")
        return False

if __name__ == "__main__":
    success = backup_database()
    sys.exit(0 if success else 1)
