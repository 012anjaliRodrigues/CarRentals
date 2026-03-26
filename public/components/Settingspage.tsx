import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, Loader2, Check, X, Plus,
  Clock, Trash2, Pencil, Sun,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase, getCurrentUser } from '../supabaseClient';

// ── Goa locations ─────────────────────────────────────────────
const GOA_LOCATIONS = [
  'Panaji','Panjim','Mapusa','Margao','Vasco da Gama','Mormugao',
  'Calangute','Candolim','Baga','Anjuna','Vagator','Chapora',
  'Arambol','Mandrem','Ashvem','Morjim','Pernem','Siolim',
  'Assagao','Saligao','Porvorim','Reis Magos','Verem','Nerul',
  'Arpora','Nagoa','Sangolda','Pilerne','Miramar','Dona Paula',
  'Bambolim','Taleigao','Santa Cruz','Curca','Goa Velha','Old Goa',
  'Ponda','Farmagudi','Priol','Shiroda','Bandora','Quepem',
  'Curchorem','Sanvordem','Chandor','Curtorim','Raia','Loutolim',
  'Benaulim','Colva','Betalbatim','Majorda','Utorda','Varca',
  'Cavelossim','Mobor','Betul','Cuncolim','Velim','Navelim',
  'Fatorda','Aquem','Bogmalo','Chicalim','Dabolim','Zuarinagar',
  'Cortalim','Sancoale','Cansaulim','Arossim','Bicholim','Sanquelim',
  'Valpoi','Canacona','Chaudi','Palolem','Patnem','Agonda',
  'Cabo de Rama','Polem','Galgibaga','Dabolim Airport','Mopa Airport',
];

// ── Types ─────────────────────────────────────────────────────
// Surcharges stored as strings in editing state so the user can
// freely clear the field — avoids "0 stays" behaviour.
interface ServiceLocation {
  id: string;
  location_name: string;
  surcharge: string;
  night_surcharge: string;
  isNew?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────
const inputCls =
  'w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-2.5 px-4 text-sm font-medium text-[#151a3c] outline-none focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10 transition-all';
const labelCls = 'text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider';

// Parse surcharge string safely → number for DB
const parseSurcharge = (v: string): number => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

// Display surcharge: show "—" when 0
const displaySurcharge = (v: number) =>
  v > 0 ? `₹${v.toFixed(2)}` : null;

// Convert "HH:MM:SS" or "HH:MM" → "HH:MM" for <input type="time">
const toTimeInput = (t: string) => (t ? t.slice(0, 5) : '');

// ── Section Wrapper ───────────────────────────────────────────
const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  editing: boolean;
  saving?: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}> = ({ icon, title, subtitle, editing, saving, onEdit, onSave, onCancel, children }) => (
  <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
    <div className="px-8 py-5 border-b border-[#d1d0eb]/30 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-[#EEEDFA] rounded-xl flex items-center justify-center text-[#6360DF] shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-[#151a3c]">{title}</h3>
          <p className="text-xs text-[#6c7e96] font-medium mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {editing ? (
          <>
            <button
              onClick={onCancel}
              className="flex items-center space-x-1.5 border border-[#d1d0eb] text-[#6c7e96] px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
            >
              <X size={12} /><span>Cancel</span>
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center space-x-1.5 bg-[#6360DF] hover:bg-[#5451d0] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#6360df22] transition-all disabled:opacity-60"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
          </>
        ) : (
          <button
            onClick={onEdit}
            className="flex items-center space-x-1.5 border border-[#d1d0eb] text-[#6c7e96] hover:text-[#6360DF] hover:border-[#6360DF] px-4 py-2 rounded-xl text-xs font-bold transition-all"
          >
            <Pencil size={12} /><span>Edit</span>
          </button>
        )}
      </div>
    </div>
    <div className="px-8 py-7">{children}</div>
  </div>
);

