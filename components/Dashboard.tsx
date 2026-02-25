
import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Car as CarIcon, 
  Users, 
  DollarSign, 
  Settings, 
  Bell, 
  Search,
  MoreVertical,
  TrendingUp,
  Clock,
  Menu,
  X,
  Plus,
  Calendar,
  Grid3X3,
  List,
  FileText,
  LogOut,
  User,
  Mail,
  Phone,
  Briefcase,
  MapPin as MapPinIcon,
  Save,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { UserProfile } from '../types';
import FleetListing from './FleetListing';
import BookingsPage from './BookingsPage';
import DriversPage from './DriversPage';
import AllocationPage from './AllocationPage';
import RemindersPage from './RemindersPage';

const StatCard: React.FC<{ 
  title: string; 
  value: string; 
  // Changed from React.ReactNode to React.ReactElement to support cloning
  icon: React.ReactElement; 
  color: string; 
  trend: string; 
  trendIsPositive: boolean;
  index: number 
}> = ({ title, value, icon, color, trend, trendIsPositive, index }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 * index + 0.3 }}
    className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50 flex items-start justify-between group hover:shadow-xl hover:shadow-[#6360df08] transition-all"
  >
    <div className="space-y-1">
      <p className="text-[#6c7e96] text-[13px] font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-[#151a3c]">{value}</h3>
      <div className="flex items-center pt-1">
        <TrendingUp className={`w-3.5 h-3.5 mr-1 ${trendIsPositive ? 'text-green-500' : 'text-red-400'}`} />
        <span className={`text-[11px] font-bold ${trendIsPositive ? 'text-green-500' : 'text-red-400'}`}>
          {trend}
        </span>
      </div>
    </div>
    <div className={`p-4 rounded-2xl ${color} text-white shadow-lg group-hover:scale-110 transition-transform flex items-center justify-center`}>
      {/* Added <any> cast to cloneElement to allow the 'size' prop */}
      {React.cloneElement(icon as React.ReactElement<any>, { size: 22 })}
    </div>
  </motion.div>
);

