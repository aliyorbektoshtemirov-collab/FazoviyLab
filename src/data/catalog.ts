// src/data/catalog.ts
// PhET Colorado'ning rasmiy o'zbekcha katalogidagi nomlarga mos 4 fan x 10 mavzu
// (jami 40 ta). Har fandan 1 tasi chuqur ishlangan "flagship" 3D simulyatsiya,
// qolgan 9 tasi esa shu fanga xos umumiy asbob-uskunalar (toolkit) bilan
// ishlaydigan to'liq interaktiv 3D sandbox laboratoriyasi sifatida ochiladi.
// MUHIM: endi hech qanday mavzu "Tez kunda" holatida emas — barchasi bosilganda
// darhol ishlaydigan 3D oyna ochiladi.

import type { Subject } from '../types';

export const SUBJECTS: Subject[] = [
  {
    id: 'math',
    name: 'Matematika',
    colorFrom: '#22d3ee',
    colorTo: '#0891b2',
    accent: '#22d3ee',
    icon: 'Shapes',
    simulations: [
      { id: 'math-kepler-laws', title: 'Kepler qonunlari', shortDescription: 'Sayyoralar harakati va ellips orbitalar', subjectId: 'math', kind: 'sandbox', icon: 'Orbit' },
      { id: 'math-fourier-waves', title: 'Fourier: To\u2018lqinlarni yaratish', shortDescription: 'Garmonik to\u2018lqinlarni qo\u2018shib yangi shakl hosil qilish', subjectId: 'math', kind: 'sandbox', icon: 'Waves' },
      { id: 'math-vector-addition', title: 'Vektorni qo\u2018shish', shortDescription: '2D/3D vektor algebra va natijaviy vektor vizualizatsiyasi', subjectId: 'math', kind: 'sandbox', icon: 'MoveUpRight' },
      { id: 'math-regression-line', title: 'Regressiya chizig\u2018i', shortDescription: 'Nuqtalar bulutiga eng mos chiziqni moslashtirish', subjectId: 'math', kind: 'sandbox', icon: 'LineChart' },
      { id: 'math-quadratic-graph', title: 'Kvadrat funksiya grafigini yasash', shortDescription: 'Parabola koeffitsientlari va grafik o\u2018zgarishi', subjectId: 'math', kind: 'sandbox', icon: 'LineChart' },
      { id: 'math-pendulum', title: 'Matematik mayatnik', shortDescription: 'Tebranish davri, uzunlik va erkin tushish tezlanishi', subjectId: 'math', kind: 'flagship', icon: 'Activity' },
      { id: 'math-projectile-motion', title: 'Gorizontga burchak ostida otilgan jism harakati', shortDescription: 'Uchish burchagi va tezlikka bog\u2018liq traektoriya', subjectId: 'math', kind: 'sandbox', icon: 'MoveUpRight' },
      { id: 'math-plinko-probability', title: 'Plinko ehtimoli', shortDescription: 'Tasodifiy jarayon va normal taqsimot', subjectId: 'math', kind: 'sandbox', icon: 'Dices' },
      { id: 'math-trig-tour', title: 'Trigonmetriyaga sayohat', shortDescription: 'Birlik aylana, sinus va kosinus funksiyalari', subjectId: 'math', kind: 'sandbox', icon: 'CircleDot' },
      { id: 'math-balancing', title: 'Muvozanatlash', shortDescription: 'Richag qonuni: massa va masofa balansi', subjectId: 'math', kind: 'sandbox', icon: 'Scale' },
    ],
  },
  {
    id: 'physics',
    name: 'Fizika',
    colorFrom: '#fbbf24',
    colorTo: '#d97706',
    accent: '#fbbf24',
    icon: 'Atom',
    simulations: [
      { id: 'physics-buoyancy', title: 'Suzuvchanlik', shortDescription: 'Arximed kuchi, zichlik va suzish/cho\u2018kish sharti', subjectId: 'physics', kind: 'sandbox', icon: 'Droplets' },
      { id: 'physics-sound-waves', title: 'Ovoz To\u2018lqinlari', shortDescription: 'Chastota va amplitudaning eshitilishga ta\u2019siri', subjectId: 'physics', kind: 'sandbox', icon: 'AudioWaveform' },
      { id: 'physics-solar-system', title: 'Mening Quyosh Tizimim', shortDescription: 'Sayyoralar orbitasi, tezligi va gravitatsion ta\u2019sir', subjectId: 'physics', kind: 'flagship', icon: 'Sun' },
      { id: 'physics-circuit-construction-dc', title: 'Elektr zanjirini konstruksiya qilish to\u2018plami: O\u2018zgarmas tok', shortDescription: 'Batareyka, sim, rezistor va lampochkadan zanjir yig\u2018ish', subjectId: 'physics', kind: 'sandbox', icon: 'CircuitBoard' },
      { id: 'physics-energy-skate-park', title: 'Skeyt parkda energiya', shortDescription: 'Potensial va kinetik energiya saqlanishi', subjectId: 'physics', kind: 'sandbox', icon: 'Zap' },
      { id: 'physics-collision-lab', title: 'To\u2018qnashuv fizikasi laboratoriyasi', shortDescription: 'Elastik va noelastik to\u2018qnashuvlarda impuls saqlanishi', subjectId: 'physics', kind: 'sandbox', icon: 'CircleDotDashed' },
      { id: 'physics-charges-and-fields', title: 'Zaryadlar va Maydonlar', shortDescription: 'Nuqtaviy zaryadlar va elektr maydon chiziqlari', subjectId: 'physics', kind: 'sandbox', icon: 'Zap' },
      { id: 'physics-refraction', title: 'Yorug\u2018likning sinishi', shortDescription: 'Muhitlar chegarasida nur sinish burchagi', subjectId: 'physics', kind: 'sandbox', icon: 'Lightbulb' },
      { id: 'physics-faradays-law', title: 'Faradey qonuni', shortDescription: 'Magnit oqimi o\u2018zgarishi va induksiya EYUK', subjectId: 'physics', kind: 'sandbox', icon: 'Magnet' },
      { id: 'physics-ohms-law', title: 'Zanjirning bir qismi uchun Om qonuni', shortDescription: 'Kuchlanish, qarshilik va tok kuchi orasidagi bog\u2018liqlik', subjectId: 'physics', kind: 'sandbox', icon: 'CircuitBoard' },
    ],
  },
  {
    id: 'chemistry',
    name: 'Kimyo',
    colorFrom: '#34d399',
    colorTo: '#059669',
    accent: '#34d399',
    icon: 'FlaskConical',
    simulations: [
      { id: 'chemistry-build-a-nucleus', title: 'Yadro yaratish', shortDescription: 'Proton, neytron sonini o\u2018zgartirib izotop yasash', subjectId: 'chemistry', kind: 'sandbox', icon: 'Atom' },
      { id: 'chemistry-build-a-molecule', title: 'Molekula tuzish', shortDescription: 'Atomlardan molekula yig\u2018ish', subjectId: 'chemistry', kind: 'sandbox', icon: 'Atom' },
      { id: 'chemistry-atomic-interactions', title: 'Atomlarning o\u2018zaro ta\u2019siri', shortDescription: 'Valentlik, kovalent bog\u2018 va molekulyar kuchlar', subjectId: 'chemistry', kind: 'sandbox', icon: 'Orbit' },
      { id: 'chemistry-isotopes-and-mass', title: 'Izotoplar va atom massasi', shortDescription: 'Izotoplar nisbati va o\u2018rtacha atom massasi', subjectId: 'chemistry', kind: 'sandbox', icon: 'Gem' },
      { id: 'chemistry-molecule-shapes', title: 'Molekula shakllari', shortDescription: 'VSEPR nazariyasi asosida fazoviy geometriya', subjectId: 'chemistry', kind: 'sandbox', icon: 'Hexagon' },
      { id: 'chemistry-ph-scale', title: 'pH shkalasi', shortDescription: 'Kislota va ishqorlarni pH orqali aniqlash', subjectId: 'chemistry', kind: 'sandbox', icon: 'Beaker' },
      { id: 'chemistry-balancing-equations', title: 'Kimyoviy reaksiyalarni tenglashtirish', shortDescription: 'Shisha kolbalarda reagentlarni aralashtirib reaksiya olish', subjectId: 'chemistry', kind: 'flagship', icon: 'TestTube2' },
      { id: 'chemistry-acid-base-solutions', title: 'Kislota-asosli eritmalar', shortDescription: 'Kuchli/kuchsiz kislota-asos eritmalari xossalari', subjectId: 'chemistry', kind: 'sandbox', icon: 'FlaskRound' },
      { id: 'chemistry-concentration', title: 'Konsentratsiya', shortDescription: 'Eritmani suyultirish va molyar konsentratsiya', subjectId: 'chemistry', kind: 'sandbox', icon: 'Droplet' },
      { id: 'chemistry-atom-model', title: 'Atom modeli', shortDescription: 'Bor modeli: elektron qavatlar va energetik sathlar', subjectId: 'chemistry', kind: 'sandbox', icon: 'Atom' },
    ],
  },
  {
    id: 'biology',
    name: 'Biologiya',
    colorFrom: '#a78bfa',
    colorTo: '#7c3aed',
    accent: '#a78bfa',
    icon: 'Dna',
    simulations: [
      { id: 'biology-natural-selection', title: 'Tabiiy tanlanish', shortDescription: 'Populyatsiya evolyutsiyasi va moslashuv simulyatsiyasi', subjectId: 'biology', kind: 'sandbox', icon: 'Rabbit' },
      { id: 'biology-gene-expression', title: 'Gen ekspressiyasi asoslari', shortDescription: 'DNK qo\u2018sh spirali, transkripsiya va translyatsiya', subjectId: 'biology', kind: 'flagship', icon: 'Dna' },
      { id: 'biology-molecule-polarity', title: 'Molekulaning qutbliligi', shortDescription: 'Elektrmanfiylik farqi va dipol moment', subjectId: 'biology', kind: 'sandbox', icon: 'Hexagon' },
      { id: 'biology-neuron', title: 'Neyron', shortDescription: 'Aksonal signal va sinaps orqali impuls uzatilishi', subjectId: 'biology', kind: 'sandbox', icon: 'BrainCircuit' },
      { id: 'biology-color-vision', title: 'Rangli ko\u2018rish', shortDescription: 'Ko\u2018z retinasi va rang qabul qilish mexanizmi', subjectId: 'biology', kind: 'sandbox', icon: 'Eye' },
      { id: 'biology-ph-scale', title: 'pH shkalasi', shortDescription: 'Biologik muhitlarning kislotalilik darajasi', subjectId: 'biology', kind: 'sandbox', icon: 'Beaker' },
      { id: 'biology-density', title: 'Zichlik', shortDescription: 'Massa, hajm va zichlik orasidagi bog\u2018liqlik', subjectId: 'biology', kind: 'sandbox', icon: 'Gem' },
      { id: 'biology-diffusion', title: 'Diffuziya', shortDescription: 'Molekulalarning membranadan konsentratsiya gradienti bo\u2018yicha o\u2018tishi', subjectId: 'biology', kind: 'sandbox', icon: 'CircleDotDashed' },
      { id: 'biology-states-of-matter', title: 'Moddaning agregat holatlari', shortDescription: 'Qattiq, suyuq va gaz fazalari orasidagi o\u2018tishlar', subjectId: 'biology', kind: 'sandbox', icon: 'Snowflake' },
      { id: 'biology-molecules-and-light', title: 'Molekulalar va yorug\u2018lik', shortDescription: 'Molekulalarning turli to\u2018lqin uzunligidagi nurni yutishi', subjectId: 'biology', kind: 'sandbox', icon: 'Lightbulb' },
    ],
  },
];

export const getSimulationById = (id: string) => {
  for (const subject of SUBJECTS) {
    const sim = subject.simulations.find((s) => s.id === id);
    if (sim) return { subject, simulation: sim };
  }
  return null;
};
