import { createContext } from 'react';
import type { Group2004 } from './core/api2004';
import type { Standard, Warning } from './core/calc';

export type Lang = 'ka' | 'ru' | 'en';
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'ka', label: 'ქარ' },
  { id: 'ru', label: 'Рус' },
  { id: 'en', label: 'Eng' },
];

const ka = {
  appName: 'CalcOil',
  appSub: 'ნავთობის რაოდენობის გამოთვლა',
  standard: 'სტანდარტი',
  language: 'ენა',
  productDensity: 'პროდუქტი და სიმკვრივე',
  commodityAria: 'პროდუქტის ტიპი',
  sourceAria: 'სიმკვრივის წყარო',
  product: 'ნავთობპროდუქტი',
  crude: 'ნედლი ნავთობი',
  lube: 'საპოხი ზეთი',
  lab15: 'ρ15 ლაბ.',
  lab20: 'ρ20 ლაბ.',
  labT: 'ρ t-ზე (ციფრული)',
  hydro: 'არეომეტრი',
  densityField: 'სიმკვრივე, {kgm3} ან {gcm3}',
  hydroField: 'არეომეტრის ჩვენება, {kgm3} ან {gcm3}',
  measT: 'გაზომვის t, °C',
  hydroCal: 'არეომეტრის კალიბრაცია',
  cal20: '20 °C (ГОСТ)',
  cal15: '15 °C (ASTM D1298)',
  meniscus: 'მენისკის შესწორება, {kgm3}',
  group: 'ჯგუფი',
  gammaPer: 'γ, 1 °C-ზე',
  glass: 'შუშის შესწ.',
  densityErr: 'შეიყვანე სიმკვრივე 500–1200 {kgm3} (ან 0.5–1.2 {gcm3}).',
  tanks: 'ტანკები',
  addTank: '+ ტანკი',
  tank: 'ტანკი',
  tov: 'TOV, {m3}',
  water: 'წყალი, {m3}',
  temp: 't, °C',
  remove: 'წაშლა',
  cannotCompute: 'ამ სტანდარტით ვერ ითვლება',
  result: 'შედეგი',
  weightAria: 'წონა',
  vac: 'ვაკუუმი',
  air: 'ჰაერი',
  mtVacCap: 'მეტრული ტონა ვაკუუმში',
  mtAirCap: 'მეტრული ტონა ჰაერში',
  gov: 'GOV, {m3}',
  gsv15: 'GSV 15 °C, {m3}',
  mtVac: 'MT ვაკუუმი',
  mtAir: 'MT ჰაერი',
  lt: 'Long tons',
  bbl: 'bbl 60 °F',
  noResult: 'შედეგი ამ სტანდარტით არ ითვლება — იხ. გაფრთხილება ზემოთ.',
  comparison: 'შედარება',
  deltaApi: 'Δ API 2004-თან',
  examples: 'მაგალითები',
  exStar: 'ბენზინი STAR 10 (Excel)',
  exM100: 'მაზუთი M-100, 64.5 °C',
  exTengiz: 'Tengiz (54A)',
  usedInCalc: 'გამოთვლაში: {v}',
  showFull: 'სრული მნიშვნელობა',
  showRounded: 'დამრგვალებულის ჩვენება',
  foot1:
    'რიცხვზე დაჭერით სრული მნიშვნელობა ჩანს. VCF გამოთვლაში 5 ნიშნამდე მრგვალდება. ჰაერში წონა: ρ15 − 1.1 {kgm3} (≥996.6-ზე − 1.0), LT = MT ჰაერი × 0.984206.',
  foot2:
    'API 2004 ბირთვი შემოწმებულია API MPMS 11.1 Addendum 2-ის (2019), ASTM D1298-ის და ГОСТ 3900-2022-ის მაგალითებზე. სატესტო ვერსია — ოფიციალური დოკუმენტისთვის გადაამოწმე.',
  kgm3: 'კგ/მ³',
  gcm3: 'გ/სმ³',
  m3: 'მ³',
  t: 'ტ',
  std_api2004: 'API MPMS 11.1-2004 = ГОСТ 3900-2022',
  std_astm1980: 'ASTM D1250-80 (54A/54B) — Excel',
  std_gost85: 'ГОСТ 3900-85 (γ ცხრილი)',
  w_range: 'ρ15 = {rho} {kgm3} API 11.1-ის დიაპაზონს გარეთაა ({lo}–{hi}).',
  w_lube1980: 'ASTM 1980 რეჟიმში საპოხი ზეთი 54B-ით ითვლება (54D არ არის რეალიზებული).',
  w_transition: 'გარდამავალი ზონა (770–788 {kgm3}): აქ 1980 და 2004 ცხრილები ყველაზე მეტად განსხვავდება.',
  w_gostRange: 'ГОСТ 3900-85 ცხრილი ამ სიმკვრივეს არ ფარავს (მხოლოდ 0.6900–0.9999 {gcm3}).',
  w_gost20FromApi: 'ГОСТ 85 რეჟიმისთვის ρ20 გამოთვლილია ρ15-დან API 2004-ით.',
  g_crude: 'ნედლი ნავთობი',
  g_fuel: 'მაზუთი / დიზელი',
  g_jet: 'რეაქტიული / ნავთი',
  g_transition: 'გარდამავალი ზონა',
  g_gasoline: 'ბენზინი / ნაფტა',
  g_lube: 'საპოხი ზეთი',
};

