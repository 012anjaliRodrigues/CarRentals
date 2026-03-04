
import React from 'react';
import { Car } from 'lucide-react';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-[#D3D2EC] flex flex-col items-center justify-center">
      {/* Central Content */}
      <div className="flex flex-col items-center space-y-6">
        {/* Logo Icon */}
        <div className="w-20 h-20 bg-[#6360DF] rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-[#6360df44]">
          <Car className="text-white w-10 h-10" />
        </div>

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
          <div className="loading-dot w-2 h-2 bg-[#6360DF] rounded-full"></div>
          <div className="loading-dot w-2 h-2 bg-[#6360DF] rounded-full"></div>
          <div className="loading-dot w-2 h-2 bg-[#6360DF] rounded-full"></div>
        </div>
      </div>

      {/* Footer Text */}
      <div className="absolute bottom-12 w-full text-center">
        <p className="text-[10px] tracking-[0.3em] font-bold text-[#151a3c] opacity-30 uppercase">
          Owner Dashboard Initializing
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
