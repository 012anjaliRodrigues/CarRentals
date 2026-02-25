
import React, { useState } from 'react';
import { 
  Search, 
  Calendar, 
  MapPin, 
  User,
  Car,
  Clock,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AllocationDetail from './AllocationDetail';

interface Allocation {
  id: number;
  driverName: string;
  vehicle: string;
  vehicleNo: string;
  vehicleType: string;
  fuel: string;
  transmission: string;
  type: 'Drop' | 'Pick';
  location: string;
  dateTime: string;
  isAllocated: boolean;
}

const AllocationPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedAllocation, setSelectedAllocation] = useState<Allocation | null>(null);

  const [allocationData, setAllocationData] = useState<Allocation[]>([
    {
      id: 1,
      driverName: "Suresh Kumar",
      vehicle: "Maruti Swift",
      vehicleNo: "GA-03-X-1234",
      vehicleType: "Hatchback",
      fuel: "Petrol",
      transmission: "Manual",
      type: "Pick",
      location: "Panjim Airport",
      dateTime: "24 Oct, 10:30 AM",
      isAllocated: true
    },
    {
      id: 2,
      driverName: "Ramesh Sawant",
      vehicle: "Toyota Innova",
      vehicleNo: "GA-01-A-5678",
      vehicleType: "SUV",
      fuel: "Diesel",
      transmission: "Automatic",
      type: "Drop",
      location: "Calangute Beach",
      dateTime: "24 Oct, 02:00 PM",
      isAllocated: false
    },
    {
      id: 3,
      driverName: "Amit Naik",
      vehicle: "Hyundai i20",
      vehicleNo: "GA-02-B-9012",
      vehicleType: "Hatchback",
      fuel: "Petrol",
      transmission: "Manual",
      type: "Pick",
      location: "Mapusa Bus Stand",
      dateTime: "25 Oct, 09:00 AM",
      isAllocated: true
    }
  ]);

  const handleAllocateClick = (item: Allocation) => {
    setSelectedAllocation(item);
    setView('detail');
  };

  const handleSaveAllocation = (updatedData: { vehicleNo: string; driverName: string }) => {
    if (!selectedAllocation) return;

    setAllocationData(prev => prev.map(item => 
      item.id === selectedAllocation.id 
        ? { ...item, ...updatedData, isAllocated: true } 
        : item
    ));
    setView('list');
    setSelectedAllocation(null);
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
            className="space-y-6 pb-10"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-[24px] font-extrabold text-[#151a3c] tracking-tight">Vehicle Allocation</h2>
                <p className="text-[#6c7e96] text-sm font-medium mt-1 opacity-80">Assign drivers to vehicles for upcoming trips</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative group min-w-[200px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cbd5e1] w-4 h-4 group-focus-within:text-[#6360DF] transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search driver or vehicle..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-[#d1d0eb] rounded-full py-2.5 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all"
                  />
                </div>

                <div className="flex items-center space-x-2 bg-white px-4 py-2.5 rounded-xl border border-[#d1d0eb] text-sm font-semibold text-[#151a3c]">
                  <Calendar size={16} className="text-[#6c7e96]" />
                  <span>Today, 24 Oct</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#F8F9FA]/50 text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/20">
                      <th className="pl-10 py-5 font-bold">Date & Time</th>
                      <th className="px-6 py-5 font-bold">Vehicle</th>
                      <th className="px-6 py-5 font-bold">Vehicle Type</th>
                      <th className="px-6 py-5 font-bold">Fuel</th>
                      <th className="px-6 py-5 font-bold">Transmission</th>
                      <th className="px-6 py-5 font-bold">Type</th>
                      <th className="px-6 py-5 font-bold">Driver Name</th>
                      <th className="px-6 py-5 font-bold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d1d0eb]/20">
                    {allocationData.map((item, idx) => (
                      <tr 
                        key={idx} 
                        className="group hover:bg-[#F8F9FA] transition-colors"
                      >
                        <td className="py-5 pl-10 whitespace-nowrap">
                          <div className="flex items-center space-x-2 text-[#151a3c] text-sm font-medium">
                            <Clock size={14} className="text-[#6c7e96]" />
                            <span>{item.dateTime}</span>
                          </div>
                        </td>
                        <td className="py-5 px-6 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-2 text-[#151a3c] text-sm font-bold">
                              <Car size={14} className="text-[#6360DF]" />
                              <span>{item.vehicle}</span>
                            </div>
                            <span className="text-[11px] text-[#6c7e96] font-medium ml-5">{item.vehicleNo}</span>
                          </div>
                        </td>
                        <td className="py-5 px-6 whitespace-nowrap">
                          <span className="bg-[#f1f5f9] px-2.5 py-1 rounded-md text-[11px] font-bold text-[#151a3c]">
                            {item.vehicleType}
                          </span>
                        </td>
                        <td className="py-5 px-6 whitespace-nowrap text-sm font-medium text-[#6c7e96]">
                          {item.fuel}
                        </td>
                        <td className="py-5 px-6 whitespace-nowrap text-sm font-medium text-[#6c7e96]">
                          {item.transmission}
                        </td>
                        <td className="py-5 px-6 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest ${
                            item.type === 'Pick' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                          }`}>
                            {item.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-5 px-6 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-[#EEEDFA] flex items-center justify-center text-[#6360DF]">
                              <User size={14} />
                            </div>
                            <span className="font-bold text-[#151a3c] text-sm group-hover:text-[#6360DF] transition-colors">{item.driverName}</span>
                          </div>
                        </td>
                        <td className="py-5 px-6 whitespace-nowrap">
                          <div className="flex items-center justify-center">
                            {item.isAllocated ? (
                              <button 
                                onClick={() => handleAllocateClick(item)}
                                className="flex items-center space-x-1.5 bg-[#EEEDFA] text-[#6360DF] px-4 py-2 rounded-lg text-[11px] font-bold hover:bg-[#6360DF] hover:text-white transition-all"
                              >
                                <RefreshCw size={12} />
                                <span>ReAllocate</span>
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleAllocateClick(item)}
                                className="flex items-center space-x-1.5 bg-[#6360DF] text-white px-4 py-2 rounded-lg text-[11px] font-bold hover:bg-[#5451d0] transition-all"
                              >
                                <CheckCircle2 size={12} />
                                <span>Allocate</span>
                              </button>
                            )}
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
          selectedAllocation && (
            <AllocationDetail 
              allocation={selectedAllocation}
              onBack={() => setView('list')}
              onSave={handleSaveAllocation}
            />
          )
        )}
      </AnimatePresence>
    </div>
  );
};

export default AllocationPage;
