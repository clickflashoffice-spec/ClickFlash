"use client";

import React, { useRef, useLayoutEffect, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Text, Environment, Sparkles } from "@react-three/drei";
import { EffectComposer, Bloom, DepthOfField, ChromaticAberration } from "@react-three/postprocessing";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";

gsap.registerPlugin(ScrollTrigger);

// --- PREMIUM 3D COMPONENTS ---

const PremiumAILens = ({ cameraRef, beamRef }: { cameraRef: React.RefObject<THREE.Group | null>, beamRef: React.RefObject<THREE.Mesh | null> }) => {
  const innerRing = useRef<THREE.Mesh>(null);
  const middleRing = useRef<THREE.Mesh>(null);
  const outerRing = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (innerRing.current) innerRing.current.rotation.z = t * 0.5;
    if (middleRing.current) middleRing.current.rotation.z = -t * 0.3;
    if (outerRing.current) outerRing.current.rotation.z = t * 0.1;
  });

  return (
    <group ref={cameraRef} position={[0, 0, 0]}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        
        {/* Core glowing sensor */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshBasicMaterial color="#00ffff" />
        </mesh>

        {/* Inner Glass Focus Ring */}
        <mesh ref={innerRing} position={[0, 0, 0]}>
          <torusGeometry args={[0.6, 0.05, 16, 64]} />
          <meshPhysicalMaterial 
            transmission={1} 
            roughness={0} 
            thickness={2} 
            ior={1.5} 
            color="#ffffff" 
          />
        </mesh>

        {/* Middle Metallic Barrel */}
        <mesh ref={middleRing} position={[0, 0, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.8, 0.8, 0.6, 64]} />
          <meshStandardMaterial color="#0a0a0a" metalness={1} roughness={0.2} />
        </mesh>

        {/* Outer Tech Ring */}
        <mesh ref={outerRing} position={[0, 0, 0.2]}>
          <torusGeometry args={[1, 0.02, 16, 64]} />
          <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.5} />
        </mesh>

        {/* Futuristic Casing Details */}
        <mesh position={[1.1, 0, -0.2]}>
          <boxGeometry args={[0.2, 0.6, 0.8]} />
          <meshStandardMaterial color="#111111" metalness={0.9} roughness={0.3} />
        </mesh>
        <mesh position={[-1.1, 0, -0.2]}>
          <boxGeometry args={[0.2, 0.6, 0.8]} />
          <meshStandardMaterial color="#111111" metalness={0.9} roughness={0.3} />
        </mesh>
        
        {/* Data Beam (Hidden initially) */}
        <mesh ref={beamRef} position={[0, 0, 5]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0, 1]}>
          <cylinderGeometry args={[0.3, 0.8, 10, 32]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.15} blending={THREE.AdditiveBlending} />
        </mesh>

      </Float>
    </group>
  );
};

const PremiumSceneFrame = ({ position, title, subtitle, color = "#00ffff" }: { position: [number, number, number], title: string, subtitle: string, color?: string }) => {
  return (
    <group position={position}>
      <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2}>
        {/* Glass Panel */}
        <mesh>
          <planeGeometry args={[5, 3.5]} />
          <meshPhysicalMaterial 
            transmission={1} 
            roughness={0.1} 
            thickness={0.5} 
            ior={1.2} 
            color="#ffffff" 
            transparent
            opacity={0.3}
          />
        </mesh>
        
        {/* Glowing Frame Edge */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[5.1, 3.6]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} blending={THREE.AdditiveBlending} />
        </mesh>

        <Text position={[0, 0.5, 0.1]} fontSize={0.35} color="#ffffff" font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff">
          {title}
        </Text>
        <Text position={[0, -0.2, 0.1]} fontSize={0.15} color={color} letterSpacing={0.2} font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff">
          {subtitle}
        </Text>
      </Float>
    </group>
  );
};

const PremiumServer = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      <Float speed={1} rotationIntensity={0.05} floatIntensity={0.1}>
        {/* Main Monolith */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[3, 6, 3]} />
          <meshPhysicalMaterial 
            transmission={0.9} 
            roughness={0.2} 
            thickness={5} 
            ior={1.5} 
            color="#00ffff" 
          />
        </mesh>
        
        {/* Data Cores */}
        {[-2, -1, 0, 1, 2].map((y, i) => (
          <mesh key={i} position={[0, y, 0]}>
            <boxGeometry args={[2.5, 0.1, 2.5]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        ))}
        
        <Text position={[0, 4, 0]} fontSize={0.4} color="#00ffff" letterSpacing={0.2} font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff">
          CLOUD SYNC
        </Text>
      </Float>
    </group>
  );
};

