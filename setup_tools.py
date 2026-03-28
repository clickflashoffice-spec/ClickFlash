import urllib.request
import zipfile
import os
import io
import shutil

def setup_repo(url, dest_folder):
    print(f"Setting up {url} -> {dest_folder}")
    try:
        os.makedirs(dest_folder, exist_ok=True)
        # Download ZIP
        with urllib.request.urlopen(url) as response:
            with zipfile.ZipFile(io.BytesIO(response.read())) as zip_ref:
                # GitHub ZIPs have a top-level folder like 'repo-main'
                # Extract to a temp dir first
                temp_extract = dest_folder + "_temp"
                os.makedirs(temp_extract, exist_ok=True)
                zip_ref.extractall(temp_extract)
                
                # Move contents to final dest
                top_folder = os.path.join(temp_extract, os.listdir(temp_extract)[0])
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
        print(f"Failed to setup {dest_folder}: {e}")

if __name__ == "__main__":
    tools = [
        ("https://github.com/router-for-me/CLIProxyAPI/archive/refs/heads/main.zip", ".agent/tools/CLIProxyAPI"),
        ("https://github.com/CaviraOSS/OpenMemory/archive/refs/heads/main.zip", ".agent/tools/OpenMemory")
    ]
    
    for url, dest in tools:
        setup_repo(url, dest)
