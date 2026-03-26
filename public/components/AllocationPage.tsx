import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Calendar, MapPin, User, Car, Clock,
  RefreshCw, CheckCircle2, Loader2, AlertTriangle, ChevronDown,
  X, Shield, Filter, SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase, getCurrentUser } from '../supabaseClient';

interface AllocationRow {
  detailId: string;
  realDetailId: string;
  bookingId: string;
  customer: string;
  initials: string;
  vehicle: string;
  vehicleId: string;
  registration: string;
  vehicleType: string;
  fuel: string;
  transmission: string;
  pickupLocation: string;
  dropLocation: string;
  pickupAt: string;
  dropAt: string;
  locationType: 'Pick' | 'Drop';
  isAllocated: boolean;
  allocationId: string | null;
  allocatedDriverId: string | null;
  allocatedDriverName: string | null;
  allocatedVehicleId: string | null;
  allocatedVehicleReg: string | null;
}

interface Driver { id: string; name: string; }
interface AvailableVehicle { id: string; registration: string; name: string; }

// ── Per-row busy sets ─────────────────────────────────────────
// busyMap[detailId] = { driverIds: Set, vehicleIds: Set }
interface BusySet { driverIds: Set<string>; vehicleIds: Set<string>; }

// ── Allocation Detail Popup ───────────────────────────────────
interface AllocationDetailPopupProps {
  row: AllocationRow;
  drivers: Driver[];
  availableVehicles: AvailableVehicle[];
  onClose: () => void;
  onReallocate: (row: AllocationRow) => void;
}