type Dict = typeof ka;

const ru: Dict = {
  appName: 'CalcOil',
  appSub: 'Расчёт количества нефти',
  standard: 'Стандарт',
  language: 'Язык',
  productDensity: 'Продукт и плотность',
  commodityAria: 'Тип продукта',
  sourceAria: 'Источник плотности',
  product: 'Нефтепродукт',
  crude: 'Сырая нефть',
  lube: 'Смазочное масло',
  lab15: 'ρ15 лаб.',
  lab20: 'ρ20 лаб.',
  labT: 'ρ при t (цифровой)',
  hydro: 'Ареометр',
  densityField: 'Плотность, {kgm3} или {gcm3}',
  hydroField: 'Показание ареометра, {kgm3} или {gcm3}',
  measT: 't измерения, °C',
  hydroCal: 'Градуировка ареометра',
  cal20: '20 °C (ГОСТ)',
  cal15: '15 °C (ASTM D1298)',
  meniscus: 'Поправка на мениск, {kgm3}',
  group: 'Группа',
  gammaPer: 'γ на 1 °C',
  glass: 'Попр. на стекло',
  densityErr: 'Введите плотность 500–1200 {kgm3} (или 0,5–1,2 {gcm3}).',
  tanks: 'Танки',
  addTank: '+ танк',
  tank: 'Танк',
  tov: 'TOV, {m3}',
  water: 'Вода, {m3}',
  temp: 't, °C',
  remove: 'Удалить',
  cannotCompute: 'По этому стандарту не рассчитывается',
  result: 'Результат',
  weightAria: 'Масса',
  vac: 'Вакуум',
  air: 'Воздух',
  mtVacCap: 'метрических тонн в вакууме',
  mtAirCap: 'метрических тонн в воздухе',
  gov: 'GOV, {m3}',
  gsv15: 'GSV 15 °C, {m3}',
  mtVac: 'MT вакуум',
  mtAir: 'MT воздух',
  lt: 'Long tons',
  bbl: 'bbl 60 °F',
  noResult: 'По этому стандарту результат не рассчитывается — см. предупреждение выше.',
  comparison: 'Сравнение',
  deltaApi: 'Δ к API 2004',
  examples: 'Примеры',
  exStar: 'Бензин STAR 10 (Excel)',
  exM100: 'Мазут М-100, 64,5 °C',
  exTengiz: 'Тенгиз (54A)',
  usedInCalc: 'в расчёте: {v}',
  showFull: 'Полное значение',
  showRounded: 'Показать округлённое',
  foot1:
    'Нажмите на число, чтобы увидеть полное значение. VCF в расчёте округляется до 5 знаков. Масса в воздухе: ρ15 − 1,1 {kgm3} (при ≥996,6 − 1,0), LT = MT воздух × 0,984206.',
  foot2:
    'Ядро API 2004 проверено на примерах API MPMS 11.1 Addendum 2 (2019), ASTM D1298 и ГОСТ 3900-2022. Тестовая версия — для официальных документов перепроверьте.',
  kgm3: 'кг/м³',
  gcm3: 'г/см³',
  m3: 'м³',
  t: 'т',
  std_api2004: 'API MPMS 11.1-2004 = ГОСТ 3900-2022',
  std_astm1980: 'ASTM D1250-80 (54A/54B) — Excel',
  std_gost85: 'ГОСТ 3900-85 (таблица γ)',
  w_range: 'ρ15 = {rho} {kgm3} вне диапазона API 11.1 ({lo}–{hi}).',
  w_lube1980: 'В режиме ASTM 1980 смазочное масло считается по 54B (54D не реализована).',
  w_transition: 'Переходная зона (770–788 {kgm3}): здесь таблицы 1980 и 2004 расходятся сильнее всего.',
  w_gostRange: 'Таблица ГОСТ 3900-85 не охватывает эту плотность (только 0,6900–0,9999 {gcm3}).',
  w_gost20FromApi: 'Для режима ГОСТ 85 ρ20 рассчитана из ρ15 по API 2004.',
  g_crude: 'Сырая нефть',
  g_fuel: 'Мазут / дизель',
  g_jet: 'Реактивное топливо / керосин',
  g_transition: 'Переходная зона',
  g_gasoline: 'Бензин / нафта',
  g_lube: 'Смазочное масло',
};

