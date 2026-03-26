import React, { useState, useEffect } from 'react';
import {
  Search, UserPlus, Eye, Pencil, Trash2, ChevronDown,
  Loader2, ArrowLeft, Phone, CreditCard, Car,
  MapPin, Clock, Calendar, CheckCircle2, X, Filter, SlidersHorizontal,
  RefreshCw, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase, getCurrentUser } from '../supabaseClient';
import AddDriver from './AddDriver';

interface DriverRow {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  avatarTextColor: string;
  phone: string;
  licenseNo: string;
  trip: string;
  currentLocation: string;
  currentBooking: string;
  locationType: 'Pick' | 'Drop' | null;
  vehicleReg: string;
  driverStatus: 'On Trip' | 'Allocated' | 'Available' | 'Inactive';
  dbStatus: string;
  allocationDateTime: string | null;
}

interface AllocationDetail {
  id: string;
  type: 'Pick' | 'Drop';
  location: string;
  dateTime: string;
  customer: string;
  vehicle: string;
  vehicleReg: string;
  bookingStatus: string;
}

interface TripHistory {
  id: string;
  customer: string;
  vehicle: string;
  vehicleReg: string;
  pickupDate: string;
  dropDate: string;
  locationType: 'Pick' | 'Drop';
  bookingStatus: string;
}

interface DriverDetail {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  avatarTextColor: string;
  phone: string;
  licenseNo: string;
  location: string;
  dbStatus: string;
  driverStatus: 'On Trip' | 'Allocated' | 'Available' | 'Inactive';
}

// ── Edit form state ───────────────────────────────────────────
interface EditForm {
  full_name: string;
  phone: string;
  license_no: string;
  current_location: string;
}

const AVATAR_COLORS = [
  { bg: '#D1FAE5', text: '#059669' },
  { bg: '#EEEDFA', text: '#6360DF' },
  { bg: '#F3F4F6', text: '#6c7e96' },
  { bg: '#FEF3C7', text: '#D97706' },
  { bg: '#FEE2E2', text: '#DC2626' },
  { bg: '#DBEAFE', text: '#1E40AF' },
];

