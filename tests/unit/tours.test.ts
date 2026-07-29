import { describe, expect, it } from 'vitest';
import {
  getEffectiveDate,
  getNextTour,
  getTourCities,
  getTourRoutes,
  getTourSchedule,
  getTours
} from '../../src/domain/tours';

describe('tour domain', () => {
  it('applies delays to effective dates without changing source tours', () => {
    const tour = { ...getTours()[0], delay: 2 };
    const effectiveDate = getEffectiveDate(tour)!;
    expect([
      effectiveDate.getFullYear(),
      effectiveDate.getMonth() + 1,
      effectiveDate.getDate()
    ]).toEqual([2026, 7, 20]);
    expect(getTours()[0].delay).toBe(0);
  });

  it('returns dated tours in order and keeps an undated tour as the final fallback', () => {
    expect(getNextTour(new Date('2026-07-20T12:00:00'))?.id).toBe('beijing');
    expect(getNextTour(new Date('2027-01-01T12:00:00'))?.id).toBe('shanghai');
  });

  it('derives schedule labels, cities, and adjacent routes', () => {
    const schedule = getTourSchedule(new Date('2026-08-02T12:00:00'));
    expect(schedule.find((tour) => tour.id === 'beijing')?.isPast).toBe(true);
    expect(schedule.find((tour) => tour.id === 'hangzhou')?.daysText).toBe('13天后');
    expect(getTourCities()).toHaveLength(getTours().length);
    expect(getTourRoutes()).toHaveLength(getTours().length - 1);
    expect(getTourRoutes()[0]).toEqual({
      from: getTours()[0].coordinates,
      to: getTours()[1].coordinates
    });
  });
});
