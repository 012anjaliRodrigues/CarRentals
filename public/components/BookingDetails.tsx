import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Printer, Car as CarIcon, Share2, Link as LinkIcon,
  Download, CheckCircle, UserCircle, ChevronDown, Lock, Edit,
  ExternalLink, Loader2, User as UserIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

interface BookingDetailsProps {
  booking: any;
  mode?: 'details' | 'confirmed';
  onBack: () => void;
  onEdit: () => void;
}

interface FleetItem {
  id: string;
  name: string;
  registrationNo: string;
  details: string;
  pickDriver: string;
  dropDriver: string;
}

const BookingDetails: React.FC<BookingDetailsProps> = ({ booking, mode = 'details', onBack, onEdit }) => {
  if (!booking) return null;

  const isConfirmation = mode === 'confirmed';

  const [paymentState, setPaymentState] = useState({
    advanceStatus: 'pending' as 'pending' | 'paid' | 'partial',
    cashAmount: '',
    cashPaymentType: 'partial' as 'full' | 'partial',
    totalAmount:   Number(booking.total_amount   || booking.pricing?.total   || 0),
    advanceAmount: Number(booking.advance_amount || booking.pricing?.advance || 0),
    balanceDue:    Number(booking.balance_amount || booking.pricing?.balance || 0),
  });
  const [isPaymentFormActive, setIsPaymentFormActive] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'cash'>('upi');

  // ── Real fleet data ───────────────────────────────────────
  const [fleetItems, setFleetItems] = useState<FleetItem[]>([]);
  const [fleetLoading, setFleetLoading] = useState(false);

  const bookingId = booking.id;

  useEffect(() => {
    if (!bookingId) return;
    const loadFleet = async () => {
      setFleetLoading(true);
      try {
        // One row per vehicle unit in this booking
        const { data: details } = await supabase
          .from('booking_details')
          .select(`
            id,
            vehicles (
              registration_no,
              transmission,
              fuel_type,
              models ( brand, name )
            )
          `)
          .eq('booking_id', bookingId);

        if (!details || details.length === 0) { setFleetLoading(false); return; }

        const detailIds = (details as any[]).map((d: any) => d.id);

        // Allocations for these detail rows → Pick & Drop drivers
        const { data: allocs } = await supabase
          .from('allocations')
          .select('booking_detail_id, type, drivers ( full_name )')
          .in('booking_detail_id', detailIds);

        // Build map: detailId → { pick, drop }
        const driverMap: Record<string, { pick: string; drop: string }> = {};
        ((allocs as any[]) || []).forEach((a: any) => {
          if (!driverMap[a.booking_detail_id])
            driverMap[a.booking_detail_id] = { pick: '—', drop: '—' };
          if (a.type === 'Pick') driverMap[a.booking_detail_id].pick = a.drivers?.full_name || '—';
          if (a.type === 'Drop') driverMap[a.booking_detail_id].drop = a.drivers?.full_name || '—';
        });

        // Each detail = one individual vehicle card
        setFleetItems(((details as any[]) || []).map((d: any) => ({
          id:             d.id,
          name:           d.vehicles?.models
                            ? `${d.vehicles.models.brand} ${d.vehicles.models.name}`
                            : '—',
          registrationNo: d.vehicles?.registration_no || '—',
          details:        [d.vehicles?.transmission, d.vehicles?.fuel_type]
                            .filter(Boolean).join(' • ').toUpperCase(),
          pickDriver: driverMap[d.id]?.pick || '—',
          dropDriver: driverMap[d.id]?.drop || '—',
        })));
      } catch (e) { console.error(e); }
      finally { setFleetLoading(false); }
    };
    loadFleet();
  }, [bookingId]);

  const handleConfirmPayment = () => {
    const amt = parseFloat(paymentState.cashAmount) || 0;
    const isPaid = selectedMethod === 'upi' || amt >= paymentState.advanceAmount;
    setPaymentState(prev => ({
      ...prev,
      advanceStatus: isPaid ? 'paid' : 'partial',
      balanceDue: prev.totalAmount - (selectedMethod === 'upi' ? prev.advanceAmount : amt),
    }));
    setIsPaymentFormActive(false);
  };

  // ── Derive display values ─────────────────────────────────
  const referenceId   = booking.booking_reference || booking.referenceId || '—';
  const customerName  = booking.customer_name     || booking.customer    || '—';
  const customerPhone = booking.customer_phone    || booking.phone       || '—';
  const pickupLoc     = booking.pickup_location   || booking.location?.split(' → ')[0] || '—';
  const dropLoc       = booking.drop_location     || booking.location?.split(' → ')[1] || '—';
  const pickupTime    = booking.pickup_at
    ? new Date(booking.pickup_at).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : '—';
  const dropTime = booking.drop_at
    ? new Date(booking.drop_at).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : '—';

  const totalAmount   = Number(booking.total_amount     || booking.pricing?.total    || 0);
  const subtotal      = Number(booking.subtotal         || booking.pricing?.subtotal || 0);
  const surcharge     = Number(booking.surcharge        || 0);
  const deposit       = Number(booking.security_deposit || 0);
  const gstAmount     = Number(booking.gst_amount       || 0);
  const discountAmt   = Number(booking.discount_amount  || 0);
  const advanceAmount = Number(booking.advance_amount   || booking.pricing?.advance  || 0);
  const balanceAmount = Number(booking.balance_amount   || booking.pricing?.balance  || 0);

  const PaymentBreakdown = () => (
    <div className="space-y-6">
      <h3 className="text-[11px] font-bold text-[#6c7e96] tracking-widest uppercase">Payment Breakdown</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-[#6c7e96]">
            Subtotal ({fleetItems.length} Vehicle{fleetItems.length !== 1 ? 's' : ''})
          </span>
          <span className="font-bold text-[#151a3c]">₹{subtotal.toLocaleString()}.00</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-[#6c7e96]">Location Surcharges</span>
          <span className="font-bold text-[#151a3c]">₹{surcharge.toLocaleString()}.00</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-[#6c7e96]">Security Deposit (Refundable)</span>
          <span className="font-bold text-[#151a3c]">₹{deposit.toLocaleString()}.00</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-[#6c7e96]">GST</span>
          <span className="font-bold text-[#151a3c]">₹{gstAmount.toLocaleString()}.00</span>
        </div>
        <div className="flex justify-between items-center text-sm pt-1">
          <span className="font-medium text-[#6c7e96]">Discount</span>
          <span className="font-semibold text-[#151a3c]">-₹{discountAmt.toLocaleString()}.00</span>
        </div>
        <div className="h-px bg-[#d1d0eb] w-full my-4" />
        <div className="flex justify-between items-center">
          <span className="text-base font-bold text-[#151a3c]">Total Amount</span>
          <span className="text-2xl font-black text-[#151a3c]">₹{totalAmount.toLocaleString()}.00</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-[#6c7e96]">Advance Paid</span>
          <span className="font-bold text-green-600">₹{advanceAmount.toLocaleString()}.00</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-[#6c7e96]">Balance Due</span>
          <span className={`font-bold ${balanceAmount > 0 ? 'text-red-500' : 'text-green-600'}`}>
            ₹{balanceAmount.toLocaleString()}.00
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#D3D2EC] py-10 px-4 md:px-6">
      <div className="max-w-[1280px] mx-auto flex flex-col gap-6">

        <button onClick={onBack} className="text-[#6360DF] text-sm font-bold flex items-center hover:underline w-fit">
          <ArrowLeft size={16} className="mr-1" />Back to Bookings
        </button>

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── Main Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex-[7] w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-[#d1d0eb]/30"
          >
            {/* Header */}
            <div className="px-8 md:px-10 py-6 border-b border-[#d1d0eb] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col space-y-1 text-left">
                <h1 className="text-2xl font-bold text-[#151a3c]">
                  {isConfirmation ? 'Booking Confirmed!' : 'Booking Details'}
                </h1>
                <p className="text-[#6c7e96] text-[13px] font-medium">
                  Reference ID: <span className="text-[#6360DF] font-bold">{referenceId}</span>
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-2 bg-white border border-[#d1d0eb] text-[#6c7e96] px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-[#F8F9FA] transition-colors"
                >
                  <Printer size={18} /><span>Print</span>
                </button>
                <button className="flex items-center space-x-2 bg-white border border-[#d1d0eb] text-[#6c7e96] px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-[#F8F9FA] transition-colors">
                  <Share2 size={18} /><span>Share</span>
                </button>
                <button
                  onClick={onEdit}
                  className="flex items-center space-x-2 bg-white border border-[#d1d0eb] text-[#6360DF] px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-[#EEEDFA] transition-colors"
                >
                  <Edit size={18} /><span>Edit</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 md:p-10 space-y-10">

              {/* Customer */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-[#6c7e96] tracking-widest uppercase text-left">Customer Information</h3>
                <div className="flex items-start space-x-4 bg-[#F8F9FA] rounded-xl p-5 text-left">
                  <UserCircle size={32} className="text-[#6360DF] mt-1 shrink-0" />
                  <div className="space-y-0.5">
                    <h4 className="text-base font-bold text-[#151a3c]">{customerName}</h4>
                    <p className="text-sm font-medium text-[#6c7e96]">{customerPhone}</p>
                  </div>
                </div>
              </div>

              {/* Trip Itinerary */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-[#6c7e96] tracking-widest uppercase text-left">Trip Itinerary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#F8F9FA] rounded-lg p-5 space-y-1 text-left">
                    <span className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase">Pickup Location</span>
                    <p className="text-sm font-bold text-[#151a3c]">{pickupLoc}</p>
                    <p className="text-[13px] font-medium text-[#6c7e96]">{pickupTime}</p>
                  </div>
                  <div className="bg-[#F8F9FA] rounded-lg p-5 space-y-1 text-left">
                    <span className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase">Drop Location</span>
                    <p className="text-sm font-bold text-[#151a3c]">{dropLoc}</p>
                    <p className="text-[13px] font-medium text-[#6c7e96]">{dropTime}</p>
                  </div>
                </div>
              </div>

              {/* ── Selected Fleet — one card per vehicle unit ── */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-[#6c7e96] tracking-widest uppercase text-left">
                  Selected Fleet
                  {!fleetLoading && fleetItems.length > 0 && (
                    <span className="ml-2 normal-case text-[#6360DF]">({fleetItems.length} unit{fleetItems.length !== 1 ? 's' : ''})</span>
                  )}
                </h3>

                {fleetLoading ? (
                  <div className="flex items-center justify-center py-8 text-[#6c7e96]">
                    <Loader2 size={18} className="animate-spin mr-2" />
                    <span className="text-sm">Loading fleet...</span>
                  </div>
                ) : fleetItems.length === 0 ? (
                  <div className="py-6 text-center text-[#6c7e96] text-sm font-medium">
                    No vehicles assigned to this booking yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fleetItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="bg-[#F8F9FA] rounded-xl border border-[#d1d0eb]/20 overflow-hidden"
                      >
                        {/* Vehicle identity row */}
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {/* Unit number badge */}
                            <div className="w-10 h-10 bg-white border border-[#6360DF] rounded-lg flex items-center justify-center text-[#6360DF] font-extrabold text-sm shrink-0">
                              {idx + 1}
                            </div>
                            <div className="text-left">
                              <h5 className="text-base font-bold text-[#151a3c] leading-tight">{item.name}</h5>
                              <p className="text-[12px] font-medium text-[#6c7e96] mt-0.5 uppercase tracking-wide">
                                {item.details || '—'}
                              </p>
                            </div>
                          </div>
                          {/* Registration number badge */}
                          <span className="bg-[#EEEDFA] text-[#6360DF] text-[11px] font-extrabold px-3 py-1.5 rounded-full tracking-widest uppercase shrink-0">
                            {item.registrationNo}
                          </span>
                        </div>

                        {/* Pick / Drop driver row */}
                        <div className="grid grid-cols-2 border-t border-[#d1d0eb]/30">
                          <div className="flex items-center space-x-2 px-4 py-3 border-r border-[#d1d0eb]/30">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[9px] font-extrabold rounded-full tracking-widest shrink-0">
                              PICK
                            </span>
                            <div className="flex items-center space-x-1.5 min-w-0">
                              <UserIcon size={12} className="text-[#6c7e96] shrink-0" />
                              <span className={`text-xs font-bold truncate ${item.pickDriver === '—' ? 'text-[#6c7e96] italic' : 'text-[#151a3c]'}`}>
                                {item.pickDriver === '—' ? 'Not assigned' : item.pickDriver}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 px-4 py-3">
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[9px] font-extrabold rounded-full tracking-widest shrink-0">
                              DROP
                            </span>
                            <div className="flex items-center space-x-1.5 min-w-0">
                              <UserIcon size={12} className="text-[#6c7e96] shrink-0" />
                              <span className={`text-xs font-bold truncate ${item.dropDriver === '—' ? 'text-[#6c7e96] italic' : 'text-[#151a3c]'}`}>
                                {item.dropDriver === '—' ? 'Not assigned' : item.dropDriver}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Breakdown */}
              <div className="pt-4 border-t border-[#d1d0eb]/30">
                <PaymentBreakdown />
              </div>
            </div>
          </motion.div>

          {/* ── Sidebar ── */}
          <motion.aside
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="flex-[3] w-full lg:max-w-[360px] space-y-6"
          >
            <div className="bg-white rounded-[2rem] shadow-xl border border-[#d1d0eb]/30 p-8 space-y-8 text-left">
              <h3 className="text-sm font-bold text-[#151a3c] uppercase tracking-widest">Payment Actions</h3>

              <AnimatePresence mode="wait">
                {paymentState.advanceStatus === 'pending' ? (
                  !isPaymentFormActive ? (
                    <motion.div key="pay-now-btn" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                      <button
                        onClick={() => setIsPaymentFormActive(true)}
                        className="w-full bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all active:scale-95"
                      >
                        <Lock size={18} /><span>Pay Now</span>
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div key="payment-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-6">
                      <div className="flex bg-[#F8F9FA] p-1 rounded-xl border border-[#d1d0eb]">
                        <button onClick={() => setSelectedMethod('upi')}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedMethod === 'upi' ? 'bg-white text-[#6360DF] shadow-sm' : 'text-[#6c7e96]'}`}>
                          UPI
                        </button>
                        <button onClick={() => setSelectedMethod('cash')}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedMethod === 'cash' ? 'bg-white text-[#6360DF] shadow-sm' : 'text-[#6c7e96]'}`}>
                          CASH
                        </button>
                      </div>

                      {selectedMethod === 'upi' && (
                        <div className="bg-[#EEEDFA] border border-[#6360DF]/20 rounded-xl p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-[#6360DF]">
                            <LinkIcon size={16} /><span className="text-xs font-bold">UPI Link Generated</span>
                          </div>
                          <button className="text-[#6360DF] hover:underline flex items-center space-x-1">
                            <span className="text-[11px] font-bold">Copy</span><ExternalLink size={12} />
                          </button>
                        </div>
                      )}

                      {selectedMethod === 'cash' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-[#6c7e96] uppercase">Amount</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6c7e96] text-sm">₹</span>
                              <input
                                type="number"
                                value={paymentState.cashAmount}
                                onChange={e => setPaymentState(prev => ({ ...prev, cashAmount: e.target.value }))}
                                className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 pl-10 pr-4 text-sm font-bold outline-none focus:border-[#6360DF] text-[#151a3c]"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-[#6c7e96] uppercase">Payment Type</label>
                            <div className="relative">
                              <select
                                value={paymentState.cashPaymentType}
                                onChange={e => setPaymentState(prev => ({ ...prev, cashPaymentType: e.target.value as any }))}
                                className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 px-4 text-sm font-medium text-[#151a3c] outline-none appearance-none cursor-pointer"
                              >
                                <option value="partial">Paid Partial</option>
                                <option value="full">Paid Full</option>
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none" size={16} />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <button
                          onClick={handleConfirmPayment}
                          className={`w-full font-bold py-4 rounded-xl flex items-center justify-center space-x-2 shadow-md transition-all active:scale-95 text-white ${selectedMethod === 'upi' ? 'bg-[#6360DF] hover:bg-[#4c47dd]' : 'bg-[#10B981] hover:bg-[#059669]'}`}
                        >
                          <CheckCircle size={18} />
                          <span>Confirm {selectedMethod.toUpperCase()} Payment</span>
                        </button>
                        <button
                          onClick={() => setIsPaymentFormActive(false)}
                          className="w-full text-center text-xs font-bold text-[#6c7e96] hover:text-[#151a3c] py-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )
                ) : (
                  <motion.div key="success-badge" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="bg-[#D1FAE5] border border-[#10B981]/20 rounded-xl p-5 space-y-4">
                    <div className="flex items-center space-x-2 text-[#059669]">
                      <CheckCircle size={16} /><span className="text-sm font-bold">Payment Recorded</span>
                    </div>
                    <div className="pt-3 border-t border-[#10B981]/20 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-[#6c7e96]">Balance Due</span>
                        <span className="text-xl font-black text-[#10B981]">₹{paymentState.balanceDue.toLocaleString()}.00</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="h-px bg-[#d1d0eb]" />

              <button className="w-full bg-white border border-[#d1d0eb] text-[#6c7e96] font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 hover:bg-slate-50 shadow-sm transition-all active:scale-[0.98]">
                <Download size={18} /><span>Download Invoice</span>
              </button>

              <div className="h-px bg-[#d1d0eb]" />

              <button onClick={onBack} className="w-full text-center text-[#6360DF] text-sm font-bold hover:underline flex items-center justify-center">
                <ArrowLeft size={14} className="mr-1" />Back to Bookings
              </button>
            </div>
          </motion.aside>
        </div>
      </div>
    </div>
  );
};

export default BookingDetails;