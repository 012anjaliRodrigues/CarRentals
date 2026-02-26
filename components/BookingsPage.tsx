import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Calendar, 
  Plus, 
  MapPin,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase, getCurrentUser } from '../supabaseClient';
import CreateNewBooking from './CreateNewBooking';
import BookingDetails from './BookingDetails';

interface Booking {
  id: string;
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
  // raw fields for detail view
  raw?: any;
}

const BookingsPage: React.FC = () => {
  const [view, setView] = useState<'list' | 'create' | 'details' | 'confirmed'>('list');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookingData, setBookingData] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Load bookings from DB ─────────────────────────────────
  const loadBookings = async () => {
    setLoading(true);
    const authUser = await getCurrentUser();
    if (!authUser) { setLoading(false); return; }

    const { data: ownerRow } = await supabase
      .from('owners').select('id').eq('user_id', authUser.id).single();
    if (!ownerRow) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('owner_id', ownerRow.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load bookings.');
      setLoading(false);
      return;
    }

    const mapped: Booking[] = (data || []).map((b: any) => {
      const initials = b.customer_name
        .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
      const pickupDate = new Date(b.pickup_at);
      const dropDate = new Date(b.drop_at);
      const fmt = (d: Date) => d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
      }).toUpperCase();

      return {
        id: b.id,
        date: new Date(b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        customer: b.customer_name,
        initials,
        bookingPeriod: `${fmt(pickupDate)} — ${fmt(dropDate)}`,
        location: `${b.pickup_location} → ${b.drop_location}`,
        vehicles: b.no_of_vehicles,
        total: `₹${Number(b.total_amount).toLocaleString()}`,
        advance: `₹${Number(b.advance_amount || 0).toLocaleString()}`,
        balance: `₹${Number(b.balance_amount || 0).toLocaleString()}`,
        status: b.status as Booking['status'],
        phone: b.customer_phone,
        raw: b,
      };
    });

    setBookingData(mapped);
    setLoading(false);
  };
  // ─────────────────────────────────────────────────────────

  useEffect(() => { loadBookings(); }, []);

  const getStatusStyle = (status: Booking['status']) => {
    switch (status) {
      case 'BOOKED':    return 'bg-[#EEEDFA] text-[#6360DF]';
      case 'COMPLETED': return 'bg-[#D1FAE5] text-[#059669]';
      case 'ONGOING':   return 'bg-[#FEF3C7] text-[#D97706]';
      default:          return 'bg-gray-100 text-gray-600';
    }
  };

  const handleConfirmBooking = (data: any) => {
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
    // Reload list so new booking appears
    loadBookings();
  };

  const handleRowClick = (booking: Booking) => {
    setSelectedBooking(booking.raw || booking);
    setView('details');
  };

  const filtered = bookingData.filter(b =>
    b.customer.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-[#d1d0eb] rounded-full py-2.5 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#6360DF]/10 focus:border-[#6360DF] transition-all"
                  />
                </div>

                <div className="flex items-center space-x-2 bg-white px-4 py-2.5 rounded-xl border border-[#d1d0eb] text-sm font-semibold text-[#151a3c]">
                  <Calendar size={16} className="text-[#6c7e96]" />
                  <span>{new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
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
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="flex items-center justify-center text-[#6c7e96]">
                            <Loader2 size={22} className="animate-spin mr-2" />
                            <span className="text-sm font-medium">Loading bookings...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-[#6c7e96] text-sm font-medium">
                          {bookingData.length === 0 ? 'No bookings yet. Click "New Booking" to get started.' : 'No bookings match your search.'}
                        </td>
                      </tr>
                    ) : (
                      filtered.map((booking) => (
                        <tr 
                          key={booking.id}
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
                      ))
                    )}
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