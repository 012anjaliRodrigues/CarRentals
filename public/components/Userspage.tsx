import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Search, Loader2, X, Check,
  Trash2, Shield, Clock, AlertCircle, Mail, Phone,
  SlidersHorizontal, Eye, Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase, getCurrentUser } from '../supabaseClient';

// ── Types ─────────────────────────────────────────────────────
interface StaffUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: 'staff' | 'manager';
  is_active: boolean;
  permissions: {
    bookings: boolean;
    vehicles: boolean;
    drivers: boolean;
    reports: boolean;
    handover: boolean;
    allocation: boolean;
  };
  last_login_at: string | null;
  created_at: string;
}

interface NewUserForm {
  full_name: string;
  phone: string;
  role: 'staff' | 'manager';
  permissions: {
    bookings: boolean;
    vehicles: boolean;
    drivers: boolean;
    reports: boolean;
    handover: boolean;
    allocation: boolean;
  };
}

const SUPABASE_URL = 'https://yliattfjerzkjqdqntqk.supabase.co';

const defaultPermissions = {
  bookings: true, vehicles: false, drivers: false,
  reports: false, handover: false, allocation: false,
};
const managerPermissions = {
  bookings: true, vehicles: true, drivers: true,
  reports: true, handover: true, allocation: true,
};

const permKeys = ['bookings', 'vehicles', 'drivers', 'reports', 'handover', 'allocation'] as const;
type PermKey = typeof permKeys[number];

