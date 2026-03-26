import React, { useState, useEffect } from 'react';
import {
  DollarSign, Plus, Check, X, Loader2,
  Car as CarIcon, Edit2, Trash2, ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabaseClient';

// ──  Types ──────────────────────────────────────────────────────
interface TariffRecord {
  id: string;
  modelId: string;
  modelName: string;
  transmission: string;
  fuel: string;
  from: string;
  to: string;
  rate: number;
  deposit: number;
  notes: string;
  is_override: boolean;
}

interface EditingRow {
  id: string;
  modelId: string;
  from: string;
  to: string;
  rate: string;
  deposit: string;
  notes: string;
  is_override: boolean;
}

// ── Props ──────────────────────────────────────────────────────
interface TariffPageProps {
  ownerId: string;
  allModels: { modelId: string; name: string }[];
  onBack: () => void;
  onReloadFleet: () => void;
}

// ── TariffPage ─────────────────────────────────────────────────
const TariffPage: React.FC<TariffPageProps> = ({ ownerId, allModels, onBack, onReloadFleet }) => {
  const [loading,    setLoading]    = useState(true);
  const [tariffs,    setTariffs]    = useState<TariffRecord[]>([]);
  const [editing,    setEditing]    = useState<EditingRow | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Load ───────────────────────────────────────────────────────
  const loadTariffs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tariffs')
      .select(`
        id, model_id, rate_per_day, security_deposit,
        effective_from, effective_to, notes, is_override,
        models ( brand, name, default_transmission, default_fuel_type )
      `)
      .eq('owner_id', ownerId)
      .order('effective_from', { ascending: true });

    if (error) { toast.error('Failed to load tariffs.'); setLoading(false); return; }

    const mapped: TariffRecord[] = ((data as any[]) || []).map((t: any) => ({
      id:           t.id,
      modelId:      t.model_id,
      modelName:    t.models ? `${t.models.brand} ${t.models.name}` : '—',
      transmission: t.models?.default_transmission || '—',
      fuel:         t.models?.default_fuel_type    || '—',
      from:         t.effective_from  || '',
      to:           t.effective_to    || '',
      rate:         t.rate_per_day    || 0,
      deposit:      t.security_deposit || 0,
      notes:        t.notes           || '',
      is_override:  t.is_override     ?? false,
    }));

    setTariffs(mapped);
    setLoading(false);
  };

  useEffect(() => { if (ownerId) loadTariffs(); }, [ownerId]);

  // ── Date helpers ───────────────────────────────────────────────
  const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const hasConflict = (modelId: string, from: string, to: string, excludeId: string): boolean => {
    if (!from) return false;
    const newEnd = to || '9999-12-31';
    return tariffs
      .filter(t => t.modelId === modelId && t.id !== excludeId)
      .some(t => {
        const tEnd = t.to || '9999-12-31';
        return from <= tEnd && newEnd >= t.from;
      });
  };

  // ── Edit actions ───────────────────────────────────────────────
  const startEdit = (tariff: TariffRecord) =>
    setEditing({
      id: tariff.id, modelId: tariff.modelId,
      from: tariff.from, to: tariff.to,
      rate: tariff.rate.toString(), deposit: tariff.deposit.toString(),
      notes: tariff.notes, is_override: tariff.is_override,
    });

  const startNew = (modelId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setEditing({
      id: '__new__' + modelId, modelId,
      from: today, to: '', rate: '', deposit: '', notes: '', is_override: false,
    });
  };

  const cancelEdit = () => setEditing(null);

  // ── Save ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editing) return;
    if (!editing.rate.trim()) { toast.error('Rate is required.'); return; }
    if (hasConflict(editing.modelId, editing.from, editing.to, editing.id)) {
      toast.error('Date range overlaps with an existing tariff for this model.'); return;
    }
    setSaving(true);
    try {
      const payload = {
        owner_id:          ownerId,
        model_id:          editing.modelId,
        rate_per_day:      parseFloat(editing.rate),
        base_rate_per_day: parseFloat(editing.rate),
        security_deposit:  editing.deposit ? parseFloat(editing.deposit) : 0,
        effective_from:    editing.from  || null,
        effective_to:      editing.to    || null,
        notes:             editing.notes || null,
        is_override:       editing.is_override,
      };
      if (editing.id.startsWith('__new__')) {
        const { error } = await supabase.from('tariffs').insert(payload);
        if (error) { toast.error('Failed to save: ' + error.message); return; }
      } else {
        const { error } = await supabase.from('tariffs').update(payload).eq('id', editing.id);
        if (error) { toast.error('Failed to update: ' + error.message); return; }
      }
      toast.success('Tariff saved!');
      setEditing(null);
      await loadTariffs();
      onReloadFleet();
    } finally { setSaving(false); }
  };

  // ── Delete ─────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('tariffs').delete().eq('id', id);
      if (error) { toast.error('Failed to delete.'); return; }
      toast.success('Tariff removed.');
      await loadTariffs();
      onReloadFleet();
    } finally { setDeletingId(null); }
  };

  // ── Group by model ─────────────────────────────────────────────
  const grouped: Record<string, {
    modelName: string; transmission: string;
    fuel: string; modelId: string; rows: TariffRecord[];
  }> = {};

  tariffs.forEach(t => {
    if (!grouped[t.modelId])
      grouped[t.modelId] = { modelName: t.modelName, transmission: t.transmission, fuel: t.fuel, modelId: t.modelId, rows: [] };
    grouped[t.modelId].rows.push(t);
  });

  allModels.forEach(m => {
    if (!grouped[m.modelId])
      grouped[m.modelId] = { modelName: m.name, transmission: '—', fuel: '—', modelId: m.modelId, rows: [] };
  });

  // ── Render ─────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="space-y-6 pb-12"
    >
      {/* Back button */}
      <div className="flex items-center">
        <button onClick={onBack} className="flex items-center space-x-2 text-[#151a3c] hover:text-[#6360DF] transition-colors group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[24px] font-extrabold tracking-tight">Fleet Listing</span>
        </button>
      </div>

      {/* Page title */}
      <div>
        <h2 className="text-[18px] font-extrabold text-[#151a3c] tracking-tight">Tariffs</h2>
        <p className="text-[#6c7e96] text-sm font-medium mt-0.5">Manage rates and deposits for all vehicle models</p>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-32 text-[#6c7e96]">
          <Loader2 size={22} className="animate-spin mr-2" />
          <span className="text-sm font-medium">Loading tariffs...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.values(grouped).map(group => (
            <div key={group.modelId} className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">

              {/* Model card header */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-[#d1d0eb]/20">
                <div className="flex items-center space-x-4">
                  <div className="w-9 h-9 bg-[#EEEDFA] rounded-xl flex items-center justify-center shrink-0">
                    <CarIcon size={16} className="text-[#6360DF]" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-[#151a3c]">{group.modelName}</p>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-[11px] font-medium text-[#6c7e96]">{group.transmission}</span>
                      <span className="text-[#d1d0eb]">·</span>
                      <span className="text-[11px] font-medium text-[#6c7e96]">{group.fuel}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => startNew(group.modelId)}
                  className="flex items-center space-x-1.5 border border-dashed border-[#6360DF]/50 text-[#6360DF] hover:bg-[#EEEDFA] px-4 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  <Plus size={13} /><span>Add Period</span>
                </button>
              </div>

              {/* Table column headers */}
              {group.rows.length > 0 && (
                <div
                  className="hidden md:grid px-8 py-2.5 text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase bg-[#F9F9FF] border-b border-[#d1d0eb]/10"
                  style={{ gridTemplateColumns: '1.4fr 1.4fr 1.3fr 1.3fr 0.9fr auto' }}
                >
                  <div>From</div>
                  <div>To</div>
                  <div>Rate / Day (₹)</div>
                  <div>Deposit (₹)</div>
                  <div>Override</div>
                  <div className="w-20" />
                </div>
              )}

              {/* Rows */}
              <div className="divide-y divide-[#d1d0eb]/10">
                {group.rows.map(tariff => (
                  <div key={tariff.id}>

                    {/* Desktop view row */}
                    {(!editing || editing.id !== tariff.id) && (
                      <>
                        <div
                          className="hidden md:grid items-center px-8 py-4 hover:bg-[#fafafa] transition-colors"
                          style={{ gridTemplateColumns: '1.4fr 1.4fr 1.3fr 1.3fr 0.9fr auto' }}
                        >
                          <div className="text-sm font-medium text-[#151a3c]">{fmtDate(tariff.from)}</div>
                          <div className="text-sm font-medium text-[#151a3c]">{fmtDate(tariff.to)}</div>
                          <div className="font-extrabold text-[#151a3c] text-sm">
                            ₹{tariff.rate.toLocaleString('en-IN')}
                          </div>
                          <div className="text-sm font-medium text-[#151a3c]">
                            {tariff.deposit > 0
                              ? `₹${tariff.deposit.toLocaleString('en-IN')}`
                              : <span className="text-[#6c7e96]">—</span>}
                          </div>
                          <div>
                            {tariff.is_override ? (
                              <span className="inline-flex items-center space-x-1 bg-[#EEEDFA] text-[#6360DF] px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide">
                                <Check size={9} /><span>Yes</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#6c7e96] font-medium">—</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 w-20 justify-end">
                            <button
                              onClick={() => startEdit(tariff)}
                              className="p-2 text-[#cbd5e1] hover:text-[#6360DF] hover:bg-[#EEEDFA] rounded-lg transition-all"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(tariff.id)}
                              className="p-2 text-[#cbd5e1] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              {deletingId === tariff.id
                                ? <Loader2 size={13} className="animate-spin" />
                                : <Trash2 size={13} />}
                            </button>
                          </div>
                        </div>
                        {/* Notes below desktop row */}
                        {tariff.notes && (
                          <div className="hidden md:block px-8 pb-3 -mt-1.5">
                            <p className="text-[11px] text-[#6c7e96] font-medium italic">"{tariff.notes}"</p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Mobile view row */}
                    {(!editing || editing.id !== tariff.id) && (
                      <div className="md:hidden px-6 py-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-extrabold text-[#151a3c]">
                            ₹{tariff.rate.toLocaleString('en-IN')}/day
                          </span>
                          <div className="flex items-center space-x-1">
                            <button onClick={() => startEdit(tariff)} className="p-1.5 text-[#cbd5e1] hover:text-[#6360DF]">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => handleDelete(tariff.id)} className="p-1.5 text-[#cbd5e1] hover:text-red-500">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-[#6c7e96] font-medium">
                          {fmtDate(tariff.from)} → {fmtDate(tariff.to)}
                          {tariff.is_override && <span className="ml-2 text-[#6360DF] font-bold">Override</span>}
                        </p>
                        {tariff.notes && <p className="text-xs text-[#6c7e96] italic">"{tariff.notes}"</p>}
                      </div>
                    )}

                    {/* Inline edit for existing entry */}
                    <AnimatePresence>
                      {editing && editing.id === tariff.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
                          className="bg-[#F9F9FF] border-t border-[#d1d0eb]/20 overflow-hidden"
                        >
                          <EditRow editing={editing} saving={saving} isNew={false}
                            onChange={setEditing} onSave={handleSave} onCancel={cancelEdit} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}

                {/* Empty state */}
                {group.rows.length === 0 && !(editing && editing.id === '__new__' + group.modelId) && (
                  <div className="px-8 py-5 text-xs text-[#6c7e96] font-medium">
                    No tariff set yet.{' '}
                    <span
                      className="text-[#6360DF] font-bold cursor-pointer hover:underline"
                      onClick={() => startNew(group.modelId)}
                    >
                      Add Period
                    </span>
                    {' '}to set one.
                  </div>
                )}

                {/* Inline new row */}
                <AnimatePresence>
                  {editing && editing.id === '__new__' + group.modelId && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
                      className="bg-[#F9F9FF] border-t border-[#d1d0eb]/20 overflow-hidden"
                    >
                      <EditRow editing={editing} saving={saving} isNew={true}
                        onChange={setEditing} onSave={handleSave} onCancel={cancelEdit} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// ── Inline EditRow ─────────────────────────────────────────────
interface EditRowProps {
  editing: EditingRow;
  saving: boolean;
  isNew: boolean;
  onChange: (v: any) => void;
  onSave: () => void;
  onCancel: () => void;
}

const EditRow: React.FC<EditRowProps> = ({ editing, saving, isNew, onChange, onSave, onCancel }) => {
  const set = (field: string, value: any) =>
    onChange((prev: any) => ({ ...prev, [field]: value }));

  const inp = "w-full bg-white border border-[#d1d0eb] rounded-xl py-2.5 px-3 text-xs font-medium text-[#151a3c] outline-none focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10 transition-all";

  return (
    <div className="px-8 py-5 space-y-4">

      {/* Date + Rate + Deposit */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-wider">From</label>
          <input type="date" value={editing.from} onChange={e => set('from', e.target.value)} className={inp} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-wider">To</label>
          <input type="date" value={editing.to} min={editing.from} onChange={e => set('to', e.target.value)} className={inp} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-wider">Rate / Day (₹)</label>
          <input type="number" value={editing.rate} onChange={e => set('rate', e.target.value)}
            placeholder="2500" min="0" className={inp} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-wider">Deposit (₹)</label>
          <input type="number" value={editing.deposit} onChange={e => set('deposit', e.target.value)}
            placeholder="5000" min="0" className={inp} />
        </div>
      </div>

      {/* Notes below */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-wider">Notes (optional)</label>
        <input type="text" value={editing.notes} onChange={e => set('notes', e.target.value)}
          placeholder="e.g. Peak season rate, weekend pricing..." className={inp} />
      </div>

      {/* Override — only for already-saved entries */}
      {!isNew && (
        <div className="flex items-center justify-between bg-white border border-[#d1d0eb] rounded-xl px-4 py-3 max-w-sm">
          <div>
            <p className="text-xs font-bold text-[#151a3c]">Override</p>
            <p className="text-[10px] text-[#6c7e96] font-medium mt-0.5">Takes priority over standard tariff</p>
          </div>
          <button
            type="button"
            onClick={() => set('is_override', !editing.is_override)}
            className={`relative w-9 h-5 rounded-full transition-colors duration-300 shrink-0 ${editing.is_override ? 'bg-[#6360DF]' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${editing.is_override ? 'left-4' : 'left-0.5'}`} />
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onCancel}
          className="flex items-center space-x-1.5 border border-[#d1d0eb] text-[#6c7e96] px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
        >
          <X size={12} /><span>Cancel</span>
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center space-x-1.5 bg-[#6360DF] hover:bg-[#5451d0] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-[#6360df22] transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          <span>{saving ? 'Saving...' : 'Save'}</span>
        </button>
      </div>
    </div>
  );
};

export default TariffPage;