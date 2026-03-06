import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar, Plus, Eye, Car as CarIcon,
  ArrowLeft, Edit, Trash2, Bell, Loader2,
  X, Check, DollarSign, Ban
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase, getCurrentUser } from '../supabaseClient';
import AddNewVehicle from './AddNewVehicle';
import VehicleProfile from './VehicleProfile';

// ── Types ─────────────────────────────────────────────────────
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

// ── Tariff Popup ──────────────────────────────────────────────
const TariffPopup: React.FC<{
  ownerId: string;
  modelId?: string;
  modelName?: string;
  allModels: { modelId: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ ownerId, modelId, modelName, allModels, onClose, onSaved }) => {
  const [selectedModelId, setSelectedModelId] = useState(modelId || '');
  const [ratePerDay, setRatePerDay] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [effectiveTo, setEffectiveTo] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Load existing tariff for selected model
  useEffect(() => {
    if (!selectedModelId) return;
    const load = async () => {
      const { data } = await supabase
        .from('tariffs')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('model_id', selectedModelId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setRatePerDay(data.rate_per_day?.toString() || '');
        setEffectiveFrom(data.effective_from || new Date().toISOString().split('T')[0]);
        setEffectiveTo(data.effective_to || '');
        setNotes(data.notes || '');
      } else {
        setRatePerDay('');
        setEffectiveTo('');
        setNotes('');
      }
    };
    load();
  }, [selectedModelId, ownerId]);

  const handleSave = async () => {
    if (!selectedModelId || !ratePerDay) {
      toast.error('Please select a model and enter a rate.');
      return;
    }
    setSaving(true);
    try {
      // Upsert: delete old, insert new
      await supabase.from('tariffs')
        .delete()
        .eq('owner_id', ownerId)
        .eq('model_id', selectedModelId);

      const { error } = await supabase.from('tariffs').insert({
        owner_id: ownerId,
        model_id: selectedModelId,
        rate_per_day: parseFloat(ratePerDay),
        effective_from: effectiveFrom || null,
        effective_to: effectiveTo || null,
        notes: notes || null,
      });

      // Also update base_rate_per_day on models table
      await supabase.from('models')
        .update({ base_rate_per_day: parseFloat(ratePerDay) })
        .eq('id', selectedModelId);

      if (error) { toast.error('Failed to save tariff: ' + error.message); return; }
      toast.success('Tariff saved successfully!');
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#151a3c]/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 z-10">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#EEEDFA] rounded-xl flex items-center justify-center text-[#6360DF]">
              <DollarSign size={18} />
            </div>
            <h3 className="text-lg font-extrabold text-[#151a3c]">Set Tariff</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-[#6c7e96]"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          {/* Model selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Vehicle Model</label>
            <select value={selectedModelId} onChange={e => setSelectedModelId(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-medium text-[#151a3c] outline-none focus:border-[#6360DF]">
              <option value="">— Select Model —</option>
              {allModels.map(m => (
                <option key={m.modelId} value={m.modelId}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Rate */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Rate per Day (₹) <span className="text-red-500">*</span></label>
            <input type="number" value={ratePerDay} onChange={e => setRatePerDay(e.target.value)}
              placeholder="e.g. 2500" min="0"
              className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10" />
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Effective From</label>
              <input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-3 text-sm font-medium text-[#151a3c] outline-none focus:border-[#6360DF]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Effective To</label>
              <input type="date" value={effectiveTo} onChange={e => setEffectiveTo(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-3 text-sm font-medium text-[#151a3c] outline-none focus:border-[#6360DF]" />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Weekend rate, peak season..."
              className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-medium text-[#151a3c] outline-none focus:border-[#6360DF]" />
          </div>
        </div>

        <div className="flex space-x-3 mt-7">
          <button onClick={onClose}
            className="flex-1 border border-[#d1d0eb] text-[#6c7e96] font-bold py-3.5 rounded-xl hover:bg-slate-50 text-sm transition-all">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-[#6360df22] transition-all flex items-center justify-center space-x-2 disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            <span>{saving ? 'Saving...' : 'Save Tariff'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Blackout Popup ────────────────────────────────────────────
const BlackoutPopup: React.FC<{
  vehicleId: string;
  plate: string;
  ownerId: string;
  onClose: () => void;
  onSaved: () => void;
}> = ({ vehicleId, plate, ownerId, onClose, onSaved }) => {
  const today = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [type, setType] = useState('maintenance');
  const [notes, setNotes] = useState('');
  const [autoRestore, setAutoRestore] = useState(true);
  const [saving, setSaving] = useState(false);

  const blackoutTypes = [
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'accident',    label: 'Accident' },
    { value: 'servicing',   label: 'Servicing' },
    { value: 'others',      label: 'Others' },
  ];

  const handleSave = async () => {
    if (!fromDate || !toDate) { toast.error('Please select both from and to dates.'); return; }
    if (toDate < fromDate) { toast.error('To date must be after from date.'); return; }
    setSaving(true);
    try {
      // Insert blackout record
      const { error } = await supabase.from('blackouts').insert({
        owner_id: ownerId,
        vehicle_id: vehicleId,
        from_date: fromDate,
        to_date: toDate,
        type,
        notes: notes || null,
        auto_restore: autoRestore,
      });
      if (error) { toast.error('Failed to save blackout: ' + error.message); return; }

      // Set vehicle status to maintenance immediately if blackout starts today
      if (fromDate <= today && toDate >= today) {
        await supabase.from('vehicles')
          .update({ status: 'maintenance' })
          .eq('id', vehicleId);
      }

      toast.success(`Blackout set for ${plate} from ${fromDate} to ${toDate}`);
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#151a3c]/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 z-10">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
              <Ban size={18} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#151a3c]">Blackout</h3>
              <p className="text-xs text-[#6c7e96] font-medium">{plate}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-[#6c7e96]"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          {/* Date range */}
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

          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Type of Blackout</label>
            <div className="grid grid-cols-2 gap-2">
              {blackoutTypes.map(bt => (
                <button key={bt.value} type="button" onClick={() => setType(bt.value)}
                  className={`py-2.5 px-4 rounded-xl text-sm font-bold border transition-all ${
                    type === bt.value
                      ? 'bg-red-50 border-red-300 text-red-600'
                      : 'bg-[#F8F9FA] border-[#d1d0eb] text-[#6c7e96] hover:border-red-200'
                  }`}>
                  {bt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Additional details..."
              className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-medium text-[#151a3c] outline-none focus:border-[#6360DF]" />
          </div>

          {/* Auto restore toggle */}
          <div className="flex items-center justify-between bg-[#F8F9FA] rounded-2xl px-5 py-4 border border-[#d1d0eb]">
            <div>
              <p className="text-sm font-bold text-[#151a3c]">Auto-restore after blackout ends</p>
              <p className="text-[11px] text-[#6c7e96] font-medium mt-0.5">Vehicle automatically set back to Available</p>
            </div>
            <button
              type="button"
              onClick={() => setAutoRestore(p => !p)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0 ${autoRestore ? 'bg-[#6360DF]' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${autoRestore ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>

        <div className="flex space-x-3 mt-7">
          <button onClick={onClose}
            className="flex-1 border border-[#d1d0eb] text-[#6c7e96] font-bold py-3.5 rounded-xl hover:bg-slate-50 text-sm transition-all">
            Cancel
          </button>
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

// ── VehicleDetailView ─────────────────────────────────────────
const VehicleDetailView: React.FC<{
  vehicle: any;
  category: string;
  ownerId: string;
  onBack: () => void;
  onAdd: () => void;
  onPlateClick: (vehicleId: string, plate: string, status: 'In use' | 'Available' | 'Maintenance') => void;
  onFleetReload: () => void;
  allModels: { modelId: string; name: string }[];
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
      .from('vehicles')
      .select('id, registration_no, status')
      .eq('owner_id', ownerRow.id)
      .eq('model_id', vehicle.modelId);

    if (error) { setLoading(false); return; }

    const vehicleList = vehicles || [];
    const vehicleIds = vehicleList.map((v: any) => v.id);

    let activeBookingMap: Record<string, { customer: string; duration: string }> = {};
    if (vehicleIds.length > 0) {
      const { data: bookingDetails } = await supabase
        .from('booking_details')
        .select('vehicle_id, bookings(customer_name, pickup_at, drop_at, status)')
        .in('vehicle_id', vehicleIds)
        .in('bookings.status', ['BOOKED', 'ONGOING']);

      ((bookingDetails as any[]) || []).forEach((bd: any) => {
        if (bd.bookings && ['BOOKED', 'ONGOING'].includes(bd.bookings.status)) {
          const pickupDate = new Date(bd.bookings.pickup_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          const dropDate = new Date(bd.bookings.drop_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          activeBookingMap[bd.vehicle_id] = {
            customer: bd.bookings.customer_name,
            duration: `${pickupDate} - ${dropDate}`,
          };
        }
      });
    }

    setDetails(vehicleList.map((v: any) => ({
      id: v.id,
      plate: v.registration_no,
      status: v.status === 'available' ? 'Available' : v.status === 'rented' ? 'In use' : 'Maintenance',
      booking: activeBookingMap[v.id] || undefined,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchVehicleInstances(); }, [vehicle.modelId]);

  const totalVehicles = details.length;
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
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">

      {/* Header */}
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

      {/* Model info banner */}
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

      {/* Vehicles table */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-12 px-10 py-5 text-[11px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/30 bg-[#F9F9FF]/50">
          <div className="col-span-3">Vehicle No.</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-5">Current Booking & Duration</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#6c7e96]">
            <Loader2 size={24} className="animate-spin mr-2" />
            <span className="text-sm font-medium">Loading vehicles...</span>
          </div>
        ) : details.length === 0 ? (
          <div className="py-16 text-center text-[#6c7e96] text-sm font-medium">No vehicles added for this model yet.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {details.map((detail) => (
              <div key={detail.id}>
                {/* Desktop row */}
                <div className="hidden md:grid grid-cols-12 px-10 py-5 items-center hover:bg-[#f8f9fc]/50 transition-colors">
                  <div onClick={() => onPlateClick(detail.id, detail.plate, detail.status)}
                    className="col-span-3 font-bold text-[#151a3c] text-[15px] hover:text-[#6360DF] cursor-pointer transition-colors">
                    {detail.plate}
                  </div>
                  <div className="col-span-2">
                    <span className={`px-4 py-1.5 rounded-full text-[11px] font-extrabold tracking-wide ${getStatusStyles(detail.status)}`}>
                      {detail.status}
                    </span>
                  </div>
                  <div className="col-span-5">
                    {detail.booking ? (
                      <div className="flex flex-col">
                        <span className="font-bold text-[#151a3c] text-[14px]">{detail.booking.customer}</span>
                        <span className="text-[#6c7e96] text-[12px] font-medium">{detail.booking.duration}</span>
                      </div>
                    ) : (
                      <span className="text-[#6c7e96] text-[13px] font-medium italic">No active booking</span>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center justify-end space-x-2">
                    {/* Active toggle */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const newStatus = detail.status === 'Available' ? 'maintenance' : 'available';
                        const { error } = await supabase.from('vehicles').update({ status: newStatus }).eq('id', detail.id);
                        if (error) { toast.error('Failed to update status.'); return; }
                        toast.success(`Vehicle marked ${newStatus === 'available' ? 'Active' : 'Inactive'}.`);
                        fetchVehicleInstances(); onFleetReload();
                      }}
                      className={`relative w-10 h-5 rounded-full transition-colors duration-300 shrink-0 ${detail.status === 'Available' ? 'bg-[#6360DF]' : 'bg-slate-300'}`}
                    >
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

                {/* Mobile card */}
                <div className="md:hidden p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => onPlateClick(detail.id, detail.plate, detail.status)}
                      className="font-extrabold text-[#151a3c] text-base hover:text-[#6360DF] transition-colors">
                      {detail.plate}
                    </button>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold ${getStatusStyles(detail.status)}`}>{detail.status}</span>
                  </div>
                  {detail.booking ? (
                    <div>
                      <p className="font-bold text-[#151a3c] text-sm">{detail.booking.customer}</p>
                      <p className="text-[#6c7e96] text-xs font-medium">{detail.booking.duration}</p>
                    </div>
                  ) : (
                    <p className="text-[#6c7e96] text-sm italic">No active booking</p>
                  )}
                  <div className="flex items-center space-x-3 pt-1">
                    <button
                      onClick={async () => {
                        const newStatus = detail.status === 'Available' ? 'maintenance' : 'available';
                        await supabase.from('vehicles').update({ status: newStatus }).eq('id', detail.id);
                        fetchVehicleInstances(); onFleetReload();
                      }}
                      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${detail.status === 'Available' ? 'bg-[#6360DF]' : 'bg-slate-300'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${detail.status === 'Available' ? 'left-5' : 'left-0.5'}`} />
                    </button>
                    <span className="text-xs font-bold text-[#6c7e96]">{detail.status === 'Available' ? 'Active' : 'Inactive'}</span>
                    <div className="flex-1" />
                    <button className="p-2 text-[#cbd5e1] hover:text-[#6360DF]"><Edit size={15} /></button>
                    <button onClick={() => setConfirmDeleteId(detail.id)} className="p-2 text-[#cbd5e1] hover:text-red-500">
                      <Trash2 size={15} />
                    </button>
                    <button className="p-2 text-[#cbd5e1] hover:text-orange-500"><Bell size={15} /></button>
                  </div>
                </div>

                {/* Inline delete confirm */}
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

      {/* Tariff popup */}
      <AnimatePresence>
        {showTariff && (
          <TariffPopup
            ownerId={ownerId}
            modelId={vehicle.modelId}
            modelName={vehicle.name}
            allModels={allModels}
            onClose={() => setShowTariff(false)}
            onSaved={() => { onFleetReload(); }}
          />
        )}
      </AnimatePresence>

      {/* Blackout popup */}
      <AnimatePresence>
        {blackoutVehicle && (
          <BlackoutPopup
            vehicleId={blackoutVehicle.id}
            plate={blackoutVehicle.plate}
            ownerId={ownerId}
            onClose={() => setBlackoutVehicle(null)}
            onSaved={() => { fetchVehicleInstances(); onFleetReload(); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── FleetListing (main) ───────────────────────────────────────
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
  const [allModels, setAllModels] = useState<{ modelId: string; name: string }[]>([]);

  // Date filter
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Tariff popup (list view)
  const [showTariff, setShowTariff] = useState(false);

  const loadFleet = async () => {
    setLoading(true);
    const authUser = await getCurrentUser();
    if (!authUser) { setLoading(false); return; }

    const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', authUser.id).single();
    if (!ownerRow) { setLoading(false); return; }
    setOwnerId(ownerRow.id);

    // Load tariffs for rate display
    const { data: tariffData } = await supabase
      .from('tariffs')
      .select('model_id, rate_per_day, effective_from, effective_to')
      .eq('owner_id', ownerRow.id);

    const tariffMap: Record<string, number> = {};
    ((tariffData as any[]) || []).forEach((t: any) => {
      const from = t.effective_from;
      const to = t.effective_to;
      const withinRange = (!from || selectedDate >= from) && (!to || selectedDate <= to);
      if (withinRange) tariffMap[t.model_id] = t.rate_per_day;
    });

    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        id, status, transmission, fuel_type, color, mfg_year,
        models ( id, brand, name, default_transmission, default_fuel_type, base_rate_per_day,
          categories ( name )
        )
      `)
      .eq('owner_id', ownerRow.id);

    if (error) { toast.error('Failed to load fleet data.'); setLoading(false); return; }

    const modelMap: Record<string, any> = {};
    ((data as any[]) || []).forEach((v: any) => {
      const model = v.models;
      if (!model) return;
      const key = model.id;
      const catName = model.categories?.name?.toUpperCase() + 'S';
      if (!modelMap[key]) {
        const rate = tariffMap[model.id] ?? model.base_rate_per_day ?? null;
        modelMap[key] = {
          id: model.id, name: `${model.brand} ${model.name}`,
          transmission: v.transmission || model.default_transmission || '',
          fuel: v.fuel_type || model.default_fuel_type || '',
          rate: rate ? `₹${Number(rate).toLocaleString('en-IN')}` : '—',
          rateValue: rate || 0,
          total: 0, available: 0,
          mfgYear: v.mfg_year?.toString() || '',
          color: v.color || '', type: catName, modelId: model.id,
        };
      }
      modelMap[key].total += 1;
      if (v.status === 'available') modelMap[key].available += 1;
    });

    const models = Object.values(modelMap).map((m: any) => ({ modelId: m.modelId, name: m.name }));
    setAllModels(models);

    const grouped: GroupedFleet = {};
    Object.values(modelMap).forEach((m: any) => {
      const cat = m.type;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({
        id: m.id, name: m.name, transmission: m.transmission,
        fuel: m.fuel, rate: m.rate, rateValue: m.rateValue,
        availability: `${m.available}/${m.total}`,
        mfgYear: m.mfgYear, color: m.color, type: m.type, modelId: m.modelId,
      });
    });

    setGroupedFleet(grouped);
    setLoading(false);
  };

  useEffect(() => { loadFleet(); }, [selectedDate]);

  const openProfile = (vehicleId: string, plate: string, status: 'In use' | 'Available' | 'Maintenance') => {
    setSelectedVehicleId(vehicleId);
    setSelectedPlate(plate);
    setSelectedStatus(status);
    setView('profile');
  };

  // ── List view ─────────────────────────────────────────────
  const TableHeader = () => (
    <div className="hidden md:grid grid-cols-12 px-10 py-5 text-[11px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/30">
      <div className="col-span-4">Model Name</div>
      <div className="col-span-2">Transmission</div>
      <div className="col-span-2">Fuel Type</div>
      <div className="col-span-2">Availability</div>
      <div className="col-span-1 text-right pr-4">Rate</div>
      <div className="col-span-1 text-right">Action</div>
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
      {/* Desktop */}
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

      {/* Mobile card */}
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
          <span>{item.transmission}</span>
          <span>·</span>
          <span>{item.fuel}</span>
          <span>·</span>
          <span className="font-bold text-[#151a3c]">{item.availability} avail.</span>
        </div>
        {item.rate !== '—' && <p className="text-sm font-extrabold text-[#6360DF] mt-1">{item.rate}/day</p>}
      </div>
    </>
  );

  return (
    <div className="min-h-full">
      <AnimatePresence mode="wait">
        {/* ── List ── */}
        {view === 'list' && (
          <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-[24px] font-extrabold text-[#151a3c] tracking-tight">Fleet Listing</h2>
              <div className="flex items-center flex-wrap gap-2">
                {/* Selectable date */}
                <div className="flex items-center space-x-2 bg-white px-4 py-2.5 rounded-xl border border-[#d1d0eb] shadow-sm text-sm font-semibold text-[#151a3c]">
                  <Calendar size={16} className="text-[#6c7e96] shrink-0" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="outline-none bg-transparent text-sm font-semibold text-[#151a3c] cursor-pointer w-32"
                  />
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
                  <Loader2 size={24} className="animate-spin mr-2" />
                  <span className="text-sm font-medium">Loading fleet...</span>
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

            {/* Tariff popup (list view) */}
            <AnimatePresence>
              {showTariff && (
                <TariffPopup
                  ownerId={ownerId}
                  allModels={allModels}
                  onClose={() => setShowTariff(false)}
                  onSaved={loadFleet}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Detail ── */}
        {view === 'detail' && selectedVehicle && (
          <VehicleDetailView
            key="detail"
            vehicle={selectedVehicle}
            category={category}
            ownerId={ownerId}
            onBack={() => setView('list')}
            onAdd={() => setView('add')}
            onPlateClick={openProfile}
            onFleetReload={loadFleet}
            allModels={allModels}
          />
        )}

        {/* ── Profile ── */}
        {view === 'profile' && selectedVehicle && (
          <VehicleProfile
            key="profile"
            vehicle={selectedVehicle}
            vehicleId={selectedVehicleId}
            instancePlate={selectedPlate}
            status={selectedStatus}
            ownerId={ownerId}
            onBack={() => setView('detail')}
          />
        )}

        {/* ── Add ── */}
        {view === 'add' && (
          <AddNewVehicle
            key="add"
            onSave={async () => { await loadFleet(); setView('list'); }}
            onCancel={() => setView('list')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FleetListing;