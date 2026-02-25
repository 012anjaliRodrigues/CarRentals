
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Bell, 
  Plus, 
  MoreVertical, 
  Filter,
  ChevronDown,
  X,
  CheckCircle,
  BellRing
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Booking {
  id: string;
  customer: string;
  initials: string;
  period: string;
  status: 'UPCOMING' | 'COMPLETED';
}

interface Reminder {
  id: string;
  title: string;
  date: string;
  status: 'ACTION REQUIRED' | 'UPCOMING' | 'OVERDUE' | 'COMPLIANT';
}

interface VehicleProfileProps {
  vehicle: any;
  instancePlate: string;
  status: 'In use' | 'Available' | 'Maintenance';
  onBack: () => void;
}

const VehicleProfile: React.FC<VehicleProfileProps> = ({ vehicle, instancePlate, status, onBack }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([
    { id: '1', title: 'INSURANCE EXPIRY', date: 'Nov 12, 2023', status: 'ACTION REQUIRED' },
    { id: '2', title: 'OIL CHANGE DUE', date: 'Dec 05, 2023', status: 'UPCOMING' },
    { id: '3', title: 'POLLUTION (PUC)', date: 'Oct 28, 2023', status: 'OVERDUE' },
    { id: '4', title: 'RC RENEWAL', date: 'Mar 15, 2024', status: 'COMPLIANT' },
  ]);

  const [newReminder, setNewReminder] = useState({ title: 'Insurance', date: '' });

  const bookings: Booking[] = [
    { id: '1', customer: 'Mr. Rohan', initials: 'RR', period: 'Oct 30 - Nov 02, 2023', status: 'UPCOMING' },
    { id: '2', customer: 'Mr. Kamat', initials: 'RK', period: 'Oct 20 - Oct 25, 2023', status: 'COMPLETED' },
    { id: '3', customer: 'Ms. Priya', initials: 'MP', period: 'Oct 15 - Oct 18, 2023', status: 'COMPLETED' },
    { id: '4', customer: 'Mr. Sahil', initials: 'MS', period: 'Nov 05 - Nov 10, 2023', status: 'UPCOMING' },
    { id: '5', customer: 'Ms. Anjali', initials: 'MA', period: 'Oct 01 - Oct 07, 2023', status: 'COMPLETED' },
    { id: '6', customer: 'Mr. Vikram', initials: 'MV', period: 'Sep 20 - Sep 28, 2023', status: 'COMPLETED' },
    { id: '7', customer: 'Ms. Sneha', initials: 'SN', period: 'Sep 10 - Sep 12, 2023', status: 'UPCOMING' },
  ];

  const getHeaderStyles = () => {
    switch (status) {
      case 'In use': 
        return { bg: 'bg-[#DBEAFE]', text: 'text-[#1E40AF]', sub: 'text-[#1E40AF]/60', btn: 'border-[#1E40AF]/40 text-[#1E40AF] hover:bg-[#1E40AF]/10' };
      case 'Available': 
        return { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]', sub: 'text-[#065F46]/60', btn: 'border-[#065F46]/40 text-[#065F46] hover:bg-[#065F46]/10' };
      case 'Maintenance': 
        return { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', sub: 'text-[#92400E]/60', btn: 'border-[#92400E]/40 text-[#92400E] hover:bg-[#92400E]/10' };
      default: 
        return { bg: 'bg-[#DBEAFE]', text: 'text-[#1E40AF]', sub: 'text-[#1E40AF]/60', btn: 'border-[#1E40AF]/40 text-[#1E40AF] hover:bg-[#1E40AF]/10' };
    }
  };

  const hStyles = getHeaderStyles();

  const handleAddReminder = () => {
    if (newReminder.date) {
      const added: Reminder = {
        id: Date.now().toString(),
        title: newReminder.title.toUpperCase(),
        date: new Date(newReminder.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        status: 'UPCOMING'
      };
      setReminders([added, ...reminders]);
      setIsModalOpen(false);
      setNewReminder({ title: 'Insurance', date: '' });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const getReminderBadge = (remStatus: string) => {
    switch (remStatus) {
      case 'ACTION REQUIRED': return 'bg-[#FEF3C7] text-[#D97706]';
      case 'UPCOMING': return 'bg-[#EEEDFA] text-[#6360DF]';
      case 'OVERDUE': return 'bg-[#FEE2E2] text-[#DC2626]';
      case 'COMPLIANT': return 'bg-[#D1FAE5] text-[#059669]';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 relative"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[60] bg-[#10B981] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3"
          >
            <CheckCircle size={20} />
            <span className="font-bold text-sm tracking-tight">Reminder Added Successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center space-x-2 text-[#151a3c] hover:text-[#6360DF] transition-colors font-bold group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-lg">Back to Fleet</span>
        </button>
      </div>

      {/* Profile Banner */}
      <div className={`${hStyles.bg} rounded-[2.5rem] p-10 flex items-center justify-between shadow-xl shadow-black/5 transition-colors duration-500`}>
        <div className="space-y-2">
          <p className={`text-[11px] font-bold tracking-widest uppercase ${hStyles.sub}`}>
            {vehicle.type || 'HATCHBACK'} • {vehicle.mfgYear || '2022'} • {vehicle.color || 'WHITE'}
          </p>
          <h1 className={`text-5xl font-extrabold tracking-tighter ${hStyles.text}`}>{instancePlate}</h1>
          <p className={`text-[11px] font-bold tracking-widest uppercase ${hStyles.sub}`}>
            {vehicle.name} • {vehicle.transmission} • {vehicle.fuel}
          </p>
        </div>
        <button className={`px-10 py-4 rounded-2xl border ${hStyles.btn} text-sm font-extrabold transition-all uppercase tracking-widest active:scale-95`}>
          Blackout
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Main Content: Recent Bookings */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-[2.5rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
          <div className="p-10 pb-4 flex items-center justify-between">
            <h3 className="text-2xl font-extrabold text-[#151a3c] tracking-tight">Recent Bookings</h3>
            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 px-5 py-2.5 border border-[#d1d0eb] rounded-xl text-sm font-bold text-[#6c7e96] hover:bg-slate-50 transition-colors">
                <Filter size={16} />
                <span>Filter</span>
              </button>
              <button className="flex items-center space-x-2 px-5 py-2.5 border border-[#d1d0eb] rounded-xl text-sm font-bold text-[#151a3c] hover:bg-slate-50 transition-colors">
                <span>All Bookings</span>
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
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
                {bookings.map((booking) => (
                  <tr key={booking.id} className="group hover:bg-[#f8f9fc]/50 transition-colors">
                    <td className="px-10 py-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-11 h-11 rounded-full bg-[#EEEDFA] flex items-center justify-center text-[#6360DF] text-[13px] font-extrabold">
                          {booking.initials}
                        </div>
                        <span className="font-bold text-[#151a3c] text-[15px]">{booking.customer}</span>
                      </div>
                    </td>
                    <td className="px-4 py-6">
                      <div className="flex items-center space-x-2 text-[#6c7e96] text-[13px] font-medium">
                        <Calendar size={14} className="opacity-60" />
                        <span>{booking.period}</span>
                      </div>
                    </td>
                    <td className="px-4 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-extrabold tracking-widest ${booking.status === 'UPCOMING' ? 'bg-[#EEEDFA] text-[#6360DF]' : 'bg-[#D1FAE5] text-[#065F46]'}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <button className="p-2 text-[#cbd5e1] hover:text-[#6c7e96] transition-colors">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar: Critical Reminders */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-[#EEEDFA] rounded-[2.5rem] p-8 pb-10 shadow-sm border border-[#d1d0eb]/30 space-y-6">
            <div className="flex items-center space-x-3 px-2">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#6360DF] shadow-sm">
                <BellRing size={20} />
              </div>
              <h3 className="text-xl font-black text-[#151a3c] tracking-tight uppercase">Critical Reminders</h3>
            </div>

            <div className="space-y-4">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="bg-white rounded-2xl p-5 shadow-sm border border-[#d1d0eb]/10 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-[#6c7e96] tracking-widest uppercase">
                      {reminder.title}
                    </p>
                    <h4 className="font-extrabold text-[#151a3c] text-base">{reminder.date}</h4>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase ${getReminderBadge(reminder.status)}`}>
                    {reminder.status}
                  </span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-[#6360DF] hover:bg-[#5451d0] text-white font-black py-4 rounded-2xl shadow-lg shadow-[#6360df33] flex items-center justify-center space-x-2 transition-all active:scale-[0.98] uppercase tracking-widest text-sm"
            >
              <span>Add New Reminder</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Reminder Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[51] bg-white rounded-[2rem] p-10 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-extrabold text-[#151a3c]">Add Reminder</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-[#6c7e96] hover:bg-slate-50 rounded-xl">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase">Reminder Type</label>
                  <select 
                    value={newReminder.title}
                    onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                    className="w-full bg-[#f8f9fc] border border-[#d1d0eb] rounded-xl py-4 px-4 text-[#151a3c] font-bold outline-none appearance-none cursor-pointer"
                  >
                    <option>Insurance Expiry</option>
                    <option>Oil Change Due</option>
                    <option>Pollution (PUC)</option>
                    <option>RC Renewal</option>
                    <option>Permit Validity</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase">Due Date</label>
                  <input 
                    type="date"
                    value={newReminder.date}
                    onChange={(e) => setNewReminder({ ...newReminder, date: e.target.value })}
                    className="w-full bg-[#f8f9fc] border border-[#d1d0eb] rounded-xl py-4 px-4 text-[#151a3c] font-bold outline-none"
                  />
                </div>

                <button 
                  onClick={handleAddReminder}
                  disabled={!newReminder.date}
                  className="w-full bg-[#6360DF] text-white font-extrabold py-5 rounded-2xl shadow-lg shadow-[#6360df33] hover:bg-[#5451d0] disabled:opacity-50 transition-all uppercase tracking-widest"
                >
                  Set Reminder
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VehicleProfile;