// --- PREMIUM HTML OVERLAY ---
const PremiumViewfinderUI = () => {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 flex items-center justify-center">
      {/* Target Brackets */}
      <div className="relative w-72 h-72 md:w-[400px] md:h-[400px] transition-all duration-500 ease-out" id="viewfinder-brackets">
        {/* Sleek Corners */}
        <div className="absolute top-0 left-0 w-12 h-12 border-t-[1px] border-l-[1px] border-white/50"></div>
        <div className="absolute top-0 right-0 w-12 h-12 border-t-[1px] border-r-[1px] border-white/50"></div>
        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-[1px] border-l-[1px] border-white/50"></div>
        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-[1px] border-r-[1px] border-white/50"></div>
        
        {/* Center Reticle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center opacity-30">
          <div className="w-[1px] h-8 bg-cyan-400"></div>
          <div className="absolute h-[1px] w-8 bg-cyan-400"></div>
          <div className="absolute w-2 h-2 rounded-full border border-cyan-400"></div>
        </div>
      </div>

      {/* Cinematic HUD Info */}
      <div className="absolute bottom-12 left-12 text-white/80 font-mono text-[10px] tracking-[0.3em] space-y-2 uppercase">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
          <p>SYSTEM.ONLINE</p>
        </div>
        <p id="hud-status" className="text-cyan-400 font-bold">AWAITING TARGET</p>
        <p>AI_CORE: <span className="text-white/50">ACTIVE</span></p>
      </div>
      
      <div className="absolute top-12 right-12 text-white/80 font-mono text-[10px] tracking-[0.3em] text-right uppercase space-y-2">
        <p>TRACKING ALGORITHM V4.2</p>
        <p>EXPOSURE: AUTO</p>
        <p className="text-cyan-400">APERTURE: F/1.2</p>
      </div>

      {/* Scroll Sections - Premium Typography */}
      <div className="absolute top-0 left-0 w-full h-full font-sans">
        
        <section className="h-[250vh] w-full flex items-end pb-40 justify-center step-0">
          <div className="text-center max-w-2xl px-6 pointer-events-auto">
            <span className="mb-4 block text-[10px] font-black tracking-[0.4em] text-cyan-400 uppercase">
              The Hardware
            </span>
            <h1 className="text-4xl md:text-6xl font-light tracking-tight mb-6 text-white">
              Automated <br/><span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-blue-500">Capture Systems</span>
            </h1>
            <p className="text-lg text-white/60 font-light">Precision engineering meets artificial intelligence. Perfect shots, zero human intervention.</p>
          </div>
        </section>

        <section className="h-[250vh] w-full flex items-end pb-40 justify-center step-1 opacity-0">
          <div className="text-center max-w-2xl px-6 pointer-events-auto">
            <span className="mb-4 block text-[10px] font-black tracking-[0.4em] text-[#00ffff] uppercase">
              Attractions & Parks
            </span>
            <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-6 text-white">
              High-Speed <span className="font-bold">Action</span>
            </h2>
            <p className="text-lg text-white/60 font-light">Freezing thrill moments at 1/8000th of a second. Engineered for extreme environments.</p>
          </div>
        </section>

        <section className="h-[250vh] w-full flex items-end pb-40 justify-center step-2 opacity-0">
          <div className="text-center max-w-2xl px-6 pointer-events-auto">
            <span className="mb-4 block text-[10px] font-black tracking-[0.4em] text-[#ff0055] uppercase">
              Resort & Portraits
            </span>
            <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-6 text-white">
              Intelligent <span className="font-bold">Association</span>
            </h2>
            <p className="text-lg text-white/60 font-light">Advanced facial recognition instantly groups families together for frictionless gallery delivery.</p>
          </div>
        </section>

        <section className="h-[250vh] w-full flex items-center justify-center step-3 opacity-0">
          <div className="text-center max-w-3xl px-6 pointer-events-auto">
            <span className="mb-6 block text-[10px] font-black tracking-[0.4em] text-cyan-400 uppercase">
              The Ecosystem
            </span>
            <h2 className="text-5xl md:text-7xl font-light tracking-tighter text-white mb-8">
              Proprietary <span className="font-bold">Software</span>
            </h2>
            <p className="text-xl text-white/60 font-light mb-12 max-w-xl mx-auto">
              From capture to cloud. Images are processed by our AI and beamed instantly to your Master Portal and Touch Kiosks.
            </p>
            <button className="px-10 py-5 bg-white text-black font-bold tracking-[0.2em] uppercase text-xs rounded-full hover:scale-105 hover:bg-cyan-400 transition-all duration-300">
              Explore The Platform
            </button>
          </div>
        </section>

      </div>
    </div>
  );
};

