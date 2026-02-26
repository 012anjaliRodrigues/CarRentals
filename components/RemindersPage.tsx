
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Shield, 
  Wrench, 
  DollarSign,
  Calendar,
  Download,
  ChevronDown,
  User,
  Car
} from 'lucide-react';
import { Reminder } from '../types';
import AddReminderModal from './AddReminderModal';
import ReminderDetailsPanel from './ReminderDetailsPanel';
import { Toaster, toast } from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const initialReminders: Reminder[] = [
  {
    id: 1,
    vehicle: "GA-01-AB-1234",
    model: "Maruti Swift",
    type: "Insurance Expiry",
    category: "Critical",
    dueDate: "2024-11-10",
    priority: "Critical",
    status: "Overdue",
    assignee: "Rajesh Kumar",
    daysRemaining: -5,
    notificationMethods: ['WhatsApp', 'In-App']
  },
  {
    id: 2,
    vehicle: "GA-02-XY-5678",
    model: "Hyundai i20",
    type: "Pollution (PUC)",
    category: "Critical",
    dueDate: "2024-11-25",
    priority: "High",
    status: "Due Soon",
    assignee: "Amit Singh",
    daysRemaining: 3,
    notificationMethods: ['WhatsApp', 'SMS']
  },
  {
    id: 3,
    vehicle: "GA-03-TH-9900",
    model: "Maruti Swift",
    type: "Oil Change",
    category: "Maintenance",
    dueDate: "2024-12-05",
    priority: "Medium",
    status: "Upcoming",
    assignee: "Unassigned",
    daysRemaining: 13,
    notificationMethods: ['In-App']
  },
  {
    id: 4,
    vehicle: "GA-04-EV-2023",
    model: "Tata Nexon",
    type: "General Service",
    category: "Maintenance",
    dueDate: "2024-11-15",
    priority: "High",
    status: "Completed",
    assignee: "Vikram Patil",
    daysRemaining: 0,
    notificationMethods: ['Email']
  }
];

