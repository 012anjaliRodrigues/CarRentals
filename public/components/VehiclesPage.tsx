import React, { useState, useEffect } from 'react';
import { Car as CarIcon, Loader2, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase, getCurrentUser } from '../supabaseClient';

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
  insuranceAlert: 'ok' | 'soon' | 'expired';
  pucAlert: 'ok' | 'soon' | 'expired';
  permitAlert: 'ok' | 'soon' | 'expired';
}

const getDocAlert = (dateStr: string | null): 'ok' | 'soon' | 'expired' => {
  if (!dateStr) return 'expired';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'soon';
  return 'ok';
};

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DocBadge: React.FC<{ label: string; date: string | null; alert: 'ok' | 'soon' | 'expired' }> = ({ label, date, alert }) => {
  const styles = {
    ok:      'bg-green-50 text-green-700 border-green-200',
    soon:    'bg-orange-50 text-orange-700 border-orange-200',
    expired: 'bg-red-50 text-red-600 border-red-200',
  };
  const icons = {
    ok:      <CheckCircle2 size={10} />,
    soon:    <AlertTriangle size={10} />,
    expired: <AlertTriangle size={10} />,
  };
  return (
    <div className={`inline-flex flex-col px-2.5 py-1.5 rounded-lg border text-[10px] font-bold ${styles[alert]}`}>
      <div className="flex items-center space-x-1">{icons[alert]}<span>{label}</span></div>
      <span className="font-medium mt-0.5 text-[9px]">{fmtDate(date)}</span>
    </div>
  );
};

const VehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

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
        models ( brand, name )
      `)
      .eq('owner_id', ownerRow.id)
      .order('created_at', { ascending: false });

    if (error) { setLoading(false); return; }

    setVehicles(((data as any[]) || []).map((v: any) => ({
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
      insuranceAlert: getDocAlert(v.insurance_valid_until),
      pucAlert: getDocAlert(v.puc_valid_until),
      permitAlert: getDocAlert(v.permit_valid_until),
    })));
    setLoading(false);
  };

  useEffect(() => { loadVehicles(); }, []);

  const getStatusStyle = (s: string) => {
    if (s === 'available')   return { bg: 'bg-green-100 text-green-700', label: 'Available' };
    if (s === 'rented')      return { bg: 'bg-blue-100 text-blue-700',   label: 'In Use' };
    if (s === 'maintenance') return { bg: 'bg-orange-100 text-orange-700', label: 'Maintenance' };
    return { bg: 'bg-slate-100 text-slate-600', label: s };
  };

  const filtered = vehicles
    .filter(v => statusFilter === 'All' || v.status === statusFilter)
    .filter(v =>
      v.registrationNo.toLowerCase().includes(search.toLowerCase()) ||
      `${v.brand} ${v.model}`.toLowerCase().includes(search.toLowerCase())
    );

  const alertCount = vehicles.filter(v =>
    v.insuranceAlert !== 'ok' || v.pucAlert !== 'ok' || v.permitAlert !== 'ok'
  ).length;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[24px] font-extrabold text-[#151a3c] tracking-tight">Vehicles</h2>
          <p className="text-[#6c7e96] text-sm font-medium mt-1">
            All registered vehicles · {vehicles.length} total
            {alertCount > 0 && <span className="ml-2 text-orange-500 font-bold">· {alertCount} with expiry alerts</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group w-[260px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cbd5e1] w-4 h-4 group-focus-within:text-[#6360DF] transition-colors" />
            <input type="text" placeholder="Search by reg. no or model..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-[#d1d0eb] rounded-full py-2.5 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="appearance-none bg-white border border-[#d1d0eb] rounded-xl py-2.5 px-4 text-xs font-bold text-[#151a3c] outline-none cursor-pointer focus:ring-2 focus:ring-[#6360DF]/10 transition-all">
            <option value="All">All Status</option>
            <option value="available">Available</option>
            <option value="rented">In Use</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F9F9FF]/50 text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/20">
                <th className="pl-10 py-5 font-bold">Vehicle</th>
                <th className="px-4 py-5 font-bold">Reg. No.</th>
                <th className="px-4 py-5 font-bold">Year</th>
                <th className="px-4 py-5 font-bold">Color</th>
                <th className="px-4 py-5 font-bold">Fuel</th>
                <th className="px-4 py-5 font-bold">Transmission</th>
                <th className="px-4 py-5 font-bold">Status</th>
                <th className="px-4 py-5 font-bold">Documents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d1d0eb]/10">
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center">
                  <div className="flex items-center justify-center text-[#6c7e96]">
                    <Loader2 size={22} className="animate-spin mr-2" />
                    <span className="text-sm font-medium">Loading vehicles...</span>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-[#6c7e96] text-sm font-medium">
                  {vehicles.length === 0 ? 'No vehicles added yet.' : 'No vehicles match your search.'}
                </td></tr>
              ) : (
                filtered.map((v, i) => {
                  const ss = getStatusStyle(v.status);
                  const hasAlert = v.insuranceAlert !== 'ok' || v.pucAlert !== 'ok' || v.permitAlert !== 'ok';
                  return (
                    <motion.tr key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className={`group transition-colors ${hasAlert ? 'hover:bg-orange-50/30' : 'hover:bg-[#F8F9FA]'}`}>
                      <td className="py-5 pl-10 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-[#EEEDFA] flex items-center justify-center text-[#6360DF] shrink-0">
                            <CarIcon size={16} />
                          </div>
                          <span className="font-bold text-[#151a3c] text-sm">{v.brand} {v.model}</span>
                        </div>
                      </td>
                      <td className="py-5 px-4 font-bold text-[#151a3c] text-sm whitespace-nowrap">{v.registrationNo}</td>
                      <td className="py-5 px-4 text-sm font-medium text-[#6c7e96] whitespace-nowrap">{v.year || '—'}</td>
                      <td className="py-5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: v.color?.toLowerCase() || '#ccc' }} />
                          <span className="text-sm font-medium text-[#6c7e96] capitalize">{v.color}</span>
                        </div>
                      </td>
                      <td className="py-5 px-4 text-sm font-medium text-[#6c7e96] whitespace-nowrap capitalize">{v.fuelType}</td>
                      <td className="py-5 px-4 text-sm font-medium text-[#6c7e96] whitespace-nowrap capitalize">{v.transmission}</td>
                      <td className="py-5 px-4 whitespace-nowrap">
                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-widest ${ss.bg}`}>{ss.label}</span>
                      </td>
                      <td className="py-5 px-4 pr-8">
                        <div className="flex items-center gap-2 flex-wrap">
                          <DocBadge label="Insurance" date={v.insuranceUntil} alert={v.insuranceAlert} />
                          <DocBadge label="PUC" date={v.pucUntil} alert={v.pucAlert} />
                          <DocBadge label="Permit" date={v.permitUntil} alert={v.permitAlert} />
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
    </div>
  );
};

export default VehiclesPage;