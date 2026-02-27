import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Car as CarIcon, Users, Settings, Bell, Search,
  Menu, X, Plus, Calendar, Grid3X3, LogOut, User, Mail, Phone,
  Briefcase, MapPin as MapPinIcon, Save, ChevronDown, TrendingUp,
  AlertTriangle, CheckCircle2, Clock, ArrowRight, RefreshCw,
  Loader2, MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { UserProfile } from '../types';
import { supabase, getCurrentUser } from '../supabaseClient';
import FleetListing from './FleetListing';
import BookingsPage from './BookingsPage';
import DriversPage from './DriversPage';
import AllocationPage from './AllocationPage';
import RemindersPage from './RemindersPage';
import HandoverPage from './HandoverPage';
import { ClipboardList } from 'lucide-react';

const StatCard: React.FC<{
  title: string; value: string; icon: React.ReactElement;
  color: string; trend: string; trendIsPositive: boolean; index: number; urgent?: boolean;
}> = ({ title, value, icon, color, trend, trendIsPositive, index, urgent }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * index + 0.2 }}
    className={`bg-white p-6 rounded-[2rem] shadow-sm border flex items-start justify-between group hover:shadow-xl transition-all ${urgent ? 'border-red-200 hover:shadow-red-100' : 'border-slate-50 hover:shadow-[#6360df08]'}`}
  >
    <div className="space-y-1">
      <p className="text-[#6c7e96] text-[13px] font-medium">{title}</p>
      <h3 className={`text-2xl font-bold ${urgent ? 'text-red-500' : 'text-[#151a3c]'}`}>{value}</h3>
      <div className="flex items-center pt-1">
        <TrendingUp className={`w-3.5 h-3.5 mr-1 ${trendIsPositive ? 'text-green-500' : 'text-red-400'}`} />
        <span className={`text-[11px] font-bold ${trendIsPositive ? 'text-green-500' : 'text-red-400'}`}>{trend}</span>
      </div>
    </div>
    <div className={`p-4 rounded-2xl ${color} text-white shadow-lg group-hover:scale-110 transition-transform flex items-center justify-center`}>
      {React.cloneElement(icon as React.ReactElement<any>, { size: 22 })}
    </div>
  </motion.div>
);

