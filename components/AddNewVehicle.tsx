
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Car as CarIcon, 
  Bell, 
  Save, 
  ArrowLeft, 
  ChevronDown,
  Calendar,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AddNewVehicleProps {
  onSave: (vehicle: any) => void;
  onCancel: () => void;
}

const CustomSelect: React.FC<{
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
}> = ({ label, options, value, onChange, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col space-y-2 relative" ref={containerRef}>
      <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">
        {label} {required && <span className="text-[#EF4444]">*</span>}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3.5 px-4 flex items-center justify-between text-[#151a3c] font-medium transition-all focus:ring-2 focus:ring-[#6360DF]/10 outline-none"
      >
        <span>{value}</span>
        <ChevronDown size={18} className={`text-[#6c7e96] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-[#d1d0eb] rounded-xl shadow-xl overflow-hidden py-1"
          >
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between ${
                  value === opt 
                    ? 'bg-[#6360DF] text-white' 
                    : 'text-[#151a3c] hover:bg-[#EEEDFA]'
                }`}
              >
                <span>{opt}</span>
                {value === opt && <Check size={14} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AddNewVehicle: React.FC<AddNewVehicleProps> = ({ onSave, onCancel }) => {
  const currentYear = new Date().getFullYear().toString();
  const todayDate = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    type: 'Hatchback',
    brand: 'Maruti Suzuki',
    model: 'Swift',
    transmission: 'Manual',
    fuelType: 'Petrol',
    color: 'White',
    vehicleNo: '',
    mfgYear: '2023',
    permitValidity: '',
    insuranceRenewal: '',
    pucExpiry: '',
    nextOilChange: ''
  });

  const brandModels: Record<string, string[]> = {
    'Maruti Suzuki': ['Swift', 'Baleno', 'Dzire', 'Ertiga', 'Brezza', 'Alto'],
    'Hyundai': ['i20', 'Verna', 'Creta', 'Venue'],
    'Honda': ['Amaze', 'City', 'WR-V'],
    'Toyota': ['Innova', 'Fortuner', 'Glanza'],
    'Mahindra': ['XUV700', 'Scorpio', 'Bolero'],
    'Tata': ['Nexon', 'Harrier', 'Punch']
  };

  const types = ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury'];
  const transmissions = ['Manual', 'Automatic', 'AMT', 'CVT'];
  const fuels = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];
  const colors = ['White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Brown'];

  const currentModels = useMemo(() => brandModels[formData.brand] || [], [formData.brand]);

  const isFormValid = useMemo(() => {
    return (
      formData.vehicleNo.trim().length > 0 &&
      formData.permitValidity !== '' &&
      formData.mfgYear !== '' &&
      parseInt(formData.mfgYear) <= parseInt(currentYear)
    );
  }, [formData, currentYear]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'brand') {
      setFormData(prev => ({
        ...prev,
        brand: value,
        model: brandModels[value][0]
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
      onSave(formData);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-[800px] mx-auto pb-20"
    >
      <div className="flex items-center space-x-4 mb-8">
        <button 
          onClick={() => {
            if (formData.vehicleNo ? confirm('Discard changes?') : true) onCancel();
          }}
          className="p-2 hover:bg-[#EEEDFA] rounded-lg text-[#6c7e96] hover:text-[#6360DF] transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-[20px] font-extrabold text-[#151a3c] tracking-tight">Add New Vehicle</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
        <div className="p-8 md:p-10">
          <div className="flex items-center space-x-3 mb-8">
            <div className="p-2 bg-[#6360DF]/10 rounded-lg text-[#6360DF]">
              <CarIcon size={18} />
            </div>
            <h3 className="font-bold text-[#151a3c] text-lg">Vehicle Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <CustomSelect 
              label="Type" 
              options={types} 
              value={formData.type} 
              onChange={(v) => handleSelectChange('type', v)} 
              required 
            />
            <CustomSelect 
              label="Brand" 
              options={Object.keys(brandModels)} 
              value={formData.brand} 
              onChange={(v) => handleSelectChange('brand', v)} 
              required 
            />
            <CustomSelect 
              label="Model" 
              options={currentModels} 
              value={formData.model} 
              onChange={(v) => handleSelectChange('model', v)} 
              required 
            />
            <CustomSelect 
              label="Transmission" 
              options={transmissions} 
              value={formData.transmission} 
              onChange={(v) => handleSelectChange('transmission', v)} 
              required 
            />
            <CustomSelect 
              label="Fuel Type" 
              options={fuels} 
              value={formData.fuelType} 
              onChange={(v) => handleSelectChange('fuelType', v)} 
              required 
            />
            <CustomSelect 
              label="Color" 
              options={colors} 
              value={formData.color} 
              onChange={(v) => handleSelectChange('color', v)} 
              required 
            />

            <div className="flex flex-col space-y-2">
              <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">
                Vehicle No. <span className="text-[#EF4444]">*</span>
              </label>
              <input 
                type="text" 
                name="vehicleNo" 
                value={formData.vehicleNo} 
                onChange={(e) => setFormData(p => ({ ...p, vehicleNo: e.target.value.toUpperCase() }))}
                placeholder="e.g. GA 12 AA 1123"
                className="w-full bg-[#EEEDFA] border border-[#d1d0eb] rounded-xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] text-[#151a3c] font-bold placeholder:text-[#6c7e96]/40"
              />
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">
                Manufacturing Year <span className="text-[#EF4444]">*</span>
              </label>
              <input 
                type="number" 
                name="mfgYear" 
                value={formData.mfgYear} 
                onChange={handleChange}
                max={currentYear}
                placeholder="2023"
                className="w-full bg-[#EEEDFA] border border-[#d1d0eb] rounded-xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] text-[#151a3c] font-bold"
              />
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">
                Permit Validity <span className="text-[#EF4444]">*</span>
              </label>
              <div className="relative">
                <input 
                  type="date" 
                  name="permitValidity" 
                  min={todayDate}
                  value={formData.permitValidity} 
                  onChange={handleChange}
                  className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3.5 px-4 pr-12 outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] text-[#151a3c] font-medium"
                />
                <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="mt-12 pt-10 border-t border-[#d1d0eb]/30">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-2 bg-[#6360DF]/10 rounded-lg text-[#6360DF]">
                <Bell size={18} />
              </div>
              <h3 className="font-bold text-[#151a3c] text-lg">Set Reminders</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Insurance Renewal', name: 'insuranceRenewal' },
                { label: 'Pollution (PUC) Expiry', name: 'pucExpiry' },
                { label: 'Next Oil Change', name: 'nextOilChange' }
              ].map((rem) => (
                <div key={rem.name} className="flex flex-col space-y-2">
                  <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">{rem.label}</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      name={rem.name}
                      min={todayDate}
                      value={(formData as any)[rem.name]} 
                      onChange={handleChange}
                      className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3.5 px-4 pr-12 outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] text-[#151a3c] font-medium"
                    />
                    <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#f8fafc] px-8 py-6 flex items-center justify-end space-x-6 border-t border-[#d1d0eb]/30">
          <button 
            type="button"
            onClick={() => {
              if (formData.vehicleNo ? confirm('Discard changes?') : true) onCancel();
            }}
            className="text-[#6c7e96] font-bold text-sm hover:text-[#151a3c] transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={!isFormValid}
            className={`px-10 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center space-x-2 shadow-xl ${
              isFormValid 
                ? 'bg-[#6360DF] hover:bg-[#5451d0] text-white shadow-[#6360df33] active:scale-[0.98]' 
                : 'bg-[#d1d0eb] text-white cursor-not-allowed shadow-none'
            }`}
          >
            <Save size={18} />
            <span>Save Vehicle</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default AddNewVehicle;
