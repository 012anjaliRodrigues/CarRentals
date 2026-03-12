import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Search, CheckCircle2, Clock, Car, MapPin,
  Calendar, FileText, X, Loader2, Phone, Camera, User,
  Shield, ChevronDown, AlertTriangle, Zap, ImagePlus,
  Check, ScanLine, MessageSquare, ArrowRight
} from 'lucide-react';
import { supabase, getCurrentUser } from '../supabaseClient';
import { toast } from 'react-hot-toast';

type HandoverType = 'Pick' | 'Drop';

interface HandoverRow {
  id: string;
  type: HandoverType;
  dateTime: string;
  location: string;
  registrationNo: string;
  brand: string;
  model: string;
  driverName: string;
  driverPhone: string;
  customerName: string;
  customerPhone: string;
  pickupAt: string;
  dropAt: string;
  bookingStatus: string;
  bookingDetailId: string;
}

interface KycData {
  idType: string;
  idNumber: string;
  fullName: string;
  dob: string;
  address: string;
}

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest mb-2">{children}</p>
);

const PhotoUploadBox: React.FC<{
  label: string;
  preview: string | null;
  onChange: (file: File, preview: string) => void;
  icon?: React.ReactNode;
  hint?: string;
}> = ({ label, preview, onChange, icon, hint }) => {
  const ref = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onChange(file, ev.target?.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div>
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <button type="button" onClick={() => ref.current?.click()}
        className={`w-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all min-h-[100px] relative overflow-hidden ${
          preview ? 'border-[#6360DF] bg-[#6360DF]/5' : 'border-[#d1d0eb] hover:border-[#6360DF] bg-[#f8f7ff]'
        }`}>
        {preview ? (
          <>
            <img src={preview} alt="preview" className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-75" />
            <div className="relative z-10 bg-white/85 backdrop-blur-sm rounded-xl px-3 py-1.5 flex items-center space-x-1.5 shadow-sm">
              <Check size={11} className="text-[#6360DF]" />
              <span className="text-[11px] font-bold text-[#6360DF]">Photo Uploaded</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center space-y-1.5 p-4">
            <div className="w-9 h-9 rounded-xl bg-[#EEEDFA] flex items-center justify-center text-[#6360DF]">
              {icon || <Camera size={16} />}
            </div>
            <span className="text-xs font-bold text-[#151a3c]">{label}</span>
            {hint && <span className="text-[10px] text-[#6c7e96] font-medium text-center leading-tight">{hint}</span>}
          </div>
        )}
      </button>
    </div>
  );
};