const en: Dict = {
  appName: 'CalcOil',
  appSub: 'Oil quantity calculation',
  standard: 'Standard',
  language: 'Language',
  productDensity: 'Product and density',
  commodityAria: 'Product type',
  sourceAria: 'Density source',
  product: 'Refined product',
  crude: 'Crude oil',
  lube: 'Lubricating oil',
  lab15: 'ρ15 lab',
  lab20: 'ρ20 lab',
  labT: 'ρ at t (digital)',
  hydro: 'Hydrometer',
  densityField: 'Density, {kgm3} or {gcm3}',
  hydroField: 'Hydrometer reading, {kgm3} or {gcm3}',
  measT: 'Measurement t, °C',
  hydroCal: 'Hydrometer calibration',
  cal20: '20 °C (GOST)',
  cal15: '15 °C (ASTM D1298)',
  meniscus: 'Meniscus correction, {kgm3}',
  group: 'Group',
  gammaPer: 'γ per 1 °C',
  glass: 'Glass corr.',
  densityErr: 'Enter a density of 500–1200 {kgm3} (or 0.5–1.2 {gcm3}).',
  tanks: 'Tanks',
  addTank: '+ tank',
  tank: 'Tank',
  tov: 'TOV, {m3}',
  water: 'Water, {m3}',
  temp: 't, °C',
  remove: 'Remove',
  cannotCompute: 'Not computable under this standard',
  result: 'Result',
  weightAria: 'Weight',
  vac: 'Vacuum',
  air: 'Air',
  mtVacCap: 'metric tons in vacuum',
  mtAirCap: 'metric tons in air',
  gov: 'GOV, {m3}',
  gsv15: 'GSV 15 °C, {m3}',
  mtVac: 'MT vacuum',
  mtAir: 'MT air',
  lt: 'Long tons',
  bbl: 'bbl 60 °F',
  noResult: 'No result under this standard — see the warning above.',
  comparison: 'Comparison',
  deltaApi: 'Δ vs API 2004',
  examples: 'Examples',
  exStar: 'Gasoline STAR 10 (Excel)',
  exM100: 'Fuel oil M-100, 64.5 °C',
  exTengiz: 'Tengiz (54A)',
  usedInCalc: 'used: {v}',
  showFull: 'Full value',
  showRounded: 'Show rounded',
  foot1:
    'Tap a number to see its full value. VCF is rounded to 5 decimals in the calculation. Weight in air: ρ15 − 1.1 {kgm3} (− 1.0 at ≥996.6), LT = MT air × 0.984206.',
  foot2:
    'The API 2004 core is checked against the examples in API MPMS 11.1 Addendum 2 (2019), ASTM D1298 and GOST 3900-2022. Test version — verify before use in official documents.',
  kgm3: 'kg/m³',
  gcm3: 'g/cm³',
  m3: 'm³',
  t: 't',
  std_api2004: 'API MPMS 11.1-2004 = GOST 3900-2022',
  std_astm1980: 'ASTM D1250-80 (54A/54B) — Excel',
  std_gost85: 'GOST 3900-85 (γ table)',
  w_range: 'ρ15 = {rho} {kgm3} is outside the API 11.1 range ({lo}–{hi}).',
  w_lube1980: 'In ASTM 1980 mode lubricating oil uses Table 54B (54D is not implemented).',
  w_transition: 'Transition zone (770–788 {kgm3}): the 1980 and 2004 tables differ most here.',
  w_gostRange: 'The GOST 3900-85 table does not cover this density (0.6900–0.9999 {gcm3} only).',
  w_gost20FromApi: 'For GOST 85 mode, ρ20 is derived from ρ15 with API 2004.',
  g_crude: 'Crude oil',
  g_fuel: 'Fuel oil / diesel',
  g_jet: 'Jet fuel / kerosene',
  g_transition: 'Transition zone',
  g_gasoline: 'Gasoline / naphtha',
  g_lube: 'Lubricating oil',
};

const DICTS: Record<Lang, Dict> = { ka, ru, en };
export type Key = keyof Dict;

export function makeT(lang: Lang) {
  const d = DICTS[lang];
  return (key: Key, params: Record<string, string | number> = {}): string => {
    const all: Record<string, string | number> = { kgm3: d.kgm3, gcm3: d.gcm3, m3: d.m3, ...params };
    return d[key].replace(/\{(\w+)\}/g, (_, k: string) => (k in all ? String(all[k]) : `{${k}}`));
  };
}

export type T = ReturnType<typeof makeT>;

export const stdLabel = (t: T, s: Standard) => t(`std_${s}` as Key);
export const groupLabel = (t: T, g: Group2004) => t(`g_${g}` as Key);
export const warningText = (t: T, w: Warning) => t(`w_${w.code}` as Key, w.params ?? {});

/** Decimal separator per language (Russian uses a comma). */
export function fmt(lang: Lang, x: number, digits: number): string {
  const s = x.toFixed(digits);
  return lang === 'ru' ? s.replace('.', ',') : s;
}

export const LangCtx = createContext<Lang>('ka');

export function detectLang(): Lang {
  try {
    const n = (navigator.language || '').toLowerCase();
    if (n.startsWith('ru')) return 'ru';
    if (n.startsWith('en')) return 'en';
  } catch {
    /* no navigator */
  }
  return 'ka';
}