const SidebarItem: React.FC<{
  icon: React.ReactElement; label: string; active?: boolean; onClick?: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick}
    className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl transition-all relative group ${active ? 'bg-[#6360DF] text-white shadow-lg shadow-[#6360df44]' : 'text-[#6c7e96] hover:bg-[#F3F4F6] hover:text-[#151a3c]'}`}
  >
    <div className={`${active ? 'text-white' : 'text-[#6c7e96] group-hover:text-[#151a3c]'}`}>
      {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
    </div>
    <span className={`font-semibold text-[15px] ${active ? 'text-white' : 'text-inherit'}`}>{label}</span>
  </button>
);

const SectionHeader: React.FC<{
  title: string; subtitle?: string; action?: { label: string; onClick: () => void };
  icon: React.ReactElement; iconColor: string; urgent?: boolean;
}> = ({ title, subtitle, action, icon, iconColor, urgent }) => (
  <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50">
    <div className="flex items-center space-x-3">
      <div className={`p-2 rounded-xl ${urgent ? 'bg-red-50' : 'bg-[#EEEDFA]'} ${iconColor}`}>
        {React.cloneElement(icon as React.ReactElement<any>, { size: 18 })}
      </div>
      <div>
        <h3 className={`text-base font-extrabold ${urgent ? 'text-red-600' : 'text-[#151a3c]'}`}>{title}</h3>
        {subtitle && <p className="text-xs text-[#6c7e96] font-medium mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action && (
      <button onClick={action.onClick} className="text-[#6360DF] font-bold text-sm hover:underline flex items-center space-x-1">
        <span>{action.label}</span><ArrowRight size={14} />
      </button>
    )}
  </div>
);

const EmptyRow: React.FC<{ message: string }> = ({ message }) => (
  <div className="py-8 text-center text-[#6c7e96] text-sm font-medium">{message}</div>
);

const LoadingRow: React.FC = () => (
  <div className="py-8 flex items-center justify-center text-[#6c7e96]">
    <Loader2 size={18} className="animate-spin mr-2" /><span className="text-sm font-medium">Loading...</span>
  </div>
);

interface DashboardStats {
  totalVehicles: number; availableVehicles: number;
  activeBookings: number; totalDrivers: number; unallocatedToday: number;
}
interface TodayBooking {
  id: string; customer: string; initials: string;
  location: string; time: string; vehicles: number;
}
interface UnallocatedItem {
  detailId: string; customer: string; vehicle: string; pickupTime: string; location: string;
}
interface ReminderItem {
  id: string; type: string; vehicleName: string;
  dueDate: string; daysRemaining: number; priority: string;
}
interface FleetCar {
  id: string; name: string; plate: string; status: string; statusColor: string;
}

const Dashboard: React.FC<{ onLogout?: () => void; initialProfile: UserProfile }> = ({ onLogout, initialProfile }) => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [profile, setProfile] = useState(initialProfile);
  const [editProfile, setEditProfile] = useState({ ...profile });
  const [isEditing, setIsEditing] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({ totalVehicles: 0, availableVehicles: 0, activeBookings: 0, totalDrivers: 0, unallocatedToday: 0 });
  const [todayPickups, setTodayPickups] = useState<TodayBooking[]>([]);
  const [todayReturns, setTodayReturns] = useState<TodayBooking[]>([]);
  const [unallocated, setUnallocated] = useState<UnallocatedItem[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [fleetCars, setFleetCars] = useState<FleetCar[]>([]);
  const [loading, setLoading] = useState(true);

  const goaLocations = ['Panjim','Mapusa','Miramar','Calangute','Candolim','Baga','Airport (Dabolim)','Mopa Airport','Margao','Vasco'];

  const sidebarItems = [
    { icon: <LayoutDashboard />, label: 'Dashboard' },
    { icon: <CarIcon />, label: 'Fleet Listing' },
    { icon: <Calendar />, label: 'Bookings' },
    { icon: <Users />, label: 'Drivers' },
    { icon: <Grid3X3 />, label: 'Allocation' },
    { icon: <Bell />, label: 'Reminders' },
    { icon: <ClipboardList />, label: 'Handover' },
    { icon: <Settings />, label: 'Settings' },
  ];

  const loadDashboardData = async () => {
    setLoading(true);
    const authUser = await getCurrentUser();
    if (!authUser) { setLoading(false); return; }
    const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', authUser.id).single();
    if (!ownerRow) { setLoading(false); return; }
    const ownerId = ownerRow.id;

    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
    const in7Days = new Date(); in7Days.setDate(in7Days.getDate() + 7);

    const [vehiclesRes, driversRes, bookingsRes, allBookingsRes, allocationsRes, remindersRes] = await Promise.all([
      supabase.from('vehicles').select('id, status, registration_no, models(brand, name)').eq('owner_id', ownerId),
      supabase.from('drivers').select('id', { count: 'exact' }).eq('owner_id', ownerId),
      supabase.from('bookings').select('id', { count: 'exact' }).eq('owner_id', ownerId).in('status', ['BOOKED','ONGOING']),
      supabase.from('bookings').select('id, customer_name, pickup_at, drop_at, pickup_location, drop_location, no_of_vehicles, status').eq('owner_id', ownerId).in('status', ['BOOKED','ONGOING']),
      supabase.from('allocations').select('booking_detail_id, is_confirmed').eq('owner_id', ownerId),
      supabase.from('reminders')
        .select('id, type, category, due_date, days_remaining, priority, vehicle_id, vehicles(registration_no, models(brand, name))')
        .eq('owner_id', ownerId)
        .gte('due_date', todayStart.toISOString().slice(0,10))
        .lte('due_date', in7Days.toISOString().slice(0,10))
        .order('due_date', { ascending: true })
        .limit(5),
    ]);

    const vehicles = (vehiclesRes.data as any[]) || [];
    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter(v => v.status === 'available').length;
    const activeBookings = bookingsRes.count ?? 0;
    const totalDrivers = driversRes.count ?? 0;

    // Fleet preview — first 5
    const getStatusColor = (s: string) => {
      if (s === 'available') return 'bg-green-100 text-green-700';
      if (s === 'rented') return 'bg-blue-100 text-blue-700';
      if (s === 'maintenance') return 'bg-orange-100 text-orange-700';
      return 'bg-gray-100 text-gray-600';
    };
    const getStatusLabel = (s: string) => {
      if (s === 'available') return 'Available';
      if (s === 'rented') return 'In Use';
      if (s === 'maintenance') return 'Maintenance';
      return s;
    };
    setFleetCars(vehicles.slice(0, 5).map((v: any) => ({
      id: v.id,
      name: v.models ? `${v.models.brand} ${v.models.name}` : 'Unknown',
      plate: v.registration_no,
      status: getStatusLabel(v.status),
      statusColor: getStatusColor(v.status),
    })));

    // Pickups & Returns today
    const allBookings = (allBookingsRes.data as any[]) || [];
    const pickups: TodayBooking[] = [];
    const returns: TodayBooking[] = [];
    allBookings.forEach(b => {
      const pickupAt = new Date(b.pickup_at);
      const dropAt = new Date(b.drop_at);
      const initials = b.customer_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2);
      const fmtTime = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      if (pickupAt >= todayStart && pickupAt <= todayEnd) pickups.push({ id: b.id, customer: b.customer_name, initials, location: b.pickup_location, time: fmtTime(pickupAt), vehicles: b.no_of_vehicles });
      if (dropAt >= todayStart && dropAt <= todayEnd) returns.push({ id: b.id, customer: b.customer_name, initials, location: b.drop_location, time: fmtTime(dropAt), vehicles: b.no_of_vehicles });
    });
    setTodayPickups(pickups);
    setTodayReturns(returns);

    // Unallocated today
    const todayBookingIds = allBookings.filter(b => { const p = new Date(b.pickup_at); return p >= todayStart && p <= todayEnd; }).map(b => b.id);
    let unallocatedItems: UnallocatedItem[] = [];
    if (todayBookingIds.length > 0) {
      const { data: detailsData } = await supabase
        .from('booking_details')
        .select('id, booking_id, vehicle_id, vehicles(registration_no, models(brand, name)), bookings(customer_name, pickup_at, pickup_location)')
        .in('booking_id', todayBookingIds);
      const allocatedDetailIds = new Set(((allocationsRes.data as any[]) || []).map((a: any) => a.booking_detail_id));
      unallocatedItems = ((detailsData as any[]) || []).filter(d => !allocatedDetailIds.has(d.id)).map(d => ({
        detailId: d.id, bookingId: d.booking_id,
        customer: d.bookings?.customer_name || '—',
        vehicle: d.vehicles?.models ? `${d.vehicles.models.brand} ${d.vehicles.models.name}` : d.vehicles?.registration_no || '—',
        pickupTime: d.bookings?.pickup_at ? new Date(d.bookings.pickup_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—',
        location: d.bookings?.pickup_location || '—',
      }));
    }
    setUnallocated(unallocatedItems);

    // Reminders
    setReminders(((remindersRes.data as any[]) || []).map(r => ({
      id: r.id, type: r.category || r.type,
      vehicleName: r.vehicles?.models ? `${r.vehicles.models.brand} ${r.vehicles.models.name}` : r.vehicles?.registration_no || '—',
      dueDate: new Date(r.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      daysRemaining: r.days_remaining, priority: r.priority,
    })));

    setStats({ totalVehicles, availableVehicles, activeBookings, totalDrivers, unallocatedToday: unallocatedItems.length });
    setLoading(false);
  };

  useEffect(() => { if (activeTab === 'Dashboard') loadDashboardData(); }, [activeTab]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const authUser = await getCurrentUser();
      if (!authUser) { toast.error('No session found.'); return; }
      const { error } = await supabase.from('owners').update({
        full_name: editProfile.fullName, business_name: editProfile.businessName,
        email: editProfile.email, business_address: editProfile.businessAddress,
        is_gst_enabled: editProfile.isGstEnabled, gst_type: editProfile.gstType || null,
        gst_number: editProfile.gstNumber || null, service_locations: editProfile.locations,
      }).eq('user_id', authUser.id);
      if (error) { toast.error('Failed to save: ' + error.message); return; }
      setProfile({ ...editProfile }); setIsEditing(false); toast.success('Profile saved!');
    } catch { toast.error('Something went wrong.'); }
    finally { setIsSavingProfile(false); }
  };

  const priorityColor = (p: string) => {
    if (p === 'Critical' || p === 'High') return 'text-red-500 bg-red-50';
    if (p === 'Medium') return 'text-orange-500 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="flex h-screen bg-[#FFFFFF] overflow-hidden">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-[#d1d0eb] p-5 lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden absolute top-6 right-6 p-2 text-[#6c7e96]"><X size={20} /></button>
        <div className="flex items-center space-x-3 mb-10 px-1 pt-2">
          <div className="w-10 h-10 bg-[#6360DF] rounded-xl flex items-center justify-center shadow-md"><CarIcon className="text-white w-6 h-6" /></div>
          <span className="text-[20px] font-bold text-[#151a3c] tracking-tight">GaadiZai</span>
        </div>
        <nav className="flex-1 space-y-2 px-1">
          {sidebarItems.map(item => (
            <SidebarItem key={item.label} icon={item.icon} label={item.label} active={activeTab === item.label}
              onClick={() => { setActiveTab(item.label); setIsSidebarOpen(false); }} />
          ))}
        </nav>
        <div className="mt-auto px-1 space-y-2 pb-4">
          <button onClick={() => setActiveTab('Bookings')}
            className="w-full bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#6360df33] transition-all active:scale-[0.98] flex items-center justify-center space-x-2">
            <Plus size={18} /><span className="text-[15px]">New Booking</span>
          </button>
          <button onClick={onLogout}
            className="w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl transition-all text-[#6c7e96] hover:bg-red-50 hover:text-red-600 group">
            <LogOut size={20} className="group-hover:text-red-600" />
            <span className="font-semibold text-[15px]">Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#EEEDFA]">
        {/* Header */}
        <header className="h-20 bg-white border-b border-[#d1d0eb]/50 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center space-x-4 flex-1">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-[#6c7e96] hover:bg-slate-50 rounded-lg"><Menu size={24} /></button>
            <div className="relative w-full max-sm:hidden max-w-sm group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#918fe6] w-5 h-5 group-focus-within:text-[#6360DF] transition-colors" />
              <input type="text" placeholder="Global search bookings..."
                className="w-full bg-[#f8f7ff] border border-transparent rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] focus:bg-white outline-none transition-all text-sm font-medium" />
            </div>
          </div>
          <div className="flex items-center space-x-8">
            <button className="relative p-2.5 bg-[#f8f7ff] rounded-xl text-[#6c7e96] hover:text-[#6360DF] hover:bg-[#EEEDFA] transition-all group">
              <Bell className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              {stats.unallocatedToday > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />}
            </button>
            <div onClick={() => { setEditProfile({...profile}); setIsProfileOpen(true); setIsEditing(false); }}
              className="flex items-center space-x-3 cursor-pointer group">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-[#151a3c] leading-none">{profile.fullName}</p>
                <p className="text-[11px] text-[#6c7e96] font-bold mt-1 uppercase tracking-wider">Fleet Owner</p>
              </div>
              <div className="w-12 h-12 rounded-2xl border-2 border-[#d1d0eb] group-hover:border-[#6360DF] transition-all overflow-hidden p-0.5">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.fullName}`} className="w-full h-full rounded-[14px] bg-slate-100" alt="Profile" />
              </div>
            </div>
          </div>
        </header>

        {/* Profile Modal — identical to before */}
        <AnimatePresence>
          {isProfileOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsProfileOpen(false)} className="absolute inset-0 bg-[#151a3c]/40 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#EEEDFA] flex items-center justify-center text-[#6360DF]"><User size={28} /></div>
                    <div><h3 className="text-xl font-bold text-[#151a3c]">{profile.fullName}</h3><p className="text-sm text-[#6c7e96] font-medium">{profile.businessName}</p></div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <button onClick={() => toast.success('Subscription details coming soon!')} className="bg-[#EEEDFA] text-[#6360DF] px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#6360DF] hover:text-white transition-all shadow-sm">Premium Plan</button>
                    <button onClick={() => setIsProfileOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-[#6c7e96]"><X size={24} /></button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest flex items-center"><User size={12} className="mr-1.5" /> Full Name</label>
                      {isEditing ? <input type="text" value={editProfile.fullName} onChange={e => setEditProfile({...editProfile, fullName: e.target.value})} className="w-full bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all" />
                        : <p className="text-base font-bold text-[#151a3c] py-1">{profile.fullName}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest flex items-center"><Briefcase size={12} className="mr-1.5" /> Business Name</label>
                      {isEditing ? <input type="text" value={editProfile.businessName} onChange={e => setEditProfile({...editProfile, businessName: e.target.value})} className="w-full bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all" />
                        : <p className="text-base font-bold text-[#151a3c] py-1">{profile.businessName}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest flex items-center"><Phone size={12} className="mr-1.5" /> Phone Number</label>
                      {isEditing ? <input type="text" value={editProfile.phone} onChange={e => setEditProfile({...editProfile, phone: e.target.value})} className="w-full bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all" />
                        : <p className="text-base font-bold text-[#151a3c] py-1">{profile.phone}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest flex items-center"><Mail size={12} className="mr-1.5" /> Email Address</label>
                      {isEditing ? <input type="email" value={editProfile.email} onChange={e => setEditProfile({...editProfile, email: e.target.value})} className="w-full bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all" />
                        : <p className="text-base font-bold text-[#151a3c] py-1">{profile.email}</p>}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest flex items-center"><MapPinIcon size={12} className="mr-1.5" /> Business Address</label>
                      {isEditing ? <textarea rows={2} value={editProfile.businessAddress} onChange={e => setEditProfile({...editProfile, businessAddress: e.target.value})} className="w-full bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all resize-none" />
                        : <p className="text-base font-bold text-[#151a3c] py-1">{profile.businessAddress}</p>}
                    </div>
                    <div className="md:col-span-2 bg-[#F8F9FA] rounded-2xl p-6 space-y-6 border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1"><h4 className="text-sm font-bold text-[#151a3c]">GST Configuration</h4><p className="text-xs text-[#6c7e96] font-medium">Enable GST for your business invoices</p></div>
                        {isEditing ? (
                          <button onClick={() => setEditProfile({...editProfile, isGstEnabled: !editProfile.isGstEnabled})} className={`w-12 h-6 rounded-full transition-all relative ${editProfile.isGstEnabled ? 'bg-[#6360DF]' : 'bg-slate-300'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editProfile.isGstEnabled ? 'right-1' : 'left-1'}`} />
                          </button>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${profile.isGstEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{profile.isGstEnabled ? 'Enabled' : 'Disabled'}</span>
                        )}
                      </div>
                      {(isEditing ? editProfile.isGstEnabled : profile.isGstEnabled) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest">GST Type</label>
                            {isEditing ? <select value={editProfile.gstType} onChange={e => setEditProfile({...editProfile, gstType: e.target.value})} className="w-full bg-white border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all appearance-none"><option value="Regular">Regular</option><option value="Composition">Composition</option></select>
                              : <p className="text-base font-bold text-[#151a3c]">{profile.gstType}</p>}
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest">GST Number</label>
                            {isEditing ? <input type="text" value={editProfile.gstNumber} onChange={e => setEditProfile({...editProfile, gstNumber: e.target.value})} className="w-full bg-white border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all" />
                              : <p className="text-base font-bold text-[#151a3c]">{profile.gstNumber}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest flex items-center"><MapPinIcon size={12} className="mr-1.5" /> Service Locations</label>
                        {isEditing && (
                          <div className="relative">
                            <select onChange={e => { if (e.target.value && !editProfile.locations.includes(e.target.value)) setEditProfile({...editProfile, locations: [...editProfile.locations, e.target.value]}); e.target.value=""; }}
                              className="bg-[#EEEDFA] text-[#6360DF] text-[11px] font-bold px-3 py-1.5 rounded-lg outline-none cursor-pointer appearance-none pr-8">
                              <option value="">+ Add Location</option>
                              {goaLocations.filter(loc => !editProfile.locations.includes(loc)).map(loc => <option key={loc} value={loc}>{loc}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6360DF] pointer-events-none" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(isEditing ? editProfile.locations : profile.locations).map((loc, i) => (
                          <div key={i} className="bg-[#EEEDFA] text-[#6360DF] px-4 py-1.5 rounded-full text-xs font-bold flex items-center">
                            {loc}
                            {isEditing && <button onClick={() => setEditProfile({...editProfile, locations: editProfile.locations.filter(l => l !== loc)})} className="ml-2 text-[#6360DF]/40 hover:text-red-500 transition-colors"><X size={12} /></button>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-10 py-8 border-t border-slate-100 flex items-center justify-end space-x-4 shrink-0">
                  {isEditing ? (
                    <>
                      <button onClick={() => setIsEditing(false)} className="px-6 py-3 text-sm font-bold text-[#6c7e96] hover:text-[#151a3c] transition-colors">Cancel</button>
                      <button onClick={handleSaveProfile} disabled={isSavingProfile}
                        className="bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-[#6360df33] transition-all flex items-center space-x-2 disabled:opacity-60">
                        {isSavingProfile ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
                        <span>{isSavingProfile ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setIsEditing(true)} className="bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-[#6360df33] transition-all">Edit Profile</button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          <AnimatePresence mode="wait">

            {activeTab === 'Dashboard' && (
              <motion.div key="dashboard-view" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.3 }} className="space-y-8">

                {/* Welcome */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-extrabold text-[#151a3c] tracking-tight">Owner Dashboard</h2>
                    <p className="text-[#6c7e96] text-sm font-medium mt-1 opacity-80">
                      {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={loadDashboardData}
                    className="flex items-center space-x-2 bg-white border border-[#d1d0eb] text-[#6c7e96] px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#EEEDFA] hover:text-[#6360DF] transition-all">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /><span>Refresh</span>
                  </motion.button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  <StatCard index={1} title="Total Vehicles" value={loading ? '—' : stats.totalVehicles.toString()} icon={<CarIcon />} color="bg-[#6360DF]" trend={loading ? '...' : `${stats.availableVehicles} available now`} trendIsPositive={true} />
                  <StatCard index={2} title="Active Bookings" value={loading ? '—' : stats.activeBookings.toString()} icon={<Calendar />} color="bg-blue-500" trend="Confirmed + ongoing" trendIsPositive={true} />
                  <StatCard index={3} title="Available Today" value={loading ? '—' : stats.availableVehicles.toString()} icon={<CheckCircle2 />} color="bg-green-500" trend={loading || stats.totalVehicles === 0 ? '—' : `${Math.round((stats.availableVehicles / stats.totalVehicles) * 100)}% of fleet`} trendIsPositive={true} />
                  <StatCard index={4} title="Unallocated Today" value={loading ? '—' : stats.unallocatedToday.toString()} icon={<AlertTriangle />} color={stats.unallocatedToday > 0 ? 'bg-red-500' : 'bg-slate-400'} trend={stats.unallocatedToday > 0 ? 'Action needed!' : 'All allocated'} trendIsPositive={stats.unallocatedToday === 0} urgent={stats.unallocatedToday > 0} />
                </div>

                {/* 2-col action sections */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                  {/* Today's Pickups */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="bg-white rounded-[2rem] shadow-sm border border-slate-50 overflow-hidden">
                    <SectionHeader title="Today's Bookings" subtitle={`${todayPickups.length} booking${todayPickups.length !== 1 ? 's' : ''} `}
                      icon={<CarIcon />} iconColor="text-[#6360DF]" action={{ label: 'View All', onClick: () => setActiveTab('Bookings') }} />
                    <div className="p-4 space-y-2">
                      {loading ? <LoadingRow /> : todayPickups.length === 0 ? <EmptyRow message="No pickups scheduled for today" /> : (
                        todayPickups.map((b, i) => (
                          <motion.div key={b.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }}
                            className="flex items-center justify-between p-4 rounded-xl hover:bg-[#f8f7ff] transition-colors group cursor-pointer">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-full bg-[#EEEDFA] flex items-center justify-center text-[#6360DF] text-[11px] font-extrabold shrink-0">{b.initials}</div>
                              <div>
                                <p className="font-bold text-[#151a3c] text-sm">{b.customer}</p>
                                <div className="flex items-center space-x-1.5 text-[#6c7e96] text-xs font-medium mt-0.5"><MapPinIcon size={10} className="text-[#6360DF]" /><span>{b.location}</span></div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center space-x-1.5 text-[#6360DF] font-extrabold text-sm"><Clock size={12} /><span>{b.time}</span></div>
                              <span className="text-[10px] font-bold text-[#6c7e96]">{b.vehicles} vehicle{b.vehicles > 1 ? 's' : ''}</span>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>

                  {/* Returning Today */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    className="bg-white rounded-[2rem] shadow-sm border border-slate-50 overflow-hidden">
                    <SectionHeader title="Returning Today" subtitle={`${todayReturns.length} vehicle${todayReturns.length !== 1 ? 's' : ''} returning today`}
                      icon={<RefreshCw />} iconColor="text-green-600" action={{ label: 'View All', onClick: () => setActiveTab('Bookings') }} />
                    <div className="p-4 space-y-2">
                      {loading ? <LoadingRow /> : todayReturns.length === 0 ? <EmptyRow message="No vehicles returning today" /> : (
                        todayReturns.map((b, i) => (
                          <motion.div key={b.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }}
                            className="flex items-center justify-between p-4 rounded-xl hover:bg-[#f8f7ff] transition-colors cursor-pointer">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center text-green-600 text-[11px] font-extrabold shrink-0">{b.initials}</div>
                              <div>
                                <p className="font-bold text-[#151a3c] text-sm">{b.customer}</p>
                                <div className="flex items-center space-x-1.5 text-[#6c7e96] text-xs font-medium mt-0.5"><MapPinIcon size={10} className="text-green-500" /><span>{b.location}</span></div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center space-x-1.5 text-green-600 font-extrabold text-sm"><Clock size={12} /><span>{b.time}</span></div>
                              <span className="text-[10px] font-bold text-[#6c7e96]">{b.vehicles} vehicle{b.vehicles > 1 ? 's' : ''}</span>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>

                  {/* Unallocated Today */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                    className={`bg-white rounded-[2rem] shadow-sm overflow-hidden border ${unallocated.length > 0 ? 'border-red-200' : 'border-slate-50'}`}>
                    <SectionHeader title="Unallocated Today"
                      subtitle={unallocated.length > 0 ? `${unallocated.length} booking${unallocated.length !== 1 ? 's' : ''} need driver assignment` : 'All bookings allocated'}
                      icon={<AlertTriangle />} iconColor={unallocated.length > 0 ? 'text-red-500' : 'text-green-500'} urgent={unallocated.length > 0}
                      action={{ label: 'Go to Allocation', onClick: () => setActiveTab('Allocation') }} />
                    <div className="p-4 space-y-2">
                      {loading ? <LoadingRow /> : unallocated.length === 0 ? (
                        <div className="py-8 flex flex-col items-center justify-center space-y-2">
                          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center"><CheckCircle2 size={20} className="text-green-500" /></div>
                          <p className="text-sm font-medium text-[#6c7e96]">All today's bookings are allocated</p>
                        </div>
                      ) : (
                        unallocated.map((item, i) => (
                          <motion.div key={item.detailId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }}
                            onClick={() => setActiveTab('Allocation')}
                            className="flex items-center justify-between p-4 rounded-xl bg-red-50/60 hover:bg-red-50 border border-red-100 transition-colors cursor-pointer">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-500 shrink-0"><AlertTriangle size={14} /></div>
                              <div>
                                <p className="font-bold text-[#151a3c] text-sm">{item.customer}</p>
                                <p className="text-xs font-medium text-[#6c7e96] mt-0.5">{item.vehicle}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center space-x-1 text-red-500 font-extrabold text-xs"><Clock size={10} /><span>{item.pickupTime}</span></div>
                              <span className="text-[10px] text-red-400 font-bold">No driver assigned</span>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>

                  {/* Reminders — next 7 days */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                    className="bg-white rounded-[2rem] shadow-sm border border-slate-50 overflow-hidden">
                    <SectionHeader title="Reminders — Next 7 Days" subtitle="Insurance, PUC & service due soon"
                      icon={<Bell />} iconColor="text-orange-500" action={{ label: 'View All', onClick: () => setActiveTab('Reminders') }} />
                    <div className="p-4 space-y-2">
                      {loading ? <LoadingRow /> : reminders.length === 0 ? <EmptyRow message="No reminders in the next 7 days" /> : (
                        reminders.map((r, i) => (
                          <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }}
                            className="flex items-center justify-between p-4 rounded-xl hover:bg-[#f8f7ff] transition-colors">
                            <div className="flex items-center space-x-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${priorityColor(r.priority)}`}><Bell size={14} /></div>
                              <div>
                                <p className="font-bold text-[#151a3c] text-sm">{r.type}</p>
                                <p className="text-xs font-medium text-[#6c7e96] mt-0.5">{r.vehicleName}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-extrabold text-[#151a3c]">{r.dueDate}</p>
                              <span className={`text-[10px] font-bold ${r.daysRemaining <= 2 ? 'text-red-500' : r.daysRemaining <= 5 ? 'text-orange-500' : 'text-green-600'}`}>
                                {r.daysRemaining === 0 ? 'Due today' : `${r.daysRemaining}d remaining`}
                              </span>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* ── Fleet Status Table (first 5 vehicles) ── */}
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.5 }}
                  className="bg-white rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden">
                  <div className="flex items-center justify-between px-10 py-8">
                    <h3 className="text-lg font-extrabold text-[#151a3c]">Current Fleet Status</h3>
                    <button onClick={() => setActiveTab('Fleet Listing')} className="text-[#6360DF] font-bold text-sm hover:underline tracking-tight transition-all">View All Fleet</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[#6c7e96] border-b border-slate-50">
                          <th className="pl-10 pb-4 text-xs font-bold uppercase tracking-widest opacity-60">Vehicle</th>
                          <th className="pb-4 text-xs font-bold uppercase tracking-widest opacity-60">Plate Number</th>
                          <th className="pb-4 text-xs font-bold uppercase tracking-widest opacity-60">Status</th>
                          <th className="pr-10 pb-4 text-xs font-bold uppercase tracking-widest opacity-60"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {loading ? (
                          <tr><td colSpan={4} className="py-10 text-center text-[#6c7e96] text-sm font-medium">Loading fleet...</td></tr>
                        ) : fleetCars.length === 0 ? (
                          <tr><td colSpan={4} className="py-10 text-center text-[#6c7e96] text-sm font-medium">No vehicles added yet.</td></tr>
                        ) : (
                          fleetCars.map((car, idx) => (
                            <motion.tr key={car.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 + idx * 0.1 }}
                              className="group hover:bg-[#f8f9fc]/50 transition-colors">
                              <td className="py-6 pl-10">
                                <div className="flex items-center space-x-4">
                                  <div className="w-12 h-12 bg-slate-100/60 rounded-[14px] flex items-center justify-center group-hover:bg-white transition-colors"><CarIcon className="text-[#6360DF] w-6 h-6" /></div>
                                  <span className="font-bold text-[#151a3c] text-[15px]">{car.name}</span>
                                </div>
                              </td>
                              <td className="py-6 text-[#6c7e96] font-semibold text-[14px]">{car.plate}</td>
                              <td className="py-6"><span className={`px-4 py-1.5 rounded-full text-[11px] font-extrabold tracking-wide ${car.statusColor}`}>{car.status}</span></td>
                              <td className="py-6 pr-10 text-right">
                                <button className="p-2 text-[#cbd5e1] hover:text-[#6c7e96] hover:bg-white rounded-xl transition-all"><MoreVertical className="w-5 h-5" /></button>
                              </td>
                            </motion.tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>

              </motion.div>
            )}

            {activeTab === 'Fleet Listing' && (
              <motion.div key="fleet" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.3 }}><FleetListing /></motion.div>
            )}
            {activeTab === 'Bookings' && (
              <motion.div key="bookings" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.3 }}><BookingsPage /></motion.div>
            )}
            {activeTab === 'Drivers' && (
              <motion.div key="drivers" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.3 }}><DriversPage /></motion.div>
            )}
            {activeTab === 'Allocation' && (
              <motion.div key="allocation" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.3 }}><AllocationPage /></motion.div>
            )}
            {activeTab === 'Reminders' && (
              <motion.div key="reminders" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.3 }}><RemindersPage /></motion.div>
            )}
            {activeTab === 'Handover' && (
              <motion.div key="handover" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.3 }}>
              <HandoverPage />
              </motion.div>
            )}
            {!['Dashboard','Fleet Listing','Bookings','Drivers','Allocation','Reminders','Handover'].includes(activeTab) && (
              <motion.div key="coming-soon" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}
                className="h-full flex flex-col items-center justify-center text-center py-20">
                <div className="w-20 h-20 bg-[#EEEDFA] rounded-3xl flex items-center justify-center mb-6 text-[#6360DF]">
                  {sidebarItems.find(i => i.label === activeTab)?.icon && React.cloneElement(sidebarItems.find(i => i.label === activeTab)?.icon as React.ReactElement<any>, { size: 40 })}
                </div>
                <h2 className="text-3xl font-bold text-[#151a3c] mb-2">{activeTab}</h2>
                <p className="text-[#6c7e96] max-w-sm">This feature is currently under development.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <div className="fixed bottom-8 right-8 lg:hidden">
        <button onClick={() => setActiveTab('Bookings')}
          className="w-14 h-14 bg-[#6360DF] text-white rounded-2xl shadow-2xl shadow-[#6360df66] flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
          <Plus size={24} />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;