import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Search, Loader2, X, Check, Eye, EyeOff,
  Trash2, Shield, ShieldCheck, ChevronDown, UserCircle,
  Mail, Phone, Clock, AlertCircle
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
  };
  last_login_at: string | null;
  created_at: string;
}

interface NewUserForm {
  full_name: string;
  email: string;
  phone: string;
  role: 'staff' | 'manager';
  password: string;
  permissions: {
    bookings: boolean;
    vehicles: boolean;
    drivers: boolean;
    reports: boolean;
  };
}

const SUPABASE_URL = 'https://yliattfjerzkjqdqntqk.supabase.co';

const defaultPermissions = { bookings: true, vehicles: false, drivers: false, reports: false };
const managerPermissions = { bookings: true, vehicles: true, drivers: true, reports: true };

// ── Add User Popup ────────────────────────────────────────────
const AddUserPopup: React.FC<{
  onClose: () => void;
  onSaved: (user: StaffUser) => void;
}> = ({ onClose, onSaved }) => {
  const [form, setForm] = useState<NewUserForm>({
    full_name: '', email: '', phone: '', role: 'staff',
    password: '', permissions: { ...defaultPermissions },
  });
  const [showPassword, setShowPassword] = useState(false);
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
    if (!form.email.trim()) { setError('Email is required.'); return; }
    if (!form.password || form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not authenticated.'); return; }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-staff-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          role: form.role,
          permissions: form.permissions,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) { setError(json.error || 'Failed to create user.'); return; }

      toast.success(`${form.full_name} added successfully!`);
      onSaved(json.staff);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const permLabels: { key: keyof typeof defaultPermissions; label: string }[] = [
    { key: 'bookings', label: 'Bookings' },
    { key: 'vehicles', label: 'Vehicles' },
    { key: 'drivers',  label: 'Drivers' },
    { key: 'reports',  label: 'Reports' },
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

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Email <span className="text-red-500">*</span></label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
              placeholder="riya@example.com"
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

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(f => ({...f, password: e.target.value}))}
                placeholder="Min. 6 characters"
                className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-4 pr-12 text-sm font-medium text-[#151a3c] outline-none focus:border-[#6360DF] focus:ring-2 focus:ring-[#6360DF]/10" />
              <button type="button" onClick={() => setShowPassword(p => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6c7e96] hover:text-[#6360DF]">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
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
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Load staff ──────────────────────────────────────────
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

  // ── Toggle active ───────────────────────────────────────
  const handleToggle = async (staffId: string) => {
    setTogglingId(staffId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-staff-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ staff_id: staffId, action: 'toggle' }),
      });
      const json = await res.json();
      if (json.success) {
        setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, is_active: json.is_active } : s));
        toast.success(json.is_active ? 'User activated.' : 'User deactivated.');
      } else {
        toast.error(json.error || 'Failed to update.');
      }
    } finally {
      setTogglingId(null);
    }
  };

  // ── Delete ──────────────────────────────────────────────
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
      } else {
        toast.error(json.error || 'Failed to delete.');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = staffList.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    if (role === 'manager') return 'bg-[#FEF3C7] text-[#D97706]';
    return 'bg-[#EEEDFA] text-[#6360DF]';
  };

  const fmtDate = (d: string | null) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const permKeys = ['bookings', 'vehicles', 'drivers', 'reports'] as const;

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
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
          <button onClick={() => setShowAdd(true)}
            className="flex items-center space-x-2 bg-[#6360DF] hover:bg-[#5451d0] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#6360df22] transition-all">
            <Plus size={16} /><span>Add User</span>
          </button>
        </div>
      </div>

      {/* ── How it works info bar ── */}
      <div className="bg-[#EEEDFA] border border-[#6360DF]/20 rounded-2xl px-6 py-4 flex items-start space-x-3">
        <Shield size={18} className="text-[#6360DF] mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-[#151a3c]">How Staff Login Works</p>
          <p className="text-xs text-[#6c7e96] font-medium mt-0.5">
            Staff and managers you add here can log in using their email & password at the same login screen.
            Their access is restricted to the pages you grant them permission to.
          </p>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">

        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-12 px-8 py-4 text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/30 bg-[#F9F9FF]/50">
          <div className="col-span-3">Name</div>
          <div className="col-span-3">Contact</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Page Access</div>
          <div className="col-span-1">Last Login</div>
          <div className="col-span-1 text-right">Actions</div>
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
              {staffList.length === 0 ? 'No users added yet.' : 'No users match your search.'}
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
                <div className={`hidden md:grid grid-cols-12 px-8 py-5 items-center transition-colors ${staff.is_active ? 'hover:bg-[#f8f9fc]/50' : 'bg-slate-50/50 opacity-60'}`}>
                  {/* Name + avatar */}
                  <div className="col-span-3 flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-[#EEEDFA] flex items-center justify-center text-[#6360DF] text-[12px] font-extrabold shrink-0">
                      {staff.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#151a3c] text-sm truncate">{staff.full_name}</p>
                      {!staff.is_active && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Inactive</p>}
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="col-span-3 space-y-0.5">
                    <div className="flex items-center space-x-1.5 text-[#6c7e96] text-xs font-medium">
                      <Mail size={11} /><span className="truncate">{staff.email}</span>
                    </div>
                    {staff.phone && (
                      <div className="flex items-center space-x-1.5 text-[#6c7e96] text-xs font-medium">
                        <Phone size={11} /><span>{staff.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Role */}
                  <div className="col-span-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest capitalize ${getRoleBadge(staff.role)}`}>
                      {staff.role}
                    </span>
                  </div>

                  {/* Permissions */}
                  <div className="col-span-2 flex flex-wrap gap-1">
                    {permKeys.filter(k => staff.permissions?.[k]).map(k => (
                      <span key={k} className="text-[9px] font-bold bg-[#F1F5F9] text-[#64748b] px-2 py-0.5 rounded-md capitalize">{k}</span>
                    ))}
                  </div>

                  {/* Last login */}
                  <div className="col-span-1">
                    <div className="flex items-center space-x-1 text-[#6c7e96]">
                      <Clock size={11} />
                      <span className="text-[11px] font-medium">{fmtDate(staff.last_login_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-end space-x-1">
                    {/* Active toggle */}
                    <button
                      onClick={() => handleToggle(staff.id)}
                      disabled={togglingId === staff.id}
                      title={staff.is_active ? 'Deactivate' : 'Activate'}
                      className={`relative w-9 h-5 rounded-full transition-colors duration-300 shrink-0 ${staff.is_active ? 'bg-[#6360DF]' : 'bg-slate-300'}`}>
                      {togglingId === staff.id
                        ? <Loader2 size={10} className="absolute top-1.5 left-1 text-white animate-spin" />
                        : <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${staff.is_active ? 'left-4' : 'left-0.5'}`} />}
                    </button>
                    {/* Delete */}
                    <button onClick={() => setConfirmDeleteId(staff.id)}
                      className="p-1.5 text-[#cbd5e1] hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Mobile card */}
                <div className={`md:hidden p-5 space-y-3 ${!staff.is_active ? 'opacity-60' : ''}`}>
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
                    <div className="flex items-center space-x-2">
                      <button onClick={() => handleToggle(staff.id)} disabled={togglingId === staff.id}
                        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${staff.is_active ? 'bg-[#6360DF]' : 'bg-slate-300'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${staff.is_active ? 'left-4' : 'left-0.5'}`} />
                      </button>
                      <button onClick={() => setConfirmDeleteId(staff.id)} className="p-1.5 text-[#cbd5e1] hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-[#6c7e96] font-medium">{staff.email}</p>
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

      {/* ── Add User Popup ── */}
      <AnimatePresence>
        {showAdd && (
          <AddUserPopup
            onClose={() => setShowAdd(false)}
            onSaved={newStaff => setStaffList(prev => [newStaff, ...prev])}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default UsersPage;