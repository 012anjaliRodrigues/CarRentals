import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Car, Calendar, Clock, CheckCircle2, Bell, Edit3, Trash2, AlertCircle, Shield, Wrench, DollarSign, Save } from 'lucide-react';
import { ReminderDB } from './RemindersPage';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

interface ReminderDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: ReminderDB | null;
  onComplete: (id: string) => void;
  onSnooze: (id: string, days: number) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Pick<ReminderDB, 'type' | 'priority' | 'dueDate' | 'notes'>>) => void;
}

const reminderTypes = [
  { group: 'Critical', items: ['Insurance Expiry', 'Pollution (PUC)', 'RC Renewal', 'Fitness Certificate'] },
  { group: 'Maintenance', items: ['Oil Change', 'General Service', 'Battery Replacement', 'Vehicle Cleaning'] },
  { group: 'Financial', items: ['Tax Payment', 'Permit Renewal'] },
];

const ReminderDetailsPanel: React.FC<ReminderDetailsPanelProps> = ({
  isOpen, onClose, reminder, onComplete, onSnooze, onDelete, onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState<{ type: string; priority: ReminderDB['priority']; dueDate: string; notes: string }>({
    type: '', priority: 'High', dueDate: '', notes: ''
  });

  // Reset edit form whenever reminder changes or panel opens
  React.useEffect(() => {
    if (reminder) {
      setEditForm({ type: reminder.type, priority: reminder.priority, dueDate: reminder.dueDate, notes: reminder.notes || '' });
    }
    setIsEditing(false);
    setShowDeleteConfirm(false);
  }, [reminder?.id, isOpen]);

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

  const getPriorityBtnColor = (p: string, selected: boolean) => {
    if (!selected) return 'bg-slate-50 border-transparent text-[#6c7e96] hover:bg-slate-100';
    switch (p) {
      case 'Critical': return 'bg-red-50 border-red-500 text-red-600';
      case 'High': return 'bg-orange-50 border-orange-500 text-orange-600';
      case 'Medium': return 'bg-blue-50 border-blue-500 text-blue-600';
      case 'Low': return 'bg-green-50 border-green-500 text-green-600';
      default: return '';
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

  const handleSaveEdit = () => {
    onUpdate(reminder.id, {
      type: editForm.type,
      priority: editForm.priority,
      dueDate: editForm.dueDate,
      notes: editForm.notes,
    });
    setIsEditing(false);
  };

  const handleDeleteConfirmed = () => {
    onDelete(reminder.id);
    setShowDeleteConfirm(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { if (!showDeleteConfirm) onClose(); }}
            className="fixed inset-0 z-[110] bg-[#151a3c]/20 backdrop-blur-sm" />

          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-[120] w-full max-w-[450px] bg-white shadow-2xl flex flex-col">

            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", getStatusColor(reminder.status))}>
                  {getCategoryIcon(reminder.category)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#151a3c]">{isEditing ? 'Edit Reminder' : reminder.type}</h3>
                  <span className={cn("inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1", getStatusColor(reminder.status))}>
                    {reminder.status}
                  </span>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-[#6c7e96]">
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

              {/* Vehicle card — always shown */}
              <div className="bg-[#f8f7ff] rounded-3xl p-6 border border-[#d1d0eb]/30">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#6360DF]"><Car size={28} /></div>
                  <div>
                    <h4 className="text-lg font-bold text-[#151a3c]">{reminder.vehicle}</h4>
                    <p className="text-sm text-[#6c7e96] font-medium">{reminder.model}</p>
                  </div>
                </div>
              </div>

              {/* ── VIEW MODE ── */}
              {!isEditing && (
                <>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Due Date</p>
                      <div className="flex items-center space-x-2 text-sm font-bold text-[#151a3c]">
                        <Calendar size={14} className="text-[#6360DF]" /><span>{reminder.dueDate}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Priority</p>
                      <div className={cn("flex items-center space-x-2 text-sm font-bold", getPriorityColor(reminder.priority))}>
                        <AlertCircle size={14} /><span>{reminder.priority}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Time Left</p>
                      <div className={cn("text-xl font-black", reminder.daysRemaining < 0 ? "text-red-500" : "text-[#6360DF]")}>
                        {reminder.daysRemaining < 0
                          ? `${Math.abs(reminder.daysRemaining)} days past`
                          : `${reminder.daysRemaining} days left`}
                      </div>
                    </div>
                  </div>

                  {reminder.notes && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Notes</p>
                      <div className="bg-slate-50 rounded-2xl p-4 text-sm font-medium text-[#151a3c] border border-slate-100 italic">
                        "{reminder.notes}"
                      </div>
                    </div>
                  )}

                  {/* Snooze + Complete */}
                  {reminder.status !== 'Completed' && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Quick Actions</p>
                      <div className="grid grid-cols-3 gap-3">
                        {[3, 7, 14].map(days => (
                          <button key={days} onClick={() => onSnooze(reminder.id, days)}
                            className="bg-[#f8f7ff] border border-[#d1d0eb] text-[#6360DF] text-xs font-bold py-2.5 rounded-xl hover:bg-[#EEEDFA] transition-all flex items-center justify-center space-x-1">
                            <Clock size={12} /><span>+{days}d</span>
                          </button>
                        ))}
                      </div>
                      <button onClick={() => onComplete(reminder.id)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-green-200">
                        <CheckCircle2 size={18} /><span>Mark as Completed</span>
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* ── EDIT MODE ── */}
              {isEditing && (
                <div className="space-y-6">

                  {/* Reminder Type */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest">Reminder Type</label>
                    <select
                      value={editForm.type}
                      onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                      className="w-full bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all appearance-none"
                    >
                      {reminderTypes.map(group => (
                        <optgroup key={group.group} label={group.group}>
                          {group.items.map(item => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest">Priority</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['Critical', 'High', 'Medium', 'Low'] as const).map(p => (
                        <button key={p} type="button"
                          onClick={() => setEditForm({ ...editForm, priority: p })}
                          className={cn("py-2 rounded-xl text-xs font-bold transition-all border-2", getPriorityBtnColor(p, editForm.priority === p))}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest">Due Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6360DF] w-4 h-4" />
                      <input type="date" value={editForm.dueDate}
                        onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })}
                        className="w-full bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-3 pl-11 pr-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all" />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest">Notes</label>
                    <textarea rows={3} value={editForm.notes}
                      onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                      placeholder="Add any notes or remarks..."
                      className="w-full bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-medium text-[#151a3c] outline-none focus:border-[#6360DF] transition-all resize-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-slate-100 bg-slate-50/50 shrink-0">

              {/* Delete confirm dialog */}
              <AnimatePresence>
                {showDeleteConfirm && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    className="mb-5 bg-red-50 border border-red-200 rounded-2xl p-5">
                    <p className="text-sm font-bold text-red-700 mb-1">Delete this reminder?</p>
                    <p className="text-xs text-red-500 font-medium mb-4">This action cannot be undone.</p>
                    <div className="flex items-center space-x-3">
                      <button onClick={handleDeleteConfirmed}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all">
                        Yes, Delete
                      </button>
                      <button onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 bg-white border border-[#d1d0eb] text-[#6c7e96] font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-all">
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isEditing ? (
                <div className="flex items-center space-x-3">
                  <button onClick={() => setIsEditing(false)}
                    className="flex-1 bg-white border border-[#d1d0eb] text-[#6c7e96] font-bold py-3 rounded-xl text-sm hover:bg-slate-50 transition-all">
                    Cancel
                  </button>
                  <button onClick={handleSaveEdit}
                    className="flex-1 bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-[#6360df33]">
                    <Save size={16} /><span>Save Changes</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-2">
                  <button onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2 text-sm font-bold text-[#6360DF] hover:underline">
                    <Edit3 size={16} /><span>Edit Details</span>
                  </button>
                  <button onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center space-x-2 text-sm font-bold text-red-500 hover:underline">
                    <Trash2 size={16} /><span>Delete Reminder</span>
                  </button>
                </div>
              )}
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ReminderDetailsPanel;