import React, { useState, useEffect } from 'react';
import { 
  Search, 
  UserPlus, 
  Eye, 
  Pencil, 
  Trash2, 
  ChevronDown,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase, getCurrentUser } from '../supabaseClient';
import AddDriver from './AddDriver';

interface Driver {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  avatarTextColor: string;
  location: string;
  phone: string;
  licenseNo: string;
  tripsCompleted: number;
  tripsTotal: number;
  status: 'COMPLETED' | 'NOT COMPLETED';
}

// Cycle through a few colors for avatars
const AVATAR_COLORS = [
  { bg: '#D1FAE5', text: '#059669' },
  { bg: '#EEEDFA', text: '#6360DF' },
  { bg: '#F3F4F6', text: '#6c7e96' },
  { bg: '#FEF3C7', text: '#D97706' },
];

const DriversPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [view, setView] = useState<'list' | 'add'>('list');
  const [driversData, setDriversData] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Load drivers from DB ──────────────────────────────────────
  const loadDrivers = async () => {
    setLoading(true);
    const authUser = await getCurrentUser();
    if (!authUser) { setLoading(false); return; }

    const { data: ownerRow } = await supabase
      .from('owners').select('id').eq('user_id', authUser.id).single();
    if (!ownerRow) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('drivers')
      .select('id, full_name, phone, license_no, current_location, status')
      .eq('owner_id', ownerRow.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading drivers:', error);
      toast.error('Failed to load drivers.');
      setLoading(false);
      return;
    }

    const mapped: Driver[] = (data || []).map((d: any, idx: number) => {
      const initials = d.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
      const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
      return {
        id: d.id,
        name: d.full_name,
        initials,
        avatarColor: color.bg,
        avatarTextColor: color.text,
        location: d.current_location || 'Not Assigned',
        phone: d.phone,
        licenseNo: d.license_no,
        tripsCompleted: 0,
        tripsTotal: 0,
        status: d.status === 'active' ? 'NOT COMPLETED' : 'COMPLETED',
      };
    });

    setDriversData(mapped);
    setLoading(false);
  };
  // ─────────────────────────────────────────────────────────────

  useEffect(() => { loadDrivers(); }, []);

  // ── Delete driver ─────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this driver?')) return;

    const { error } = await supabase.from('drivers').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete driver.');
      return;
    }
    toast.success('Driver deleted.');
    setDriversData(prev => prev.filter(d => d.id !== id));
  };
  // ─────────────────────────────────────────────────────────────

  const handleSaveDriver = async (_newDriver: { name: string; phone: string; licenseNo: string }) => {
    await loadDrivers();
    setView('list');
  };

  return (
    <div className="min-h-full">
      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-[24px] font-extrabold text-[#151a3c] tracking-tight">Drivers</h2>
                <p className="text-[#6c7e96] text-sm font-medium mt-1">Manage your fleet of drivers and their assignments</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative group w-[300px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cbd5e1] w-4 h-4 group-focus-within:text-[#6360DF] transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search drivers..."
                    className="w-full bg-white border border-[#d1d0eb] rounded-full py-2.5 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <button 
                  onClick={() => setView('add')}
                  className="bg-[#6360DF] hover:bg-[#5451d0] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-[#6360df33] transition-all flex items-center space-x-2"
                >
                  <UserPlus size={18} />
                  <span>Add Driver</span>
                </button>
              </div>
            </div>

            {/* Filter Section */}
            <div className="flex items-center space-x-3">
              <span className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase">Filter By:</span>
              <div className="relative">
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="appearance-none bg-white border border-[#d1d0eb] rounded-full py-2 px-5 pr-10 text-xs font-bold text-[#151a3c] outline-none cursor-pointer focus:ring-2 focus:ring-[#6360DF]/10 transition-all"
                >
                  <option>All</option>
                  <option>Completed</option>
                  <option>Not Completed</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none w-3 h-3" />
              </div>
            </div>

            {/* Drivers Table Card */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#F8F9FA]/50 text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/20">
                      <th className="pl-10 py-5 font-bold">Driver Name</th>
                      <th className="px-6 py-5 font-bold">Current Location</th>
                      <th className="px-6 py-5 font-bold">Phone</th>
                      <th className="px-6 py-5 font-bold text-center">No. of Trips</th>
                      <th className="px-6 py-5 font-bold">Status</th>
                      <th className="px-10 py-5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d1d0eb]/10">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <div className="flex items-center justify-center text-[#6c7e96]">
                            <Loader2 size={22} className="animate-spin mr-2" />
                            <span className="text-sm font-medium">Loading drivers...</span>
                          </div>
                        </td>
                      </tr>
                    ) : driversData.filter(d => {
                      if (filterStatus === 'All') return true;
                      return d.status === filterStatus.toUpperCase();
                    }).filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-[#6c7e96] text-sm font-medium">
                          {driversData.length === 0 ? 'No drivers added yet. Click "Add Driver" to get started.' : 'No drivers match your search.'}
                        </td>
                      </tr>
                    ) : (
                      driversData.filter(d => {
                        if (filterStatus === 'All') return true;
                        return d.status === filterStatus.toUpperCase();
                      }).filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase())).map((driver) => (
                        <tr key={driver.id} className="group hover:bg-[#F8F9FA] transition-colors">
                          <td className="py-5 pl-10 whitespace-nowrap">
                            <div className="flex items-center">
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-extrabold"
                                style={{ backgroundColor: driver.avatarColor, color: driver.avatarTextColor }}
                              >
                                {driver.initials}
                              </div>
                              <span className="ml-3 font-bold text-[#151a3c] text-sm">{driver.name}</span>
                            </div>
                          </td>
                          <td className="py-5 px-6 text-sm font-medium text-[#151a3c] whitespace-nowrap">
                            {driver.location}
                          </td>
                          <td className="py-5 px-6 text-sm font-medium text-[#151a3c] whitespace-nowrap">
                            {driver.phone}
                          </td>
                          <td className="py-5 px-6 text-center text-sm font-medium text-[#151a3c]">
                            {driver.tripsCompleted}/{driver.tripsTotal}
                          </td>
                          <td className="py-5 px-6">
                            <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-extrabold tracking-widest ${
                              driver.status === 'COMPLETED' ? 'bg-[#D1FAE5] text-[#059669]' : 'bg-[#FEF3C7] text-[#D97706]'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                                driver.status === 'COMPLETED' ? 'bg-[#059669]' : 'bg-[#D97706]'
                              }`} />
                              {driver.status}
                            </div>
                          </td>
                          <td className="py-5 px-10 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-3">
                              <button className="text-[#6c7e96] hover:text-[#6360DF] transition-colors"><Eye size={18} /></button>
                              <button className="text-[#6c7e96] hover:text-[#6360DF] transition-colors"><Pencil size={18} /></button>
                              <button 
                                onClick={() => handleDelete(driver.id)}
                                className="text-[#6c7e96] hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <AddDriver 
            onSave={handleSaveDriver}
            onCancel={() => setView('list')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DriversPage;
