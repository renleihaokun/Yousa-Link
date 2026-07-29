import toursData from '../data/tours.json';

export type Coordinates = readonly [number, number];

export type Tour = {
  id: string;
  coordinates: Coordinates;
  from: string;
  to: string;
  date: string;
  dateDisplay: string;
  status: string;
  delay: number;
  venue: string;
  trainNumber: string;
  waitingRoom: string;
};

export type TourScheduleItem = Tour & {
  dateObj: Date | null;
  effectiveDate: Date;
  daysText: string;
  delayText: string;
  isPast: boolean;
};

export type TourCity = {
  name: string;
  value: Coordinates;
};

const TOURS = toursData.tours as Tour[];
const MS_PER_DAY = 86_400_000;

function startOfLocalDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function getTours() {
  return TOURS;
}

export function getEffectiveDate(tour: Tour) {
  if (!tour.date) return null;
  const date = new Date(`${tour.date}T00:00:00`);
  date.setDate(date.getDate() + (tour.delay || 0));
  return date;
}

export function getNextTour(now = new Date()) {
  const today = startOfLocalDay(now).getTime();
  return TOURS
    .map((tour, index) => ({ tour, index, time: getEffectiveDate(tour)?.getTime() ?? Number.POSITIVE_INFINITY }))
    .filter(({ time }) => time >= today)
    .sort((first, second) => first.time - second.time || first.index - second.index)[0]?.tour;
}

export function getTourSchedule(now = new Date()): TourScheduleItem[] {
  const today = startOfLocalDay(now).getTime();
  return TOURS.map((tour) => {
    const dateObj = tour.date ? new Date(`${tour.date}T00:00:00`) : null;
    const effectiveDate = getEffectiveDate(tour) ?? new Date(9999, 0, 1);
    const days = tour.date ? Math.round((effectiveDate.getTime() - today) / MS_PER_DAY) : Number.POSITIVE_INFINITY;
    const daysText = !tour.date ? '待定' : days > 0 ? `${days}天后` : days < 0 ? `${Math.abs(days)}天前` : '今天';
    const delay = tour.delay || 0;
    const delayText = !tour.date ? '' : delay > 0 ? `晚点${delay}天` : delay < 0 ? `提前${Math.abs(delay)}天` : '正点';
    return { ...tour, dateObj, effectiveDate, daysText, delayText, isPast: days < 0 };
  }).sort((first, second) => first.effectiveDate.getTime() - second.effectiveDate.getTime());
}

export function getTourCities(): TourCity[] {
  return TOURS.map((tour) => ({ name: tour.to, value: tour.coordinates }));
}

export function getTourRoutes() {
  return TOURS.slice(1).map((tour, index) => ({
    from: TOURS[index].coordinates,
    to: tour.coordinates
  }));
}