const RemindersPage: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [priorityFilter, setPriorityFilter] = useState('All Priorities');

  const stats = useMemo(() => {
    return {
      overdue: reminders.filter(r => r.status === 'Overdue').length,
      dueSoon: reminders.filter(r => r.status === 'Due Soon').length,
      upcoming: reminders.filter(r => r.status === 'Upcoming').length,
      completed: reminders.filter(r => r.status === 'Completed').length
    };
  }, [reminders]);

  const filteredReminders = useMemo(() => {
    return reminders.filter(r => {
      const matchesSearch = r.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            r.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            r.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'All Types' || r.category === typeFilter;
      const matchesStatus = statusFilter === 'All Statuses' || r.status === statusFilter;
      const matchesPriority = priorityFilter === 'All Priorities' || r.priority === priorityFilter;
      
      return matchesSearch && matchesType && matchesStatus && matchesPriority;
    });
  }, [reminders, searchQuery, typeFilter, statusFilter, priorityFilter]);

  const handleAddReminder = (newReminder: Omit<Reminder, 'id' | 'status' | 'daysRemaining'>) => {
    const id = Math.max(...reminders.map(r => r.id), 0) + 1;
    const dueDate = new Date(newReminder.dueDate);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let status: Reminder['status'] = 'Upcoming';
    if (diffDays < 0) status = 'Overdue';
    else if (diffDays <= 7) status = 'Due Soon';

    const reminder: Reminder = {
      ...newReminder,
      id,
      status,
      daysRemaining: diffDays
    };

    setReminders([reminder, ...reminders]);
    toast.success('Reminder created successfully!', {
      style: {
        borderRadius: '16px',
        background: '#151a3c',
        color: '#fff',
        fontWeight: 'bold'
      }
    });
  };

  const handleComplete = (id: number) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, status: 'Completed', daysRemaining: 0 } : r));
    setIsDetailsOpen(false);
    toast.success('Reminder marked as completed!', {
      icon: '✅',
      style: {
        borderRadius: '16px',
        background: '#10B981',
        color: '#fff',
        fontWeight: 'bold'
      }
    });
  };

  const handleSnooze = (id: number, days: number) => {
    setReminders(reminders.map(r => {
      if (r.id === id) {
        const newDate = new Date(r.dueDate);
        newDate.setDate(newDate.getDate() + days);
        const formattedDate = newDate.toISOString().split('T')[0];
        const diffDays = r.daysRemaining + days;
        
        let status: Reminder['status'] = 'Upcoming';
        if (diffDays < 0) status = 'Overdue';
        else if (diffDays <= 7) status = 'Due Soon';

        return { ...r, dueDate: formattedDate, daysRemaining: diffDays, status };
      }
      return r;
    }));
    setIsDetailsOpen(false);
    toast.success(`Snoozed for ${days} days`, {
      icon: '⏰',
      style: {
        borderRadius: '16px',
        background: '#6360DF',
        color: '#fff',
        fontWeight: 'bold'
      }
    });
  };

  const handleDelete = (id: number) => {
    setReminders(reminders.filter(r => r.id !== id));
    setIsDetailsOpen(false);
    toast.error('Reminder deleted', {
      style: {
        borderRadius: '16px',
        background: '#EF4444',
        color: '#fff',
        fontWeight: 'bold'
      }
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'text-red-600 bg-red-50 border-red-100';
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'Medium': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'Low': return 'text-green-600 bg-green-50 border-green-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Overdue': return 'text-red-500 bg-red-50';
      case 'Due Soon': return 'text-orange-500 bg-orange-50';
      case 'Upcoming': return 'text-blue-500 bg-blue-50';
      case 'Completed': return 'text-green-500 bg-green-50';
      default: return 'text-slate-500 bg-slate-50';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Critical': return <Shield className="w-4 h-4" />;
      case 'Maintenance': return <Wrench className="w-4 h-4" />;
      case 'Financial': return <DollarSign className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-full bg-[#D3D2EC] p-10 space-y-10">
      <Toaster position="top-right" />
      
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-[#151a3c] tracking-tight">Reminders Dashboard</h2>
          <p className="text-[#6c7e96] text-sm font-medium mt-1">Manage vehicle maintenance and document renewals</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-[#6360df33] transition-all flex items-center space-x-2 group active:scale-95"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" />
          <span>Add New Reminder</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Overdue', count: stats.overdue, color: 'text-red-500', icon: <AlertCircle />, bg: 'bg-red-50' },
          { label: 'Due Soon', count: stats.dueSoon, color: 'text-orange-500', icon: <Clock />, bg: 'bg-orange-50' },
          { label: 'Upcoming', count: stats.upcoming, color: 'text-blue-500', icon: <Calendar />, bg: 'bg-blue-50' },
          { label: 'Completed', count: stats.completed, color: 'text-green-500', icon: <CheckCircle2 />, bg: 'bg-green-50' }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[2rem] shadow-sm border border-white/50 flex items-center justify-between group hover:shadow-xl hover:-translate-y-1 transition-all cursor-default"
          >
            <div className="space-y-1">
              <p className="text-[#6c7e96] text-xs font-bold uppercase tracking-widest">{stat.label}</p>
              <h3 className={cn("text-3xl font-black", stat.color)}>{stat.count}</h3>
            </div>
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner", stat.bg, stat.color)}>
              {stat.icon}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-white/50 p-6 flex flex-wrap items-center gap-6">
        <div className="flex-1 min-w-[300px] relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6c7e96] w-5 h-5 group-focus-within:text-[#6360DF] transition-colors" />
          <input 
            type="text" 
            placeholder="Search vehicle, reminder type..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-transparent rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] focus:bg-white outline-none transition-all text-sm font-bold text-[#151a3c]"
          />
        </div>
        
          <div className="flex items-center gap-3">
            {[
              { value: typeFilter, setter: setTypeFilter, options: ['All Types', 'Critical', 'Maintenance', 'Financial'] },
              { value: statusFilter, setter: setStatusFilter, options: ['All Statuses', 'Overdue', 'Due Soon', 'Upcoming', 'Completed'] },
              { value: priorityFilter, setter: setPriorityFilter, options: ['All Priorities', 'Critical', 'High', 'Medium', 'Low'] }
            ].map((filter, i) => (
              <div key={i} className="relative group">
                <select 
                  value={filter.value}
                  onChange={(e) => filter.setter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-transparent rounded-xl py-3 pl-4 pr-10 text-xs font-bold text-[#151a3c] outline-none hover:bg-slate-100 focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all cursor-pointer"
                >
                  {filter.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c7e96] w-4 h-4 pointer-events-none group-hover:text-[#6360DF] transition-colors" />
              </div>
            ))}
          </div>
      </div>

      {/* Reminders List Table */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-white/50 overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-[#151a3c]">All Reminders</h3>
          <div className="flex items-center space-x-2 text-[#6c7e96] text-sm font-medium">
            <span>Showing</span>
            <span className="text-[#151a3c] font-bold">{filteredReminders.length}</span>
            <span>reminders</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[#6c7e96] border-b border-slate-50">
                <th className="pl-10 py-6 text-[11px] font-bold uppercase tracking-widest opacity-60">Due Date</th>
                <th className="py-6 text-[11px] font-bold uppercase tracking-widest opacity-60">Vehicle</th>
                <th className="py-6 text-[11px] font-bold uppercase tracking-widest opacity-60">Reminder Type</th>
                <th className="py-6 text-[11px] font-bold uppercase tracking-widest opacity-60">Priority</th>
                <th className="py-6 text-[11px] font-bold uppercase tracking-widest opacity-60">Status</th>
                <th className="pr-10 py-6 text-[11px] font-bold uppercase tracking-widest opacity-60 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence>
                {filteredReminders.map((reminder, idx) => (
                  <motion.tr 
                    key={reminder.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      setSelectedReminder(reminder);
                      setIsDetailsOpen(true);
                    }}
                    className="group hover:bg-[#f8f9fc] transition-all cursor-pointer"
                  >
                    <td className="py-6 pl-10">
                      <div>
                        <p className="font-bold text-[#151a3c] text-sm">{reminder.dueDate}</p>
                        <p className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          reminder.daysRemaining < 0 ? "text-red-500" : "text-[#6c7e96]"
                        )}>
                          {reminder.daysRemaining < 0 ? `${Math.abs(reminder.daysRemaining)} days overdue` : `${reminder.daysRemaining} days left`}
                        </p>
                      </div>
                    </td>
                    <td className="py-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-[#EEEDFA] rounded-2xl flex items-center justify-center text-[#6360DF] group-hover:bg-white transition-colors">
                          <Car size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-[#151a3c] text-[15px]">{reminder.vehicle}</p>
                          <p className="text-[11px] text-[#6c7e96] font-bold uppercase tracking-wider">{reminder.model}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-6">
                      <div className="flex items-center space-x-2">
                        <div className="text-[#6360DF]">{getCategoryIcon(reminder.category)}</div>
                        <span className="font-bold text-[#151a3c] text-sm">{reminder.type}</span>
                      </div>
                    </td>
                    <td className="py-6">
                      <span className={cn("px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border", getPriorityColor(reminder.priority))}>
                        {reminder.priority}
                      </span>
                    </td>
                    <td className="py-6">
                      <span className={cn("px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider", getStatusColor(reminder.status))}>
                        {reminder.status}
                      </span>
                    </td>
                    <td className="py-6 pr-10 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Action menu logic
                        }}
                        className="p-2 text-[#cbd5e1] hover:text-[#6360DF] hover:bg-white rounded-xl transition-all"
                      >
                        <MoreVertical size={20} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          
          {filteredReminders.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Bell size={40} />
              </div>
              <p className="text-[#6c7e96] font-bold">No reminders found matching your filters.</p>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('All Types');
                  setStatusFilter('All Statuses');
                  setPriorityFilter('All Priorities');
                }}
                className="text-[#6360DF] font-bold text-sm mt-2 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals & Panels */}
      <AddReminderModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAddReminder}
      />
      
      <ReminderDetailsPanel 
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        reminder={selectedReminder}
        onComplete={handleComplete}
        onSnooze={handleSnooze}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default RemindersPage;
