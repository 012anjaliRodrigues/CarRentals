import React, { useState } from 'react';
import { Car, Headphones } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';

interface LoginScreenProps {
  onOtpSent: (phone: string) => void;
  onSkipToDashboard?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onOtpSent, onSkipToDashboard }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length < 10) return;

    const cleaned = phoneNumber.replace(/\D/g, '');
    const fullPhone = `+91${cleaned}`;

    try {
      setIsLoading(true);

      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });

      if (error) {
        console.error('Error sending OTP:', error);
        toast.error(error.message || 'Failed to send OTP. Please try again.');
        return;
      }

      // Proceed to OTP screen with the 10-digit number (UI expectation)
      onOtpSent(cleaned);
      toast.success('OTP sent successfully');
    } catch (err) {
      console.error('Unexpected error sending OTP:', err);
      toast.error('Something went wrong while sending OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#D3D2EC] flex flex-col items-center justify-center p-4">
      {/* Login Card */}
      <div className="bg-white rounded-[2rem] shadow-[0_10px_30px_rgba(0,0,0,0.05)] w-full max-w-[440px] p-10 md:p-12 text-center">
        
        {/* Logo Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-[#6360DF] rounded-2xl flex items-center justify-center shadow-lg shadow-[#6360df22]">
            <Car className="text-white w-7 h-7" />
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-bold text-[#151a3c] mb-10 tracking-tight">
          Sign in to your business
        </h2>

        <form onSubmit={handleSubmit} className="text-left">
          {/* Label */}
          <label className="block text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase mb-3 ml-1">
            Business Phone Number
          </label>
          
          {/* Input Group */}
          <div className="flex items-center border border-[#d1d0eb] rounded-2xl overflow-hidden mb-8 focus-within:ring-2 focus-within:ring-[#6360DF] focus-within:border-transparent transition-all">
            <div className="px-5 py-4 text-[#6c7e96] font-semibold border-r border-[#d1d0eb] bg-white">
              +91
            </div>
            <input
              type="tel"
              required
              maxLength={10}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="98765 43210"
              className="w-full py-4 px-5 text-[#151a3c] font-medium placeholder:text-[#d1d0eb] outline-none bg-white"
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={phoneNumber.length < 10 || isLoading}
            className={`w-full bg-[#6360DF] text-white font-bold py-4 rounded-2xl shadow-[0_4px_14px_0_rgba(99,96,223,0.39)] transition-all active:scale-[0.98] flex items-center justify-center ${
              (phoneNumber.length < 10 || isLoading) ? 'opacity-80 cursor-not-allowed' : 'hover:bg-[#5451d0]'
            }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              "Send OTP"
            )}
          </button>
        </form>

        {/* Legal Text */}
        <div className="mt-12">
          <p className="text-[12px] leading-relaxed text-[#6c7e96]/70">
            By continuing, you agree to GaadiZai's <a href="#" className="underline">Terms</a> and <br />
            <a href="#" className="underline">Privacy Policy</a>
          </p>
        </div>
      </div>

      {/* Support Link (Outside Card) */}
      <div className="mt-8 flex flex-col items-center space-y-4">
        <div 
          onClick={onSkipToDashboard}
          className="bg-white/50 hover:bg-white border border-[#d1d0eb] px-4 py-2 rounded-full text-[11px] font-bold text-[#6360DF] cursor-pointer transition-all active:scale-95 shadow-sm"
        >
          Skip to Dashboard (Demo)
        </div>

        <div className="flex items-center space-x-2 text-[#151a3c] opacity-60 hover:opacity-100 transition-opacity cursor-pointer group">
          <div className="bg-[#151a3c]/10 p-1 rounded-md">
            <Headphones className="w-4 h-4" />
          </div>
          <p className="text-sm font-medium">
            Need help? Contact <span className="font-bold">support</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;