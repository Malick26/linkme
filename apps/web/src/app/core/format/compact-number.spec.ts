import { compactNumber, formatXof } from './compact-number';

describe('compactNumber (format maquette)', () => {
  it.each([
    [245000, '245K'],
    [180000, '180K'],
    [8400000, '8.4M'],
    [12000000, '12M'],
    [32000, '32K'],
    [950, '950'],
    [1500, '1.5K'],
    [2300000000, '2.3B'],
    [0, '0'],
  ])('%d → %s', (n, expected) => {
    expect(compactNumber(n)).toBe(expected);
  });

  it('formate les FCFA sans décimales', () => {
    expect(formatXof(15000)).toBe('15 000 FCFA');
    expect(formatXof(5000.9)).toBe('5 000 FCFA');
  });
});
