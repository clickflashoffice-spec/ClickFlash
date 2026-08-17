import { pipeline, env } from '@xenova/transformers';
import * as tf from '@tensorflow/tfjs';
// WebGPU backend
import '@tensorflow/tfjs-backend-webgpu';
// WASM backend
import '@tensorflow/tfjs-backend-wasm';
import * as blazeface from '@tensorflow-models/blazeface';

// Configure transformers.js to use WASM
env.allowLocalModels = false; // Fetch from huggingface for prototype
env.backends.onnx.wasm.numThreads = 4;

const statusEl = document.getElementById('status');
const imageInput = document.getElementById('imageInput');
const processBtn = document.getElementById('processBtn');
const resultsContainer = document.getElementById('results');
const conceptInput = document.getElementById('conceptInput');

let clipModel = null;
let faceModel = null;

async function initPipeline() {
  const initStart = performance.now();
  statusEl.textContent = 'Initializing TensorFlow backends...';
  
  try {
    // Try to use WebGPU for TF.js, fallback to WASM
    await tf.setBackend('webgpu');
    await tf.ready();
    console.log('TF.js using backend:', tf.getBackend());
  } catch (e) {
    console.warn('WebGPU not available, falling back to WASM for TF.js', e);
    await tf.setBackend('wasm');
    await tf.ready();
    console.log('TF.js using backend:', tf.getBackend());
  }

  statusEl.textContent = 'Loading BlazeFace model...';
  faceModel = await blazeface.load();

  statusEl.textContent = 'Loading CLIP model (this may take a moment)...';
  // Use a lightweight CLIP model
  clipModel = await pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32');

  const initTime = ((performance.now() - initStart) / 1000).toFixed(2);
  statusEl.textContent = 'Pipeline Ready! (WASM + ' + tf.getBackend() + ') - Init took ' + initTime + 's';
  imageInput.disabled = false;
  processBtn.disabled = false;
}

// Convert File to Image element
async function fileToImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function processImages() {
  const files = imageInput.files;
  if (!files.length) return;
  
  const concept = conceptInput.value.trim();
  if (!concept) return alert('Please enter a search concept');

  processBtn.disabled = true;
  resultsContainer.innerHTML = '';
  
  for (let i = 0; i < files.length; i++) {
    statusEl.textContent = `Processing image ${i + 1} of ${files.length}...`;
    const file = files[i];
    const img = await fileToImage(file);
    
    const inferenceStart = performance.now();

    // 1. Face Detection (BlazeFace)
    const faceStart = performance.now();
    const predictions = await faceModel.estimateFaces(img, false);
    const faceTime = performance.now() - faceStart;

    const numFaces = predictions.length;
    let faceConfidence = 0;
    if (numFaces > 0) {
      faceConfidence = predictions[0].probability[0]; // confidence of first face
    }

    // 2. Concept Matching (CLIP)
    const clipStart = performance.now();
    // CLIP requires us to pass classes for zero-shot classification
    const candidate_labels = [concept, "something else", "noise", "blurry or bad photo"];
    
    // Transformers.js expects an Image URL or raw pixel data in a specific format,
    // passing the DataURL works for HTMLImageElement src.
    const clipResult = await clipModel(img.src, candidate_labels);
    const clipTime = performance.now() - clipStart;
    
    // clipResult is array of { score, label }
    const conceptScore = clipResult.find(r => r.label === concept)?.score || 0;

    const totalTime = performance.now() - inferenceStart;

    // 3. Culling Decision Logic
    // We can compute a combined 'Cull Score'
    const cullScore = (conceptScore * 0.7) + (numFaces > 0 ? 0.3 : 0);
    const keep = cullScore > 0.4; // arbitrary threshold for demo

    // Render Result
    renderResult(img.src, file.name, numFaces, faceConfidence, conceptScore, cullScore, keep, faceTime, clipTime, totalTime);
  }

  statusEl.textContent = 'Processing complete!';
  processBtn.disabled = false;
}

function renderResult(src, name, numFaces, faceConf, conceptScore, cullScore, keep, faceTime, clipTime, totalTime) {
  const card = document.createElement('div');
  card.className = 'image-card';
  card.style.borderColor = keep ? '#4CAF50' : '#F44336';
  card.style.backgroundColor = keep ? '#f1f8e9' : '#ffebee';
  
  card.innerHTML = `
    <img src="${src}" alt="${name}" />
    <div style="margin-top: 10px;">
      <strong>${name}</strong><br/>
      <span style="color: ${keep ? 'green' : 'red'}; font-weight: bold;">
        ${keep ? 'KEEP' : 'CULL'}
      </span>
      <div class="badges">
        <span class="badge">Faces: ${numFaces}</span>
        <span class="badge">Face Conf: ${(faceConf*100).toFixed(1)}%</span>
      </div>
      <div style="margin-top: 5px; font-size: 0.9em;">
        CLIP match: <span class="score">${(conceptScore*100).toFixed(1)}%</span><br/>
        Overall Score: <span class="score">${(cullScore*100).toFixed(1)}</span>
      </div>
      <div style="margin-top: 5px; font-size: 0.8em; color: #666;">
        <em>Latency:</em> BlazeFace ${Math.round(faceTime)}ms | CLIP ${Math.round(clipTime)}ms | Total ${Math.round(totalTime)}ms
      </div>
    </div>
  `;
  resultsContainer.appendChild(card);
}

processBtn.addEventListener('click', processImages);

// Start init on load
initPipeline();
