from PIL import Image
import io, base64

img = Image.open('timbrado_mar_brasil.png').convert('RGB')
img.thumbnail((794, 1123))
buf = io.BytesIO()
img.save(buf, format='JPEG', quality=85)
b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
with open('timbrado_b64.js', 'w') as f:
    f.write('window.TIMBRADO_B64 = "data:image/jpeg;base64,' + b64 + '";\n')
print("Criado timbrado_b64.js")