// ── View User Popup ──────────────────────────────────────────
const ViewUserPopup: React.FC<{ staff: StaffUser; onClose: () => void }> = ({ staff, onClose }) => {
  const permKeys = ['bookings', 'vehicles', 'drivers', 'reports', 'handover', 'allocation'] as const;
  const getRoleBadge = (role: string) =>
    role === 'manager' ? 'bg-[#FEF3C7] text-[#D97706]' : 'bg-[#EEEDFA] text-[#6360DF]';
  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#151a3c]/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EEEDFA] flex items-center justify-center text-[#6360DF] text-lg font-extrabold">
              {staff.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#151a3c]">{staff.full_name}</h3>
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full capitalize ${getRoleBadge(staff.role)}`}>
                {staff.role}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-[#6c7e96]"><X size={18} /></button>
        </div>

        <div className="space-y-4">


          {/* Contact */}
          {staff.phone && (
            <div className="flex items-center space-x-3 px-1">
              <Phone size={14} className="text-[#6360DF] shrink-0" />
              <span className="text-sm font-medium text-[#151a3c]">{staff.phone}</span>
            </div>
          )}

          {/* Page Access */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Page Access</p>
            <div className="flex flex-wrap gap-2">
              {permKeys.map(k => (
                <span key={k} className={`text-[11px] font-bold px-3 py-1.5 rounded-full capitalize border ${
                  staff.permissions?.[k]
                    ? 'bg-[#EEEDFA] text-[#6360DF] border-[#6360DF]/20'
                    : 'bg-[#F8F9FA] text-[#d1d0eb] border-[#d1d0eb]/40 line-through'
                }`}>
                  {k}
                </span>
              ))}
            </div>
          </div>

          {/* Last Login + Created */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-[#F8F9FA] rounded-xl px-4 py-3 border border-[#d1d0eb]/40">
              <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-wider">Last Login</p>
              <p className="text-sm font-bold text-[#151a3c] mt-0.5">{fmtDate(staff.last_login_at)}</p>
            </div>
            <div className="bg-[#F8F9FA] rounded-xl px-4 py-3 border border-[#d1d0eb]/40">
              <p className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-wider">Added On</p>
              <p className="text-sm font-bold text-[#151a3c] mt-0.5">{fmtDate(staff.created_at)}</p>
            </div>
          </div>
        </div>

        <button onClick={onClose}
          className="w-full mt-6 border border-[#d1d0eb] text-[#6c7e96] font-bold py-3 rounded-xl hover:bg-slate-50 text-sm transition-all">
          Close
        </button>
      </motion.div>
    </div>
  );
};

// ── Edit User Popup ───────────────────────────────────────────
const EditUserPopup: React.FC<{
  staff: StaffUser;
  onClose: () => void;
  onSaved: (updated: StaffUser) => void;
}> = ({ staff, onClose, onSaved }) => {
  const permKeys = ['bookings', 'vehicles', 'drivers', 'reports', 'handover', 'allocation'] as const;
  const managerPermissions = { bookings: true, vehicles: true, drivers: true, reports: true, handover: true, allocation: true };
  const defaultPermissions = { bookings: true, vehicles: false, drivers: false, reports: false, handover: false, allocation: false };

  const [form, setForm] = useState({
    full_name:   staff.full_name,
    phone:       staff.phone || '',
    role:        staff.role as 'staff' | 'manager',
    permissions: { ...staff.permissions },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleRoleChange = (role: 'staff' | 'manager') => {
    setForm(f => ({
      ...f, role,
      permissions: role === 'manager' ? { ...managerPermissions } : { ...defaultPermissions },
    }));
  };

  const handleSave = async () => {
    setError('');
    if (!form.full_name.trim()) { setError('Full name is required.'); return; }
    setSaving(true);
    try {
      const { data, error: updateErr } = await supabase
        .from('staff_users')
        .update({
          full_name:   form.full_name.trim(),
          phone:       form.phone.trim() || null,
          role:        form.role,
          permissions: form.permissions,
          updated_at:  new Date().toISOString(),
        })
        .eq('id', staff.id)
        .select('*')
        .single();

      if (updateErr) { setError(updateErr.message); return; }
      toast.success('User updated!');
      onSaved(data as StaffUser);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
    } finally { setSaving(false); }
  };

  const permLabels = [
    { key: 'bookings' as const,   label: 'Bookings'   },
    { key: 'vehicles' as const,   label: 'Vehicles'   },
    { key: 'drivers' as const,    label: 'Drivers'    },
    { key: 'reports' as const,    label: 'Reports'    },
    { key: 'handover' as const,   label: 'Handover'   },
    { key: 'allocation' as const, label: 'Allocation' },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#151a3c]/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#EEEDFA] rounded-xl flex items-center justify-center text-[#6360DF]">
              <Pencil size={18} />
            </div>
            <h3 className="text-lg font-extrabold text-[#151a3c]">Edit User</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-[#6c7e96]"><X size={18} /></button>
        </div>

        <div className="space-y-5">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Full Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))}
              className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-medium text-[#151a3c] outline-none focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10" />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Phone (optional)</label>
            <input type="tel" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
              placeholder="+91 98765 43210"
              className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-medium text-[#151a3c] outline-none focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10" />
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Role</label>
            <div className="grid grid-cols-2 gap-3">
              {(['staff', 'manager'] as const).map(r => (
                <button key={r} type="button" onClick={() => handleRoleChange(r)}
                  className={`py-3 rounded-xl font-bold text-sm border transition-all capitalize ${
                    form.role === r
                      ? 'bg-[#EEEDFA] border-[#6360DF] text-[#6360DF]'
                      : 'bg-[#F8F9FA] border-[#d1d0eb] text-[#6c7e96] hover:border-[#6360DF]/40'
                  }`}>
                  {r === 'manager' ? '👑 Manager' : '👤 Staff'}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Page Access</label>
            <div className="grid grid-cols-2 gap-2">
              {permLabels.map(({ key, label }) => (
                <button key={key} type="button"
                  onClick={() => setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } }))}
                  className={`flex items-center space-x-2 py-2.5 px-4 rounded-xl border text-sm font-bold transition-all ${
                    form.permissions[key]
                      ? 'bg-[#EEEDFA] border-[#6360DF] text-[#6360DF]'
                      : 'bg-[#F8F9FA] border-[#d1d0eb] text-[#6c7e96]'
                  }`}>
                  <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 ${
                    form.permissions[key] ? 'bg-[#6360DF] border-[#6360DF]' : 'border-[#d1d0eb]'
                  }`}>
                    {form.permissions[key] && <Check size={10} className="text-white" />}
                  </div>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="text-red-500 shrink-0" />
              <p className="text-sm font-bold text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="flex space-x-3 mt-7">
          <button onClick={onClose}
            className="flex-1 border border-[#d1d0eb] text-[#6c7e96] font-bold py-3.5 rounded-xl hover:bg-slate-50 text-sm transition-all">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-[#6360df22] transition-all flex items-center justify-center space-x-2 disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Add User Popup ────────────────────────────────────────────
const AddUserPopup: React.FC<{
  onClose: () => void;
  onSaved: (user: StaffUser) => void;
}> = ({ onClose, onSaved }) => {
  const [form, setForm] = useState<NewUserForm>({
    full_name: '', phone: '', role: 'staff',
    permissions: { ...defaultPermissions },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleRoleChange = (role: 'staff' | 'manager') => {
    setForm(f => ({
      ...f, role,
      permissions: role === 'manager' ? { ...managerPermissions } : { ...defaultPermissions },
    }));
  };

  const handleSave = async () => {
    setError('');
    if (!form.full_name.trim()) { setError('Full name is required.'); return; }

    setSaving(true);
    try {
      const authUser = await getCurrentUser();
      if (!authUser) { setError('Not authenticated.'); return; }

      const { data: ownerRow } = await supabase
        .from('owners').select('id').eq('user_id', authUser.id).single();
      if (!ownerRow) { setError('Owner not found.'); return; }

      // Auto-generate a placeholder email — real login via OTP coming later
      const slug = form.full_name.trim().toLowerCase()
        .replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
      const email = `${slug}.${Date.now().toString(36)}@gaadizai.internal`;

      const { data: staffRow, error: insertErr } = await supabase
        .from('staff_users')
        .insert({
          owner_id:    ownerRow.id,
          full_name:   form.full_name.trim(),
          email,
          phone:       form.phone.trim() || null,
          role:        form.role,
          permissions: form.permissions,
          is_active:   true,
        })
        .select('*')
        .single();

      if (insertErr) { setError(insertErr.message); return; }

      toast.success(`${form.full_name} added successfully!`);
      onSaved(staffRow as any);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const permLabels: { key: PermKey; label: string }[] = [
    { key: 'bookings',   label: 'Bookings'   },
    { key: 'vehicles',   label: 'Vehicles'   },
    { key: 'drivers',    label: 'Drivers'    },
    { key: 'reports',    label: 'Reports'    },
    { key: 'handover',   label: 'Handover'   },
    { key: 'allocation', label: 'Allocation' },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#151a3c]/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 z-10 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#EEEDFA] rounded-xl flex items-center justify-center text-[#6360DF]">
              <Users size={18} />
            </div>
            <h3 className="text-lg font-extrabold text-[#151a3c]">Add New User</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-[#6c7e96]"><X size={18} /></button>
        </div>

        <div className="space-y-5">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Full Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))}
              placeholder="Riya Naik"
              className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-medium text-[#151a3c] outline-none focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10" />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Phone (optional)</label>
            <input type="tel" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
              placeholder="+91 98765 43210"
              className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-medium text-[#151a3c] outline-none focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10" />
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Role</label>
            <div className="grid grid-cols-2 gap-3">
              {(['staff', 'manager'] as const).map(r => (
                <button key={r} type="button" onClick={() => handleRoleChange(r)}
                  className={`py-3 rounded-xl font-bold text-sm border transition-all capitalize ${
                    form.role === r
                      ? 'bg-[#EEEDFA] border-[#6360DF] text-[#6360DF]'
                      : 'bg-[#F8F9FA] border-[#d1d0eb] text-[#6c7e96] hover:border-[#6360DF]/40'
                  }`}>
                  {r === 'manager' ? '👑 Manager' : '👤 Staff'}
                </button>
              ))}
            </div>
          </div>

          {/* Page Access */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Page Access</label>
            <div className="grid grid-cols-2 gap-2">
              {permLabels.map(({ key, label }) => (
                <button key={key} type="button"
                  onClick={() => setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } }))}
                  className={`flex items-center space-x-2 py-2.5 px-4 rounded-xl border text-sm font-bold transition-all ${
                    form.permissions[key]
                      ? 'bg-[#EEEDFA] border-[#6360DF] text-[#6360DF]'
                      : 'bg-[#F8F9FA] border-[#d1d0eb] text-[#6c7e96]'
                  }`}>
                  <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 ${
                    form.permissions[key] ? 'bg-[#6360DF] border-[#6360DF]' : 'border-[#d1d0eb]'
                  }`}>
                    {form.permissions[key] && <Check size={10} className="text-white" />}
                  </div>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center space-x-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="text-red-500 shrink-0" />
              <p className="text-sm font-bold text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex space-x-3 mt-7">
          <button onClick={onClose}
            className="flex-1 border border-[#d1d0eb] text-[#6c7e96] font-bold py-3.5 rounded-xl hover:bg-slate-50 text-sm transition-all">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-[#6360df22] transition-all flex items-center justify-center space-x-2 disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            <span>{saving ? 'Creating...' : 'Add User'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── UsersPage ─────────────────────────────────────────────────
const UsersPage: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [viewStaff, setViewStaff]   = useState<StaffUser | null>(null);
  const [editStaff, setEditStaff]   = useState<StaffUser | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Filter state ──
  const [showFilters, setShowFilters] = useState(false);
  const [filterRole, setFilterRole] = useState<'all' | 'staff' | 'manager'>('all');
  const [filterAccess, setFilterAccess] = useState<PermKey | 'all'>('all');

  // ── Load staff ──
  const loadStaff = async () => {
    setLoading(true);
    const authUser = await getCurrentUser();
    if (!authUser) { setLoading(false); return; }
    const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', authUser.id).single();
    if (!ownerRow) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('staff_users')
      .select('*')
      .eq('owner_id', ownerRow.id)
      .order('created_at', { ascending: false });

    if (!error) setStaffList((data as StaffUser[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadStaff(); }, []);



  // ── Delete ──
  const handleDelete = async (staffId: string) => {
    setDeletingId(staffId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-staff-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ staff_id: staffId, action: 'delete' }),
      });
      const json = await res.json();
      if (json.success) {
        setStaffList(prev => prev.filter(s => s.id !== staffId));
        setConfirmDeleteId(null);
        toast.success('User deleted.');
      } else toast.error(json.error || 'Failed to delete.');
    } finally { setDeletingId(null); }
  };

  // ── Filter logic ──
  const activeFilterCount = [
    filterRole !== 'all',
    filterAccess !== 'all',
  ].filter(Boolean).length;

  const filtered = staffList.filter(s => {
    const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchRole   = filterRole === 'all'   || s.role === filterRole;
    const matchAccess = filterAccess === 'all' || s.permissions?.[filterAccess];
    return matchSearch && matchRole && matchAccess;
  });

  const getRoleBadge = (role: string) =>
    role === 'manager' ? 'bg-[#FEF3C7] text-[#D97706]' : 'bg-[#EEEDFA] text-[#6360DF]';

  const fmtDate = (d: string | null) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[24px] font-extrabold text-[#151a3c] tracking-tight">Users</h2>
          <p className="text-[#6c7e96] text-sm font-medium mt-1">
            Manage staff & managers · {staffList.length} user{staffList.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cbd5e1] w-4 h-4 group-focus-within:text-[#6360DF] transition-colors" />
            <input type="text" placeholder="Search users..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="bg-white border border-[#d1d0eb] rounded-full py-2.5 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all w-[220px]" />
          </div>

          {/* Filter button */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`relative flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
              showFilters || activeFilterCount > 0
                ? 'bg-[#6360DF] border-[#6360DF] text-white shadow-md shadow-[#6360df33]'
                : 'bg-white border-[#d1d0eb] text-[#6c7e96] hover:border-[#6360DF] hover:text-[#6360DF]'
            }`}
          >
            <SlidersHorizontal size={15} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-[#6360DF] text-[9px] font-extrabold rounded-full flex items-center justify-center border border-[#6360DF]">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button onClick={() => setShowAdd(true)}
            className="flex items-center space-x-2 bg-[#6360DF] hover:bg-[#5451d0] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#6360df22] transition-all">
            <Plus size={16} /><span>Add User</span>
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-white border border-[#d1d0eb]/50 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center space-x-2">
                  <SlidersHorizontal size={15} className="text-[#6360DF]" />
                  <span className="text-sm font-extrabold text-[#151a3c]">Filter Users</span>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setFilterRole('all'); setFilterAccess('all'); }}
                    className="text-[11px] font-bold text-red-500 hover:text-red-700 flex items-center space-x-1 transition-colors">
                    <X size={12} /><span>Clear All</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Role */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Role</label>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'staff', 'manager'] as const).map(r => (
                      <button key={r} onClick={() => setFilterRole(r)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-wide transition-all capitalize ${
                          filterRole === r ? 'bg-[#6360DF] text-white' : 'bg-[#F8F9FA] text-[#6c7e96] hover:bg-[#EEEDFA] hover:text-[#6360DF]'
                        }`}>
                        {r === 'all' ? 'All Roles' : r === 'manager' ? '👑 Manager' : '👤 Staff'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Page Access */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest">Has Access To</label>
                  <div className="flex flex-wrap gap-2">
                    {(['all', ...permKeys] as const).map(k => (
                      <button key={k} onClick={() => setFilterAccess(k as any)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-wide transition-all capitalize ${
                          filterAccess === k ? 'bg-[#6360DF] text-white' : 'bg-[#F8F9FA] text-[#6c7e96] hover:bg-[#EEEDFA] hover:text-[#6360DF]'
                        }`}>
                        {k === 'all' ? 'Any Page' : k}
                      </button>
                    ))}
                  </div>
                </div>


              </div>

              {/* Active chips */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#d1d0eb]/20">
                  {filterRole !== 'all' && (
                    <span className="flex items-center space-x-1.5 bg-[#EEEDFA] text-[#6360DF] px-3 py-1.5 rounded-full text-[10px] font-bold capitalize">
                      <span>{filterRole}</span>
                      <button onClick={() => setFilterRole('all')}><X size={10}/></button>
                    </span>
                  )}
                  {filterAccess !== 'all' && (
                    <span className="flex items-center space-x-1.5 bg-[#EEEDFA] text-[#6360DF] px-3 py-1.5 rounded-full text-[10px] font-bold capitalize">
                      <span>{filterAccess}</span>
                      <button onClick={() => setFilterAccess('all')}><X size={10}/></button>
                    </span>
                  )}

                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info bar */}
      <div className="bg-[#EEEDFA] border border-[#6360DF]/20 rounded-2xl px-6 py-4 flex items-start space-x-3">
        <Shield size={18} className="text-[#6360DF] mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-[#151a3c]">How Staff Login Works</p>
          <p className="text-xs text-[#6c7e96] font-medium mt-0.5">
            Staff and managers you add here can log in using their phone OTP (coming soon).
            Their access is restricted to the pages you grant them permission to.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">

        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-12 px-8 py-4 text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/30 bg-[#F9F9FF]/50">
          <div className="col-span-3">Name</div>
          <div className="col-span-3">Contact</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Page Access</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#6c7e96]">
            <Loader2 size={22} className="animate-spin mr-2" />
            <span className="text-sm font-medium">Loading users...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-[#6c7e96]">
            <Users size={40} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm font-medium">
              {staffList.length === 0 ? 'No users added yet.' : 'No users match your filters.'}
            </p>
            {staffList.length === 0 && (
              <p className="text-xs mt-1 opacity-60">Click "Add User" to invite your first staff member.</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(staff => (
              <div key={staff.id}>
                {/* Desktop row */}
                <div className="hidden md:grid grid-cols-12 px-8 py-5 items-center transition-colors hover:bg-[#f8f9fc]/50">
                  <div className="col-span-3 flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-[#EEEDFA] flex items-center justify-center text-[#6360DF] text-[12px] font-extrabold shrink-0">
                      {staff.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#151a3c] text-sm truncate">{staff.full_name}</p>

                    </div>
                  </div>
                  <div className="col-span-3 space-y-0.5">
                    {staff.phone && (
                      <div className="flex items-center space-x-1.5 text-[#6c7e96] text-xs font-medium">
                        <Phone size={11} /><span>{staff.phone}</span>
                      </div>
                    )}
                    {/* Show truncated internal email only if no phone */}
                    {!staff.phone && (
                      <div className="flex items-center space-x-1.5 text-[#6c7e96] text-xs font-medium">
                        <Mail size={11} /><span className="text-[#d1d0eb] italic text-[10px]">No phone set</span>
                      </div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest capitalize ${getRoleBadge(staff.role)}`}>
                      {staff.role}
                    </span>
                  </div>
                  <div className="col-span-2 flex flex-wrap gap-1">
                    {permKeys.filter(k => staff.permissions?.[k]).map(k => (
                      <span key={k} className="text-[9px] font-bold bg-[#F1F5F9] text-[#64748b] px-2 py-0.5 rounded-md capitalize">{k}</span>
                    ))}
                  </div>
                  <div className="col-span-2 flex items-center justify-end space-x-2">
                    <button onClick={() => setViewStaff(staff)}
                      className="p-1.5 text-[#cbd5e1] hover:text-[#6360DF] hover:bg-[#EEEDFA] rounded-lg transition-all" title="View">
                      <Eye size={14} />
                    </button>
                    <button onClick={() => setEditStaff(staff)}
                      className="p-1.5 text-[#cbd5e1] hover:text-[#6360DF] hover:bg-[#EEEDFA] rounded-lg transition-all" title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setConfirmDeleteId(staff.id)}
                      className="p-1.5 text-[#cbd5e1] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Mobile card */}
                <div className="md:hidden p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-[#EEEDFA] flex items-center justify-center text-[#6360DF] text-[11px] font-extrabold shrink-0">
                        {staff.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-bold text-[#151a3c] text-sm">{staff.full_name}</p>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${getRoleBadge(staff.role)}`}>{staff.role}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button onClick={() => setViewStaff(staff)}
                        className="p-1.5 text-[#cbd5e1] hover:text-[#6360DF] hover:bg-[#EEEDFA] rounded-lg transition-all">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => setEditStaff(staff)}
                        className="p-1.5 text-[#cbd5e1] hover:text-[#6360DF] hover:bg-[#EEEDFA] rounded-lg transition-all">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmDeleteId(staff.id)}
                        className="p-1.5 text-[#cbd5e1] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {staff.phone && <p className="text-xs text-[#6c7e96] font-medium">{staff.phone}</p>}
                  <div className="flex flex-wrap gap-1">
                    {permKeys.filter(k => staff.permissions?.[k]).map(k => (
                      <span key={k} className="text-[9px] font-bold bg-[#F1F5F9] text-[#64748b] px-2 py-0.5 rounded-md capitalize">{k}</span>
                    ))}
                  </div>
                </div>

                {/* Delete confirm */}
                <AnimatePresence>
                  {confirmDeleteId === staff.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="bg-red-50 border-t border-red-100 px-6 md:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <p className="text-sm font-bold text-red-700">
                        Delete <span className="font-extrabold">{staff.full_name}</span>? Their login access will be revoked.
                      </p>
                      <div className="flex items-center space-x-3">
                        <button onClick={() => setConfirmDeleteId(null)}
                          className="px-4 py-2 text-sm font-bold text-[#6c7e96] bg-white border border-[#d1d0eb] rounded-lg hover:bg-slate-50">Cancel</button>
                        <button onClick={() => handleDelete(staff.id)}
                          className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg flex items-center space-x-1.5">
                          {deletingId === staff.id && <Loader2 size={13} className="animate-spin" />}
                          <span>Yes, Delete</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add User Popup */}
      <AnimatePresence>
        {showAdd && (
          <AddUserPopup
            onClose={() => setShowAdd(false)}
            onSaved={newStaff => setStaffList(prev => [newStaff, ...prev])}
          />
        )}
      </AnimatePresence>

      {/* View User Popup */}
      <AnimatePresence>
        {viewStaff && (
          <ViewUserPopup staff={viewStaff} onClose={() => setViewStaff(null)} />
        )}
      </AnimatePresence>

      {/* Edit User Popup */}
      <AnimatePresence>
        {editStaff && (
          <EditUserPopup
            staff={editStaff}
            onClose={() => setEditStaff(null)}
            onSaved={updated => {
              setStaffList(prev => prev.map(s => s.id === updated.id ? updated : s));
              setEditStaff(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default UsersPage;