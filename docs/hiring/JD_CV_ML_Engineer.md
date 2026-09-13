# Job Description: Computer Vision / ML Engineer (🔴 P0 Horizon 2)

> **Company:** ClickFlash (Autonomous Photography & Resort Media Platform)  
> **Location:** Remote-first  
> **Compensation:** $160,000 - $200,000 base  
> **Equity:** 0.3% - 1.0% (Seed Stage, 4-year vest, 1-year cliff)  
> **Reporting To:** CTO / Technical Founder  

---

## About ClickFlash
ClickFlash is replacing outdated theme park and resort photo concessions with an AI-driven, edge-to-cloud media platform. We process hundreds of thousands of high-resolution guest photos daily, performing automated culling, aesthetic sharpness scoring, ArcFace 512D biometric linking, and real-time neural upscaling.

---

## The Role
As our lead CV/ML Engineer, you will own ClickFlash’s core algorithmic moat: our facial recognition matching accuracy, edge inference latency, and automated photo curation pipelines. You will optimize models to run efficiently on resource-constrained edge mini-PCs and mobile devices, ensuring sub-second guest discovery with zero biometric false positives.

---

## Key Responsibilities
- **Biometric Matching & Vector Search:** Maintain and optimize our ArcFace 512D embedding pipeline, HNSW vector search, and similarity threshold calibration across diverse lighting conditions (beaches, night events, water splashes).
- **Edge Inference Optimization:** Quantize and benchmark ONNX / TensorRT / WASM SIMD models for low-latency execution on 16GB Intel/AMD edge appliances.
- **Automated Culling & Quality Scoring:** Refine sharpness detection (Laplacian variance + blur classification), eye-blink detection, and composition scoring to discard unusable burst shots autonomously.
- **Neural Enhancement:** Scale our Real-ESRGAN and background-removal pipelines for instant digital print production.
- **Biometric Privacy Compliance:** Ensure full adherence to GDPR Article 9, CCPA, and BIPA, maintaining on-device air-gapping and vector encryption.

---

## Requirements
- 4+ years of professional experience deploying computer vision and deep learning models into production.
- Strong proficiency in Python, PyTorch, OpenCV, ONNX Runtime, and FastAPI.
- Deep expertise in face detection and recognition architectures (InsightFace, RetinaFace, ArcFace, MagFace).
- Hands-on experience with vector indexing and high-dimensional nearest-neighbor search (HNSW, FAISS, VP-Trees).
- Proven track record optimizing model inference for edge or CPU/GPU-constrained environments.

---

## Nice-to-Haves
- Experience with WebAssembly (WASM) SIMD compilation for browser/edge execution.
- Rust or C++ experience for native inferencing libraries.
- Familiarity with camera RAW color science and photographic aesthetic metrics.
