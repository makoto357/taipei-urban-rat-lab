/**
 * 對 dev 專案寫入民眾通報、市府調查與投藥紀錄測資（不含照片，photoPaths 為空）。
 * 文件 ID 一律以 seed- 開頭，重跑會覆蓋、`--clean` 會刪除，不會動到手動建立的資料。
 *
 *   apps/web/node_modules/.bin/tsx scripts/mock-data/seed-test-reports.mts [--clean]
 *
 * 用 Firestore REST + 目前 gcloud 帳號的 token 寫入（IAM 權限，繞過 Rules），並用 contracts 的 schema 驗證每筆資料。
 * 連 emulator 時先設 FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST。
 */
import { execFileSync } from 'node:child_process';

import {
  BaitRecordSchema,
  CitizenReportSchema,
  OfficialObservationSchema,
} from '../../packages/contracts/src/index.js';

const PROJECT_ID = 'taipei-urban-rat-lab-dev';
const OFFICIAL_EMAIL = 'official-test@example.com';
const ORG = 'test-org';
const CITIZENS = ['seed-citizen-1', 'seed-citizen-2', 'seed-citizen-3'];

// Firestore REST + 目前 gcloud 帳號的 token（ADC 常綁在別的帳號）。連 emulator 時設 FIRESTORE_EMULATOR_HOST。
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const root = emulatorHost
  ? `http://${emulatorHost}/v1/projects/${PROJECT_ID}/databases/(default)/documents`
  : `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const headers = {
  'content-type': 'application/json',
  authorization: `Bearer ${
    emulatorHost ? 'owner' : execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim()
  }`,
  'x-goog-user-project': PROJECT_ID,
};

class Timestamp {
  constructor(readonly date: Date) {}
  // 讓 contracts 的 isTimestamp（結構判斷）通過
  toDate = () => this.date;
  toMillis = () => this.date.getTime();
  get seconds() { return Math.floor(this.date.getTime() / 1000); }
  get nanoseconds() { return 0; }
  static fromDate = (date: Date) => new Timestamp(date);
}

const encode = (value: unknown): unknown => {
  if (value instanceof Timestamp) return { timestampValue: value.date.toISOString() };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  if (value && typeof value === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])) } };
  }
  throw new Error(`cannot encode ${String(value)}`);
};

const post = async (path: string, body: unknown) => {
  const response = await fetch(`${root}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.json() as Promise<any>;
};
const docName = (collection: string, id: string) => `projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${id}`;

const daysAgo = (days: number, hour = 10) => {
  const date = new Date(Date.now() - days * 86_400_000);
  date.setHours(hour, 0, 0, 0);
  return Timestamp.fromDate(date);
};
const at = (latitude: number, longitude: number) => ({ latitude, longitude });

const places = [
  { loc: at(25.0418, 121.5654), district: '信義區', address: '台北市信義區松高路 12 號附近' },
  { loc: at(25.0267, 121.5436), district: '大安區', address: '台北市大安區忠孝東路四段 216 巷口' },
  { loc: at(25.0478, 121.5170), district: '中正區', address: '台北市中正區忠孝西路一段 49 號附近' },
  { loc: at(25.0573, 121.5200), district: '大同區', address: '台北市大同區南京西路 235 巷' },
  { loc: at(25.0634, 121.5519), district: '松山區', address: '台北市松山區南京東路五段 123 巷' },
  { loc: at(25.0329, 121.5654), district: '信義區', address: '台北市信義區基隆路一段 180 號附近' },
  { loc: at(25.0233, 121.5073), district: '萬華區', address: '台北市萬華區西園路一段 306 巷' },
  { loc: at(25.0840, 121.5240), district: '士林區', address: '台北市士林區中正路 235 巷' },
  { loc: at(25.1130, 121.5260), district: '北投區', address: '台北市北投區石牌路二段 88 巷' },
  { loc: at(24.9890, 121.5420), district: '文山區', address: '台北市文山區木柵路一段 17 巷' },
  { loc: at(25.0840, 121.5880), district: '內湖區', address: '台北市內湖區成功路四段 56 巷' },
  { loc: at(25.0130, 121.6080), district: '南港區', address: '台北市南港區研究院路一段 130 巷' },
] as const;

