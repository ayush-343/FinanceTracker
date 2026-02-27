import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isToday, isYesterday, isSameDay, isSameWeek, isSameMonth, isSameYear, differenceInDays } from 'date-fns';

// Format date for display
export const formatDate = (date: Date | string, formatStr: string = 'MMM d, yyyy'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
};

// Format date for database storage (YYYY-MM-DD)
const formatDateForDB = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

// Get today's date formatted for DB
const getTodayForDB = (): string => {
  return formatDateForDB(new Date());
};

// Get relative date string
const getRelativeDateString = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;

  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';

  const daysAgo = differenceInDays(new Date(), d);
  if (daysAgo > 0 && daysAgo < 7) return `${daysAgo} days ago`;

  return formatDate(d, 'MMM d');
};

// Get week range string
export const getWeekRangeString = (date: Date): string => {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });

  if (isSameMonth(start, end)) {
    return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`;
  }
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
};

// Get month range string
export const getMonthRangeString = (date: Date): string => {
  return format(date, 'MMMM yyyy');
};

// Get year range string
const getYearRangeString = (date: Date): string => {
  return format(date, 'yyyy');
};

// Navigate dates
const navigateDate = (
  date: Date,
  direction: 'prev' | 'next',
  period: 'day' | 'week' | 'month'
): Date => {
  const fn = direction === 'next'
    ? { day: addDays, week: addWeeks, month: addMonths }
    : { day: subDays, week: subWeeks, month: subMonths };

  return fn[period](date, 1);
};

// Get days in month for calendar
const getDaysInMonth = (date: Date): Date[] => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const days: Date[] = [];

  let current = start;
  while (current <= end) {
    days.push(current);
    current = addDays(current, 1);
  }

  return days;
};

// Get calendar grid (includes days from prev/next month for complete weeks)
export const getCalendarGrid = (date: Date): (Date | null)[] => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const startWeek = startOfWeek(start, { weekStartsOn: 0 });
  const endWeek = endOfWeek(end, { weekStartsOn: 0 });

  const grid: (Date | null)[] = [];
  let current = startWeek;

  while (current <= endWeek) {
    grid.push(current);
    current = addDays(current, 1);
  }

  return grid;
};

// Get weekday labels
export const getWeekdayLabels = (short: boolean = true): string[] => {
  return short
    ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
};

export {
  startOfMonth,
  endOfMonth,
  addDays,
  addMonths,
  isToday,
  isSameDay,
  format,
};
