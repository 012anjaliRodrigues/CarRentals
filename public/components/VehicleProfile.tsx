import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Calendar, MoreVertical,
  Filter, ChevronDown, X, CheckCircle, BellRing, Loader2,
  Ban, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase, getCurrentUser } from '../supabaseClient';

// ── Types ─────────────────────────────────────────────────────
interface Booking {
  id: string;
  customer: string;
  initials: string;
  period: string;
  status: 'UPCOMING' | 'COMPLETED' | 'ONGOING' | 'BOOKED';
}

interface Reminder {
  id: string;
  title: string;
  date: string;
  status: 'ACTION REQUIRED' | 'UPCOMING' | 'OVERDUE' | 'COMPLIANT';
  rawStatus: string;
}

interface VehicleProfileProps {
  vehicle: any;
  vehicleId: string;
  instancePlate: string;
  status: 'In use' | 'Available' | 'Maintenance';
  ownerId?: string; // passed from FleetListing
  onBack: () => void;
}

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

      // Set vehicle to maintenance if blackout starts today or earlier
      if (fromDate <= today && toDate >= today) {
        await supabase.from('vehicles').update({ status: 'maintenance' }).eq('id', vehicleId);
      }

      toast.success(`Blackout set for ${plate}`);
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
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 z-10 mx-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
              <Ban size={18} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#151a3c]">Set Blackout</h3>
              <p className="text-xs text-[#6c7e96] font-medium">{plate}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-[#6c7e96] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">
                From <span className="text-red-500">*</span>
              </label>
              <input type="date" value={fromDate} min={today} onChange={e => setFromDate(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-3 text-sm font-medium text-[#151a3c] outline-none focus:border-red-400 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">
                To <span className="text-red-500">*</span>
              </label>
              <input type="date" value={toDate} min={fromDate} onChange={e => setToDate(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-3 text-sm font-medium text-[#151a3c] outline-none focus:border-red-400 transition-colors" />
            </div>
          </div>

          {/* Blackout type */}
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
              className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-medium text-[#151a3c] outline-none focus:border-[#6360DF] transition-colors" />
          </div>

          {/* Auto restore toggle */}
          <div className="flex items-center justify-between bg-[#F8F9FA] rounded-2xl px-5 py-4 border border-[#d1d0eb]">
            <div>
              <p className="text-sm font-bold text-[#151a3c]">Auto-restore after blackout ends</p>
              <p className="text-[11px] text-[#6c7e96] font-medium mt-0.5">Automatically set back to Available</p>
            </div>
            <button type="button" onClick={() => setAutoRestore(p => !p)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0 ${autoRestore ? 'bg-[#6360DF]' : 'bg-slate-300'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${autoRestore ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Buttons */}
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

// ── VehicleProfile ────────────────────────────────────────────
const VehicleProfile: React.FC<VehicleProfileProps> = ({
  vehicle, vehicleId, instancePlate, status, ownerId: ownerIdProp, onBack
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [bookingFilter, setBookingFilter] = useState<'All Bookings' | 'UPCOMING' | 'COMPLETED'>('All Bookings');
  const [ownerId, setOwnerId] = useState<string>(ownerIdProp || '');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: 'Insurance Expiry', date: '' });

  // Blackout state
  const [showBlackout, setShowBlackout] = useState(false);

  // ── Load bookings ─────────────────────────────────────────
  const loadBookings = async () => {
    setBookingsLoading(true);
    try {
      const { data, error } = await supabase
        .from('booking_details')
        .select('id, bookings ( id, customer_name, pickup_at, drop_at, status )')
        .eq('vehicle_id', vehicleId);

      if (error) { setBookingsLoading(false); return; }

      const mapped: Booking[] = ((data as any[]) || [])
        .filter((bd: any) => bd.bookings)
        .map((bd: any) => {
          const b = bd.bookings;
          const pickupDate = new Date(b.pickup_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          const dropDate   = new Date(b.drop_at).toLocaleDateString('en-IN',   { day: '2-digit', month: 'short', year: 'numeric' });
          const initials   = b.customer_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
          const displayStatus: Booking['status'] =
            b.status === 'COMPLETED' || b.status === 'CANCELLED' ? 'COMPLETED' : 'UPCOMING';
          return { id: b.id, customer: b.customer_name, initials, period: `${pickupDate} - ${dropDate}`, status: displayStatus };
        });

      mapped.sort((a, b) => (a.status === 'UPCOMING' ? -1 : 1));
      setBookings(mapped);
    } finally {
      setBookingsLoading(false);
    }
  };

  // ── Load reminders ────────────────────────────────────────
  const loadReminders = async () => {
    setRemindersLoading(true);
    try {
      const authUser = await getCurrentUser();
      if (!authUser) return;
      const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', authUser.id).single();
      if (!ownerRow) return;
      if (!ownerId) setOwnerId(ownerRow.id);

      const { data, error } = await supabase
        .from('reminders')
        .select('id, type, due_date, status, days_remaining')
        .eq('vehicle_id', vehicleId)
        .eq('owner_id', ownerRow.id)
        .order('due_date', { ascending: true });

      if (error) return;

      const mapStatus = (s: string): Reminder['status'] => {
        if (s === 'Overdue')   return 'OVERDUE';
        if (s === 'Due Soon')  return 'ACTION REQUIRED';
        if (s === 'Completed') return 'COMPLIANT';
        return 'UPCOMING';
      };

      setReminders(((data as any[]) || []).map(r => ({
        id: r.id,
        title: r.type.toUpperCase(),
        date: new Date(r.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: mapStatus(r.status),
        rawStatus: r.status,
      })));
    } finally {
      setRemindersLoading(false);
    }
  };

  useEffect(() => {
    if (vehicleId) { loadBookings(); loadReminders(); }
  }, [vehicleId]);

  // ── Add reminder ──────────────────────────────────────────
  const handleAddReminder = async () => {
    if (!newReminder.date || !ownerId) return;
    setIsSavingReminder(true);
    try {
      const dueDate  = new Date(newReminder.date);
      const today    = new Date(); today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const dbStatus = diffDays < 0 ? 'Overdue' : diffDays <= 7 ? 'Due Soon' : 'Upcoming';
      const criticalTypes = ['Insurance Expiry', 'Pollution (PUC)', 'RC Renewal', 'Permit Validity'];
      const category = criticalTypes.includes(newReminder.title) ? 'Critical' : 'Maintenance';

      const { error } = await supabase.from('reminders').insert({
        owner_id: ownerId, vehicle_id: vehicleId,
        type: newReminder.title, category,
        priority: diffDays < 0 ? 'Critical' : diffDays <= 7 ? 'High' : 'Medium',
        due_date: newReminder.date, status: dbStatus, days_remaining: diffDays,
      });

      if (error) { toast.error('Failed to add reminder: ' + error.message); return; }
      setIsModalOpen(false);
      setNewReminder({ title: 'Insurance Expiry', date: '' });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      await loadReminders();
    } finally {
      setIsSavingReminder(false);
    }
  };

  // ── Styles ────────────────────────────────────────────────
  const getHeaderStyles = () => {
    switch (status) {
      case 'In use':      return { bg: 'bg-[#DBEAFE]', text: 'text-[#1E40AF]', sub: 'text-[#1E40AF]/60', btn: 'border-[#1E40AF]/40 text-[#1E40AF] hover:bg-[#1E40AF]/10' };
      case 'Available':   return { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]', sub: 'text-[#065F46]/60', btn: 'border-[#065F46]/40 text-[#065F46] hover:bg-[#065F46]/10' };
      case 'Maintenance': return { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', sub: 'text-[#92400E]/60', btn: 'border-[#92400E]/40 text-[#92400E] hover:bg-[#92400E]/10' };
      default:            return { bg: 'bg-[#DBEAFE]', text: 'text-[#1E40AF]', sub: 'text-[#1E40AF]/60', btn: 'border-[#1E40AF]/40 text-[#1E40AF] hover:bg-[#1E40AF]/10' };
    }
  };
  const hStyles = getHeaderStyles();

  const getReminderBadge = (s: string) => {
    switch (s) {
      case 'ACTION REQUIRED': return 'bg-[#FEF3C7] text-[#D97706]';
      case 'UPCOMING':        return 'bg-[#EEEDFA] text-[#6360DF]';
      case 'OVERDUE':         return 'bg-[#FEE2E2] text-[#DC2626]';
      case 'COMPLIANT':       return 'bg-[#D1FAE5] text-[#059669]';
      default:                return 'bg-gray-100 text-gray-600';
    }
  };

  const filteredBookings = bookingFilter === 'All Bookings'
    ? bookings : bookings.filter(b => b.status === bookingFilter);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6 relative">

      {/* Success toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 20 }} exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[60] bg-[#10B981] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3">
            <CheckCircle size={20} />
            <span className="font-bold text-sm tracking-tight">Reminder Added Successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back */}
      <button onClick={onBack} className="flex items-center space-x-2 text-[#151a3c] hover:text-[#6360DF] transition-colors font-bold group w-fit">
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-lg">Back to Fleet</span>
      </button>

      {/* Profile Banner — responsive */}
      <div className={`${hStyles.bg} rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 flex items-center justify-between shadow-xl shadow-black/5 transition-colors duration-500 gap-4`}>
        <div className="space-y-2 min-w-0">
          <p className={`text-[10px] md:text-[11px] font-bold tracking-widest uppercase ${hStyles.sub} truncate`}>
            {vehicle.type || 'HATCHBACK'} • {vehicle.mfgYear || '2022'} • {vehicle.color || 'WHITE'}
          </p>
          <h1 className={`text-3xl md:text-5xl font-extrabold tracking-tighter ${hStyles.text} break-all`}>{instancePlate}</h1>
          <p className={`text-[10px] md:text-[11px] font-bold tracking-widest uppercase ${hStyles.sub} truncate`}>
            {vehicle.name} • {vehicle.transmission} • {vehicle.fuel}
          </p>
        </div>
        {/* Blackout button — wired */}
        <button
          onClick={() => setShowBlackout(true)}
          className={`shrink-0 px-5 md:px-10 py-3 md:py-4 rounded-xl md:rounded-2xl border ${hStyles.btn} text-xs md:text-sm font-extrabold transition-all uppercase tracking-widest active:scale-95`}>
          Blackout
        </button>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-6 md:gap-8 items-start">

        {/* Recent Bookings */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
          <div className="p-6 md:p-10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xl md:text-2xl font-extrabold text-[#151a3c] tracking-tight">Recent Bookings</h3>
            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 px-4 py-2 border border-[#d1d0eb] rounded-xl text-sm font-bold text-[#6c7e96] hover:bg-slate-50 transition-colors">
                <Filter size={15} /><span>Filter</span>
              </button>
              <div className="relative">
                <select value={bookingFilter} onChange={e => setBookingFilter(e.target.value as any)}
                  className="appearance-none px-4 py-2 border border-[#d1d0eb] rounded-xl text-sm font-bold text-[#151a3c] bg-white outline-none pr-8 cursor-pointer hover:bg-slate-50">
                  <option value="All Bookings">All Bookings</option>
                  <option value="UPCOMING">Upcoming</option>
                  <option value="COMPLETED">Completed</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none" />
              </div>
            </div>
          </div>

          {bookingsLoading ? (
            <div className="flex items-center justify-center py-16 text-[#6c7e96]">
              <Loader2 size={20} className="animate-spin mr-2" /><span className="text-sm font-medium">Loading bookings...</span>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="py-16 text-center text-[#6c7e96] text-sm font-medium px-6">
              {bookings.length === 0 ? 'No bookings found for this vehicle.' : 'No bookings match the selected filter.'}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/20">
                      <th className="px-10 py-5 font-bold">Customer Name</th>
                      <th className="px-4 py-5 font-bold">Booking Period</th>
                      <th className="px-4 py-5 font-bold">Status</th>
                      <th className="px-10 py-5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f8f9fc]">
                    {filteredBookings.map(booking => (
                      <tr key={booking.id} className="group hover:bg-[#f8f9fc]/50 transition-colors">
                        <td className="px-10 py-6">
                          <div className="flex items-center space-x-4">
                            <div className="w-11 h-11 rounded-full bg-[#EEEDFA] flex items-center justify-center text-[#6360DF] text-[13px] font-extrabold shrink-0">
                              {booking.initials}
                            </div>
                            <span className="font-bold text-[#151a3c] text-[15px]">{booking.customer}</span>
                          </div>
                        </td>
                        <td className="px-4 py-6">
                          <div className="flex items-center space-x-2 text-[#6c7e96] text-[13px] font-medium">
                            <Calendar size={14} className="opacity-60" /><span>{booking.period}</span>
                          </div>
                        </td>
                        <td className="px-4 py-6">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-extrabold tracking-widest ${
                            booking.status === 'UPCOMING' || booking.status === 'BOOKED' || booking.status === 'ONGOING'
                              ? 'bg-[#EEEDFA] text-[#6360DF]' : 'bg-[#D1FAE5] text-[#065F46]'
                          }`}>
                            {booking.status === 'BOOKED' || booking.status === 'ONGOING' ? 'UPCOMING' : booking.status}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <button className="p-2 text-[#cbd5e1] hover:text-[#6c7e96] transition-colors"><MoreVertical size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-[#f8f9fc]">
                {filteredBookings.map(booking => (
                  <div key={booking.id} className="p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-[#EEEDFA] flex items-center justify-center text-[#6360DF] text-[11px] font-extrabold shrink-0">
                          {booking.initials}
                        </div>
                        <span className="font-bold text-[#151a3c] text-sm">{booking.customer}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-extrabold tracking-widest ${
                        booking.status === 'UPCOMING' || booking.status === 'BOOKED' || booking.status === 'ONGOING'
                          ? 'bg-[#EEEDFA] text-[#6360DF]' : 'bg-[#D1FAE5] text-[#065F46]'
                      }`}>
                        {booking.status === 'BOOKED' || booking.status === 'ONGOING' ? 'UPCOMING' : booking.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-[#6c7e96] text-xs font-medium pl-12">
                      <Calendar size={12} className="opacity-60" /><span>{booking.period}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Critical Reminders sidebar */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-[#EEEDFA] rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 pb-8 md:pb-10 shadow-sm border border-[#d1d0eb]/30 space-y-6">
            <div className="flex items-center space-x-3 px-1">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#6360DF] shadow-sm shrink-0">
                <BellRing size={20} />
              </div>
              <h3 className="text-lg md:text-xl font-black text-[#151a3c] tracking-tight uppercase">Critical Reminders</h3>
            </div>

            {remindersLoading ? (
              <div className="flex items-center justify-center py-8 text-[#6c7e96]">
                <Loader2 size={18} className="animate-spin mr-2" /><span className="text-sm font-medium">Loading...</span>
              </div>
            ) : reminders.length === 0 ? (
              <div className="py-6 text-center text-[#6c7e96] text-sm font-medium">No reminders set for this vehicle.</div>
            ) : (
              <div className="space-y-4">
                {reminders.map(reminder => (
                  <div key={reminder.id} className="bg-white rounded-2xl p-5 shadow-sm border border-[#d1d0eb]/10 flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <p className="text-[9px] font-bold text-[#6c7e96] tracking-widest uppercase truncate">{reminder.title}</p>
                      <h4 className="font-extrabold text-[#151a3c] text-base">{reminder.date}</h4>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase shrink-0 ${getReminderBadge(reminder.status)}`}>
                      {reminder.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setIsModalOpen(true)}
              className="w-full bg-[#6360DF] hover:bg-[#5451d0] text-white font-black py-4 rounded-2xl shadow-lg shadow-[#6360df33] flex items-center justify-center transition-all active:scale-[0.98] uppercase tracking-widest text-sm">
              Add New Reminder
            </button>
          </div>
        </div>
      </div>

      {/* ── Add Reminder Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[51] bg-white rounded-[2rem] p-8 md:p-10 w-[calc(100%-2rem)] max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl md:text-2xl font-extrabold text-[#151a3c]">Add Reminder</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-[#6c7e96] hover:bg-slate-50 rounded-xl"><X size={20} /></button>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase">Reminder Type</label>
                  <select value={newReminder.title} onChange={e => setNewReminder({ ...newReminder, title: e.target.value })}
                    className="w-full bg-[#f8f9fc] border border-[#d1d0eb] rounded-xl py-4 px-4 text-[#151a3c] font-bold outline-none appearance-none cursor-pointer">
                    <option>Insurance Expiry</option>
                    <option>Oil Change Due</option>
                    <option>Pollution (PUC)</option>
                    <option>RC Renewal</option>
                    <option>Permit Validity</option>
                    <option>General Service</option>
                    <option>Battery Replacement</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase">Due Date</label>
                  <input type="date" value={newReminder.date} onChange={e => setNewReminder({ ...newReminder, date: e.target.value })}
                    className="w-full bg-[#f8f9fc] border border-[#d1d0eb] rounded-xl py-4 px-4 text-[#151a3c] font-bold outline-none" />
                </div>
                <button onClick={handleAddReminder} disabled={!newReminder.date || isSavingReminder}
                  className="w-full bg-[#6360DF] text-white font-extrabold py-5 rounded-2xl shadow-lg shadow-[#6360df33] hover:bg-[#5451d0] disabled:opacity-50 transition-all uppercase tracking-widest flex items-center justify-center space-x-2">
                  {isSavingReminder && <Loader2 size={18} className="animate-spin" />}
                  <span>{isSavingReminder ? 'Saving...' : 'Set Reminder'}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Blackout Popup ── */}
      <AnimatePresence>
        {showBlackout && ownerId && (
          <BlackoutPopup
            vehicleId={vehicleId}
            plate={instancePlate}
            ownerId={ownerId}
            onClose={() => setShowBlackout(false)}
            onSaved={() => {}}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VehicleProfile;