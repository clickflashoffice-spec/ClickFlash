import './style.css'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { vertexShader, fragmentShader } from './shaders'

gsap.registerPlugin(ScrollTrigger)

// 1. Setup Three.js Scene
const canvasContainer = document.getElementById('canvas-container')
const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2('#000000', 0.05) // Cinematic deep fade

// We use a PerspectiveCamera for true 3D depth and flythrough
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100)
// Camera starts at z=5, looking down -z axis
camera.position.z = 5

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
if(canvasContainer) canvasContainer.appendChild(renderer.domElement)

// 2. Load Textures & Create 3D Tunnel
const textureLoader = new THREE.TextureLoader()
const images = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2000&auto=format&fit=crop", // Drone
  "https://images.unsplash.com/photo-1682687982501-1e58f813f22b?q=80&w=1500&auto=format&fit=crop", // Underwater
  "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=1500&auto=format&fit=crop", // Resort
  "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?q=80&w=2000&auto=format&fit=crop"  // Deep Ocean
]

const meshes: THREE.Mesh[] = []

// Tunnel config
const spacing = 15; // Distance between each image
const tunnelDepth = (images.length - 1) * spacing;

images.forEach((src, index) => {
  const geometry = new THREE.PlaneGeometry(16, 9, 64, 64) // 16:9 aspect ratio
  
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uTexture: { value: textureLoader.load(src) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uHoverState: { value: 1.0 }, // Always subtle ripple in 3D
      uScrollVelocity: { value: 0 }
    },
    transparent: true,
    side: THREE.DoubleSide
  })

  const mesh = new THREE.Mesh(geometry, material)
  
  // Position them along the Z-axis
  mesh.position.z = -index * spacing
  
  // Stagger X and Y slightly for an organic flythrough
  mesh.position.x = (Math.random() - 0.5) * 4
  mesh.position.y = (Math.random() - 0.5) * 2
  
  // Slight random rotation
  mesh.rotation.z = (Math.random() - 0.5) * 0.2

  scene.add(mesh)
  meshes.push(mesh)
})

// 3. GSAP Timeline for Camera Flythrough & HTML Text Sync
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: ".scroll-container",
    start: "top top",
    end: "bottom bottom",
    scrub: 1.5, // Buttery smooth scrubbing
  }
})

// Fly camera deep into the Z-axis
tl.to(camera.position, {
  z: -tunnelDepth + 2, // Stop right before the last image
  ease: "none"
}, 0)

// Animate HTML Text overlays based on timeline progress
const totalScenes = 4;
for(let i=1; i<=totalScenes; i++) {
  const textEl = document.getElementById(`text-${i}`);
  
  if(i === 1) {
    // Scene 1 fades out immediately as we move forward
    tl.to(textEl, { opacity: 0, scale: 1.5, ease: "power1.inOut", duration: 1/totalScenes }, 0)
  } else {
    // Calculate when this scene should appear
    const startTime = ((i - 1) / totalScenes) - 0.1;
    const peakTime = startTime + 0.1;

    tl.to(textEl, { opacity: 1, scale: 1, ease: "power1.out", duration: 0.1 }, startTime)
    
    // If not the last scene, fade it out
    if(i !== totalScenes) {
      tl.to(textEl, { opacity: 0, scale: 1.5, ease: "power1.in", duration: 0.1 }, peakTime)
    }
  }
}

// 4. Mouse interaction for Parallax & Shaders
const targetMouse = new THREE.Vector2(0, 0)
window.addEventListener('mousemove', (e) => {
  // Normalized -1 to 1
  targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1
  targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1
})

// 5. Render Loop
let currentScrollVelocity = 0;
let lastScrollY = window.scrollY;

function render() {
  const elapsedTime = performance.now() / 1000
  
  // Calculate raw scroll velocity
  const deltaScroll = window.scrollY - lastScrollY;
  currentScrollVelocity += (deltaScroll - currentScrollVelocity) * 0.1;
  lastScrollY = window.scrollY;

  // Parallax Camera Sway
  camera.position.x += (targetMouse.x * 2 - camera.position.x) * 0.05
  camera.position.y += (targetMouse.y * 1 - camera.position.y) * 0.05

  meshes.forEach((mesh) => {
    const material = mesh.material as THREE.ShaderMaterial
    material.uniforms.uTime.value = elapsedTime
    material.uniforms.uScrollVelocity.value = currentScrollVelocity * 0.05
    
    // Make the images slowly float
    mesh.rotation.x = Math.sin(elapsedTime * 0.5 + mesh.position.z) * 0.05
    mesh.rotation.y = Math.cos(elapsedTime * 0.3 + mesh.position.z) * 0.05
  })

  renderer.render(scene, camera)
  requestAnimationFrame(render)
}

requestAnimationFrame(render)

// 6. Resize Handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
