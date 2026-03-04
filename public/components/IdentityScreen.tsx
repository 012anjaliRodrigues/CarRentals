
import React from 'react';
import { 
  User, 
  Mail, 
  Building2, 
  UserCircle, 
  MapPin, 
  ShieldCheck, 
  LogOut, 
  ArrowRight 
} from 'lucide-react';

interface IdentityScreenProps {
  onContinue: (data: { fullName: string; businessName: string; email: string; businessAddress: string }) => void;
  onLogout: () => void;
}

const InputField: React.FC<{
  label: string;
  placeholder: string;
  // Changed from React.ReactNode to React.ReactElement to support cloning
  icon: React.ReactElement;
  required?: boolean;
  value: string;
  onChange: (val: string) => void;
}> = ({ label, placeholder, icon, required = true, value, onChange }) => (
  <div className="flex flex-col space-y-2">
    <label className="text-sm font-semibold text-[#151a3c]">
      {label} {required && <span className="text-[#6360DF]">*</span>}
    </label>
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6c7e96] group-focus-within:text-[#6360DF] transition-colors">
        {/* Added <any> cast to cloneElement to allow the 'size' prop */}
        {React.cloneElement(icon as React.ReactElement<any>, { size: 18 })}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-[#d1d0eb] rounded-xl py-4 pl-12 pr-4 text-[#151a3c] placeholder:text-[#cbd5e1] outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all"
      />
    </div>
  </div>
);

const IdentityScreen: React.FC<IdentityScreenProps> = ({ onContinue, onLogout }) => {
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [businessName, setBusinessName] = React.useState('');
  const [businessAddress, setBusinessAddress] = React.useState('');

  const handleContinue = () => {
    if (fullName && email && businessName && businessAddress) {
      onContinue({ fullName, businessName, email, businessAddress });
    }
  };

  return (
    <div className="min-h-screen bg-[#D3D2EC] flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] w-full max-w-[900px] overflow-hidden">
        {/* Progress Header */}
        <div className="p-10 md:p-12 pb-0">
          <div className="flex items-center justify-between mb-8">
            <span className="text-[11px] font-bold text-[#6360DF] tracking-widest uppercase">
              Step 1 of 3
            </span>
            <div className="flex space-x-2">
              <div className="w-8 h-1.5 bg-[#6360DF] rounded-full"></div>
              <div className="w-8 h-1.5 bg-[#d1d0eb] rounded-full"></div>
              <div className="w-8 h-1.5 bg-[#d1d0eb] rounded-full"></div>
            </div>
          </div>

          <div className="mb-10">
            <h1 className="text-3xl font-bold text-[#151a3c] mb-3">Identity & Business</h1>
            <p className="text-[#6c7e96] text-sm md:text-base leading-relaxed max-w-2xl">
              Welcome to GaadiZai. Let's start by setting up your professional profile and business credentials.
            </p>
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <InputField label="Full Name" placeholder="John Doe" icon={<User />} value={fullName} onChange={setFullName} />
            <InputField label="Email Address" placeholder="john@example.com" icon={<Mail />} value={email} onChange={setEmail} />
            <InputField label="Business Legal Name" placeholder="GaadiZai Logistics Ltd." icon={<Building2 />} value={businessName} onChange={setBusinessName} />
            <InputField label="Contact Person" placeholder="Operations Manager" icon={<UserCircle />} value={fullName} onChange={() => {}} />
            <div className="md:col-span-2">
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-semibold text-[#151a3c]">
                  Full Business Address <span className="text-[#6360DF]">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-4 text-[#6c7e96] group-focus-within:text-[#6360DF] transition-colors">
                    <MapPin size={18} />
                  </div>
                  <textarea
                    rows={3}
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    placeholder="Suite 402, Business Hub, Downtown Street, New Delhi, 110001"
                    className="w-full bg-white border border-[#d1d0eb] rounded-xl py-4 pl-12 pr-4 text-[#151a3c] placeholder:text-[#cbd5e1] outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-[#f1f5f9] mb-10 gap-4">
            <button 
              onClick={onLogout}
              className="flex items-center space-x-2 text-[#6c7e96] text-sm font-medium hover:text-[#151a3c] transition-colors"
            >
              <LogOut size={18} />
              <span>Logout and switch account</span>
            </button>
            <button 
              onClick={handleContinue}
              disabled={!fullName || !email || !businessName || !businessAddress}
              className={`bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold py-4 px-8 rounded-2xl shadow-[0_4px_14px_0_rgba(99,96,223,0.39)] transition-all active:scale-[0.98] flex items-center space-x-2 group ${(!fullName || !email || !businessName || !businessAddress) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>Save & Continue</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Privacy Footer */}
        <div className="bg-[#f8fafc] px-10 md:px-12 py-6 flex items-start space-x-4">
          <div className="bg-[#6360DF]/10 p-2 rounded-lg">
            <ShieldCheck size={20} className="text-[#6360DF]" />
          </div>
          <p className="text-[11px] leading-relaxed text-[#6c7e96]">
            <span className="font-bold text-[#151a3c]">Data Privacy:</span> Your business information is securely encrypted and will only be used for account verification and compliance purposes within the GaadiZai ecosystem.
          </p>
        </div>
      </div>

      {/* External Support Link */}
      <div className="mt-10 flex items-center space-x-2 text-[#151a3c] opacity-60 hover:opacity-100 transition-opacity cursor-pointer group">
        <div className="bg-[#151a3c]/10 p-1 rounded-md">
          <UserCircle className="w-4 h-4" />
        </div>
        <p className="text-sm font-medium">
          Need help? Contact <span className="font-bold">support</span>
        </p>
      </div>
    </div>
  );
};

export default IdentityScreen;
