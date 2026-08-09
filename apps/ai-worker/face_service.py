import cv2
import numpy as np
from insightface.app import FaceAnalysis

# Initialize the FaceAnalysis app
# By default this will use the "buffalo_l" model if available. 
# We configure it to only use CPU for lightweight inference.
app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))

def extract_face_vector(image_bytes: bytes) -> list[float] | None:
    """
    Extracts a 512-dimensional face embedding from an image.
    Returns None if no face is detected.
    """
    # Convert bytes to numpy array for OpenCV
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Invalid image data")

    # Detect faces
    faces = app.get(img)
    
    if not faces:
        return None
        
    # Get the embedding of the first detected face
    # In a production scenario with multiple faces, you might want to return all of them
    # or select the largest/most prominent face.
    first_face = faces[0]
    embedding = first_face.embedding.tolist()
    
    return embedding

def compare_faces(embedding1: list[float], embedding2: list[float]) -> float:
    """
    Computes cosine similarity between two face embeddings.
    Returns a score between -1.0 and 1.0 (higher is more similar).
    """
    vec1 = np.array(embedding1)
    vec2 = np.array(embedding2)
    
    # Compute cosine similarity
    dot_product = np.dot(vec1, vec2)
    norm_a = np.linalg.norm(vec1)
    norm_b = np.linalg.norm(vec2)
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
        
    return dot_product / (norm_a * norm_b)
