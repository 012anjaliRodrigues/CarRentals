// ─────────────────────────────────────────────────────────────────────────────
// dayCalculator.ts
// Shared billing day calculation utility used by CreateNewBooking + BookingDetails.
//
// A "billing day" resets at dayStartTime (e.g. 09:00 AM).
//
// Example: pickup 19 Mar 1:30 PM → drop 22 Mar 1:30 PM, day start 09:00 AM
//   Day 1 : 19 Mar 1:30 PM → 20 Mar 9:00 AM   (partial start → 1 day)
//   Day 2 : 20 Mar 9:00 AM → 21 Mar 9:00 AM   (full day)
//   Day 3 : 21 Mar 9:00 AM → 22 Mar 9:00 AM   (full day)
//   Day 4 : 22 Mar 9:00 AM → 22 Mar 1:30 PM   (4.5 h — if halfDayHours=6 → half day)
//   Total : 3.5 days
// ─────────────────────────────────────────────────────────────────────────────

export interface DaySegment {
    label:  string;  // "Day 1", "Day 2", …
    from:   string;  // formatted datetime string
    to:     string;  // formatted datetime string
    type:   'partial-start' | 'full' | 'half' | 'full-extra';
    charge: number;  // 0.5 or 1.0
  }
  
  export interface DayCalcResult {
    totalDays: number;       // e.g. 3.5
    breakdown: DaySegment[]; // human-readable segments
  }
  
  /**
   * Calculate billing days between pickup and drop.
   *
   * @param pickupISO    ISO datetime string
   * @param dropISO      ISO datetime string
   * @param dayStartTime "HH:MM" e.g. "09:00"
   * @param halfDayHours number — if remaining hours after last boundary ≤ this → half day (0.5)
   */
  export function calculateBillingDays(
    pickupISO:    string,
    dropISO:      string,
    dayStartTime: string,
    halfDayHours: number,
  ): DayCalcResult {
    const pickup = new Date(pickupISO);
    const drop   = new Date(dropISO);
  
    if (drop <= pickup) return { totalDays: 0, breakdown: [] };
  
    const [dsh, dsm] = dayStartTime.split(':').map(Number);
  
    // Returns the next day-boundary AT OR AFTER `from`
    const nextBoundary = (from: Date): Date => {
      const b = new Date(from);
      b.setHours(dsh, dsm, 0, 0);
      if (b <= from) b.setDate(b.getDate() + 1);
      return b;
    };
  
    const fmt = (d: Date): string =>
      d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
  
    const segments: DaySegment[] = [];
    let dayCount  = 0;
    let segIndex  = 1;
  
    const firstBoundary = nextBoundary(pickup);
  
    // ── Edge case: drop is before (or at) the first boundary ───
    if (firstBoundary >= drop) {
      const diffH = (drop.getTime() - pickup.getTime()) / 3_600_000;
      const charge = diffH <= halfDayHours ? 0.5 : 1.0;
      segments.push({
        label:  'Day 1',
        from:   fmt(pickup),
        to:     fmt(drop),
        type:   charge === 0.5 ? 'half' : 'partial-start',
        charge,
      });
      return { totalDays: charge, breakdown: segments };
    }
  
    // ── Day 1: pickup → first boundary ─────────────────────────
    segments.push({
      label:  `Day ${segIndex++}`,
      from:   fmt(pickup),
      to:     fmt(firstBoundary),
      type:   'partial-start',
      charge: 1.0,
    });
    dayCount += 1;
    let current = firstBoundary;
  
    // ── Full days: boundary → boundary ─────────────────────────
    while (true) {
      const next = new Date(current);
      next.setDate(next.getDate() + 1); // +24 h
      if (next >= drop) break;
      segments.push({
        label:  `Day ${segIndex++}`,
        from:   fmt(current),
        to:     fmt(next),
        type:   'full',
        charge: 1.0,
      });
      dayCount += 1;
      current = next;
    }
  
    // ── Remaining time after last boundary ─────────────────────
    const remainingH = (drop.getTime() - current.getTime()) / 3_600_000;
    if (remainingH > 0) {
      const isHalf = remainingH <= halfDayHours;
      const charge = isHalf ? 0.5 : 1.0;
      segments.push({
        label:  `Day ${segIndex}`,
        from:   fmt(current),
        to:     fmt(drop),
        type:   isHalf ? 'half' : 'full-extra',
        charge,
      });
      dayCount += charge;
    }
  
    return { totalDays: dayCount, breakdown: segments };
  }
  
  /** Format totalDays into a human-readable string */
  export function formatDays(totalDays: number): string {
    if (totalDays === 0)   return '0 days';
    if (totalDays === 0.5) return '½ day';
    const hasHalf = totalDays % 1 !== 0;
    const whole   = Math.floor(totalDays);
    if (hasHalf) return `${whole}.5 days (incl. ½ day)`;
    return `${totalDays} day${totalDays !== 1 ? 's' : ''}`;
  }