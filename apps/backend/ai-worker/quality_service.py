import pyiqa
import io
import torch
from torchvision.transforms import functional as F
from PIL import Image

# Load the model once at module level
musiq_model = pyiqa.create_metric('musiq', device='cpu')

def assess_perceptual_quality(image_bytes: bytes) -> dict:
    """
    Decodes the image from bytes and runs MUSIQ inference.
    Returns a dict with musiq_score (0-100 normalized), quality_tier, and is_gallery_ready.
    """
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = F.to_tensor(image).unsqueeze(0)
    
    with torch.no_grad():
        score = musiq_model(tensor).item()
    
    # MUSIQ typically returns a score where higher is better, around 0-100
    musiq_score = float(score)
    
    # Simple thresholding logic for tiers
    if musiq_score >= 70:
        quality_tier = 'excellent'
    elif musiq_score >= 50:
        quality_tier = 'good'
    elif musiq_score >= 30:
        quality_tier = 'fair'
    else:
        quality_tier = 'poor'
        
    is_gallery_ready = musiq_score >= 50
    
    return {
        "musiq_score": musiq_score,
        "quality_tier": quality_tier,
        "is_gallery_ready": is_gallery_ready
    }