const citizenReports = places.map((place, i) => ({
  id: `seed-citizen-report-${String(i + 1).padStart(2, '0')}`,
  data: {
    reporterId: CITIZENS[i % CITIZENS.length],
    observedAt: daysAgo(2 + i * 4, 8 + (i % 12)),
    createdAt: daysAgo(2 + i * 4, 9 + (i % 12)),
    updatedAt: daysAgo(2 + i * 4, 9 + (i % 12)),
    reportType: i % 4 === 3 ? 'bait' : 'rat',
    location: place.loc,
    addressText: place.address,
    district: place.district,
    description: [
      '晚上在垃圾集中處看到一隻老鼠快速跑過。',
      '騎樓角落有咬破的垃圾袋和鼠糞。',
      '市場後巷有廚餘外露，連續幾天看到老鼠。',
      '社區花圃發現鼠洞，旁邊有零星碎屑。',
      '看到路邊有疑似捕鼠藥盒，擔心寵物誤食。',
      '排水溝附近有老鼠出沒，傍晚特別明顯。',
    ][i % 6],
    photoPaths: [],
    schemaVersion: 1,
  },
}));

const observationSpecs = [
  { p: 0, d: 3, method: 'visual_inspection', result: 'evidence_found', types: ['rat_droppings', 'gnaw_marks', 'waste_accumulation'], species: 'norway_rat', conf: 'medium', note: '後巷垃圾堆置區有新鮮鼠糞，垃圾袋有咬痕。', action: '加強垃圾桶加蓋與清運頻率，兩週後複查。', link: 'seed-citizen-report-01' },
  { p: 1, d: 6, method: 'routine_inspection', result: 'no_evidence_found', types: [], note: '例行巡查未發現鼠跡，環境整潔。' },
  { p: 2, d: 9, method: 'trap_survey', result: 'evidence_found', types: ['live_rat', 'rat_burrow'], species: 'roof_rat', conf: 'low', note: '黏鼠板捕獲一隻，鄰近綠帶有鼠洞。', action: '建議於綠帶周邊設置投藥站。' },
  { p: 3, d: 12, method: 'environmental_inspection', result: 'evidence_found', types: ['food_waste', 'uncovered_bin', 'drainage_issue'], note: '攤商廚餘未加蓋，排水溝淤積。', action: '輔導攤商使用有蓋容器，通知清疏排水溝。', link: 'seed-citizen-report-04' },
  { p: 6, d: 16, method: 'visual_inspection', result: 'evidence_found', types: ['dead_rat', 'clutter'], species: 'norway_rat', conf: 'high', note: '雜物堆放處發現死鼠一隻，已通知清運。', action: '清除堆放雜物並消毒。' },
  { p: 7, d: 21, method: 'routine_inspection', result: 'unable_to_assess', types: [], note: '現場封閉無法進入，改期再訪。' },
  { p: 8, d: 27, method: 'visual_inspection', result: 'evidence_found', types: ['rat_droppings', 'animal_feed_residue'], species: 'house_mouse', conf: 'low', note: '餵食流浪貓點周邊有飼料殘留與鼠糞。', action: '與餵食者溝通固定時間與清理。' },
  { p: 9, d: 33, method: 'environmental_inspection', result: 'no_evidence_found', types: ['standing_water'], note: '無鼠跡，但有積水需處理。', action: '通知管理單位排除積水。' },
] as const;

const observations = observationSpecs.map((spec, i) => {
  const place = places[spec.p];
  return {
    id: `seed-official-observation-${String(i + 1).padStart(2, '0')}`,
    data: {
      organizationId: ORG,
      observedAt: daysAgo(spec.d),
      createdAt: daysAgo(spec.d, 15),
      updatedAt: daysAgo(spec.d, 15),
      location: place.loc,
      addressText: place.address,
      district: place.district,
      surveyMethod: spec.method,
      surveyResult: spec.result,
      observationTypes: [...spec.types],
      ...('species' in spec ? { suspectedSpecies: spec.species, speciesConfidence: spec.conf } : {}),
      ...('link' in spec ? { linkedCitizenReportId: spec.link } : {}),
      description: spec.note,
      ...('action' in spec ? { recommendedActions: spec.action } : {}),
      photoPaths: [],
      schemaVersion: 1,
    },
  };
});

