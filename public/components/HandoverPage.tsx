import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Search, Filter, Plus, CheckCircle2, Clock,
  Car, User, MapPin, Calendar, ChevronDown, FileText, Camera,
  Fuel, Settings2, AlertTriangle, ChevronRight, X
} from 'lucide-react';

type HandoverStatus = 'Pending' | 'Checked Out' | 'Returned';

interface HandoverRecord {
  id: number;
  customer: string;
  initials: string;
  vehicle: string;
  registration: string;
  status: HandoverStatus;
  checkoutTime: string;
  returnTime: string;
  location: string;
  fuelLevel: number;
  odometerOut: number;
  odometerIn?: number;
  remarks: string;
  checklist: { label: string; checked: boolean }[];
}

const mockHandovers: HandoverRecord[] = [
  {
    id: 1, customer: 'Timothy D\'Souza', initials: 'TD',
    vehicle: 'Maruti Swift', registration: 'GA 23 AD 2435',
    status: 'Pending', checkoutTime: '10:30 AM', returnTime: '05:00 PM',
    location: 'Panjim Airport', fuelLevel: 75, odometerOut: 24500,
    remarks: 'Handle with care — new vehicle.',
    checklist: [
      { label: 'Fuel Level Noted', checked: false },
      { label: 'Odometer Reading', checked: false },
      { label: 'Exterior Inspection', checked: false },
      { label: 'Interior Inspection', checked: false },
      { label: 'Documents Verified', checked: false },
      { label: 'Keys Handed Over', checked: false },
    ]
  },
  {
    id: 2, customer: 'Priya Nair', initials: 'PN',
    vehicle: 'Hyundai Creta', registration: 'GA 12 AB 1234',
    status: 'Checked Out', checkoutTime: '08:00 AM', returnTime: '06:00 PM',
    location: 'Calangute Beach', fuelLevel: 50, odometerOut: 18230,
    remarks: '',
    checklist: [
      { label: 'Fuel Level Noted', checked: true },
      { label: 'Odometer Reading', checked: true },
      { label: 'Exterior Inspection', checked: true },
      { label: 'Interior Inspection', checked: true },
      { label: 'Documents Verified', checked: true },
      { label: 'Keys Handed Over', checked: true },
    ]
  },
  {
    id: 3, customer: 'Rahul Mehta', initials: 'RM',
    vehicle: 'Maruti Swift', registration: 'GA 77 QW 2342',
    status: 'Returned', checkoutTime: '09:00 AM', returnTime: '04:30 PM',
    location: 'Margao', fuelLevel: 40, odometerOut: 31000, odometerIn: 31280,
    remarks: 'Minor scratch on rear bumper, noted and photographed.',
    checklist: [
      { label: 'Fuel Level Noted', checked: true },
      { label: 'Odometer Reading', checked: true },
      { label: 'Exterior Inspection', checked: true },
      { label: 'Interior Inspection', checked: true },
      { label: 'Documents Verified', checked: true },
      { label: 'Keys Returned', checked: true },
    ]
  },
];

const statusConfig: Record<HandoverStatus, { label: string; color: string; bg: string; }> = {
  'Pending': { label: 'Pending', color: 'text-orange-600', bg: 'bg-orange-50' },
  'Checked Out': { label: 'Checked Out', color: 'text-blue-600', bg: 'bg-blue-50' },
  'Returned': { label: 'Returned', color: 'text-green-600', bg: 'bg-green-50' },
};

