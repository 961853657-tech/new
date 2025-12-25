
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AppMode, State } from './types';
import { Experience } from './Experience';
import { initHandLandmarker } from './services/HandLandmarker';
import { GESTURE_THRESHOLDS } from './constants';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const experienceRef = useRef<Experience | null>(null);
  const [state, setState] = useState<State>({
    mode: AppMode.TREE,
    handX: 0,
    handY: 0,
    isPinching: false,
    isFist: false,
    isOpen: false,
    activePhotoIndex: 0,
    loading: true,
    uiHidden: false
  });

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Three.js
    const exp = new Experience(containerRef.current);
    experienceRef.current = exp;

    // Initialize MediaPipe & Camera
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        
        const landmarker = await initHandLandmarker();
        setState(prev => ({ ...prev, loading: false }));

        const processFrame = () => {
          if (videoRef.current && landmarker && videoRef.current.readyState >= 2) {
            const results = landmarker.detectForVideo(videoRef.current, performance.now());
            if (results.landmarks && results.landmarks.length > 0) {
              const landmarks = results.landmarks[0];
              const wrist = landmarks[0];
              const thumb = landmarks[4];
              const index = landmarks[8];
              const middle = landmarks[12];
              const ring = landmarks[16];
              const pinky = landmarks[20];
              const center = landmarks[9];

              // Normalized Hand Rotation mapping
              const handX = (center.x - 0.5) * 2;
              const handY = (center.y - 0.5) * 2;

              // Gesture Detection
              const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y, thumb.z - index.z);
              
              const fingers = [index, middle, ring, pinky];
              const avgDist = fingers.reduce((acc, f) => acc + Math.hypot(f.x - wrist.x, f.y - wrist.y, f.z - wrist.z), 0) / 4;

              setState(prev => {
                let nextMode = prev.mode;
                let nextPhotoIdx = prev.activePhotoIndex;

                if (pinchDist < GESTURE_THRESHOLDS.PINCH) {
                  if (prev.mode !== AppMode.FOCUS) {
                    nextMode = AppMode.FOCUS;
                    nextPhotoIdx = prev.activePhotoIndex + 1;
                  }
                } else if (avgDist < GESTURE_THRESHOLDS.FIST) {
                  nextMode = AppMode.TREE;
                } else if (avgDist > GESTURE_THRESHOLDS.OPEN) {
                  nextMode = AppMode.SCATTER;
                }

                return {
                  ...prev,
                  handX,
                  handY,
                  mode: nextMode,
                  activePhotoIndex: nextPhotoIdx
                };
              });
            }
          }
          requestAnimationFrame(processFrame);
        };
        processFrame();
      } catch (err) {
        console.error("Camera access denied or MediaPipe failed", err);
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    startCamera();

    // Keyboard controls
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h') {
        setState(prev => ({ ...prev, uiHidden: !prev.uiHidden }));
      }
    };
    window.addEventListener('keydown', handleKey);

    // Animation Loop
    const animate = () => {
      if (experienceRef.current) {
        experienceRef.current.update(state);
      }
      requestAnimationFrame(animate);
    };
    const animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('keydown', handleKey);
      cancelAnimationFrame(animId);
      exp.renderer.dispose();
    };
  }, [state.mode, state.activePhotoIndex]); // Simplified dependency for demo; in production use refs for fast updates

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result && experienceRef.current) {
          const loader = new THREE.TextureLoader();
          loader.load(ev.target.result as string, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            experienceRef.current?.addPhoto(texture);
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Three.js Container */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Loader */}
      {state.loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-1000">
          <div className="loader-spinner mb-4"></div>
          <div className="cinzel text-xs tracking-widest text-[#d4af37]">LOADING HOLIDAY MAGIC</div>
        </div>
      )}

      {/* UI Layer */}
      <div className={`absolute inset-0 z-10 flex flex-col items-center justify-between p-12 transition-opacity duration-500 pointer-events-none ${state.uiHidden ? 'ui-hidden' : ''}`}>
        <h1 className="cinzel text-6xl font-bold title-glow pointer-events-auto">Merry Christmas</h1>
        
        <div className="flex flex-col items-center gap-4 pointer-events-auto">
          <div className="upload-wrapper">
            <label className="glass cinzel cursor-pointer px-8 py-3 rounded-full text-[#fceea7] text-sm tracking-widest block">
              ADD MEMORIES
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
            </label>
          </div>
          <p className="text-[#d4af37] text-[10px] tracking-[0.2em] uppercase opacity-60">Press 'H' to Hide Controls</p>
        </div>
      </div>

      {/* MediaPipe Debug / Hidden Video */}
      <div className="absolute bottom-4 right-4 opacity-0 pointer-events-none overflow-hidden rounded-lg w-40 h-30 border border-[#d4af37]">
        <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" />
      </div>

      {/* Mode Indicators (Optional Aesthetic) */}
      {!state.uiHidden && (
        <div className="absolute bottom-12 left-12 cinzel text-[10px] tracking-widest text-[#d4af37] opacity-40 uppercase space-y-1">
          <div className={state.mode === AppMode.TREE ? 'opacity-100' : ''}>• Tree Mode (Fist)</div>
          <div className={state.mode === AppMode.SCATTER ? 'opacity-100' : ''}>• Scatter Mode (Open)</div>
          <div className={state.mode === AppMode.FOCUS ? 'opacity-100' : ''}>• Focus Mode (Pinch)</div>
        </div>
      )}
    </div>
  );
};

export default App;
