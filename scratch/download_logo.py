import urllib.request
from PIL import Image
import os

url = "https://ugfpbkjuxrdgveyfbfks.supabase.co/storage/v1/object/public/logo/logo_kedai_Elvera57.png"
print(f"Downloading {url}...")
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

try:
    with urllib.request.urlopen(req) as response:
        img = Image.open(response)
        
        # Convert to RGBA just in case
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
            
        print("Saving webp format...")
        img.save("public/logo_kedai_Elvera57.webp", "WEBP")
        
        print("Saving png format for icons...")
        img.save("public/icon.png", "PNG")
        
        # If assets folder exists, save there too for Capacitor/Cordova
        if os.path.exists("assets"):
            img.save("assets/icon.png", "PNG")
            img.save("assets/logo.png", "PNG")
            
        print("Success!")
except Exception as e:
    print(f"Error: {e}")
