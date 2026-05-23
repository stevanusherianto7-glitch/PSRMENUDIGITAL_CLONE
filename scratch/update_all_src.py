import os

def update_entire_directory(dir_path):
    print(f"\nScanning directory: {dir_path}")
    if not os.path.exists(dir_path):
        print("Directory does not exist.")
        return

    replacements = [
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Nasi_Goreng_Jawa.png', '/imports/Nasi_Goreng_Jawa.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Bakmi_Goreng_Jawa.png', '/imports/Bakmi_Goreng_Jawa.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Bakmi_Godog_Jawa.png', '/imports/Bakmi_Godog_Jawa.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Soto_Ayam_Semarang.png', '/imports/Soto_Ayam_Semarang.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Gulai_Mangut_Semarang.png', '/imports/Gulai_Mangut_Semarang.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Nasi_Ayam_Lengkuas_Semarang.png', '/imports/Nasi_Ayam_Lengkuas_Semarang.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Nasi_Ayam_Penyet_Semarang.png', '/imports/Nasi_Ayam_Penyet_Semarang.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Tahu_Gimbal_Semarang.jpg', '/imports/Tahu_Gimbal_Semarang.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Jeruk%20Peras.png', '/imports/Es_Jeruk_Peras.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Jus%20Buah%20Naga.jpg', '/imports/Jus_Buah_Naga.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Jus%20Belimbing.jpg', '/imports/Jus_Belimbing.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Jus%20stroberi.jpg', '/imports/Jus_stroberi.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Teh%20Poci.jpg', '/imports/Teh_Poci.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Pulpy%20Orange.png', '/imports/Pulpy_Orange.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Fanta,%20Sprite,%20Cola.png', '/imports/Fanta,_Sprite,_Cola.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Cleo.png', '/imports/Cleo.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Roti_Bakar_Coklat_Keju.png', '/imports/Roti_Bakar_Coklat_Keju.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Teh%20Pucuk.png', '/imports/Teh_Pucuk.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Lemon%20tea.png', '/imports/Lemon_Tea.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Green%20tea.png', '/imports/Green_tea.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Nipis%20Madu.png', '/imports/Nipis_Madu.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Soda%20Gembira.jpg', '/imports/Soda_Gembira.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Welcome%20Drink.jpg', '/imports/Welcome_Drink.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Es%20Teh.jpg', '/imports/Es_Teh.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Rawon_Semarang.png', '/imports/Rawon_Semarang.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Soto_Pindang_Kudus.png', '/imports/Soto_Pindang_Kudus.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Nasi_Goreng_Mawut_Semarang.png', '/imports/Nasi_Goreng_Mawut_Semarang.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Pisang_Goreng_Coklat_Keju.png', '/imports/Pisang_Goreng_Coklat_Keju.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/public-images/Aqua.png', '/imports/Aqua.webp'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/logo/logo%20pawon%20salam.png', '/logo-kedai-elvera-57.png'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/logo/logo_halal.png', '/logo-kedai-elvera-57.png'),
        ('https://pbitlwrgainrcippjuwd.supabase.co/storage/v1/object/public/logo/ID_halal.png', '/logo-kedai-elvera-57.png')
    ]

    modified_files_count = 0

    for root, dirs, files in os.walk(dir_path):
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx', '.json')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()

                    new_content = content
                    for old, new in replacements:
                        new_content = new_content.replace(old, new)

                    if new_content != content:
                        with open(file_path, "w", encoding="utf-8") as f:
                            f.write(new_content)
                        print(f"[OK] Updated: {os.path.relpath(file_path, dir_path)}")
                        modified_files_count += 1
                except Exception as e:
                    print(f"[ERR] Error reading {file}: {e}")

    print(f"Total modified files in {os.path.basename(dir_path)}: {modified_files_count}")

# Run for both workspaces
update_entire_directory(r"c:\Users\ASUS\Downloads\PAWON_SALAM\src")
update_entire_directory(r"c:\Users\ASUS\Downloads\KEDAI_ELVERA57\src")
