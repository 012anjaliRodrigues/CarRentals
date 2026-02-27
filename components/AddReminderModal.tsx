import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Calendar, Shield, Wrench, DollarSign, Search, ChevronDown } from 'lucide-react';
import { VehicleOption } from './RemindersPage';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (reminder: { vehicleId: string; type: string; category: string; priority: string; dueDate: string; }) => void;
  vehicles: VehicleOption[];
}

const reminderTypes = [
  { group: 'Critical', items: [
    { label: 'Insurance Expiry', icon: <Shield className="w-4 h-4" /> },
    { label: 'Pollution (PUC)', icon: <Shield className="w-4 h-4" /> },
    { label: 'RC Renewal', icon: <Shield className="w-4 h-4" /> },
    { label: 'Fitness Certificate', icon: <Shield className="w-4 h-4" /> },
  ]},
  { group: 'Maintenance', items: [
    { label: 'Oil Change', icon: <Wrench className="w-4 h-4" /> },
    { label: 'General Service', icon: <Wrench className="w-4 h-4" /> },
    { label: 'Battery Replacement', icon: <Wrench className="w-4 h-4" /> },
    { label: 'Vehicle Cleaning', icon: <Wrench className="w-4 h-4" /> },
  ]},
  { group: 'Financial', items: [
    { label: 'Tax Payment', icon: <DollarSign className="w-4 h-4" /> },
    { label: 'Permit Renewal', icon: <DollarSign className="w-4 h-4" /> },
  ]},
];