const SidebarItem: React.FC<{ 
  // Changed from React.ReactNode to React.ReactElement to support cloning
  icon: React.ReactElement; 
  label: string; 
  active?: boolean; 
  onClick?: () => void 
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl transition-all relative group ${
      active 
        ? 'bg-[#6360DF] text-white shadow-lg shadow-[#6360df44]' 
        : 'text-[#6c7e96] hover:bg-[#F3F4F6] hover:text-[#151a3c]'
    }`}
  >
    <div className={`${active ? 'text-white' : 'text-[#6c7e96] group-hover:text-[#151a3c]'}`}>
      {/* Added <any> cast to cloneElement to allow the 'size' prop */}
      {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
    </div>
    <span className={`font-semibold text-[15px] ${active ? 'text-white' : 'text-inherit'}`}>{label}</span>
  </button>
);

const Dashboard: React.FC<{ onLogout?: () => void; initialProfile: UserProfile }> = ({ onLogout, initialProfile }) => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Profile State
  const [profile, setProfile] = useState(initialProfile);

  const [editProfile, setEditProfile] = useState({ ...profile });
  const [isEditing, setIsEditing] = useState(false);

  const goaLocations = [
    'Panjim', 'Mapusa', 'Miramar', 'Calangute', 'Candolim', 
    'Baga', 'Airport (Dabolim)', 'Mopa Airport', 'Margao', 'Vasco'
  ];

  const handleSaveProfile = () => {
    setProfile({ ...editProfile });
    setIsEditing(false);
  };

  const cars = [
    { id: '1', name: 'Tesla Model 3', plate: 'GZ-2024-01', status: 'Available', statusColor: 'bg-green-100 text-green-700', earnings: '$1,200' },
    { id: '2', name: 'BMW M4 Competition', plate: 'GZ-2024-05', status: 'In Use', statusColor: 'bg-blue-100 text-blue-700', earnings: '$1,200' },
    { id: '3', name: 'Range Rover Sport', plate: 'GZ-2024-08', status: 'Maintenance', statusColor: 'bg-orange-100 text-orange-700', earnings: '$1,200' },
  ];

  const sidebarItems = [
    { icon: <LayoutDashboard />, label: 'Dashboard' },
    { icon: <CarIcon />, label: 'Fleet Listing' },
    { icon: <Calendar />, label: 'Bookings' },
    { icon: <Users />, label: 'Drivers' },
    { icon: <Grid3X3 />, label: 'Allocation' },
    { icon: <Bell />, label: 'Reminders' },
    { icon: <Settings />, label: 'Settings' },
  ];

  const handleNewBooking = () => {
    console.log('New Booking Clicked');
    setActiveTab('Bookings');
  };

  return (
    <div className="flex h-screen bg-[#FFFFFF] overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-[#d1d0eb] p-5 lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button for mobile */}
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden absolute top-6 right-6 p-2 text-[#6c7e96]"
        >
          {/* Fixed typo: changed size(20) to size={20} to fix TypeScript error about boolean assignment */}
          <X size={20} />
        </button>

        {/* Logo Section */}
        <div className="flex items-center space-x-3 mb-10 px-1 pt-2">
          <div className="w-10 h-10 bg-[#6360DF] rounded-xl flex items-center justify-center shadow-md">
            <CarIcon className="text-white w-6 h-6" />
          </div>
          <span className="text-[20px] font-bold text-[#151a3c] tracking-tight">GaadiZai</span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 space-y-2 px-1">
          {sidebarItems.map((item) => (
            <SidebarItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.label}
              onClick={() => {
                setActiveTab(item.label);
                setIsSidebarOpen(false);
              }}
            />
          ))}
        </nav>

        {/* New Booking Button at bottom */}
        <div className="mt-auto px-1 space-y-2 pb-4">
          <button 
            onClick={handleNewBooking}
            className="w-full bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#6360df33] transition-all active:scale-[0.98] flex items-center justify-center space-x-2 group"
          >
            <Plus size={18} />
            <span className="text-[15px]">New Booking</span>
          </button>

          <button 
            onClick={onLogout}
            className="w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl transition-all text-[#6c7e96] hover:bg-red-50 hover:text-red-600 group"
          >
            <LogOut size={20} className="group-hover:text-red-600" />
            <span className="font-semibold text-[15px]">Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content Container */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#EEEDFA]">
        {/* Header */}
        <header className="h-20 bg-white border-b border-[#d1d0eb]/50 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center space-x-4 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-[#6c7e96] hover:bg-slate-50 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <div className="relative w-full max-sm:hidden max-w-sm group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#918fe6] w-5 h-5 group-focus-within:text-[#6360DF] transition-colors" />
              <input 
                type="text" 
                placeholder="Global search bookings..." 
                className="w-full bg-[#f8f7ff] border border-transparent rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] focus:bg-white outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="flex items-center space-x-8">
            <button className="relative p-2.5 bg-[#f8f7ff] rounded-xl text-[#6c7e96] hover:text-[#6360DF] hover:bg-[#EEEDFA] transition-all group">
              <Bell className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div 
              onClick={() => {
                setEditProfile({ ...profile });
                setIsProfileOpen(true);
                setIsEditing(false);
              }}
              className="flex items-center space-x-3 cursor-pointer group"
            >
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

        {/* Profile Modal */}
        <AnimatePresence>
          {isProfileOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsProfileOpen(false)}
                className="absolute inset-0 bg-[#151a3c]/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#EEEDFA] flex items-center justify-center text-[#6360DF]">
                      <User size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#151a3c]">{profile.fullName}</h3>
                      <p className="text-sm text-[#6c7e96] font-medium">{profile.businessName}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <button 
                      onClick={() => toast.success('Subscription details coming soon!')}
                      className="bg-[#EEEDFA] text-[#6360DF] px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#6360DF] hover:text-white transition-all shadow-sm"
                    >
                      Premium Plan
                    </button>
                    <button 
                      onClick={() => setIsProfileOpen(false)}
                      className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-[#6c7e96]"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Full Name */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest flex items-center">
                        <User size={12} className="mr-1.5" /> Full Name
                      </label>
                      {isEditing ? (
                        <input 
                          type="text"
                          value={editProfile.fullName}
                          onChange={(e) => setEditProfile({...editProfile, fullName: e.target.value})}
                          className="w-full bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all"
                        />
                      ) : (
                        <p className="text-base font-bold text-[#151a3c] py-1">{profile.fullName}</p>
                      )}
                    </div>

                    {/* Business Name */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest flex items-center">
                        <Briefcase size={12} className="mr-1.5" /> Business Name
                      </label>
                      {isEditing ? (
                        <input 
                          type="text"
                          value={editProfile.businessName}
                          onChange={(e) => setEditProfile({...editProfile, businessName: e.target.value})}
                          className="w-full bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all"
                        />
                      ) : (
                        <p className="text-base font-bold text-[#151a3c] py-1">{profile.businessName}</p>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest flex items-center">
                        <Phone size={12} className="mr-1.5" /> Phone Number
                      </label>
                      {isEditing ? (
                        <input 
                          type="text"
                          value={editProfile.phone}
                          onChange={(e) => setEditProfile({...editProfile, phone: e.target.value})}
                          className="w-full bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all"
                        />
                      ) : (
                        <p className="text-base font-bold text-[#151a3c] py-1">{profile.phone}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest flex items-center">
                        <Mail size={12} className="mr-1.5" /> Email Address
                      </label>
                      {isEditing ? (
                        <input 
                          type="email"
                          value={editProfile.email}
                          onChange={(e) => setEditProfile({...editProfile, email: e.target.value})}
                          className="w-full bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all"
                        />
                      ) : (
                        <p className="text-base font-bold text-[#151a3c] py-1">{profile.email}</p>
                      )}
                    </div>

                    {/* Business Address */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest flex items-center">
                        <MapPinIcon size={12} className="mr-1.5" /> Business Address
                      </label>
                      {isEditing ? (
                        <textarea 
                          rows={2}
                          value={editProfile.businessAddress}
                          onChange={(e) => setEditProfile({...editProfile, businessAddress: e.target.value})}
                          className="w-full bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all resize-none"
                        />
                      ) : (
                        <p className="text-base font-bold text-[#151a3c] py-1">{profile.businessAddress}</p>
                      )}
                    </div>

                    {/* GST Settings */}
                    <div className="md:col-span-2 bg-[#F8F9FA] rounded-2xl p-6 space-y-6 border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-[#151a3c]">GST Configuration</h4>
                          <p className="text-xs text-[#6c7e96] font-medium">Enable GST for your business invoices</p>
                        </div>
                        {isEditing ? (
                          <button 
                            onClick={() => setEditProfile({...editProfile, isGstEnabled: !editProfile.isGstEnabled})}
                            className={`w-12 h-6 rounded-full transition-all relative ${editProfile.isGstEnabled ? 'bg-[#6360DF]' : 'bg-slate-300'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editProfile.isGstEnabled ? 'right-1' : 'left-1'}`} />
                          </button>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${profile.isGstEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                            {profile.isGstEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        )}
                      </div>

                      {(isEditing ? editProfile.isGstEnabled : profile.isGstEnabled) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest">GST Type</label>
                            {isEditing ? (
                              <select 
                                value={editProfile.gstType}
                                onChange={(e) => setEditProfile({...editProfile, gstType: e.target.value})}
                                className="w-full bg-white border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all appearance-none"
                              >
                                <option value="Regular">Regular</option>
                                <option value="Composition">Composition</option>
                              </select>
                            ) : (
                              <p className="text-base font-bold text-[#151a3c]">{profile.gstType}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest">GST Number</label>
                            {isEditing ? (
                              <input 
                                type="text"
                                value={editProfile.gstNumber}
                                onChange={(e) => setEditProfile({...editProfile, gstNumber: e.target.value})}
                                className="w-full bg-white border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all"
                              />
                            ) : (
                              <p className="text-base font-bold text-[#151a3c]">{profile.gstNumber}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Locations */}
                    <div className="space-y-4 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-widest flex items-center">
                          <MapPinIcon size={12} className="mr-1.5" /> Service Locations
                        </label>
                        {isEditing && (
                          <div className="relative">
                            <select 
                              onChange={(e) => {
                                if (e.target.value && !editProfile.locations.includes(e.target.value)) {
                                  setEditProfile({...editProfile, locations: [...editProfile.locations, e.target.value]});
                                }
                                e.target.value = "";
                              }}
                              className="bg-[#EEEDFA] text-[#6360DF] text-[11px] font-bold px-3 py-1.5 rounded-lg outline-none cursor-pointer appearance-none pr-8"
                            >
                              <option value="">+ Add Location</option>
                              {goaLocations.filter(loc => !editProfile.locations.includes(loc)).map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                              ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6360DF] pointer-events-none" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(isEditing ? editProfile.locations : profile.locations).map((loc, i) => (
                          <div key={i} className="bg-[#EEEDFA] text-[#6360DF] px-4 py-1.5 rounded-full text-xs font-bold flex items-center group/loc">
                            {loc}
                            {isEditing && (
                              <button 
                                onClick={() => setEditProfile({...editProfile, locations: editProfile.locations.filter(l => l !== loc)})}
                                className="ml-2 text-[#6360DF]/40 hover:text-red-500 transition-colors"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-10 py-8 border-t border-slate-100 flex items-center justify-end space-x-4 shrink-0">
                  {isEditing ? (
                    <>
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-3 text-sm font-bold text-[#6c7e96] hover:text-[#151a3c] transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveProfile}
                        className="bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-[#6360df33] transition-all flex items-center space-x-2"
                      >
                        <Save size={18} />
                        <span>Save Changes</span>
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-[#6360df33] transition-all"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Dashboard Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'Dashboard' ? (
              <motion.div
                key="dashboard-view"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
                className="space-y-10"
              >
                {/* Welcome Section */}
                <div>
                  <h2 className="text-2xl font-extrabold text-[#151a3c] tracking-tight">Owner Dashboard</h2>
                  <p className="text-[#6c7e96] text-sm font-medium mt-1 opacity-80">Here's what's happening with your fleet today.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  <StatCard index={1} title="Total Earnings" value="$24,500" icon={<DollarSign />} color="bg-[#6360DF]" trend="+12.5% this month" trendIsPositive={true} />
                  <StatCard index={2} title="Active Bookings" value="18" icon={<Users />} color="bg-blue-500" trend="+4 new today" trendIsPositive={true} />
                  <StatCard index={3} title="Fleet Status" value="32/35" icon={<CarIcon />} color="bg-green-500" trend="92% utilization" trendIsPositive={true} />
                  <StatCard index={4} title="Avg. Rental Time" value="2.4 days" icon={<Clock />} color="bg-orange-500" trend="-10% from last week" trendIsPositive={false} />
                </div>

                {/* Fleet Status Card */}
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  className="bg-white rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-10 py-8">
                    <h3 className="text-lg font-extrabold text-[#151a3c]">Current Fleet Status</h3>
                    <button className="text-[#6360DF] font-bold text-sm hover:underline tracking-tight transition-all">View All Fleet</button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[#6c7e96] border-b border-slate-50 px-10">
                          <th className="pl-10 pb-4 text-xs font-bold uppercase tracking-widest opacity-60">Vehicle</th>
                          <th className="pb-4 text-xs font-bold uppercase tracking-widest opacity-60">Plate Number</th>
                          <th className="pb-4 text-xs font-bold uppercase tracking-widest opacity-60">Status</th>
                          <th className="pb-4 text-xs font-bold uppercase tracking-widest opacity-60">Earnings</th>
                          <th className="pr-10 pb-4 text-xs font-bold uppercase tracking-widest opacity-60"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {cars.map((car, idx) => (
                          <motion.tr 
                            key={car.id} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1 + idx * 0.1 }}
                            className="group hover:bg-[#f8f9fc]/50 transition-colors"
                          >
                            <td className="py-6 pl-10">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-slate-100/60 rounded-[14px] flex items-center justify-center group-hover:bg-white transition-colors">
                                  <CarIcon className="text-[#6360DF] w-6 h-6" />
                                </div>
                                <span className="font-bold text-[#151a3c] text-[15px]">{car.name}</span>
                              </div>
                            </td>
                            <td className="py-6 text-[#6c7e96] font-semibold text-[14px]">{car.plate}</td>
                            <td className="py-6">
                              <span className={`px-4 py-1.5 rounded-full text-[11px] font-extrabold tracking-wide ${car.statusColor}`}>
                                {car.status}
                              </span>
                            </td>
                            <td className="py-6 font-extrabold text-[#151a3c] text-[15px]">{car.earnings}</td>
                            <td className="py-6 pr-10 text-right">
                              <button className="p-2 text-[#cbd5e1] hover:text-[#6c7e96] hover:bg-white rounded-xl transition-all">
                                <MoreVertical className="w-5 h-5" />
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </motion.div>
            ) : activeTab === 'Fleet Listing' ? (
              <motion.div
                key="fleet-listing-view"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
              >
                <FleetListing />
              </motion.div>
            ) : activeTab === 'Bookings' ? (
              <motion.div
                key="bookings-view"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
              >
                <BookingsPage />
              </motion.div>
            ) : activeTab === 'Drivers' ? (
              <motion.div
                key="drivers-view"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
              >
                <DriversPage />
              </motion.div>
            ) : activeTab === 'Allocation' ? (
              <motion.div
                key="allocation-view"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
              >
                <AllocationPage />
              </motion.div>
            ) : activeTab === 'Reminders' ? (
              <motion.div
                key="reminders-view"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
              >
                <RemindersPage />
              </motion.div>
            ) : (
              <motion.div
                key="coming-soon-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col items-center justify-center text-center py-20"
              >
                <div className="w-20 h-20 bg-[#EEEDFA] rounded-3xl flex items-center justify-center mb-6 text-[#6360DF]">
                  {/* Added <any> cast to cloneElement to allow the 'size' prop */}
                  {sidebarItems.find(i => i.label === activeTab)?.icon && React.cloneElement(sidebarItems.find(i => i.label === activeTab)?.icon as React.ReactElement<any>, { size: 40 })}
                </div>
                <h2 className="text-3xl font-bold text-[#151a3c] mb-2">{activeTab}</h2>
                <p className="text-[#6c7e96] max-w-sm">
                  This feature is currently under development. Stay tuned for updates on your {activeTab.toLowerCase()}!
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Action Button (Mobile) */}
      <div className="fixed bottom-8 right-8 lg:hidden">
        <button 
          onClick={handleNewBooking}
          className="w-14 h-14 bg-[#6360DF] text-white rounded-2xl shadow-2xl shadow-[#6360df66] flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
