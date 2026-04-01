import React, { useState, useEffect, useRef } from 'react';

interface SplashScreenProps {
  onFinished?: () => void; // called when splash is fully done
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinished }) => {
  const [showBrand, setShowBrand] = useState(false); // brand screen visible
  const [exiting,   setExiting]   = useState(false); // whole splash fading out
  const videoRef  = useRef<HTMLVideoElement>(null);
  const firedRef  = useRef(false); // fire transition only once
  const timers    = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addTimer = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  };

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  // ── Transition chain — starts after video ends ─────────────
  const startTransition = () => {
    if (firedRef.current) return;
    firedRef.current = true;

    // Show brand screen (crossfades with video)
    setShowBrand(true);

    // After 1.8s of brand screen, begin exit fade
    addTimer(() => setExiting(true), 1800);

    // After fade-out (700ms), signal parent
    addTimer(() => { onFinished?.(); }, 1800 + 700);
  };

  // ── Autoplay on mount ──────────────────────────────────────
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted    = true;
    vid.autoplay = true;
    vid.play().catch(startTransition); // autoplay blocked → skip to brand
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] select-none"
      style={{
        opacity:    exiting ? 0 : 1,
        transition: exiting ? 'opacity 0.7s ease-in-out' : 'none',
      }}
    >
      {/* ── Video layer ── */}
      <div
        className="absolute inset-0"
        style={{
          opacity:    showBrand ? 0 : 1,
          transition: showBrand ? 'opacity 0.7s ease-in-out' : 'none',
          zIndex:     2,
        }}
      >
        <video
          ref={videoRef}
          onEnded={startTransition}
          onError={startTransition}
          muted
          playsInline
          preload="auto"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        >
          {/* Place splash.mp4 in your /public folder */}
          <source src="assets/splashh.mp4" type="video/mp4" />
        </video>
      </div>

      {/* ── Brand layer  (fades in after video ends) ── */}
      <div
        className="absolute inset-0 bg-[#D3D2EC] flex flex-col items-center justify-center"
        style={{
          opacity:    showBrand ? 1 : 0,
          transition: showBrand ? 'opacity 0.7s ease-in-out' : 'none',
          zIndex:     1,
        }}
      >
        <div className="flex flex-col items-center space-y-6">
          {/* Logo — white version on brand background
              Place logo-white.png in /public folder
              mix-blend-mode:multiply makes the black background transparent */}
          <img
            src="/logo-colorr.png"
            alt="GaadiZai"
            className="w-32 h-32 object-contain"
            style={{ mixBlendMode: 'multiply' }}
          />

          {/* Brand Name */}
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight">
              <span className="text-white">Gaadi</span>
              <span className="text-[#6360DF]">Zai</span>
            </h1>
            <p className="mt-2 text-[#6c7e96] font-medium">
              Your fleet. Your control. Simplified.
            </p>
          </div>

          {/* Loading Dots */}
          <div className="flex space-x-2 mt-4">
            <div className="loading-dot w-2 h-2 bg-[#6360DF] rounded-full" />
            <div className="loading-dot w-2 h-2 bg-[#6360DF] rounded-full" />
            <div className="loading-dot w-2 h-2 bg-[#6360DF] rounded-full" />
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-12 w-full text-center">
          <p className="text-[10px] tracking-[0.3em] font-bold text-[#151a3c] opacity-30 uppercase">
            Owner Dashboard Initializing
          </p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;