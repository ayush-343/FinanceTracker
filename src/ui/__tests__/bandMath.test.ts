import { bandSegments, hueFor } from '../bandMath';
import { CATEGORY_HUES } from '../tokens';

const seg = (key: string, value: number) => ({ key, value, color: '#000' });

describe('bandSegments', () => {
  it('widths sum to 1', () => {
    const r = bandSegments([seg('a', 1), seg('b', 1), seg('c', 1)]);
    expect(r.reduce((s, x) => s + x.fraction, 0)).toBe(1);
    expect(r.map((x) => x.key)).toEqual(['a', 'b', 'c']);
  });
  it('total larger than sum leaves remainder', () => {
    const r = bandSegments([seg('a', 28420)], 45000);
    expect(r[0].fraction).toBeCloseTo(28420 / 45000, 10);
  });
  it('ignores non-positive', () => {
    const r = bandSegments([seg('a', 0), seg('b', -5), seg('c', 10)]);
    expect(r).toEqual([{ key: 'c', color: '#000', fraction: 1 }]);
  });
  it('empty or zero total gives no segments', () => {
    expect(bandSegments([])).toEqual([]);
    expect(bandSegments([seg('a', 5)], 0)).toEqual([]);
  });
});

describe('hueFor', () => {
  it('follows the wheel', () => expect(hueFor(0)).toBe(CATEGORY_HUES[0]));
  it('wraps', () => expect(hueFor(CATEGORY_HUES.length + 1)).toBe(CATEGORY_HUES[1]));
  it('handles negative ids', () => expect(CATEGORY_HUES).toContain(hueFor(-3)));
  it('dark wheel has the same length', () => expect(hueFor(1, true)).not.toBe(hueFor(1)));
});
