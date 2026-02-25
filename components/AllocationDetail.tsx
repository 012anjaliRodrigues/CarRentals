
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Car, 
  MapPin, 
  User, 
  ChevronDown,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';

interface AllocationDetailProps {
  allocation: {
    id: number;
    driverName: string;
    vehicle: string;
    vehicleNo: string;
    vehicleType: string;
    type: 'Drop' | 'Pick';
    location: string;
    dateTime: string;
  };
  onBack: () => void;
  onSave: (updatedData: { vehicleNo: string; driverName: string }) => void;
}

const AllocationDetail: React.FC<AllocationDetailProps> = ({ allocation, onBack, onSave }) => {
  const [selectedVehicleNo, setSelectedVehicleNo] = useState(allocation.vehicleNo);
  const [selectedDriver, setSelectedDriver] = useState(allocation.driverName);

  const handleSave = () => {
    onSave({
      vehicleNo: selectedVehicleNo,
      driverName: selectedDriver
    });
  };

  const vehicleOptions = [
    "GA-03-X-1234",
    "GA-01-A-5678",
    "GA-02-B-9012",
    "GA-04-C-3456",
    "GA-05-D-7890"
  ];

  const driverOptions = [
    "Suresh Kumar",
    "Ramesh Sawant",
    "Amit Naik",
    "Priya Deshmukh",
    "Rajesh Gonsalves"
  ];

  return (
    <div className="min-h-full">
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-8 pb-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-[#EEEDFA] rounded-full text-[#6360DF] transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-baseline space-x-4">
              <h2 className="text-[32px] font-extrabold text-[#151a3c] tracking-tight">
                {allocation.type}
              </h2>
              <span className="px-4 py-1.5 bg-[#EEEDFA] text-[#6360DF] text-[11px] font-extrabold uppercase tracking-widest rounded-full">
                Pending Confirmation
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={onBack}
              className="px-6 py-3 rounded-xl text-sm font-bold text-[#6c7e96] hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="bg-[#6360DF] hover:bg-[#5451d0] text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-[#6360df33] transition-all flex items-center space-x-2"
            >
              <CheckCircle2 size={18} />
              <span>Save Allocation</span>
            </button>
          </div>
        </div>

        {/* Allocation Card */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden p-8 md:p-10">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/20">
                  <th className="pb-6 font-bold">Date</th>
                  <th className="pb-6 font-bold">vehicle</th>
                  <th className="pb-6 font-bold">Vehicle No.</th>
                  <th className="pb-6 font-bold">Location</th>
                  <th className="pb-6 font-bold">Driver</th>
                </tr>
              </thead>
              <tbody>
                <tr className="group">
                  <td className="py-8 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#EEEDFA] flex items-center justify-center text-[#6360DF]">
                        <Calendar size={18} />
                      </div>
                      <span className="font-bold text-[#151a3c] text-base">{allocation.dateTime}</span>
                    </div>
                  </td>
                  <td className="py-8 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#EEEDFA] flex items-center justify-center text-[#6360DF]">
                        <Car size={18} />
                      </div>
                      <span className="font-bold text-[#151a3c] text-base">{allocation.vehicle}</span>
                    </div>
                  </td>
                  <td className="py-8 whitespace-nowrap">
                    {allocation.type === 'Drop' ? (
                      <div className="relative min-w-[180px]">
                        <select 
                          value={selectedVehicleNo}
                          onChange={(e) => setSelectedVehicleNo(e.target.value)}
                          className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all appearance-none pr-10"
                        >
                          {vehicleOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none w-4 h-4" />
                      </div>
                    ) : (
                      <div className="bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-5 text-sm font-bold text-[#151a3c] min-w-[160px]">
                        {allocation.vehicleNo}
                      </div>
                    )}
                  </td>
                  <td className="py-8 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#EEEDFA] flex items-center justify-center text-[#6360DF]">
                        <MapPin size={18} />
                      </div>
                      <span className="font-bold text-[#151a3c] text-base">{allocation.location}</span>
                    </div>
                  </td>
                  <td className="py-8 whitespace-nowrap">
                    <div className="relative min-w-[200px]">
                      <select 
                        value={selectedDriver}
                        onChange={(e) => setSelectedDriver(e.target.value)}
                        className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all appearance-none pr-10"
                      >
                        {driverOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none w-4 h-4" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AllocationDetail;
