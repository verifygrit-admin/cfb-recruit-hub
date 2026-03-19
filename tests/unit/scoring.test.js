import { describe, it, expect } from 'vitest';
import { haversine, calcAthleticFit, calcAthleticBoost, getClassLabel } from '../../src/lib/scoring.js';

describe('haversine', () => {
  it('returns 0 for same coordinates', () => {
    expect(haversine(40, -74, 40, -74)).toBe(0);
  });

  it('calculates known distance (NYC to LA ~2451 miles)', () => {
    const d = haversine(40.7128, -74.0060, 34.0522, -118.2437);
    expect(d).toBeGreaterThan(2400);
    expect(d).toBeLessThan(2500);
  });

  it('calculates known distance (Boston to Miami ~1259 miles)', () => {
    const d = haversine(42.3601, -71.0589, 25.7617, -80.1918);
    expect(d).toBeGreaterThan(1200);
    expect(d).toBeLessThan(1300);
  });
});

describe('calcAthleticFit', () => {
  it('returns 0 for unknown tier/position', () => {
    expect(calcAthleticFit('QB', 72, 200, 4.8, 'NONEXISTENT')).toBe(0);
  });

  it('returns 0 for unknown position in valid tier', () => {
    expect(calcAthleticFit('FAKPOS', 72, 200, 4.8, 'Power 4')).toBe(0);
  });

  it('returns a value between 0 and 1 for valid inputs', () => {
    const score = calcAthleticFit('QB', 74, 215, 4.65, 'Power 4');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('higher weight for a lineman scores better than lower weight', () => {
    const heavy = calcAthleticFit('OL', 76, 310, 5.2, 'Power 4');
    const light = calcAthleticFit('OL', 76, 240, 5.2, 'Power 4');
    expect(heavy).toBeGreaterThan(light);
  });

  it('faster 40 for a WR scores better than slower', () => {
    const fast = calcAthleticFit('WR', 72, 185, 4.4, 'Power 4');
    const slow = calcAthleticFit('WR', 72, 185, 4.9, 'Power 4');
    expect(fast).toBeGreaterThan(slow);
  });

  it('is deterministic — same inputs always produce same output', () => {
    const a = calcAthleticFit('RB', 70, 200, 4.55, 'G6');
    const b = calcAthleticFit('RB', 70, 200, 4.55, 'G6');
    expect(a).toBe(b);
  });
});

describe('calcAthleticBoost', () => {
  it('returns 0 for no awards', () => {
    expect(calcAthleticBoost({})).toBe(0);
  });

  it('returns 0.05 for captain only', () => {
    expect(calcAthleticBoost({ captain: true })).toBe(0.05);
  });

  it('returns 0.35 for all awards', () => {
    const boost = calcAthleticBoost({
      expectedStarter: true,
      captain: true,
      allConference: true,
      allState: true,
    });
    expect(boost).toBe(0.35);
  });

  it('stacks correctly — starter + allState = 0.20', () => {
    expect(calcAthleticBoost({ expectedStarter: true, allState: true })).toBe(0.20);
  });
});

describe('getClassLabel', () => {
  it('returns a valid class label for any grad year', () => {
    const valid = ['Senior', 'Junior', 'Soph', 'Freshman'];
    expect(valid).toContain(getClassLabel(2027));
    expect(valid).toContain(getClassLabel(2028));
    expect(valid).toContain(getClassLabel(2029));
    expect(valid).toContain(getClassLabel(2030));
  });

  it('returns Senior for past graduation years', () => {
    expect(getClassLabel(2020)).toBe('Senior');
  });

  it('returns Freshman for far-future years', () => {
    expect(getClassLabel(2035)).toBe('Freshman');
  });
});