// ── Location Autocomplete ─────────────────────────────────────
const LocationAutocomplete: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onSelect?: (v: string) => void;
  existingLocations: string[];
  placeholder?: string;
}> = ({ value, onChange, onSelect, existingLocations, placeholder }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const suggestions =
    value.trim().length > 0
      ? GOA_LOCATIONS.filter(
          loc =>
            loc.toLowerCase().includes(value.toLowerCase()) &&
            !existingLocations.map(l => l.toLowerCase()).includes(loc.toLowerCase())
        ).slice(0, 8)
      : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <input
        className={inputCls}
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
        placeholder={placeholder || 'Type a location in Goa...'}
        autoComplete="off"
      />
      <AnimatePresence>
        {open && suggestions.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 w-full mt-1 bg-white border border-[#d1d0eb] rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto"
          >
            {suggestions.map(loc => (
              <li key={loc}>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); onChange(loc); setOpen(false); onSelect?.(loc); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-[#151a3c] hover:bg-[#EEEDFA] hover:text-[#6360DF] flex items-center space-x-2 transition-colors"
                >
                  <MapPin size={12} className="text-[#6360DF] shrink-0" />
                  <span>{loc}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── SettingsPage ──────────────────────────────────────────────
const Settingspage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState('');
  const [editingLocations, setEditingLocations] = useState(false);

  // Locations state (surcharges as strings)
  const [serviceLocations,     setServiceLocations]     = useState<ServiceLocation[]>([]);
  const [serviceLocationsOrig, setServiceLocationsOrig] = useState<ServiceLocation[]>([]);
  const [nightFrom,     setNightFrom]     = useState('');
  const [nightTo,       setNightTo]       = useState('');
  const [nightFromOrig, setNightFromOrig] = useState('');
  const [nightToOrig,   setNightToOrig]   = useState('');
  const [newLocName,    setNewLocName]    = useState('');
  const [savingLoc,     setSavingLoc]     = useState(false);

  // Base location state
  const [baseLocation,     setBaseLocation]     = useState('');
  const [baseLocationOrig, setBaseLocationOrig] = useState('');

  // ── Day Timing state (NEW) ────────────────────────────────
  const [editingDayTiming,  setEditingDayTiming]  = useState(false);
  const [dayStartTime,      setDayStartTime]      = useState('09:00');
  const [halfDayHours,      setHalfDayHours]      = useState('6');
  const [dayStartTimeOrig,  setDayStartTimeOrig]  = useState('09:00');
  const [halfDayHoursOrig,  setHalfDayHoursOrig]  = useState('6');
  const [savingDayTiming,   setSavingDayTiming]   = useState(false);

  // ── Load ───────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const authUser = await getCurrentUser();
      if (!authUser) { setLoading(false); return; }

      const { data: owner } = await supabase
        .from('owners')
        .select('id, night_timing_from, night_timing_to, base_location, day_start_time, half_day_hours')
        .eq('user_id', authUser.id)
        .single();
      if (!owner) { setLoading(false); return; }

      setOwnerId(owner.id);

      // Night timings — identical to original
      const nFrom = owner.night_timing_from || '';
      const nTo   = owner.night_timing_to   || '';
      setNightFrom(nFrom); setNightFromOrig(nFrom);
      setNightTo(nTo);     setNightToOrig(nTo);

      // Base location — identical to original
      const bLoc = owner.base_location || '';
      setBaseLocation(bLoc); setBaseLocationOrig(bLoc);

      // Day timing — defaults: 09:00 start, 6h half day
      const dst = toTimeInput(owner.day_start_time || '09:00:00');
      const hdh = owner.half_day_hours != null ? String(owner.half_day_hours) : '6';
      setDayStartTime(dst);    setDayStartTimeOrig(dst);
      setHalfDayHours(hdh);   setHalfDayHoursOrig(hdh);

      // Service locations — identical to original
      const { data: locs } = await supabase
        .from('owner_service_locations')
        .select('id, location_name, surcharge, night_surcharge')
        .eq('owner_id', owner.id)
        .order('created_at', { ascending: true });

      const mappedLocs: ServiceLocation[] = (locs || []).map(l => ({
        id:             l.id,
        location_name:  l.location_name,
        surcharge:      l.surcharge != null ? String(l.surcharge) : '',
        night_surcharge: l.night_surcharge != null ? String(l.night_surcharge) : '',
      }));
      setServiceLocations(mappedLocs);
      setServiceLocationsOrig(JSON.parse(JSON.stringify(mappedLocs)));
      setLoading(false);
    };
    load();
  }, []);

  // ── Save Locations — identical to original ─────────────────
  const saveLocations = async () => {
    setSavingLoc(true);
    try {
      const { error: nightErr } = await supabase
        .from('owners')
        .update({
          base_location: baseLocation.trim() || null,
          night_timing_from: nightFrom || null,
          night_timing_to: nightTo || null,
        })
        .eq('id', ownerId);
      if (nightErr) { toast.error('Failed to save settings.'); return; }

      for (const loc of serviceLocations.filter(l => l.isNew)) {
        const { error } = await supabase.from('owner_service_locations').insert({
          owner_id:        ownerId,
          location_name:   loc.location_name,
          surcharge:       parseSurcharge(loc.surcharge),
          night_surcharge: parseSurcharge(loc.night_surcharge),
        });
        if (error) { toast.error('Failed to add: ' + loc.location_name); return; }
      }

      for (const loc of serviceLocations.filter(l => !l.isNew)) {
        const orig = serviceLocationsOrig.find(o => o.id === loc.id);
        if (!orig) continue;
        if (
          orig.location_name   !== loc.location_name ||
          orig.surcharge       !== loc.surcharge ||
          orig.night_surcharge !== loc.night_surcharge
        ) {
          await supabase.from('owner_service_locations').update({
            location_name:   loc.location_name,
            surcharge:       parseSurcharge(loc.surcharge),
            night_surcharge: parseSurcharge(loc.night_surcharge),
          }).eq('id', loc.id);
        }
      }

      for (const orig of serviceLocationsOrig) {
        if (!serviceLocations.find(l => l.id === orig.id)) {
          await supabase.from('owner_service_locations').delete().eq('id', orig.id);
        }
      }

      toast.success('Locations saved!');

      const { data: locs } = await supabase
        .from('owner_service_locations')
        .select('id, location_name, surcharge, night_surcharge')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: true });
      const refreshed: ServiceLocation[] = (locs || []).map(l => ({
        id:              l.id,
        location_name:   l.location_name,
        surcharge:       l.surcharge != null ? String(l.surcharge) : '',
        night_surcharge: l.night_surcharge != null ? String(l.night_surcharge) : '',
      }));
      setServiceLocations(refreshed);
      setServiceLocationsOrig(JSON.parse(JSON.stringify(refreshed)));
      setNightFromOrig(nightFrom);
      setNightToOrig(nightTo);
      setBaseLocationOrig(baseLocation);
      setEditingLocations(false);
    } finally { setSavingLoc(false); }
  };

  const cancelLocations = () => {
    setServiceLocations(JSON.parse(JSON.stringify(serviceLocationsOrig)));
    setNightFrom(nightFromOrig);
    setNightTo(nightToOrig);
    setBaseLocation(baseLocationOrig);
    setNewLocName('');
    setEditingLocations(false);
  };

  const addLocationRow = (name?: string) => {
    const locName = (name ?? newLocName).trim();
    if (!locName) return;
    if (serviceLocations.some(l => l.location_name.toLowerCase() === locName.toLowerCase())) {
      toast.error('Location already added.'); return;
    }
    setServiceLocations(prev => [
      ...prev,
      { id: '__new__' + Date.now(), location_name: locName, surcharge: '', night_surcharge: '', isNew: true },
    ]);
    setNewLocName('');
  };

  const removeLocationRow = (id: string) =>
    setServiceLocations(prev => prev.filter(l => l.id !== id));

  const updateSurcharge = (id: string, field: 'surcharge' | 'night_surcharge', value: string) =>
    setServiceLocations(prev =>
      prev.map(l => l.id === id ? { ...l, [field]: value } : l)
    );

  // ── Save Day Timing (NEW) ─────────────────────────────────
  const saveDayTiming = async () => {
    const hdh = parseFloat(halfDayHours);
    if (isNaN(hdh) || hdh <= 0 || hdh >= 24) {
      toast.error('Half day hours must be between 0 and 24.'); return;
    }
    setSavingDayTiming(true);
    try {
      const { error } = await supabase
        .from('owners')
        .update({
          day_start_time: dayStartTime + ':00',
          half_day_hours: hdh,
        })
        .eq('id', ownerId);
      if (error) { toast.error('Failed to save day timings.'); return; }
      setDayStartTimeOrig(dayStartTime);
      setHalfDayHoursOrig(halfDayHours);
      setEditingDayTiming(false);
      toast.success('Day timing saved!');
    } finally { setSavingDayTiming(false); }
  };

  const cancelDayTiming = () => {
    setDayStartTime(dayStartTimeOrig);
    setHalfDayHours(halfDayHoursOrig);
    setEditingDayTiming(false);
  };

  // ── Derived: half day cutoff time for display ─────────────
  // halfDayCutoff = dayStartTime + halfDayHours
  const halfDayCutoffDisplay = (() => {
    try {
      const [h, m] = dayStartTimeOrig.split(':').map(Number);
      const hdh = parseFloat(halfDayHoursOrig) || 6;
      const totalMins = h * 60 + m + Math.round(hdh * 60);
      const cutH = Math.floor(totalMins / 60) % 24;
      const cutM = totalMins % 60;
      const d = new Date();
      d.setHours(cutH, cutM, 0, 0);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return '—'; }
  })();

  // ── Time formatter — identical to original ─────────────────
  const fmtTime = (t: string) =>
    t ? new Date('1970-01-01T' + t).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    }) : '—';

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-[#6c7e96]">
      <Loader2 size={22} className="animate-spin mr-2" />
      <span className="text-sm font-medium">Loading settings...</span>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-[24px] font-extrabold text-[#151a3c] tracking-tight">Settings</h2>
        <p className="text-[#6c7e96] text-sm font-medium mt-1">Manage your service areas and night timings</p>
      </div>

      {/* ── Locations Card — identical to original ────────────── */}
      <Section
        icon={<MapPin size={18} />}
        title="Locations"
        subtitle="Service areas, surcharges and night timings for your fleet"
        editing={editingLocations}
        saving={savingLoc}
        onEdit={() => setEditingLocations(true)}
        onSave={saveLocations}
        onCancel={cancelLocations}
      >
        <div className="mb-5 space-y-1.5">
          <label className={labelCls}>Base Location (HQ)</label>
          <p className="text-[11px] text-[#6c7e96] font-medium -mt-0.5">Your main operating location — no surcharge applies here</p>
          {editingLocations ? (
            <LocationAutocomplete
              value={baseLocation}
              onChange={setBaseLocation}
              existingLocations={serviceLocations.map(l => l.location_name)}
              placeholder="e.g. Panaji, Mapusa..."
            />
          ) : (
            <div className="flex items-center space-x-2 py-2">
              <MapPin size={13} className="text-[#6360DF] shrink-0" />
              <span className="text-sm font-bold text-[#151a3c]">
                {baseLocation || <span className="text-[#6c7e96] font-normal italic">Not set</span>}
              </span>
              {baseLocation && (
                <span className="ml-2 text-[10px] font-extrabold text-[#6360DF] bg-[#EEEDFA] px-2.5 py-0.5 rounded-full tracking-wide">
                  HQ · No Charge
                </span>
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#d1d0eb]/40">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F8F9FA] text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/40">
                <th className="px-5 py-3">Location Name</th>
                <th className="px-5 py-3">Surcharge (₹)</th>
                <th className="px-5 py-3">Night Surcharge (₹)</th>
                {editingLocations && <th className="px-4 py-3 w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d1d0eb]/20">
              {serviceLocations.length === 0 ? (
                <tr>
                  <td colSpan={editingLocations ? 4 : 3} className="px-5 py-10 text-center text-xs text-[#6c7e96] font-medium">
                    No service locations added yet.{' '}
                    {!editingLocations && (
                      <span className="text-[#6360DF] font-bold cursor-pointer" onClick={() => setEditingLocations(true)}>
                        Click Edit to add.
                      </span>
                    )}
                  </td>
                </tr>
              ) : serviceLocations.map(loc => (
                <tr key={loc.id} className="hover:bg-[#fafafa] transition-colors">
                  <td className="px-5 py-3">
                    {editingLocations ? (
                      <LocationAutocomplete
                        value={loc.location_name}
                        onChange={v => setServiceLocations(prev => prev.map(l => l.id === loc.id ? { ...l, location_name: v } : l))}
                        existingLocations={serviceLocations.filter(l => l.id !== loc.id).map(l => l.location_name)}
                      />
                    ) : (
                      <div className="flex items-center space-x-2">
                        <MapPin size={11} className="text-[#6360DF] shrink-0" />
                        <span className="text-sm font-bold text-[#151a3c]">{loc.location_name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {editingLocations ? (
                      <input type="number" min="0" step="0.01" placeholder="0" value={loc.surcharge}
                        onChange={e => updateSurcharge(loc.id, 'surcharge', e.target.value)}
                        className={inputCls + ' w-32'} />
                    ) : (
                      <span className="text-sm font-bold text-[#151a3c]">
                        {displaySurcharge(parseSurcharge(loc.surcharge)) ?? <span className="text-[#6c7e96] font-normal">—</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {editingLocations ? (
                      <input type="number" min="0" step="0.01" placeholder="0" value={loc.night_surcharge}
                        onChange={e => updateSurcharge(loc.id, 'night_surcharge', e.target.value)}
                        className={inputCls + ' w-32'} />
                    ) : (
                      <span className="text-sm font-bold text-[#151a3c]">
                        {displaySurcharge(parseSurcharge(loc.night_surcharge)) ?? <span className="text-[#6c7e96] font-normal">—</span>}
                      </span>
                    )}
                  </td>
                  {editingLocations && (
                    <td className="px-4 py-3">
                      <button onClick={() => removeLocationRow(loc.id)}
                        className="p-1.5 text-[#cbd5e1] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editingLocations && (
          <div className="flex items-center gap-2 mt-3">
            <LocationAutocomplete
              value={newLocName}
              onChange={setNewLocName}
              onSelect={name => addLocationRow(name)}
              existingLocations={serviceLocations.map(l => l.location_name)}
              placeholder="Search Goa locations to add..."
            />
            <button onClick={() => addLocationRow()}
              className="flex items-center space-x-1.5 bg-[#6360DF] hover:bg-[#5451d0] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0">
              <Plus size={13} /><span>Add</span>
            </button>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-[#d1d0eb]/30">
          <div className="flex items-center space-x-2 mb-4">
            <Clock size={14} className="text-[#6360DF]" />
            <p className={labelCls}>Night Timings</p>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-xs">
            <div className="space-y-1.5">
              <label className={labelCls}>From</label>
              {editingLocations ? (
                <input type="time" value={nightFrom} onChange={e => setNightFrom(e.target.value)} className={inputCls} />
              ) : (
                <p className="text-sm font-bold text-[#151a3c]">{fmtTime(nightFrom)}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>To</label>
              {editingLocations ? (
                <input type="time" value={nightTo} onChange={e => setNightTo(e.target.value)} className={inputCls} />
              ) : (
                <p className="text-sm font-bold text-[#151a3c]">{fmtTime(nightTo)}</p>
              )}
            </div>
          </div>
          {editingLocations && (
            <p className="text-[11px] text-[#6c7e96] font-medium mt-2">
              Night surcharge applies to bookings that include any hours between these times.
            </p>
          )}
        </div>
      </Section>

      {/* ── Day & Half Day Duration Card (NEW) ───────────────── */}
      <Section
        icon={<Sun size={18} />}
        title="Day & Half Day Duration"
        subtitle="Define when a billing day starts and the half day cutoff for bookings"
        editing={editingDayTiming}
        saving={savingDayTiming}
        onEdit={() => setEditingDayTiming(true)}
        onSave={saveDayTiming}
        onCancel={cancelDayTiming}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

          {/* Day Start Time */}
          <div className="space-y-1.5">
            <label className={labelCls}>Day Start Time</label>
            <p className="text-[11px] text-[#6c7e96] font-medium">
              Each billing day begins at this time (default: 09:00 AM)
            </p>
            {editingDayTiming ? (
              <input
                type="time"
                value={dayStartTime}
                onChange={e => setDayStartTime(e.target.value)}
                className={inputCls}
              />
            ) : (
              <p className="text-sm font-bold text-[#151a3c] py-1">
                {fmtTime(dayStartTime)}
              </p>
            )}
          </div>

          {/* Half Day Hours */}
          <div className="space-y-1.5">
            <label className={labelCls}>Half Day — Hours After Day Start</label>
            <p className="text-[11px] text-[#6c7e96] font-medium">
              Return within this many hours of day start → charged as half day
            </p>
            {editingDayTiming ? (
              <div className="relative">
                <input
                  type="number"
                  min="0.5"
                  max="23"
                  step="0.5"
                  value={halfDayHours}
                  onChange={e => setHalfDayHours(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. 6"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6c7e96] text-xs font-bold pointer-events-none">
                  hrs
                </span>
              </div>
            ) : (
              <p className="text-sm font-bold text-[#151a3c] py-1">
                {halfDayHoursOrig} hours
              </p>
            )}
          </div>
        </div>

        {/* How-it-works  summary pills — always visible */}
        <div className="mt-6 bg-[#F8F9FF] border border-[#d1d0eb]/50 rounded-2xl px-5 py-4 space-y-3">
          <p className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest">How billing days are counted</p>
          <div className="flex flex-wrap gap-2.5">
            <div className="flex items-center space-x-2 bg-white border border-[#d1d0eb] rounded-xl px-3 py-1.5 text-xs font-medium text-[#151a3c]">
              <div className="w-2 h-2 rounded-full bg-[#6360DF] shrink-0" />
              <span>Full day = {fmtTime(dayStartTimeOrig)} → {fmtTime(dayStartTimeOrig)} (next day)</span>
            </div>
            <div className="flex items-center space-x-2 bg-white border border-[#d1d0eb] rounded-xl px-3 py-1.5 text-xs font-medium text-[#151a3c]">
              <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span>Half day = return by {halfDayCutoffDisplay} (within {halfDayHoursOrig}h of day start)</span>
            </div>
            <div className="flex items-center space-x-2 bg-white border border-[#d1d0eb] rounded-xl px-3 py-1.5 text-xs font-medium text-[#151a3c]">
              <div className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
              <span>Return after {halfDayCutoffDisplay} = full extra day charged</span>
            </div>
          </div>
          <p className="text-[11px] text-[#6c7e96] font-medium">
            Example: pickup 19 Mar 1:30 PM → drop 22 Mar 1:30 PM, day start {fmtTime(dayStartTimeOrig)} →{' '}
            <span className="font-bold text-[#151a3c]">4 billing days</span>
            {' '}(day 4 = 9AM–1:30PM exceeds {halfDayHoursOrig}h → full day)
          </p>
        </div>
      </Section>
    </div>
  );
};

export default Settingspage;