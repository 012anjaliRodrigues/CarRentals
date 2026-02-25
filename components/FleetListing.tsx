
import React, { useState } from 'react';
import { 
  Calendar, 
  Plus, 
  Eye, 
  Car as CarIcon,
  ChevronRight,
  ArrowLeft,
  Edit,
  Trash2,
  Bell,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AddNewVehicle from './AddNewVehicle';
import VehicleProfile from './VehicleProfile';

interface VehicleDetail {
  plate: string;
  status: 'In use' | 'Available' | 'Maintenance';
  booking?: {
    customer: string;
    duration: string;
  };
}

const VehicleDetailView: React.FC<{ 
  vehicle: any; 
  category: string; 
  onBack: () => void;
  onAdd: () => void;
  onPlateClick: (plate: string, status: 'In use' | 'Available' | 'Maintenance') => void;
}> = ({ vehicle, category, onBack, onAdd, onPlateClick }) => {
  const details: VehicleDetail[] = [
    { plate: 'GA-01-AB-1234', status: 'In use', booking: { customer: 'Mr. Kamat', duration: 'Oct 24, 10:00 AM - Oct 27, 10:00 AM' } },
    { plate: 'GA-03-XY-5678', status: 'Available' },
    { plate: 'GA-01-TH-9900', status: 'Maintenance' },
    { plate: 'GA-05-IH-4321', status: 'In use', booking: { customer: 'Ms. Priya', duration: 'Oct 25, 02:00 PM - Oct 26, 02:00 PM' } },
    { plate: 'GA-01-EV-2023', status: 'Available' },
    { plate: 'GA-07-CN-8877', status: 'In use', booking: { customer: 'Mr. Rohan', duration: 'Oct 23, 08:00 AM - Oct 28, 08:00 AM' } },
    { plate: 'GA-01-KS-1122', status: 'Maintenance' },
    { plate: 'GA-03-HC-5544', status: 'Available' },
    { plate: 'GA-01-RK-1234', status: 'In use', booking: { customer: 'Mr. Gupta', duration: 'Oct 26, 11:00 AM - Oct 30, 04:00 PM' } },
  ];

  const totalVehicles = details.length;
  const availableVehicles = details.filter(d => d.status === 'Available').length;

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'In use': return 'bg-[#DBEAFE] text-[#1E40AF]';
      case 'Available': return 'bg-[#D1FAE5] text-[#065F46]';
      case 'Maintenance': return 'bg-[#FEF3C7] text-[#92400E]';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Detail Header Actions */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center space-x-2 text-[#151a3c] hover:text-[#6360DF] transition-colors font-bold group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-lg">Fleet Listing</span>
        </button>
        <div className="flex items-center space-x-3">
          <button 
            onClick={onAdd}
            className="bg-[#6360DF] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-[#6360df33] hover:bg-[#5451d0] transition-all flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>New Vehicle</span>
          </button>
          <button className="bg-white border border-[#d1d0eb] text-[#6360DF] px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">
            Tariff
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-[#6360DF] rounded-2xl p-6 text-white flex items-center space-x-8 shadow-xl shadow-[#6360df22]">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">Category</span>
          <span className="font-bold text-sm">{category}</span>
        </div>
        <div className="w-px h-10 bg-white/20" />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">Model</span>
          <span className="font-bold text-sm">{vehicle.name}</span>
        </div>
        <div className="w-px h-10 bg-white/20" />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">Transmission</span>
          <span className="font-bold text-sm">{vehicle.transmission}</span>
        </div>
        <div className="w-px h-10 bg-white/20" />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">Fuel</span>
          <span className="font-bold text-sm">{vehicle.fuel}</span>
        </div>
        <div className="w-px h-10 bg-white/20" />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">Available</span>
          <span className="font-bold text-sm">{availableVehicles}/{totalVehicles}</span>
        </div>
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
        <div className="grid grid-cols-12 px-10 py-5 text-[11px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/30 bg-[#F9F9FF]/50">
          <div className="col-span-3">Vehicle No.</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-5">Current Booking & Duration</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        <div className="divide-y divide-slate-50">
          {details.map((detail, idx) => (
            <div key={detail.plate} className="grid grid-cols-12 px-10 py-5 items-center hover:bg-[#f8f9fc]/50 transition-colors">
              <div 
                onClick={() => onPlateClick(detail.plate, detail.status)}
                className="col-span-3 font-bold text-[#151a3c] text-[15px] hover:text-[#6360DF] cursor-pointer transition-colors"
              >
                {detail.plate}
              </div>
              <div className="col-span-2">
                <span className={`px-4 py-1.5 rounded-full text-[11px] font-extrabold tracking-wide ${getStatusStyles(detail.status)}`}>
                  {detail.status}
                </span>
              </div>
              <div className="col-span-5">
                {detail.booking ? (
                  <div className="flex flex-col">
                    <span className="font-bold text-[#151a3c] text-[14px]">{detail.booking.customer}</span>
                    <span className="text-[#6c7e96] text-[12px] font-medium">{detail.booking.duration}</span>
                  </div>
                ) : (
                  <span className="text-[#6c7e96] text-[13px] font-medium italic">No active booking</span>
                )}
              </div>
              <div className="col-span-2 flex items-center justify-end space-x-2">
                {detail.status === 'Available' && (
                  <button className="flex items-center space-x-1.5 bg-[#6360DF] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-[#5451d0] transition-all mr-2">
                    <Plus size={14} />
                    <span>Booking</span>
                  </button>
                )}
                <button className="p-2 text-[#cbd5e1] hover:text-[#6360DF] transition-colors"><Edit size={16} /></button>
                <button className="p-2 text-[#cbd5e1] hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                <button className="p-2 text-[#cbd5e1] hover:text-orange-500 transition-colors relative">
                  <Bell size={16} />
                  {idx % 3 === 0 && <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const FleetListing: React.FC = () => {
  const [view, setView] = useState<'list' | 'detail' | 'add' | 'profile'>('list');
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [selectedPlate, setSelectedPlate] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<'In use' | 'Available' | 'Maintenance'>('Available');
  const [category, setCategory] = useState<string>('');

  const [hatchbackData, setHatchbackData] = useState([
    { name: 'Maruti Suzuki Swift', transmission: 'Manual', fuel: 'Petrol', rate: '₹1,200', availability: '5/8', mfgYear: '2022', color: 'WHITE', type: 'HATCHBACK' },
    { name: 'Maruti Suzuki Swift', transmission: 'Automatic', fuel: 'Petrol', rate: '₹1,500', availability: '3/6', mfgYear: '2023', color: 'RED', type: 'HATCHBACK' },
    { name: 'Maruti Suzuki Baleno', transmission: 'Automatic', fuel: 'Petrol', rate: '₹1,700', availability: '4/4', mfgYear: '2023', color: 'BLUE', type: 'HATCHBACK' },
    { name: 'Hyundai i20', transmission: 'Automatic', fuel: 'Petrol', rate: '₹1,800', availability: '2/5', mfgYear: '2022', color: 'GRAY', type: 'HATCHBACK' },
  ]);

  const [sedanData, setSedanData] = useState([
    { name: 'Maruti Suzuki Dzire', transmission: 'Manual', fuel: 'Petrol', rate: '₹1,500', availability: '7/10', mfgYear: '2022', color: 'SILVER', type: 'SEDAN' },
    { name: 'Maruti Suzuki Dzire', transmission: 'Automatic', fuel: 'Petrol', rate: '₹1,800', availability: '2/4', mfgYear: '2023', color: 'BLACK', type: 'SEDAN' },
    { name: 'Hyundai Verna', transmission: 'Manual', fuel: 'Petrol', rate: '₹2,000', availability: '3/5', mfgYear: '2023', color: 'WHITE', type: 'SEDAN' },
    { name: 'Hyundai Verna', transmission: 'Automatic', fuel: 'Petrol', rate: '₹2,500', availability: '1/2', mfgYear: '2024', color: 'BROWN', type: 'SEDAN' },
  ]);

  const TableHeader: React.FC = () => (
    <div className="grid grid-cols-12 px-10 py-5 text-[11px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/30">
      <div className="col-span-4">Model Name</div>
      <div className="col-span-2">Transmission</div>
      <div className="col-span-2">Fuel Type</div>
      <div className="col-span-2">Availability</div>
      <div className="col-span-1 text-right pr-4">Rate</div>
      <div className="col-span-1 text-right">Action</div>
    </div>
  );

  const CategoryHeader: React.FC<{ name: string }> = ({ name }) => (
    <div className="px-10 py-4 bg-[#F9F9FF] flex items-center space-x-2 border-b border-[#d1d0eb]/20">
      <CarIcon size={14} className="text-[#6360DF]" />
      <span className="text-[11px] font-extrabold text-[#6360DF] tracking-widest uppercase">{name}</span>
    </div>
  );

  const VehicleRow: React.FC<{ item: any; cat: string }> = ({ item, cat }) => (
    <div 
      onClick={() => {
        setSelectedVehicle(item);
        setCategory(cat);
        setView('detail');
      }}
      className="grid grid-cols-12 px-10 py-6 border-b border-[#d1d0eb]/10 items-center hover:bg-[#F8F9FA] transition-colors group cursor-pointer"
    >
      <div className="col-span-4 flex items-center space-x-3">
        <CarIcon size={16} className="text-[#6360DF] opacity-40 group-hover:opacity-100 transition-opacity" />
        <span className="font-bold text-[#151a3c] text-[15px] group-hover:text-[#6360DF] transition-colors">{item.name}</span>
      </div>
      <div className="col-span-2 text-[#6c7e96] text-[14px] font-medium">{item.transmission}</div>
      <div className="col-span-2 text-[#6c7e96] text-[14px] font-medium">{item.fuel}</div>
      <div className="col-span-2">
        <span className="font-bold text-[#151a3c] text-[14px]">{item.availability}</span>
      </div>
      <div className="col-span-1 text-right font-extrabold text-[#151a3c] text-[15px] pr-4">{item.rate}</div>
      <div className="col-span-1 flex justify-end">
        <button className="p-2 text-[#6360DF] hover:bg-[#EEEDFA] rounded-full transition-all">
          <Eye size={18} />
        </button>
      </div>
    </div>
  );

  const handleSaveVehicle = (newVehicle: any) => {
    const formatted = {
      name: `${newVehicle.brand} ${newVehicle.model}`,
      transmission: newVehicle.transmission,
      fuel: newVehicle.fuelType,
      rate: '₹1,500',
      availability: '0/1',
      mfgYear: newVehicle.mfgYear,
      color: newVehicle.color,
      type: newVehicle.type.toUpperCase()
    };

    if (newVehicle.type === 'Hatchback') {
      setHatchbackData(prev => [formatted, ...prev]);
    } else {
      setSedanData(prev => [formatted, ...prev]);
    }
    setView('list');
  };

  const openProfile = (plate: string, status: 'In use' | 'Available' | 'Maintenance') => {
    setSelectedPlate(plate);
    setSelectedStatus(status);
    setView('profile');
  };

  return (
    <div className="min-h-full">
      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-[24px] font-extrabold text-[#151a3c] tracking-tight">Fleet Listing</h2>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-white px-5 py-2.5 rounded-xl border border-[#d1d0eb] shadow-sm text-sm font-semibold text-[#151a3c]">
                  <Calendar size={18} className="text-[#6c7e96]" />
                  <span>Oct 24, 2023</span>
                </div>
                
                <button onClick={() => console.log('View Tariff')} className="bg-[#6360DF] hover:bg-[#5451d0] text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#6360df22] transition-all">
                  Tariff
                </button>
                
                <button onClick={() => setView('add')} className="bg-[#6360DF] hover:bg-[#5451d0] text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#6360df22] transition-all flex items-center space-x-2">
                  <Plus size={18} />
                  <span>New Vehicle</span>
                </button>
              </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden mb-12">
              <TableHeader />
              
              <CategoryHeader name="HATCHBACKS" />
              {hatchbackData.map((item, idx) => (
                <VehicleRow key={`hatch-${idx}`} item={item} cat="HATCHBACKS" />
              ))}
              
              <CategoryHeader name="SEDANS" />
              {sedanData.map((item, idx) => (
                <VehicleRow key={`sedan-${idx}`} item={item} cat="SEDANS" />
              ))}
            </div>
          </motion.div>
        )}

        {view === 'detail' && selectedVehicle && (
          <VehicleDetailView 
            key="detail"
            vehicle={selectedVehicle} 
            category={category} 
            onBack={() => setView('list')}
            onAdd={() => setView('add')}
            onPlateClick={openProfile}
          />
        )}

        {view === 'profile' && selectedVehicle && (
          <VehicleProfile 
            key="profile"
            vehicle={selectedVehicle}
            instancePlate={selectedPlate}
            status={selectedStatus}
            onBack={() => setView('detail')}
          />
        )}

        {view === 'add' && (
          <AddNewVehicle 
            key="add"
            onSave={handleSaveVehicle}
            onCancel={() => setView('list')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FleetListing;