const FuelBar: React.FC<{ level: number }> = ({ level }) => (
  <div className="flex items-center space-x-2">
    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${level >= 70 ? 'bg-green-400' : level >= 40 ? 'bg-orange-400' : 'bg-red-400'}`}
        style={{ width: `${level}%` }}
      />
    </div>
    <span className="text-xs font-bold text-[#6c7e96] w-8">{level}%</span>
  </div>
);

const HandoverPage: React.FC = () => {
  const [records, setRecords] = useState<HandoverRecord[]>(mockHandovers);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | HandoverStatus>('All');
  const [selectedRecord, setSelectedRecord] = useState<HandoverRecord | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const filtered = records.filter(r => {
    const matchesSearch = r.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.registration.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    pending: records.filter(r => r.status === 'Pending').length,
    checkedOut: records.filter(r => r.status === 'Checked Out').length,
    returned: records.filter(r => r.status === 'Returned').length,
  };

  const handleChecklistToggle = (recordId: number, itemIdx: number) => {
    setRecords(prev => prev.map(r => {
      if (r.id !== recordId) return r;
      const newChecklist = r.checklist.map((item, i) => i === itemIdx ? { ...item, checked: !item.checked } : item);
      return { ...r, checklist: newChecklist };
    }));
    if (selectedRecord?.id === recordId) {
      setSelectedRecord(prev => {
        if (!prev) return prev;
        const newChecklist = prev.checklist.map((item, i) => i === itemIdx ? { ...item, checked: !item.checked } : item);
        return { ...prev, checklist: newChecklist };
      });
    }
  };

  const handleStatusChange = (recordId: number, newStatus: HandoverStatus) => {
    setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: newStatus } : r));
    setSelectedRecord(prev => prev?.id === recordId ? { ...prev, status: newStatus } : prev);
  };

  return (
    <div className="min-h-full space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[24px] font-extrabold text-[#151a3c] tracking-tight">Vehicle Handover</h2>
          <p className="text-[#6c7e96] text-sm font-medium mt-1 opacity-80">Manage vehicle check-out and check-in with inspection checklists</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group min-w-[220px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cbd5e1] w-4 h-4 group-focus-within:text-[#6360DF] transition-colors" />
            <input type="text" placeholder="Search customer or vehicle..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#d1d0eb] rounded-full py-2.5 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all" />
          </div>
          <div className="flex items-center space-x-2 bg-white px-4 py-2.5 rounded-xl border border-[#d1d0eb] text-sm font-semibold text-[#151a3c]">
            <Calendar size={16} className="text-[#6c7e96]" />
            <span>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Handover', count: stats.pending, color: 'text-orange-500', bg: 'bg-orange-50', icon: <Clock size={20} /> },
          { label: 'Checked Out', count: stats.checkedOut, color: 'text-blue-500', bg: 'bg-blue-50', icon: <Car size={20} /> },
          { label: 'Returned Today', count: stats.returned, color: 'text-green-500', bg: 'bg-green-50', icon: <CheckCircle2 size={20} /> },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-50 flex items-center justify-between group hover:shadow-lg transition-all">
            <div>
              <p className="text-[#6c7e96] text-xs font-bold uppercase tracking-widest">{s.label}</p>
              <h3 className={`text-3xl font-black mt-1 ${s.color}`}>{s.count}</h3>
            </div>
            <div className={`w-14 h-14 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center`}>{s.icon}</div>
          </motion.div>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center space-x-2">
        {(['All', 'Pending', 'Checked Out', 'Returned'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${statusFilter === s ? 'bg-[#6360DF] text-white shadow-md shadow-[#6360df33]' : 'bg-white text-[#6c7e96] border border-[#d1d0eb] hover:border-[#6360DF] hover:text-[#6360DF]'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F8F9FA]/50 text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/20">
                <th className="pl-8 py-5">Customer</th>
                <th className="px-4 py-5">Vehicle</th>
                <th className="px-4 py-5">Location</th>
                <th className="px-4 py-5">Checkout / Return</th>
                <th className="px-4 py-5">Fuel Level</th>
                <th className="px-4 py-5">Status</th>
                <th className="px-6 py-5">Checklist</th>
                <th className="px-6 py-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d1d0eb]/20">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-[#6c7e96] text-sm font-medium">No handover records match your filters.</td></tr>
              ) : (
                filtered.map((record, idx) => {
                  const sc = statusConfig[record.status];
                  const checkedCount = record.checklist.filter(c => c.checked).length;
                  const totalCount = record.checklist.length;
                  const allChecked = checkedCount === totalCount;

                  return (
                    <motion.tr key={record.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                      className="group hover:bg-[#F8F9FA] transition-colors cursor-pointer"
                      onClick={() => { setSelectedRecord(record); setIsPanelOpen(true); }}>

                      <td className="py-4 pl-8 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-[#EEEDFA] flex items-center justify-center text-[#6360DF] text-[11px] font-extrabold shrink-0">{record.initials}</div>
                          <div>
                            <p className="font-bold text-[#151a3c] text-sm">{record.customer}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Car size={13} className="text-[#6360DF] shrink-0" />
                          <div>
                            <p className="font-bold text-[#151a3c] text-sm">{record.vehicle}</p>
                            <p className="text-[10px] text-[#6c7e96] font-medium">{record.registration}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5 text-xs text-[#6c7e96] font-medium">
                          <MapPin size={10} className="text-[#6360DF]" /><span>{record.location}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-[#151a3c]">
                          <Clock size={10} className="text-[#6c7e96]" />
                          <span>{record.checkoutTime}</span>
                          <span className="text-[#6c7e96] font-normal">→</span>
                          <span>{record.returnTime}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap min-w-[120px]">
                        <FuelBar level={record.fuelLevel} />
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider ${sc.bg} ${sc.color}`}>{sc.label}</span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full w-16 overflow-hidden">
                            <div className={`h-full rounded-full ${allChecked ? 'bg-green-400' : 'bg-[#6360DF]'}`} style={{ width: `${(checkedCount/totalCount)*100}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-[#6c7e96]">{checkedCount}/{totalCount}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          <button onClick={e => { e.stopPropagation(); setSelectedRecord(record); setIsPanelOpen(true); }}
                            className="flex items-center space-x-1.5 bg-[#EEEDFA] text-[#6360DF] px-4 py-2 rounded-lg text-[11px] font-bold hover:bg-[#6360DF] hover:text-white transition-all">
                            <FileText size={11} /><span>View</span>
                          </button>
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

      {/* Detail Panel */}
      <AnimatePresence>
        {isPanelOpen && selectedRecord && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsPanelOpen(false)}
              className="fixed inset-0 z-[110] bg-[#151a3c]/20 backdrop-blur-sm" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-[120] w-full max-w-[480px] bg-white shadow-2xl flex flex-col">

              {/* Panel Header */}
              <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#EEEDFA] flex items-center justify-center text-[#6360DF]"><ClipboardList size={24} /></div>
                  <div>
                    <h3 className="text-xl font-bold text-[#151a3c]">Handover Details</h3>
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1 ${statusConfig[selectedRecord.status].bg} ${statusConfig[selectedRecord.status].color}`}>
                      {selectedRecord.status}
                    </span>
                  </div>
                </div>
                <button onClick={() => setIsPanelOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-[#6c7e96]"><X size={24} /></button>
              </div>

              {/* Panel Body */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

                {/* Vehicle + Customer */}
                <div className="bg-[#f8f7ff] rounded-3xl p-6 border border-[#d1d0eb]/30 space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#6360DF]"><Car size={28} /></div>
                    <div>
                      <h4 className="text-lg font-bold text-[#151a3c]">{selectedRecord.vehicle}</h4>
                      <p className="text-sm text-[#6c7e96] font-medium">{selectedRecord.registration}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#d1d0eb]/30">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-[#EEEDFA] flex items-center justify-center text-[#6360DF] text-[11px] font-extrabold">{selectedRecord.initials}</div>
                      <div>
                        <p className="font-bold text-[#151a3c] text-sm">{selectedRecord.customer}</p>
                        <div className="flex items-center space-x-1 text-xs text-[#6c7e96] font-medium"><MapPin size={10} /><span>{selectedRecord.location}</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Check-out</p>
                    <div className="flex items-center space-x-2 text-sm font-bold text-[#151a3c]"><Clock size={14} className="text-[#6360DF]" /><span>{selectedRecord.checkoutTime}</span></div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Return</p>
                    <div className="flex items-center space-x-2 text-sm font-bold text-[#151a3c]"><Clock size={14} className="text-green-500" /><span>{selectedRecord.returnTime}</span></div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Odometer Out</p>
                    <p className="text-sm font-bold text-[#151a3c]">{selectedRecord.odometerOut.toLocaleString()} km</p>
                  </div>
                  {selectedRecord.odometerIn && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Odometer In</p>
                      <p className="text-sm font-bold text-[#151a3c]">{selectedRecord.odometerIn.toLocaleString()} km</p>
                    </div>
                  )}
                  <div className="col-span-2 space-y-2">
                    <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Fuel Level</p>
                    <FuelBar level={selectedRecord.fuelLevel} />
                  </div>
                </div>

                {/* Checklist */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Inspection Checklist</p>
                    <span className="text-xs font-bold text-[#6360DF]">
                      {selectedRecord.checklist.filter(c => c.checked).length}/{selectedRecord.checklist.length} Done
                    </span>
                  </div>
                  <div className="space-y-2">
                    {selectedRecord.checklist.map((item, i) => (
                      <button key={i} onClick={() => handleChecklistToggle(selectedRecord.id, i)}
                        className={`w-full flex items-center space-x-3 p-3.5 rounded-xl border transition-all text-left ${item.checked ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100 hover:border-[#d1d0eb]'}`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${item.checked ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                          {item.checked && <CheckCircle2 size={12} className="text-white" />}
                        </div>
                        <span className={`text-sm font-bold ${item.checked ? 'text-green-700 line-through' : 'text-[#151a3c]'}`}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Remarks */}
                {selectedRecord.remarks && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Remarks</p>
                    <div className="flex items-start space-x-2 bg-orange-50 border border-orange-100 rounded-xl p-4">
                      <AlertTriangle size={14} className="text-orange-500 mt-0.5 shrink-0" />
                      <p className="text-sm font-medium text-[#151a3c]">{selectedRecord.remarks}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Panel Footer */}
              <div className="p-8 border-t border-slate-100 bg-slate-50/50 space-y-3 shrink-0">
                {selectedRecord.status === 'Pending' && (
                  <button onClick={() => handleStatusChange(selectedRecord.id, 'Checked Out')}
                    className="w-full bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-[#6360df33]">
                    <Car size={18} /><span>Mark as Checked Out</span>
                  </button>
                )}
                {selectedRecord.status === 'Checked Out' && (
                  <button onClick={() => handleStatusChange(selectedRecord.id, 'Returned')}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-green-200">
                    <CheckCircle2 size={18} /><span>Mark as Returned</span>
                  </button>
                )}
                {selectedRecord.status === 'Returned' && (
                  <div className="flex items-center justify-center space-x-2 text-green-600 font-bold py-4">
                    <CheckCircle2 size={18} /><span>Handover Complete</span>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HandoverPage;