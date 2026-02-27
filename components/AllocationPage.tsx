import React, { useState, useEffect } from 'react';
import {
  Search, Calendar, MapPin, User, Car, Clock,
  RefreshCw, CheckCircle2, Loader2, AlertTriangle, ChevronDown,
  X, Shield
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#151a3c]/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-[520px] bg-white rounded-[2rem] shadow-2xl overflow-hidden"
      >
        {/* Header */}
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

        {/* Body */}
        <div className="p-8 space-y-6">

          {/* Customer + Vehicle card */}
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

          {/* Details grid */}
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

          {/* Status badge */}
          <div className="flex items-center space-x-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <CheckCircle2 size={16} className="text-green-500 shrink-0" />
            <span className="text-sm font-bold text-green-700">Allocation Confirmed</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 flex items-center space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3.5 border border-[#d1d0eb] rounded-xl text-sm font-bold text-[#6c7e96] hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => { onClose(); onReallocate(row); }}
            className="flex-1 flex items-center justify-center space-x-2 bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-[#6360df33] transition-all"
          >
            <RefreshCw size={15} />
            <span>Reallocate</span>
          </button>
        </div>
      </motion.div>
    </div>
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

  // Popup state
  const [popupRow, setPopupRow] = useState<AllocationRow | null>(null);

  const loadData = async () => {
    setLoading(true);
    const authUser = await getCurrentUser();
    if (!authUser) { setLoading(false); return; }
    const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', authUser.id).single();
    if (!ownerRow) { setLoading(false); return; }
    setOwnerId(ownerRow.id);

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const [bookingDetailsRes, allocationsRes, driversRes, vehiclesRes] = await Promise.all([
      supabase
        .from('booking_details')
        .select(`
          id, vehicle_id, model_id, quantity,
          vehicles(id, registration_no, status, transmission, fuel_type, models(brand, name, categories(name))),
          bookings!inner(id, customer_name, pickup_at, drop_at, pickup_location, drop_location, status, owner_id)
        `)
        .eq('bookings.owner_id', ownerRow.id)
        .in('bookings.status', ['BOOKED', 'ONGOING'])
        .gte('bookings.pickup_at', todayStart.toISOString()),
      supabase
        .from('allocations')
        .select('id, booking_detail_id, driver_id, type, is_confirmed, vehicle_id, vehicles(registration_no), drivers(full_name)')
        .eq('owner_id', ownerRow.id),
      supabase.from('drivers').select('id, full_name').eq('owner_id', ownerRow.id).eq('status', 'active'),
      supabase.from('vehicles').select('id, registration_no, models(brand, name)').eq('owner_id', ownerRow.id).eq('status', 'available'),
    ]);

    const allAllocations = (allocationsRes.data as any[]) || [];

    // Map: detailId+type → allocation
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
        realDetailId: d.id,
        bookingId: d.bookings?.id,
        customer: d.bookings?.customer_name || '—', initials,
        vehicle: d.vehicles?.models ? `${d.vehicles.models.brand} ${d.vehicles.models.name}` : '—',
        vehicleId: d.vehicle_id,
        registration: d.vehicles?.registration_no || '—',
        vehicleType: d.vehicles?.models?.categories?.name || '—',
        fuel: d.vehicles?.fuel_type || '—',
        transmission: d.vehicles?.transmission || '—',
        pickupLocation: d.bookings?.pickup_location || '—',
        dropLocation: d.bookings?.drop_location || '—',
        pickupAt: d.bookings?.pickup_at || '',
        dropAt: d.bookings?.drop_at || '',
      };

      // Pick row
      const pickAlloc = allocMapPick[d.id] || null;
      mapped.push({
        ...base,
        detailId: `${d.id}_pick`,
        locationType: 'Pick',
        isAllocated: !!pickAlloc,
        allocationId: pickAlloc?.id || null,
        allocatedDriverId: pickAlloc?.driver_id || null,
        allocatedDriverName: pickAlloc?.drivers?.full_name || null,
        allocatedVehicleId: null,
        allocatedVehicleReg: null,
      });

      // Drop row
      const dropAlloc = allocMapDrop[d.id] || null;
      mapped.push({
        ...base,
        detailId: `${d.id}_drop`,
        locationType: 'Drop',
        isAllocated: !!dropAlloc,
        allocationId: dropAlloc?.id || null,
        allocatedDriverId: dropAlloc?.driver_id || null,
        allocatedDriverName: dropAlloc?.drivers?.full_name || null,
        allocatedVehicleId: dropAlloc?.vehicle_id || null,
        allocatedVehicleReg: dropAlloc?.vehicles?.registration_no || null,
      });
    });

    // Sort: unallocated first, then by time
    mapped.sort((a, b) => {
      if (a.isAllocated !== b.isAllocated) return a.isAllocated ? 1 : -1;
      const tA = a.locationType === 'Pick' ? a.pickupAt : a.dropAt;
      const tB = b.locationType === 'Pick' ? b.pickupAt : b.dropAt;
      return new Date(tA).getTime() - new Date(tB).getTime();
    });

    setRows(mapped);
    setDrivers(((driversRes.data as any[]) || []).map((d: any) => ({ id: d.id, name: d.full_name })));
    setAvailableVehicles(((vehiclesRes.data as any[]) || []).map((v: any) => ({
      id: v.id, registration: v.registration_no,
      name: v.models ? `${v.models.brand} ${v.models.name}` : v.registration_no,
    })));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const fmtDateTime = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Reallocate: open edit dropdowns for already-allocated row
  const handleReallocate = (row: AllocationRow) => {
    setSelectedDrivers(prev => ({ ...prev, [row.detailId]: row.allocatedDriverId || '' }));
    if (row.locationType === 'Drop') {
      setSelectedVehicles(prev => ({ ...prev, [row.detailId]: row.allocatedVehicleId || '' }));
    }
  };

  const handleAllocate = async (row: AllocationRow) => {
    const driverId = selectedDrivers[row.detailId] || row.allocatedDriverId;
    if (!driverId) { toast.error('Please select a driver first.'); return; }
    if (!ownerId) return;

    const isDrop = row.locationType === 'Drop';
    const isoDateTime = isDrop ? row.dropAt : row.pickupAt;
    const location = isDrop ? row.dropLocation : row.pickupLocation;
    const vehicleId = isDrop ? (selectedVehicles[row.detailId] || row.allocatedVehicleId || null) : null;

    setSavingId(row.detailId);
    try {
      if (row.allocationId) {
        const updateData: any = { driver_id: driverId, is_confirmed: true };
        if (vehicleId !== null) updateData.vehicle_id = vehicleId;
        const { error } = await supabase.from('allocations').update(updateData).eq('id', row.allocationId);
        if (error) { toast.error('Failed to update.'); return; }
      } else {
        const insertData: any = {
          owner_id: ownerId,
          booking_detail_id: row.realDetailId,
          driver_id: driverId,
          type: row.locationType,
          location,
          date_time: isoDateTime,
          is_confirmed: true,
        };
        if (vehicleId) insertData.vehicle_id = vehicleId;
        const { error } = await supabase.from('allocations').insert(insertData);
        if (error) { toast.error('Failed to save: ' + error.message); return; }
      }
      toast.success(row.isAllocated ? 'Allocation updated!' : 'Driver allocated!');
      await loadData();
      setSelectedDrivers(prev => { const n = { ...prev }; delete n[row.detailId]; return n; });
      setSelectedVehicles(prev => { const n = { ...prev }; delete n[row.detailId]; return n; });
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setSavingId(null);
    }
  };

  // Get display vehicle for a Drop row (live-updated from dropdown)
  const getDisplayVehicle = (row: AllocationRow): string => {
    if (row.locationType !== 'Drop') return row.vehicle;
    const selectedVId = selectedVehicles[row.detailId];
    if (selectedVId) {
      const found = availableVehicles.find(v => v.id === selectedVId);
      return found ? `${found.name} (${found.registration})` : row.vehicle;
    }
    return row.vehicle;
  };

  const getDisplayRegistration = (row: AllocationRow): string => {
    if (row.locationType !== 'Drop') return row.registration;
    const selectedVId = selectedVehicles[row.detailId];
    if (selectedVId) {
      const found = availableVehicles.find(v => v.id === selectedVId);
      return found ? found.registration : row.registration;
    }
    if (row.allocatedVehicleReg) return row.allocatedVehicleReg;
    return row.registration;
  };

  const filtered = rows.filter(r =>
    r.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.registration.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unallocatedCount = rows.filter(r => !r.isAllocated).length;

  return (
    <div className="min-h-full">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-[24px] font-extrabold text-[#151a3c] tracking-tight">Vehicle Allocation</h2>
            <p className="text-[#6c7e96] text-sm font-medium mt-1 opacity-80">Assign drivers to vehicles for upcoming trips</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group min-w-[200px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cbd5e1] w-4 h-4 group-focus-within:text-[#6360DF] transition-colors" />
              <input type="text" placeholder="Search driver or vehicle..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#d1d0eb] rounded-full py-2.5 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all" />
            </div>
            <div className="flex items-center space-x-2 bg-white px-4 py-2.5 rounded-xl border border-[#d1d0eb] text-sm font-semibold text-[#151a3c]">
              <Calendar size={16} className="text-[#6c7e96]" />
              <span>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </div>
            {unallocatedCount > 0 && (
              <div className="flex items-center space-x-2 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-sm font-bold text-red-500">{unallocatedCount} unallocated</span>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F8F9FA]/50 text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/20">
                  <th className="pl-8 py-5">Customer</th>
                  <th className="px-4 py-5">Vehicle</th>
                  <th className="px-4 py-5">Type</th>
                  <th className="px-4 py-5">Location Type</th>
                  <th className="px-4 py-5">Date & Time</th>
                  <th className="px-4 py-5">Assign Driver</th>
                  <th className="px-4 py-5">Vehicle No.</th>
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
                    {rows.length === 0 ? 'No upcoming bookings to allocate.' : 'No results match your search.'}
                  </td></tr>
                ) : (
                  filtered.map((row, idx) => {
                    const isUnallocated = !row.isAllocated;
                    const isEditing = selectedDrivers[row.detailId] !== undefined || selectedVehicles[row.detailId] !== undefined;
                    const isDrop = row.locationType === 'Drop';
                    const rowTime = isDrop ? row.dropAt : row.pickupAt;
                    const displayVehicle = getDisplayVehicle(row);
                    const displayReg = getDisplayRegistration(row);

                    return (
                      <motion.tr
                        key={row.detailId}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => {
                          // Only open popup if allocated and not in editing mode
                          if (row.isAllocated && !isEditing) setPopupRow(row);
                        }}
                        className={`group transition-colors ${
                          row.isAllocated && !isEditing
                            ? 'cursor-pointer hover:bg-[#f8f7ff]'
                            : isUnallocated
                            ? 'bg-red-50/40 hover:bg-red-50'
                            : 'hover:bg-[#F8F9FA]'
                        }`}
                      >
                        {/* Customer */}
                        <td className="py-4 pl-8 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${isUnallocated ? 'bg-red-100 text-red-500' : 'bg-[#EEEDFA] text-[#6360DF]'}`}>
                              {row.initials}
                            </div>
                            <div>
                              <p className="font-bold text-[#151a3c] text-sm">{row.customer}</p>
                              <div className="flex items-center space-x-1 text-[10px] text-[#6c7e96] font-medium mt-0.5">
                                <MapPin size={9} className="text-[#6360DF]" />
                                <span>{isDrop ? row.dropLocation : row.pickupLocation}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Vehicle — updates live for Drop */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Car size={13} className="text-[#6360DF] shrink-0" />
                            <div>
                              <p className="font-bold text-[#151a3c] text-sm">{displayVehicle.split(' (')[0]}</p>
                              <p className="text-[10px] text-[#6c7e96] font-medium">{displayReg}</p>
                            </div>
                          </div>
                        </td>

                        {/* Vehicle Type */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="bg-[#f1f5f9] px-2.5 py-1 rounded-md text-[11px] font-bold text-[#151a3c]">{row.vehicleType}</span>
                        </td>

                        {/* Location Type */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest ${isDrop ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                            {row.locationType.toUpperCase()}
                          </span>
                        </td>

                        {/* Date & Time */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5 text-xs font-bold">
                            <Clock size={11} className={isUnallocated ? 'text-red-400' : 'text-[#6c7e96]'} />
                            <span className={isUnallocated ? 'text-red-500' : 'text-[#151a3c]'}>{fmtDateTime(rowTime)}</span>
                          </div>
                        </td>

                        {/* Driver dropdown */}
                        <td className="py-4 px-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          {isUnallocated || isEditing ? (
                            <div className="relative">
                              <select
                                value={selectedDrivers[row.detailId] ?? (row.allocatedDriverId || '')}
                                onChange={e => setSelectedDrivers(prev => ({ ...prev, [row.detailId]: e.target.value }))}
                                className={`appearance-none pr-8 pl-3 py-2 rounded-lg text-xs font-bold outline-none border cursor-pointer w-[150px] ${isUnallocated ? 'bg-red-50 border-red-200 text-[#151a3c] focus:border-red-400' : 'bg-[#f8f7ff] border-[#d1d0eb] text-[#151a3c] focus:border-[#6360DF]'}`}
                              >
                                <option value="">Select driver...</option>
                                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
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

                        {/* Vehicle No — Drop only */}
                        <td className="py-4 px-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          {isDrop ? (
                            isUnallocated || isEditing ? (
                              <div className="relative">
                                <select
                                  value={selectedVehicles[row.detailId] ?? (row.allocatedVehicleId || '')}
                                  onChange={e => {
                                    setSelectedVehicles(prev => ({ ...prev, [row.detailId]: e.target.value }));
                                    // Ensure driver editing mode is also triggered
                                    if (!selectedDrivers[row.detailId]) {
                                      setSelectedDrivers(prev => ({ ...prev, [row.detailId]: row.allocatedDriverId || '' }));
                                    }
                                  }}
                                  className={`appearance-none pr-8 pl-3 py-2 rounded-lg text-xs font-bold outline-none border cursor-pointer w-[150px] ${isUnallocated ? 'bg-red-50 border-red-200 text-[#151a3c] focus:border-red-400' : 'bg-[#f8f7ff] border-[#d1d0eb] text-[#151a3c] focus:border-[#6360DF]'}`}
                                >
                                  <option value="">Select vehicle...</option>
                                  {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.registration}</option>)}
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

                        {/* Action */}
                        <td className="py-4 px-6 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center">
                            {row.isAllocated && !isEditing ? (
                              // Allocated but not editing — row click opens popup; show subtle indicator
                              <div className="flex items-center space-x-1.5 text-[11px] font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                                <CheckCircle2 size={11} />
                                <span>Allocated</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAllocate(row)}
                                disabled={savingId === row.detailId}
                                className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-[11px] font-bold transition-all disabled:opacity-60 ${
                                  isUnallocated
                                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-200'
                                    : 'bg-[#6360DF] hover:bg-[#5451d0] text-white'
                                }`}
                              >
                                {savingId === row.detailId
                                  ? <Loader2 size={11} className="animate-spin" />
                                  : <CheckCircle2 size={11} />
                                }
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

      {/* Allocation Detail Popup */}
      <AnimatePresence>
        {popupRow && (
          <AllocationDetailPopup
            row={popupRow}
            drivers={drivers}
            availableVehicles={availableVehicles}
            onClose={() => setPopupRow(null)}
            onReallocate={(row) => {
              setPopupRow(null);
              handleReallocate(row);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AllocationPage;