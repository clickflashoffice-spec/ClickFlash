import urllib.request
import urllib.error
import json

data = json.dumps({
    "clientName": "Offline Test Client",
    "email": "offline@test.com",
    "items": [{"id": "test-item-1", "name": "Test Item", "quantity": 1, "price": 15, "photoId": "photo-1"}],
    "total": 15,
    "status": "Pending",
    "date": "2026-06-29"
}).encode('utf-8')

req = urllib.request.Request(
    'http://127.0.0.1:8091/api/collections/orders/records',
    data=data,
    headers={'Content-Type': 'application/json'}
)

try:
    res = urllib.request.urlopen(req)
    print("SUCCESS", res.read().decode())
except urllib.error.HTTPError as e:
    print("ERROR", e.code, e.read().decode())
