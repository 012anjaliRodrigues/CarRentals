
import React, { useState } from 'react';
import { 
  Search, 
  UserPlus, 
  Eye, 
  Pencil, 
  Trash2, 
  ChevronDown 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AddDriver from './AddDriver';

interface Driver {
  id: number;
  name: string;
  initials: string;
  avatarColor: string;
  avatarTextColor: string;
  location: string;
  phone: string;
  licenseNo: string;
  tripsCompleted: number;
  tripsTotal: number;
  status: 'COMPLETED' | 'NOT COMPLETED';
}

const DriversPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [view, setView] = useState<'list' | 'add'>('list');

  const [driversData, setDriversData] = useState<Driver[]>([
    {
      id: 1,
      name: "Rajesh Kumar",
      initials: "RK",
      avatarColor: "#D1FAE5",
      avatarTextColor: "#059669",
      location: "Panjim",
      phone: "+91 98765 43210",
      licenseNo: "DL-1234567890123",
      tripsCompleted: 3,
      tripsTotal: 7,
      status: "COMPLETED"
    },
    {
      id: 2,
      name: "Amit Singh",
      initials: "AS",
      avatarColor: "#EEEDFA",
      avatarTextColor: "#6360DF",
      location: "Margao",
      phone: "+91 88776 55443",
      licenseNo: "DL-9876543210987",
      tripsCompleted: 6,
      tripsTotal: 10,
      status: "NOT COMPLETED"
    },
    {
      id: 3,
      name: "Vikram Patil",
      initials: "VP",
      avatarColor: "#EEEDFA",
      avatarTextColor: "#6360DF",
      location: "Porvorim",
      phone: "+91 77665 44321",
      licenseNo: "DL-5544332211009",
      tripsCompleted: 8,
      tripsTotal: 10,
      status: "COMPLETED"
    },
    {
      id: 4,
      name: "Suresh Mehra",
      initials: "SM",
      avatarColor: "#F3F4F6",
      avatarTextColor: "#6c7e96",
      location: "Miramar",
      phone: "+91 91122 33445",
      licenseNo: "DL-1122334455667",
      tripsCompleted: 2,
      tripsTotal: 5,
      status: "NOT COMPLETED"
    },
    {
      id: 5,
      name: "Sunil Jha",
      initials: "SJ",
      avatarColor: "#D1FAE5",
      avatarTextColor: "#059669",
      location: "Mapusa",
      phone: "+91 90088 11223",
      licenseNo: "DL-9988776655443",
      tripsCompleted: 2,
      tripsTotal: 5,
      status: "COMPLETED"
    }
  ]);

  const handleSaveDriver = (newDriver: { name: string; phone: string; licenseNo: string }) => {
    const initials = newDriver.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const driver: Driver = {
      id: Date.now(),
      name: newDriver.name,
      initials,
      avatarColor: "#EEEDFA",
      avatarTextColor: "#6360DF",
      location: "Not Assigned",
      phone: `+91 ${newDriver.phone}`,
      licenseNo: newDriver.licenseNo,
      tripsCompleted: 0,
      tripsTotal: 0,
      status: "NOT COMPLETED"
    };
    setDriversData(prev => [driver, ...prev]);
    setView('list');
  };

  return (
    <div className="min-h-full">
      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-[24px] font-extrabold text-[#151a3c] tracking-tight">Drivers</h2>
                <p className="text-[#6c7e96] text-sm font-medium mt-1">Manage your fleet of drivers and their assignments</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative group w-[300px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cbd5e1] w-4 h-4 group-focus-within:text-[#6360DF] transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search drivers..."
                    className="w-full bg-white border border-[#d1d0eb] rounded-full py-2.5 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <button 
                  onClick={() => setView('add')}
                  className="bg-[#6360DF] hover:bg-[#5451d0] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-[#6360df33] transition-all flex items-center space-x-2"
                >
                  <UserPlus size={18} />
                  <span>Add Driver</span>
                </button>
              </div>
            </div>

            {/* Filter Section */}
            <div className="flex items-center space-x-3">
              <span className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase">Filter By:</span>
              <div className="relative">
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="appearance-none bg-white border border-[#d1d0eb] rounded-full py-2 px-5 pr-10 text-xs font-bold text-[#151a3c] outline-none cursor-pointer focus:ring-2 focus:ring-[#6360DF]/10 transition-all"
                >
                  <option>All</option>
                  <option>Completed</option>
                  <option>Not Completed</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none w-3 h-3" />
              </div>
            </div>

            {/* Drivers Table Card */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#F8F9FA]/50 text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/20">
                      <th className="pl-10 py-5 font-bold">Driver Name</th>
                      <th className="px-6 py-5 font-bold">Current Location</th>
                      <th className="px-6 py-5 font-bold">Phone</th>
                      <th className="px-6 py-5 font-bold text-center">No. of Trips</th>
                      <th className="px-6 py-5 font-bold">Status</th>
                      <th className="px-10 py-5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d1d0eb]/10">
                    {driversData.filter(d => {
                      if (filterStatus === 'All') return true;
                      return d.status === filterStatus.toUpperCase();
                    }).filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase())).map((driver) => (
                      <tr key={driver.id} className="group hover:bg-[#F8F9FA] transition-colors">
                        <td className="py-5 pl-10 whitespace-nowrap">
                          <div className="flex items-center">
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-extrabold"
                              style={{ backgroundColor: driver.avatarColor, color: driver.avatarTextColor }}
                            >
                              {driver.initials}
                            </div>
                            <span className="ml-3 font-bold text-[#151a3c] text-sm">{driver.name}</span>
                          </div>
                        </td>
                        <td className="py-5 px-6 text-sm font-medium text-[#151a3c] whitespace-nowrap">
                          {driver.location}
                        </td>
                        <td className="py-5 px-6 text-sm font-medium text-[#151a3c] whitespace-nowrap">
                          {driver.phone}
                        </td>
                        <td className="py-5 px-6 text-center text-sm font-medium text-[#151a3c]">
                          {driver.tripsCompleted}/{driver.tripsTotal}
                        </td>
                        <td className="py-5 px-6">
                          <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-extrabold tracking-widest ${
                            driver.status === 'COMPLETED' ? 'bg-[#D1FAE5] text-[#059669]' : 'bg-[#FEF3C7] text-[#D97706]'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                              driver.status === 'COMPLETED' ? 'bg-[#059669]' : 'bg-[#D97706]'
                            }`} />
                            {driver.status}
                          </div>
                        </td>
                        <td className="py-5 px-10 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-3">
                            <button className="text-[#6c7e96] hover:text-[#6360DF] transition-colors"><Eye size={18} /></button>
                            <button className="text-[#6c7e96] hover:text-[#6360DF] transition-colors"><Pencil size={18} /></button>
                            <button className="text-[#6c7e96] hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <AddDriver 
            onSave={handleSaveDriver}
            onCancel={() => setView('list')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DriversPage;
