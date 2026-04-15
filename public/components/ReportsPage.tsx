import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Loader2, TrendingUp, Download, FileSpreadsheet, FileText,
  Calendar, ChevronDown, BarChart3, IndianRupee, Receipt,
  Car as CarIcon, AlertCircle, FileX, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase, getCurrentUser } from '../supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ─── Types ───────────────────────────────────────────────────────────────────

type ReportType =
  | 'revenue'
  | 'bookingwise'
  | 'gst'
  | 'outstanding'
  | 'utilisation';

interface KPI {
  title: string;
  value: string;
  icon: React.ReactElement;
  color: string;
  trend: string;
  trendIsPositive: boolean;
}

interface BookingRow {
  id: string;
  booking_reference: string;
  customer_name: string;
  customer_phone: string;
  pickup_at: string;
  drop_at: string;
  no_of_vehicles: number;
  total_amount: number;
  subtotal: number;
  surcharge: number;
  gst_amount: number;
  discount_amount: number;
  advance_amount: number;
  balance_amount: number;
  payment_status: string;
  status: string;
  created_at: string;
}

interface VehicleUtil {
  registration_no: string;
  model_name: string;
  total_bookings: number;
  total_days: number;
  revenue: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const getMonthRange = (): [string, string] => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return [start.toISOString().split('T')[0], end.toISOString().split('T')[0]];
};

const getQuarterRange = (): [string, string] => {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const start = new Date(now.getFullYear(), q * 3, 1);
  const end = new Date(now.getFullYear(), q * 3 + 3, 0);
  return [start.toISOString().split('T')[0], end.toISOString().split('T')[0]];
};

const getYearRange = (): [string, string] => {
  const now = new Date();
  return [`${now.getFullYear()}-01-01`, `${now.getFullYear()}-12-31`];
};

const daysBetween = (a: string, b: string) => {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / 86400000));
};

const daysSince = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
};

// ─── Report Labels ───────────────────────────────────────────────────────────

const reportLabels: Record<ReportType, string> = {
  revenue: 'Revenue Summary',
  bookingwise: 'Booking-wise Report',
  gst: 'GST Report (for CA)',
  outstanding: 'Outstanding Payments',
  utilisation: 'Vehicle Utilisation',
};

// ─── KPI Card ────────────────────────────────────────────────────────────────

