import { describe, expect, it } from 'vitest';
import {
  getBannerOrder,
  getEffectiveDate,
  getNextTour,
  getTourCities,
  getTourRoutes,
  getTourSchedule,
  getTours,
  NEST_ITEM_ID
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

  it('returns the next dated tour in chronological order', () => {
    expect(getNextTour(new Date('2026-07-20T12:00:00'))?.id).toBe('beijing');
    expect(getNextTour(new Date('2026-09-27T12:00:00'))?.id).toBe('shanghai');
    expect(getNextTour(new Date('2027-01-01T12:00:00'))).toBeUndefined();
  });

  it('derives schedule labels, cities, and adjacent routes', () => {
    const schedule = getTourSchedule(new Date('2026-08-02T12:00:00'));
    expect(schedule.find((tour) => tour.id === 'beijing')?.isPast).toBe(true);
    expect(schedule.find((tour) => tour.id === 'hangzhou')?.daysText).toBe('13天后');
    expect(schedule.find((tour) => tour.id === 'shanghai')).toMatchObject({
      date: '2026-10-03',
      dateDisplay: '10月3日',
      venue: '上海场',
      waitingRoom: '回响之地·前滩馆'
    });
    expect(getTourCities()).toHaveLength(getTours().length);
    expect(getTourRoutes()).toHaveLength(getTours().length - 1);
    expect(getTourRoutes()[0]).toEqual({
      from: getTours()[0].coordinates,
      to: getTours()[1].coordinates
    });
  });

  it('starts the banner on the next stop that is still ahead', () => {
    const showDay = getBannerOrder(new Date('2026-09-12T12:00:00'));
    expect(showDay.nestFirst).toBe(false);
    expect(showDay.items.map((item) => item.id)).toEqual([
      'xiamen',
      'wuhan',
      'shanghai',
      'chengdu',
      'beijing',
      'hangzhou',
      'guangzhou'
    ]);
    expect(showDay.items[0]).toMatchObject({ isNest: false, tour: { daysText: '今天', delayText: '正点' } });

    const weekLater = getBannerOrder(new Date('2026-09-19T12:00:00'));
    expect(weekLater.nestFirst).toBe(false);
    expect(weekLater.items.map((item) => item.id)).toEqual([
      'wuhan',
      'shanghai',
      'chengdu',
      'beijing',
      'hangzhou',
      'guangzhou',
      'xiamen'
    ]);
    expect(weekLater.items[0]).toMatchObject({ id: 'wuhan', tour: { daysText: '7天后' } });
    expect(weekLater.items[6]).toMatchObject({ id: 'xiamen', tour: { daysText: '7天前', isPast: true } });
  });

  it('parks the banner on the nest once every tour has passed', () => {
    const ended = getBannerOrder(new Date('2026-10-04T12:00:00'));
    expect(ended.nestFirst).toBe(true);
    expect(ended.items).toHaveLength(getTours().length + 1);
    expect(ended.items[0]).toEqual({ id: NEST_ITEM_ID, isNest: true, tour: null });
    expect(ended.items.slice(1).map((item) => item.id)).toEqual([
      'chengdu',
      'beijing',
      'hangzhou',
      'guangzhou',
      'xiamen',
      'wuhan',
      'shanghai'
    ]);
  });
});
