import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Car as CarIcon, 
  Bell, 
  Save, 
  ArrowLeft, 
  ChevronDown,
  Calendar,
  Check,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase, getCurrentUser } from '../supabaseClient';

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
  disabled?: boolean;
}> = ({ label, options, value, onChange, required, disabled }) => {
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
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3.5 px-4 flex items-center justify-between text-[#151a3c] font-medium transition-all focus:ring-2 focus:ring-[#6360DF]/10 outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={value ? 'text-[#151a3c]' : 'text-[#6c7e96]/50'}>{value || `Select ${label}`}</span>
        <ChevronDown size={18} className={`text-[#6c7e96] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-[#d1d0eb] rounded-xl shadow-xl overflow-auto py-1 max-h-[220px]"
          >
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setIsOpen(false); }}
                className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between ${
                  value === opt ? 'bg-[#6360DF] text-white' : 'text-[#151a3c] hover:bg-[#EEEDFA]'
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

// ── Types ─────────────────────────────────────────────────────
interface CategoryRow { id: string; name: string; }
interface ModelRow {
  id: string;
  brand: string;
  name: string;
  default_transmission: string;
  default_fuel_type: string;
  category_id: string;
}

const COLORS = ['White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Brown', 'Orange', 'Yellow', 'Green'];

const AddNewVehicle: React.FC<AddNewVehicleProps> = ({ onSave, onCancel }) => {
  const currentYear = new Date().getFullYear().toString();
  const todayDate = new Date().toISOString().split('T')[0];
  const [isSaving, setIsSaving] = useState(false);
  const [dbLoading, setDbLoading] = useState(true);

  // ── DB state ──────────────────────────────────────────────
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [allModels, setAllModels] = useState<ModelRow[]>([]);

  // ── Form state ────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [transmission, setTransmission] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [color, setColor] = useState('White');
  const [vehicleNo, setVehicleNo] = useState('');
  const [mfgYear, setMfgYear] = useState('2023');
  const [permitValidity, setPermitValidity] = useState('');
  const [insuranceRenewal, setInsuranceRenewal] = useState('');
  const [pucExpiry, setPucExpiry] = useState('');
  const [nextOilChange, setNextOilChange] = useState('');

  // ── Load categories + models from DB ──────────────────────
  useEffect(() => {
    const load = async () => {
      setDbLoading(true);
      const [{ data: cats }, { data: mods }] = await Promise.all([
        supabase.from('categories').select('id, name').order('display_order', { ascending: true }),
        supabase.from('models').select('id, brand, name, default_transmission, default_fuel_type, category_id'),
      ]);
      if (cats) setCategories(cats);
      if (mods) setAllModels(mods);
      // Set defaults from first category
      if (cats && cats.length > 0) setSelectedCategory(cats[0].name);
      setDbLoading(false);
    };
    load();
  }, []);

  // ── Derived: models for selected category ────────────────
  const categoryId = useMemo(
    () => categories.find(c => c.name === selectedCategory)?.id || '',
    [categories, selectedCategory]
  );

  const modelsInCategory = useMemo(
    () => allModels.filter(m => m.category_id === categoryId),
    [allModels, categoryId]
  );

  const brands = useMemo(
    () => [...new Set(modelsInCategory.map(m => m.brand))].sort(),
    [modelsInCategory]
  );

  const modelsForBrand = useMemo(
    () => modelsInCategory.filter(m => m.brand === selectedBrand),
    [modelsInCategory, selectedBrand]
  );

  const modelNames = useMemo(
    () => [...new Set(modelsForBrand.map(m => m.name))],
    [modelsForBrand]
  );

  // transmissions and fuels available for selected model name
  const transmissionsForModel = useMemo(
    () => [...new Set(modelsForBrand.filter(m => m.name === selectedModel).map(m => m.default_transmission))],
    [modelsForBrand, selectedModel]
  );

  const fuelsForModel = useMemo(
    () => [...new Set(modelsForBrand.filter(m => m.name === selectedModel && m.default_transmission === transmission).map(m => m.default_fuel_type))],
    [modelsForBrand, selectedModel, transmission]
  );

  // ── Cascade resets ────────────────────────────────────────
  // When category changes → reset brand/model/transmission/fuel
  useEffect(() => {
    if (!selectedCategory) return;
    setSelectedBrand('');
    setSelectedModel('');
    setTransmission('');
    setFuelType('');
  }, [selectedCategory]);

  // When brand changes → reset model/transmission/fuel
  useEffect(() => {
    if (!selectedBrand) return;
    setSelectedModel('');
    setTransmission('');
    setFuelType('');
  }, [selectedBrand]);

  // Auto-select brand when only one available
  useEffect(() => {
    if (brands.length === 1) setSelectedBrand(brands[0]);
    else if (brands.length > 0 && !brands.includes(selectedBrand)) setSelectedBrand('');
  }, [brands]);

  // When model name changes → auto-set transmission if only one option
  useEffect(() => {
    setTransmission('');
    setFuelType('');
    if (transmissionsForModel.length === 1) setTransmission(transmissionsForModel[0]);
  }, [selectedModel]);

  // When transmission changes → auto-set fuel if only one option
  useEffect(() => {
    setFuelType('');
    if (fuelsForModel.length === 1) setFuelType(fuelsForModel[0]);
  }, [transmission]);

  // ── Validation ────────────────────────────────────────────
  const isFormValid = useMemo(() => (
    selectedCategory !== '' &&
    selectedBrand !== '' &&
    selectedModel !== '' &&
    transmission !== '' &&
    fuelType !== '' &&
    vehicleNo.trim().length > 0 &&
    permitValidity !== '' &&
    mfgYear !== '' &&
    parseInt(mfgYear) <= parseInt(currentYear)
  ), [selectedCategory, selectedBrand, selectedModel, transmission, fuelType, vehicleNo, permitValidity, mfgYear, currentYear]);

  // ── Save ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSaving) return;

    setIsSaving(true);
    try {
      const authUser = await getCurrentUser();
      if (!authUser) { toast.error('No session found. Please log in again.'); return; }

      const { data: ownerRow, error: ownerErr } = await supabase
        .from('owners').select('id').eq('user_id', authUser.id).single();
      if (ownerErr || !ownerRow) { toast.error('Owner profile not found.'); return; }

      const ownerId = ownerRow.id;

      // Find exact model row matching brand + name + transmission + fuel
      const exactModel = allModels.find(m =>
        m.category_id === categoryId &&
        m.brand === selectedBrand &&
        m.name === selectedModel &&
        m.default_transmission === transmission &&
        m.default_fuel_type === fuelType
      );

      let modelId: string;
      if (exactModel) {
        modelId = exactModel.id;
      } else {
        // Create new model if not in DB
        const { data: newModel, error: modelErr } = await supabase
          .from('models')
          .insert({
            category_id: categoryId,
            brand: selectedBrand,
            name: selectedModel,
            default_transmission: transmission,
            default_fuel_type: fuelType,
          })
          .select('id').single();
        if (modelErr || !newModel) { toast.error('Failed to create model: ' + modelErr?.message); return; }
        modelId = newModel.id;
      }

      // Insert vehicle
      const { data: newVehicle, error: vehicleErr } = await supabase
        .from('vehicles')
        .insert({
          owner_id: ownerId,
          model_id: modelId,
          registration_no: vehicleNo.trim().toUpperCase(),
          color,
          fuel_type: fuelType,
          transmission,
          mfg_year: parseInt(mfgYear),
          permit_valid_until: permitValidity || null,
          insurance_valid_until: insuranceRenewal || null,
          puc_valid_until: pucExpiry || null,
          next_oil_change_at: nextOilChange || null,
          status: 'available',
        })
        .select('id').single();

      if (vehicleErr || !newVehicle) { toast.error('Failed to save vehicle: ' + vehicleErr?.message); return; }

      const vehicleId = newVehicle.id;

      // Insert reminders
      const remindersToInsert: any[] = [];
      if (insuranceRenewal) remindersToInsert.push({
        owner_id: ownerId, vehicle_id: vehicleId,
        type: 'Insurance Renewal', category: 'Critical',
        due_date: insuranceRenewal, priority: 'High', status: 'Upcoming',
        days_remaining: Math.ceil((new Date(insuranceRenewal).getTime() - Date.now()) / 86400000),
      });
      if (pucExpiry) remindersToInsert.push({
        owner_id: ownerId, vehicle_id: vehicleId,
        type: 'PUC Expiry', category: 'Critical',
        due_date: pucExpiry, priority: 'High', status: 'Upcoming',
        days_remaining: Math.ceil((new Date(pucExpiry).getTime() - Date.now()) / 86400000),
      });
      if (nextOilChange) remindersToInsert.push({
        owner_id: ownerId, vehicle_id: vehicleId,
        type: 'Oil Change', category: 'Maintenance',
        due_date: nextOilChange, priority: 'Medium', status: 'Upcoming',
        days_remaining: Math.ceil((new Date(nextOilChange).getTime() - Date.now()) / 86400000),
      });
      if (remindersToInsert.length > 0) await supabase.from('reminders').insert(remindersToInsert);

      toast.success('Vehicle saved successfully!');
      onSave({ id: vehicleId, modelId, type: selectedCategory, brand: selectedBrand, model: selectedModel, transmission, fuelType, color, vehicleNo, mfgYear });

    } catch (err) {
      console.error('Unexpected error saving vehicle:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (dbLoading) return (
    <div className="flex items-center justify-center py-32 text-[#6c7e96]">
      <Loader2 size={24} className="animate-spin mr-2" />
      <span className="text-sm font-medium">Loading vehicle data...</span>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-[800px] mx-auto pb-20"
    >
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={() => { if (vehicleNo ? confirm('Discard changes?') : true) onCancel(); }}
          className="p-2 hover:bg-[#EEEDFA] rounded-lg text-[#6c7e96] hover:text-[#6360DF] transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-[20px] font-extrabold text-[#151a3c] tracking-tight">Add New Vehicle</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
        <div className="p-8 md:p-10">
          <div className="flex items-center space-x-3 mb-8">
            <div className="p-2 bg-[#6360DF]/10 rounded-lg text-[#6360DF]"><CarIcon size={18} /></div>
            <h3 className="font-bold text-[#151a3c] text-lg">Vehicle Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

            {/* Type / Category */}
            <CustomSelect
              label="Type"
              options={categories.map(c => c.name)}
              value={selectedCategory}
              onChange={setSelectedCategory}
              required
            />

            {/* Brand — filtered by category */}
            <CustomSelect
              label="Brand"
              options={brands}
              value={selectedBrand}
              onChange={v => { setSelectedBrand(v); setSelectedModel(''); setTransmission(''); setFuelType(''); }}
              required
              disabled={brands.length === 0}
            />

            {/* Model — filtered by brand */}
            <CustomSelect
              label="Model"
              options={modelNames}
              value={selectedModel}
              onChange={v => { setSelectedModel(v); setTransmission(''); setFuelType(''); }}
              required
              disabled={!selectedBrand || modelNames.length === 0}
            />

            {/* Transmission — filtered by model */}
            <CustomSelect
              label="Transmission"
              options={transmissionsForModel}
              value={transmission}
              onChange={v => { setTransmission(v); setFuelType(''); }}
              required
              disabled={!selectedModel || transmissionsForModel.length === 0}
            />

            {/* Fuel Type — filtered by model + transmission */}
            <CustomSelect
              label="Fuel Type"
              options={fuelsForModel}
              value={fuelType}
              onChange={setFuelType}
              required
              disabled={!transmission || fuelsForModel.length === 0}
            />

            {/* Color */}
            <CustomSelect
              label="Color"
              options={COLORS}
              value={color}
              onChange={setColor}
              required
            />

            {/* Vehicle No. */}
            <div className="flex flex-col space-y-2">
              <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">
                Vehicle No. <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={vehicleNo}
                onChange={e => setVehicleNo(e.target.value.toUpperCase())}
                placeholder="e.g. GA 12 AA 1123"
                className="w-full bg-[#EEEDFA] border border-[#d1d0eb] rounded-xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] text-[#151a3c] font-bold placeholder:text-[#6c7e96]/40"
              />
            </div>

            {/* Manufacturing Year */}
            <div className="flex flex-col space-y-2">
              <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">
                Manufacturing Year <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="number"
                value={mfgYear}
                onChange={e => setMfgYear(e.target.value)}
                max={currentYear}
                placeholder="2023"
                className="w-full bg-[#EEEDFA] border border-[#d1d0eb] rounded-xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] text-[#151a3c] font-bold"
              />
            </div>

            {/* Permit Validity */}
            <div className="flex flex-col space-y-2">
              <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">
                Permit Validity <span className="text-[#EF4444]">*</span>
              </label>
              <div className="relative">
                <input
                  type="date" min={todayDate}
                  value={permitValidity}
                  onChange={e => setPermitValidity(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3.5 px-4 pr-12 outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] text-[#151a3c] font-medium"
                />
                <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Reminders */}
          <div className="mt-12 pt-10 border-t border-[#d1d0eb]/30">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-2 bg-[#6360DF]/10 rounded-lg text-[#6360DF]"><Bell size={18} /></div>
              <h3 className="font-bold text-[#151a3c] text-lg">Set Reminders</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Insurance Renewal', value: insuranceRenewal, setter: setInsuranceRenewal },
                { label: 'Pollution (PUC) Expiry', value: pucExpiry, setter: setPucExpiry },
                { label: 'Next Oil Change', value: nextOilChange, setter: setNextOilChange },
              ].map(rem => (
                <div key={rem.label} className="flex flex-col space-y-2">
                  <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">{rem.label}</label>
                  <div className="relative">
                    <input
                      type="date" min={todayDate}
                      value={rem.value}
                      onChange={e => rem.setter(e.target.value)}
                      className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3.5 px-4 pr-12 outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] text-[#151a3c] font-medium"
                    />
                    <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#f8fafc] px-8 py-6 flex items-center justify-end space-x-6 border-t border-[#d1d0eb]/30">
          <button
            type="button"
            onClick={() => { if (vehicleNo ? confirm('Discard changes?') : true) onCancel(); }}
            className="text-[#6c7e96] font-bold text-sm hover:text-[#151a3c] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isFormValid || isSaving}
            className={`px-10 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center space-x-2 shadow-xl ${
              isFormValid && !isSaving
                ? 'bg-[#6360DF] hover:bg-[#5451d0] text-white shadow-[#6360df33] active:scale-[0.98]'
                : 'bg-[#d1d0eb] text-white cursor-not-allowed shadow-none'
            }`}
          >
            {isSaving
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save size={18} />
            }
            <span>{isSaving ? 'Saving...' : 'Save Vehicle'}</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default AddNewVehicle;