const AddReminderModal: React.FC<AddReminderModalProps> = ({ isOpen, onClose, onAdd, vehicles }) => {
  const [formData, setFormData] = useState({
    vehicleId: '', vehicleLabel: '',
    type: '', category: 'Critical' as any,
    priority: 'High' as any, dueDate: '',
  });
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [isVehicleOpen, setIsVehicleOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);

  // Group vehicles by category
  const groupedVehicles = vehicles.reduce((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {} as Record<string, VehicleOption[]>);

  const filteredVehicles = vehicleSearch
    ? vehicles.filter(v => v.registration.toLowerCase().includes(vehicleSearch.toLowerCase()) || v.model.toLowerCase().includes(vehicleSearch.toLowerCase()))
    : vehicles;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.type || !formData.dueDate) return;
    onAdd({ vehicleId: formData.vehicleId, type: formData.type, category: formData.category, priority: formData.priority, dueDate: formData.dueDate });
    onClose();
    setFormData({ vehicleId: '', vehicleLabel: '', type: '', category: 'Critical', priority: 'High', dueDate: '' });
    setVehicleSearch('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-[#151a3c]/40 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-[600px] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-[#EEEDFA] flex items-center justify-center text-[#6360DF]"><Plus size={24} /></div>
                <div>
                  <h3 className="text-xl font-bold text-[#151a3c]">Add New Reminder</h3>
                  <p className="text-sm text-[#6c7e96] font-medium">Set alerts for vehicle maintenance</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-[#6c7e96]"><X size={24} /></button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">

              {/* Vehicle */}
              <div className="space-y-2 relative">
                <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest">Select Vehicle *</label>
                <div onClick={() => setIsVehicleOpen(!isVehicleOpen)}
                  className="w-full bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-3.5 px-4 text-sm font-bold text-[#151a3c] flex items-center justify-between cursor-pointer hover:border-[#6360DF] transition-all">
                  <span className={formData.vehicleLabel ? 'text-[#151a3c]' : 'text-[#6c7e96]'}>{formData.vehicleLabel || 'Search & Select Vehicle'}</span>
                  <ChevronDown size={18} className={cn("transition-transform", isVehicleOpen && "rotate-180")} />
                </div>
                <AnimatePresence>
                  {isVehicleOpen && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute z-10 w-full mt-2 bg-white border border-[#d1d0eb] rounded-2xl shadow-xl overflow-hidden">
                      <div className="p-3 border-b border-slate-100">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6c7e96] w-4 h-4" />
                          <input type="text" placeholder="Search vehicle..." value={vehicleSearch}
                            onChange={e => setVehicleSearch(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            className="w-full bg-slate-50 border-none rounded-lg py-2 pl-9 pr-4 text-xs font-medium outline-none" />
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {vehicles.length === 0 ? (
                          <div className="p-4 text-center text-sm text-[#6c7e96] font-medium">No vehicles found. Add vehicles in Fleet Listing first.</div>
                        ) : filteredVehicles.length === 0 ? (
                          <div className="p-4 text-center text-sm text-[#6c7e96] font-medium">No vehicles match your search.</div>
                        ) : (
                          filteredVehicles.map(v => (
                            <div key={v.id} onClick={() => { setFormData({...formData, vehicleId: v.id, vehicleLabel: `${v.registration} • ${v.model}`}); setIsVehicleOpen(false); setVehicleSearch(''); }}
                              className="px-4 py-3 text-sm font-bold text-[#151a3c] hover:bg-[#EEEDFA] hover:text-[#6360DF] cursor-pointer transition-colors">
                              {v.registration} <span className="font-normal text-[#6c7e96]">• {v.model}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Reminder Type */}
              <div className="space-y-2 relative">
                <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest">Reminder Type *</label>
                <div onClick={() => setIsTypeOpen(!isTypeOpen)}
                  className="w-full bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-3.5 px-4 text-sm font-bold text-[#151a3c] flex items-center justify-between cursor-pointer hover:border-[#6360DF] transition-all">
                  <span className={formData.type ? 'text-[#151a3c]' : 'text-[#6c7e96]'}>{formData.type || 'Select Reminder Type'}</span>
                  <ChevronDown size={18} className={cn("transition-transform", isTypeOpen && "rotate-180")} />
                </div>
                <AnimatePresence>
                  {isTypeOpen && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute z-10 w-full mt-2 bg-white border border-[#d1d0eb] rounded-2xl shadow-xl overflow-hidden">
                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {reminderTypes.map(group => (
                          <div key={group.group}>
                            <div className="px-4 py-2 bg-slate-50 text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">{group.group}</div>
                            {group.items.map(item => (
                              <div key={item.label}
                                onClick={() => { setFormData({...formData, type: item.label, category: group.group as any}); setIsTypeOpen(false); }}
                                className="px-4 py-3 text-sm font-bold text-[#151a3c] hover:bg-[#EEEDFA] hover:text-[#6360DF] cursor-pointer transition-colors flex items-center space-x-3">
                                <div className="text-[#6360DF]">{item.icon}</div><span>{item.label}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Priority */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest">Priority *</label>
                <div className="grid grid-cols-4 gap-3">
                  {(['Critical','High','Medium','Low'] as const).map(p => (
                    <button key={p} type="button" onClick={() => setFormData({...formData, priority: p})}
                      className={cn("py-2.5 rounded-xl text-xs font-bold transition-all border-2",
                        formData.priority === p
                          ? p === 'Critical' ? "bg-red-50 border-red-500 text-red-600"
                            : p === 'High' ? "bg-orange-50 border-orange-500 text-orange-600"
                            : p === 'Medium' ? "bg-blue-50 border-blue-500 text-blue-600"
                            : "bg-green-50 border-green-500 text-green-600"
                          : "bg-slate-50 border-transparent text-[#6c7e96] hover:bg-slate-100"
                      )}>{p}</button>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest">Due Date *</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6360DF] w-4 h-4" />
                  <input type="date" min={new Date().toISOString().split('T')[0]} value={formData.dueDate}
                    onChange={e => setFormData({...formData, dueDate: e.target.value})}
                    className="w-full bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-3.5 pl-12 pr-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all" />
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="px-8 py-6 border-t border-slate-100 flex items-center justify-end space-x-4 shrink-0">
              <button type="button" onClick={onClose} className="px-6 py-3 text-sm font-bold text-[#6c7e96] hover:text-[#151a3c] transition-colors">Cancel</button>
              <button onClick={handleSubmit} disabled={!formData.vehicleId || !formData.type || !formData.dueDate}
                className="flex-1 bg-[#6360DF] hover:bg-[#5451d0] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-[#6360df33] transition-all flex items-center justify-center space-x-2">
                <Plus size={18} /><span>Create Reminder</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddReminderModal;