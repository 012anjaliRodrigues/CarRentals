import React, { useState, useEffect } from 'react';
import {
  Settings, User, Building2, MapPin, Receipt,
  Bell, Shield, Loader2, Check, X, Plus, Trash2,
  ChevronRight, AlertCircle, Phone, Mail, Globe,
  Tag, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase, getCurrentUser } from '../supabaseClient';

// ── Types ─────────────────────────────────────────────────────
interface OwnerSettings {
  id: string;
  full_name: string;
  business_name: string;
  email: string;
  phone: string;
  business_address: string;
  base_location: string;
  service_locations: string[];
  is_gst_enabled: boolean;
  gst_type: string;
  gst_number: string;
  currency: string;
  timezone: string;
  reminder_days_advance: number;
  booking_prefix: string;
}

const DEFAULT: OwnerSettings = {
  id: '', full_name: '', business_name: '', email: '',
  phone: '', business_address: '', base_location: '',
  service_locations: [], is_gst_enabled: false,
  gst_type: 'Regular', gst_number: '', currency: 'INR',
  timezone: 'Asia/Kolkata', reminder_days_advance: 7,
  booking_prefix: 'BK',
};

// ── Shared input styles ───────────────────────────────────────
const inputCls = "w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-medium text-[#151a3c] outline-none focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10 transition-all";
const labelCls = "text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider";

// ── Section card wrapper ──────────────────────────────────────
const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}> = ({ icon, title, subtitle, children }) => (
  <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
    <div className="px-8 py-6 border-b border-[#d1d0eb]/30 flex items-center space-x-4">
      <div className="w-10 h-10 bg-[#EEEDFA] rounded-xl flex items-center justify-center text-[#6360DF] shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-extrabold text-[#151a3c]">{title}</h3>
        <p className="text-xs text-[#6c7e96] font-medium mt-0.5">{subtitle}</p>
      </div>
    </div>
    <div className="px-8 py-7">{children}</div>
  </div>
);

