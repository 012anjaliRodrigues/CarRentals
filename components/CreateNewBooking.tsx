import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Car as CarIcon, 
  Plus, 
  Minus, 
  CheckCircle,
  ChevronDown,
  Percent,
  CircleDollarSign,
  AlertCircle,
  Ban,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase, getCurrentUser } from '../supabaseClient';

interface SelectedVehicle {
  id: string;        // model_id
  vehicleId: string; // actual vehicle id (first available)
  name: string;
  transmission: string;
  fuel: string;
  rate: number;
  quantity: number;
  availableCount: number;
}

interface CreateNewBookingProps {
  onBack: () => void;
  onConfirm: (data: any) => void;
}

const CreateNewBooking: React.FC<CreateNewBookingProps> = ({ onBack, onConfirm }) => {
  const formatDateDisplay = (iso: string) => {
    if (!iso) return '';
    const date = new Date(iso);
    return date.toLocaleString('en-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    }).replace(/\//g, '-').toUpperCase();
  };

  const [customerData, setCustomerData] = useState({
    fullName: '',
    phone: '',
    pickupLocation: 'Mapusa',
    dropLocation: 'Old Goa',
    pickupDateTime: '',
    returnDateTime: ''
  });

  const [selectedVehicles, setSelectedVehicles] = useState<SelectedVehicle[]>([]);
  const [securityDeposit, setSecurityDeposit] = useState(true);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('0');
  const [filters, setFilters] = useState({ transmission: 'All', fuel: 'All', type: 'All' });

  // ── Fleet from DB ─────────────────────────────────────────
  const [fleetData, setFleetData] = useState<Record<string, any[]>>({});
  const [fleetLoading, setFleetLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const loadFleet = async () => {
    setFleetLoading(true);
    const authUser = await getCurrentUser();
    if (!authUser) { setFleetLoading(false); return; }

    const { data: ownerRow } = await supabase
      .from('owners').select('id').eq('user_id', authUser.id).single();
    if (!ownerRow) { setFleetLoading(false); return; }

    setOwnerId(ownerRow.id);

    const { data, error } = await supabase
      .from('vehicles')
      .select('id, status, transmission, fuel_type, models(id, brand, name, default_transmission, default_fuel_type, categories(name))')
      .eq('owner_id', ownerRow.id)
      .eq('status', 'available');

    if (error) {
      toast.error('Failed to load fleet.');
      setFleetLoading(false);
      return;
    }

    // Group by model_id → category
    const modelMap: Record<string, any> = {};
    (data || []).forEach((v: any) => {
      const model = v.models;
      if (!model) return;
      if (!modelMap[model.id]) {
        modelMap[model.id] = {
          id: model.id,
          name: `${model.brand} ${model.name}`,
          trans: v.transmission || model.default_transmission,
          fuel: v.fuel_type || model.default_fuel_type,
          category: model.categories?.name?.toUpperCase() || 'OTHERS',
          rate: 1500, // default rate — replace with your pricing logic
          vehicles: [],
        };
      }
      modelMap[model.id].vehicles.push(v.id);
    });

    // Group by category
    const grouped: Record<string, any[]> = {};
    Object.values(modelMap).forEach((m: any) => {
      const cat = m.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({
        id: m.id,
        name: m.name,
        trans: m.trans,
        fuel: m.fuel,
        available: `${m.vehicles.length}/${m.vehicles.length}`,
        availableCount: m.vehicles.length,
        vehicleIds: m.vehicles,
        rate: m.rate,
      });
    });

    setFleetData(grouped);
    setFleetLoading(false);
  };

  useEffect(() => { loadFleet(); }, []);
  // ─────────────────────────────────────────────────────────

  const filteredFleet = useMemo(() => {
    const result: Record<string, any[]> = {};
    Object.entries(fleetData).forEach(([category, vehicles]) => {
      const filtered = vehicles.filter(v => {
        const transMatch = filters.transmission === 'All' || v.trans === filters.transmission;
        const fuelMatch = filters.fuel === 'All' || v.fuel === filters.fuel;
        const typeMatch = filters.type === 'All' || category.includes(filters.type.toUpperCase());
        return transMatch && fuelMatch && typeMatch;
      });
      if (filtered.length > 0) result[category] = filtered;
    });
    return result;
  }, [filters, fleetData]);

  const handleVehicleAction = (v: any, action: 'add' | 'inc' | 'dec') => {
    setSelectedVehicles(prev => {
      const existing = prev.find(item => item.id === v.id);
      if (action === 'add') {
        return [...prev, {
          id: v.id,
          vehicleId: v.vehicleIds[0],
          name: v.name,
          transmission: v.trans,
          fuel: v.fuel,
          rate: v.rate,
          quantity: 1,
          availableCount: v.availableCount,
        }];
      }
      if (action === 'inc') {
        return prev.map(item =>
          item.id === v.id && item.quantity < item.availableCount
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      if (action === 'dec') {
        const updated = prev.map(item => item.id === v.id ? { ...item, quantity: item.quantity - 1 } : item);
        return updated.filter(item => item.quantity > 0);
      }
      return prev;
    });
  };

  const totalSelectedCount = useMemo(() =>
    selectedVehicles.reduce((acc, curr) => acc + curr.quantity, 0), [selectedVehicles]);

  const isConfirmEnabled = totalSelectedCount > 0 && customerData.fullName && customerData.phone && customerData.pickupDateTime && customerData.returnDateTime;

  const calculations = useMemo(() => {
    const subtotal = selectedVehicles.reduce((acc, curr) => acc + (curr.rate * curr.quantity), 0);
    const surcharge = selectedVehicles.length > 0 ? 300 : 0;
    const deposit = securityDeposit ? 2000 : 0;
    const val = parseFloat(discountValue) || 0;
    let discountAmount = 0;
    let error = '';
    if (discountEnabled) {
      if (discountType === 'percentage') {
        if (val > 100) error = 'Discount cannot exceed 100%';
        discountAmount = subtotal * (Math.min(val, 100) / 100);
      } else {
        if (val > subtotal) error = 'Discount cannot exceed subtotal amount';
        discountAmount = Math.min(val, subtotal);
      }
    }
    const taxableAmount = Math.max(0, subtotal + surcharge - discountAmount);
    const gst = taxableAmount * 0.18;
    const total = taxableAmount + deposit + gst;
    return { subtotal, surcharge, deposit, gst, total, discountAmount, error };
  }, [selectedVehicles, securityDeposit, discountType, discountValue, discountEnabled]);

  // ── Save booking to DB ────────────────────────────────────
  const handleConfirm = async () => {
    if (!isConfirmEnabled || !ownerId) return;
    setIsSaving(true);

    try {
      // Generate reference
      const ref = `BK-${Date.now().toString().slice(-8)}`;

      const { data: bookingRow, error: bookingErr } = await supabase
        .from('bookings')
        .insert({
          owner_id: ownerId,
          booking_reference: ref,
          customer_name: customerData.fullName.trim(),
          customer_phone: `+91 ${customerData.phone.trim()}`,
          customer_email: null,
          pickup_location: customerData.pickupLocation,
          drop_location: customerData.dropLocation,
          pickup_at: new Date(customerData.pickupDateTime).toISOString(),
          drop_at: new Date(customerData.returnDateTime).toISOString(),
          status: 'BOOKED',
          no_of_vehicles: totalSelectedCount,
          subtotal: calculations.subtotal,
          surcharge: calculations.surcharge,
          security_deposit: calculations.deposit,
          discount_type: discountEnabled ? discountType : null,
          discount_value: discountEnabled ? parseFloat(discountValue) : 0,
          discount_amount: calculations.discountAmount,
          gst_amount: Math.round(calculations.gst),
          total_amount: Math.round(calculations.total),
          advance_amount: 0,
          balance_amount: Math.round(calculations.total),
          payment_status: 'UNPAID',
        })
        .select('id')
        .single();

      if (bookingErr || !bookingRow) {
        toast.error('Failed to save booking: ' + bookingErr?.message);
        return;
      }

      // Insert booking_details rows (one per selected model)
      const detailRows = selectedVehicles.map(v => ({
        owner_id: ownerId,
        booking_id: bookingRow.id,
        vehicle_id: v.vehicleId,
        model_id: v.id,
        quantity: v.quantity,
        daily_rate: v.rate,
        line_subtotal: v.rate * v.quantity,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: v.rate * v.quantity,
      }));

      const { error: detailErr } = await supabase.from('booking_details').insert(detailRows);
      if (detailErr) {
        toast.error('Booking saved but details failed: ' + detailErr.message);
      }

      toast.success('Booking confirmed!');
      onConfirm({
        customer: customerData,
        vehicles: selectedVehicles,
        pricing: calculations,
        referenceId: ref,
      });

    } catch (err) {
      console.error('Unexpected error saving booking:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  // ─────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <div className="mb-8">
        <button 
          onClick={onBack}
          className="text-[#6360DF] text-[11px] font-bold tracking-widest uppercase flex items-center mb-2 hover:opacity-70 transition-all"
        >
          <ArrowLeft size={14} className="mr-1" />
          Back to Dashboard
        </button>
        <h2 className="text-3xl font-extrabold text-[#151a3c] tracking-tight">Create New Booking</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column */}
        <div className="flex-1 space-y-8 w-full">
          {/* Customer & Trip Details */}
          <section className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 p-8 md:p-10">
            <div className="flex items-center space-x-3 mb-8">
              <div className="bg-[#6360DF]/10 p-2 rounded-lg text-[#6360DF]">
                <MapPin size={18} />
              </div>
              <h3 className="text-lg font-extrabold text-[#151a3c]">Customer & Trip Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Full Name *</label>
                <input 
                  type="text" 
                  value={customerData.fullName}
                  onChange={e => setCustomerData({...customerData, fullName: e.target.value})}
                  className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-5 outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] text-[#151a3c] font-bold"
                  placeholder="Arjun Sharma"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Phone Number *</label>
                <div className="flex items-center">
                  <div className="bg-[#F8F9FA] border border-[#d1d0eb] border-r-0 rounded-l-xl py-3 px-4 text-[#6c7e96] font-bold">+91</div>
                  <input 
                    type="tel" 
                    value={customerData.phone}
                    onChange={e => setCustomerData({...customerData, phone: e.target.value})}
                    className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-r-xl py-3 px-5 outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] text-[#151a3c] font-bold"
                    placeholder="98234 56789"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Pickup Location *</label>
                <div className="relative">
                  <select 
                    value={customerData.pickupLocation}
                    onChange={e => setCustomerData({...customerData, pickupLocation: e.target.value})}
                    className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-5 text-[#151a3c] font-bold outline-none appearance-none cursor-pointer"
                  >
                    <option>Mapusa</option>
                    <option>Panjim</option>
                    <option>Airport</option>
                    <option>Calangute</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none" size={18} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Pickup Date & Time *</label>
                <div className="relative">
                  <input 
                    type="datetime-local" 
                    value={customerData.pickupDateTime}
                    onChange={e => setCustomerData({...customerData, pickupDateTime: e.target.value})}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-5 text-[#151a3c] font-bold outline-none focus:border-[#6360DF] cursor-pointer"
                  />
                  <Calendar className="absolute right-10 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none opacity-50" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Drop Location *</label>
                <div className="relative">
                  <select 
                    value={customerData.dropLocation}
                    onChange={e => setCustomerData({...customerData, dropLocation: e.target.value})}
                    className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-5 text-[#151a3c] font-bold outline-none appearance-none cursor-pointer"
                  >
                    <option>Old Goa</option>
                    <option>Vagator</option>
                    <option>Airport</option>
                    <option>Margao</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none" size={18} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#6c7e96] uppercase tracking-wider">Return Date & Time *</label>
                <div className="relative">
                  <input 
                    type="datetime-local" 
                    value={customerData.returnDateTime}
                    onChange={e => setCustomerData({...customerData, returnDateTime: e.target.value})}
                    min={customerData.pickupDateTime}
                    className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-5 text-[#151a3c] font-bold outline-none focus:border-[#6360DF] cursor-pointer"
                  />
                  <Calendar className="absolute right-10 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none opacity-50" size={16} />
                </div>
              </div>
            </div>
          </section>

          {/* Select Fleet Section */}
          <section className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 p-8 md:p-10 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-[#6360DF]/10 p-2 rounded-lg text-[#6360DF]">
                  <CarIcon size={18} />
                </div>
                <h3 className="text-lg font-extrabold text-[#151a3c]">Select Fleet</h3>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <select 
                    value={filters.transmission}
                    onChange={e => setFilters({...filters, transmission: e.target.value})}
                    className="bg-white border border-[#d1d0eb] rounded-lg py-2.5 px-4 pr-10 text-xs font-bold text-[#151a3c] outline-none appearance-none cursor-pointer hover:border-[#6360DF] w-[140px] transition-all"
                  >
                    <option>All</option>
                    <option>Manual</option>
                    <option>Automatic</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#151a3c] pointer-events-none" />
                </div>
                <div className="relative">
                  <select 
                    value={filters.fuel}
                    onChange={e => setFilters({...filters, fuel: e.target.value})}
                    className="bg-white border border-[#d1d0eb] rounded-lg py-2.5 px-4 pr-10 text-xs font-bold text-[#151a3c] outline-none appearance-none cursor-pointer hover:border-[#6360DF] w-[140px] transition-all"
                  >
                    <option>All</option>
                    <option>Petrol</option>
                    <option>Diesel</option>
                    <option>CNG</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#151a3c] pointer-events-none" />
                </div>
                <div className="relative">
                  <select 
                    value={filters.type}
                    onChange={e => setFilters({...filters, type: e.target.value})}
                    className="bg-white border border-[#d1d0eb] rounded-lg py-2.5 px-4 pr-10 text-xs font-bold text-[#151a3c] outline-none appearance-none cursor-pointer hover:border-[#6360DF] w-[140px] transition-all"
                  >
                    <option>All</option>
                    <option>Hatchback</option>
                    <option>Sedan</option>
                    <option>SUV</option>
                    <option>MUV</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#151a3c] pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/20">
                    <th className="pb-4 font-bold">Model Name</th>
                    <th className="pb-4 font-bold">Trans.</th>
                    <th className="pb-4 font-bold">Fuel</th>
                    <th className="pb-4 font-bold text-center">Available</th>
                    <th className="pb-4 font-bold">Rate/Day</th>
                    <th className="pb-4 text-right font-bold pr-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {fleetLoading ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="flex items-center justify-center text-[#6c7e96]">
                          <Loader2 size={20} className="animate-spin mr-2" />
                          <span className="text-sm font-medium">Loading fleet...</span>
                        </div>
                      </td>
                    </tr>
                  ) : Object.keys(filteredFleet).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-[#6c7e96] font-medium text-sm">
                        {Object.keys(fleetData).length === 0
                          ? 'No available vehicles. Add vehicles in Fleet Listing first.'
                          : 'No vehicles matching these filters. Try adjusting your search.'}
                      </td>
                    </tr>
                  ) : (
                    Object.entries(filteredFleet).map(([category, vehicles]) => (
                      <React.Fragment key={category}>
                        <tr className="bg-[#EEEDFA]/50">
                          <td colSpan={6} className="px-4 py-2.5 text-[10px] font-extrabold text-[#6360DF] tracking-widest">{category}</td>
                        </tr>
                        {(vehicles as any[]).map(v => {
                          const selected = selectedVehicles.find(sv => sv.id === v.id);
                          return (
                            <tr key={v.id} className="border-b border-[#d1d0eb]/10 last:border-0 hover:bg-[#F8F9FA] transition-colors">
                              <td className="py-4 font-bold text-[#151a3c] text-sm">{v.name}</td>
                              <td className="py-4 text-[#6c7e96] text-xs font-semibold">{v.trans}</td>
                              <td className="py-4 text-[#6c7e96] text-xs font-semibold">{v.fuel}</td>
                              <td className="py-4 text-center">
                                <span className={`text-xs font-extrabold ${v.availableCount <= 2 ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>
                                  {v.available}
                                </span>
                              </td>
                              <td className="py-4 font-extrabold text-[#151a3c] text-sm">₹{v.rate.toLocaleString()}</td>
                              <td className="py-4 text-right pr-4">
                                {selected ? (
                                  <div className="inline-flex items-center space-x-3 bg-white border border-[#6360DF] rounded-lg px-2 py-1">
                                    <button onClick={() => handleVehicleAction(v, 'dec')} className="text-[#6360DF] hover:bg-[#EEEDFA] p-0.5 rounded transition-colors"><Minus size={14} /></button>
                                    <span className="text-sm font-extrabold text-[#6360DF] min-w-[20px] text-center">{selected.quantity}</span>
                                    <button onClick={() => handleVehicleAction(v, 'inc')} className="text-[#6360DF] hover:bg-[#EEEDFA] p-0.5 rounded transition-colors"><Plus size={14} /></button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => handleVehicleAction(v, 'add')}
                                    className="bg-[#6360DF] hover:bg-[#5451d0] text-white px-5 py-2 rounded-lg text-xs font-extrabold transition-all active:scale-95"
                                  >
                                    ADD
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Column: Sticky Summary */}
        <div className="w-full lg:w-[380px] lg:sticky lg:top-8">
          <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden flex flex-col h-full border border-[#d1d0eb]/30">
            <div className="bg-[#6360DF] p-6 text-white">
              <h3 className="text-xl font-extrabold tracking-tight">Booking Summary</h3>
            </div>

            <div className="p-8 space-y-8">
              {/* Customer Info */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase">Customer Information</p>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[#EEEDFA] flex items-center justify-center text-[#6360DF]">
                    <User size={18} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[#151a3c] text-sm">{customerData.fullName || '—'}</h4>
                    <p className="text-xs font-semibold text-[#6c7e96]">{customerData.phone || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Trip Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-[#6c7e96] tracking-widest uppercase">Pickup</p>
                  <p className="text-xs font-extrabold text-[#151a3c]">{customerData.pickupLocation}</p>
                  <p className="text-[10px] font-medium text-[#6c7e96]">{formatDateDisplay(customerData.pickupDateTime)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-[#6c7e96] tracking-widest uppercase">Drop</p>
                  <p className="text-xs font-extrabold text-[#151a3c]">{customerData.dropLocation}</p>
                  <p className="text-[10px] font-medium text-[#6c7e96]">{formatDateDisplay(customerData.returnDateTime)}</p>
                </div>
              </div>

              <div className="h-px bg-[#d1d0eb]/30" />

              {/* Selected Fleet */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase">Selected Fleet</p>
                  {totalSelectedCount > 0 ? (
                    <p className="text-[13px] font-bold text-[#6360DF]">{totalSelectedCount} Vehicles Selected</p>
                  ) : (
                    <p className="text-[13px] font-medium text-[#6c7e96] italic">No Vehicles Selected</p>
                  )}
                </div>
                {selectedVehicles.length > 0 ? (
                  <div className="space-y-4">
                    {selectedVehicles.map(v => (
                      <div key={v.id} className="flex justify-between items-start">
                        <div>
                          <h5 className="font-bold text-[#151a3c] text-sm">{v.name}</h5>
                          <p className="text-[10px] font-semibold text-[#6c7e96]">{v.transmission}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-[#151a3c]">x{v.quantity}</p>
                          <p className="text-sm font-extrabold text-[#151a3c]">₹{(v.rate * v.quantity).toLocaleString()}.00</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-[#6c7e96] italic">Please select vehicles from the list</p>
                )}
              </div>

              <div className="h-px bg-[#d1d0eb]/30" />

              {/* Price Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-[#6c7e96]">Subtotal</span>
                  <span className="font-extrabold text-[#151a3c]">₹{calculations.subtotal.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-[#6c7e96]">Location Surcharges</span>
                  <span className="font-extrabold text-[#151a3c]">₹{calculations.surcharge.toLocaleString()}.00</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={securityDeposit} 
                      onChange={() => setSecurityDeposit(!securityDeposit)}
                      className="w-4 h-4 rounded text-[#6360DF] focus:ring-[#6360DF]"
                    />
                    <span className="font-semibold text-[#6c7e96]">Security Deposit</span>
                  </div>
                  <span className="font-extrabold text-[#151a3c]">₹{calculations.deposit.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-[#6c7e96]">GST (18%)</span>
                  <span className="font-extrabold text-[#151a3c]">₹{Math.round(calculations.gst).toLocaleString()}.00</span>
                </div>

                <div className="h-px bg-[#d1d0eb]/30 !my-6" />

                {/* Discount */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[#151a3c]">
                    <span className="text-sm font-extrabold">Discount</span>
                    <button 
                      onClick={() => setDiscountEnabled(!discountEnabled)}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${discountEnabled ? 'bg-[#6360DF]' : 'bg-[#E5E7EB]'}`}
                    >
                      <motion.div 
                        animate={{ x: discountEnabled ? 20 : 4 }}
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-1 left-0 bg-white w-4 h-4 rounded-full shadow-sm" 
                      />
                    </button>
                  </div>
                  
                  <AnimatePresence>
                    {discountEnabled && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-[#F8F9FA] border border-[#d1d0eb] rounded-2xl p-4 space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-wider">Discount Type</label>
                            <div className="relative">
                              <select 
                                value={discountType}
                                onChange={(e) => setDiscountType(e.target.value as any)}
                                className="w-full bg-white border border-[#d1d0eb] rounded-lg py-2.5 px-4 pr-10 text-sm font-bold text-[#151a3c] outline-none appearance-none cursor-pointer focus:border-[#6360DF] transition-all"
                              >
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount (₹)</option>
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#151a3c] pointer-events-none" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-wider">Discount Value</label>
                            <div className="relative">
                              <input 
                                type="number"
                                value={discountValue}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || parseFloat(val) >= 0) setDiscountValue(val);
                                }}
                                placeholder="Enter discount value"
                                className="w-full bg-white border border-[#d1d0eb] rounded-lg py-2.5 pl-4 pr-10 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6c7e96] font-bold text-sm">
                                {discountType === 'percentage' ? '%' : '₹'}
                              </span>
                            </div>
                            {calculations.error && (
                              <div className="flex items-center space-x-1.5 text-red-500 mt-1 animate-pulse">
                                <AlertCircle size={12} />
                                <span className="text-[10px] font-bold">{calculations.error}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-[#d1d0eb]/50">
                            <span className="text-xs font-semibold text-[#6c7e96]">Discount Amount</span>
                            <span className="text-sm font-extrabold text-[#10B981]">
                              -₹{calculations.discountAmount.toLocaleString()}.00
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="h-px bg-[#d1d0eb]/30 !my-6" />

                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-extrabold text-[#151a3c]">TOTAL AMOUNT</span>
                  <span className="text-3xl font-black text-[#6360DF]">₹{Math.round(calculations.total).toLocaleString()}.00</span>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <button 
                  disabled={!isConfirmEnabled || isSaving}
                  onClick={handleConfirm}
                  className={`w-full font-bold py-4 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md ${
                    isConfirmEnabled && !isSaving
                      ? 'bg-[#6360DF] hover:bg-[#4c47dd] text-white active:scale-95 cursor-pointer shadow-[#6360df33]' 
                      : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed opacity-60'
                  }`}
                >
                  {isSaving ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : isConfirmEnabled ? (
                    <CheckCircle size={20} />
                  ) : (
                    <Ban size={20} />
                  )}
                  <span>{isSaving ? 'Saving...' : 'Confirm Booking'}</span>
                </button>
                
                {!isConfirmEnabled && !isSaving && (
                  <p className="text-[12px] font-medium text-[#6c7e96] text-center mt-2 animate-pulse">
                    Fill in customer details and select at least 1 vehicle
                  </p>
                )}

                <button className="w-full py-2 text-sm font-bold text-[#6c7e96] hover:text-[#151a3c] transition-colors">
                  Save as Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateNewBooking;