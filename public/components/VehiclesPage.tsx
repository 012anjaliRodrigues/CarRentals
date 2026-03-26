import React, { useState, useEffect } from 'react';
import { Car as CarIcon, Loader2, Search, Calendar, Plus, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase, getCurrentUser } from '../supabaseClient';
import AddNewVehicle from './AddNewVehicle';

// ── Types ─────────────────────────────────────────────────────
interface ReminderRow {
  type: string;
  due_date: string;
  alert: 'ok' | 'soon' | 'expired';
}

interface VehicleRow {
  id: string;
  registrationNo: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  fuelType: string;
  transmission: string;
  status: string;
  insuranceUntil: string | null;
  pucUntil: string | null;
  permitUntil: string | null;
  currentBookingCustomer: string | null;
  currentBookingPickup: string | null;
  currentBookingDrop: string | null;
  nearestReminder: ReminderRow | null;
}

interface VehicleGroup {
  key: string;
  brand: string;
  model: string;
  transmission: string;
  fuelType: string;
  vehicles: VehicleRow[];
}

// ── Helpers ───────────────────────────────────────────────────
const getDocAlert = (dateStr: string | null): 'ok' | 'soon' | 'expired' => {
  if (!dateStr) return 'expired';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'soon';
  return 'ok';
};

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getNearestReminder = (v: VehicleRow): ReminderRow | null => {
  const candidates = [
    v.insuranceUntil && { type: 'Insurance', due_date: v.insuranceUntil, alert: getDocAlert(v.insuranceUntil) },
    v.pucUntil       && { type: 'PUC',       due_date: v.pucUntil,       alert: getDocAlert(v.pucUntil) },
    v.permitUntil    && { type: 'Permit',     due_date: v.permitUntil,    alert: getDocAlert(v.permitUntil) },
  ].filter(Boolean) as ReminderRow[];
  if (!candidates.length) return null;
  const priority = { expired: 0, soon: 1, ok: 2 };
  return candidates.sort((a, b) => {
    const pd = priority[a.alert] - priority[b.alert];
    if (pd !== 0) return pd;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  })[0];
};

const ReminderText: React.FC<{ reminder: ReminderRow | null }> = ({ reminder }) => {
  if (!reminder) return <span className="text-sm text-[#6c7e96]">—</span>;
  const color = reminder.alert === 'expired' ? 'text-red-500' : reminder.alert === 'soon' ? 'text-orange-500' : 'text-green-600';
  return (
    <div className={`text-sm font-bold ${color}`}>
      {reminder.type}
      <span className="block text-[11px] font-medium mt-0.5">{fmtDate(reminder.due_date)}</span>
    </div>
  );
};

