import os

# Delete unused CheckoutScreen
checkout_screen = r'C:\Users\alamo\Desktop\ClickFlash\apps\gallery\src\components\customer\CheckoutScreen.tsx'
if os.path.exists(checkout_screen):
    os.remove(checkout_screen)

# Fix CheckoutModal
checkout_modal = r'C:\Users\alamo\Desktop\ClickFlash\apps\gallery\src\components\customer\CheckoutModal.tsx'
if os.path.exists(checkout_modal):
    with open(checkout_modal, 'r') as f:
        content = f.read()
    
    # Remove apiService import
    content = content.replace('import { apiService } from "../../services/apiService.ts";\n', '')
    content = content.replace('import { apiService } from "../../services/apiService";\n', '')
    
    # Add Order import if missing
    if 'Order' not in content.split('import {')[1].split('}')[0]:
        content = content.replace('import { Photo, Product } from "../../types.ts";', 'import { Photo, Product, Order } from "../../types.ts";')
    
    with open(checkout_modal, 'w') as f:
        f.write(content)

# Fix CustomerGallery
customer_gallery = r'C:\Users\alamo\Desktop\ClickFlash\apps\gallery\src\components\customer\CustomerGallery.tsx'
if os.path.exists(customer_gallery):
    with open(customer_gallery, 'r') as f:
        content = f.read()
    
    # Remove geminiClient import
    content = content.replace('import { getRelatedPhotos } from "../../services/geminiClient";\n', '')
    
    # fix results, err any
    content = content.replace('(results) => {', '(results: any) => {')
    content = content.replace('(err) => {', '(err: any) => {')
    
    with open(customer_gallery, 'w') as f:
        f.write(content)

# Fix CustomerLayout
customer_layout = r'C:\Users\alamo\Desktop\ClickFlash\apps\gallery\src\components\customer\CustomerLayout.tsx'
if os.path.exists(customer_layout):
    with open(customer_layout, 'r') as f:
        content = f.read()
    
    content = content.replace('import { apiService } from "../../services/apiService";', 'import { cloudApiService } from "../../services/cloudApiService";')
    content = content.replace('apiService.getDestinations()', 'cloudApiService.getDestinations()')
    content = content.replace('apiService.downloadHighRes(photo.id)', 'cloudApiService.downloadHighRes(photo.id)')
    content = content.replace('(d) => d.id', '(d: any) => d.id')
    
    with open(customer_layout, 'w') as f:
        f.write(content)

print("Done fixing TS errors.")