const KPICard: React.FC<KPI & { index: number }> = ({ title, value, icon, color, trend, trendIsPositive, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * index + 0.1 }}
    className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50 flex items-start justify-between group hover:shadow-xl transition-all hover:shadow-[#6360df08]"
  >
    <div className="space-y-1">
      <p className="text-[#6c7e96] text-[13px] font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-[#151a3c]">{value}</h3>
      <div className="flex items-center pt-1">
        <TrendingUp className={`w-3.5 h-3.5 mr-1 ${trendIsPositive ? 'text-green-500' : 'text-red-400'}`} />
        <span className={`text-[11px] font-bold ${trendIsPositive ? 'text-green-500' : 'text-red-400'}`}>{trend}</span>
      </div>
    </div>
    <div className={`p-4 rounded-2xl ${color} text-white shadow-lg group-hover:scale-110 transition-transform flex items-center justify-center`}>
      {React.cloneElement(icon as React.ReactElement<any>, { size: 22 })}
    </div>
  </motion.div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

const ReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportType>('revenue');
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [vehicleUtils, setVehicleUtils] = useState<VehicleUtil[]>([]);
  const [dateFrom, setDateFrom] = useState(getMonthRange()[0]);
  const [dateTo, setDateTo] = useState(getMonthRange()[1]);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  // ── Bootstrap owner_id ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      const authUser = await getCurrentUser();
      if (!authUser) return;
      const { data } = await supabase.from('owners').select('id').eq('user_id', authUser.id).single();
      if (data) setOwnerId(data.id);
    })();
  }, []);

  // ── Fetch data when owner / dates / report type change ─────
  const loadData = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      // Always load bookings for KPI + most reports
      const { data: bData, error: bErr } = await supabase
        .from('bookings')
        .select('id, booking_reference, customer_name, customer_phone, pickup_at, drop_at, no_of_vehicles, total_amount, subtotal, surcharge, gst_amount, discount_amount, advance_amount, balance_amount, payment_status, status, created_at')
        .eq('owner_id', ownerId)
        .gte('pickup_at', `${dateFrom}T00:00:00`)
        .lte('pickup_at', `${dateTo}T23:59:59`)
        .order('pickup_at', { ascending: false });

      if (bErr) { toast.error('Failed to load bookings'); console.error(bErr); }
      setBookings((bData as BookingRow[]) || []);

      // Vehicle utilisation needs a separate query
      if (reportType === 'utilisation') {
        const { data: bdData, error: bdErr } = await supabase
          .from('booking_details')
          .select('id, booking_id, vehicle_id, daily_rate, bookings!inner(owner_id, pickup_at, drop_at), vehicles!inner(registration_no, models(brand, name))')
          .eq('bookings.owner_id', ownerId)
          .gte('bookings.pickup_at', `${dateFrom}T00:00:00`)
          .lte('bookings.pickup_at', `${dateTo}T23:59:59`);

        if (bdErr) { toast.error('Failed to load vehicle data'); console.error(bdErr); }

        // Aggregate per vehicle
        const map = new Map<string, VehicleUtil>();
        ((bdData as any[]) || []).forEach((d: any) => {
          const regNo = d.vehicles?.registration_no || '—';
          const modelName = d.vehicles?.models ? `${d.vehicles.models.brand} ${d.vehicles.models.name}` : '—';
          const days = daysBetween(d.bookings?.pickup_at, d.bookings?.drop_at);
          const rev = (d.daily_rate || 0) * days;
          const ex = map.get(regNo) || { registration_no: regNo, model_name: modelName, total_bookings: 0, total_days: 0, revenue: 0 };
          ex.total_bookings += 1;
          ex.total_days += days;
          ex.revenue += rev;
          map.set(regNo, ex);
        });
        setVehicleUtils(Array.from(map.values()).sort((a, b) => b.revenue - a.revenue));
      }
    } catch (e) {
      console.error(e);
      toast.error('Error loading report data');
    } finally {
      setLoading(false);
    }
  }, [ownerId, dateFrom, dateTo, reportType]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Computed KPIs ──────────────────────────────────────────
  const kpis: KPI[] = useMemo(() => {
    const totalRev = bookings.reduce((s, b) => s + (b.total_amount || 0), 0);
    const totalGST = bookings.reduce((s, b) => s + (b.gst_amount || 0), 0);
    const outstanding = bookings
      .filter(b => b.payment_status === 'UNPAID' || b.payment_status === 'PARTIAL')
      .reduce((s, b) => s + (b.balance_amount || 0), 0);

    return [
      { title: 'Total Revenue', value: fmt(totalRev), icon: <IndianRupee />, color: 'bg-[#6360DF]', trend: `${bookings.length} bookings`, trendIsPositive: true },
      { title: 'Total Bookings', value: bookings.length.toString(), icon: <Receipt />, color: 'bg-blue-500', trend: 'In selected period', trendIsPositive: true },
      { title: 'Total GST Collected', value: fmt(totalGST), icon: <BarChart3 />, color: 'bg-green-500', trend: `${bookings.filter(b => (b.gst_amount || 0) > 0).length} taxable`, trendIsPositive: true },
      { title: 'Outstanding Amount', value: fmt(outstanding), icon: <AlertCircle />, color: outstanding > 0 ? 'bg-red-500' : 'bg-slate-400', trend: outstanding > 0 ? 'Action needed' : 'All clear', trendIsPositive: outstanding === 0 },
    ];
  }, [bookings]);

  // ── Filtered data per report ───────────────────────────────
  const gstBookings = useMemo(() => bookings.filter(b => (b.gst_amount || 0) > 0), [bookings]);
  const outstandingBookings = useMemo(() => bookings.filter(b => b.payment_status === 'UNPAID' || b.payment_status === 'PARTIAL'), [bookings]);

  // ── Revenue summary aggregates ─────────────────────────────
  const revSummary = useMemo(() => {
    const total = bookings.reduce((s, b) => s + (b.total_amount || 0), 0);
    const subtotal = bookings.reduce((s, b) => s + (b.subtotal || 0), 0);
    const surcharge = bookings.reduce((s, b) => s + (b.surcharge || 0), 0);
    const gst = bookings.reduce((s, b) => s + (b.gst_amount || 0), 0);
    const discount = bookings.reduce((s, b) => s + (b.discount_amount || 0), 0);
    const net = total - discount;
    return { total, subtotal, surcharge, gst, discount, net };
  }, [bookings]);

  // ── Table Columns / Rows per report type ───────────────────
  const getColumns = (): string[] => {
    switch (reportType) {
      case 'revenue': return ['Metric', 'Amount'];
      case 'bookingwise': return ['Ref #', 'Customer', 'Pickup', 'Drop', 'Vehicles', 'Total', 'Payment Status'];
      case 'gst': return ['Ref #', 'Customer', 'Date', 'Taxable Amount', 'GST Rate', 'GST Amount', 'Total'];
      case 'outstanding': return ['Ref #', 'Customer', 'Total', 'Advance', 'Balance', 'Days Since Booking'];
      case 'utilisation': return ['Registration No', 'Model', 'Total Bookings', 'Total Days Rented', 'Revenue Generated'];
    }
  };

  const getRows = (): string[][] => {
    switch (reportType) {
      case 'revenue':
        return [
          ['Total Revenue (Gross)', fmt(revSummary.total)],
          ['Subtotal (Base)', fmt(revSummary.subtotal)],
          ['Surcharges', fmt(revSummary.surcharge)],
          ['GST Collected', fmt(revSummary.gst)],
          ['Discounts Given', fmt(revSummary.discount)],
          ['Net Revenue', fmt(revSummary.net)],
        ];
      case 'bookingwise':
        return bookings.map(b => [
          b.booking_reference || '—',
          b.customer_name,
          fmtDate(b.pickup_at),
          fmtDate(b.drop_at),
          b.no_of_vehicles.toString(),
          fmt(b.total_amount || 0),
          b.payment_status || '—',
        ]);
      case 'gst':
        return gstBookings.map(b => [
          b.booking_reference || '—',
          b.customer_name,
          fmtDate(b.pickup_at),
          fmt(b.subtotal || 0),
          '18%',
          fmt(b.gst_amount || 0),
          fmt(b.total_amount || 0),
        ]);
      case 'outstanding':
        return outstandingBookings.map(b => [
          b.booking_reference || '—',
          b.customer_name,
          fmt(b.total_amount || 0),
          fmt(b.advance_amount || 0),
          fmt(b.balance_amount || 0),
          `${daysSince(b.created_at)} days`,
        ]);
      case 'utilisation':
        return vehicleUtils.map(v => [
          v.registration_no,
          v.model_name,
          v.total_bookings.toString(),
          `${v.total_days} days`,
          fmt(v.revenue),
        ]);
    }
  };

  const getSummaryRow = (): string[] | null => {
    switch (reportType) {
      case 'bookingwise': {
        const total = bookings.reduce((s, b) => s + (b.total_amount || 0), 0);
        return ['', `Total: ${bookings.length}`, '', '', '', fmt(total), ''];
      }
      case 'gst': {
        const taxable = gstBookings.reduce((s, b) => s + (b.subtotal || 0), 0);
        const gst = gstBookings.reduce((s, b) => s + (b.gst_amount || 0), 0);
        const total = gstBookings.reduce((s, b) => s + (b.total_amount || 0), 0);
        return ['', `Total: ${gstBookings.length}`, '', fmt(taxable), '', fmt(gst), fmt(total)];
      }
      case 'outstanding': {
        const total = outstandingBookings.reduce((s, b) => s + (b.total_amount || 0), 0);
        const advance = outstandingBookings.reduce((s, b) => s + (b.advance_amount || 0), 0);
        const balance = outstandingBookings.reduce((s, b) => s + (b.balance_amount || 0), 0);
        return ['', `Total: ${outstandingBookings.length}`, fmt(total), fmt(advance), fmt(balance), ''];
      }
      case 'utilisation': {
        const tb = vehicleUtils.reduce((s, v) => s + v.total_bookings, 0);
        const td = vehicleUtils.reduce((s, v) => s + v.total_days, 0);
        const rev = vehicleUtils.reduce((s, v) => s + v.revenue, 0);
        return ['', `Total: ${vehicleUtils.length} vehicles`, tb.toString(), `${td} days`, fmt(rev)];
      }
      default: return null;
    }
  };

  // ── Export PDF ──────────────────────────────────────────────
  const exportPDF = async () => {
    setExporting('pdf');
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const title = reportLabels[reportType];

      // Header
      doc.setFontSize(18);
      doc.setTextColor(21, 26, 60);
      doc.text('GaadiZai — Fleet Reports', 14, 18);
      doc.setFontSize(12);
      doc.setTextColor(108, 126, 150);
      doc.text(`${title}  |  ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`, 14, 26);
      doc.setDrawColor(209, 208, 235);
      doc.line(14, 29, 283, 29);

      const columns = getColumns();
      const rows = getRows();
      const summary = getSummaryRow();

      const body = [...rows];
      if (summary) body.push(summary);

      autoTable(doc, {
        startY: 34,
        head: [columns],
        body,
        theme: 'grid',
        headStyles: { fillColor: [99, 96, 223], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8.5, textColor: [21, 26, 60] },
        alternateRowStyles: { fillColor: [248, 247, 255] },
        didParseCell: (data) => {
          // Bold summary row
          if (summary && data.row.index === rows.length) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [238, 237, 250];
          }
        },
        margin: { left: 14, right: 14 },
      });

      doc.save(`GaadiZai_${title.replace(/\s+/g, '_')}_${dateFrom}_to_${dateTo}.pdf`);
      toast.success('PDF downloaded!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(null);
    }
  };

  // ── Export Excel ────────────────────────────────────────────
  const exportExcel = async () => {
    setExporting('excel');
    try {
      const title = reportLabels[reportType];
      const columns = getColumns();
      const rows = getRows();
      const summary = getSummaryRow();

      const sheetData = [columns, ...rows];
      if (summary) sheetData.push(summary);

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      // Auto-width
      ws['!cols'] = columns.map((_, ci) => ({
        wch: Math.max(columns[ci].length, ...rows.map(r => (r[ci] || '').length), 14),
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
      XLSX.writeFile(wb, `GaadiZai_${title.replace(/\s+/g, '_')}_${dateFrom}_to_${dateTo}.xlsx`);
      toast.success('Excel downloaded!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to export Excel');
    } finally {
      setExporting(null);
    }
  };

  // ── Payment status badge ───────────────────────────────────
  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PAID: 'bg-[#D1FAE5] text-[#059669]',
      UNPAID: 'bg-red-50 text-red-600',
      PARTIAL: 'bg-[#FEF3C7] text-[#D97706]',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest ${map[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  // ── Render ─────────────────────────────────────────────────
  const columns = getColumns();
  const rows = getRows();
  const summaryRow = getSummaryRow();

  return (
    <div className="min-h-full">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-[24px] font-extrabold text-[#151a3c] tracking-tight">Reports</h2>
            <p className="text-[#6c7e96] text-sm font-medium mt-1 opacity-80">
              Generate, view and export business reports
            </p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button whileTap={{ scale: 0.95 }} onClick={loadData}
              className="flex items-center space-x-2 bg-white border border-[#d1d0eb] text-[#6c7e96] px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#EEEDFA] hover:text-[#6360DF] transition-all">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /><span>Refresh</span>
            </motion.button>
            <button onClick={exportPDF} disabled={loading || exporting !== null}
              className="flex items-center space-x-2 bg-white border border-[#d1d0eb] text-[#6c7e96] px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-50">
              {exporting === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              <span>Export PDF</span>
            </button>
            <button onClick={exportExcel} disabled={loading || exporting !== null}
              className="flex items-center space-x-2 bg-white border border-[#d1d0eb] text-[#6c7e96] px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all disabled:opacity-50">
              {exporting === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 px-8 py-5">
          <div className="flex flex-wrap items-center gap-4">
            {/* Report type selector */}
            <div className="relative min-w-[220px]">
              <label className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest mb-1 block">Report Type</label>
              <div className="relative">
                <select
                  value={reportType}
                  onChange={e => setReportType(e.target.value as ReportType)}
                  className="w-full bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl py-2.5 px-4 pr-10 text-sm font-bold text-[#151a3c] outline-none focus:border-[#6360DF] transition-all appearance-none cursor-pointer"
                >
                  {(Object.entries(reportLabels) as [ReportType, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c7e96] pointer-events-none" />
              </div>
            </div>

            {/* Date From */}
            <div className="min-w-[160px]">
              <label className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest mb-1 block">From</label>
              <div className="flex items-center bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl px-4 py-2.5">
                <Calendar size={14} className="text-[#6c7e96] mr-2 shrink-0" />
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="bg-transparent text-sm font-bold text-[#151a3c] outline-none w-[120px] cursor-pointer" />
              </div>
            </div>

            {/* Date To */}
            <div className="min-w-[160px]">
              <label className="text-[10px] font-bold text-[#6c7e96] uppercase tracking-widest mb-1 block">To</label>
              <div className="flex items-center bg-[#f8f7ff] border border-[#d1d0eb] rounded-xl px-4 py-2.5">
                <Calendar size={14} className="text-[#6c7e96] mr-2 shrink-0" />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="bg-transparent text-sm font-bold text-[#151a3c] outline-none w-[120px] cursor-pointer" />
              </div>
            </div>

            {/* Quick presets */}
            <div className="flex items-end gap-2 pt-4">
              <button onClick={() => { const [f, t] = getMonthRange(); setDateFrom(f); setDateTo(t); }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#EEEDFA] text-[#6360DF] hover:bg-[#6360DF] hover:text-white transition-all">
                This Month
              </button>
              <button onClick={() => { const [f, t] = getQuarterRange(); setDateFrom(f); setDateTo(t); }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#EEEDFA] text-[#6360DF] hover:bg-[#6360DF] hover:text-white transition-all">
                This Quarter
              </button>
              <button onClick={() => { const [f, t] = getYearRange(); setDateFrom(f); setDateTo(t); }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#EEEDFA] text-[#6360DF] hover:bg-[#6360DF] hover:text-white transition-all">
                This Year
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {kpis.map((k, i) => <KPICard key={k.title} {...k} index={i} />)}
        </div>

        {/* ── Report Table ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white rounded-[2rem] shadow-sm border border-[#d1d0eb]/30 overflow-hidden">
          {/* Table header */}
          <div className="flex items-center justify-between px-10 py-6 border-b border-[#d1d0eb]/20">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-[#EEEDFA] text-[#6360DF]">
                <BarChart3 size={18} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#151a3c]">{reportLabels[reportType]}</h3>
                <p className="text-xs text-[#6c7e96] font-medium mt-0.5">
                  {fmtDate(dateFrom)} — {fmtDate(dateTo)} · {rows.length} {rows.length === 1 ? 'record' : 'records'}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F8F9FA]/50 text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase border-b border-[#d1d0eb]/20">
                  {columns.map((col, i) => (
                    <th key={col} className={`${i === 0 ? 'pl-10' : 'px-6'} py-5 font-bold`}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d1d0eb]/20">
                {loading ? (
                  <tr>
                    <td colSpan={columns.length} className="py-16 text-center">
                      <div className="flex items-center justify-center text-[#6c7e96]">
                        <Loader2 size={22} className="animate-spin mr-2" />
                        <span className="text-sm font-medium">Loading report data...</span>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-[#EEEDFA] flex items-center justify-center text-[#6c7e96]">
                          <FileX size={28} />
                        </div>
                        <p className="text-sm font-medium text-[#6c7e96]">No data found for the selected date range</p>
                        <p className="text-xs text-[#6c7e96]/70">Try adjusting the dates or report type</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {rows.map((row, ri) => (
                      <motion.tr key={ri} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(ri * 0.03, 0.5) }}
                        className="group hover:bg-[#F8F9FA] transition-colors">
                        {row.map((cell, ci) => (
                          <td key={ci} className={`py-5 ${ci === 0 ? 'pl-10' : 'px-6'} text-sm font-medium text-[#151a3c] whitespace-nowrap`}>
                            {/* Show badges for payment status column */}
                            {reportType === 'bookingwise' && ci === 6
                              ? statusBadge(cell)
                              : reportType === 'revenue' && ci === 0
                                ? <span className="font-bold">{cell}</span>
                                : cell
                            }
                          </td>
                        ))}
                      </motion.tr>
                    ))}
                    {/* Summary row */}
                    {summaryRow && (
                      <tr className="bg-[#EEEDFA]/60 border-t-2 border-[#d1d0eb]/40">
                        {summaryRow.map((cell, ci) => (
                          <td key={ci} className={`py-5 ${ci === 0 ? 'pl-10' : 'px-6'} text-sm font-extrabold text-[#151a3c] whitespace-nowrap`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default ReportsPage;