const baitSpecs = [
  { p: 0, d: 14, place: 'building_interior', obs: 'seed-official-observation-01', events: [
    { d: 14, actions: ['bait_station_placed', 'bait_placed'], product: { productName: '示範滅鼠餌 A', productType: 'rodenticide', activeIngredient: 'Bromadiolone' }, notes: '後巷設置 3 個投藥站。' },
    { d: 7, actions: ['checked'], notes: '餌料消耗約三成。' },
    { d: 1, actions: ['checked', 'replenished'], product: { productName: '示範滅鼠餌 A', productType: 'rodenticide', activeIngredient: 'Bromadiolone' }, notes: '補充餌料。' },
  ] },
  { p: 2, d: 8, place: 'public_space', obs: 'seed-official-observation-03', events: [
    { d: 8, actions: ['bait_station_placed'], notes: '綠帶周邊置放空投藥站。' },
    { d: 5, actions: ['bait_placed'], product: { productName: '示範避孕餌劑 B', productType: 'contraceptive' }, notes: '改用避孕餌劑試辦。' },
  ] },
  { p: 3, d: 30, place: 'market', events: [
    { d: 30, actions: ['bait_station_placed', 'bait_placed'], product: { productName: '示範滅鼠餌 A', productType: 'rodenticide', activeIngredient: 'Bromadiolone' } },
    { d: 15, actions: ['checked'], notes: '近兩週無消耗。' },
    { d: 10, actions: ['removed'], notes: '無鼠跡，移除投藥站。' },
  ] },
  { p: 6, d: 12, place: 'sewer', events: [
    { d: 12, actions: ['bait_placed'], product: { productName: '示範滅鼠餌 C', productType: 'rodenticide', activeIngredient: 'Brodifacoum' }, notes: '孔蓋下方置放。' },
    { d: 6, actions: ['checked'], notes: '餌料全數消耗，建議增量。' },
  ] },
  { p: 10, d: 4, place: 'other', events: [
    { d: 4, actions: ['bait_station_placed'], notes: '民眾通報後預先設站。' },
  ] },
] as const;

const baitRecords = baitSpecs.map((spec, i) => {
  const place = places[spec.p];
  return {
    id: `seed-bait-record-${String(i + 1).padStart(2, '0')}`,
    data: {
      organizationId: ORG,
      createdAt: daysAgo(spec.d, 9),
      updatedAt: daysAgo(spec.events.at(-1)!.d, 9),
      location: place.loc,
      addressText: place.address,
      district: place.district,
      placeType: spec.place,
      ...('obs' in spec ? { linkedOfficialObservationId: spec.obs } : {}),
      events: spec.events.map((event) => ({
        time: daysAgo(event.d, 11),
        actions: [...event.actions],
        photoPaths: [],
        ...('product' in event ? { product: event.product } : {}),
        ...('notes' in event ? { notes: event.notes } : {}),
      })),
      schemaVersion: 1,
    },
  };
});

const collections = [
  ['citizenReports', citizenReports],
  ['officialObservations', observations],
  ['baitRecords', baitRecords],
] as const;

if (process.argv.includes('--clean')) {
  for (const [name, docs] of collections) {
    await post(':commit', { writes: docs.map((doc) => ({ delete: docName(name, doc.id) })) });
  }
  console.log('seed docs removed');
  process.exit(0);
}

const found = await post(':runQuery', {
  structuredQuery: {
    from: [{ collectionId: 'users' }],
    where: { fieldFilter: { field: { fieldPath: 'emailNormalized' }, op: 'EQUAL', value: { stringValue: OFFICIAL_EMAIL } } },
    limit: 1,
  },
});
const official = found[0]?.document && { uid: String(found[0].document.name).split('/').pop() as string };
if (!official) throw new Error(`找不到 ${OFFICIAL_EMAIL} 的 users 文件，請先建立測試市府帳號`);

for (const doc of observations) Object.assign(doc.data, { reporterId: official.uid });
for (const doc of baitRecords) {
  Object.assign(doc.data, { reporterId: official.uid });
  for (const event of doc.data.events) Object.assign(event, { operatorId: official.uid });
}

// 先全數驗證，通過才寫入
for (const doc of citizenReports) CitizenReportSchema.parse(doc.data);
for (const doc of observations) OfficialObservationSchema.parse(doc.data);
for (const doc of baitRecords) BaitRecordSchema.parse(doc.data);

for (const [name, docs] of collections) {
  await post(':commit', {
    writes: docs.map((doc) => ({
      update: { name: docName(name, doc.id), fields: (encode(doc.data) as any).mapValue.fields },
    })),
  });
  console.log(`${name}: wrote ${docs.length}`);
}
