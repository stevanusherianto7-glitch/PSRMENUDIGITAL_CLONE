from PIL import Image
import os

src = r'c:\Users\ASUS\Downloads\PSRMENUDIGITAL_CLONE\public\icon.png'
pub = r'c:\Users\ASUS\Downloads\PSRMENUDIGITAL_CLONE\public'

img = Image.open(src)
print("Original:", img.size, "mode:", img.mode)

if img.mode != 'RGBA':
    img = img.convert('RGBA')

img192 = img.resize((192, 192), Image.LANCZOS)
img192.save(os.path.join(pub, 'icon-192.png'), 'PNG')
print("icon-192.png saved:", os.path.getsize(os.path.join(pub, 'icon-192.png')), "bytes")

img512 = img.resize((512, 512), Image.LANCZOS)
img512.save(os.path.join(pub, 'icon-512.png'), 'PNG')
print("icon-512.png saved:", os.path.getsize(os.path.join(pub, 'icon-512.png')), "bytes")

img180 = img.resize((180, 180), Image.LANCZOS)
img180.save(os.path.join(pub, 'apple-touch-icon.png'), 'PNG')
print("apple-touch-icon.png saved")

print("Done!")
