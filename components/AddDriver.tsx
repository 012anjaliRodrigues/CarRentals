import React, { useState } from 'react';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  CreditCard, 
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase, getCurrentUser } from '../supabaseClient';

interface AddDriverProps {
  onSave: (driver: { name: string; phone: string; licenseNo: string }) => void;
  onCancel: () => void;
}

const AddDriver: React.FC<AddDriverProps> = ({ onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ── Supabase save ─────────────────────────────────────────────
  const handleSave = async () => {
    if (!name || !phone || !licenseNo) return;
    setIsSaving(true);

    try {
      const authUser = await getCurrentUser();
      if (!authUser) { toast.error('No session found. Please log in again.'); return; }

      const { data: ownerRow, error: ownerErr } = await supabase
        .from('owners')
        .select('id')
        .eq('user_id', authUser.id)
        .single();

      if (ownerErr || !ownerRow) { toast.error('Owner profile not found.'); return; }

      const { error } = await supabase
        .from('drivers')
        .insert({
          owner_id: ownerRow.id,
          full_name: name.trim(),
          phone: `+91 ${phone.trim()}`,
          license_no: licenseNo.trim(),
          current_location: 'Not Assigned',
          status: 'active',
        });

      if (error) { toast.error('Failed to save driver: ' + error.message); return; }

      toast.success('Driver saved successfully!');
      onSave({ name, phone, licenseNo });

    } catch (err) {
      console.error('Unexpected error saving driver:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full">
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-8 pb-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={onCancel}
              className="p-2 hover:bg-[#EEEDFA] rounded-full text-[#6360DF] transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-[32px] font-extrabold text-[#151a3c] tracking-tight">
              Add New Driver
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={onCancel}
              className="px-6 py-3 rounded-xl text-sm font-bold text-[#6c7e96] hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={!name || !phone || !licenseNo || isSaving}
              className={`bg-[#6360DF] hover:bg-[#5451d0] text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-[#6360df33] transition-all flex items-center space-x-2 ${(!name || !phone || !licenseNo || isSaving) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 size={18} />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Driver'}</span>
            </button>
          </div>
        </div>

        {/* Input Card */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden p-8 md:p-12 max-w-2xl mx-auto">
          <div className="space-y-8">
            {/* Driver Name */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest flex items-center">
                <User size={12} className="mr-1.5" /> Driver Full Name
              </label>
              <div className="relative group">
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter driver's full name"
                  className="w-full bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-4 px-5 text-base font-bold text-[#151a3c] outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest flex items-center">
                <Phone size={12} className="mr-1.5" /> Phone Number
              </label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#6c7e96] font-bold text-sm border-r border-[#d1d0eb] pr-3">
                  +91
                </div>
                <input 
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98765 43210"
                  className="w-full bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-4 pl-16 pr-5 text-base font-bold text-[#151a3c] outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all"
                />
              </div>
            </div>

            {/* License Number */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest flex items-center">
                <CreditCard size={12} className="mr-1.5" /> License Number
              </label>
              <div className="relative group">
                <input 
                  type="text"
                  value={licenseNo}
                  onChange={(e) => setLicenseNo(e.target.value.toUpperCase())}
                  placeholder="DL-XXXXXXXXXXXXX"
                  className="w-full bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-4 px-5 text-base font-bold text-[#151a3c] outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AddDriver;
