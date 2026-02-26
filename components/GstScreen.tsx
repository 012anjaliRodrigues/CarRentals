
import React, { useState } from 'react';
import { 
  FileText, 
  Info, 
  ArrowLeft, 
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GstScreenProps {
  onContinue: (data: { isGstEnabled: boolean; gstType: string; gstNumber: string }) => void;
  onBack: () => void;
}

const GstScreen: React.FC<GstScreenProps> = ({ onContinue, onBack }) => {
  const [isGstRegistered, setIsGstRegistered] = useState(false);
  const [gstin, setGstin] = useState('');
  const [registrationType, setRegistrationType] = useState('Regular');

  const handleContinue = () => {
    onContinue({
      isGstEnabled: isGstRegistered,
      gstType: registrationType,
      gstNumber: isGstRegistered ? gstin : ''
    });
  };

  return (
    <div className="min-h-screen bg-[#D3D2EC] flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] w-full max-w-[800px] overflow-hidden p-10 md:p-12">
        
        {/* Progress Header */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-[11px] font-bold text-[#6360DF] tracking-widest uppercase">
            Step 2 of 3
          </span>
          <div className="flex space-x-2">
            <div className="w-8 h-1.5 bg-[#d1d0eb] rounded-full"></div>
            <div className="w-8 h-1.5 bg-[#6360DF] rounded-full"></div>
            <div className="w-8 h-1.5 bg-[#d1d0eb] rounded-full"></div>
          </div>
        </div>

        {/* Title Section */}
        <div className="flex items-start space-x-4 mb-10">
          <div className="bg-[#6360DF] p-3 rounded-2xl shadow-lg shadow-[#6360df22]">
            <FileText className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#151a3c] tracking-tight">GST Configuration</h1>
            <p className="text-[#6c7e96] text-sm leading-relaxed max-w-lg mt-1">
              Help us set up your business tax details for seamless invoicing and tax reporting. This information ensures your financial records remain compliant.
            </p>
          </div>
        </div>

        {/* Toggle Box */}
        <div className="bg-[#f8fafc] border border-[#f1f5f9] rounded-2xl p-6 md:p-8 flex items-center justify-between mb-8">
          <div>
            <h3 className="font-bold text-[#151a3c] text-lg">GST Registration Status</h3>
            <p className="text-[#6c7e96] text-sm">Is your business currently GST-registered?</p>
          </div>
          <button 
            onClick={() => setIsGstRegistered(!isGstRegistered)}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${isGstRegistered ? 'bg-[#6360DF]' : 'bg-[#e2e8f0]'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-md transition-transform duration-300 ${isGstRegistered ? 'translate-x-7' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Conditional Fields */}
        <AnimatePresence>
          {isGstRegistered && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* GSTIN Field */}
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-semibold text-[#151a3c]">
                    GSTIN <span className="text-[#6360DF]">*</span>
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="22AAAAA0000A1Z5"
                    className="w-full bg-white border border-[#d1d0eb] rounded-xl py-4 px-5 text-[#151a3c] font-medium placeholder:text-[#cbd5e1] outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all"
                  />
                </div>

                {/* Registration Type Field */}
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-semibold text-[#151a3c]">
                    Registration Type <span className="text-[#6360DF]">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={registrationType}
                      onChange={(e) => setRegistrationType(e.target.value)}
                      className="w-full bg-white border border-[#d1d0eb] rounded-xl py-4 pl-5 pr-12 text-[#151a3c] font-medium outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all appearance-none"
                    >
                      <option value="Regular">Regular</option>
                      <option value="Composition">Composition</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none w-5 h-5" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alert Box */}
        <div className="bg-[#FEF3C7] border-l-[4px] border-[#F59E0B] p-5 rounded-r-xl flex items-start space-x-4 mb-12">
          <div className="bg-[#F59E0B] p-1.5 rounded-full mt-0.5">
            <Info className="text-white w-4 h-4" />
          </div>
          <p className="text-[#92400E] text-[13px] leading-relaxed font-medium">
            Please ensure the GSTIN matches the legal name of your business. Incorrect details can lead to delays in payment processing and invoice generation.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4">
          <button 
            onClick={onBack}
            className="flex items-center space-x-2 text-[#6c7e96] text-sm font-bold hover:text-[#151a3c] transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <button 
            onClick={handleContinue}
            className="bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold py-4 px-10 rounded-2xl shadow-[0_6px_20px_rgba(99,96,223,0.3)] transition-all active:scale-[0.98] flex items-center space-x-3 group"
          >
            <span className="text-base tracking-wide">Continue to Locations</span>
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* External Support Link */}
      <div className="mt-8 flex items-center space-x-2 text-[#151a3c] opacity-60 hover:opacity-100 transition-opacity cursor-pointer group">
        <div className="bg-[#151a3c]/10 p-1.5 rounded-lg">
          <Info className="w-4 h-4" />
        </div>
        <p className="text-sm font-medium">
          Need help? Contact <span className="font-bold">support</span>
        </p>
      </div>
    </div>
  );
};

export default GstScreen;