// ── Save button ───────────────────────────────────────────────
const SaveBtn: React.FC<{ saving: boolean; onClick: () => void; disabled?: boolean }> = ({ saving, onClick, disabled }) => (
  <div className="flex justify-end mt-6">
    <button
      onClick={onClick}
      disabled={saving || disabled}
      className="flex items-center space-x-2 bg-[#6360DF] hover:bg-[#5451d0] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#6360df22] transition-all disabled:opacity-60"
    >
      {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      <span>{saving ? 'Saving...' : 'Save Changes'}</span>
    </button>
  </div>
);

// ── SettingsPage ──────────────────────────────────────────────
const SettingsPage: React.FC = () => {
  const [data, setData] = useState<OwnerSettings>({ ...DEFAULT });
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState('');

  // Per-section saving states
  const [savingProfile,    setSavingProfile]    = useState(false);
  const [savingBusiness,   setSavingBusiness]   = useState(false);
  const [savingLocations,  setSavingLocations]  = useState(false);
  const [savingGst,        setSavingGst]        = useState(false);
  const [savingPrefs,      setSavingPrefs]      = useState(false);

  // Service location input
  const [newLocation, setNewLocation] = useState('');

  // ── Load ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const authUser = await getCurrentUser();
      if (!authUser) { setLoading(false); return; }
      const { data: owner, error } = await supabase
        .from('owners').select('*').eq('user_id', authUser.id).single();
      if (error || !owner) { setLoading(false); return; }
      setOwnerId(owner.id);
      setData({
        id:                    owner.id,
        full_name:             owner.full_name             || '',
        business_name:         owner.business_name         || '',
        email:                 owner.email                 || authUser.email || '',
        phone:                 owner.phone                 || '',
        business_address:      owner.business_address      || '',
        base_location:         owner.base_location         || '',
        service_locations:     owner.service_locations     || [],
        is_gst_enabled:        owner.is_gst_enabled        ?? false,
        gst_type:              owner.gst_type              || 'Regular',
        gst_number:            owner.gst_number            || '',
        currency:              owner.currency              || 'INR',
        timezone:              owner.timezone              || 'Asia/Kolkata',
        reminder_days_advance: owner.reminder_days_advance ?? 7,
        booking_prefix:        owner.booking_prefix        || 'BK',
      });
      setLoading(false);
    };
    load();
  }, []);

  const patch = (fields: Partial<OwnerSettings>) => setData(d => ({ ...d, ...fields }));

  // ── Save helpers ──────────────────────────────────────────
  const save = async (
    setSaving: (b: boolean) => void,
    fields: Partial<OwnerSettings>,
    label: string
  ) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('owners').update(fields).eq('id', ownerId);
      if (error) { toast.error(`Failed to save ${label}: ${error.message}`); return; }
      toast.success(`${label} saved!`);
    } finally {
      setSaving(false);
    }
  };

  const addLocation = () => {
    const loc = newLocation.trim();
    if (!loc) return;
    if (data.service_locations.includes(loc)) {
      toast.error('Location already added.'); return;
    }
    patch({ service_locations: [...data.service_locations, loc] });
    setNewLocation('');
  };

  const removeLocation = (loc: string) => {
    patch({ service_locations: data.service_locations.filter(l => l !== loc) });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-[#6c7e96]">
      <Loader2 size={22} className="animate-spin mr-2" />
      <span className="text-sm font-medium">Loading settings...</span>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">

      {/* ── Page header ── */}
      <div>
        <h2 className="text-[24px] font-extrabold text-[#151a3c] tracking-tight">Settings</h2>
        <p className="text-[#6c7e96] text-sm font-medium mt-1">Manage your business profile and preferences</p>
      </div>

      {/* ── 1. Profile ── */}
      <Section icon={<User size={18} />} title="Personal Profile" subtitle="Your name, contact details and login email">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className={labelCls}>Full Name</label>
            <input className={inputCls} value={data.full_name}
              onChange={e => patch({ full_name: e.target.value })} placeholder="Anjali Rodrigues" />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6c7e96]" />
              <input className={inputCls + ' pl-10'} value={data.email}
                onChange={e => patch({ email: e.target.value })} placeholder="you@example.com" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Phone</label>
            <div className="relative">
              <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6c7e96]" />
              <input className={inputCls + ' pl-10'} value={data.phone}
                onChange={e => patch({ phone: e.target.value })} placeholder="+91 98765 43210" />
            </div>
          </div>
        </div>
        <SaveBtn saving={savingProfile} onClick={() =>
          save(setSavingProfile, {
            full_name: data.full_name, email: data.email, phone: data.phone,
          }, 'Profile')
        } />
      </Section>

      {/* ── 2. Business ── */}
      <Section icon={<Building2 size={18} />} title="Business Details" subtitle="Your company name and address shown on invoices and handover documents">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className={labelCls}>Business Name</label>
            <input className={inputCls} value={data.business_name}
              onChange={e => patch({ business_name: e.target.value })} placeholder="e.g. Rodrigues Car Rentals" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className={labelCls}>Business Address</label>
            <textarea className={inputCls + ' resize-none h-20'} value={data.business_address}
              onChange={e => patch({ business_address: e.target.value })}
              placeholder="Full address with city, state and PIN" />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Booking ID Prefix</label>
            <div className="relative">
              <Tag size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6c7e96]" />
              <input className={inputCls + ' pl-10 uppercase'} value={data.booking_prefix}
                maxLength={4}
                onChange={e => patch({ booking_prefix: e.target.value.toUpperCase() })}
                placeholder="BK" />
            </div>
            <p className="text-[11px] text-[#6c7e96] font-medium">Booking IDs will appear as {data.booking_prefix || 'BK'}-00001</p>
          </div>
        </div>
        <SaveBtn saving={savingBusiness} onClick={() =>
          save(setSavingBusiness, {
            business_name: data.business_name,
            business_address: data.business_address,
            booking_prefix: data.booking_prefix,
          }, 'Business details')
        } />
      </Section>

      {/* ── 3. Locations ── */}
      <Section icon={<MapPin size={18} />} title="Locations" subtitle="Base location and service areas for your fleet">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className={labelCls}>Base Location (HQ)</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6c7e96]" />
              <input className={inputCls + ' pl-10'} value={data.base_location}
                onChange={e => patch({ base_location: e.target.value })} placeholder="e.g. Panaji, Goa" />
            </div>
          </div>

          <div className="space-y-2">
            <label className={labelCls}>Service Locations</label>
            <div className="flex gap-2">
              <input
                className={inputCls + ' flex-1'}
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLocation(); } }}
                placeholder="e.g. Calangute, Margao..."
              />
              <button
                type="button"
                onClick={addLocation}
                className="flex items-center space-x-1.5 bg-[#6360DF] hover:bg-[#5451d0] text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0"
              >
                <Plus size={14} /><span>Add</span>
              </button>
            </div>
            {data.service_locations.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {data.service_locations.map(loc => (
                  <span key={loc} className="flex items-center space-x-1.5 bg-[#EEEDFA] text-[#6360DF] px-3 py-1.5 rounded-full text-xs font-bold">
                    <MapPin size={11} />
                    <span>{loc}</span>
                    <button type="button" onClick={() => removeLocation(loc)}
                      className="ml-1 text-[#6360DF]/60 hover:text-[#6360DF] transition-colors">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <SaveBtn saving={savingLocations} onClick={() =>
          save(setSavingLocations, {
            base_location: data.base_location,
            service_locations: data.service_locations,
          }, 'Locations')
        } />
      </Section>

      {/* ── 4. GST ── */}
      <Section icon={<Receipt size={18} />} title="GST & Taxation" subtitle="GST settings applied to invoices and bookings">
        <div className="space-y-5">
          {/* GST toggle */}
          <div className="flex items-center justify-between bg-[#F8F9FA] rounded-2xl px-5 py-4 border border-[#d1d0eb]">
            <div>
              <p className="text-sm font-bold text-[#151a3c]">GST Enabled</p>
              <p className="text-[11px] text-[#6c7e96] font-medium mt-0.5">Apply GST on all bookings and invoices</p>
            </div>
            <button
              type="button"
              onClick={() => patch({ is_gst_enabled: !data.is_gst_enabled })}
              className={`relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0 ${data.is_gst_enabled ? 'bg-[#6360DF]' : 'bg-slate-300'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${data.is_gst_enabled ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          <AnimatePresence>
            {data.is_gst_enabled && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-5 overflow-hidden">
                <div className="space-y-1.5">
                  <label className={labelCls}>GST Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Regular', 'Composition', 'Exempted'].map(t => (
                      <button key={t} type="button" onClick={() => patch({ gst_type: t })}
                        className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          data.gst_type === t
                            ? 'bg-[#EEEDFA] border-[#6360DF] text-[#6360DF]'
                            : 'bg-[#F8F9FA] border-[#d1d0eb] text-[#6c7e96]'
                        }`}>{t}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>GSTIN</label>
                  <input className={inputCls + ' uppercase'} value={data.gst_number}
                    onChange={e => patch({ gst_number: e.target.value.toUpperCase() })}
                    placeholder="22AAAAA0000A1Z5" maxLength={15} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <SaveBtn saving={savingGst} onClick={() =>
          save(setSavingGst, {
            is_gst_enabled: data.is_gst_enabled,
            gst_type: data.gst_type,
            gst_number: data.gst_number,
          }, 'GST settings')
        } />
      </Section>

      {/* ── 5. Preferences ── */}
      <Section icon={<Globe size={18} />} title="App Preferences" subtitle="Currency, timezone and reminder defaults">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Currency */}
          <div className="space-y-1.5">
            <label className={labelCls}>Currency</label>
            <div className="grid grid-cols-3 gap-2">
              {['INR', 'USD', 'EUR'].map(c => (
                <button key={c} type="button" onClick={() => patch({ currency: c })}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    data.currency === c
                      ? 'bg-[#EEEDFA] border-[#6360DF] text-[#6360DF]'
                      : 'bg-[#F8F9FA] border-[#d1d0eb] text-[#6c7e96]'
                  }`}>{c}</button>
              ))}
            </div>
          </div>

          {/* Timezone */}
          <div className="space-y-1.5">
            <label className={labelCls}>Timezone</label>
            <div className="relative">
              <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6c7e96]" />
              <select
                value={data.timezone}
                onChange={e => patch({ timezone: e.target.value })}
                className={inputCls + ' pl-10 appearance-none cursor-pointer'}
              >
                {[
                  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore',
                  'Europe/London', 'Europe/Paris', 'America/New_York',
                  'America/Los_Angeles', 'Australia/Sydney',
                ].map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </div>

          {/* Reminder advance days */}
          <div className="space-y-1.5">
            <label className={labelCls}>Reminder Alert (days in advance)</label>
            <div className="flex items-center space-x-3">
              {[3, 7, 14, 30].map(d => (
                <button key={d} type="button" onClick={() => patch({ reminder_days_advance: d })}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    data.reminder_days_advance === d
                      ? 'bg-[#EEEDFA] border-[#6360DF] text-[#6360DF]'
                      : 'bg-[#F8F9FA] border-[#d1d0eb] text-[#6c7e96]'
                  }`}>{d}d</button>
              ))}
            </div>
            <p className="text-[11px] text-[#6c7e96] font-medium">
              Reminders will alert you {data.reminder_days_advance} days before expiry
            </p>
          </div>
        </div>
        <SaveBtn saving={savingPrefs} onClick={() =>
          save(setSavingPrefs, {
            currency: data.currency,
            timezone: data.timezone,
            reminder_days_advance: data.reminder_days_advance,
          }, 'Preferences')
        } />
      </Section>

      {/* ── 6. Account (read-only info) ── */}
      <Section icon={<Shield size={18} />} title="Account & Security" subtitle="Your login account information">
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-[#F8F9FA] rounded-xl px-5 py-3.5 border border-[#d1d0eb]">
            <div>
              <p className="text-xs font-bold text-[#6c7e96] uppercase tracking-wider">Login Email</p>
              <p className="text-sm font-bold text-[#151a3c] mt-0.5">{data.email || '—'}</p>
            </div>
            <span className="text-[10px] font-extrabold text-[#6360DF] bg-[#EEEDFA] px-3 py-1 rounded-full tracking-widest uppercase">Fleet Owner</span>
          </div>
          <div className="flex items-center justify-between bg-[#F8F9FA] rounded-xl px-5 py-3.5 border border-[#d1d0eb]">
            <div>
              <p className="text-xs font-bold text-[#6c7e96] uppercase tracking-wider">Password</p>
              <p className="text-sm font-medium text-[#6c7e96] mt-0.5">To change your password, use the "Forgot Password" option at login</p>
            </div>
          </div>
          <div className="bg-[#FFF8E7] border border-[#FCD34D]/40 rounded-xl px-5 py-3.5 flex items-start space-x-3">
            <AlertCircle size={15} className="text-[#D97706] mt-0.5 shrink-0" />
            <p className="text-xs text-[#92400E] font-medium">
              Staff & manager login access is managed under the <span className="font-extrabold">Users</span> section.
              Each staff member gets their own credentials and page-level permissions.
            </p>
          </div>
        </div>
      </Section>

    </div>
  );
};

export default SettingsPage;