const AllocationDetailPopup: React.FC<AllocationDetailPopupProps> = ({ row, drivers, availableVehicles, onClose, onReallocate }) => {
  const isDrop = row.locationType === 'Drop';
  const rowTime = isDrop ? row.dropAt : row.pickupAt;
  const rowLocation = isDrop ? row.dropLocation : row.pickupLocation;

  const fmtDateTime = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-[#151a3c]/40 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-[520px] bg-white rounded-[2rem] shadow-2xl overflow-hidden"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EEEDFA] flex items-center justify-center text-[#6360DF]">
              <Shield size={22} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#151a3c]">Allocation Details</h3>
              <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest mt-1 ${isDrop ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                {row.locationType.toUpperCase()} ALLOCATION
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-[#6c7e96]">
            <X size={22} />
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div className="bg-[#f8f7ff] rounded-2xl p-5 border border-[#d1d0eb]/30 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#EEEDFA] flex items-center justify-center text-[#6360DF] text-[12px] font-extrabold shrink-0">
                {row.initials}
              </div>
              <div>
                <p className="font-extrabold text-[#151a3c] text-base">{row.customer}</p>
                <div className="flex items-center space-x-1 text-xs text-[#6c7e96] font-medium mt-0.5">
                  <MapPin size={10} className="text-[#6360DF]" />
                  <span>{rowLocation}</span>
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-[#d1d0eb]/30 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#6360DF]">
                <Car size={18} />
              </div>
              <div>
                <p className="font-bold text-[#151a3c] text-sm">{row.vehicle}</p>
                <p className="text-[10px] text-[#6c7e96] font-medium">{row.registration}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Date & Time</p>
              <div className="flex items-center space-x-2 text-sm font-bold text-[#151a3c]">
                <Clock size={13} className="text-[#6360DF]" />
                <span>{fmtDateTime(rowTime)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Vehicle Type</p>
              <span className="bg-[#f1f5f9] px-2.5 py-1 rounded-md text-[11px] font-bold text-[#151a3c] inline-block">{row.vehicleType}</span>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Assigned Driver</p>
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-[#EEEDFA] flex items-center justify-center">
                  <User size={12} className="text-[#6360DF]" />
                </div>
                <span className="text-sm font-bold text-[#151a3c]">{row.allocatedDriverName || '—'}</span>
              </div>
            </div>
            {isDrop && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Assigned Vehicle No.</p>
                <div className="flex items-center space-x-2">
                  <Car size={13} className="text-[#6360DF]" />
                  <span className="text-sm font-bold text-[#151a3c]">{row.allocatedVehicleReg || '—'}</span>
                </div>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Fuel</p>
              <p className="text-sm font-bold text-[#151a3c]">{row.fuel}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Transmission</p>
              <p className="text-sm font-bold text-[#151a3c]">{row.transmission}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <CheckCircle2 size={16} className="text-green-500 shrink-0" />
            <span className="text-sm font-bold text-green-700">Allocation Confirmed</span>
          </div>
        </div>
        <div className="px-8 py-6 border-t border-slate-100 flex items-center space-x-3">
          <button onClick={onClose}
            className="flex-1 px-6 py-3.5 border border-[#d1d0eb] rounded-xl text-sm font-bold text-[#6c7e96] hover:bg-slate-50 transition-colors">
            Close
          </button>
          <button onClick={() => { onClose(); onReallocate(row); }}
            className="flex-1 flex items-center justify-center space-x-2 bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-[#6360df33] transition-all">
            <RefreshCw size={15} />
            <span>Reallocate</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Filter State ──────────────────────────────────────────────
interface FilterState {
  vehicle: string;
  locationType: string;
  location: string;
  driver: string;
}

// ── Filter Panel ──────────────────────────────────────────────
interface FilterPanelProps {
  open: boolean;
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onClear: () => void;
  onClose: () => void;
  rows: AllocationRow[];
  drivers: Driver[];
}

const FilterPanel: React.FC<FilterPanelProps> = ({ open, filters, onChange, onClear, onClose, rows, drivers }) => {
  const uniqueVehicles = Array.from(new Set(rows.map(r => r.vehicle))).filter(Boolean).sort();
  const uniqueLocations = Array.from(new Set([
    ...rows.map(r => r.pickupLocation),
    ...rows.map(r => r.dropLocation),
  ])).filter(l => l && l !== '—').sort();
  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-[90] bg-transparent" />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full mt-2 z-[100] w-[520px] bg-white rounded-[1.5rem] shadow-2xl border border-[#d1d0eb]/40 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-[#d1d0eb]/30 flex items-center justify-between bg-[#FAFAFA]">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal size={16} className="text-[#6360DF]" />
                <span className="text-sm font-extrabold text-[#151a3c]">Filter Allocations</span>
                {activeCount > 0 && (
                  <span className="bg-[#6360DF] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">{activeCount}</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {activeCount > 0 && (
                  <button onClick={onClear}
                    className="text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
                    Clear all
                  </button>
                )}
                <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-[#6c7e96]">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-[#6c7e96] uppercase tracking-widest flex items-center space-x-1.5">
                  <Car size={11} className="text-[#6360DF]" /><span>Vehicle</span>
                </label>
                <div className="relative">
                  <select value={filters.vehicle} onChange={e => onChange({ ...filters, vehicle: e.target.value })}
                    className={`w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs font-bold outline-none border transition-all cursor-pointer ${filters.vehicle ? 'bg-[#EEEDFA] border-[#6360DF] text-[#6360DF]' : 'bg-[#F8F9FA] border-[#d1d0eb] text-[#6c7e96]'}`}>
                    <option value="">All Vehicles</option>
                    {uniqueVehicles.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-[#6c7e96] uppercase tracking-widest flex items-center space-x-1.5">
                  <MapPin size={11} className="text-[#6360DF]" /><span>Location Type</span>
                </label>
                <div className="flex gap-2">
                  {['', 'Pick', 'Drop'].map(v => (
                    <button key={v} type="button" onClick={() => onChange({ ...filters, locationType: v })}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-extrabold border transition-all ${
                        filters.locationType === v
                          ? v === 'Pick' ? 'bg-blue-100 border-blue-400 text-blue-600'
                          : v === 'Drop' ? 'bg-orange-100 border-orange-400 text-orange-600'
                          : 'bg-[#EEEDFA] border-[#6360DF] text-[#6360DF]'
                          : 'bg-[#F8F9FA] border-[#d1d0eb] text-[#6c7e96]'
                      }`}>
                      {v === '' ? 'All' : v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-[#6c7e96] uppercase tracking-widest flex items-center space-x-1.5">
                  <MapPin size={11} className="text-[#6360DF]" /><span>Location</span>
                </label>
                <div className="relative">
                  <select value={filters.location} onChange={e => onChange({ ...filters, location: e.target.value })}
                    className={`w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs font-bold outline-none border transition-all cursor-pointer ${filters.location ? 'bg-[#EEEDFA] border-[#6360DF] text-[#6360DF]' : 'bg-[#F8F9FA] border-[#d1d0eb] text-[#6c7e96]'}`}>
                    <option value="">All Locations</option>
                    {uniqueLocations.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-[#6c7e96] uppercase tracking-widest flex items-center space-x-1.5">
                  <User size={11} className="text-[#6360DF]" /><span>Driver</span>
                </label>
                <div className="relative">
                  <select value={filters.driver} onChange={e => onChange({ ...filters, driver: e.target.value })}
                    className={`w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs font-bold outline-none border transition-all cursor-pointer ${filters.driver ? 'bg-[#EEEDFA] border-[#6360DF] text-[#6360DF]' : 'bg-[#F8F9FA] border-[#d1d0eb] text-[#6c7e96]'}`}>
                    <option value="">All Drivers</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none" />
                </div>
              </div>
            </div>
            {activeCount > 0 && (
              <div className="px-6 pb-5 flex flex-wrap gap-2 border-t border-[#d1d0eb]/20 pt-4">
                {filters.vehicle && (
                  <span className="flex items-center space-x-1.5 bg-[#EEEDFA] text-[#6360DF] px-3 py-1.5 rounded-full text-[10px] font-bold">
                    <Car size={10}/><span>{filters.vehicle}</span>
                    <button onClick={() => onChange({ ...filters, vehicle: '' })}><X size={10}/></button>
                  </span>
                )}
                {filters.locationType && (
                  <span className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold ${filters.locationType === 'Pick' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                    <span>{filters.locationType}</span>
                    <button onClick={() => onChange({ ...filters, locationType: '' })}><X size={10}/></button>
                  </span>
                )}
                {filters.location && (
                  <span className="flex items-center space-x-1.5 bg-[#EEEDFA] text-[#6360DF] px-3 py-1.5 rounded-full text-[10px] font-bold">
                    <MapPin size={10}/><span>{filters.location}</span>
                    <button onClick={() => onChange({ ...filters, location: '' })}><X size={10}/></button>
                  </span>
                )}
                {filters.driver && (
                  <span className="flex items-center space-x-1.5 bg-[#EEEDFA] text-[#6360DF] px-3 py-1.5 rounded-full text-[10px] font-bold">
                    <User size={10}/><span>{drivers.find(d => d.id === filters.driver)?.name}</span>
                    <button onClick={() => onChange({ ...filters, driver: '' })}><X size={10}/></button>
                  </span>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────────────────────────

const AllocationPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [rows, setRows] = useState<AllocationRow[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<AvailableVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedDrivers, setSelectedDrivers] = useState<Record<string, string>>({});
  const [selectedVehicles, setSelectedVehicles] = useState<Record<string, string>>({});
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [popupRow, setPopupRow] = useState<AllocationRow | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ vehicle: '', locationType: '', location: '', driver: '' });
  const filterRef = useRef<HTMLDivElement>(null);

  // ── Per-row busy driver/vehicle sets ──────────────────────
  // Key: detailId, Value: { driverIds, vehicleIds } that are busy for that row's booking range
  const [busyMap, setBusyMap] = useState<Record<string, BusySet>>({});

  const loadData = async (date: string) => {
    setLoading(true);
    const authUser = await getCurrentUser();
    if (!authUser) { setLoading(false); return; }
    const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', authUser.id).single();
    if (!ownerRow) { setLoading(false); return; }
    setOwnerId(ownerRow.id);

    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(date); dayEnd.setHours(23, 59, 59, 999);

    // ── Fetch all allocations with their booking date ranges ──
    // We need pickup_at + drop_at for every confirmed allocation to check overlaps
    const [bookingDetailsRes, allocationsRes, driversRes, vehiclesRes, allAllocWithDatesRes] = await Promise.all([
      supabase
        .from('booking_details')
        .select(`
          id, vehicle_id, model_id, quantity,
          vehicles(id, registration_no, status, transmission, fuel_type, models(brand, name, categories(name))),
          bookings!inner(id, customer_name, pickup_at, drop_at, pickup_location, drop_location, status, owner_id)
        `)
        .eq('bookings.owner_id', ownerRow.id)
        .in('bookings.status', ['BOOKED', 'ONGOING'])
        .gte('bookings.pickup_at', dayStart.toISOString())
        .lte('bookings.pickup_at', dayEnd.toISOString()),

      supabase
        .from('allocations')
        .select('id, booking_detail_id, driver_id, type, is_confirmed, vehicle_id, vehicles(registration_no), drivers(full_name)')
        .eq('owner_id', ownerRow.id),

      supabase.from('drivers').select('id, full_name').eq('owner_id', ownerRow.id).eq('status', 'active'),

      supabase.from('vehicles').select('id, registration_no, models(brand, name)').eq('owner_id', ownerRow.id).eq('status', 'available'),

      // All confirmed allocations across all bookings — used to compute busy sets
      supabase
        .from('allocations')
        .select(`
          id, driver_id, vehicle_id, booking_detail_id,
          booking_details!inner(
            booking_id,
            bookings!inner(id, pickup_at, drop_at, status, owner_id)
          )
        `)
        .eq('owner_id', ownerRow.id)
        .eq('is_confirmed', true)
        .in('booking_details.bookings.status', ['BOOKED', 'ONGOING']),
    ]);

    const allAllocations = (allocationsRes.data as any[]) || [];
    const allocMapPick: Record<string, any> = {};
    const allocMapDrop: Record<string, any> = {};
    allAllocations.forEach((a: any) => {
      if (a.type === 'Pick') allocMapPick[a.booking_detail_id] = a;
      if (a.type === 'Drop') allocMapDrop[a.booking_detail_id] = a;
    });

    const mapped: AllocationRow[] = [];
    ((bookingDetailsRes.data as any[]) || []).forEach((d: any) => {
      const initials = d.bookings?.customer_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??';
      const base = {
        realDetailId: d.id, bookingId: d.bookings?.id,
        customer: d.bookings?.customer_name || '—', initials,
        vehicle: d.vehicles?.models ? `${d.vehicles.models.brand} ${d.vehicles.models.name}` : '—',
        vehicleId: d.vehicle_id, registration: d.vehicles?.registration_no || '—',
        vehicleType: d.vehicles?.models?.categories?.name || '—',
        fuel: d.vehicles?.fuel_type || '—', transmission: d.vehicles?.transmission || '—',
        pickupLocation: d.bookings?.pickup_location || '—',
        dropLocation: d.bookings?.drop_location || '—',
        pickupAt: d.bookings?.pickup_at || '', dropAt: d.bookings?.drop_at || '',
      };

      const pickAlloc = allocMapPick[d.id] || null;
      mapped.push({ ...base, detailId: `${d.id}_pick`, locationType: 'Pick',
        isAllocated: !!pickAlloc, allocationId: pickAlloc?.id || null,
        allocatedDriverId: pickAlloc?.driver_id || null, allocatedDriverName: pickAlloc?.drivers?.full_name || null,
        allocatedVehicleId: null, allocatedVehicleReg: null });

      const dropAlloc = allocMapDrop[d.id] || null;
      mapped.push({ ...base, detailId: `${d.id}_drop`, locationType: 'Drop',
        isAllocated: !!dropAlloc, allocationId: dropAlloc?.id || null,
        allocatedDriverId: dropAlloc?.driver_id || null, allocatedDriverName: dropAlloc?.drivers?.full_name || null,
        allocatedVehicleId: dropAlloc?.vehicle_id || null, allocatedVehicleReg: dropAlloc?.vehicles?.registration_no || null });
    });

    mapped.sort((a, b) => {
      const tA = new Date(a.pickupAt).getTime(), tB = new Date(b.pickupAt).getTime();
      if (tA !== tB) return tB - tA;
      if (a.bookingId === b.bookingId) return a.locationType === 'Pick' ? -1 : 1;
      return 0;
    });

    // ── Build busyMap ─────────────────────────────────────────
    // For each row, find which driver/vehicle IDs are already allocated
    // to a DIFFERENT booking that overlaps this row's pickup_at → drop_at range.
    const allAllocWithDates = (allAllocWithDatesRes.data as any[]) || [];

    const newBusyMap: Record<string, BusySet> = {};

    mapped.forEach(row => {
      const rowPickup = row.pickupAt;
      const rowDrop   = row.dropAt;

      const busyDriverIds  = new Set<string>();
      const busyVehicleIds = new Set<string>();

      allAllocWithDates.forEach((a: any) => {
        // Skip allocations belonging to this same booking
        const aBookingId = a.booking_details?.bookings?.id;
        if (aBookingId === row.bookingId) return;

        const aPickup = a.booking_details?.bookings?.pickup_at;
        const aDrop   = a.booking_details?.bookings?.drop_at;
        if (!aPickup || !aDrop) return;

        // Overlap check: existing range overlaps new range
        const overlaps = aPickup < rowDrop && aDrop > rowPickup;
        if (!overlaps) return;

        if (a.driver_id)  busyDriverIds.add(a.driver_id);
        if (a.vehicle_id) busyVehicleIds.add(a.vehicle_id);
      });

      newBusyMap[row.detailId] = { driverIds: busyDriverIds, vehicleIds: busyVehicleIds };
    });

    setBusyMap(newBusyMap);
    setRows(mapped);
    setDrivers(((driversRes.data as any[]) || []).map((d: any) => ({ id: d.id, name: d.full_name })));
    setAvailableVehicles(((vehiclesRes.data as any[]) || []).map((v: any) => ({
      id: v.id, registration: v.registration_no,
      name: v.models ? `${v.models.brand} ${v.models.name}` : v.registration_no,
    })));
    setLoading(false);
  };

  useEffect(() => { loadData(selectedDate); }, [selectedDate]);

  const fmtDateTime = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleReallocate = (row: AllocationRow) => {
    setSelectedDrivers(prev => ({ ...prev, [row.detailId]: row.allocatedDriverId || '' }));
    if (row.locationType === 'Drop')
      setSelectedVehicles(prev => ({ ...prev, [row.detailId]: row.allocatedVehicleId || '' }));
  };

  const handleAllocate = async (row: AllocationRow) => {
    const driverId = selectedDrivers[row.detailId] || row.allocatedDriverId;
    if (!driverId) { toast.error('Please select a driver first.'); return; }
    if (!ownerId) return;
    const isDrop = row.locationType === 'Drop';
    const isoDateTime = isDrop ? row.dropAt : row.pickupAt;
    const location = isDrop ? row.dropLocation : row.pickupLocation;
    const vehicleId = isDrop ? (selectedVehicles[row.detailId] || row.allocatedVehicleId || null) : null;

    // ── Guard: block saving if selected driver/vehicle is busy ─
    const busy = busyMap[row.detailId];
    if (busy) {
      if (busy.driverIds.has(driverId)) {
        toast.error('This driver is already allocated to another booking in the same time period.');
        return;
      }
      if (vehicleId && busy.vehicleIds.has(vehicleId)) {
        toast.error('This vehicle is already allocated to another booking in the same time period.');
        return;
      }
    }

    setSavingId(row.detailId);
    try {
      if (row.allocationId) {
        const updateData: any = { driver_id: driverId, is_confirmed: true };
        if (vehicleId !== null) updateData.vehicle_id = vehicleId;
        const { error } = await supabase.from('allocations').update(updateData).eq('id', row.allocationId);
        if (error) { toast.error('Failed to update.'); return; }
      } else {
        const insertData: any = { owner_id: ownerId, booking_detail_id: row.realDetailId,
          driver_id: driverId, type: row.locationType, location, date_time: isoDateTime, is_confirmed: true };
        if (vehicleId) insertData.vehicle_id = vehicleId;
        const { error } = await supabase.from('allocations').insert(insertData);
        if (error) { toast.error('Failed to save: ' + error.message); return; }
      }
      toast.success(row.isAllocated ? 'Allocation updated!' : 'Driver allocated!');
      await loadData(selectedDate);
      setSelectedDrivers(prev => { const n = { ...prev }; delete n[row.detailId]; return n; });
      setSelectedVehicles(prev => { const n = { ...prev }; delete n[row.detailId]; return n; });
    } catch { toast.error('Something went wrong.'); }
    finally { setSavingId(null); }
  };

  const getDisplayVehicle = (row: AllocationRow): string => {
    if (row.locationType !== 'Drop') return row.vehicle;
    const found = availableVehicles.find(v => v.id === selectedVehicles[row.detailId]);
    return found ? found.name : row.vehicle;
  };

  const getDisplayRegistration = (row: AllocationRow): string => {
    if (row.locationType !== 'Drop') return row.registration;
    const found = availableVehicles.find(v => v.id === selectedVehicles[row.detailId]);
    if (found) return found.registration;
    return row.allocatedVehicleReg || row.registration;
  };

  const filtered = rows.filter(r => {
    const rowLocation = r.locationType === 'Drop' ? r.dropLocation : r.pickupLocation;
    const matchSearch = r.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.registration.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch &&
      (!filters.vehicle      || r.vehicle === filters.vehicle) &&
      (!filters.locationType || r.locationType === filters.locationType) &&
      (!filters.location     || rowLocation === filters.location) &&
      (!filters.driver       || r.allocatedDriverId === filters.driver);
  });

  const unallocatedCount = rows.filter(r => !r.isAllocated).length;
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="min-h-full">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-[24px] font-extrabold text-[#151a3c] tracking-tight">Vehicle Allocation</h2>
            <p className="text-[#6c7e96] text-sm font-medium mt-1 opacity-80">Assign drivers to vehicles for upcoming trips</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group min-w-[200px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cbd5e1] w-4 h-4 group-focus-within:text-[#6360DF] transition-colors" />
              <input type="text" placeholder="Search driver or vehicle..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#d1d0eb] rounded-full py-2.5 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all" />
            </div>
            <div className="flex items-center space-x-2 bg-white px-4 py-2.5 rounded-xl border border-[#d1d0eb]">
              <Calendar size={15} className="text-[#6c7e96] shrink-0" />
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="outline-none bg-transparent text-sm font-semibold text-[#151a3c] cursor-pointer w-[116px]" />
            </div>
            <div className="relative" ref={filterRef}>
              <button onClick={() => setFilterOpen(o => !o)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                  activeFilterCount > 0
                    ? 'bg-[#6360DF] border-[#6360DF] text-white shadow-md shadow-[#6360df33]'
                    : 'bg-white border-[#d1d0eb] text-[#6c7e96] hover:border-[#6360DF] hover:text-[#6360DF]'
                }`}>
                <Filter size={14} />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="bg-white text-[#6360DF] text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <FilterPanel open={filterOpen} filters={filters} onChange={setFilters}
                onClear={() => setFilters({ vehicle: '', locationType: '', location: '', driver: '' })}
                onClose={() => setFilterOpen(false)} rows={rows} drivers={drivers} />
            </div>
            {unallocatedCount > 0 && (
              <div className="flex items-center space-x-2 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-sm font-bold text-red-500">{unallocatedCount} unallocated</span>
              </div>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Active:</span>
            {filters.vehicle && (
              <span className="flex items-center space-x-1.5 bg-[#EEEDFA] text-[#6360DF] px-3 py-1.5 rounded-full text-[11px] font-bold">
                <Car size={10}/><span>{filters.vehicle}</span>
                <button onClick={() => setFilters(f => ({ ...f, vehicle: '' }))}><X size={10}/></button>
              </span>
            )}
            {filters.locationType && (
              <span className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold ${filters.locationType === 'Pick' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                <span>{filters.locationType}</span>
                <button onClick={() => setFilters(f => ({ ...f, locationType: '' }))}><X size={10}/></button>
              </span>
            )}
            {filters.location && (
              <span className="flex items-center space-x-1.5 bg-[#EEEDFA] text-[#6360DF] px-3 py-1.5 rounded-full text-[11px] font-bold">
                <MapPin size={10}/><span>{filters.location}</span>
                <button onClick={() => setFilters(f => ({ ...f, location: '' }))}><X size={10}/></button>
              </span>
            )}
            {filters.driver && (
              <span className="flex items-center space-x-1.5 bg-[#EEEDFA] text-[#6360DF] px-3 py-1.5 rounded-full text-[11px] font-bold">
                <User size={10}/><span>{drivers.find(d => d.id === filters.driver)?.name}</span>
                <button onClick={() => setFilters(f => ({ ...f, driver: '' }))}><X size={10}/></button>
              </span>
            )}
            <button onClick={() => setFilters({ vehicle: '', locationType: '', location: '', driver: '' })}
              className="text-[11px] font-bold text-red-500 hover:underline ml-1">Clear all</button>
          </div>
        )}

        {/* ── Table ── */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F8F9FA]/50 text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/20">
                  <th className="pl-8 py-5">Customer</th>
                  <th className="px-4 py-5">Vehicle</th>
                  <th className="px-4 py-5">Location Type</th>
                  <th className="px-4 py-5">Location</th>
                  <th className="px-4 py-5">Date & Time</th>
                  <th className="px-4 py-5">Vehicle No.</th>
                  <th className="px-4 py-5">Assign Driver</th>
                  <th className="px-6 py-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d1d0eb]/20">
                {loading ? (
                  <tr><td colSpan={8} className="py-16 text-center">
                    <div className="flex items-center justify-center text-[#6c7e96]">
                      <Loader2 size={20} className="animate-spin mr-2" />
                      <span className="text-sm font-medium">Loading allocations...</span>
                    </div>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center text-[#6c7e96] text-sm font-medium">
                    {rows.length === 0 ? 'No bookings found for this date.' : 'No results match your filters.'}
                  </td></tr>
                ) : (
                  filtered.map((row, idx) => {
                    const isUnallocated = !row.isAllocated;
                    const isEditing = selectedDrivers[row.detailId] !== undefined || selectedVehicles[row.detailId] !== undefined;
                    const isDrop = row.locationType === 'Drop';
                    const rowTime = isDrop ? row.dropAt : row.pickupAt;
                    const rowLocation = isDrop ? row.dropLocation : row.pickupLocation;
                    const displayVehicle = getDisplayVehicle(row);
                    const busy = busyMap[row.detailId] ?? { driverIds: new Set(), vehicleIds: new Set() };

                    return (
                      <motion.tr key={row.detailId} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => { if (row.isAllocated && !isEditing) setPopupRow(row); }}
                        className={`group transition-colors ${
                          row.isAllocated && !isEditing ? 'cursor-pointer hover:bg-[#f8f7ff]'
                          : isUnallocated ? 'bg-red-50/40 hover:bg-red-50'
                          : 'hover:bg-[#F8F9FA]'
                        }`}>

                        {/* Customer */}
                        <td className="py-4 pl-8 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${isUnallocated ? 'bg-red-100 text-red-500' : 'bg-[#EEEDFA] text-[#6360DF]'}`}>
                              {row.initials}
                            </div>
                            <p className="font-extrabold text-[#0f1535] text-sm tracking-tight">{row.customer}</p>
                          </div>
                        </td>

                        {/* Vehicle */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Car size={13} className="text-[#6360DF] shrink-0" />
                            <p className="font-bold text-[#151a3c] text-sm">{displayVehicle}</p>
                          </div>
                        </td>

                        {/* Location Type */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest ${isDrop ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                            {row.locationType.toUpperCase()}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <MapPin size={11} className="text-[#6360DF] shrink-0" />
                            <span className="text-xs font-bold text-[#151a3c]">{rowLocation}</span>
                          </div>
                        </td>

                        {/* Date & Time */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5 text-xs font-bold">
                            <Clock size={11} className={isUnallocated ? 'text-red-400' : 'text-[#6c7e96]'} />
                            <span className={isUnallocated ? 'text-red-500' : 'text-[#151a3c]'}>{fmtDateTime(rowTime)}</span>
                          </div>
                        </td>

                        {/* Vehicle No — Drop only */}
                        <td className="py-4 px-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          {isDrop ? (
                            isUnallocated || isEditing ? (
                              <div className="relative">
                                <select
                                  value={selectedVehicles[row.detailId] ?? (row.allocatedVehicleId || '')}
                                  onChange={e => {
                                    setSelectedVehicles(prev => ({ ...prev, [row.detailId]: e.target.value }));
                                    if (!selectedDrivers[row.detailId])
                                      setSelectedDrivers(prev => ({ ...prev, [row.detailId]: row.allocatedDriverId || '' }));
                                  }}
                                  className={`appearance-none pr-8 pl-3 py-2 rounded-lg text-xs font-bold outline-none border cursor-pointer w-[150px] ${isUnallocated ? 'bg-red-50 border-red-200 text-[#151a3c] focus:border-red-400' : 'bg-[#f8f7ff] border-[#d1d0eb] text-[#151a3c] focus:border-[#6360DF]'}`}>
                                  <option value="">Select vehicle...</option>
                                  {availableVehicles.map(v => {
                                    const isBusy = busy.vehicleIds.has(v.id);
                                    return (
                                      <option
                                        key={v.id}
                                        value={v.id}
                                        disabled={isBusy}
                                        style={isBusy ? { color: '#9ca3af' } : undefined}
                                      >
                                        {v.registration}{isBusy ? ' — Busy' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none" />
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <Car size={11} className="text-[#6360DF]" />
                                <span className="text-xs font-bold text-[#151a3c]">{row.allocatedVehicleReg || '—'}</span>
                              </div>
                            )
                          ) : (
                            <span className="text-xs text-[#6c7e96] font-medium">N/A</span>
                          )}
                        </td>

                        {/* Assign Driver */}
                        <td className="py-4 px-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          {isUnallocated || isEditing ? (
                            <div className="relative">
                              <select
                                value={selectedDrivers[row.detailId] ?? (row.allocatedDriverId || '')}
                                onChange={e => setSelectedDrivers(prev => ({ ...prev, [row.detailId]: e.target.value }))}
                                className={`appearance-none pr-8 pl-3 py-2 rounded-lg text-xs font-bold outline-none border cursor-pointer w-[150px] ${isUnallocated ? 'bg-red-50 border-red-200 text-[#151a3c] focus:border-red-400' : 'bg-[#f8f7ff] border-[#d1d0eb] text-[#151a3c] focus:border-[#6360DF]'}`}>
                                <option value="">Select driver...</option>
                                {drivers.map(d => {
                                  const isBusy = busy.driverIds.has(d.id);
                                  return (
                                    <option
                                      key={d.id}
                                      value={d.id}
                                      disabled={isBusy}
                                      style={isBusy ? { color: '#9ca3af' } : undefined}
                                    >
                                      {d.name}{isBusy ? ' — Busy' : ''}
                                    </option>
                                  );
                                })}
                              </select>
                              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none" />
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-full bg-[#EEEDFA] flex items-center justify-center">
                                <User size={11} className="text-[#6360DF]" />
                              </div>
                              <span className="text-xs font-bold text-[#151a3c]">{row.allocatedDriverName || '—'}</span>
                            </div>
                          )}
                        </td>

                        {/* Action  */}
                        <td className="py-4 px-6 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center">
                            {row.isAllocated && !isEditing ? (
                              <div className="flex items-center space-x-1.5 text-[11px] font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                                <CheckCircle2 size={11} /><span>Allocated</span>
                              </div>
                            ) : (
                              <button onClick={() => handleAllocate(row)} disabled={savingId === row.detailId}
                                className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-[11px] font-bold transition-all disabled:opacity-60 ${
                                  isUnallocated ? 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-200'
                                  : 'bg-[#6360DF] hover:bg-[#5451d0] text-white'
                                }`}>
                                {savingId === row.detailId ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                                <span>{savingId === row.detailId ? 'Saving...' : row.isAllocated ? 'Update' : 'Allocate'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>


      <AnimatePresence>
        {popupRow && (
          <AllocationDetailPopup row={popupRow} drivers={drivers} availableVehicles={availableVehicles}
            onClose={() => setPopupRow(null)}
            onReallocate={(row) => { setPopupRow(null); handleReallocate(row); }} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AllocationPage;