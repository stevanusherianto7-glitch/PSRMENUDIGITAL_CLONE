import urllib.request
import os
import subprocess
import sys

# Ensure pillow is installed
try:
    from PIL import Image
    print("Pillow is already installed.")
except ImportError:
    print("Pillow not found, installing via pip...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])
    from PIL import Image

urls = {
    r"c:\Users\ASUS\Downloads\PAWON_SALAM": "https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/logo/logo_halal.png",
    r"c:\Users\ASUS\Downloads\KEDAI_ELVERA57": "https://ugfpbkjuxrdgveyfbfks.supabase.co/storage/v1/object/public/logo/logo_halal.png"
}

for ws, url in urls.items():
    filename = "logo_halal.png"
    print(f"\nProcessing workspace {ws}...")
    try:
        # Download temp file
        temp_path, _ = urllib.request.urlretrieve(url)
        print(f"  Downloaded from {url}")
        
        # Open with Pillow
        img = Image.open(temp_path)
        
        # Resize to max 300px width/height while maintaining aspect ratio
        max_size = (300, 300)
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Ensure output directory exists
        dest_dir = os.path.join(ws, "public")
        os.makedirs(dest_dir, exist_ok=True)
        dest_path = os.path.join(dest_dir, filename)
        
        # Save as optimized PNG with transparency
        img.save(dest_path, "PNG", optimize=True)
        
        file_size = os.path.getsize(dest_path)
        print(f"  [OK] Saved compressed PNG to {dest_path} (size: {file_size / 1024:.2f} KB)")
        
    except Exception as e:
        print(f"  [ERR] Failed to process: {e}")

print("\nAll workspaces processed successfully!")
