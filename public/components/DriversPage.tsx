import React, { useState, useEffect } from 'react';
import {
  Search, UserPlus, Eye, Pencil, Trash2, ChevronDown,
  Loader2, ArrowLeft, Phone, CreditCard, Car,
  MapPin, Clock, Calendar, CheckCircle2, X
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
  date: string;
  currentLocation: string;
  currentBooking: string;
  locationType: 'Pick' | 'Drop' | null;
  driverStatus: 'On Trip' | 'Allocated' | 'Available' | 'Inactive';
  allocationDateTime: string | null; // for sorting
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
        dateTime: a.date_time ? new Date(a.date_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—',
        customer: a.booking_details?.bookings?.customer_name || '—',
        vehicle: a.booking_details?.vehicles?.models ? `${a.booking_details.vehicles.models.brand} ${a.booking_details.vehicles.models.name}` : '—',
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
          vehicle: a.booking_details.vehicles?.models ? `${a.booking_details.vehicles.models.brand} ${a.booking_details.vehicles.models.name}` : '—',
          vehicleReg: a.booking_details.vehicles?.registration_no || '—',
          pickupDate: a.booking_details.bookings.pickup_at ? new Date(a.booking_details.bookings.pickup_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
          dropDate: a.booking_details.bookings.drop_at ? new Date(a.booking_details.bookings.drop_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
          locationType: a.type,
          bookingStatus: a.booking_details.bookings.status,
        })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadDriverProfile(selectedDate); }, [driverId, selectedDate]);

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
      <Loader2 size={24} className="animate-spin mr-2" /><span className="text-sm font-medium">Loading driver profile...</span>
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
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-[#d1d0eb]/30 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-2xl font-extrabold shrink-0"
              style={{ backgroundColor: driver.avatarColor, color: driver.avatarTextColor }}>{driver.initials}</div>
            <div>
              <h2 className="text-2xl font-extrabold text-[#151a3c] tracking-tight">{driver.name}</h2>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <div className="flex items-center space-x-1.5 text-sm font-medium text-[#6c7e96]"><Phone size={14} className="text-[#6360DF]" /><span>{driver.phone}</span></div>
                <div className="flex items-center space-x-1.5 text-sm font-medium text-[#6c7e96]"><CreditCard size={14} className="text-[#6360DF]" /><span>{driver.licenseNo}</span></div>
                <div className="flex items-center space-x-1.5 text-sm font-medium text-[#6c7e96]"><MapPin size={14} className="text-[#6360DF]" /><span>{driver.location}</span></div>
              </div>
            </div>
          </div>
          {statusStyle && (
            <div className={`inline-flex items-center px-5 py-2 rounded-full text-sm font-extrabold tracking-widest ${statusStyle.bg} ${statusStyle.text}`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${statusStyle.dot}`} />
              {driver.driverStatus.toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Trips', value: tripHistory.length.toString(), color: 'text-[#6360DF]', bg: 'bg-[#EEEDFA]' },
          { label: "Today's Allocations", value: allocations.length.toString(), color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed Trips', value: tripHistory.filter(t => t.bookingStatus === 'COMPLETED').length.toString(), color: 'text-green-600', bg: 'bg-green-50' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white rounded-[2rem] p-6 shadow-sm border border-[#d1d0eb]/30 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">{s.label}</p>
              <h3 className={`text-3xl font-black mt-1 ${s.color}`}>{s.value}</h3>
            </div>
            <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center`}><Car size={20} /></div>
          </motion.div>
        ))}
      </div>

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
                  <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="hover:bg-[#f8f9fc] transition-colors">
                    <td className="py-4 pl-8 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest ${a.type === 'Pick' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>{a.type.toUpperCase()}</span>
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
                      <div className="flex items-center space-x-1.5 text-sm font-bold text-[#151a3c]"><Clock size={11} className="text-[#6c7e96]" /><span>{a.dateTime}</span></div>
                    </td>
                    <td className="py-4 pr-8 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest ${bookingStatusBadge(a.bookingStatus)}`}>{a.bookingStatus}</span>
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
                  <motion.tr key={`${t.id}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-[#f8f9fc] transition-colors">
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
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest ${t.locationType === 'Pick' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>{t.locationType.toUpperCase()}</span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 text-xs font-medium text-[#6c7e96]"><Calendar size={11} /><span>{t.pickupDate} → {t.dropDate}</span></div>
                    </td>
                    <td className="py-4 pr-8 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest ${bookingStatusBadge(t.bookingStatus)}`}>{t.bookingStatus}</span>
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
  const [filterStatus, setFilterStatus] = useState('All');
  const [view, setView] = useState<'list' | 'add' | 'profile'>('list');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [driversData, setDriversData] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadDrivers = async () => {
    setLoading(true);
    const authUser = await getCurrentUser();
    if (!authUser) { setLoading(false); return; }
    const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', authUser.id).single();
    if (!ownerRow) { setLoading(false); return; }

    const { data: drivers, error } = await supabase
      .from('drivers')
      .select('id, full_name, phone, license_no, current_location, status')
      .eq('owner_id', ownerRow.id);

    if (error) { toast.error('Failed to load drivers.'); setLoading(false); return; }

    // Load today's allocations
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const { data: allocations } = await supabase
      .from('allocations')
      .select(`
        driver_id, type, location, date_time, is_confirmed,
        booking_details (
          vehicles ( registration_no, models ( brand, name ) ),
          bookings ( customer_name, status )
        )
      `)
      .eq('owner_id', ownerRow.id)
      .gte('date_time', todayStart.toISOString())
      .lte('date_time', todayEnd.toISOString())
      .order('date_time', { ascending: true });

    // Build map: driverId → earliest allocation today
    const allocMap: Record<string, {
      customer: string; vehicle: string; type: 'Pick' | 'Drop';
      bookingStatus: string; location: string; dateTime: string;
    }> = {};
    ((allocations as any[]) || []).forEach((a: any) => {
      if (!allocMap[a.driver_id]) { // earliest first (sorted ASC)
        allocMap[a.driver_id] = {
          customer: a.booking_details?.bookings?.customer_name || '—',
          vehicle: a.booking_details?.vehicles?.models
            ? `${a.booking_details.vehicles.models.brand} ${a.booking_details.vehicles.models.name}`
            : '—',
          type: a.type,
          bookingStatus: a.booking_details?.bookings?.status || '',
          location: a.location || '—',
          dateTime: a.date_time,
        };
      }
    });

    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const mapped: DriverRow[] = ((drivers as any[]) || []).map((d: any) => {
      const initials = d.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
      const colorIdx = d.full_name.charCodeAt(0) % AVATAR_COLORS.length;
      const color = AVATAR_COLORS[colorIdx];
      const alloc = allocMap[d.id];

      let driverStatus: DriverRow['driverStatus'] = 'Available';
      if (d.status !== 'active') driverStatus = 'Inactive';
      else if (alloc) driverStatus = alloc.bookingStatus === 'ONGOING' ? 'On Trip' : 'Allocated';

      return {
        id: d.id,
        name: d.full_name,
        initials,
        avatarColor: color.bg,
        avatarTextColor: color.text,
        phone: d.phone,
        licenseNo: d.license_no,
        // ── NEW columns ──
        date: alloc?.dateTime
          ? new Date(alloc.dateTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : today,
        currentLocation: alloc?.location || d.current_location || 'Not Assigned',
        allocationDateTime: alloc?.dateTime || null,
        // ── existing ──
        currentBooking: alloc ? `${alloc.customer} • ${alloc.vehicle}` : 'Not Assigned',
        locationType: alloc?.type || null,
        driverStatus,
      };
    });

    // Sort: allocated drivers (with dateTime) first ASC, then no-allocation at bottom
    mapped.sort((a, b) => {
      if (a.allocationDateTime && b.allocationDateTime)
        return new Date(a.allocationDateTime).getTime() - new Date(b.allocationDateTime).getTime();
      if (a.allocationDateTime) return -1;
      if (b.allocationDateTime) return 1;
      return 0;
    });

    setDriversData(mapped);
    setLoading(false);
  };

  useEffect(() => { loadDrivers(); }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('drivers').delete().eq('id', id);
    if (error) { toast.error('Failed to delete driver.'); return; }
    toast.success('Driver deleted.');
    setDriversData(prev => prev.filter(d => d.id !== id));
    setConfirmDeleteId(null);
  };

  const filtered = driversData
    .filter(d => filterStatus === 'All' || d.driverStatus === filterStatus)
    .filter(d =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.phone.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="min-h-full">
      <AnimatePresence mode="wait">
        {view === 'profile' && (
          <DriverProfilePage key="profile" driverId={selectedDriverId} onBack={() => setView('list')} />
        )}
        {view === 'add' && (
          <AddDriver key="add" onSave={async () => { await loadDrivers(); setView('list'); }} onCancel={() => setView('list')} />
        )}
        {view === 'list' && (
          <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-[24px] font-extrabold text-[#151a3c] tracking-tight">Drivers</h2>
                <p className="text-[#6c7e96] text-sm font-medium mt-1">Manage your fleet of drivers and their assignments</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative group w-[300px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cbd5e1] w-4 h-4 group-focus-within:text-[#6360DF] transition-colors" />
                  <input type="text" placeholder="Search drivers..."
                    className="w-full bg-white border border-[#d1d0eb] rounded-full py-2.5 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all"
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <button onClick={() => setView('add')}
                  className="bg-[#6360DF] hover:bg-[#5451d0] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-[#6360df33] transition-all flex items-center space-x-2">
                  <UserPlus size={18} /><span>Add Driver</span>
                </button>
              </div>
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-3">
              <span className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase">Filter By:</span>
              <div className="relative">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="appearance-none bg-white border border-[#d1d0eb] rounded-full py-2 px-5 pr-10 text-xs font-bold text-[#151a3c] outline-none cursor-pointer focus:ring-2 focus:ring-[#6360DF]/10 transition-all">
                  <option value="All">All</option>
                  <option value="On Trip">On Trip</option>
                  <option value="Allocated">Allocated</option>
                  <option value="Available">Available</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none w-3 h-3" />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#F8F9FA]/50 text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/20">
                      <th className="pl-10 py-5 font-bold">Driver Name</th>
                      <th className="px-6 py-5 font-bold">Date</th>
                      <th className="px-6 py-5 font-bold">Phone</th>
                      <th className="px-6 py-5 font-bold">Current Booking</th>
                      <th className="px-6 py-5 font-bold">Location Type</th>
                      <th className="px-6 py-5 font-bold">Current Location</th>
                      <th className="px-6 py-5 font-bold">Status</th>
                      <th className="px-10 py-5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d1d0eb]/10">
                    {loading ? (
                      <tr><td colSpan={8} className="py-16 text-center">
                        <div className="flex items-center justify-center text-[#6c7e96]">
                          <Loader2 size={22} className="animate-spin mr-2" />
                          <span className="text-sm font-medium">Loading drivers...</span>
                        </div>
                      </td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={8} className="py-16 text-center text-[#6c7e96] text-sm font-medium">
                        {driversData.length === 0 ? 'No drivers added yet. Click "Add Driver" to get started.' : 'No drivers match your search.'}
                      </td></tr>
                    ) : (
                      filtered.map(driver => {
                        const ss = getStatusStyle(driver.driverStatus);
                        return (
                          <React.Fragment key={driver.id}>
                            <tr className="group hover:bg-[#F8F9FA] transition-colors">
                              {/* Driver Name */}
                              <td className="py-5 pl-10 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0"
                                    style={{ backgroundColor: driver.avatarColor, color: driver.avatarTextColor }}>{driver.initials}</div>
                                  <span className="ml-3 font-bold text-[#151a3c] text-sm">{driver.name}</span>
                                </div>
                              </td>
                              {/* Date */}
                              <td className="py-5 px-6 whitespace-nowrap">
                                <div className="flex items-center space-x-1.5 text-sm font-medium text-[#151a3c]">
                                  <Calendar size={12} className="text-[#6360DF]" />
                                  <span>{driver.date}</span>
                                </div>
                              </td>
                              {/* Phone */}
                              <td className="py-5 px-6 text-sm font-medium text-[#151a3c] whitespace-nowrap">{driver.phone}</td>
                              {/* Current Booking */}
                              <td className="py-5 px-6 whitespace-nowrap">
                                {driver.currentBooking === 'Not Assigned' ? (
                                  <span className="text-sm font-medium text-[#6c7e96] italic">Not Assigned</span>
                                ) : (
                                  <div>
                                    <p className="text-sm font-bold text-[#151a3c]">{driver.currentBooking.split(' • ')[0]}</p>
                                    <p className="text-[11px] font-medium text-[#6c7e96]">{driver.currentBooking.split(' • ')[1]}</p>
                                  </div>
                                )}
                              </td>
                              {/* Location Type */}
                              <td className="py-5 px-6 whitespace-nowrap">
                                {driver.locationType ? (
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest ${driver.locationType === 'Pick' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                    {driver.locationType.toUpperCase()}
                                  </span>
                                ) : <span className="text-sm font-medium text-[#6c7e96]">—</span>}
                              </td>
                              {/* Current Location */}
                              <td className="py-5 px-6 whitespace-nowrap">
                                <div className="flex items-center space-x-1.5 text-sm font-medium text-[#151a3c]">
                                  <MapPin size={12} className="text-[#6360DF] shrink-0" />
                                  <span>{driver.currentLocation}</span>
                                </div>
                              </td>
                              {/* Status */}
                              <td className="py-5 px-6 whitespace-nowrap">
                                <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-extrabold tracking-widest ${ss.bg} ${ss.text}`}>
                                  <div className={`w-1.5 h-1.5 rounded-full mr-2 ${ss.dot}`} />
                                  {driver.driverStatus.toUpperCase()}
                                </div>
                              </td>
                              {/* Actions */}
                              <td className="py-5 px-10 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end space-x-3">
                                  <button onClick={() => { setSelectedDriverId(driver.id); setView('profile'); }}
                                    className="text-[#6c7e96] hover:text-[#6360DF] transition-colors"><Eye size={18} /></button>
                                  <button className="text-[#6c7e96] hover:text-[#6360DF] transition-colors"><Pencil size={18} /></button>
                                  <button onClick={() => setConfirmDeleteId(driver.id)}
                                    className="text-[#6c7e96] hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                </div>
                              </td>
                            </tr>
                            <AnimatePresence>
                              {confirmDeleteId === driver.id && (
                                <motion.tr key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                  <td colSpan={8} className="bg-red-50 border-t border-red-100 px-10 py-4">
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
                        );
                      })
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