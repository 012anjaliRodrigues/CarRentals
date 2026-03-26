import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Printer, Car as CarIcon, Share2, Link as LinkIcon,
  Download, CheckCircle, UserCircle, ChevronDown, Lock, Edit,
  ExternalLink, Loader2, User as UserIcon, X, Save,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';

interface BookingDetailsProps {
  booking: any;
  mode?: 'details' | 'confirmed';
  onBack: () => void;
  onEdit: () => void;
}

// Per-vehicle unit — extended with editable fields
interface FleetItem {
  id: string;             // booking_detail id
  modelId: string;
  name: string;
  registrationNo: string; // current (may be blank)
  vehicleId: string | null;
  details: string;
  pickDriver: string;     // display name
  pickDriverId: string | null;
  dropDriver: string;     // display name
  dropDriverId: string | null;
  pickAllocationId: string | null;
  dropAllocationId: string | null;
}

// Editable draft — mirrors FleetItem but only the editable fields
interface FleetDraft {
  detailId: string;
  vehicleId: string;      // '' = unassigned
  pickDriverId: string;   // '' = unassigned
  dropDriverId: string;
}

interface Driver {
  id: string;
  full_name: string;
  status: string;
}

interface VehicleOption {
  id: string;
  registration_no: string;
}

const BookingDetails: React.FC<BookingDetailsProps> = ({ booking, mode = 'details', onBack, onEdit }) => {
  if (!booking) return null;

  const isConfirmation = mode === 'confirmed';

  const [paymentState, setPaymentState] = useState({
    advanceStatus:  'pending' as 'pending' | 'paid' | 'partial',
    cashAmount:     '',
    cashPaymentType: 'partial' as 'full' | 'partial',
    totalAmount:    Number(booking.total_amount   || booking.pricing?.total   || 0),
    advanceAmount:  Number(booking.advance_amount || booking.pricing?.advance || 0),
    balanceDue:     Number(booking.balance_amount || booking.pricing?.balance || 0),
  });
  const [isPaymentFormActive, setIsPaymentFormActive] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'cash'>('upi');

  // ── Edit mode state ───────────────────────────────────────
  const [isEditing, setIsEditing]   = useState(false);
  const [isSaving,  setIsSaving]    = useState(false);
  // draft holds the in-progress edits keyed by detailId
  const [drafts, setDrafts]         = useState<Record<string, FleetDraft>>({});

  // ── Reference data ────────────────────────────────────────
  const [drivers,        setDrivers]        = useState<Driver[]>([]);
  // vehiclesByModel: modelId → list of vehicles for that model
  const [vehiclesByModel, setVehiclesByModel] = useState<Record<string, VehicleOption[]>>({});

  // ── Real fleet data ───────────────────────────────────────
  const [fleetItems,   setFleetItems]   = useState<FleetItem[]>([]);
  const [fleetLoading, setFleetLoading] = useState(false);

  const bookingId = booking.id;
  const ownerId   = booking.owner_id;

  // ── Load drivers + vehicles (for dropdowns) ───────────────
  useEffect(() => {
    if (!ownerId) return;
    const loadRefData = async () => {
      // Drivers — all active for this owner
      const { data: driverData } = await supabase
        .from('drivers')
        .select('id, full_name, status')
        .eq('owner_id', ownerId)
        .eq('status', 'active')
        .order('full_name');
      setDrivers((driverData as Driver[]) || []);

      // Vehicles grouped by model
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('id, registration_no, model_id')
        .eq('owner_id', ownerId)
        .order('registration_no');
      const grouped: Record<string, VehicleOption[]> = {};
      ((vehicleData as any[]) || []).forEach((v: any) => {
        if (!grouped[v.model_id]) grouped[v.model_id] = [];
        grouped[v.model_id].push({ id: v.id, registration_no: v.registration_no });
      });
      setVehiclesByModel(grouped);
    };
    loadRefData();
  }, [ownerId]);

  // ── Load fleet items ──────────────────────────────────────
  const loadFleet = async () => {
    if (!bookingId) return;
    setFleetLoading(true);
    try {
      const { data: details } = await supabase
        .from('booking_details')
        .select(`
          id,
          model_id,
          vehicle_id,
          vehicles (
            registration_no,
            transmission,
            fuel_type,
            models ( brand, name )
          )
        `)
        .eq('booking_id', bookingId);

      if (!details || details.length === 0) { setFleetLoading(false); return; }

      const detailIds = (details as any[]).map((d: any) => d.id);

      // Allocations → Pick & Drop drivers
      const { data: allocs } = await supabase
        .from('allocations')
        .select('id, booking_detail_id, type, driver_id, drivers ( full_name )')
        .in('booking_detail_id', detailIds);

      // Build map: detailId → { pick, drop }
      const driverMap: Record<string, {
        pick: string; pickId: string | null; pickAllocId: string | null;
        drop: string; dropId: string | null; dropAllocId: string | null;
      }> = {};
      ((allocs as any[]) || []).forEach((a: any) => {
        if (!driverMap[a.booking_detail_id])
          driverMap[a.booking_detail_id] = {
            pick: '—', pickId: null, pickAllocId: null,
            drop: '—', dropId: null, dropAllocId: null,
          };
        if (a.type === 'Pick') {
          driverMap[a.booking_detail_id].pick        = a.drivers?.full_name || '—';
          driverMap[a.booking_detail_id].pickId      = a.driver_id;
          driverMap[a.booking_detail_id].pickAllocId = a.id;
        }
        if (a.type === 'Drop') {
          driverMap[a.booking_detail_id].drop        = a.drivers?.full_name || '—';
          driverMap[a.booking_detail_id].dropId      = a.driver_id;
          driverMap[a.booking_detail_id].dropAllocId = a.id;
        }
      });

      const items: FleetItem[] = ((details as any[]) || []).map((d: any) => ({
        id:             d.id,
        modelId:        d.model_id,
        vehicleId:      d.vehicle_id || null,
        name:           d.vehicles?.models
                          ? `${d.vehicles.models.brand} ${d.vehicles.models.name}`
                          : '—',
        registrationNo: d.vehicles?.registration_no || '—',
        details:        [d.vehicles?.transmission, d.vehicles?.fuel_type]
                          .filter(Boolean).join(' • ').toUpperCase(),
        pickDriver:     driverMap[d.id]?.pick        || '—',
        pickDriverId:   driverMap[d.id]?.pickId      || null,
        dropDriver:     driverMap[d.id]?.drop        || '—',
        dropDriverId:   driverMap[d.id]?.dropId      || null,
        pickAllocationId: driverMap[d.id]?.pickAllocId || null,
        dropAllocationId: driverMap[d.id]?.dropAllocId || null,
      }));

      setFleetItems(items);

      // Seed drafts from current saved state
      const initDrafts: Record<string, FleetDraft> = {};
      items.forEach(item => {
        initDrafts[item.id] = {
          detailId:     item.id,
          vehicleId:    item.vehicleId    || '',
          pickDriverId: item.pickDriverId || '',
          dropDriverId: item.dropDriverId || '',
        };
      });
      setDrafts(initDrafts);

    } catch (e) { console.error(e); }
    finally { setFleetLoading(false); }
  };

  useEffect(() => { loadFleet(); }, [bookingId]);

  // ── Enter / cancel edit ───────────────────────────────────
  const handleEditToggle = () => {
    if (isEditing) {
      // cancel — reset drafts to current saved state
      const reset: Record<string, FleetDraft> = {};
      fleetItems.forEach(item => {
        reset[item.id] = {
          detailId:     item.id,
          vehicleId:    item.vehicleId    || '',
          pickDriverId: item.pickDriverId || '',
          dropDriverId: item.dropDriverId || '',
        };
      });
      setDrafts(reset);
    }
    setIsEditing(prev => !prev);
  };

  // ── Save edits ────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const item of fleetItems) {
        const draft = drafts[item.id];
        if (!draft) continue;

        // 1. Update vehicle_id on booking_detail
        if (draft.vehicleId !== (item.vehicleId || '')) {
          await supabase
            .from('booking_details')
            .update({ vehicle_id: draft.vehicleId || null })
            .eq('id', item.id);
        }

        // 2. Upsert Pick allocation
        await upsertAllocation(
          item,
          'Pick',
          draft.pickDriverId,
          item.pickAllocationId,
        );

        // 3. Upsert Drop allocation
        await upsertAllocation(
          item,
          'Drop',
          draft.dropDriverId,
          item.dropAllocationId,
        );
      }
      toast.success('Booking updated successfully.');
      setIsEditing(false);
      await loadFleet(); // refresh to show saved state
    } catch (e) {
      console.error(e);
      toast.error('Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper: upsert a Pick or Drop allocation row
  const upsertAllocation = async (
    item: FleetItem,
    type: 'Pick' | 'Drop',
    newDriverId: string,
    existingAllocId: string | null,
  ) => {
    const existingDriverId = type === 'Pick' ? item.pickDriverId : item.dropDriverId;
    if (newDriverId === (existingDriverId || '')) return; // no change

    if (!newDriverId) {
      // Remove allocation if driver cleared
      if (existingAllocId) {
        await supabase.from('allocations').delete().eq('id', existingAllocId);
      }
      return;
    }

    if (existingAllocId) {
      // Update existing
      await supabase
        .from('allocations')
        .update({ driver_id: newDriverId })
        .eq('id', existingAllocId);
    } else {
      // Insert new
      await supabase.from('allocations').insert({
        owner_id:          ownerId,
        booking_detail_id: item.id,
        driver_id:         newDriverId,
        type,
        location:          type === 'Pick' ? booking.pickup_location : booking.drop_location,
        date_time:         type === 'Pick' ? booking.pickup_at : booking.drop_at,
        is_confirmed:      false,
      });
    }
  };

  const updateDraft = (detailId: string, field: keyof FleetDraft, value: string) => {
    setDrafts(prev => ({
      ...prev,
      [detailId]: { ...prev[detailId], [field]: value },
    }));
  };

  const handleConfirmPayment = () => {
    const amt  = parseFloat(paymentState.cashAmount) || 0;
    const isPaid = selectedMethod === 'upi' || amt >= paymentState.advanceAmount;
    setPaymentState(prev => ({
      ...prev,
      advanceStatus: isPaid ? 'paid' : 'partial',
      balanceDue: prev.totalAmount - (selectedMethod === 'upi' ? prev.advanceAmount : amt),
    }));
    setIsPaymentFormActive(false);
  };

  // ── Derive display values ─────────────────────────────────
  const referenceId   = booking.booking_reference || booking.referenceId || '—';
  const customerName  = booking.customer_name     || booking.customer    || '—';
  const customerPhone = booking.customer_phone    || booking.phone       || '—';
  const pickupLoc     = booking.pickup_location   || booking.location?.split(' → ')[0] || '—';
  const dropLoc       = booking.drop_location     || booking.location?.split(' → ')[1] || '—';
  const pickupTime    = booking.pickup_at
    ? new Date(booking.pickup_at).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : '—';
  const dropTime = booking.drop_at
    ? new Date(booking.drop_at).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : '—';

  const totalAmount = Number(booking.total_amount     || booking.pricing?.total    || 0);
  const subtotal    = Number(booking.subtotal         || booking.pricing?.subtotal || 0);
  const surcharge   = Number(booking.surcharge        || 0);
  const deposit     = Number(booking.security_deposit || 0);
  const gstAmount   = Number(booking.gst_amount       || 0);
  const discountAmt = Number(booking.discount_amount  || 0);

  // ── Payment breakdown (Advance Paid + Balance Due removed) ─
  const PaymentBreakdown = () => (
    <div className="space-y-6">
      <h3 className="text-[11px] font-bold text-[#6c7e96] tracking-widest uppercase">Payment Breakdown</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-[#6c7e96]">
            Subtotal ({fleetItems.length} Vehicle{fleetItems.length !== 1 ? 's' : ''})
          </span>
          <span className="font-bold text-[#151a3c]">₹{subtotal.toLocaleString()}.00</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-[#6c7e96]">Location Surcharges</span>
          <span className="font-bold text-[#151a3c]">₹{surcharge.toLocaleString()}.00</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-[#6c7e96]">Security Deposit (Refundable)</span>
          <span className="font-bold text-[#151a3c]">₹{deposit.toLocaleString()}.00</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-[#6c7e96]">GST</span>
          <span className="font-bold text-[#151a3c]">₹{gstAmount.toLocaleString()}.00</span>
        </div>
        {discountAmt > 0 && (
          <div className="flex justify-between items-center text-sm pt-1">
            <span className="font-medium text-[#6c7e96]">Discount</span>
            <span className="font-semibold text-[#10B981]">-₹{discountAmt.toLocaleString()}.00</span>
          </div>
        )}
        <div className="h-px bg-[#d1d0eb] w-full my-4" />
        {/* Total — Advance Paid and Balance Due removed */}
        <div className="flex justify-between items-center">
          <span className="text-base font-bold text-[#151a3c]">Total Amount</span>
          <span className="text-2xl font-black text-[#151a3c]">₹{totalAmount.toLocaleString()}.00</span>
        </div>
      </div>
    </div>
  );

  // ── Shared select styling ─────────────────────────────────
  const selectCls = "w-full bg-white border border-[#d1d0eb] rounded-xl py-2 px-3 text-xs font-bold text-[#151a3c] outline-none appearance-none cursor-pointer focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10 transition-all";

  return (
    <div className="min-h-screen bg-[#D3D2EC] py-10 px-4 md:px-6">
      <div className="max-w-[1280px] mx-auto flex flex-col gap-6">

        <button onClick={onBack} className="text-[#6360DF] text-sm font-bold flex items-center hover:underline w-fit">
          <ArrowLeft size={16} className="mr-1" />Back to Bookings
        </button>

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── Main Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex-[7] w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-[#d1d0eb]/30"
          >
            {/* Header */}
            <div className="px-8 md:px-10 py-6 border-b border-[#d1d0eb] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col space-y-1 text-left">
                <h1 className="text-2xl font-bold text-[#151a3c]">
                  {isConfirmation ? 'Booking Confirmed!' : 'Booking Details'}
                </h1>
                <p className="text-[#6c7e96] text-[13px] font-medium">
                  Reference ID: <span className="text-[#6360DF] font-bold">{referenceId}</span>
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-2 bg-white border border-[#d1d0eb] text-[#6c7e96] px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-[#F8F9FA] transition-colors"
                >
                  <Printer size={18} /><span>Print</span>
                </button>
                <button className="flex items-center space-x-2 bg-white border border-[#d1d0eb] text-[#6c7e96] px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-[#F8F9FA] transition-colors">
                  <Share2 size={18} /><span>Share</span>
                </button>

                {/* Edit / Cancel toggle */}
                {isEditing ? (
                  <button
                    onClick={handleEditToggle}
                    className="flex items-center space-x-2 bg-white border border-[#d1d0eb] text-[#6c7e96] px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-[#F8F9FA] transition-colors"
                  >
                    <X size={18} /><span>Cancel</span>
                  </button>
                ) : (
                  <button
                    onClick={handleEditToggle}
                    className="flex items-center space-x-2 bg-white border border-[#d1d0eb] text-[#6360DF] px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-[#EEEDFA] transition-colors"
                  >
                    <Edit size={18} /><span>Edit</span>
                  </button>
                )}

                {/* Save button — only visible in edit mode */}
                <AnimatePresence>
                  {isEditing && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center space-x-2 bg-[#6360DF] hover:bg-[#5451d0] text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-md shadow-[#6360df22] disabled:opacity-60"
                    >
                      {isSaving
                        ? <Loader2 size={16} className="animate-spin" />
                        : <Save size={16} />}
                      <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 md:p-10 space-y-10">

              {/* Customer */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-[#6c7e96] tracking-widest uppercase text-left">Customer Information</h3>
                <div className="flex items-start space-x-4 bg-[#F8F9FA] rounded-xl p-5 text-left">
                  <UserCircle size={32} className="text-[#6360DF] mt-1 shrink-0" />
                  <div className="space-y-0.5">
                    <h4 className="text-base font-bold text-[#151a3c]">{customerName}</h4>
                    <p className="text-sm font-medium text-[#6c7e96]">{customerPhone}</p>
                  </div>
                </div>
              </div>

              {/* Trip Itinerary */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-[#6c7e96] tracking-widest uppercase text-left">Trip Itinerary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#F8F9FA] rounded-lg p-5 space-y-1 text-left">
                    <span className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase">Pickup Location</span>
                    <p className="text-sm font-bold text-[#151a3c]">{pickupLoc}</p>
                    <p className="text-[13px] font-medium text-[#6c7e96]">{pickupTime}</p>
                  </div>
                  <div className="bg-[#F8F9FA] rounded-lg p-5 space-y-1 text-left">
                    <span className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase">Drop Location</span>
                    <p className="text-sm font-bold text-[#151a3c]">{dropLoc}</p>
                    <p className="text-[13px] font-medium text-[#6c7e96]">{dropTime}</p>
                  </div>
                </div>
              </div>

              {/* ── Selected Fleet ── */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-[#6c7e96] tracking-widest uppercase text-left">
                    Selected Fleet
                    {!fleetLoading && fleetItems.length > 0 && (
                      <span className="ml-2 normal-case text-[#6360DF]">
                        ({fleetItems.length} unit{fleetItems.length !== 1 ? 's' : ''})
                      </span>
                    )}
                  </h3>
                  {isEditing && (
                    <span className="text-[10px] font-bold text-[#6360DF] bg-[#EEEDFA] px-3 py-1 rounded-full tracking-wide">
                      EDITING
                    </span>
                  )}
                </div>

                {fleetLoading ? (
                  <div className="flex items-center justify-center py-8 text-[#6c7e96]">
                    <Loader2 size={18} className="animate-spin mr-2" />
                    <span className="text-sm">Loading fleet...</span>
                  </div>
                ) : fleetItems.length === 0 ? (
                  <div className="py-6 text-center text-[#6c7e96] text-sm font-medium">
                    No vehicles assigned to this booking yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fleetItems.map((item, idx) => {
                      const draft   = drafts[item.id] || { vehicleId: '', pickDriverId: '', dropDriverId: '' };
                      const modelVehicles = vehiclesByModel[item.modelId] || [];

                      // What to show for reg number
                      const displayReg = isEditing
                        ? undefined // handled by select
                        : item.vehicleId
                          ? item.registrationNo
                          : '—';

                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl border overflow-hidden transition-all ${
                            isEditing
                              ? 'border-[#6360DF]/30 bg-[#F5F4FF]'
                              : 'bg-[#F8F9FA] border-[#d1d0eb]/20'
                          }`}
                        >
                          {/* Vehicle identity row */}
                          <div className="p-4 flex items-center justify-between gap-3">
                            <div className="flex items-center space-x-4 flex-1 min-w-0">
                              {/* Unit number badge */}
                              <div className="w-10 h-10 bg-white border border-[#6360DF] rounded-lg flex items-center justify-center text-[#6360DF] font-extrabold text-sm shrink-0">
                                {idx + 1}
                              </div>
                              <div className="text-left min-w-0">
                                <h5 className="text-base font-bold text-[#151a3c] leading-tight">{item.name}</h5>
                                <p className="text-[12px] font-medium text-[#6c7e96] mt-0.5 uppercase tracking-wide">
                                  {item.details || '—'}
                                </p>
                              </div>
                            </div>

                            {/* Registration — dropdown in edit mode, badge in view mode */}
                            {isEditing ? (
                              <div className="relative w-44 shrink-0">
                                <select
                                  value={draft.vehicleId}
                                  onChange={e => updateDraft(item.id, 'vehicleId', e.target.value)}
                                  className={selectCls}
                                >
                                  <option value="">— Select Vehicle —</option>
                                  {modelVehicles.map(v => (
                                    <option key={v.id} value={v.id}>{v.registration_no}</option>
                                  ))}
                                </select>
                                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none" />
                              </div>
                            ) : (
                              <span className={`text-[11px] font-extrabold px-3 py-1.5 rounded-full tracking-widest uppercase shrink-0 ${
                                item.vehicleId
                                  ? 'bg-[#EEEDFA] text-[#6360DF]'
                                  : 'bg-slate-100 text-slate-400 italic'
                              }`}>
                                {displayReg}
                              </span>
                            )}
                          </div>

                          {/* Pick / Drop driver row */}
                          <div className="grid grid-cols-2 border-t border-[#d1d0eb]/30">
                            {/* Pick driver */}
                            <div className={`flex items-center space-x-2 px-4 py-3 border-r border-[#d1d0eb]/30 ${isEditing ? 'flex-col items-start space-x-0 space-y-1.5' : ''}`}>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[9px] font-extrabold rounded-full tracking-widest shrink-0">
                                PICK
                              </span>
                              {isEditing ? (
                                <div className="relative w-full">
                                  <select
                                    value={draft.pickDriverId}
                                    onChange={e => updateDraft(item.id, 'pickDriverId', e.target.value)}
                                    className={selectCls}
                                  >
                                    <option value="">— Not Assigned —</option>
                                    {drivers.map(d => (
                                      <option key={d.id} value={d.id}>{d.full_name}</option>
                                    ))}
                                  </select>
                                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none" />
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1.5 min-w-0">
                                  <UserIcon size={12} className="text-[#6c7e96] shrink-0" />
                                  <span className={`text-xs font-bold truncate ${item.pickDriver === '—' ? 'text-[#6c7e96] italic' : 'text-[#151a3c]'}`}>
                                    {item.pickDriver === '—' ? 'Not assigned' : item.pickDriver}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Drop driver */}
                            <div className={`flex items-center space-x-2 px-4 py-3 ${isEditing ? 'flex-col items-start space-x-0 space-y-1.5' : ''}`}>
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[9px] font-extrabold rounded-full tracking-widest shrink-0">
                                DROP
                              </span>
                              {isEditing ? (
                                <div className="relative w-full">
                                  <select
                                    value={draft.dropDriverId}
                                    onChange={e => updateDraft(item.id, 'dropDriverId', e.target.value)}
                                    className={selectCls}
                                  >
                                    <option value="">— Not Assigned —</option>
                                    {drivers.map(d => (
                                      <option key={d.id} value={d.id}>{d.full_name}</option>
                                    ))}
                                  </select>
                                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none" />
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1.5 min-w-0">
                                  <UserIcon size={12} className="text-[#6c7e96] shrink-0" />
                                  <span className={`text-xs font-bold truncate ${item.dropDriver === '—' ? 'text-[#6c7e96] italic' : 'text-[#151a3c]'}`}>
                                    {item.dropDriver === '—' ? 'Not assigned' : item.dropDriver}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Payment Breakdown */}
              <div className="pt-4 border-t border-[#d1d0eb]/30">
                <PaymentBreakdown />
              </div>
            </div>
          </motion.div>

          {/* ── Sidebar  (UNCHANGED) ── */}
          <motion.aside
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="flex-[3] w-full lg:max-w-[360px] space-y-6"
          >
            <div className="bg-white rounded-[2rem] shadow-xl border border-[#d1d0eb]/30 p-8 space-y-8 text-left">
              <h3 className="text-sm font-bold text-[#151a3c] uppercase tracking-widest">Payment Actions</h3>

              <AnimatePresence mode="wait">
                {paymentState.advanceStatus === 'pending' ? (
                  !isPaymentFormActive ? (
                    <motion.div key="pay-now-btn" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                      <button
                        onClick={() => setIsPaymentFormActive(true)}
                        className="w-full bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all active:scale-95"
                      >
                        <Lock size={18} /><span>Pay Now</span>
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div key="payment-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-6">
                      <div className="flex bg-[#F8F9FA] p-1 rounded-xl border border-[#d1d0eb]">
                        <button onClick={() => setSelectedMethod('upi')}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedMethod === 'upi' ? 'bg-white text-[#6360DF] shadow-sm' : 'text-[#6c7e96]'}`}>
                          UPI
                        </button>
                        <button onClick={() => setSelectedMethod('cash')}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedMethod === 'cash' ? 'bg-white text-[#6360DF] shadow-sm' : 'text-[#6c7e96]'}`}>
                          CASH
                        </button>
                      </div>

                      {selectedMethod === 'upi' && (
                        <div className="bg-[#EEEDFA] border border-[#6360DF]/20 rounded-xl p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-[#6360DF]">
                            <LinkIcon size={16} /><span className="text-xs font-bold">UPI Link Generated</span>
                          </div>
                          <button className="text-[#6360DF] hover:underline flex items-center space-x-1">
                            <span className="text-[11px] font-bold">Copy</span><ExternalLink size={12} />
                          </button>
                        </div>
                      )}

                      {selectedMethod === 'cash' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-[#6c7e96] uppercase">Amount</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6c7e96] text-sm">₹</span>
                              <input
                                type="number"
                                value={paymentState.cashAmount}
                                onChange={e => setPaymentState(prev => ({ ...prev, cashAmount: e.target.value }))}
                                className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 pl-10 pr-4 text-sm font-bold outline-none focus:border-[#6360DF] text-[#151a3c]"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-[#6c7e96] uppercase">Payment Type</label>
                            <div className="relative">
                              <select
                                value={paymentState.cashPaymentType}
                                onChange={e => setPaymentState(prev => ({ ...prev, cashPaymentType: e.target.value as any }))}
                                className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-medium text-[#151a3c] outline-none appearance-none cursor-pointer"
                              >
                                <option value="partial">Paid Partial</option>
                                <option value="full">Paid Full</option>
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none" size={16} />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <button
                          onClick={handleConfirmPayment}
                          className={`w-full font-bold py-4 rounded-xl flex items-center justify-center space-x-2 shadow-md transition-all active:scale-95 text-white ${selectedMethod === 'upi' ? 'bg-[#6360DF] hover:bg-[#4c47dd]' : 'bg-[#10B981] hover:bg-[#059669]'}`}
                        >
                          <CheckCircle size={18} />
                          <span>Confirm {selectedMethod.toUpperCase()} Payment</span>
                        </button>
                        <button
                          onClick={() => setIsPaymentFormActive(false)}
                          className="w-full text-center text-xs font-bold text-[#6c7e96] hover:text-[#151a3c] py-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )
                ) : (
                  <motion.div key="success-badge" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="bg-[#D1FAE5] border border-[#10B981]/20 rounded-xl p-5 space-y-4">
                    <div className="flex items-center space-x-2 text-[#059669]">
                      <CheckCircle size={16} /><span className="text-sm font-bold">Payment Recorded</span>
                    </div>
                    <div className="pt-3 border-t border-[#10B981]/20 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-[#6c7e96]">Balance Due</span>
                        <span className="text-xl font-black text-[#10B981]">₹{paymentState.balanceDue.toLocaleString()}.00</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="h-px bg-[#d1d0eb]" />

              <button className="w-full bg-white border border-[#d1d0eb] text-[#6c7e96] font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 hover:bg-slate-50 shadow-sm transition-all active:scale-[0.98]">
                <Download size={18} /><span>Download Invoice</span>
              </button>

              <div className="h-px bg-[#d1d0eb]" />

              <button onClick={onBack} className="w-full text-center text-[#6360DF] text-sm font-bold hover:underline flex items-center justify-center">
                <ArrowLeft size={14} className="mr-1" />Back to Bookings
              </button>
            </div>
          </motion.aside>
        </div>
      </div>
    </div>
  );
};

export default BookingDetails;