import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Printer, 
  MapPin, 
  Car as CarIcon, 
  Clock,
  CheckCircle2,
  Share2,
  Link as LinkIcon,
  Banknote,
  Download,
  CheckCircle,
  CreditCard,
  UserCircle,
  ChevronDown,
  Info,
  Lock,
  X,
  Edit,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BookingDetailsProps {
  booking: any;
  mode?: 'details' | 'confirmed';
  onBack: () => void;
  onEdit: () => void;
}

const BookingDetails: React.FC<BookingDetailsProps> = ({ booking, mode = 'details', onBack, onEdit }) => {
  if (!booking) return null;

  const isConfirmation = mode === 'confirmed';

  // Payment State Management
  const [paymentState, setPaymentState] = useState({
    advanceStatus: 'pending' as 'pending' | 'paid' | 'partial',
    upiStatus: 'not_generated' as 'not_generated' | 'paid',
    cashStatus: 'not_paid' as 'not_paid' | 'paid',
    cashAmount: '3500',
    cashPaymentType: 'partial' as 'full' | 'partial',
    totalAmount: 8018,
    advanceAmount: 3500,
    balanceDue: 4518
  });

  // Flow State
  const [isPaymentFormActive, setIsPaymentFormActive] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'cash'>('upi');

  const handleConfirmPayment = () => {
    const amt = parseFloat(paymentState.cashAmount) || 0;
    const isPaid = selectedMethod === 'upi' || amt >= paymentState.advanceAmount;
    
    setPaymentState(prev => ({ 
      ...prev, 
      advanceStatus: isPaid ? 'paid' : 'partial',
      balanceDue: prev.totalAmount - (selectedMethod === 'upi' ? prev.advanceAmount : amt)
    }));
    setIsPaymentFormActive(false);
  };

  const referenceId = booking.referenceId || "BK-2024-001234";
  const customerEmail = booking.email || "arjun.sharma@example.com";
  
  const fleet = booking.vehiclesList || [
    { id: '1', name: 'Maruti Suzuki Swift', details: 'MANUAL • PETROL', quantity: 1, rate: 1200 },
    { id: '2', name: 'Hyundai i20', details: 'AUTOMATIC • PETROL', quantity: 2, rate: 1800 }
  ];

  const PaymentBreakdownContent = () => (
    <div className="space-y-6">
      <h3 className="text-[11px] font-bold text-[#6c7e96] tracking-widest uppercase">Payment Breakdown</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-[#6c7e96]">Subtotal ({fleet.reduce((acc: number, curr: any) => acc + curr.quantity, 0)} Vehicles)</span>
          <span className="font-bold text-[#151a3c]">₹4,800.00</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-[#6c7e96]">Location Surcharges</span>
          <span className="font-bold text-[#151a3c]">₹300.00</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-[#6c7e96]">Security Deposit (Refundable)</span>
          <span className="font-bold text-[#151a3c]">₹2,000.00</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-[#6c7e96]">GST (18%)</span>
          <span className="font-bold text-[#151a3c]">₹918.00</span>
        </div>
        <div className="flex justify-between items-center text-sm pt-1">
          <span className="font-medium text-[#6c7e96]">Discount</span>
          <span className="font-semibold text-[#151a3c]">-₹0.00</span>
        </div>
        <div className="h-px bg-[#d1d0eb] w-full !my-4"></div>
        <div className="flex justify-between items-center">
          <span className="text-base font-bold text-[#151a3c]">Total Amount</span>
          <span className="text-2xl font-black text-[#151a3c]">₹{paymentState.totalAmount.toLocaleString()}.00</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#D3D2EC] py-10 px-4 md:px-6">
      <div className="max-w-[1280px] mx-auto flex flex-col gap-6">
        {/* Back to Bookings Link - Page Header */}
        <button 
          onClick={onBack}
          className="text-[#6360DF] text-sm font-bold flex items-center hover:underline w-fit"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Bookings
        </button>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Main Card Section */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-[7] w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-[#d1d0eb]/30"
          >
            {/* Card Header Section */}
            <div className="px-8 md:px-10 py-6 border-b border-[#d1d0eb] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col space-y-1 text-left">
                {isConfirmation ? (
                  <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-[#151a3c] leading-none">Booking Confirmed!</h1>
                  </div>
                ) : (
                  <h1 className="text-2xl font-bold text-[#151a3c]">Booking Details</h1>
                )}
                <p className="text-[#6c7e96] text-[13px] font-medium">Reference ID: <span className="text-[#6360DF] font-bold">{referenceId}</span></p>
              </div>

              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center space-x-2 bg-white border border-[#d1d0eb] text-[#6c7e96] px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-[#F8F9FA] transition-colors"
                >
                  <Printer size={18} />
                  <span>Print {isConfirmation ? '' : 'Invoice'}</span>
                </button>
                <button className="flex items-center space-x-2 bg-white border border-[#d1d0eb] text-[#6c7e96] px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-[#F8F9FA] transition-colors">
                  <Share2 size={18} />
                  <span>Share</span>
                </button>
                <button 
                  onClick={onEdit}
                  className="flex items-center space-x-2 bg-white border border-[#d1d0eb] text-[#6360DF] px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-[#EEEDFA] transition-colors"
                >
                  <Edit size={18} />
                  <span>Edit</span>
                </button>
              </div>
            </div>

            {/* Card Content Section */}
            <div className="p-8 md:p-10 space-y-10">
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-[#6c7e96] tracking-widest uppercase text-left">Customer Information</h3>
                <div className="flex items-start space-x-4 bg-[#F8F9FA] rounded-xl p-5 text-left">
                  <UserCircle size={32} className="text-[#6360DF] mt-1 shrink-0" />
                  <div className="space-y-0.5">
                    <h4 className="text-base font-bold text-[#151a3c]">{booking.customer}</h4>
                    <p className="text-sm font-medium text-[#6c7e96]">{booking.phone || "+91 98234 56789"}</p>
                    <p className="text-sm font-medium text-[#6c7e96]">{customerEmail}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-[#6c7e96] tracking-widest uppercase text-left">Trip Itinerary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#F8F9FA] rounded-lg p-5 space-y-1 text-left">
                    <span className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase">Pickup Location</span>
                    <p className="text-sm font-bold text-[#151a3c]">{booking.location?.split(' → ')[0] || "Mapusa"}</p>
                    <p className="text-[13px] font-medium text-[#6c7e96]">20 Nov, 10:00 AM</p>
                  </div>
                  <div className="bg-[#F8F9FA] rounded-lg p-5 space-y-1 text-left">
                    <span className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase">Drop Location</span>
                    <p className="text-sm font-bold text-[#151a3c]">{booking.location?.split(' → ')[1] || "Old Goa"}</p>
                    <p className="text-[13px] font-medium text-[#6c7e96]">22 Nov, 10:00 AM</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-[#6c7e96] tracking-widest uppercase text-left">Selected Fleet</h3>
                <div className="space-y-3">
                  {fleet.map((item: any) => (
                    <div key={item.id} className="bg-[#F8F9FA] rounded-xl p-4 flex items-center justify-between border border-[#d1d0eb]/10">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-white border border-[#6360DF] rounded-lg flex items-center justify-center text-[#6360DF]">
                          <CarIcon size={20} />
                        </div>
                        <div className="text-left">
                          <h5 className="text-base font-bold text-[#151a3c] leading-tight">{item.name}</h5>
                          <p className="text-[12px] font-medium text-[#6c7e96] mt-0.5 uppercase tracking-wide">{item.details || 'MANUAL • PETROL'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#151a3c]">x{item.quantity}</p>
                        <p className="text-sm font-medium text-[#6c7e96]">₹{(item.rate || 0).toLocaleString()}.00</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#d1d0eb]/30 text-right">
                <PaymentBreakdownContent />
              </div>
            </div>
          </motion.div>

          {/* Sidebar Section */}
          <motion.aside 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-[3] w-full lg:max-w-[360px] space-y-6"
          >
            <div className="bg-white rounded-[2rem] shadow-xl border border-[#d1d0eb]/30 p-8 space-y-8 text-left">
              <h3 className="text-sm font-bold text-[#151a3c] uppercase tracking-widest">Payment Actions</h3>
              
              {/* Dynamic Payment Flow */}
              <AnimatePresence mode="wait">
                {paymentState.advanceStatus === 'pending' ? (
                  !isPaymentFormActive ? (
                    <motion.div
                      key="pay-now-btn"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                    >
                      <button 
                        onClick={() => setIsPaymentFormActive(true)}
                        className="w-full bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all active:scale-95"
                      >
                        <Lock size={18} />
                        <span>Pay Now</span>
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="payment-form"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="space-y-6"
                    >
                      {/* Method Selector */}
                      <div className="flex bg-[#F8F9FA] p-1 rounded-xl border border-[#d1d0eb]">
                        <button 
                          onClick={() => setSelectedMethod('upi')}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedMethod === 'upi' ? 'bg-white text-[#6360DF] shadow-sm' : 'text-[#6c7e96]'}`}
                        >
                          UPI
                        </button>
                        <button 
                          onClick={() => setSelectedMethod('cash')}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedMethod === 'cash' ? 'bg-white text-[#6360DF] shadow-sm' : 'text-[#6c7e96]'}`}
                        >
                          CASH
                        </button>
                      </div>

                      {/* UPI Specific: Link */}
                      {selectedMethod === 'upi' && (
                        <div className="bg-[#EEEDFA] border border-[#6360DF]/20 rounded-xl p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-[#6360DF]">
                            <LinkIcon size={16} />
                            <span className="text-xs font-bold">UPI Link Generated</span>
                          </div>
                          <button className="text-[#6360DF] hover:underline flex items-center space-x-1">
                            <span className="text-[11px] font-bold">Copy</span>
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      )}

                      {/* Inputs - Only for Cash */}
                      {selectedMethod === 'cash' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-[#6c7e96] uppercase">Amount</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6c7e96] text-sm">₹</span>
                              <input 
                                type="number" 
                                value={paymentState.cashAmount} 
                                onChange={(e) => setPaymentState(prev => ({ ...prev, cashAmount: e.target.value }))} 
                                className="w-full bg-[#F8F9FA] border border-[#d1d0eb] rounded-xl py-3 pl-10 pr-4 text-sm font-bold outline-none focus:border-[#6360DF] text-[#151a3c]" 
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-[#6c7e96] uppercase">Payment Type</label>
                            <div className="relative">
                              <select 
                                value={paymentState.cashPaymentType}
                                onChange={(e) => setPaymentState(prev => ({ ...prev, cashPaymentType: e.target.value as any }))}
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
                  <motion.div
                    key="success-badge"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-[#D1FAE5] border border-[#10B981]/20 rounded-xl p-5 space-y-4"
                  >
                    <div className="flex items-center space-x-2 text-[#059669]">
                      <CheckCircle size={16} />
                      <span className="text-sm font-bold">Payment Successful</span>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-2xl font-black text-[#10B981]">₹{parseFloat(paymentState.cashAmount).toLocaleString()}.00</p>
                    </div>

                    <div className="pt-3 border-t border-[#10B981]/20 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-[#6c7e96]">Balance</span>
                        <span className="text-2xl font-black text-[#10B981]">₹{paymentState.balanceDue.toLocaleString()}.00</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-[#6c7e96]">Method</span>
                        <span className="text-sm font-bold text-[#151a3c] uppercase tracking-wide">{selectedMethod.toUpperCase()}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="h-px bg-[#d1d0eb]" />
              
              <button className="w-full bg-white border border-[#d1d0eb] text-[#6c7e96] font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 hover:bg-slate-50 shadow-sm transition-all active:scale-[0.98]">
                <Download size={18} />
                <span>Download Invoice</span>
              </button>

              <div className="h-px bg-[#d1d0eb]" />

              <button onClick={onBack} className="w-full text-center text-[#6360DF] text-sm font-bold hover:underline flex items-center justify-center">
                <ArrowLeft size={14} className="mr-1" />
                Back to Bookings
              </button>
            </div>
          </motion.aside>
        </div>
      </div>
    </div>
  );
};

export default BookingDetails;