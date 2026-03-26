import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar, Plus, Eye, Car as CarIcon,
  ArrowLeft, Edit, Trash2, Bell, Loader2,
  X, Check, DollarSign, Ban, Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase, getCurrentUser } from '../supabaseClient';
import AddNewVehicle from './AddNewVehicle';
import VehicleProfile from './VehicleProfile';

interface VehicleDetail {
  id: string;
  plate: string;
  status: 'In use' | 'Available' | 'Maintenance';
  booking?: { customer: string; duration: string };
}

interface FleetRow {
  id: string;
  name: string;
  transmission: string;
  fuel: string;
  rate: string;
  rateValue: number;
  availability: string;
  mfgYear: string;
  color: string;
  type: string;
  modelId: string;
}

interface GroupedFleet { [category: string]: FleetRow[] }

interface TariffEntry {
  id: string;
  from: string;
  to: string;
  rate: string;
  deposit: string;
  notes: string;
  isNew?: boolean;
}

interface PeriodSlot {
  slotIndex: number;
  from: string;
  to: string;
  rate: string;
  deposit: string;
}

interface BulkModelRow {
  modelId: string;
  name: string;
  transmission: string;
  fuel: string;
  periods: PeriodSlot[];
  existingIds: string[];
  overrideSlot: number | null;
}

// ── Utility: check if two date ranges overlap ─────────────────
const rangesOverlap = (from1: string, to1: string, from2: string, to2: string): boolean => {
  if (!from1 && !from2) return false;
  const end1   = to1   || '9999-12-31';
  const end2   = to2   || '9999-12-31';
  const start1 = from1 || '0000-01-01';
  const start2 = from2 || '0000-01-01';
  return start1 <= end2 && end1 >= start2;
};

// Check if any two filled entries in a list have overlapping date ranges
const entriesHaveOverlap = (entries: TariffEntry[]): boolean => {
  const filled = entries.filter(e => e.rate.trim() !== '');
  if (filled.length < 2) return false;
  for (let i = 0; i < filled.length; i++) {
    for (let j = i + 1; j < filled.length; j++) {
      if (rangesOverlap(filled[i].from, filled[i].to, filled[j].from, filled[j].to)) return true;
    }
  }
  return false;
};

const modelHasOverlappingPeriods = (row: BulkModelRow): boolean => {
  const filled = row.periods.filter(p => p.rate.trim() !== '');
  if (filled.length < 2) return false;
  for (let i = 0; i < filled.length; i++) {
    for (let j = i + 1; j < filled.length; j++) {
      if (rangesOverlap(filled[i].from, filled[i].to, filled[j].from, filled[j].to)) return true;
    }
  }
  return false;
};

// ── Utility: resolve active tariff for a model on a given date ─
export const resolveActiveTariff = (
  tariffs: any[], modelId: string, forDate: string
): { rate: number | null; deposit: number | null } => {
  const mt = tariffs.filter(t => t.model_id === modelId);
  if (mt.length === 0) return { rate: null, deposit: null };

  const overrideMatch = mt.find(t =>
    t.is_override &&
    (!t.effective_from || forDate >= t.effective_from) &&
    (!t.effective_to   || forDate <= t.effective_to)
  );
  if (overrideMatch) return { rate: overrideMatch.rate_per_day, deposit: overrideMatch.security_deposit ?? 0 };

  const dateMatch = mt.find(t =>
    (!t.effective_from || forDate >= t.effective_from) &&
    (!t.effective_to   || forDate <= t.effective_to)
  );
  if (dateMatch) return { rate: dateMatch.rate_per_day, deposit: dateMatch.security_deposit ?? 0 };

  const fallback = mt[mt.length - 1];
  return { rate: fallback.rate_per_day, deposit: fallback.security_deposit ?? 0 };
};