const getStatusStyle = (s: DriverRow['driverStatus']) => {
  switch (s) {
    case 'On Trip':   return { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' };
    case 'Allocated': return { bg: 'bg-[#EEEDFA]',  text: 'text-[#6360DF]', dot: 'bg-[#6360DF]' };
    case 'Available': return { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' };
    case 'Inactive':  return { bg: 'bg-slate-100',  text: 'text-slate-500',  dot: 'bg-slate-400' };
  }
};

const inputCls = 'w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-2 px-3 text-sm font-medium text-[#151a3c] outline-none focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10 transition-all';
const labelCls = 'text-[10px] font-bold text-[#6c7e96] uppercase tracking-wider';

// ── DriverProfilePage ─────────────────────────────────────────
const DriverProfilePage: React.FC<{ driverId: string; onBack: () => void }> = ({ driverId, onBack }) => {
  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [allocations, setAllocations] = useState<AllocationDetail[]>([]);
  const [tripHistory, setTripHistory] = useState<TripHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const loadDriverProfile = async (date: string) => {
    setLoading(true);
    try {
      const authUser = await getCurrentUser();
      if (!authUser) return;
      const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', authUser.id).single();
      if (!ownerRow) return;

      const { data: driverData } = await supabase
        .from('drivers').select('id, full_name, phone, license_no, current_location, status')
        .eq('id', driverId).single();

      if (driverData) {
        const initials = driverData.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
        const colorIdx = driverData.full_name.charCodeAt(0) % AVATAR_COLORS.length;
        const color = AVATAR_COLORS[colorIdx];
        setDriver({
          id: driverData.id, name: driverData.full_name, initials,
          avatarColor: color.bg, avatarTextColor: color.text,
          phone: driverData.phone, licenseNo: driverData.license_no,
          location: driverData.current_location || 'Not Assigned',
          dbStatus: driverData.status,
          driverStatus: driverData.status === 'active' ? 'Available' : 'Inactive',
        });
      }

      const dayStart = `${date}T00:00:00`;
      const dayEnd   = `${date}T23:59:59`;

      const { data: allocData } = await supabase
        .from('allocations')
        .select(`id, type, location, date_time, is_confirmed,
          booking_details (
            vehicle_id,
            vehicles ( registration_no, models ( brand, name ) ),
            bookings ( customer_name, status )
          )`)
        .eq('driver_id', driverId)
        .gte('date_time', dayStart).lte('date_time', dayEnd)
        .order('date_time', { ascending: true });

      setAllocations(((allocData as any[]) || []).map((a: any) => ({
        id: a.id, type: a.type, location: a.location || '—',
        dateTime: a.date_time
          ? new Date(a.date_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
          : '—',
        customer: a.booking_details?.bookings?.customer_name || '—',
        vehicle: a.booking_details?.vehicles?.models
          ? `${a.booking_details.vehicles.models.brand} ${a.booking_details.vehicles.models.name}`
          : '—',
        vehicleReg: a.booking_details?.vehicles?.registration_no || '—',
        bookingStatus: a.booking_details?.bookings?.status || '—',
      })));

      const { data: histData } = await supabase
        .from('allocations')
        .select(`id, type,
          booking_details (
            vehicles ( registration_no, models ( brand, name ) ),
            bookings ( customer_name, pickup_at, drop_at, status )
          )`)
        .eq('driver_id', driverId)
        .order('date_time', { ascending: false });

      setTripHistory(((histData as any[]) || [])
        .filter((a: any) => a.booking_details?.bookings)
        .map((a: any) => ({
          id: a.id,
          customer: a.booking_details.bookings.customer_name,
          vehicle: a.booking_details.vehicles?.models
            ? `${a.booking_details.vehicles.models.brand} ${a.booking_details.vehicles.models.name}`
            : '—',
          vehicleReg: a.booking_details.vehicles?.registration_no || '—',
          pickupDate: a.booking_details.bookings.pickup_at
            ? new Date(a.booking_details.bookings.pickup_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—',
          dropDate: a.booking_details.bookings.drop_at
            ? new Date(a.booking_details.bookings.drop_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—',
          locationType: a.type,
          bookingStatus: a.booking_details.bookings.status,
        })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadDriverProfile(selectedDate); }, [driverId, selectedDate]);

  const todaysAllocCount  = allocations.length;
  const completedTrips    = tripHistory.filter(t => t.bookingStatus === 'COMPLETED').length;

  const bookingStatusBadge = (s: string) => {
    switch (s) {
      case 'ONGOING':   return 'bg-blue-100 text-blue-700';
      case 'BOOKED':    return 'bg-[#EEEDFA] text-[#6360DF]';
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      case 'CANCELLED': return 'bg-red-100 text-red-600';
      default:          return 'bg-slate-100 text-slate-500';
    }
  };

  if (loading && !driver) return (
    <div className="flex items-center justify-center py-32 text-[#6c7e96]">
      <Loader2 size={24} className="animate-spin mr-2" />
      <span className="text-sm font-medium">Loading driver profile...</span>
    </div>
  );

  const statusStyle = driver ? getStatusStyle(driver.driverStatus) : null;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 pb-10">
      <button onClick={onBack} className="flex items-center space-x-2 text-[#151a3c] hover:text-[#6360DF] transition-colors font-bold group">
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-lg">Back to Drivers</span>
      </button>

      {driver && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-[#d1d0eb]/30 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-2xl font-extrabold shrink-0"
                style={{ backgroundColor: driver.avatarColor, color: driver.avatarTextColor }}>
                {driver.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-extrabold text-[#151a3c] tracking-tight">{driver.name}</h2>
                  {statusStyle && (
                    <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-extrabold tracking-widest ${statusStyle.bg} ${statusStyle.text}`}>
                      <div className={`w-2 h-2 rounded-full mr-1.5 ${statusStyle.dot}`} />
                      {driver.driverStatus.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  <div className="flex items-center space-x-1.5 text-sm font-medium text-[#6c7e96]">
                    <Phone size={14} className="text-[#6360DF]" /><span>{driver.phone}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-sm font-medium text-[#6c7e96]">
                    <CreditCard size={14} className="text-[#6360DF]" /><span>{driver.licenseNo}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-sm font-medium text-[#6c7e96]">
                    <MapPin size={14} className="text-[#6360DF]" /><span>{driver.location}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex flex-col items-center bg-blue-50 rounded-2xl px-6 py-4 min-w-[110px]">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest whitespace-nowrap">Today's</span>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest whitespace-nowrap">Allocations</span>
                <span className="text-3xl font-black text-blue-600 mt-0.5">{todaysAllocCount}</span>
              </div>
              <div className="w-px h-12 bg-[#d1d0eb]/40 hidden sm:block" />
              <div className="flex flex-col items-center bg-green-50 rounded-2xl px-6 py-4 min-w-[110px]">
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest whitespace-nowrap">Completed</span>
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest whitespace-nowrap">Trips</span>
                <span className="text-3xl font-black text-green-600 mt-0.5">{completedTrips}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Allocations */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-[#151a3c]">Daily Allocations</h3>
            <p className="text-xs text-[#6c7e96] font-medium mt-0.5">Pick & Drop assignments for the selected date</p>
          </div>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6360DF]" />
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-2.5 pl-9 pr-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all" />
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[#6c7e96]">
              <Loader2 size={18} className="animate-spin mr-2" /><span className="text-sm font-medium">Loading...</span>
            </div>
          ) : allocations.length === 0 ? (
            <div className="py-12 text-center text-[#6c7e96] text-sm font-medium">
              No allocations for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-slate-50">
                  <th className="pl-8 py-4 font-bold">Type</th>
                  <th className="px-4 py-4 font-bold">Customer</th>
                  <th className="px-4 py-4 font-bold">Vehicle</th>
                  <th className="px-4 py-4 font-bold">Location</th>
                  <th className="px-4 py-4 font-bold">Time</th>
                  <th className="pr-8 py-4 font-bold">Booking Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {allocations.map((a, i) => (
                  <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    className="hover:bg-[#f8f9fc] transition-colors">
                    <td className="py-4 pl-8 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest ${a.type === 'Pick' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                        {a.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-[#151a3c] text-sm whitespace-nowrap">{a.customer}</td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <p className="font-bold text-[#151a3c] text-sm">{a.vehicle}</p>
                      <p className="text-[10px] text-[#6c7e96] font-medium">{a.vehicleReg}</p>
                    </td>
                    <td className="py-4 px-4 text-sm font-medium text-[#6c7e96] whitespace-nowrap">
                      <div className="flex items-center space-x-1.5"><MapPin size={11} className="text-[#6360DF]" /><span>{a.location}</span></div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 text-sm font-bold text-[#151a3c]">
                        <Clock size={11} className="text-[#6c7e96]" /><span>{a.dateTime}</span>
                      </div>
                    </td>
                    <td className="py-4 pr-8 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest ${bookingStatusBadge(a.bookingStatus)}`}>
                        {a.bookingStatus}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Trip History */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50">
          <h3 className="text-lg font-extrabold text-[#151a3c]">Trip History</h3>
          <p className="text-xs text-[#6c7e96] font-medium mt-0.5">All bookings this driver was allocated to</p>
        </div>
        <div className="overflow-x-auto">
          {tripHistory.length === 0 ? (
            <div className="py-12 text-center text-[#6c7e96] text-sm font-medium">No trip history found.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-slate-50">
                  <th className="pl-8 py-4 font-bold">Customer</th>
                  <th className="px-4 py-4 font-bold">Vehicle</th>
                  <th className="px-4 py-4 font-bold">Type</th>
                  <th className="px-4 py-4 font-bold">Period</th>
                  <th className="pr-8 py-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tripHistory.map((t, i) => (
                  <motion.tr key={`${t.id}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="hover:bg-[#f8f9fc] transition-colors">
                    <td className="py-4 pl-8 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-[#EEEDFA] flex items-center justify-center text-[#6360DF] text-[10px] font-extrabold">
                          {t.customer.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-[#151a3c] text-sm">{t.customer}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <p className="font-bold text-[#151a3c] text-sm">{t.vehicle}</p>
                      <p className="text-[10px] text-[#6c7e96] font-medium">{t.vehicleReg}</p>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest ${t.locationType === 'Pick' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                        {t.locationType.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 text-xs font-medium text-[#6c7e96]">
                        <Calendar size={11} /><span>{t.pickupDate} → {t.dropDate}</span>
                      </div>
                    </td>
                    <td className="py-4 pr-8 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest ${bookingStatusBadge(t.bookingStatus)}`}>
                        {t.bookingStatus}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── DriversPage ───────────────────────────────────────────────
const DriversPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'list' | 'add' | 'profile'>('list');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [driversData, setDriversData] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ full_name: '', phone: '', license_no: '', current_location: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterLocationType, setFilterLocationType] = useState('All');
  const [ownerId, setOwnerId] = useState('');

  const loadDrivers = async (date: string, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const authUser = await getCurrentUser();
    if (!authUser) { setLoading(false); setRefreshing(false); return; }
    const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', authUser.id).single();
    if (!ownerRow) { setLoading(false); setRefreshing(false); return; }
    setOwnerId(ownerRow.id);

    const { data: drivers, error } = await supabase
      .from('drivers')
      .select('id, full_name, phone, license_no, current_location, status')
      .eq('owner_id', ownerRow.id);

    if (error) { toast.error('Failed to load drivers.'); setLoading(false); setRefreshing(false); return; }

    // ── Fix: fetch allocations whose booking OVERLAPS the selected date ──
    // A driver is "on booking" if the booking's pickup_at ≤ selectedDate ≤ drop_at
    // We do this by fetching all confirmed allocations and joining booking dates,
    // then filtering client-side for the date range overlap.
    const { data: allocations } = await supabase
      .from('allocations')
      .select(`
        driver_id, type, location, date_time, is_confirmed,
        booking_details (
          vehicles ( registration_no, models ( brand, name ) ),
          bookings ( customer_name, pickup_at, drop_at, status )
        )
      `)
      .eq('owner_id', ownerRow.id)
      .eq('is_confirmed', true)
      .in('booking_details.bookings.status', ['BOOKED', 'ONGOING'])
      .order('date_time', { ascending: true });

    // Filter: booking overlaps selectedDate
    const selectedISO = new Date(date).toISOString().split('T')[0];

    const allocMap: Record<string, {
      customer: string; vehicle: string; type: 'Pick' | 'Drop';
      bookingStatus: string; location: string; dateTime: string;
      vehicleReg: string;
    }> = {};

    ((allocations as any[]) || []).forEach((a: any) => {
      const booking = a.booking_details?.bookings;
      if (!booking) return;
      const pickupDate = booking.pickup_at?.split('T')[0];
      const dropDate   = booking.drop_at?.split('T')[0];
      // Booking overlaps selected date
      if (!pickupDate || !dropDate) return;
      if (selectedISO < pickupDate || selectedISO > dropDate) return;

      // Only store first (most relevant) allocation per driver
      if (!allocMap[a.driver_id]) {
        allocMap[a.driver_id] = {
          customer: booking.customer_name || '—',
          vehicle: a.booking_details?.vehicles?.models
            ? `${a.booking_details.vehicles.models.brand} ${a.booking_details.vehicles.models.name}`
            : '—',
          type: a.type,
          bookingStatus: booking.status || '',
          location: a.location || '—',
          dateTime: a.date_time,
          vehicleReg: a.booking_details?.vehicles?.registration_no || '—',
        };
      }
    });

    const mapped: DriverRow[] = ((drivers as any[]) || []).map((d: any) => {
      const initials = d.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
      const colorIdx = d.full_name.charCodeAt(0) % AVATAR_COLORS.length;
      const color = AVATAR_COLORS[colorIdx];
      const alloc = allocMap[d.id];

      let driverStatus: DriverRow['driverStatus'] = 'Available';
      if (d.status !== 'active') driverStatus = 'Inactive';
      else if (alloc) driverStatus = alloc.bookingStatus === 'ONGOING' ? 'On Trip' : 'Allocated';

      return {
        id: d.id, name: d.full_name, initials,
        avatarColor: color.bg, avatarTextColor: color.text,
        phone: d.phone, licenseNo: d.license_no,
        trip: '—',
        currentLocation: alloc?.location || d.current_location || 'Not Assigned',
        currentBooking: alloc?.customer || 'Not Assigned',
        locationType: alloc?.type || null,
        vehicleReg: alloc?.vehicleReg || '—',
        driverStatus, dbStatus: d.status,
        allocationDateTime: alloc?.dateTime || null,
      };
    });

    mapped.sort((a, b) => {
      if (a.allocationDateTime && b.allocationDateTime)
        return new Date(a.allocationDateTime).getTime() - new Date(b.allocationDateTime).getTime();
      if (a.allocationDateTime) return -1;
      if (b.allocationDateTime) return 1;
      return 0;
    });

    setDriversData(mapped);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadDrivers(selectedDate); }, [selectedDate]);

  // ── Edit handlers ────────────────────────────────────────────
  const startEdit = (driver: DriverRow) => {
    setEditingId(driver.id);
    setEditForm({
      full_name:        driver.name,
      phone:            driver.phone,
      license_no:       driver.licenseNo,
      current_location: driver.currentLocation === 'Not Assigned' ? '' : driver.currentLocation,
    });
    setConfirmDeleteId(null); // close delete confirm if open
  };

  const cancelEdit = () => { setEditingId(null); };

  const saveEdit = async () => {
    if (!editForm.full_name.trim()) { toast.error('Name is required.'); return; }
    if (!editForm.phone.trim())     { toast.error('Phone is required.'); return; }
    setSavingEdit(true);
    try {
      const { error } = await supabase.from('drivers').update({
        full_name:        editForm.full_name.trim(),
        phone:            editForm.phone.trim(),
        license_no:       editForm.license_no.trim() || null,
        current_location: editForm.current_location.trim() || null,
        updated_at:       new Date().toISOString(),
      }).eq('id', editingId!);

      if (error) { toast.error('Failed to save: ' + error.message); return; }
      toast.success('Driver updated!');
      setEditingId(null);
      await loadDrivers(selectedDate, true);
    } finally { setSavingEdit(false); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('drivers').delete().eq('id', id);
    if (error) { toast.error('Failed to delete driver.'); return; }
    toast.success('Driver deleted.');
    setDriversData(prev => prev.filter(d => d.id !== id));
    setConfirmDeleteId(null);
  };

  const handleToggleStatus = async (driver: DriverRow) => {
    const newStatus = driver.dbStatus === 'active' ? 'inactive' : 'active';
    setTogglingId(driver.id);
    const { error } = await supabase.from('drivers').update({ status: newStatus }).eq('id', driver.id);
    if (error) { toast.error('Failed to update driver status.'); setTogglingId(null); return; }
    toast.success(`Driver marked ${newStatus === 'active' ? 'Active' : 'Inactive'}.`);
    await loadDrivers(selectedDate, true);
    setTogglingId(null);
  };

  const activeFilterCount = [filterStatus !== 'All', filterLocationType !== 'All'].filter(Boolean).length;

  const filtered = driversData
    .filter(d => filterStatus === 'All' || d.driverStatus === filterStatus)
    .filter(d => filterLocationType === 'All' || d.locationType === filterLocationType || (filterLocationType === 'None' && !d.locationType))
    .filter(d =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.phone.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const COL_SPAN = 7;

  return (
    <div className="min-h-full">
      <AnimatePresence mode="wait">
        {view === 'profile' && (
          <DriverProfilePage key="profile" driverId={selectedDriverId} onBack={() => setView('list')} />
        )}
        {view === 'add' && (
          <AddDriver key="add" onSave={async () => { await loadDrivers(selectedDate); setView('list'); }} onCancel={() => setView('list')} />
        )}
        {view === 'list' && (
          <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-[24px] font-extrabold text-[#151a3c] tracking-tight">Drivers</h2>
                <p className="text-[#6c7e96] text-sm font-medium mt-1">Manage your fleet of drivers and their assignments</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative group w-[260px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cbd5e1] w-4 h-4 group-focus-within:text-[#6360DF] transition-colors" />
                  <input type="text" placeholder="Search drivers..."
                    className="w-full bg-white border border-[#d1d0eb] rounded-full py-2.5 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all"
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>

                {/* Date picker */}
                <div className="flex items-center space-x-2 bg-white px-4 py-2.5 rounded-xl border border-[#d1d0eb]">
                  <Calendar size={15} className="text-[#6c7e96] shrink-0" />
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                    className="outline-none bg-transparent text-sm font-semibold text-[#151a3c] cursor-pointer w-[116px]" />
                </div>

                {/* Refresh button */}
                <button
                  onClick={() => loadDrivers(selectedDate, true)}
                  disabled={refreshing}
                  title="Refresh"
                  className="flex items-center justify-center w-10 h-10 bg-white border border-[#d1d0eb] rounded-xl text-[#6c7e96] hover:text-[#6360DF] hover:border-[#6360DF] transition-all disabled:opacity-60"
                >
                  <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                </button>

                {/* Filters */}
                <button
                  onClick={() => setShowFilters(prev => !prev)}
                  className={`relative flex items-center space-x-2 px-5 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                    showFilters || activeFilterCount > 0
                      ? 'bg-[#6360DF] text-white border-[#6360DF] shadow-md shadow-[#6360df33]'
                      : 'bg-white border-[#d1d0eb] text-[#6c7e96] hover:border-[#6360DF] hover:text-[#6360DF]'
                  }`}
                >
                  <SlidersHorizontal size={15} />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-[#6360DF] text-[9px] font-extrabold rounded-full flex items-center justify-center border border-[#6360DF]">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <button onClick={() => setView('add')}
                  className="bg-[#6360DF] hover:bg-[#5451d0] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-[#6360df33] transition-all flex items-center space-x-2">
                  <UserPlus size={18} /><span>Add Driver</span>
                </button>
              </div>
            </div>

            {/* Filter Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="bg-white border border-[#d1d0eb]/50 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center space-x-2">
                        <SlidersHorizontal size={15} className="text-[#6360DF]" />
                        <span className="text-sm font-extrabold text-[#151a3c]">Filter Drivers</span>
                      </div>
                      {activeFilterCount > 0 && (
                        <button onClick={() => { setFilterStatus('All'); setFilterLocationType('All'); }}
                          className="text-[11px] font-bold text-red-500 hover:text-red-700 flex items-center space-x-1 transition-colors">
                          <X size={12} /><span>Clear All</span>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Driver Status</label>
                        <div className="flex flex-wrap gap-2">
                          {['All', 'On Trip', 'Allocated', 'Available', 'Inactive'].map(s => (
                            <button key={s} onClick={() => setFilterStatus(s)}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-wide transition-all ${
                                filterStatus === s ? 'bg-[#6360DF] text-white' : 'bg-[#F8F9FA] text-[#6c7e96] hover:bg-[#EEEDFA] hover:text-[#6360DF]'
                              }`}>{s}</button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Location Type</label>
                        <div className="flex flex-wrap gap-2">
                          {['All', 'Pick', 'Drop', 'None'].map(t => (
                            <button key={t} onClick={() => setFilterLocationType(t)}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-wide transition-all ${
                                filterLocationType === t
                                  ? t === 'Pick' ? 'bg-blue-500 text-white' : t === 'Drop' ? 'bg-orange-500 text-white' : 'bg-[#6360DF] text-white'
                                  : 'bg-[#F8F9FA] text-[#6c7e96] hover:bg-[#EEEDFA] hover:text-[#6360DF]'
                              }`}>{t}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Table */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#F8F9FA]/50 text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/20">
                      <th className="pl-10 py-5 font-bold">Driver Name</th>
                      <th className="px-6 py-5 font-bold">Phone</th>
                      <th className="px-6 py-5 font-bold">Trip</th>
                      <th className="px-6 py-5 font-bold">Booking / Type / Location</th>
                      <th className="px-6 py-5 font-bold">Vehicle No.</th>
                      <th className="px-6 py-5 font-bold">Active</th>
                      <th className="px-10 py-5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d1d0eb]/10">
                    {loading ? (
                      <tr><td colSpan={COL_SPAN} className="py-16 text-center">
                        <div className="flex items-center justify-center text-[#6c7e96]">
                          <Loader2 size={22} className="animate-spin mr-2" />
                          <span className="text-sm font-medium">Loading drivers...</span>
                        </div>
                      </td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={COL_SPAN} className="py-16 text-center text-[#6c7e96] text-sm font-medium">
                        {driversData.length === 0 ? 'No drivers added yet. Click "Add Driver" to get started.' : 'No drivers match your search or filters.'}
                      </td></tr>
                    ) : (
                      filtered.map(driver => (
                        <React.Fragment key={driver.id}>
                          <tr className={`group transition-colors ${editingId === driver.id ? 'bg-[#f8f7ff]' : 'hover:bg-[#F8F9FA]'}`}>

                            {/* Driver Name */}
                            <td className="py-5 pl-10 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0"
                                  style={{ backgroundColor: driver.avatarColor, color: driver.avatarTextColor }}>{driver.initials}</div>
                                <span className="ml-3 font-bold text-[#151a3c] text-sm">{driver.name}</span>
                              </div>
                            </td>

                            {/* Phone */}
                            <td className="py-5 px-6 text-sm font-medium text-[#151a3c] whitespace-nowrap">{driver.phone}</td>

                            {/* Trip */}
                            <td className="py-5 px-6 whitespace-nowrap">
                              <span className="text-sm font-medium text-[#6c7e96] italic">—</span>
                            </td>

                            {/* Booking / Type / Location */}
                            <td className="py-5 px-6 whitespace-nowrap">
                              {driver.currentBooking === 'Not Assigned' ? (
                                <span className="text-sm font-medium text-[#6c7e96] italic">Not Assigned</span>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-sm font-bold text-[#151a3c]">{driver.currentBooking}</p>
                                  <div className="flex items-center space-x-2">
                                    {driver.locationType && (
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-widest ${driver.locationType === 'Pick' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                        {driver.locationType.toUpperCase()}
                                      </span>
                                    )}
                                    <div className="flex items-center space-x-1 text-[10px] font-medium text-[#6c7e96]">
                                      <MapPin size={9} className="text-[#6360DF] shrink-0" />
                                      <span>{driver.currentLocation}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Vehicle No. */}
                            <td className="py-5 px-6 whitespace-nowrap">
                              {driver.vehicleReg === '—' ? (
                                <span className="text-sm font-medium text-[#6c7e96]">—</span>
                              ) : (
                                <span className="bg-[#EEEDFA] text-[#6360DF] text-[11px] font-extrabold px-3 py-1 rounded-full tracking-widest uppercase">
                                  {driver.vehicleReg}
                                </span>
                              )}
                            </td>

                            {/* Active  toggle */}
                            <td className="py-5 px-6 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {togglingId === driver.id ? (
                                  <Loader2 size={14} className="animate-spin text-[#6360DF]" />
                                ) : (
                                  <button onClick={() => handleToggleStatus(driver)}
                                    className={`relative w-10 h-5 rounded-full transition-colors duration-300 shrink-0 ${driver.dbStatus === 'active' ? 'bg-[#6360DF]' : 'bg-slate-300'}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${driver.dbStatus === 'active' ? 'left-5' : 'left-0.5'}`} />
                                  </button>
                                )}
                                <span className={`text-[10px] font-extrabold tracking-widest ${driver.dbStatus === 'active' ? 'text-[#6360DF]' : 'text-slate-400'}`}>
                                  {driver.dbStatus === 'active' ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-5 px-10 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end space-x-3">
                                <button onClick={() => { setSelectedDriverId(driver.id); setView('profile'); }}
                                  className="text-[#6c7e96] hover:text-[#6360DF] transition-colors"><Eye size={18} /></button>
                                <button
                                  onClick={() => editingId === driver.id ? cancelEdit() : startEdit(driver)}
                                  className={`transition-colors ${editingId === driver.id ? 'text-[#6360DF]' : 'text-[#6c7e96] hover:text-[#6360DF]'}`}>
                                  <Pencil size={18} />
                                </button>
                                <button onClick={() => setConfirmDeleteId(driver.id)}
                                  className="text-[#6c7e96] hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                              </div>
                            </td>
                          </tr>

                          {/* ── Inline Edit Row ── */}
                          <AnimatePresence>
                            {editingId === driver.id && (
                              <motion.tr key="edit-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <td colSpan={COL_SPAN} className="bg-[#f8f7ff] border-t border-[#d1d0eb]/30 px-10 py-5">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div className="space-y-1.5">
                                      <label className={labelCls}>Full Name *</label>
                                      <input className={inputCls} value={editForm.full_name}
                                        onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                                        placeholder="Full name" />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className={labelCls}>Phone *</label>
                                      <input className={inputCls} value={editForm.phone}
                                        onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                                        placeholder="+91 98765 43210" />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className={labelCls}>License No.</label>
                                      <input className={inputCls} value={editForm.license_no}
                                        onChange={e => setEditForm(f => ({ ...f, license_no: e.target.value }))}
                                        placeholder="DL-XXXXXXXXXXXX" />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className={labelCls}>Current Location</label>
                                      <input className={inputCls} value={editForm.current_location}
                                        onChange={e => setEditForm(f => ({ ...f, current_location: e.target.value }))}
                                        placeholder="e.g. Mapusa" />
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <button onClick={cancelEdit}
                                      className="flex items-center space-x-1.5 border border-[#d1d0eb] text-[#6c7e96] px-5 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
                                      <X size={12} /><span>Cancel</span>
                                    </button>
                                    <button onClick={saveEdit} disabled={savingEdit}
                                      className="flex items-center space-x-1.5 bg-[#6360DF] hover:bg-[#5451d0] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#6360df22] transition-all disabled:opacity-60">
                                      {savingEdit ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                      <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
                                    </button>
                                  </div>
                                </td>
                              </motion.tr>
                            )}
                          </AnimatePresence>

                          {/* ── Delete Confirm Row ── */}
                          <AnimatePresence>
                            {confirmDeleteId === driver.id && (
                              <motion.tr key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <td colSpan={COL_SPAN} className="bg-red-50 border-t border-red-100 px-10 py-4">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold text-red-700">Delete <span className="font-extrabold">{driver.name}</span>? This cannot be undone.</p>
                                    <div className="flex items-center space-x-3">
                                      <button onClick={() => setConfirmDeleteId(null)}
                                        className="px-4 py-2 text-sm font-bold text-[#6c7e96] bg-white border border-[#d1d0eb] rounded-lg hover:bg-slate-50 transition-all">Cancel</button>
                                      <button onClick={() => handleDelete(driver.id)}
                                        className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all">Yes, Delete</button>
                                    </div>
                                  </div>
                                </td>
                              </motion.tr>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


export default DriversPage;