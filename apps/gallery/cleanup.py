import os
import shutil

base_dir = r'C:\Users\alamo\Desktop\ClickFlash\apps\gallery\src\components'

to_delete = [
    'albums',
    'bookings',
    'dashboard',
    'management',
    'orders',
    'photographers',
    'products',
    'settings',
    'Orders.tsx',
    'AlbumsPage.tsx'
]

for item in to_delete:
    path = os.path.join(base_dir, item)
    if os.path.exists(path):
        if os.path.isdir(path):
            shutil.rmtree(path)
        else:
            os.remove(path)
        print(f"Deleted {path}")

# also clean up services/api
api_dir = r'C:\Users\alamo\Desktop\ClickFlash\apps\gallery\src\services\api'
if os.path.exists(api_dir):
    shutil.rmtree(api_dir)
    print(f"Deleted {api_dir}")
    
api_service = r'C:\Users\alamo\Desktop\ClickFlash\apps\gallery\src\services\apiService.ts'
if os.path.exists(api_service):
    os.remove(api_service)
    print(f"Deleted {api_service}")

pb_management = r'C:\Users\alamo\Desktop\ClickFlash\apps\gallery\src\services\pbManagement.ts'
if os.path.exists(pb_management):
    os.remove(pb_management)
    print(f"Deleted {pb_management}")
