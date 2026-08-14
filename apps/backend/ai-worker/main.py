from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from transformers import AutoModelForImageSegmentation
import torchvision.transforms as T
import torch
from PIL import Image
import io
import face_service
import culling_service
import enhancement_service
import quality_service
import upscale_service
import segmentation_service
import pipeline_service
import scene_composite_service

# Load BiRefNet model once at module level for background removal
birefnet_model = AutoModelForImageSegmentation.from_pretrained('ZhengPeng7/BiRefNet', trust_remote_code=True)
birefnet_model.eval()

# Transform pipeline for input normalization
transform_image = T.Compose([
    T.Resize((1024, 1024)),
    T.ToTensor(),
    T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

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
    Extracts a 512D face vector from an uploaded image using InsightFace.
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

@app.post("/api/ai/face/detect-all")
async def detect_all_faces(file: UploadFile = File(...)):
    """
    Detects all faces in an image and extracts 512D normalized embeddings, bboxes, age, and gender.
    """
    try:
        contents = await file.read()
        faces = face_service.extract_all_faces(contents)
        return {"status": "success", "count": len(faces), "faces": faces}
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

@app.post("/api/ai/quality-assess")
async def assess_perceptual_quality(file: UploadFile = File(...)):
    """
    Evaluates perceptual image quality using the MUSIQ deep learning model.
    """
    try:
        contents = await file.read()

        return {
            "status": "success",
            "quality_data": quality_service.assess_perceptual_quality(contents)
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
        input_image = Image.open(io.BytesIO(contents)).convert("RGB")

        # Remove background using BiRefNet (upgraded from rembg)
        input_tensor = transform_image(input_image).unsqueeze(0)
        
        with torch.no_grad():
            preds = birefnet_model(input_tensor)[-1].sigmoid().cpu()
            
        pred = preds[0].squeeze()
        mask = T.ToPILImage()(pred).resize(input_image.size, Image.Resampling.LANCZOS)
        
        output_image = input_image.copy()
        output_image.putalpha(mask)
        
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


# =============================================================================
# NEW OSS ENDPOINTS (Added by ecosystem audit)
# =============================================================================

@app.post("/api/ai/upscale")
async def upscale_image(file: UploadFile = File(...), scale: int = 4):
    """
    AI super-resolution using Real-ESRGAN (BSD-3, 28K★).
    Supports 2x and 4x upscaling.
    """
    try:
        contents = await file.read()
        result = upscale_service.upscale_image(contents, scale)
        return Response(content=result, media_type="image/jpeg")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except ImportError as ie:
        raise HTTPException(status_code=503, detail=str(ie))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/segment")
async def segment_image(
    file: UploadFile = File(...),
    points: str = "[]",
    labels: str = "[]",
):
    """
    Interactive segmentation using MobileSAM (MIT).
    Send point coordinates and labels (1=foreground, 0=background).
    """
    import json
    try:
        contents = await file.read()
        pts = json.loads(points)
        lbls = json.loads(labels)

        if pts and lbls:
            mask_bytes = segmentation_service.segment_with_points(contents, pts, lbls)
            return Response(content=mask_bytes, media_type="image/png")
        else:
            # Auto-segment everything
            results = segmentation_service.segment_everything(contents)
            # Return metadata only (masks are too large for JSON)
            return {
                "status": "success",
                "segments": [
                    {"area": r["area"], "bbox": r["bbox"], "score": r["score"]}
                    for r in results
                ],
                "total_segments": len(results),
            }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except ImportError as ie:
        raise HTTPException(status_code=503, detail=str(ie))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/pipeline/process")
async def run_ingestion_pipeline(
    file: UploadFile = File(...),
    auto_enhance: bool = True,
    remove_bg: bool = False,
    upscale_factor: int = 0,
    extract_palette: bool = True,
):
    """
    Executes autonomous end-to-end AI ingestion pipeline (grading, enhancement, segmentation, upscaling, palette).
    """
    try:
        contents = await file.read()
        result = pipeline_service.process_ingestion_pipeline(
            contents,
            auto_enhance=auto_enhance,
            remove_bg=remove_bg,
            upscale_factor=upscale_factor,
            extract_palette=extract_palette,
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/composite-scene")
async def composite_resort_scene(
    foreground_file: UploadFile = File(...),
    background_file: Optional[UploadFile] = None,
    preset_theme: str = "sunset_beach",
    harmonize: bool = True,
):
    """
    Composites a transparent subject cutout (or photo) onto a preset resort theme backdrop.
    """
    try:
        fg_contents = await foreground_file.read()
        bg_contents = await background_file.read() if background_file else None

        result_jpeg = scene_composite_service.composite_foreground_onto_scene(
            fg_contents,
            background_bytes=bg_contents,
            preset_theme=preset_theme,
            apply_color_harmonization=harmonize,
        )
        return Response(content=result_jpeg, media_type="image/jpeg")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