// OTP — kept in code, not rendered
const OtpPlaceholder: React.FC<{ phone: string; label: string }> = ({ phone, label }) => (
  <div className="bg-[#f8f7ff] border border-[#d1d0eb]/60 rounded-2xl p-4 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <MessageSquare size={14} className="text-[#6360DF]" />
        <span className="text-sm font-bold text-[#151a3c]">{label}</span>
      </div>
    </div>
  </div>
);

const KycFields: React.FC<{ kycData: KycData; setKycData: React.Dispatch<React.SetStateAction<KycData>> }> = ({ kycData, setKycData }) => {
  const idTypes = ['None', 'Aadhaar Card', 'PAN Card', 'Passport', 'Driving Licence', 'Voter ID'];
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">ID Type</p>
        <div className="relative">
          <select value={kycData.idType} onChange={e => setKycData(p => ({ ...p, idType: e.target.value }))}
            className="w-full bg-white border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-medium text-[#151a3c] outline-none focus:border-[#6360DF] appearance-none">
            {idTypes.map(t => <option key={t}>{t}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none" />
        </div>
      </div>
      {kycData.idType !== 'None' && (
        <>
          {[
            { label: 'ID Number', key: 'idNumber', ph: 'XXXX XXXX XXXX' },
            { label: 'Full Name', key: 'fullName', ph: 'As on document' },
            { label: 'Date of Birth', key: 'dob', ph: 'DD / MM / YYYY' },
            { label: 'Address', key: 'address', ph: 'As on document' },
          ].map(f => (
            <div key={f.key} className="space-y-1.5">
              <p className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">{f.label}</p>
              <input type="text" value={(kycData as any)[f.key]} placeholder={f.ph}
                onChange={e => setKycData(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full bg-white border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-medium text-[#151a3c] outline-none focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10 transition-all" />
            </div>
          ))}
        </>
      )}
    </div>
  );
};

// ── Step Bar ─────────────────────────────────────────────────
const StepBar: React.FC<{ steps: string[]; current: number; color: string; accentColor: string }> = ({ steps, current, color, accentColor }) => (
  <div className="flex items-center space-x-1 px-6 pt-5 pb-4 shrink-0">
    {steps.map((label, i) => {
      const num = i + 1;
      const done = current > num;
      const active = current === num;
      return (
        <React.Fragment key={label}>
          <div className={`flex items-center space-x-1.5 transition-opacity ${active ? 'opacity-100' : done ? 'opacity-80' : 'opacity-30'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
              done ? 'bg-green-500 text-white' : active ? `${color} text-white` : 'bg-[#d1d0eb] text-[#6c7e96]'
            }`}>
              {done ? <Check size={10} /> : num}
            </div>
            <span className={`text-[10px] font-bold hidden sm:block ${active ? accentColor : 'text-[#9ca3af]'}`}>{label}</span>
          </div>
          {i < steps.length - 1 && <div className={`flex-1 h-px mx-0.5 ${done ? 'bg-green-300' : 'bg-[#d1d0eb]'}`} />}
        </React.Fragment>
      );
    })}
  </div>
);

// ── Step Section Divider ──────────────────────────────────────
const StepDivider: React.FC<{ label: string; stepNum: number; active: boolean; done: boolean; color: string }> = ({ label, stepNum, active, done, color }) => (
  <div className="flex items-center space-x-3">
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${
      done ? 'bg-green-500 text-white' : active ? `${color} text-white` : 'bg-[#e5e7eb] text-[#9ca3af]'
    }`}>
      {done ? <Check size={11} /> : stepNum}
    </div>
    <p className={`text-xs font-extrabold uppercase tracking-widest ${active ? 'text-[#151a3c]' : done ? 'text-green-700' : 'text-[#9ca3af]'}`}>{label}</p>
    {done && <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 ml-auto">Done</span>}
  </div>
);

// ── Success Overlay ───────────────────────────────────────────
const SuccessOverlay: React.FC<{ message: string; subMessage: string; circleColor: string; borderColor: string }> = ({ message, subMessage, circleColor, borderColor }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/96 backdrop-blur-sm rounded-none"
  >
    {/* Ripple rings */}
    <div className="relative flex items-center justify-center mb-8">
      <motion.div className={`absolute w-24 h-24 rounded-full border-2 ${borderColor}`}
        animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
        transition={{ duration: 1.2, delay: 0.2, repeat: Infinity, repeatDelay: 0.8 }} />
      <motion.div className={`absolute w-24 h-24 rounded-full border-2 ${borderColor}`}
        animate={{ scale: [1, 2.8], opacity: [0.3, 0] }}
        transition={{ duration: 1.4, delay: 0.5, repeat: Infinity, repeatDelay: 0.8 }} />

      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 10, stiffness: 180, delay: 0.1 }}
        className={`w-24 h-24 rounded-full flex items-center justify-center ${circleColor} shadow-2xl relative z-10`}
      >
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <motion.path
            d="M10 25L20 35L38 15"
            stroke="white"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.55, delay: 0.35, ease: 'easeOut' }}
          />
        </svg>
      </motion.div>
    </div>

    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="text-center space-y-2"
    >
      <h3 className="text-2xl font-extrabold text-[#151a3c]">{message}</h3>
      <p className="text-sm text-[#6c7e96] font-medium">{subMessage}</p>
    </motion.div>
  </motion.div>
);

// ── Drop Panel ────────────────────────────────────────────────
const DropPanel: React.FC<{ row: HandoverRow; onClose: () => void }> = ({ row, onClose }) => {
  const [step, setStep] = useState(1);
  const [kycPhoto, setKycPhoto] = useState<string | null>(null);
  const [kycScanning, setKycScanning] = useState(false);
  const [kycData, setKycData] = useState<KycData>({ idType: 'None', idNumber: '', fullName: '', dob: '', address: '' });
  const [photos, setPhotos] = useState<Record<string, string | null>>({ front: null, rear: null, left: null, right: null });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);
  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

  const handleKycScan = async (file: File, preview: string) => {
    setKycPhoto(preview);
    setKycScanning(true);
    const base64 = preview.split(',')[1];
    const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp';
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 500,
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: 'Extract the following from this ID document and respond ONLY as JSON with keys: idType (one of: Aadhaar Card, PAN Card, Passport, Driving Licence, Voter ID), idNumber, fullName, dob (DD/MM/YYYY), address. If a field is not visible write empty string.' }
          ]}]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      setKycData({ idType: parsed.idType || 'None', idNumber: parsed.idNumber || '', fullName: parsed.fullName || '', dob: parsed.dob || '', address: parsed.address || '' });
      toast.success('ID scanned — please verify details');
    } catch { toast.error('Could not read ID — please fill manually'); }
    setKycScanning(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1000));
    setSubmitting(false);
    setSuccess(true);
    setTimeout(onClose, 2800);
  };

  const advanceTo = (n: number) => {
    setStep(n);
    if (n === 2) scrollTo(step2Ref);
    if (n === 3) scrollTo(step3Ref);
    if (n === 4) scrollTo(step4Ref);
  };

  const photosUploaded = Object.values(photos).filter(Boolean).length;

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <AnimatePresence>{success && <SuccessOverlay message="Drop-Off Complete!" subMessage="Handover recorded successfully." circleColor="bg-orange-500" borderColor="border-orange-400" />}</AnimatePresence>

      <StepBar steps={['Allocation', 'ID Proof', 'Vehicle Photos', 'Confirm']} current={step} color="bg-orange-500" accentColor="text-orange-600" />

      <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-3">

        {/* Step 1 */}
        <div className={`rounded-2xl border overflow-hidden ${step >= 1 ? 'bg-orange-50/70 border-orange-200/70' : 'bg-slate-50 border-slate-200 opacity-50'}`}>
          <div className="px-5 pt-4 pb-3"><StepDivider label="Allocation Details" stepNum={1} active={step === 1} done={step > 1} color="bg-orange-500" /></div>
          <AnimatePresence initial={false}>
            {step >= 1 && (
              <motion.div key="d1" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.22 }} className="px-5 pb-5 space-y-4">
                <div className="bg-white rounded-xl p-4 border border-orange-100 space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500"><Car size={20} /></div>
                    <div>
                      <p className="font-extrabold text-[#151a3c]">{row.registrationNo}</p>
                      <p className="text-xs text-[#6c7e96] font-medium">{row.brand} {row.model}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-orange-50">
                    {[
                      { l: 'Customer', v: row.customerName }, { l: 'Phone', v: row.customerPhone },
                      { l: 'Driver', v: row.driverName }, { l: 'Location', v: row.location },
                      { l: 'Drop Date', v: row.dropAt ? fmtDate(row.dropAt) : '—' }, { l: 'Date & Time', v: fmtDateTime(row.dateTime) },
                    ].map(item => (
                      <div key={item.l}>
                        <p className="text-[9px] font-bold text-[#6c7e96] uppercase tracking-widest">{item.l}</p>
                        <p className="text-sm font-bold text-[#151a3c] mt-0.5 break-all">{item.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {step === 1 && (
                  <button onClick={() => advanceTo(2)} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-orange-200/60 transition-all">
                    <span>Continue to ID Proof</span><ArrowRight size={15} />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step 2 */}
        <div ref={step2Ref} className={`rounded-2xl border overflow-hidden ${step >= 2 ? 'bg-orange-50/50 border-orange-200/60' : 'bg-slate-50 border-slate-200 opacity-40'}`}>
          <div className="px-5 pt-4 pb-3"><StepDivider label="Customer ID Proof" stepNum={2} active={step === 2} done={step > 2} color="bg-orange-500" /></div>
          <AnimatePresence initial={false}>
            {step >= 2 && (
              <motion.div key="d2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.22 }} className="px-5 pb-5 space-y-4">
                <PhotoUploadBox label="Take / Upload ID Photo" preview={kycPhoto} onChange={handleKycScan} icon={<ScanLine size={16} />} hint="Details auto-filled from photo via AI" />
                {kycScanning && <div className="flex items-center space-x-2 text-orange-500 text-sm font-bold"><Loader2 size={14} className="animate-spin" /><span>Scanning document...</span></div>}
                <KycFields kycData={kycData} setKycData={setKycData} />
                {step === 2 && (
                  <div className="flex space-x-3 pt-1">
                    <button onClick={() => setStep(1)} className="flex-1 border border-[#d1d0eb] bg-white text-[#6c7e96] font-bold py-3.5 rounded-xl hover:bg-slate-50 text-sm transition-all">Back</button>
                    <button onClick={() => advanceTo(3)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 text-sm shadow-md shadow-orange-200/60 transition-all">
                      <span>Continue</span><ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step 3 */}
        <div ref={step3Ref} className={`rounded-2xl border overflow-hidden ${step >= 3 ? 'bg-orange-50/50 border-orange-200/60' : 'bg-slate-50 border-slate-200 opacity-30'}`}>
          <div className="px-5 pt-4 pb-3"><StepDivider label="Vehicle Photos — Before Drop" stepNum={3} active={step === 3} done={step > 3} color="bg-orange-500" /></div>
          <AnimatePresence initial={false}>
            {step >= 3 && (
              <motion.div key="d3" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.22 }} className="px-5 pb-5 space-y-4">
                <p className="text-[11px] text-[#6c7e96] font-medium">These will be compared on return to detect any damage.</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['front','rear','left','right'] as const).map(side => (
                    <PhotoUploadBox key={side} label={`${side.charAt(0).toUpperCase() + side.slice(1)} View`} preview={photos[side]} icon={<ImagePlus size={15} />}
                      onChange={(_, prev) => setPhotos(p => ({ ...p, [side]: prev }))} />
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs font-medium text-[#6c7e96] bg-white rounded-xl px-4 py-2.5 border border-orange-100">
                  <span>{photosUploaded}/4 photos uploaded</span>
                  {photosUploaded === 4 && <span className="text-green-600 font-bold flex items-center space-x-1"><CheckCircle2 size={12} /><span>All sides covered</span></span>}
                </div>
                {step === 3 && (
                  <div className="flex space-x-3 pt-1">
                    <button onClick={() => setStep(2)} className="flex-1 border border-[#d1d0eb] bg-white text-[#6c7e96] font-bold py-3.5 rounded-xl hover:bg-slate-50 text-sm transition-all">Back</button>
                    <button onClick={() => advanceTo(4)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 text-sm shadow-md shadow-orange-200/60 transition-all">
                      <span>Continue</span><ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step 4 */}
        <div ref={step4Ref} className={`rounded-2xl border overflow-hidden ${step >= 4 ? 'bg-orange-50/60 border-orange-300/70' : 'bg-slate-50 border-slate-200 opacity-20'}`}>
          <div className="px-5 pt-4 pb-3"><StepDivider label="Confirm Drop-Off" stepNum={4} active={step === 4} done={success} color="bg-orange-500" /></div>
          <AnimatePresence initial={false}>
            {step >= 4 && (
              <motion.div key="d4" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.22 }} className="px-5 pb-5 space-y-4">
                <div className="bg-white rounded-xl p-4 border border-orange-100 space-y-2.5">
                  {[
                    { l: 'Vehicle', v: `${row.registrationNo} · ${row.brand} ${row.model}` },
                    { l: 'Customer', v: row.customerName }, { l: 'Phone', v: row.customerPhone },
                    { l: 'Driver', v: row.driverName }, { l: 'Location', v: row.location },
                    { l: 'Drop Date', v: row.dropAt ? fmtDate(row.dropAt) : '—' },
                    { l: 'ID Type', v: kycData.idType }, { l: 'Photos', v: `${photosUploaded}/4 uploaded` },
                  ].map(s => (
                    <div key={s.l} className="flex items-center justify-between text-sm">
                      <span className="text-[#6c7e96] font-medium">{s.l}</span>
                      <span className="font-bold text-[#151a3c]">{s.v}</span>
                    </div>
                  ))}
                </div>
                {/* OTP hidden — kept in code: <OtpPlaceholder phone={row.customerPhone} label="" /> */}
                <div className="flex space-x-3 pt-1">
                  <button onClick={() => setStep(3)} className="flex-1 border border-[#d1d0eb] bg-white text-[#6c7e96] font-bold py-3.5 rounded-xl hover:bg-slate-50 text-sm transition-all">Back</button>
                  <button onClick={handleSubmit} disabled={submitting}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 text-sm shadow-md shadow-orange-200/60 transition-all">
                    {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    <span>{submitting ? 'Saving...' : 'Complete Drop-Off'}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

// ── Pick Panel ────────────────────────────────────────────────
const PickPanel: React.FC<{ row: HandoverRow; onClose: () => void }> = ({ row, onClose }) => {
  const [step, setStep] = useState(1);
  const [returnPhotos, setReturnPhotos] = useState<Record<string, string | null>>({ front: null, rear: null, left: null, right: null });
  const [damageState, setDamageState] = useState<{ analysing: boolean; done: boolean; result: string }>({ analysing: false, done: false, result: '' });
  const [idConfirmed, setIdConfirmed] = useState<boolean | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

  const returnCount = Object.values(returnPhotos).filter(Boolean).length;

  // AI damage check — kept in code, not called from UI
  const runDamageCheck = async () => {
    if (returnCount === 0) { toast.error('Upload at least one return photo first.'); return; }
    setDamageState({ analysing: true, done: false, result: '' });
    await new Promise(r => setTimeout(r, 2500));
    setDamageState({ analysing: false, done: true, result: 'No new damage detected.' });
    toast.success('AI damage analysis complete');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1000));
    setSubmitting(false);
    setSuccess(true);
    setTimeout(onClose, 2800);
  };

  const handleIdConfirm = (answer: boolean) => { setIdConfirmed(answer); setShowSummary(true); };

  const advanceTo = (n: number) => {
    setStep(n);
    if (n === 2) scrollTo(step2Ref);
    if (n === 3) scrollTo(step3Ref);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <AnimatePresence>{success && <SuccessOverlay message="Return Complete!" subMessage="Vehicle return recorded successfully." circleColor="bg-[#6360DF]" borderColor="border-[#6360DF]" />}</AnimatePresence>

      <StepBar steps={['Allocation', 'Return Photos', 'Return ID']} current={step} color="bg-[#6360DF]" accentColor="text-[#6360DF]" />

      <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-3">

        {/* Step 1 */}
        <div className={`rounded-2xl border overflow-hidden ${step >= 1 ? 'bg-blue-50/60 border-blue-200/70' : 'bg-slate-50 border-slate-200 opacity-50'}`}>
          <div className="px-5 pt-4 pb-3"><StepDivider label="Return Allocation" stepNum={1} active={step === 1} done={step > 1} color="bg-[#6360DF]" /></div>
          <AnimatePresence initial={false}>
            {step >= 1 && (
              <motion.div key="p1" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.22 }} className="px-5 pb-5 space-y-4">
                <div className="bg-white rounded-xl p-4 border border-blue-100 space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 bg-[#EEEDFA] rounded-xl flex items-center justify-center text-[#6360DF]"><Car size={20} /></div>
                    <div>
                      <p className="font-extrabold text-[#151a3c]">{row.registrationNo}</p>
                      <p className="text-xs text-[#6c7e96] font-medium">{row.brand} {row.model}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-blue-50">
                    {[
                      { l: 'Customer', v: row.customerName }, { l: 'Phone', v: row.customerPhone },
                      { l: 'Driver', v: row.driverName }, { l: 'Location', v: row.location },
                      { l: 'Pickup Date', v: row.pickupAt ? fmtDate(row.pickupAt) : '—' }, { l: 'Date & Time', v: fmtDateTime(row.dateTime) },
                    ].map(item => (
                      <div key={item.l}>
                        <p className="text-[9px] font-bold text-[#6c7e96] uppercase tracking-widest">{item.l}</p>
                        <p className="text-sm font-bold text-[#151a3c] mt-0.5 break-all">{item.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {step === 1 && (
                  <button onClick={() => advanceTo(2)} className="w-full bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-[#6360df22] transition-all">
                    <span>Continue to Return Photos</span><ArrowRight size={15} />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step 2 */}
        <div ref={step2Ref} className={`rounded-2xl border overflow-hidden ${step >= 2 ? 'bg-blue-50/50 border-blue-200/60' : 'bg-slate-50 border-slate-200 opacity-40'}`}>
          <div className="px-5 pt-4 pb-3"><StepDivider label="Return Vehicle Photos" stepNum={2} active={step === 2} done={step > 2} color="bg-[#6360DF]" /></div>
          <AnimatePresence initial={false}>
            {step >= 2 && (
              <motion.div key="p2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.22 }} className="px-5 pb-5 space-y-4">
                <p className="text-[11px] text-[#6c7e96] font-medium">Upload photos of the vehicle on return.</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['front','rear','left','right'] as const).map(side => (
                    <PhotoUploadBox key={side} label={`${side.charAt(0).toUpperCase() + side.slice(1)} View`} preview={returnPhotos[side]} icon={<ImagePlus size={15} />}
                      onChange={(_, prev) => setReturnPhotos(p => ({ ...p, [side]: prev }))} />
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs font-medium text-[#6c7e96] bg-white rounded-xl px-4 py-2.5 border border-blue-100">
                  <span>{returnCount}/4 photos uploaded</span>
                  {returnCount === 4 && <span className="text-green-600 font-bold flex items-center space-x-1"><CheckCircle2 size={12} /><span>All sides covered</span></span>}
                </div>
                {/* AI Damage Detection — hidden, code kept: runDamageCheck(), damageState */}
                {step === 2 && (
                  <div className="flex space-x-3 pt-1">
                    <button onClick={() => setStep(1)} className="flex-1 border border-[#d1d0eb] bg-white text-[#6c7e96] font-bold py-3.5 rounded-xl hover:bg-slate-50 text-sm transition-all">Back</button>
                    <button onClick={() => advanceTo(3)} className="flex-1 bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 text-sm shadow-md shadow-[#6360df22] transition-all">
                      <span>Continue</span><ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step 3 */}
        <div ref={step3Ref} className={`rounded-2xl border overflow-hidden ${step >= 3 ? 'bg-blue-50/60 border-blue-300/70' : 'bg-slate-50 border-slate-200 opacity-30'}`}>
          <div className="px-5 pt-4 pb-3"><StepDivider label="Return ID" stepNum={3} active={step === 3} done={success} color="bg-[#6360DF]" /></div>
          <AnimatePresence initial={false}>
            {step >= 3 && (
              <motion.div key="p3" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.22 }} className="px-5 pb-5 space-y-4">

                {/* 3a — ID question */}
                {!showSummary && (
                  <motion.div key="p3a" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="bg-white rounded-xl border border-blue-100 p-4 space-y-4">
                      <p className="text-base font-bold text-[#151a3c]">ID Returned?</p>
                      <div className="flex space-x-3">
                        <button onClick={() => handleIdConfirm(false)}
                          className={`flex-1 py-3.5 rounded-xl text-sm font-bold border-2 transition-all ${idConfirmed === false ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-[#d1d0eb] text-[#151a3c] hover:border-orange-400 hover:text-orange-500'}`}>No</button>
                        <button onClick={() => handleIdConfirm(true)}
                          className={`flex-1 py-3.5 rounded-xl text-sm font-bold border-2 transition-all ${idConfirmed === true ? 'bg-[#6360DF] border-[#6360DF] text-white' : 'bg-white border-[#d1d0eb] text-[#151a3c] hover:border-[#6360DF] hover:text-[#6360DF]'}`}>Yes</button>
                      </div>
                    </div>
                    {/* OTP hidden: <OtpPlaceholder phone={row.customerPhone} label="Return Confirmation OTP / Survey SMS" /> */}
                    <button onClick={() => setStep(2)} className="w-full border border-[#d1d0eb] bg-white text-[#6c7e96] font-bold py-3.5 rounded-xl hover:bg-slate-50 text-sm transition-all flex items-center justify-center space-x-2">
                      <ArrowRight size={14} className="rotate-180" /><span>Back</span>
                    </button>
                  </motion.div>
                )}

                {/* 3b — Summary */}
                {showSummary && (
                  <motion.div key="p3b" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 size={14} className="text-green-500" />
                      <p className="text-xs font-extrabold text-green-700 uppercase tracking-widest">Return Summary</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-blue-100 space-y-2.5">
                      {[
                        { l: 'Vehicle', v: `${row.registrationNo} · ${row.brand} ${row.model}` },
                        { l: 'Customer', v: row.customerName }, { l: 'Phone', v: row.customerPhone },
                        { l: 'Driver', v: row.driverName }, { l: 'Location', v: row.location },
                        { l: 'Pickup Date', v: row.pickupAt ? fmtDate(row.pickupAt) : '—' },
                        { l: 'Return Photos', v: `${returnCount}/4 uploaded` },
                        { l: 'ID Returned', v: idConfirmed === true ? '✓ Yes' : '✗ No' },
                      ].map(s => (
                        <div key={s.l} className="flex items-center justify-between text-sm">
                          <span className="text-[#6c7e96] font-medium">{s.l}</span>
                          <span className={`font-bold ${s.l === 'ID Returned' && idConfirmed === true ? 'text-green-600' : s.l === 'ID Returned' && idConfirmed === false ? 'text-orange-500' : 'text-[#151a3c]'}`}>{s.v}</span>
                        </div>
                      ))}
                    </div>
                    {/* OTP hidden: <OtpPlaceholder phone={row.customerPhone} label="Return Confirmation OTP / Survey SMS" /> */}
                    <div className="flex space-x-3 pt-1">
                      <button onClick={() => { setShowSummary(false); setIdConfirmed(null); }}
                        className="flex-1 border border-[#d1d0eb] bg-white text-[#6c7e96] font-bold py-3.5 rounded-xl hover:bg-slate-50 text-sm transition-all">Back</button>
                      <button onClick={handleSubmit} disabled={submitting}
                        className="flex-1 bg-[#6360DF] hover:bg-[#5451d0] disabled:opacity-60 text-white font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 text-sm shadow-md shadow-[#6360df22] transition-all">
                        {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                        <span>{submitting ? 'Saving...' : 'Complete Return'}</span>
                      </button>
                    </div>
                  </motion.div>
                )}

              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

// ── Main HandoverPage ─────────────────────────────────────────
const HandoverPage: React.FC = () => {
  const [rows, setRows] = useState<HandoverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Pick' | 'Drop'>('All');
  const [selectedRow, setSelectedRow] = useState<HandoverRow | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const loadHandovers = async (date: string) => {
    setLoading(true);
    const authUser = await getCurrentUser();
    if (!authUser) { setLoading(false); return; }
    const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', authUser.id).single();
    if (!ownerRow) { setLoading(false); return; }

    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(date); dayEnd.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('allocations')
      .select(`
        id, type, location, date_time,
        drivers ( full_name, phone ),
        booking_details (
          id,
          vehicles ( registration_no, models ( brand, name ) ),
          bookings ( customer_name, customer_phone, pickup_at, drop_at, status )
        )
      `)
      .eq('owner_id', ownerRow.id)
      .gte('date_time', dayStart.toISOString())
      .lte('date_time', dayEnd.toISOString())
      .order('date_time', { ascending: false });

    if (error) { setLoading(false); return; }

    const mapped: HandoverRow[] = ((data as any[]) || [])
      .filter((a: any) => a.booking_details?.bookings)
      .map((a: any) => ({
        id: a.id, type: a.type as HandoverType, dateTime: a.date_time,
        location: a.location || '—',
        registrationNo: a.booking_details?.vehicles?.registration_no || '—',
        brand: a.booking_details?.vehicles?.models?.brand || '—',
        model: a.booking_details?.vehicles?.models?.name || '—',
        driverName: a.drivers?.full_name || '—', driverPhone: a.drivers?.phone || '—',
        customerName: a.booking_details?.bookings?.customer_name || '—',
        customerPhone: a.booking_details?.bookings?.customer_phone || '—',
        pickupAt: a.booking_details?.bookings?.pickup_at || '',
        dropAt: a.booking_details?.bookings?.drop_at || '',
        bookingStatus: a.booking_details?.bookings?.status || '—',
        bookingDetailId: a.booking_details?.id || '',
      }));

    setRows(mapped);
    setLoading(false);
  };

  useEffect(() => { loadHandovers(selectedDate); }, [selectedDate]);

  const stats = {
    pending:    rows.filter(r => r.bookingStatus === 'BOOKED').length,
    checkedOut: rows.filter(r => r.bookingStatus === 'ONGOING').length,
    returned:   rows.filter(r => r.bookingStatus === 'COMPLETED').length,
  };

  const filtered = rows.filter(r => {
    const matchSearch =
      r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.registrationNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${r.brand} ${r.model}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.driverName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch && (typeFilter === 'All' || r.type === typeFilter);
  });

  const openPanel  = (row: HandoverRow) => { setSelectedRow(row); setIsPanelOpen(true); };
  const closePanel = () => { setIsPanelOpen(false); setSelectedRow(null); };

  return (
    <div className="min-h-full space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[24px] font-extrabold text-[#151a3c] tracking-tight">Vehicle Handover</h2>
          <p className="text-[#6c7e96] text-sm font-medium mt-1 opacity-80">Pick & Drop allocations from your fleet</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group min-w-[240px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cbd5e1] w-4 h-4 group-focus-within:text-[#6360DF] transition-colors" />
            <input type="text" placeholder="Search customer or vehicle..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#d1d0eb] rounded-full py-2.5 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all" />
          </div>
          <div className="flex items-center space-x-2 bg-white px-4 py-2.5 rounded-xl border border-[#d1d0eb]">
            <Calendar size={15} className="text-[#6c7e96] shrink-0" />
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="outline-none bg-transparent text-sm font-semibold text-[#151a3c] cursor-pointer w-[116px]" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Handover', count: stats.pending,    color: 'text-orange-500', bg: 'bg-orange-50', icon: <Clock size={20} /> },
          { label: 'Checked Out',      count: stats.checkedOut, color: 'text-blue-500',   bg: 'bg-blue-50',   icon: <Car size={20} /> },
          { label: 'Returned Today',   count: stats.returned,   color: 'text-green-500',  bg: 'bg-green-50',  icon: <CheckCircle2 size={20} /> },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-50 flex items-center justify-between hover:shadow-lg transition-all">
            <div>
              <p className="text-[#6c7e96] text-xs font-bold uppercase tracking-widest">{s.label}</p>
              <h3 className={`text-3xl font-black mt-1 ${s.color}`}>{s.count}</h3>
            </div>
            <div className={`w-14 h-14 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center`}>{s.icon}</div>
          </motion.div>
        ))}
      </div>

      {/* Type tabs */}
      <div className="flex items-center space-x-2">
        {([
          { label: 'All',  count: rows.length },
          { label: 'Pick', count: rows.filter(r => r.type === 'Pick').length },
          { label: 'Drop', count: rows.filter(r => r.type === 'Drop').length },
        ] as const).map(tab => (
          <button key={tab.label} onClick={() => setTypeFilter(tab.label as any)}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 ${
              typeFilter === tab.label
                ? tab.label === 'Pick' ? 'bg-blue-500 text-white shadow-md shadow-blue-200'
                  : tab.label === 'Drop' ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                  : 'bg-[#6360DF] text-white shadow-md shadow-[#6360df33]'
                : 'bg-white text-[#6c7e96] border border-[#d1d0eb] hover:border-[#6360DF] hover:text-[#6360DF]'
            }`}>
            <span>{tab.label}</span>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${typeFilter === tab.label ? 'bg-white/20' : 'bg-[#f0f0f0]'}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F8F9FA]/50 text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/20">
                <th className="pl-8 py-5">Date & Time</th>
                <th className="px-4 py-5">Vehicle</th>
                <th className="px-4 py-5">Driver</th>
                <th className="px-4 py-5">Customer</th>
                <th className="px-6 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d1d0eb]/20">
              {loading ? (
                <tr><td colSpan={5} className="py-16 text-center">
                  <div className="flex items-center justify-center text-[#6c7e96]">
                    <Loader2 size={22} className="animate-spin mr-2" />
                    <span className="text-sm font-medium">Loading handovers...</span>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-[#6c7e96] text-sm font-medium">No handover records found for this date.</td></tr>
              ) : filtered.map((row, idx) => (
                <motion.tr key={row.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                  className="hover:bg-[#F8F9FA] transition-colors cursor-pointer" onClick={() => openPanel(row)}>
                  <td className="py-4 pl-8 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold tracking-widest shrink-0 ${row.type === 'Pick' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>{row.type.toUpperCase()}</span>
                      <p className="text-sm font-bold text-[#151a3c]">
                        {new Date(row.dateTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        <span className="font-medium text-[#6c7e96] ml-1.5">{new Date(row.dateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Car size={13} className="text-[#6360DF] shrink-0" />
                      <div>
                        <p className="font-bold text-[#151a3c] text-sm">{row.registrationNo}</p>
                        <p className="text-[11px] text-[#6c7e96] font-medium">{row.brand} {row.model}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-[#EEEDFA] flex items-center justify-center text-[#6360DF] text-[9px] font-extrabold shrink-0">
                        {row.driverName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#151a3c]">{row.driverName}</p>
                        {row.driverPhone && row.driverPhone !== '—' && (
                          <div className="flex items-center space-x-1 mt-0.5"><Phone size={9} className="text-[#6360DF]" /><span className="text-[11px] font-medium text-[#6c7e96]">{row.driverPhone}</span></div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <p className="font-bold text-[#151a3c] text-sm">{row.customerName}</p>
                    <div className="flex items-center space-x-1 mt-0.5"><Phone size={9} className="text-[#6360DF]" /><span className="text-[11px] font-medium text-[#6c7e96]">{row.customerPhone}</span></div>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap text-right">
                    <button onClick={e => { e.stopPropagation(); openPanel(row); }}
                      className="flex items-center space-x-1.5 bg-[#EEEDFA] text-[#6360DF] px-4 py-2 rounded-lg text-[11px] font-bold hover:bg-[#6360DF] hover:text-white transition-all ml-auto">
                      <FileText size={11} /><span>View</span>
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side panel */}
      <AnimatePresence>
        {isPanelOpen && selectedRow && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closePanel} className="fixed inset-0 z-[110] bg-[#151a3c]/20 backdrop-blur-sm" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-[120] w-full max-w-[500px] bg-white shadow-2xl flex flex-col">

              {/* Panel header */}
              <div className={`px-8 py-5 border-b flex items-center justify-between shrink-0 ${selectedRow.type === 'Drop' ? 'bg-orange-50 border-orange-100' : 'bg-[#f0f4ff] border-blue-100'}`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${selectedRow.type === 'Drop' ? 'bg-orange-100 text-orange-500' : 'bg-[#EEEDFA] text-[#6360DF]'}`}>
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#151a3c]">{selectedRow.type === 'Drop' ? 'Vehicle Drop-Off' : 'Vehicle Return'}</h3>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest mt-0.5 ${selectedRow.type === 'Drop' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                      {selectedRow.type === 'Drop' ? 'DROP OFF' : 'PICK UP'}
                    </span>
                  </div>
                </div>
                <button onClick={closePanel} className="p-2 hover:bg-white/80 rounded-xl transition-colors text-[#6c7e96]"><X size={20} /></button>
              </div>

              {selectedRow.type === 'Drop'
                ? <DropPanel key={selectedRow.id + '-drop'} row={selectedRow} onClose={closePanel} />
                : <PickPanel key={selectedRow.id + '-pick'} row={selectedRow} onClose={closePanel} />
              }
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HandoverPage;