// ── Shared: override section UI ───────────────────────────────
const OverrideSection: React.FC<{
  entries: TariffEntry[];
  modelName: string;
  overrideEntryId: string | null;
  onSelect: (id: string) => void;
}> = ({ entries, modelName, overrideEntryId, onSelect }) => {
  const filledEntries = entries.filter(e => e.rate.trim() !== '');
  if (!entriesHaveOverlap(entries)) return null;

  return (
    <div className="border-t border-amber-200 px-8 py-5 shrink-0 bg-amber-50/60">
      <div className="flex items-center space-x-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
        <p className="text-[10px] font-bold text-amber-800 tracking-widest uppercase">
          Overlapping Periods — Select Active Tariff
        </p>
      </div>
      <p className="text-[11px] text-amber-700/80 font-medium mb-4 ml-4">
        Some date ranges overlap. Select which period should be the active tariff.
      </p>
      <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm">
        <div className="flex items-center space-x-2 mb-3">
          <CarIcon size={12} className="text-[#6360DF] opacity-60" />
          <span className="text-xs font-extrabold text-[#151a3c]">{modelName}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {filledEntries.map(e => {
            const isSelected = overrideEntryId === e.id;
            const fromLabel = e.from
              ? new Date(e.from + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
              : '∞';
            const toLabel = e.to
              ? new Date(e.to + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
              : '∞';
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => onSelect(e.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  isSelected
                    ? 'bg-[#6360DF] text-white border-[#6360DF] shadow-sm'
                    : 'bg-white text-[#6c7e96] border-[#d1d0eb] hover:border-[#6360DF] hover:text-[#6360DF]'
                }`}>
                <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isSelected ? 'border-white' : 'border-[#d1d0eb]'
                }`}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span>{fromLabel} → {toLabel} · ₹{Number(e.rate).toLocaleString('en-IN')}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── TariffPopup ───────────────────────────────────────────────
const TariffPopup: React.FC<{
  ownerId: string;
  allModels: { modelId: string; name: string; transmission: string; fuel: string }[];
  onClose: () => void;
  onSaved: () => void;
  singleModel?: { modelId: string; name: string };
  vehicleNo?: string;
}> = ({ ownerId, allModels, onClose, onSaved, singleModel, vehicleNo }) => {
  const isSingle = !!singleModel;
  const today = new Date().toISOString().split('T')[0];

  // ── Single-model state ──
  const [entries,         setEntries]         = useState<TariffEntry[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [overrideEntryId, setOverrideEntryId] = useState<string | null>(null);

  // ── Bulk-model state ──
  const [bulkRows,     setBulkRows]     = useState<BulkModelRow[]>([]);
  const [periodCount,  setPeriodCount]  = useState(1);
  const [bulkLoading,  setBulkLoading]  = useState(true);
  const [bulkSaving,   setBulkSaving]   = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Global fill row state (NEW) ──────────────────────────────
  // One row of inputs that, when typed into, fills ALL model rows for that slot
  const [globalFill, setGlobalFill] = useState<{
    from: string; to: string; rate: string; deposit: string;
  }>({ from: '', to: '', rate: '', deposit: '' });

  const newBlankEntry = (): TariffEntry => ({
    id: '__new__' + Date.now() + Math.random(),
    from: today, to: '', rate: '', deposit: '', notes: '', isNew: true,
  });

  // ── Load single model ──
  useEffect(() => {
    if (!isSingle) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('tariffs')
        .select('id, effective_from, effective_to, rate_per_day, security_deposit, notes, is_override')
        .eq('owner_id', ownerId)
        .eq('model_id', singleModel!.modelId)
        .order('effective_from', { ascending: true });

      const mapped: TariffEntry[] = ((data as any[]) || []).map((t: any) => ({
        id:      t.id,
        from:    t.effective_from || today,
        to:      t.effective_to   || '',
        rate:    t.rate_per_day?.toString()     || '',
        deposit: t.security_deposit?.toString() || '',
        notes:   t.notes || '',
        isNew:   false,
      }));

      setEntries(mapped.length > 0 ? mapped : [newBlankEntry()]);

      const overrideRow = ((data as any[]) || []).find((t: any) => t.is_override);
      setOverrideEntryId(overrideRow ? overrideRow.id : null);

      setLoading(false);
    };
    load();
  }, [ownerId, singleModel]);

  // ── Load bulk ──
  useEffect(() => {
    if (isSingle) return;
    const load = async () => {
      setBulkLoading(true);
      const modelIds = allModels.map(m => m.modelId);
      let existingByModel: Record<string, any[]> = {};
      if (modelIds.length > 0) {
        const { data } = await supabase
          .from('tariffs')
          .select('id, model_id, rate_per_day, security_deposit, effective_from, effective_to, is_override')
          .eq('owner_id', ownerId)
          .in('model_id', modelIds)
          .order('created_at', { ascending: true });
        ((data as any[]) || []).forEach((t: any) => {
          if (!existingByModel[t.model_id]) existingByModel[t.model_id] = [];
          existingByModel[t.model_id].push(t);
        });
      }
      const maxPeriods = Math.max(1, ...Object.values(existingByModel).map(arr => arr.length));
      setPeriodCount(maxPeriods);
      const rows: BulkModelRow[] = allModels.map(m => {
        const dbRows = existingByModel[m.modelId] || [];
        const periods: PeriodSlot[] = Array.from({ length: maxPeriods }, (_, i) => {
          const t = dbRows[i];
          return { slotIndex: i, from: t?.effective_from || '', to: t?.effective_to || '',
            rate: t?.rate_per_day?.toString() || '', deposit: t?.security_deposit?.toString() || '' };
        });
        const overrideIdx = dbRows.findIndex((t: any) => t.is_override);
        return { modelId: m.modelId, name: m.name, transmission: m.transmission || '',
          fuel: m.fuel || '', periods, existingIds: dbRows.map((t: any) => t.id),
          overrideSlot: overrideIdx >= 0 ? overrideIdx : null };
      });
      setBulkRows(rows);
      // Reset fill row when data loads fresh
      setGlobalFill({ from: '', to: '', rate: '', deposit: '' });
      setBulkLoading(false);
    };
    load();
  }, [ownerId, allModels]);

  // ── Single-model entry helpers ──
  const updateEntry = (id: string, field: keyof TariffEntry, value: any) =>
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));

  const addEntry = () => setEntries(prev => [...prev, newBlankEntry()]);

  const removeEntry = (id: string) => {
    setEntries(prev => prev.length > 1 ? prev.filter(e => e.id !== id) : prev);
    setOverrideEntryId(prev => prev === id ? null : prev);
  };

  // ── Save single model ──
  const handleSaveSingle = async () => {
    const filled = entries.filter(e => e.rate.trim() !== '');
    if (filled.length === 0) { toast.error('Enter a rate for at least one tariff.'); return; }

    if (entriesHaveOverlap(entries) && !overrideEntryId) {
      toast.error('Date ranges overlap — please select which period should be the active tariff.');
      return;
    }

    setSaving(true);
    try {
      const keepIds = entries.filter(e => !e.isNew).map(e => e.id);
      const { data: dbRows } = await supabase
        .from('tariffs').select('id')
        .eq('owner_id', ownerId).eq('model_id', singleModel!.modelId);
      for (const dbRow of (dbRows as any[]) || []) {
        if (!keepIds.includes(dbRow.id)) {
          await supabase.from('tariffs').delete().eq('id', dbRow.id);
        }
      }

      for (const entry of filled) {
        const fromDate   = entry.from || today;
        const isOverride = overrideEntryId === entry.id;
        const payload = {
          rate_per_day:      parseFloat(entry.rate),
          base_rate_per_day: parseFloat(entry.rate),
          security_deposit:  entry.deposit ? parseFloat(entry.deposit) : 0,
          valid_from:        fromDate,
          valid_to:          entry.to || null,
          effective_from:    fromDate,
          effective_to:      entry.to || null,
          notes:             entry.notes || null,
          is_override:       isOverride,
        };

        if (entry.isNew) {
          const { error } = await supabase.from('tariffs').insert({
            owner_id: ownerId, model_id: singleModel!.modelId, ...payload,
          });
          if (error) { toast.error('Failed to save: ' + error.message); return; }
        } else {
          const { error } = await supabase.from('tariffs').update(payload).eq('id', entry.id);
          if (error) { toast.error('Failed to update: ' + error.message); return; }
        }
      }

      const baseEntry = filled.find(e => e.id === overrideEntryId) || filled[0];
      await supabase.from('models')
        .update({ base_rate_per_day: parseFloat(baseEntry.rate) })
        .eq('id', singleModel!.modelId);

      toast.success('Tariff saved!');
      onSaved(); onClose();
    } finally { setSaving(false); }
  };

  // ── Bulk helpers ──
  const updateBulkPeriod = (modelId: string, slotIndex: number, field: keyof Omit<PeriodSlot, 'slotIndex'>, value: string) =>
    setBulkRows(prev => prev.map(row => row.modelId !== modelId ? row : {
      ...row, periods: row.periods.map(p => p.slotIndex === slotIndex ? { ...p, [field]: value } : p),
    }));

  const addPeriodSlot = () => {
    const newSlot = periodCount;
    setPeriodCount(prev => prev + 1);
    setBulkRows(prev => prev.map(row => ({
      ...row, periods: [...row.periods, { slotIndex: newSlot, from: '', to: '', rate: '', deposit: '' }],
    })));
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth; }, 100);
  };

  const setOverride = (modelId: string, slotIndex: number) =>
    setBulkRows(prev => prev.map(row => row.modelId === modelId ? { ...row, overrideSlot: slotIndex } : row));

  const modelsWithOverlap = bulkRows.filter(modelHasOverlappingPeriods);

  // ── Save bulk ──
  const handleSaveBulk = async () => {
    const rowsWithData = bulkRows.filter(row => row.periods.some(p => p.rate.trim() !== ''));
    if (rowsWithData.length === 0) { toast.error('Enter a rate for at least one model.'); return; }
    for (const row of rowsWithData) {
      if (modelHasOverlappingPeriods(row) && row.overrideSlot === null) {
        toast.error(`${row.name} has overlapping date ranges. Select which period to use as active.`);
        return;
      }
    }
    setBulkSaving(true);
    try {
      for (const row of rowsWithData) {
        await supabase.from('tariffs').delete().eq('owner_id', ownerId).eq('model_id', row.modelId);
        const filledPeriods = row.periods.filter(p => p.rate.trim() !== '');
        for (const p of filledPeriods) {
          const isOverride = row.overrideSlot !== null && row.overrideSlot === p.slotIndex;
          const fromDate   = p.from || today;
          const { error } = await supabase.from('tariffs').insert({
            owner_id: ownerId, model_id: row.modelId,
            rate_per_day: parseFloat(p.rate), base_rate_per_day: parseFloat(p.rate),
            security_deposit: p.deposit ? parseFloat(p.deposit) : 0,
            valid_from: fromDate, valid_to: p.to || null,
            effective_from: fromDate, effective_to: p.to || null,
            is_override: isOverride,
          });
          if (error) { toast.error(`Failed for ${row.name}: ${error.message}`); continue; }
        }
        const baseP = filledPeriods.find(p => p.slotIndex === row.overrideSlot) || filledPeriods[0];
        if (baseP) await supabase.from('models').update({ base_rate_per_day: parseFloat(baseP.rate) }).eq('id', row.modelId);
      }
      toast.success('Tariffs saved successfully!');
      onSaved(); onClose();
    } finally { setBulkSaving(false); }
  };

  const inputCls = "w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-2 px-3 text-xs font-medium text-[#151a3c] outline-none focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10 transition-all";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#151a3c]/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl z-10 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-[#d1d0eb]/30 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#EEEDFA] rounded-xl flex items-center justify-center text-[#6360DF] shrink-0">
              <DollarSign size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#151a3c]">
                {isSingle ? 'Tariff' : 'Set Tariffs — All Models'}
              </h3>
              {isSingle ? (
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-xs font-bold text-[#6360DF]">{singleModel!.name}</span>
                  {vehicleNo && (
                    <><span className="text-[#d1d0eb]">·</span>
                    <span className="text-xs font-medium text-[#6c7e96]">{vehicleNo}</span></>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#6c7e96] font-medium mt-0.5">
                  Click <span className="text-[#6360DF] font-bold">✎</span> to edit a row ·
                  Click <span className="text-[#6360DF] font-bold">+</span> to add a new period for all models
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-[#6c7e96] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── SINGLE MODEL VIEW ── */}
        {isSingle && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-[#6c7e96]">
                <Loader2 size={20} className="animate-spin mr-2" />
                <span className="text-sm font-medium">Loading tariffs...</span>
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div
                  className="grid shrink-0 px-8 py-2.5 text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase bg-[#F9F9FF] border-b border-[#d1d0eb]/20"
                  style={{ gridTemplateColumns: '1.5fr 1.5fr 1.3fr 1.3fr 1.5fr auto' }}>
                  <div>From</div>
                  <div>To</div>
                  <div>Rate / Day (₹)</div>
                  <div>Deposit (₹)</div>
                  <div>Notes</div>
                  <div className="w-8" />
                </div>

                {/* Scrollable entries */}
                <div className="overflow-y-auto flex-1 divide-y divide-[#d1d0eb]/15 px-8">
                  <AnimatePresence initial={false}>
                    {entries.map(entry => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="grid items-center py-3 gap-x-2"
                        style={{ gridTemplateColumns: '1.5fr 1.5fr 1.3fr 1.3fr 1.5fr auto' }}
                      >
                        <div>
                          <input type="date" value={entry.from}
                            onChange={e => updateEntry(entry.id, 'from', e.target.value)}
                            className={inputCls} />
                        </div>
                        <div>
                          <input type="date" value={entry.to} min={entry.from}
                            onChange={e => updateEntry(entry.id, 'to', e.target.value)}
                            className={inputCls} />
                        </div>
                        <div>
                          <input type="number" value={entry.rate}
                            onChange={e => updateEntry(entry.id, 'rate', e.target.value)}
                            placeholder="2500" min="0"
                            className={inputCls + ' font-bold'} />
                        </div>
                        <div>
                          <input type="number" value={entry.deposit}
                            onChange={e => updateEntry(entry.id, 'deposit', e.target.value)}
                            placeholder="5000" min="0"
                            className={inputCls + ' font-bold'} />
                        </div>
                        <div>
                          <input type="text" value={entry.notes}
                            onChange={e => updateEntry(entry.id, 'notes', e.target.value)}
                            placeholder="Note..."
                            className={inputCls} />
                        </div>
                        <div className="w-8 flex justify-center">
                          <button onClick={() => removeEntry(entry.id)}
                            className="p-1 text-[#cbd5e1] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Add row button */}
                <div className="px-8 pt-3 pb-1 shrink-0">
                  <button onClick={addEntry}
                    className="flex items-center space-x-2 text-[#6360DF] hover:bg-[#EEEDFA] px-4 py-2 rounded-xl text-xs font-bold transition-all border border-dashed border-[#6360DF]/40 w-full justify-center">
                    <Plus size={13} /><span>Add Another Tariff Period</span>
                  </button>
                </div>
              </>
            )}

            {/* Override section */}
            {!loading && (
              <OverrideSection
                entries={entries}
                modelName={singleModel!.name}
                overrideEntryId={overrideEntryId}
                onSelect={setOverrideEntryId}
              />
            )}

            {/* Footer */}
            <div className="px-8 py-5 border-t border-[#d1d0eb]/30 flex space-x-3 shrink-0">
              <button onClick={onClose}
                className="flex-1 border border-[#d1d0eb] text-[#6c7e96] font-bold py-3 rounded-xl hover:bg-slate-50 text-sm transition-all">
                Cancel
              </button>
              <button onClick={handleSaveSingle} disabled={saving || loading}
                className="flex-1 bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-[#6360df22] transition-all flex items-center justify-center space-x-2 disabled:opacity-60">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                <span>{saving ? 'Saving...' : 'Save Tariff'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── BULK MODEL VIEW ── */}
        {!isSingle && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {bulkLoading ? (
              <div className="flex items-center justify-center py-16 text-[#6c7e96]">
                <Loader2 size={20} className="animate-spin mr-2" />
                <span className="text-sm font-medium">Loading...</span>
              </div>
            ) : bulkRows.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#6c7e96] font-medium">
                No vehicle models found. Add vehicles first.
              </div>
            ) : (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div ref={scrollRef} className="overflow-x-auto overflow-y-auto flex-1">
                  <table className="min-w-full border-collapse">
                    <thead>
                      {/* ── Column header row (unchanged) ── */}
                      <tr className="bg-[#F9F9FF] border-b border-[#d1d0eb]/30">
                        <th className="sticky left-0 z-10 bg-[#F9F9FF] text-left px-6 py-3.5 text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase whitespace-nowrap min-w-[190px]">Vehicle</th>
                        <th className="text-left px-4 py-3.5 text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase whitespace-nowrap min-w-[90px]">Trans.</th>
                        <th className="text-left px-4 py-3.5 text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase whitespace-nowrap min-w-[80px] border-r-2 border-[#c7c6f0]">Fuel</th>
                        {Array.from({ length: periodCount }, (_, slotIdx) => (
                          <React.Fragment key={`ph-${slotIdx}`}>
                            <th className="text-left px-3 py-3.5 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap min-w-[128px]">
                              <span className="text-[#6360DF]/80">{slotIdx === 0 ? 'FROM' : `FROM ${slotIdx + 1}`}</span>
                            </th>
                            <th className="text-left px-3 py-3.5 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap min-w-[128px]">
                              <span className="text-[#6360DF]/80">{slotIdx === 0 ? 'TO' : `TO ${slotIdx + 1}`}</span>
                            </th>
                            <th className="text-left px-3 py-3.5 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap min-w-[108px]">
                              <span className="text-[#6360DF]/80">{slotIdx === 0 ? 'RATE/DAY' : `RATE ${slotIdx + 1}`}</span>
                            </th>
                            <th className={`text-left px-3 py-3.5 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap min-w-[108px] ${slotIdx < periodCount - 1 ? 'border-r-2 border-[#6360DF]/25' : ''}`}>
                              <span className="text-[#6360DF]/80">{slotIdx === 0 ? 'DEPOSIT' : `DEPOSIT ${slotIdx + 1}`}</span>
                            </th>
                          </React.Fragment>
                        ))}
                        <th className="text-left px-4 py-3.5 text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase whitespace-nowrap min-w-[52px]">Edit</th>
                        <th className="px-4 py-3.5 whitespace-nowrap min-w-[48px]">
                          <button onClick={addPeriodSlot} title="Add new tariff period for all models"
                            className="w-7 h-7 rounded-lg bg-[#6360DF] hover:bg-[#5451d0] text-white flex items-center justify-center transition-all shadow-sm active:scale-95">
                            <Plus size={14} />
                          </button>
                        </th>
                      </tr>

                      {/* ── Global fill row (NEW) ─────────────────────────────────
                          Type a value here to instantly fill ALL model rows for
                          that period slot. Per-row editing still works independently. */}
                      <tr className="bg-[#EEEDFA]/60 border-b border-[#d1d0eb]/30">
                        {/* "Fill All" label cell — sticky to match Vehicle column */}
                        <td className="sticky left-0 z-10 bg-[#EEEDFA]/60 px-6 py-2.5 whitespace-nowrap min-w-[190px]">
                          <span className="text-[10px] font-extrabold text-[#6360DF] tracking-widest uppercase">Fill All</span>
                        </td>
                        {/* Trans. and Fuel cells — empty spacers */}
                        <td className="px-4 py-2.5 min-w-[90px]" />
                        <td className="px-4 py-2.5 min-w-[80px] border-r-2 border-[#c7c6f0]" />
                        {/* One set of From/To/Rate/Deposit inputs per period slot */}
                        {Array.from({ length: periodCount }, (_, slotIdx) => (
                          <React.Fragment key={`gf-${slotIdx}`}>
                            {/* From */}
                            <td className="px-3 py-2.5 whitespace-nowrap min-w-[128px]">
                              <input
                                type="date"
                                value={globalFill.from}
                                onChange={e => {
                                  const val = e.target.value;
                                  setGlobalFill(prev => ({ ...prev, from: val }));
                                  setBulkRows(prev => prev.map(row => ({
                                    ...row,
                                    periods: row.periods.map(p =>
                                      p.slotIndex === slotIdx ? { ...p, from: val } : p
                                    ),
                                  })));
                                }}
                                className="w-full bg-white border border-[#6360DF]/40 rounded-xl py-1.5 px-3 text-xs font-medium text-[#151a3c] outline-none focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10 min-w-[116px]"
                              />
                            </td>
                            {/* To */}
                            <td className="px-3 py-2.5 whitespace-nowrap min-w-[128px]">
                              <input
                                type="date"
                                value={globalFill.to}
                                min={globalFill.from}
                                onChange={e => {
                                  const val = e.target.value;
                                  setGlobalFill(prev => ({ ...prev, to: val }));
                                  setBulkRows(prev => prev.map(row => ({
                                    ...row,
                                    periods: row.periods.map(p =>
                                      p.slotIndex === slotIdx ? { ...p, to: val } : p
                                    ),
                                  })));
                                }}
                                className="w-full bg-white border border-[#6360DF]/40 rounded-xl py-1.5 px-3 text-xs font-medium text-[#151a3c] outline-none focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10 min-w-[116px]"
                              />
                            </td>
                            {/* Rate */}
                            <td className="px-3 py-2.5 whitespace-nowrap min-w-[108px]">
                              <input
                                type="number"
                                value={globalFill.rate}
                                min="0"
                                placeholder="₹ all"
                                onChange={e => {
                                  const val = e.target.value;
                                  setGlobalFill(prev => ({ ...prev, rate: val }));
                                  setBulkRows(prev => prev.map(row => ({
                                    ...row,
                                    periods: row.periods.map(p =>
                                      p.slotIndex === slotIdx ? { ...p, rate: val } : p
                                    ),
                                  })));
                                }}
                                className="w-full bg-white border border-[#6360DF]/40 rounded-xl py-1.5 px-3 text-xs font-bold text-[#151a3c] outline-none focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10 min-w-[88px]"
                              />
                            </td>
                            {/* Deposit */}
                            <td className={`px-3 py-2.5 whitespace-nowrap min-w-[108px] ${slotIdx < periodCount - 1 ? 'border-r-2 border-[#6360DF]/25' : ''}`}>
                              <input
                                type="number"
                                value={globalFill.deposit}
                                min="0"
                                placeholder="₹ all"
                                onChange={e => {
                                  const val = e.target.value;
                                  setGlobalFill(prev => ({ ...prev, deposit: val }));
                                  setBulkRows(prev => prev.map(row => ({
                                    ...row,
                                    periods: row.periods.map(p =>
                                      p.slotIndex === slotIdx ? { ...p, deposit: val } : p
                                    ),
                                  })));
                                }}
                                className="w-full bg-white border border-[#6360DF]/40 rounded-xl py-1.5 px-3 text-xs font-bold text-[#151a3c] outline-none focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10 min-w-[88px]"
                              />
                            </td>
                          </React.Fragment>
                        ))}
                        {/* Edit and + column spacers */}
                        <td className="px-4 py-2.5 min-w-[52px]" />
                        <td className="px-4 py-2.5 min-w-[48px]" />
                      </tr>
                      {/* ── End global fill row ── */}
                    </thead>

                    <tbody className="divide-y divide-[#d1d0eb]/15">
                      {bulkRows.map(row => {
                        const isEditing = editingRowId === row.modelId;
                        return (
                          <tr key={row.modelId} className="transition-colors" style={{ background: isEditing ? '#F5F4FF' : 'white' }}>
                            <td className="sticky left-0 z-10 px-6 py-4 whitespace-nowrap" style={{ background: isEditing ? '#F5F4FF' : 'white' }}>
                              <div className="flex items-center space-x-2">
                                <CarIcon size={13} className="text-[#6360DF] shrink-0 opacity-50" />
                                <span className="text-sm font-bold text-[#151a3c] truncate max-w-[155px]">{row.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="text-xs font-medium text-[#6c7e96]">{row.transmission || '—'}</span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap border-r-2 border-[#c7c6f0]">
                              <span className="text-xs font-medium text-[#6c7e96]">{row.fuel || '—'}</span>
                            </td>
                            {row.periods.map(period => (
                              <React.Fragment key={`${row.modelId}-s${period.slotIndex}`}>
                                <td className="px-3 py-4 whitespace-nowrap">
                                  {isEditing ? (
                                    <input type="date" value={period.from}
                                      onChange={e => updateBulkPeriod(row.modelId, period.slotIndex, 'from', e.target.value)}
                                      className="w-full bg-white border border-[#d1d0eb] rounded-xl py-2 px-3 text-xs font-medium text-[#151a3c] outline-none focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10 min-w-[116px]" />
                                  ) : (
                                    <span className="text-xs font-medium text-[#151a3c]">
                                      {period.from ? new Date(period.from + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap">
                                  {isEditing ? (
                                    <input type="date" value={period.to} min={period.from}
                                      onChange={e => updateBulkPeriod(row.modelId, period.slotIndex, 'to', e.target.value)}
                                      className="w-full bg-white border border-[#d1d0eb] rounded-xl py-2 px-3 text-xs font-medium text-[#151a3c] outline-none focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10 min-w-[116px]" />
                                  ) : (
                                    <span className="text-xs font-medium text-[#151a3c]">
                                      {period.to ? new Date(period.to + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-4 whitespace-nowrap">
                                  {isEditing ? (
                                    <input type="number" value={period.rate} min="0" placeholder="₹ 0"
                                      onChange={e => updateBulkPeriod(row.modelId, period.slotIndex, 'rate', e.target.value)}
                                      className="w-full bg-white border border-[#d1d0eb] rounded-xl py-2 px-3 text-xs font-bold text-[#151a3c] outline-none focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10 min-w-[88px]" />
                                  ) : (
                                    <span className="text-sm font-extrabold text-[#151a3c]">
                                      {period.rate ? `₹${Number(period.rate).toLocaleString('en-IN')}` : '—'}
                                    </span>
                                  )}
                                </td>
                                <td className={`px-3 py-4 whitespace-nowrap ${period.slotIndex < periodCount - 1 ? 'border-r-2 border-[#6360DF]/25' : ''}`}>
                                  {isEditing ? (
                                    <input type="number" value={period.deposit} min="0" placeholder="₹ 0"
                                      onChange={e => updateBulkPeriod(row.modelId, period.slotIndex, 'deposit', e.target.value)}
                                      className="w-full bg-white border border-[#d1d0eb] rounded-xl py-2 px-3 text-xs font-bold text-[#151a3c] outline-none focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10 min-w-[88px]" />
                                  ) : (
                                    <span className="text-sm font-extrabold text-[#151a3c]">
                                      {period.deposit ? `₹${Number(period.deposit).toLocaleString('en-IN')}` : '—'}
                                    </span>
                                  )}
                                </td>
                              </React.Fragment>
                            ))}
                            <td className="px-4 py-4 whitespace-nowrap">
                              <button onClick={() => setEditingRowId(isEditing ? null : row.modelId)}
                                title={isEditing ? 'Done editing' : 'Edit this row'}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                  isEditing ? 'bg-[#6360DF] text-white shadow-sm' : 'bg-[#F0F0FF] text-[#6360DF] hover:bg-[#EEEDFA]'
                                }`}>
                                {isEditing ? <Check size={14} /> : <Pencil size={13} />}
                              </button>
                            </td>
                            <td className="px-4 py-4" />
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bulk override section */}
                {modelsWithOverlap.length > 0 && (
                  <div className="border-t border-amber-200 px-8 py-5 shrink-0 max-h-52 overflow-y-auto bg-amber-50/60">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <p className="text-[10px] font-bold text-amber-800 tracking-widest uppercase">
                        Overlapping Periods — Select Active Tariff
                      </p>
                    </div>
                    <p className="text-[11px] text-amber-700/80 font-medium mb-4 ml-4">
                      These models have date ranges that overlap. Select which period is the active tariff.
                    </p>
                    <div className="space-y-3">
                      {modelsWithOverlap.map(row => {
                        const filledPeriods = row.periods.filter(p => p.rate.trim() !== '');
                        return (
                          <div key={`ov-${row.modelId}`} className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm">
                            <div className="flex items-center space-x-2 mb-3">
                              <CarIcon size={12} className="text-[#6360DF] opacity-60" />
                              <span className="text-xs font-extrabold text-[#151a3c]">{row.name}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {filledPeriods.map(p => {
                                const isSelected = row.overrideSlot === p.slotIndex;
                                const fromLabel = p.from ? new Date(p.from + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '∞';
                                const toLabel   = p.to   ? new Date(p.to   + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '∞';
                                return (
                                  <button key={`ov-btn-${row.modelId}-${p.slotIndex}`} type="button"
                                    onClick={() => setOverride(row.modelId, p.slotIndex)}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                      isSelected
                                        ? 'bg-[#6360DF] text-white border-[#6360DF] shadow-sm'
                                        : 'bg-white text-[#6c7e96] border-[#d1d0eb] hover:border-[#6360DF] hover:text-[#6360DF]'
                                    }`}>
                                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-white' : 'border-[#d1d0eb]'}`}>
                                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span>{fromLabel} → {toLabel} · ₹{Number(p.rate).toLocaleString('en-IN')}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="px-8 py-5 border-t border-[#d1d0eb]/30 flex space-x-3 shrink-0">
                  <button onClick={onClose} className="flex-1 border border-[#d1d0eb] text-[#6c7e96] font-bold py-3.5 rounded-xl hover:bg-slate-50 text-sm transition-all">Cancel</button>
                  <button onClick={handleSaveBulk} disabled={bulkSaving || bulkLoading}
                    className="flex-1 bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-[#6360df22] transition-all flex items-center justify-center space-x-2 disabled:opacity-60">
                    {bulkSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    <span>{bulkSaving ? 'Saving...' : 'Save All'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ── BlackoutPopup (UNCHANGED) ─────────────────────────────────
const BlackoutPopup: React.FC<{
  vehicleId: string; plate: string; ownerId: string;
  onClose: () => void; onSaved: () => void;
}> = ({ vehicleId, plate, ownerId, onClose, onSaved }) => {
  const today = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate,   setToDate]   = useState(today);
  const [type,     setType]     = useState('maintenance');
  const [notes,    setNotes]    = useState('');
  const [autoRestore, setAutoRestore] = useState(true);
  const [saving, setSaving] = useState(false);
  const blackoutTypes = [
    { value: 'maintenance', label: 'Maintenance' }, { value: 'accident', label: 'Accident' },
    { value: 'servicing',   label: 'Servicing'   }, { value: 'others',   label: 'Others'   },
  ];
  const handleSave = async () => {
    if (!fromDate || !toDate) { toast.error('Please select both from and to dates.'); return; }
    if (toDate < fromDate) { toast.error('To date must be after from date.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('blackouts').insert({
        owner_id: ownerId, vehicle_id: vehicleId, from_date: fromDate, to_date: toDate,
        type, notes: notes || null, auto_restore: autoRestore,
      });
      if (error) { toast.error('Failed to save blackout: ' + error.message); return; }
      if (fromDate <= today && toDate >= today)
        await supabase.from('vehicles').update({ status: 'maintenance' }).eq('id', vehicleId);
      toast.success(`Blackout set for ${plate} from ${fromDate} to ${toDate}`);
      onSaved(); onClose();
    } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#151a3c]/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500"><Ban size={18} /></div>
            <div><h3 className="text-lg font-extrabold text-[#151a3c]">Blackout</h3><p className="text-xs text-[#6c7e96] font-medium">{plate}</p></div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-[#6c7e96]"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">From <span className="text-red-500">*</span></label>
              <input type="date" value={fromDate} min={today} onChange={e => setFromDate(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-3 text-sm font-medium text-[#151a3c] outline-none focus:border-red-400" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">To <span className="text-red-500">*</span></label>
              <input type="date" value={toDate} min={fromDate} onChange={e => setToDate(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-3 text-sm font-medium text-[#151a3c] outline-none focus:border-red-400" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Type of Blackout</label>
            <div className="grid grid-cols-2 gap-2">
              {blackoutTypes.map(bt => (
                <button key={bt.value} type="button" onClick={() => setType(bt.value)}
                  className={`py-2.5 px-4 rounded-xl text-sm font-bold border transition-all ${type === bt.value ? 'bg-red-50 border-red-300 text-red-600' : 'bg-[#F8F9FA] border-[#d1d0eb] text-[#6c7e96] hover:border-red-200'}`}>
                  {bt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional details..."
              className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-medium text-[#151a3c] outline-none focus:border-[#6360DF]" />
          </div>
          <div className="flex items-center justify-between bg-[#F8F9FA] rounded-2xl px-5 py-4 border border-[#d1d0eb]">
            <div>
              <p className="text-sm font-bold text-[#151a3c]">Auto-restore after blackout ends</p>
              <p className="text-[11px] text-[#6c7e96] font-medium mt-0.5">Vehicle automatically set back to Available</p>
            </div>
            <button type="button" onClick={() => setAutoRestore(p => !p)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0 ${autoRestore ? 'bg-[#6360DF]' : 'bg-slate-300'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${autoRestore ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>
        <div className="flex space-x-3 mt-7">
          <button onClick={onClose} className="flex-1 border border-[#d1d0eb] text-[#6c7e96] font-bold py-3.5 rounded-xl hover:bg-slate-50 text-sm transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-red-100 transition-all flex items-center justify-center space-x-2 disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
            <span>{saving ? 'Saving...' : 'Set Blackout'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── VehicleDetailView (UNCHANGED) ─────────────────────────────
const VehicleDetailView: React.FC<{
  vehicle: any; category: string; ownerId: string;
  onBack: () => void; onAdd: () => void;
  onPlateClick: (vehicleId: string, plate: string, status: 'In use' | 'Available' | 'Maintenance') => void;
  onFleetReload: () => void;
  allModels: { modelId: string; name: string; transmission: string; fuel: string }[];
}> = ({ vehicle, category, ownerId, onBack, onAdd, onPlateClick, onFleetReload, allModels }) => {
  const [details, setDetails] = useState<VehicleDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showTariff, setShowTariff] = useState(false);
  const [blackoutVehicle, setBlackoutVehicle] = useState<{ id: string; plate: string } | null>(null);

  const fetchVehicleInstances = async () => {
    setLoading(true);
    const authUser = await getCurrentUser();
    if (!authUser) return;
    const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', authUser.id).single();
    if (!ownerRow) return;
    const { data: vehicles, error } = await supabase
      .from('vehicles').select('id, registration_no, status')
      .eq('owner_id', ownerRow.id).eq('model_id', vehicle.modelId);
    if (error) { setLoading(false); return; }
    const vehicleList = vehicles || [];
    const vehicleIds  = vehicleList.map((v: any) => v.id);
    let activeBookingMap: Record<string, { customer: string; duration: string }> = {};
    if (vehicleIds.length > 0) {
      const { data: bookingDetails } = await supabase
        .from('booking_details')
        .select('vehicle_id, bookings(customer_name, pickup_at, drop_at, status)')
        .in('vehicle_id', vehicleIds).in('bookings.status', ['BOOKED', 'ONGOING']);
      ((bookingDetails as any[]) || []).forEach((bd: any) => {
        if (bd.bookings && ['BOOKED', 'ONGOING'].includes(bd.bookings.status)) {
          const pickupDate = new Date(bd.bookings.pickup_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          const dropDate   = new Date(bd.bookings.drop_at).toLocaleDateString('en-IN',   { day: '2-digit', month: 'short', year: 'numeric' });
          activeBookingMap[bd.vehicle_id] = { customer: bd.bookings.customer_name, duration: `${pickupDate} - ${dropDate}` };
        }
      });
    }
    setDetails(vehicleList.map((v: any) => ({
      id: v.id, plate: v.registration_no,
      status: v.status === 'available' ? 'Available' : v.status === 'rented' ? 'In use' : 'Maintenance',
      booking: activeBookingMap[v.id] || undefined,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchVehicleInstances(); }, [vehicle.modelId]);

  const totalVehicles     = details.length;
  const availableVehicles = details.filter(d => d.status === 'Available').length;

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'In use':      return 'bg-[#DBEAFE] text-[#1E40AF]';
      case 'Available':   return 'bg-[#D1FAE5] text-[#065F46]';
      case 'Maintenance': return 'bg-[#FEF3C7] text-[#92400E]';
      default:            return 'bg-gray-100 text-gray-600';
    }
  };

  const handleDelete = async (vehicleId: string) => {
    setDeletingId(vehicleId);
    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
      if (error) { toast.error('Failed to delete vehicle: ' + error.message); return; }
      toast.success('Vehicle deleted successfully.');
      setConfirmDeleteId(null);
      await fetchVehicleInstances();
      onFleetReload();
    } finally { setDeletingId(null); }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button onClick={onBack} className="flex items-center space-x-2 text-[#151a3c] hover:text-[#6360DF] transition-colors font-bold group w-fit">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-lg">Fleet Listing</span>
        </button>
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          <button onClick={onAdd}
            className="bg-[#6360DF] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-[#6360df33] hover:bg-[#5451d0] transition-all flex items-center space-x-2">
            <Plus size={16} /><span>New Vehicle</span>
          </button>
          <button onClick={() => setShowTariff(true)}
            className="bg-white border border-[#d1d0eb] text-[#6360DF] px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#EEEDFA] transition-all">
            Tariff
          </button>
        </div>
      </div>

      <div className="bg-[#6360DF] rounded-2xl p-5 text-white shadow-xl shadow-[#6360df22] overflow-x-auto">
        <div className="flex items-center space-x-6 min-w-max">
          {[
            { label: 'Category',     val: category },
            { label: 'Model',        val: vehicle.name },
            { label: 'Transmission', val: vehicle.transmission },
            { label: 'Fuel',         val: vehicle.fuel },
            { label: 'Available',    val: loading ? '...' : `${availableVehicles}/${totalVehicles}` },
          ].map((item, i, arr) => (
            <React.Fragment key={item.label}>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">{item.label}</span>
                <span className="font-bold text-sm mt-0.5">{item.val}</span>
              </div>
              {i < arr.length - 1 && <div className="w-px h-10 bg-white/20 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 px-10 py-5 text-[11px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/30 bg-[#F9F9FF]/50">
          <div className="col-span-3">Vehicle No.</div><div className="col-span-2">Status</div>
          <div className="col-span-5">Current Booking & Duration</div><div className="col-span-2 text-right">Action</div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#6c7e96]">
            <Loader2 size={24} className="animate-spin mr-2" /><span className="text-sm font-medium">Loading vehicles...</span>
          </div>
        ) : details.length === 0 ? (
          <div className="py-16 text-center text-[#6c7e96] text-sm font-medium">No vehicles added for this model yet.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {details.map(detail => (
              <div key={detail.id}>
                <div className="hidden md:grid grid-cols-12 px-10 py-5 items-center hover:bg-[#f8f9fc]/50 transition-colors">
                  <div onClick={() => onPlateClick(detail.id, detail.plate, detail.status)}
                    className="col-span-3 font-bold text-[#151a3c] text-[15px] hover:text-[#6360DF] cursor-pointer transition-colors">{detail.plate}</div>
                  <div className="col-span-2">
                    <span className={`px-4 py-1.5 rounded-full text-[11px] font-extrabold tracking-wide ${getStatusStyles(detail.status)}`}>{detail.status}</span>
                  </div>
                  <div className="col-span-5">
                    {detail.booking ? (
                      <div className="flex flex-col">
                        <span className="font-bold text-[#151a3c] text-[14px]">{detail.booking.customer}</span>
                        <span className="text-[#6c7e96] text-[12px] font-medium">{detail.booking.duration}</span>
                      </div>
                    ) : <span className="text-[#6c7e96] text-[13px] font-medium italic">No active booking</span>}
                  </div>
                  <div className="col-span-2 flex items-center justify-end space-x-2">
                    <button onClick={async (e) => {
                      e.stopPropagation();
                      const newStatus = detail.status === 'Available' ? 'maintenance' : 'available';
                      const { error } = await supabase.from('vehicles').update({ status: newStatus }).eq('id', detail.id);
                      if (error) { toast.error('Failed to update status.'); return; }
                      toast.success(`Vehicle marked ${newStatus === 'available' ? 'Active' : 'Inactive'}.`);
                      fetchVehicleInstances(); onFleetReload();
                    }} className={`relative w-10 h-5 rounded-full transition-colors duration-300 shrink-0 ${detail.status === 'Available' ? 'bg-[#6360DF]' : 'bg-slate-300'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${detail.status === 'Available' ? 'left-5' : 'left-0.5'}`} />
                    </button>
                    <span className={`text-[10px] font-extrabold tracking-widest ${detail.status === 'Available' ? 'text-[#6360DF]' : 'text-slate-400'}`}>
                      {detail.status === 'Available' ? 'Active' : 'Inactive'}
                    </span>
                    <button className="p-2 text-[#cbd5e1] hover:text-[#6360DF] transition-colors"><Edit size={15} /></button>
                    <button onClick={() => setConfirmDeleteId(detail.id)} className="p-2 text-[#cbd5e1] hover:text-red-500 transition-colors">
                      {deletingId === detail.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                    <button className="p-2 text-[#cbd5e1] hover:text-orange-500 transition-colors"><Bell size={15} /></button>
                  </div>
                </div>
                <div className="md:hidden p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => onPlateClick(detail.id, detail.plate, detail.status)}
                      className="font-extrabold text-[#151a3c] text-base hover:text-[#6360DF] transition-colors">{detail.plate}</button>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold ${getStatusStyles(detail.status)}`}>{detail.status}</span>
                  </div>
                  {detail.booking ? (
                    <div><p className="font-bold text-[#151a3c] text-sm">{detail.booking.customer}</p><p className="text-[#6c7e96] text-xs font-medium">{detail.booking.duration}</p></div>
                  ) : <p className="text-[#6c7e96] text-sm italic">No active booking</p>}
                  <div className="flex items-center space-x-3 pt-1">
                    <button onClick={async () => {
                      const newStatus = detail.status === 'Available' ? 'maintenance' : 'available';
                      await supabase.from('vehicles').update({ status: newStatus }).eq('id', detail.id);
                      fetchVehicleInstances(); onFleetReload();
                    }} className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${detail.status === 'Available' ? 'bg-[#6360DF]' : 'bg-slate-300'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${detail.status === 'Available' ? 'left-5' : 'left-0.5'}`} />
                    </button>
                    <span className="text-xs font-bold text-[#6c7e96]">{detail.status === 'Available' ? 'Active' : 'Inactive'}</span>
                    <div className="flex-1" />
                    <button className="p-2 text-[#cbd5e1] hover:text-[#6360DF]"><Edit size={15} /></button>
                    <button onClick={() => setConfirmDeleteId(detail.id)} className="p-2 text-[#cbd5e1] hover:text-red-500"><Trash2 size={15} /></button>
                    <button className="p-2 text-[#cbd5e1] hover:text-orange-500"><Bell size={15} /></button>
                  </div>
                </div>
                <AnimatePresence>
                  {confirmDeleteId === detail.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="bg-red-50 border-t border-red-100 px-5 md:px-10 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <p className="text-sm font-bold text-red-700">Delete <span className="font-extrabold">{detail.plate}</span>? This cannot be undone.</p>
                      <div className="flex items-center space-x-3">
                        <button onClick={() => setConfirmDeleteId(null)}
                          className="px-4 py-2 text-sm font-bold text-[#6c7e96] bg-white border border-[#d1d0eb] rounded-lg hover:bg-slate-50">Cancel</button>
                        <button onClick={() => handleDelete(detail.id)}
                          className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg flex items-center space-x-1.5">
                          {deletingId === detail.id && <Loader2 size={14} className="animate-spin" />}
                          <span>Yes, Delete</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showTariff && (
          <TariffPopup ownerId={ownerId} allModels={allModels}
            singleModel={{ modelId: vehicle.modelId, name: vehicle.name }}
            onClose={() => setShowTariff(false)} onSaved={() => { onFleetReload(); }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {blackoutVehicle && (
          <BlackoutPopup vehicleId={blackoutVehicle.id} plate={blackoutVehicle.plate} ownerId={ownerId}
            onClose={() => setBlackoutVehicle(null)} onSaved={() => { fetchVehicleInstances(); onFleetReload(); }} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── FleetListing (main — UNCHANGED) ──────────────────────────
const FleetListing: React.FC = () => {
  const [view, setView] = useState<'list' | 'detail' | 'add' | 'profile'>('list');
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedPlate, setSelectedPlate] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<'In use' | 'Available' | 'Maintenance'>('Available');
  const [category, setCategory] = useState<string>('');
  const [groupedFleet, setGroupedFleet] = useState<GroupedFleet>({});
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string>('');
  const [allModels, setAllModels] = useState<{ modelId: string; name: string; transmission: string; fuel: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showTariff, setShowTariff] = useState(false);

  const loadFleet = async () => {
    setLoading(true);
    const authUser = await getCurrentUser();
    if (!authUser) { setLoading(false); return; }
    const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', authUser.id).single();
    if (!ownerRow) { setLoading(false); return; }
    setOwnerId(ownerRow.id);

    const { data: tariffData } = await supabase
      .from('tariffs')
      .select('model_id, rate_per_day, security_deposit, effective_from, effective_to, is_override')
      .eq('owner_id', ownerRow.id);
    const allTariffs: any[] = (tariffData as any[]) || [];

    const tariffMap: Record<string, number> = {};
    const uniqueModelIds = [...new Set(allTariffs.map(t => t.model_id))];
    uniqueModelIds.forEach(modelId => {
      const resolved = resolveActiveTariff(allTariffs, modelId, selectedDate);
      if (resolved.rate !== null) tariffMap[modelId] = resolved.rate;
    });

    const { data, error } = await supabase
      .from('vehicles')
      .select(`id, status, transmission, fuel_type, color, mfg_year,
        models ( id, brand, name, default_transmission, default_fuel_type, base_rate_per_day, categories ( name ) )`)
      .eq('owner_id', ownerRow.id);

    if (error) { toast.error('Failed to load fleet data.'); setLoading(false); return; }

    const modelMap: Record<string, any> = {};
    ((data as any[]) || []).forEach((v: any) => {
      const model = v.models;
      if (!model) return;
      const key     = model.id;
      const catName = model.categories?.name?.toUpperCase() + 'S';
      if (!modelMap[key]) {
        const rate = tariffMap[model.id] ?? model.base_rate_per_day ?? null;
        modelMap[key] = {
          id: model.id, name: `${model.brand} ${model.name}`,
          transmission: v.transmission || model.default_transmission || '',
          fuel:         v.fuel_type    || model.default_fuel_type    || '',
          rate:      rate ? `₹${Number(rate).toLocaleString('en-IN')}` : '—',
          rateValue: rate || 0,
          total: 0, available: 0,
          mfgYear: v.mfg_year?.toString() || '', color: v.color || '',
          type: catName, modelId: model.id,
        };
      }
      modelMap[key].total += 1;
      if (v.status === 'available') modelMap[key].available += 1;
    });

    const models = Object.values(modelMap).map((m: any) => ({
      modelId: m.modelId, name: m.name, transmission: m.transmission, fuel: m.fuel,
    }));
    setAllModels(models);

    const grouped: GroupedFleet = {};
    Object.values(modelMap).forEach((m: any) => {
      const cat = m.type;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({
        id: m.id, name: m.name, transmission: m.transmission, fuel: m.fuel,
        rate: m.rate, rateValue: m.rateValue,
        availability: `${m.available}/${m.total}`,
        mfgYear: m.mfgYear, color: m.color, type: m.type, modelId: m.modelId,
      });
    });
    setGroupedFleet(grouped);
    setLoading(false);
  };

  useEffect(() => { loadFleet(); }, [selectedDate]);

  const openProfile = (vehicleId: string, plate: string, status: 'In use' | 'Available' | 'Maintenance') => {
    setSelectedVehicleId(vehicleId); setSelectedPlate(plate); setSelectedStatus(status); setView('profile');
  };

  const TableHeader = () => (
    <div className="hidden md:grid grid-cols-12 px-10 py-5 text-[11px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/30">
      <div className="col-span-4">Model Name</div><div className="col-span-2">Transmission</div>
      <div className="col-span-2">Fuel Type</div><div className="col-span-2">Availability</div>
      <div className="col-span-1 text-right pr-4">Rate</div><div className="col-span-1 text-right">Action</div>
    </div>
  );

  const CategoryHeader: React.FC<{ name: string }> = ({ name }) => (
    <div className="px-6 md:px-10 py-4 bg-[#F9F9FF] flex items-center space-x-2 border-b border-[#d1d0eb]/20">
      <CarIcon size={14} className="text-[#6360DF]" />
      <span className="text-[11px] font-extrabold text-[#6360DF] tracking-widest uppercase">{name}</span>
    </div>
  );

  const VehicleRow: React.FC<{ item: FleetRow; cat: string }> = ({ item, cat }) => (
    <>
      <div onClick={() => { setSelectedVehicle(item); setCategory(cat); setView('detail'); }}
        className="hidden md:grid grid-cols-12 px-10 py-6 border-b border-[#d1d0eb]/10 items-center hover:bg-[#F8F9FA] transition-colors group cursor-pointer">
        <div className="col-span-4 flex items-center space-x-3">
          <CarIcon size={16} className="text-[#6360DF] opacity-40 group-hover:opacity-100 transition-opacity" />
          <span className="font-bold text-[#151a3c] text-[15px] group-hover:text-[#6360DF] transition-colors">{item.name}</span>
        </div>
        <div className="col-span-2 text-[#6c7e96] text-[14px] font-medium">{item.transmission}</div>
        <div className="col-span-2 text-[#6c7e96] text-[14px] font-medium">{item.fuel}</div>
        <div className="col-span-2"><span className="font-bold text-[#151a3c] text-[14px]">{item.availability}</span></div>
        <div className="col-span-1 text-right font-extrabold text-[#151a3c] text-[15px] pr-4">{item.rate}</div>
        <div className="col-span-1 flex justify-end">
          <button className="p-2 text-[#6360DF] hover:bg-[#EEEDFA] rounded-full transition-all"><Eye size={18} /></button>
        </div>
      </div>
      <div onClick={() => { setSelectedVehicle(item); setCategory(cat); setView('detail'); }}
        className="md:hidden p-5 border-b border-[#d1d0eb]/10 hover:bg-[#F8F9FA] transition-colors cursor-pointer">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <CarIcon size={14} className="text-[#6360DF]" />
            <span className="font-bold text-[#151a3c] text-sm">{item.name}</span>
          </div>
          <Eye size={16} className="text-[#6360DF]" />
        </div>
        <div className="flex items-center space-x-4 text-xs text-[#6c7e96] font-medium">
          <span>{item.transmission}</span><span>·</span>
          <span>{item.fuel}</span><span>·</span>
          <span className="font-bold text-[#151a3c]">{item.availability} avail.</span>
        </div>
        {item.rate !== '—' && <p className="text-sm font-extrabold text-[#6360DF] mt-1">{item.rate}/day</p>}
      </div>
    </>
  );

  return (
    <div className="min-h-full">
      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-[24px] font-extrabold text-[#151a3c] tracking-tight">Fleet Listing</h2>
              <div className="flex items-center flex-wrap gap-2">
                <div className="flex items-center space-x-2 bg-white px-4 py-2.5 rounded-xl border border-[#d1d0eb] shadow-sm text-sm font-semibold text-[#151a3c]">
                  <Calendar size={16} className="text-[#6c7e96] shrink-0" />
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                    className="outline-none bg-transparent text-sm font-semibold text-[#151a3c] cursor-pointer w-32" />
                </div>
                <button onClick={() => setShowTariff(true)}
                  className="bg-[#6360DF] hover:bg-[#5451d0] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#6360df22] transition-all">
                  Tariff
                </button>
                <button onClick={() => setView('add')}
                  className="bg-[#6360DF] hover:bg-[#5451d0] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#6360df22] transition-all flex items-center space-x-2">
                  <Plus size={16} /><span>New Vehicle</span>
                </button>
              </div>
            </div>
            <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden mb-12">
              <TableHeader />
              {loading ? (
                <div className="flex items-center justify-center py-20 text-[#6c7e96]">
                  <Loader2 size={24} className="animate-spin mr-2" /><span className="text-sm font-medium">Loading fleet...</span>
                </div>
              ) : Object.keys(groupedFleet).length === 0 ? (
                <div className="py-20 text-center text-[#6c7e96]">
                  <CarIcon size={40} className="mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-medium">No vehicles added yet.</p>
                </div>
              ) : (
                Object.entries(groupedFleet).map(([cat, items]) => (
                  <React.Fragment key={cat}>
                    <CategoryHeader name={cat} />
                    {(items as FleetRow[]).map((item, idx) => (
                      <VehicleRow key={`${cat}-${idx}`} item={item} cat={cat} />
                    ))}
                  </React.Fragment>
                ))
              )}
            </div>
            <AnimatePresence>
              {showTariff && (
                <TariffPopup ownerId={ownerId} allModels={allModels}
                  onClose={() => setShowTariff(false)} onSaved={loadFleet} />
              )}
            </AnimatePresence>
          </motion.div>
        )}
        {view === 'detail' && selectedVehicle && (
          <VehicleDetailView key="detail" vehicle={selectedVehicle} category={category} ownerId={ownerId}
            onBack={() => setView('list')} onAdd={() => setView('add')}
            onPlateClick={openProfile} onFleetReload={loadFleet} allModels={allModels} />
        )}
        {view === 'profile' && selectedVehicle && (
          <VehicleProfile key="profile" vehicle={selectedVehicle} vehicleId={selectedVehicleId}
            instancePlate={selectedPlate} status={selectedStatus} ownerId={ownerId} onBack={() => setView('detail')} />
        )}
        {view === 'add' && (
          <AddNewVehicle key="add"
            onSave={async () => { await loadFleet(); setView('list'); }}
            onCancel={() => setView('list')} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FleetListing;