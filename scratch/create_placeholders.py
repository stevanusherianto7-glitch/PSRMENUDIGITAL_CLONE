import os
import shutil

def create_placeholders_for_folder(folder_path):
    print(f"\nCreating placeholders in folder: {folder_path}")
    if not os.path.exists(folder_path):
        print("Folder does not exist.")
        return

    # List of mappings: (destination_filename, source_filename)
    mappings = [
        ("Nasi_Goreng_Jawa.webp", "Bakmi_Goreng_Jawa.webp"),
        ("Soto_Pindang_Kudus.webp", "Soto_Ayam_Semarang.webp"),
        ("Nasi_Goreng_Mawut_Semarang.webp", "Bakmi_Goreng_Jawa.webp"),
        ("Jus_Buah_Naga.webp", "Soda_Gembira.webp"),
        ("Jus_Belimbing.webp", "Es_Jeruk_Peras.webp"),
        ("Jus_stroberi.webp", "Soda_Gembira.webp"),
        ("Teh_Poci.webp", "Es_Teh.webp"),
        ("Pulpy_Orange.webp", "Es_Jeruk_Peras.webp"),
        ("Fanta,_Sprite,_Cola.webp", "Soda_Gembira.webp"),
        ("Cleo.webp", "Es_Teh.webp"),
        ("Teh_Pucuk.webp", "Es_Teh.webp"),
        ("Green_tea.webp", "Es_Teh.webp"),
        ("Nipis_Madu.webp", "Es_Jeruk_Peras.webp"),
        ("Welcome_Drink.webp", "Soda_Gembira.webp"),
        ("Aqua.webp", "Es_Teh.webp")
    ]

    for dest, src in mappings:
        dest_path = os.path.join(folder_path, dest)
        src_path = os.path.join(folder_path, src)

        if not os.path.exists(dest_path):
            if os.path.exists(src_path):
                shutil.copy2(src_path, dest_path)
                print(f"Copied {src} -> {dest}")
            else:
                print(f"Warning: Source {src} does not exist!")
        else:
            print(f"Skipped {dest} (already exists)")

create_placeholders_for_folder(r"c:\Users\ASUS\Downloads\PAWON_SALAM\public\imports")
create_placeholders_for_folder(r"c:\Users\ASUS\Downloads\KEDAI_ELVERA57\public\imports")
