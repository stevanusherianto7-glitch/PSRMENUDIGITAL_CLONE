import urllib.request
import os

urls = {
    "logo_halal.png": "https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/logo/logo_halal.png",
    "ID_halal.png": "https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/logo/ID_halal.png"
}

workspaces = [
    r"c:\Users\ASUS\Downloads\PAWON_SALAM",
    r"c:\Users\ASUS\Downloads\KEDAI_ELVERA57"
]

for filename, url in urls.items():
    print(f"Downloading {filename} from {url}...")
    try:
        # Download locally to a temp file first
        temp_path, _ = urllib.request.urlretrieve(url)
        
        # Copy to both workspaces' public folders
        for ws in workspaces:
            dest_dir = os.path.join(ws, "public")
            os.makedirs(dest_dir, exist_ok=True)
            dest_path = os.path.join(dest_dir, filename)
            
            # Read from temp and write to dest
            with open(temp_path, 'rb') as f_src:
                content = f_src.read()
            with open(dest_path, 'wb') as f_dest:
                f_dest.write(content)
            
            print(f"  [OK] Saved to {dest_path} (size: {len(content)} bytes)")
            
    except Exception as e:
        print(f"  [ERR] Failed to download {filename}: {e}")

print("Done!")
