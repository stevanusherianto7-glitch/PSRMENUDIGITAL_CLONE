import os
import shutil

src_file = r"c:\Users\ASUS\Downloads\PAWON_SALAM\src\app\components\DashboardModule.tsx"
dest_file = r"c:\Users\ASUS\Downloads\KEDAI_ELVERA57\src\app\components\DashboardModule.tsx"

print(f"Syncing DashboardModule.tsx from {src_file} -> {dest_file}")

if not os.path.exists(src_file):
    print("Source file does not exist!")
    exit(1)

# Read the fully updated Kedai Elvera 57 dashboard file
with open(src_file, "r", encoding="utf-8") as f:
    content = f.read()

# Replace Kedai Elvera 57 specific brand names with Kedai Elvera 57 counterparts
content = content.replace("PAWON SALAM", "KEDAI ELVERA 57")
content = content.replace("Kedai Elvera 57 POS", "Kedai Elvera 57 POS")
content = content.replace("localStorage.getItem(\"pawon_simulated_tx\")", "localStorage.getItem(\"elvera_simulated_tx\")")
content = content.replace("localStorage.setItem(\"pawon_simulated_tx\"", "localStorage.setItem(\"elvera_simulated_tx\"")
content = content.replace("localStorage.removeItem(\"pawon_simulated_tx\")", "localStorage.removeItem(\"elvera_simulated_tx\")")

# Write to Kedai Elvera 57 destination
with open(dest_file, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] Synced and patched DashboardModule.tsx for Kedai Elvera 57!")
