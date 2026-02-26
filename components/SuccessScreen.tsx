
import React, { useEffect } from 'react';
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface SuccessScreenProps {
  onFinish: () => void;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    // Auto-navigate after a short delay for a premium feel
    const timer = setTimeout(() => {
      // Uncomment if you want automatic transition
      // onFinish();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="min-h-screen bg-[#D3D2EC] flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] shadow-[0_25px_60px_rgba(0,0,0,0.1)] w-full max-w-[500px] overflow-hidden p-12 text-center relative">
        
        {/* Background Sparkles Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -top-20 -right-20 w-64 h-64 bg-[#6360DF] rounded-full blur-[80px]" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{ duration: 5, repeat: Infinity, delay: 1 }}
            className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#918fe6] rounded-full blur-[80px]" 
          />
        </div>

        {/* Animated Checkmark */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.2 
          }}
          className="flex justify-center mb-8"
        >
          <div className="w-24 h-24 bg-[#6360DF] rounded-[2rem] flex items-center justify-center shadow-2xl shadow-[#6360df44]">
            <CheckCircle2 size={48} className="text-white" />
          </div>
        </motion.div>

        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h1 className="text-3xl font-extrabold text-[#151a3c] mb-4">Setup Complete!</h1>
          <p className="text-[#6c7e96] text-base leading-relaxed mb-10">
            Your business profile is now active. You're ready to manage your fleet and maximize your earnings with GaadiZai.
          </p>
        </motion.div>

        {/* Action Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          onClick={onFinish}
          className="w-full bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold py-5 rounded-2xl shadow-[0_8px_30px_rgba(99,96,223,0.35)] transition-all active:scale-[0.98] flex items-center justify-center space-x-3 group overflow-hidden relative"
        >
          <span className="relative z-10 text-lg">Enter Dashboard</span>
          <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
          
          <motion.div 
            className="absolute inset-0 bg-white/10"
            initial={{ x: '-100%' }}
            whileHover={{ x: '100%' }}
            transition={{ duration: 0.6 }}
          />
        </motion.button>

        {/* Subtext */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1.2 }}
          className="mt-8 flex items-center justify-center space-x-2 text-[#151a3c]"
        >
          <Sparkles size={14} />
          <span className="text-[10px] font-bold tracking-widest uppercase">Welcome to the family</span>
        </motion.div>
      </div>
    </div>
  );
};

export default SuccessScreen;
