from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from rembg import remove
from PIL import Image
import io
import face_service
import culling_service
import enhancement_service

app = FastAPI(title="ClickFlash AI Worker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

        return {
            "status": "success",
            "culling_data": culling_service.evaluate_quality(contents)
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

@app.post("/api/ai/enhance-pro")
async def auto_enhance_pro_image(file: UploadFile = File(...)):
    """
    Performs 'Canvas Pro' level algorithmic auto-enhancement on the uploaded image.
    """
    try:
        contents = await file.read()
        enhanced_bytes = enhancement_service.auto_enhance_pro(contents)

        return Response(content=enhanced_bytes, media_type="image/jpeg")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/magic-eraser")
async def magic_eraser_image(image: UploadFile = File(...), mask: UploadFile = File(...)):
    """
    Performs Magic Eraser (inpainting) using SimpleLama.
    Expects original image and mask image.
    """
    try:
        import inpainting_service
        image_contents = await image.read()
        mask_contents = await mask.read()

        result_bytes = inpainting_service.inpaint(image_contents, mask_contents)

        return Response(content=result_bytes, media_type="image/jpeg")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 🛡️ AI SENTINEL & MASTER INSURANCE ENDPOINTS
# ==========================================
from sentinel import sentinel
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class HeartbeatPayload(BaseModel):
    station_id: Optional[str] = "master-node-1"
    active_session_id: Optional[str] = None
    tether_active: Optional[bool] = False
    memory_used_mb: Optional[float] = 0.0
    request_throttle: Optional[bool] = False

class ThrottlePayload(BaseModel):
    is_throttled: bool

@app.get("/api/insurance/status")
def get_insurance_status():
    """Returns real-time telemetry, master connectivity, and buffered photos."""
    return sentinel.get_telemetry()

@app.post("/api/insurance/heartbeat")
def receive_master_heartbeat(payload: HeartbeatPayload):
    """Processes Master Station heartbeat ping."""
    return sentinel.receive_heartbeat(payload.model_dump())

@app.post("/api/insurance/insure-photo")
async def insure_photo_quality(
    file: UploadFile = File(...),
    photo_id: str = "photo_unknown"
):
    """
    Runs fast <50ms multi-metric quality verification and appends to immutable backup journal.
    """
    try:
        contents = await file.read()
        verdict = sentinel.insure_photo(contents, photo_id)
        return verdict
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/insurance/throttle")
def set_ai_throttle(payload: ThrottlePayload):
    """Dynamically throttles AI background jobs when Master UI requires 60/120 FPS."""
    sentinel.is_throttled = payload.is_throttled
    return {"status": "success", "is_throttled": sentinel.is_throttled}

@app.get("/api/insurance/journal")
def get_insurance_journal(limit: int = 100):
    """Returns immutable backup journal entries for zero-loss recovery."""
    return {"entries": sentinel.get_journal_entries(limit)}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
