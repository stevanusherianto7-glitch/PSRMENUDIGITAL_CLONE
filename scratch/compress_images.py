import os
from PIL import Image

def compress_folder(folder_path):
    print(f"\nCompressing folder: {folder_path}")
    if not os.path.exists(folder_path):
        print("Folder does not exist.")
        return

    files = os.listdir(folder_path)
    total_original = 0
    total_compressed = 0
    compressed_count = 0

    for file in files:
        if file.lower().endswith(('.png', '.jpg', '.jpeg')) and not file.lower().endswith('.webp'):
            input_path = os.path.join(folder_path, file)
            filename, _ = os.path.splitext(file)
            output_path = os.path.join(folder_path, f"{filename}.webp")

            orig_size = os.path.getsize(input_path)
            total_original += orig_size

            try:
                with Image.open(input_path) as img:
                    width, height = img.size
                    max_width = 600
                    if width > max_width:
                        new_width = max_width
                        new_height = int(height * (max_width / width))
                        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                        resized_str = f"Resized from {width}x{height} to {new_width}x{new_height}"
                    else:
                        resized_str = f"Kept dimensions {width}x{height}"

                    if img.mode in ('RGBA', 'LA') and file.lower().endswith('.jpg'):
                        img = img.convert('RGB')

                    img.save(output_path, 'WEBP', quality=80)
                
                comp_size = os.path.getsize(output_path)
                total_compressed += comp_size
                compressed_count += 1

                savings = (orig_size - comp_size) / orig_size * 100
                print(f"[OK] {file:<35} | {orig_size/1024/1024:.2f} MB -> {comp_size/1024:.1f} KB ({savings:.1f}% saved) | {resized_str}")

            except Exception as e:
                print(f"[ERR] Failed to compress {file}: {e}")

    if compressed_count > 0:
        print(f"\nSummary for {os.path.basename(folder_path)}:")
        print(f"Total files compressed: {compressed_count}")
        print(f"Original Size: {total_original/1024/1024:.2f} MB")
        print(f"Compressed Size: {total_compressed/1024/1024:.2f} MB")
        print(f"Total Bandwidth Saved: {(total_original - total_compressed)/1024/1024:.2f} MB ({(total_original - total_compressed)/total_original*100:.1f}% saved!)")

# Compress for both workspaces
compress_folder(r"c:\Users\ASUS\Downloads\PAWON_SALAM\public\imports")
compress_folder(r"c:\Users\ASUS\Downloads\KEDAI_ELVERA57\public\imports")
