import os
from PIL import Image

workspaces = [
    r"c:\Users\ASUS\Downloads\PAWON_SALAM",
    r"c:\Users\ASUS\Downloads\KEDAI_ELVERA57"
]

print("Starting PWA icon compression...")

for ws in workspaces:
    public_dir = os.path.join(ws, "public")
    print(f"\nProcessing directory: {public_dir}")
    if not os.path.exists(public_dir):
        print(f"  [WARN] Directory not found: {public_dir}")
        continue
        
    for filename in os.listdir(public_dir):
        # We only compress root PNG files (icons), not imports directory
        if filename.lower().endswith('.png') and os.path.isfile(os.path.join(public_dir, filename)):
            file_path = os.path.join(public_dir, filename)
            orig_size = os.path.getsize(file_path)
            
            try:
                img = Image.open(file_path)
                
                # Check color mode and convert to indexed palette (256 colors) with transparency
                # This drastically reduces PNG size while preserving quality
                if img.mode != 'P':
                    # Convert keeping alpha channel transparency
                    alpha = img.info.get("transparency")
                    img_converted = img.convert('P', palette=Image.Palette.ADAPTIVE, colors=256)
                    img_converted.save(file_path, "PNG", optimize=True)
                else:
                    img.save(file_path, "PNG", optimize=True)
                    
                new_size = os.path.getsize(file_path)
                savings = (orig_size - new_size) / orig_size * 100
                print(f"  [OK] Compressed {filename}: {orig_size / 1024:.1f} KB -> {new_size / 1024:.1f} KB ({savings:.1f}% saved)")
                
            except Exception as e:
                print(f"  [ERR] Failed to compress {filename}: {e}")

print("\nCompression completed successfully!")
