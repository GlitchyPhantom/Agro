import urllib.request
import json
import io
from PIL import Image

img = Image.new('RGB', (224, 224), color=(30, 150, 30))
buf = io.BytesIO()
img.save(buf, format='JPEG')
img_bytes = buf.getvalue()

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
body = (
    f'--{boundary}\r\n'
    'Content-Disposition: form-data; name="file"; filename="test_leaf.jpg"\r\n'
    'Content-Type: image/jpeg\r\n\r\n'
).encode('utf-8') + img_bytes + f'\r\n--{boundary}--\r\n'.encode('utf-8')

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/predict',
    data=body,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
)

try:
    with urllib.request.urlopen(req) as resp:
        res_data = resp.read().decode('utf-8')
        parsed = json.loads(res_data)
        print('=== LIVE API PREDICT RESPONSE ===')
        print('Disease:', parsed.get('primary_disease'))
        print('Is Healthy:', parsed.get('is_healthy'))
        print('Advisory length:', len(str(parsed.get('advisory'))))
        print('Advisory Preview:', str(parsed.get('advisory'))[:300])
except Exception as e:
    print('Error:', e)
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))
