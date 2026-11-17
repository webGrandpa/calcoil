import { describe, expect, it } from 'vitest';
import { groupLabel, LANGS, makeT, stdLabel, warningText } from './i18n';
import type { Group2004 } from './core/api2004';
import type { Standard, WarningCode } from './core/calc';

const groups: Group2004[] = ['crude', 'fuel', 'jet', 'transition', 'gasoline', 'lube'];
const stds: Standard[] = ['api2004', 'astm1980', 'gost85'];
const codes: WarningCode[] = ['range', 'lube1980', 'transition', 'gostRange', 'gost20FromApi'];

describe('i18n', () => {
  for (const { id } of LANGS) {
    it(`${id}: every label resolves`, () => {
      const t = makeT(id);
      const texts = [
        ...groups.map((g) => groupLabel(t, g)),
        ...stds.map((s) => stdLabel(t, s)),
        ...codes.map((code) => warningText(t, { code, params: { rho: '1200.0', lo: 611.16, hi: 1163.86 } })),
        t('densityField'),
        t('foot1'),
      ];
      for (const x of texts) {
        expect(x).toBeTruthy();
        expect(x).not.toMatch(/\{\w+\}|undefined/);
      }
    });
  }
});
