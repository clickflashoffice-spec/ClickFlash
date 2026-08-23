## File Replacement Fallback
If eplace_file_content fails because the target content does not match exactly, DO NOT blindly retry with the same chunk. 
Instead:
1. Call iew_file to get the exact lines from the source of truth.
2. Ensure you are accounting for indentation, especially in React (Vite) and Python (FastAPI) files.