// ── VehiclesPage ──────────────────────────────────────────────
const VehiclesPage: React.FC = () => {
  const [groups, setGroups] = useState<VehicleGroup[]>([]);
  const [allVehicles, setAllVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  const loadVehicles = async () => {
    setLoading(true);
    const authUser = await getCurrentUser();
    if (!authUser) { setLoading(false); return; }
    const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', authUser.id).single();
    if (!ownerRow) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        id, registration_no, color, fuel_type, transmission, mfg_year,
        status, insurance_valid_until, puc_valid_until, permit_valid_until,
        models ( brand, name ),
        booking_details (
          bookings ( customer_name, pickup_at, drop_at, status )
        )
      `)
      .eq('owner_id', ownerRow.id)
      .order('created_at', { ascending: false });

    if (error) { setLoading(false); return; }

    const mapped: VehicleRow[] = ((data as any[]) || []).map((v: any) => {
      // Filter bookings active on selectedDate
      const activeBooking = (v.booking_details || [])
        .map((bd: any) => bd.bookings)
        .filter((b: any) => {
          if (!b) return false;
          if (!['ONGOING', 'BOOKED'].includes(b.status)) return false;
          // Check if selectedDate falls within booking range
          const pickup = b.pickup_at?.split('T')[0];
          const drop   = b.drop_at?.split('T')[0];
          return pickup <= selectedDate && drop >= selectedDate;
        })
        .sort((a: any, b: any) => new Date(a.pickup_at).getTime() - new Date(b.pickup_at).getTime())[0];

      const row: VehicleRow = {
        id: v.id,
        registrationNo: v.registration_no,
        brand: v.models?.brand || '—',
        model: v.models?.name || '—',
        year: v.mfg_year || 0,
        color: v.color || '—',
        fuelType: v.fuel_type || '—',
        transmission: v.transmission || '—',
        status: v.status,
        insuranceUntil: v.insurance_valid_until,
        pucUntil: v.puc_valid_until,
        permitUntil: v.permit_valid_until,
        currentBookingCustomer: activeBooking?.customer_name || null,
        currentBookingPickup: activeBooking?.pickup_at || null,
        currentBookingDrop: activeBooking?.drop_at || null,
        nearestReminder: null,
      };
      row.nearestReminder = getNearestReminder(row);
      return row;
    });

    setAllVehicles(mapped);

    const groupMap: Record<string, VehicleGroup> = {};
    mapped.forEach(v => {
      const key = `${v.brand}|${v.model}|${v.transmission}|${v.fuelType}`;
      if (!groupMap[key]) {
        groupMap[key] = { key, brand: v.brand, model: v.model, transmission: v.transmission, fuelType: v.fuelType, vehicles: [] };
      }
      groupMap[key].vehicles.push(v);
    });
    setGroups(Object.values(groupMap));
    setLoading(false);
  };

  useEffect(() => { loadVehicles(); }, [selectedDate]);

  const getStatusStyle = (s: string) => {
    if (s === 'available')   return { bg: 'bg-green-100 text-green-700',   label: 'Available' };
    if (s === 'rented')      return { bg: 'bg-blue-100 text-blue-700',     label: 'In Use' };
    if (s === 'maintenance') return { bg: 'bg-orange-100 text-orange-700', label: 'Maintenance' };
    return { bg: 'bg-slate-100 text-slate-600', label: s };
  };

  const alertCount = allVehicles.filter(v =>
    getDocAlert(v.insuranceUntil) !== 'ok' ||
    getDocAlert(v.pucUntil) !== 'ok' ||
    getDocAlert(v.permitUntil) !== 'ok'
  ).length;

  const filteredGroups = groups
    .map(g => ({
      ...g,
      vehicles: g.vehicles.filter(v => {
        const matchStatus = statusFilter === 'All' || v.status === statusFilter;
        const matchSearch =
          v.registrationNo.toLowerCase().includes(search.toLowerCase()) ||
          `${v.brand} ${v.model}`.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchSearch;
      }),
    }))
    .filter(g => g.vehicles.length > 0);

  const COL_SPAN = 6;

  // ── Add Vehicle view ─────────────────────────────────────
  if (showAddVehicle) {
    return (
      <AddNewVehicle
        onSave={async () => { await loadVehicles(); setShowAddVehicle(false); }}
        onCancel={() => setShowAddVehicle(false)}
      />
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[24px] font-extrabold text-[#151a3c] tracking-tight">Vehicles</h2>
          <p className="text-[#6c7e96] text-sm font-medium mt-1">
            All registered vehicles · {allVehicles.length} total
            {alertCount > 0 && <span className="ml-2 text-orange-500 font-bold">· {alertCount} with expiry alerts</span>}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Search */}
          <div className="relative group w-full sm:w-[220px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cbd5e1] w-4 h-4 group-focus-within:text-[#6360DF] transition-colors" />
            <input type="text" placeholder="Search reg. no or model..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-[#d1d0eb] rounded-full py-2.5 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all" />
          </div>

          {/* Date picker */}
          <div className="flex items-center space-x-2 bg-white px-4 py-2.5 rounded-xl border border-[#d1d0eb] text-sm font-semibold text-[#151a3c]">
            <Calendar size={15} className="text-[#6c7e96] shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="outline-none bg-transparent text-sm font-semibold text-[#151a3c] cursor-pointer w-[116px]"
            />
          </div>

          {/* Status filter */}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="appearance-none bg-white border border-[#d1d0eb] rounded-xl py-2.5 px-4 text-xs font-bold text-[#151a3c] outline-none cursor-pointer focus:ring-2 focus:ring-[#6360DF]/10 transition-all">
            <option value="All">All Status</option>
            <option value="available">Available</option>
            <option value="rented">In Use</option>
            <option value="maintenance">Maintenance</option>
          </select>

          {/* New Vehicle button */}
          <button
            onClick={() => setShowAddVehicle(true)}
            className="flex items-center space-x-2 bg-[#6360DF] hover:bg-[#5451d0] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#6360df22] transition-all">
            <Plus size={16} /><span>New Vehicle</span>
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">

            {/* Table  header — darker bg */}
            <thead>
              <tr className="bg-[#d6d5df] text-[10px] font-bold text-[#4a4870] tracking-widest uppercase border-b border-[#cccbe8]">
                <th className="pl-8 py-4 font-bold">Vehicle No.</th>
                <th className="px-4 py-4 font-bold">Year</th>
                <th className="px-4 py-4 font-bold">Color</th>
                <th className="px-4 py-4 font-bold">Status</th>
                <th className="px-4 py-4 font-bold">Current Booking & Duration</th>
                <th className="px-4 py-4 pr-8 font-bold">Reminder</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#d1d0eb]/10">
              {loading ? (
                <tr><td colSpan={COL_SPAN} className="py-16 text-center">
                  <div className="flex items-center justify-center text-[#6c7e96]">
                    <Loader2 size={22} className="animate-spin mr-2" />
                    <span className="text-sm font-medium">Loading vehicles...</span>
                  </div>
                </td></tr>
              ) : filteredGroups.length === 0 ? (
                <tr><td colSpan={COL_SPAN} className="py-16 text-center text-[#6c7e96] text-sm font-medium">
                  {allVehicles.length === 0 ? 'No vehicles added yet.' : 'No vehicles match your search.'}
                </td></tr>
              ) : (
                filteredGroups.map((group, gi) => (
                  <React.Fragment key={group.key}>

                    {/* ── Group header — gray, lighter than thead ── */}
                    <tr className="bg-[#F4F4F8] border-t border-b border-[#dddce8]">
                      <td colSpan={COL_SPAN} className="py-2.5 pl-8 pr-6">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <CarIcon size={13} className="text-[#6c7e96] shrink-0" />
                          {/* Brand + model — larger, darker */}
                          <span className="font-extrabold text-[#2a2850] text-[15px] tracking-tight">
                            {group.brand} {group.model}
                          </span>
                          <span className="text-[#b0afc8]">·</span>
                          <span className="text-[13px] font-bold text-[#4a4870]">{group.transmission}</span>
                          <span className="text-[#b0afc8]">·</span>
                          <span className="text-[13px] font-bold text-[#4a4870]">{group.fuelType}</span>
                          <span className="text-[#b0afc8]">·</span>
                          <span className="text-[13px] font-bold text-[#6360DF]">
                            {group.vehicles.filter(v => v.status === 'available').length}/{group.vehicles.length} Available
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* ── Vehicle rows ── */}
                    {group.vehicles.map((v, vi) => {
                      const ss = getStatusStyle(v.status);
                      const hasAlert = v.nearestReminder && v.nearestReminder.alert !== 'ok';
                      return (
                        <motion.tr
                          key={v.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: (gi + vi) * 0.02 }}
                          className={`transition-colors ${hasAlert ? 'hover:bg-orange-50/30' : 'hover:bg-[#F8F9FA]'}`}
                        >
                          {/* Vehicle No. */}
                          <td className="py-2 pl-8 whitespace-nowrap">
                            <span className="font-bold text-[#151a3c] text-[14px]">{v.registrationNo}</span>
                          </td>

                          {/* Year */}
                          <td className="py-2 px-4 whitespace-nowrap">
                            <span className="text-[13px] font-semibold text-[#4a4870]">{v.year || '—'}</span>
                          </td>

                          {/* Color */}
                          <td className="py-2 px-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 rounded-full border border-slate-200 shrink-0"
                                style={{ backgroundColor: v.color?.toLowerCase() || '#ccc' }} />
                              <span className="text-[13px] font-semibold text-[#4a4870] capitalize">{v.color}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-2 px-4 whitespace-nowrap">
                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-widest ${ss.bg}`}>
                              {ss.label}
                            </span>
                          </td>

                          {/* Current Booking & Duration */}
                          <td className="py-2 px-4 whitespace-nowrap">
                            {v.currentBookingCustomer ? (
                              <div>
                                <p className="text-[14px] font-bold text-[#151a3c]">{v.currentBookingCustomer}</p>
                                <div className="flex items-center space-x-1.5 mt-0.5 text-[11px] font-medium text-[#6c7e96]">
                                  <Calendar size={10} className="text-[#6360DF]" />
                                  <span>{fmtDate(v.currentBookingPickup)} → {fmtDate(v.currentBookingDrop)}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[13px] font-medium text-[#6c7e96] italic">No active booking</span>
                            )}
                          </td>

                          {/* Nearest Reminder */}
                          <td className="py-2 px-4 pr-8 whitespace-nowrap">
                            <ReminderText reminder={v.nearestReminder} />
                          </td>
                        </motion.tr>
                      );
                    })}

                    {/* Spacer between groups */}
                    {gi < filteredGroups.length - 1 && (
                      <tr><td colSpan={COL_SPAN} className="py-1" /></tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VehiclesPage;