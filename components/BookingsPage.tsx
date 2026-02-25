
import React, { useState } from 'react';
import { 
  Search, 
  Calendar, 
  Filter, 
  Plus, 
  MapPin, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CreateNewBooking from './CreateNewBooking';
import BookingDetails from './BookingDetails';

interface Booking {
  date: string;
  customer: string;
  initials: string;
  bookingPeriod: string;
  location: string;
  vehicles: number;
  total: string;
  advance: string;
  balance: string;
  status: 'BOOKED' | 'COMPLETED' | 'ONGOING';
  phone?: string;
}

const BookingsPage: React.FC = () => {
  const [view, setView] = useState<'list' | 'create' | 'details' | 'confirmed'>('list');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const bookingData: Booking[] = [
    {
      date: "20 Oct 2023",
      customer: "Arjun Sharma",
      initials: "AS",
      bookingPeriod: "22 Oct, 10:00 AM — 25 Oct, 10:00 AM",
      location: "Mapusa → Old Goa",
      vehicles: 2,
      total: "₹8,500",
      advance: "₹2,000",
      balance: "₹6,500",
      status: "BOOKED",
      phone: "+91 98234 56789"
    },
    {
      date: "19 Oct 2023",
      customer: "Priya Naik",
      initials: "PN",
      bookingPeriod: "21 Oct, 10:00 AM — 23 Oct, 10:00 AM",
      location: "Calangute → Airport",
      vehicles: 1,
      total: "₹4,200",
      advance: "₹1,000",
      balance: "₹3,200",
      status: "COMPLETED"
    },
    {
      date: "19 Oct 2023",
      customer: "Rohan Mehra",
      initials: "RM",
      bookingPeriod: "21 Oct, 11:30 AM — 22 Oct, 09:00 PM",
      location: "Margao → Vasco",
      vehicles: 3,
      total: "₹12,400",
      advance: "₹3,000",
      balance: "₹9,400",
      status: "ONGOING"
    },
    {
      date: "18 Oct 2023",
      customer: "Sneha Patil",
      initials: "SP",
      bookingPeriod: "20 Oct, 09:00 AM — 22 Oct, 06:00 PM",
      location: "Panjim → Candolim",
      vehicles: 1,
      total: "₹3,800",
      advance: "₹1,000",
      balance: "₹2,800",
      status: "BOOKED",
      phone: "+91 98765 43210"
    }
  ];

  const getStatusStyle = (status: Booking['status']) => {
    switch (status) {
      case 'BOOKED': return 'bg-[#EEEDFA] text-[#6360DF]';
      case 'COMPLETED': return 'bg-[#D1FAE5] text-[#059669]';
      case 'ONGOING': return 'bg-[#FEF3C7] text-[#D97706]';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const handleConfirmBooking = (data: any) => {
    // Map data from CreateNewBooking to the shape expected by BookingDetails
    const mappedBooking = {
      ...data,
      customer: data.customer.fullName,
      phone: data.customer.phone,
      location: `${data.customer.pickupLocation} → ${data.customer.dropLocation}`,
      pickupDate: data.customer.pickupDateTime,
      dropDate: data.customer.returnDateTime,
      pricing: data.pricing
    };
    setSelectedBooking(mappedBooking);
    setView('confirmed');
  };

  const handleRowClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setView('details');
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
            className="space-y-6 pb-10"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-[24px] font-extrabold text-[#151a3c] tracking-tight">Bookings</h2>
                <p className="text-[#6c7e96] text-sm font-medium mt-1 opacity-80">Manage your fleet schedules and client requests</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative group min-w-[200px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cbd5e1] w-4 h-4 group-focus-within:text-[#6360DF] transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search customer..."
                    className="w-full bg-white border border-[#d1d0eb] rounded-full py-2.5 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all"
                  />
                </div>

                <div className="flex items-center space-x-2 bg-white px-4 py-2.5 rounded-xl border border-[#d1d0eb] text-sm font-semibold text-[#151a3c]">
                  <Calendar size={16} className="text-[#6c7e96]" />
                  <span>Oct 2023</span>
                </div>

                <button 
                  onClick={() => setView('create')}
                  className="bg-[#6360DF] hover:bg-[#5451d0] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-[#6360df33] transition-all flex items-center space-x-2"
                >
                  <Plus size={18} />
                  <span>New Booking</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#F8F9FA]/50 text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/20">
                      <th className="pl-10 py-5 font-bold">Booking Date</th>
                      <th className="px-6 py-5 font-bold">Customer Name</th>
                      <th className="px-6 py-5 font-bold">Date & Time (From-To)</th>
                      <th className="px-6 py-5 font-bold">Location (From-To)</th>
                      <th className="px-6 py-5 font-bold text-center">No. of Vehicles</th>
                      <th className="px-6 py-5 font-bold">Total</th>
                      <th className="px-6 py-5 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d1d0eb]/20">
                    {bookingData.map((booking, idx) => (
                      <tr 
                        key={idx} 
                        onClick={() => handleRowClick(booking)}
                        className="group hover:bg-[#F8F9FA] transition-colors cursor-pointer"
                      >
                        <td className="py-5 pl-10 text-sm font-medium text-[#151a3c] whitespace-nowrap">
                          {booking.date}
                        </td>
                        <td className="py-5 px-6 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-[#EEEDFA] flex items-center justify-center text-[#6360DF] text-[11px] font-extrabold">
                              {booking.initials}
                            </div>
                            <span className="font-bold text-[#151a3c] text-sm group-hover:text-[#6360DF] transition-colors">{booking.customer}</span>
                          </div>
                        </td>
                        <td className="py-5 px-6 text-sm font-medium text-[#151a3c] whitespace-nowrap">
                          {booking.bookingPeriod}
                        </td>
                        <td className="py-5 px-6 whitespace-nowrap">
                          <div className="flex items-center space-x-2 text-[#6c7e96] text-sm font-medium">
                            <MapPin size={14} className="text-[#6360DF]" />
                            <span>{booking.location}</span>
                          </div>
                        </td>
                        <td className="py-5 px-6 text-center">
                          <span className="inline-block bg-[#f1f5f9] px-2.5 py-1 rounded-md text-sm font-bold text-[#151a3c]">
                            {booking.vehicles}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-sm font-extrabold text-[#151a3c]">
                          {booking.total}
                        </td>
                        <td className="py-5 px-6">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-extrabold tracking-widest ${getStatusStyle(booking.status)}`}>
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'create' && (
          <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <CreateNewBooking onBack={() => setView('list')} onConfirm={handleConfirmBooking} />
          </motion.div>
        )}

        {view === 'details' && selectedBooking && (
          <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <BookingDetails 
              booking={selectedBooking} 
              mode="details"
              onBack={() => setView('list')} 
              onEdit={() => console.log('Edit booking:', selectedBooking)}
            />
          </motion.div>
        )}

        {view === 'confirmed' && selectedBooking && (
          <motion.div key="confirmed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <BookingDetails 
              booking={selectedBooking} 
              mode="confirmed"
              onBack={() => setView('list')} 
              onEdit={() => {}}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingsPage;
