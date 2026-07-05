import os

files = ['src/services/cloudApiService.ts', 'src/services/aiSearchService.ts', 'src/services/geminiClient.ts', 'src/services/syncService.ts']

for f in files:
    path = os.path.join(r'C:\Users\alamo\Desktop\ClickFlash\apps\gallery', f)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Remove pb imports
        content = content.replace('import { pb } from "@/services/pb";\n', '')
        content = content.replace('import { pb } from "./pb";\n', '')
        
        # Replace pb.baseUrlValue
        content = content.replace('pb.baseUrlValue', 'import.meta.env.VITE_API_URL')
        
        # specific gemini client fixes
        if f == 'src/services/geminiClient.ts':
            content = content.replace('photo.filename', 'photo.id')
            content = content.replace('photo.tags', 'photo.url')
            content = content.replace('response.text()', 'response.text ? response.text() : ""')
        
        with open(path, 'w', encoding='utf-8') as file:
            file.write(content)
        print("Fixed", path)
