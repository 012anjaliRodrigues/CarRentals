import React, { useState, useRef, useEffect } from 'react';
import { Car, Headphones, ArrowLeft } from 'lucide-react';
import { supabase, createOwnerIfNotExists, ensureDevSession } from '../supabaseClient';
import { toast } from 'react-hot-toast';

interface OtpScreenProps {
  phoneNumber: string; // 10-digit number from LoginScreen
  onVerify: (result: { nextScreen: 'IDENTITY' | 'GST' | 'LOCATIONS' | 'DASHBOARD'; owner: any | null }) => void;
  onBack: () => void;
}

const OtpScreen: React.FC<OtpScreenProps> = ({ phoneNumber, onVerify, onBack }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) return;

    // Mock OTP check — fixed code 123456
    if (fullOtp !== '123456') {
      toast.error('Invalid OTP. Use 123456 to verify.');
      return;
    }

    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    const fullPhone = `+91${cleanedPhone}`;

    try {
      setIsLoading(true);

      // Each phone number → its own unique Supabase user → own data
      const userId = await ensureDevSession(cleanedPhone);
      if (!userId) {
        toast.error('Login failed. Please try again.');
        return;
      }

      // Ensure public.users row exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('supabase_user_id', userId)
        .maybeSingle();

      if (!existingUser) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            supabase_user_id: userId,
            phone: fullPhone,
            role: 'owner',
            last_login_at: new Date().toISOString(),
          });
        if (insertError) {
          console.error('Error creating app user:', insertError);
          toast.error('Unable to create user profile. Please try again.');
          return;
        }
      } else {
        await supabase
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', existingUser.id);
      }

      // Ensure owner row exists (or fetch existing)
      const owner = await createOwnerIfNotExists(userId, fullPhone);

      const onboardingStep: number | null =
        typeof owner?.onboarding_step === 'number' ? owner.onboarding_step : null;

      let nextScreen: 'IDENTITY' | 'GST' | 'LOCATIONS' | 'DASHBOARD';

      if (owner?.onboarding_completed_at) {
        nextScreen = 'DASHBOARD';
      } else if (!onboardingStep || onboardingStep <= 1) {
        nextScreen = 'IDENTITY';
      } else if (onboardingStep === 2) {
        nextScreen = 'GST';
      } else if (onboardingStep === 3) {
        nextScreen = 'LOCATIONS';
      } else {
        nextScreen = 'DASHBOARD';
      }

      toast.success('Verified! Welcome.');
      onVerify({ nextScreen, owner });

    } catch (err) {
      console.error('Unexpected error verifying OTP:', err);
      toast.error('Something went wrong while verifying.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#D3D2EC] flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-[0_10px_30px_rgba(0,0,0,0.05)] w-full max-w-[440px] p-10 md:p-12 text-center">
        
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-[#6360DF] rounded-2xl flex items-center justify-center shadow-lg shadow-[#6360df22]">
            <Car className="text-white w-7 h-7" />
          </div>
        </div>

        <h2 className="text-[26px] font-bold text-[#151a3c] mb-2 tracking-tight">
          Enter verification code
        </h2>
        <p className="text-[#6c7e96] text-[13px] mb-8">
          We sent a 6-digit code to <span className="font-bold text-[#151a3c]">+91 {phoneNumber}</span>
        </p>

        {/* Mock OTP hint */}
        <div className="mb-6 bg-[#EEEDFA] border border-[#6360DF]/20 rounded-xl px-4 py-2.5 text-[12px] font-bold text-[#6360DF]">
          Use <span className="tracking-widest">123456</span> as your OTP
        </div>

        <form onSubmit={handleVerify} className="text-center">
          <div className="flex justify-between gap-2 mb-6">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-14 border border-[#d1d0eb] rounded-xl text-center text-xl font-bold text-[#151a3c] focus:border-[#6360DF] focus:ring-1 focus:ring-[#6360DF] outline-none transition-all bg-white"
              />
            ))}
          </div>

          {/* Resend — mock just shows a toast */}
          <button
            type="button"
            className="text-[#6360DF] font-bold text-[13px] mb-8 hover:underline"
            onClick={() => toast.success('OTP resent! Use 123456 to verify.')}
          >
            Resend OTP
          </button>

          <button
            type="submit"
            disabled={otp.some(d => !d) || isLoading}
            className={`w-full bg-[#6360DF] text-white font-bold py-4 rounded-2xl shadow-[0_4px_14px_0_rgba(99,96,223,0.39)] transition-all active:scale-[0.98] flex items-center justify-center mb-6 ${
              (otp.some(d => !d) || isLoading) ? 'opacity-80 cursor-not-allowed' : 'hover:bg-[#5451d0]'
            }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : 'Verify & Continue'}
          </button>

          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center space-x-2 text-[#6c7e96] text-[13px] font-medium mx-auto hover:text-[#151a3c] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Change Phone Number</span>
          </button>
        </form>

        <div className="mt-12 pt-6 border-t border-[#f1f5f9]">
          <p className="text-[11px] leading-relaxed text-[#6c7e96]/70">
            By continuing, you agree to GaadiZai's <br />
            <a href="#" className="underline">Terms</a> and <a href="#" className="underline">Privacy Policy</a>
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-center space-x-2 text-[#151a3c] opacity-60 hover:opacity-100 transition-opacity cursor-pointer group">
        <div className="bg-[#151a3c]/10 p-1 rounded-md">
          <Headphones className="w-4 h-4" />
        </div>
        <p className="text-sm font-medium">
          Need help? Contact <span className="font-bold">support</span>
        </p>
      </div>
    </div>
  );
};

export default OtpScreen;