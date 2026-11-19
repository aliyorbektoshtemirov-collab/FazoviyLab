# Phazex 3D

"Ixtirochilikka qadam" Respublika tanlovi uchun PhET Colorado simulyatsiyalaridan
ilhomlangan, qo'l harakati (Hand Tracking) bilan boshqariladigan 3D virtual
laboratoriya platformasi.

## Texnologik stek

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (dark-mode, glassmorphism)
- Three.js + @react-three/fiber + @react-three/drei
- @mediapipe/tasks-vision (HandLandmarker — veb-kamera orqali qo'l kuzatuvi)
- Cloudflare Pages + Pages Functions + D1 (natijalarni saqlash backendi)

## Loyihani ishga tushirish

```bash
npm install
npm run dev        # Faqat frontend (http://localhost:5173)
npm run build       # Production build (dist/)
```

### Backend bilan birga (Cloudflare Pages Functions + D1) lokal test

```bash
npm run build
npx wrangler d1 execute fazoviy-lab-db --local --file=./schema.sql
npx wrangler pages dev dist
```

## Papka strukturasi

```
src/
├── components/     # Sidebar, WebcamPanel, SceneCanvas, ResultsPanel, va h.k.
├── simulations/     # 4 ta faol 3D laboratoriya (Matematika/Fizika/Kimyo/Biologiya)
├── hooks/           # useHandTracking, useExperimentLogs, usePublishResult
├── context/         # ResultContext — joriy simulyatsiya natijasini ulashish
├── types/           # Umumiy TypeScript tiplari
└── data/catalog.ts  # 110 talik bazadan tanlangan 40 ta simulyatsiya katalogi

functions/api/logs.ts  # Cloudflare Pages Function: GET/POST /api/logs (D1 bilan)
schema.sql              # D1 ma'lumotlar bazasi sxemasi
wrangler.toml            # Cloudflare Pages + D1 konfiguratsiyasi
```

## Cloudflare Pages + D1'ga joylashtirish

To'liq qadamlar uchun loyiha muallifidan olingan terminal buyruqlari ro'yxatiga
qarang (GitHub repo yaratish, `wrangler d1 create`, `git push`, Cloudflare Pages
loyihasini ulash va h.k.).