// --- MAIN PAGE ---
export default function PreviewPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraGroupRef = useRef<THREE.Group>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;
    
    const container = containerRef.current;
    if (!container || !cameraGroupRef.current || !beamRef.current) return;

    const ctx = gsap.context(() => {
      
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          onUpdate: (self) => {
            const vf = document.getElementById("viewfinder-brackets");
            const status = document.getElementById("hud-status");
            if (vf && status) {
              if (self.progress > 0.1 && self.progress < 0.35) {
                vf.style.transform = "scale(0.85)";
                vf.style.borderColor = "rgba(0, 255, 255, 0.8)";
                status.innerText = "TARGET_LOCKED: ATTRACTION";
                status.style.color = "#00ffff";
              } else if (self.progress > 0.45 && self.progress < 0.7) {
                vf.style.transform = "scale(0.95)";
                vf.style.borderColor = "rgba(255, 0, 85, 0.8)"; 
                status.innerText = "TARGET_LOCKED: FAMILY_GROUP";
                status.style.color = "#ff0055";
              } else if (self.progress > 0.8) {
                vf.style.transform = "scale(1.1)";
                vf.style.borderColor = "rgba(0, 255, 255, 0.8)";
                status.innerText = "UPLOADING: MASTER_PORTAL";
                status.style.color = "#00ffff";
              } else {
                vf.style.transform = "scale(1)";
                vf.style.borderColor = "rgba(255, 255, 255, 0.3)";
                status.innerText = "SCANNING_ENVIRONMENT...";
                status.style.color = "rgba(255, 255, 255, 0.5)";
              }
            }
          }
        },
      });

      // Frame 1: Pan to Waterslide (Left)
      tl.to(".step-0", { opacity: 0, y: -40 }, 0.1)
        .to(cameraGroupRef.current!.rotation, { y: Math.PI / 5, x: Math.PI / 16 }, 0.1)
        .to(".step-1", { opacity: 1, y: 0 }, 0.2)
        
      // Frame 2: Pan to Family (Right)
        .to(".step-1", { opacity: 0, y: -40 }, 0.4)
        .to(cameraGroupRef.current!.rotation, { y: -Math.PI / 5, x: -Math.PI / 16 }, 0.4)
        .to(".step-2", { opacity: 1, y: 0 }, 0.5)

      // Frame 3: Pan to Server & Fire Beam
        .to(".step-2", { opacity: 0, y: -40 }, 0.7)
        .to(cameraGroupRef.current!.rotation, { y: 0, x: -Math.PI / 8 }, 0.7)
        .to(beamRef.current!.scale, { y: 1 }, 0.8) 
        .to(".step-3", { opacity: 1, y: 0 }, 0.9);

    }, containerRef);

    return () => ctx.revert();
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div ref={containerRef} className="relative w-full h-[1000vh] bg-[#050505]">
      
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden">
        
        <Canvas camera={{ position: [0, 0, 4.5], fov: 60 }}>
          <color attach="background" args={["#030508"]} />
          <ambientLight intensity={0.2} />
          <spotLight position={[10, 10, 10]} intensity={2} penumbra={1} color="#00ffff" />
          <spotLight position={[-10, -10, -10]} intensity={1} penumbra={1} color="#ff0055" />
          
          {/* Studio Lighting Environment for Glass Reflections */}
          <Environment preset="city" />

          {/* Atmospheric Dust */}
          <Sparkles count={200} scale={12} size={2} speed={0.4} opacity={0.2} color="#00ffff" />
          
          <PremiumAILens cameraRef={cameraGroupRef} beamRef={beamRef} />

          {/* Scene 1: Waterslide */}
          <PremiumSceneFrame 
            position={[-6, -1, -8]} 
            title="WATERSLIDE_01" 
            subtitle="SHUTTER: 1/8000s | TRACKING: ON" 
            color="#00ffff"
          />

          {/* Scene 2: Family */}
          <PremiumSceneFrame 
            position={[6, 1, -8]} 
            title="FAMILY_PORTRAIT" 
            subtitle="FACES DETECTED: 4 | MATCH: 99%" 
            color="#ff0055"
          />

          {/* Scene 3: Server */}
          <PremiumServer position={[0, 6, -12]} />

          {/* High-End Post Processing */}
          <EffectComposer>
            <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} intensity={2} mipmapBlur />
            <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
            <DepthOfField focusDistance={0.01} focalLength={0.02} bokehScale={2} height={480} />
          </EffectComposer>
        </Canvas>

        <PremiumViewfinderUI />
      </div>
    </div>
  );
}
