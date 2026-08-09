from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import Response
import uvicorn
from rembg import remove
from PIL import Image
import io
import face_service
import culling_service
import enhancement_service

app = FastAPI(title="ClickFlash AI Worker", version="1.0.0")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-worker"}

@app.post("/api/ai/face/vector")
async def extract_face_vector(file: UploadFile = File(...)):
    """
    Extracts a 128D or 512D face vector from an uploaded image using InsightFace.
    """
    try:
        contents = await file.read()
        embedding = face_service.extract_face_vector(contents)
        
        if embedding is None:
            raise HTTPException(status_code=400, detail="No face detected in the image")
            
        return {"status": "success", "vector": embedding}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/cull")
async def evaluate_image_quality(file: UploadFile = File(...)):
    """
    Evaluates image quality for culling (blur detection, blink detection).
    """
    try:
        contents = await file.read()
        
        blur_data = culling_service.detect_blur(contents)
        quality_data = culling_service.detect_blinks_and_quality(contents)
        
        return {
            "status": "success",
            "culling_data": {
                **blur_data,
                **quality_data
            }
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/remove-background")
async def remove_background(file: UploadFile = File(...)):
    try:
        # Read the uploaded image
        contents = await file.read()
        input_image = Image.open(io.BytesIO(contents))
        
        # Remove background using rembg
        output_image = remove(input_image)
        
        # Convert back to bytes
        img_byte_arr = io.BytesIO()
        output_image.save(img_byte_arr, format='PNG')
        img_byte_arr = img_byte_arr.getvalue()
        
        return Response(content=img_byte_arr, media_type="image/png")
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/ai/enhance")
async def auto_enhance_image(file: UploadFile = File(...)):
    """
    Performs algorithmic auto-enhancement on the uploaded image.
    (CLAHE and Auto-White Balance)
    """
    try:
        contents = await file.read()
        enhanced_bytes = enhancement_service.auto_enhance(contents)
        
        return Response(content=enhanced_bytes, media_type="image/jpeg")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
