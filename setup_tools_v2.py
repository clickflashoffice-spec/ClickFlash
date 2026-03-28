import urllib.request
import zipfile
import os
import io
import shutil
import sys

def setup_repo(url, dest_folder):
    print(f"Setting up {dest_folder} from {url}")
    try:
        # User-Agent is often required for GitHub ZIP downloads via urllib
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        
        with urllib.request.urlopen(req) as response:
            print(f"Status code: {response.getcode()}")
            data = response.read()
            print(f"Downloaded {len(data)} bytes")
            
            with zipfile.ZipFile(io.BytesIO(data)) as zip_ref:
                temp_extract = dest_folder + "_temp"
                if os.path.exists(temp_extract): shutil.rmtree(temp_extract)
                os.makedirs(temp_extract, exist_ok=True)
                zip_ref.extractall(temp_extract)
                
                # Find the root folder in the zip
                root_contents = os.listdir(temp_extract)
                if not root_contents:
                    print("Error: Zip file is empty")
                    return
                
                top_folder = os.path.join(temp_extract, root_contents[0])
                print(f"Extracting from {top_folder} to {dest_folder}")
                
                if not os.path.exists(dest_folder):
                    os.makedirs(dest_folder, exist_ok=True)
                
                for item in os.listdir(top_folder):
                    s = os.path.join(top_folder, item)
                    d = os.path.join(dest_folder, item)
                    if os.path.exists(d):
                        if os.path.isdir(d): shutil.rmtree(d)
                        else: os.remove(d)
                    shutil.move(s, d)
                
                shutil.rmtree(temp_extract)
                print(f"Successfully setup {dest_folder}")

    except Exception as e:
        print(f"Failed setup: {e}")

if __name__ == "__main__":
    tools = [
        ("https://codeload.github.com/router-for-me/CLIProxyAPI/zip/refs/heads/main", ".agent/tools/CLIProxyAPI"),
        ("https://codeload.github.com/CaviraOSS/OpenMemory/zip/refs/heads/main", ".agent/tools/OpenMemory")
    ]
    
    for url, dest in tools:
        setup_repo(url, dest)
