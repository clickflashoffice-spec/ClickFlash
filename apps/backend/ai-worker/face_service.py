"""
face_service.py — InsightFace 512D Feature Extraction & Face Recognition Engine
"""
import cv2
import numpy as np

try:
    from insightface.app import FaceAnalysis
    _app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    _app.prepare(ctx_id=0, det_size=(640, 640))
    INSIGHTFACE_AVAILABLE = True
except Exception:
    INSIGHTFACE_AVAILABLE = False
    _app = None

def extract_face_vector(image_bytes: bytes) -> list[float] | None:
    """
    Extracts a 512-dimensional face embedding from the primary detected face.
    Returns None if no face is detected or if InsightFace is unavailable.
    """
    faces = extract_all_faces(image_bytes)
    if not faces:
        return None
    return faces[0]["embedding"]

def extract_all_faces(image_bytes: bytes) -> list[dict]:
    """
    Detects and extracts 512D embeddings and metadata for all faces in an image.
    """
    import io
    from PIL import Image

    try:
        # PIL natively enforces MAX_IMAGE_PIXELS (89MP default) against pixel bombs
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    except Exception as e:
        raise ValueError(f"Invalid image data or dimension limits exceeded: {e}")

    if not INSIGHTFACE_AVAILABLE or _app is None:
        raise RuntimeError("InsightFace model is not available. Cannot extract face embeddings.")

    faces = _app.get(img)
    if not faces:
        return []

    results = []
    for face in faces:
        # Normalize embedding vector to unit length
        raw_emb = face.embedding
        norm = np.linalg.norm(raw_emb)
        norm_emb = (raw_emb / norm).tolist() if norm > 0 else raw_emb.tolist()

        bbox = [int(coord) for coord in face.bbox.tolist()] if hasattr(face, "bbox") else [0, 0, 0, 0]
        score = float(face.det_score) if hasattr(face, "det_score") else 1.0
        gender = int(face.gender) if hasattr(face, "gender") else 1
        age = int(face.age) if hasattr(face, "age") else 25

        results.append({
            "bbox": bbox,
            "embedding": norm_emb,
            "det_score": round(score, 4),
            "gender": gender,
            "age": age
        })

    return results

def compare_faces(embedding1: list[float], embedding2: list[float]) -> float:
    """
    Computes cosine similarity between two 512D face embeddings.
    Returns a score between -1.0 and 1.0 (>= 0.65 indicates identical identity).
    """
    vec1 = np.array(embedding1, dtype=np.float32)
    vec2 = np.array(embedding2, dtype=np.float32)
    
    dot_product = np.dot(vec1, vec2)
    norm_a = np.linalg.norm(vec1)
    norm_b = np.linalg.norm(vec2)
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
        
    return float(dot_product / (norm_a * norm_b))
