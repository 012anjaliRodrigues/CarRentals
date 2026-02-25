
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Car, 
  Calendar, 
  User, 
  Clock, 
  CheckCircle2, 
  Bell, 
  Edit3, 
  Trash2,
  AlertCircle,
  Shield,
  Wrench,
  DollarSign
} from 'lucide-react';
import { Reminder } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ReminderDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: Reminder | null;
  onComplete: (id: number) => void;
  onSnooze: (id: number, days: number) => void;
  onDelete: (id: number) => void;
}

const ReminderDetailsPanel: React.FC<ReminderDetailsPanelProps> = ({ 
  isOpen, 
  onClose, 
  reminder,
  onComplete,
  onSnooze,
  onDelete
}) => {
  if (!reminder) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Overdue': return 'text-red-500 bg-red-50';
      case 'Due Soon': return 'text-orange-500 bg-orange-50';
      case 'Upcoming': return 'text-blue-500 bg-blue-50';
      case 'Completed': return 'text-green-500 bg-green-50';
      default: return 'text-slate-500 bg-slate-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'text-red-600';
      case 'High': return 'text-orange-600';
      case 'Medium': return 'text-blue-600';
      case 'Low': return 'text-green-600';
      default: return 'text-slate-600';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Critical': return <Shield className="w-5 h-5" />;
      case 'Maintenance': return <Wrench className="w-5 h-5" />;
      case 'Financial': return <DollarSign className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[110] bg-[#151a3c]/20 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-[120] w-full max-w-[450px] bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", getStatusColor(reminder.status))}>
                  {getCategoryIcon(reminder.category)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#151a3c]">{reminder.type}</h3>
                  <span className={cn("inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1", getStatusColor(reminder.status))}>
                    {reminder.status}
                  </span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-[#6c7e96]"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {/* Vehicle Card */}
              <div className="bg-[#f8f7ff] rounded-3xl p-6 border border-[#d1d0eb]/30">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#6360DF]">
                    <Car size={28} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#151a3c]">{reminder.vehicle}</h4>
                    <p className="text-sm text-[#6c7e96] font-medium">{reminder.model}</p>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Due Date</p>
                  <div className="flex items-center space-x-2 text-sm font-bold text-[#151a3c]">
                    <Calendar size={14} className="text-[#6360DF]" />
                    <span>{reminder.dueDate}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Priority</p>
                  <div className={cn("flex items-center space-x-2 text-sm font-bold", getPriorityColor(reminder.priority))}>
                    <AlertCircle size={14} />
                    <span>{reminder.priority}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Time Left</p>
                  <div className={cn("text-xl font-black", reminder.daysRemaining < 0 ? "text-red-500" : "text-[#6360DF]")}>
                    {reminder.daysRemaining < 0 ? `${Math.abs(reminder.daysRemaining)} days past` : `${reminder.daysRemaining} days left`}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {reminder.notes && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Notes</p>
                  <div className="bg-slate-50 rounded-2xl p-4 text-sm font-medium text-[#151a3c] border border-slate-100 italic">
                    "{reminder.notes}"
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-8 border-t border-slate-100 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between px-2">
                <button className="flex items-center space-x-2 text-sm font-bold text-[#6360DF] hover:underline">
                  <Edit3 size={16} />
                  <span>Edit Details</span>
                </button>
                <button 
                  onClick={() => onDelete(reminder.id)}
                  className="flex items-center space-x-2 text-sm font-bold text-red-500 hover:underline"
                >
                  <Trash2 size={16} />
                  <span>Delete Reminder</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ReminderDetailsPanel;
