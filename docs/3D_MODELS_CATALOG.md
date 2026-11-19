# Phazex 3D — To'liq `.glb` 3D Modellar Katalogi

Ushbu hujjat loyihadagi barcha **40 ta mavzu** uchun ishlatiladigan/ishlatilishi
mo'ljallangan barcha `.glb` 3D model fayllarining **to'liq ro'yxati** va ularning
`public/models/` papkasidagi aniq joylashuvini belgilaydi.

## ✅ Joriy holat (yangilandi)

`public/models/` papkasida hozirda **96 ta haqiqiy `.glb` fayl** (~86 MB) mavjud —
quyidagi jadvaldagi deyarli barcha nom shu fayllarga mos keladi. Kod ichida
**19 ta model** (`GltfModel` komponenti orqali) allaqachon jonli ulangan:

| Simulyatsiya | Ishlatilgan real modellar |
|---|---|
| Mening Quyosh Tizimim (flagship) | `sun.glb`, `mercury-planet.glb`, `venus.glb`, `earth-and-moon.glb`, `mars.glb`, `jupiter.glb`, `saturn.glb`, `uranus.glb`, `neptune.glb` |
| Elektr zanjiri (Fizika sandbox) | `battery.glb`, `resistor.glb`, `voltmeter.glb`, `magnet-bar.glb` |
| Kimyoviy reaksiya (flagship + sandbox) | `bunsen-burner.glb`, `test-tube-rack.glb` |
| Gen ekspressiyasi (flagship) | `ribosome.glb` |
| Biologiya sandbox | `neuron-cell.glb`, `water-molecule.glb` |
| Matematika sandbox | `chalkboard.glb` (fon dekoratsiyasi) |

Qolgan ~77 ta fayl `public/models/` da **tayyor holda saqlanmoqda** va keyingi
rivojlantirish bosqichida qolgan 36 ta sandbox mavzusiga bosqichma-bosqich
ulanishi mumkin (hech qanday qo'shimcha yuklab olish shart emas).

> Barcha fayl yo'llari kod ichidagi haqiqiy foydalanishdan oldin
> `public/models/<fan>/<fayl>.glb` mavjudligiga avtomatik tekshirib chiqilgan —
> **404 xatosi yo'q**.

Umumiy papka strukturasi:

```
public/models/
├── math/
├── physics/
├── chemistry/
└── biology/
```

Ko'p mavzularda bir xil model qayta ishlatiladi (masalan, `battery.glb` bir nechta
fizika mavzusida kerak) — bunday fayllar faqat bir marta yaratiladi va turli
sahnalarda import qilinadi.

---

## 1. MATEMATIKA — `public/models/math/`

| # | Mavzu | Kerakli `.glb` modellar |
|---|-------|--------------------------|
| 1 | Kepler qonunlari | `sun.glb`, `planet-generic.glb`, `orbit-ellipse-ring.glb` |
| 2 | Fourier: To'lqinlarni yaratish | `wave-generator-machine.glb`, `oscilloscope-panel.glb` |
| 3 | Vektorni qo'shish | `arrow-vector.glb`, `grid-plane.glb` |
| 4 | Regressiya chizig'i | `data-point-marker.glb`, `graph-board.glb` |
| 5 | Kvadrat funksiya grafigini yasash | `parabola-curve.glb`, `graph-board.glb` *(qayta ishlatiladi)* |
| 6 | Matematik mayatnik | `pendulum-bob-metal.glb`, `pendulum-stand.glb` |
| 7 | Gorizontga burchak ostida otilgan jism harakati | `cannon.glb`, `projectile-ball.glb`, `trajectory-marker.glb` |
| 8 | Plinko ehtimoli | `plinko-board.glb`, `plinko-peg.glb`, `plinko-ball.glb` |
| 9 | Trigonmetriyaga sayohat | `unit-circle-ring.glb`, `angle-indicator.glb` |
| 10 | Muvozanatlash | `see-saw-beam.glb`, `weight-block-set.glb` |

---

## 2. FIZIKA — `public/models/physics/`

| # | Mavzu | Kerakli `.glb` modellar |
|---|-------|--------------------------|
| 1 | Suzuvchanlik | `beaker-water.glb`, `floating-cube.glb`, `density-block-set.glb` |
| 2 | Ovoz To'lqinlari | `speaker.glb`, `tuning-fork.glb` |
| 3 | Mening Quyosh Tizimim | `sun.glb` *(qayta)*, `planet-set-8.glb`, `saturn-rings.glb` |
| 4 | Elektr zanjirini konstruksiya qilish to'plami: O'zgarmas tok | `battery.glb`, `wire.glb`, `resistor.glb`, `light-bulb.glb`, `voltmeter.glb`, `switch.glb` |
| 5 | Skeyt parkda energiya | `skate-ramp.glb`, `skateboard.glb`, `skater-character.glb` |
| 6 | To'qnashuv fizikasi laboratoriyasi | `collision-ball-set.glb`, `track-rail.glb` |
| 7 | Zaryadlar va Maydonlar | `charge-sphere-positive.glb`, `charge-sphere-negative.glb`, `field-arrow.glb` |
| 8 | Yorug'likning sinishi | `glass-prism.glb`, `light-ray-beam.glb`, `lens-convex.glb` |
| 9 | Faradey qonuni | `magnet-bar.glb`, `coil-wire.glb`, `galvanometer.glb` |
| 10 | Zanjirning bir qismi uchun Om qonuni | `battery.glb` *(qayta)*, `resistor.glb` *(qayta)*, `ammeter.glb` |

---

## 3. KIMYO — `public/models/chemistry/`

| # | Mavzu | Kerakli `.glb` modellar |
|---|-------|--------------------------|
| 1 | Yadro yaratish | `proton.glb`, `neutron.glb`, `electron.glb`, `nucleus-core.glb` |
| 2 | Molekula tuzish | `atom-sphere-generic.glb`, `bond-stick.glb` |
| 3 | Atomlarning o'zaro ta'siri | `atom-pair.glb`, `bond-stick.glb` *(qayta)* |
| 4 | Izotoplar va atom massasi | `isotope-atom.glb`, `scale-balance.glb` |
| 5 | Molekula shakllari | `molecule-tetrahedral.glb`, `molecule-linear.glb`, `molecule-bent.glb` |
| 6 | pH shkalasi | `ph-strip.glb`, `beaker-liquid.glb`, `dropper.glb` |
| 7 | Kimyoviy reaksiyalarni tenglashtirish | `flask-erlenmeyer.glb`, `flask-round.glb`, `bunsen-burner.glb` |
| 8 | Kislota-asosli eritmalar | `acid-bottle.glb`, `base-bottle.glb`, `litmus-paper.glb` |
| 9 | Konsentratsiya | `graduated-cylinder.glb`, `solute-particle.glb` |
| 10 | Atom modeli | `electron-shell-ring.glb`, `nucleus-core.glb` *(qayta)* |

---

## 4. BIOLOGIYA — `public/models/biology/`

| # | Mavzu | Kerakli `.glb` modellar |
|---|-------|--------------------------|
| 1 | Tabiiy tanlanish | `rabbit-brown.glb`, `rabbit-white.glb`, `habitat-terrain.glb` |
| 2 | Gen ekspressiyasi asoslari | `dna-helix.glb`, `mrna-strand.glb`, `ribosome.glb` |
| 3 | Molekulaning qutbliligi | `water-molecule.glb`, `dipole-arrow.glb` |
| 4 | Neyron | `neuron-cell.glb`, `synapse-vesicle.glb`, `axon-segment.glb` |
| 5 | Rangli ko'rish | `eye-cross-section.glb`, `retina-cone-cell.glb` |
| 6 | pH shkalasi (biologik muhit) | `ph-strip.glb` *(qayta)*, `cell-sample.glb` |
| 7 | Zichlik | `liquid-layer-set.glb`, `density-block-set.glb` *(qayta)* |
| 8 | Diffuziya | `cell-membrane.glb`, `molecule-particle.glb` |
| 9 | Moddaning agregat holatlari | `ice-cube.glb`, `water-droplet.glb`, `steam-particle.glb` |
| 10 | Molekulalar va yorug'lik | `molecule-generic.glb` *(qayta)*, `photon-particle.glb` |

---

## Umumiy (barcha fanlarda qayta ishlatiladigan) modellar

| Fayl | Ishlatiladigan joyi |
|------|----------------------|
| `sun.glb` | Kepler qonunlari, Mening Quyosh Tizimim |
| `graph-board.glb` | Regressiya chizig'i, Kvadrat funksiya grafigi |
| `battery.glb`, `resistor.glb` | Elektr zanjiri, Om qonuni |
| `ph-strip.glb` | Kimyo pH shkalasi, Biologiya pH shkalasi |
| `nucleus-core.glb` | Yadro yaratish, Atom modeli |
| `density-block-set.glb` | Suzuvchanlik, Zichlik |
| `molecule-generic.glb` | Molekula tuzish, Molekulalar va yorug'lik |

**Jami noyob fayllar:** ~78 ta `.glb` model (qayta ishlatiladiganlar hisobga olinmaganda).

---

## AI orqali 3D model generatsiya qilish uchun tayyor prompt

Quyidagi promptni brauzerdagi 3D generatsiya vositalariga (masalan,
[Meshy.ai](https://www.meshy.ai), [Tripo3D](https://www.tripo3d.ai),
[Luma Genie](https://lumalabs.ai/genie), yoki Spline AI) nusxalab joylashtiring.
Har bir model uchun alohida ishlatiladi — faqat `{MODEL_NOMI}` va
`{TAVSIF}` qismini almashtiring:

```
Create a low-poly, stylized 3D model named "{MODEL_NOMI}" for an educational
physics/chemistry/biology/math simulation. Style: clean, minimal, slightly
cartoonish but scientifically accurate, matte PBR materials, neutral lighting,
no background. The model should depict: {TAVSIF}. Export format: glTF Binary
(.glb), optimized for real-time WebGL rendering (under 2MB, under 10k triangles),
centered at origin, correct real-world proportions, Y-up orientation.
```

### Tayyor misollar (nusxalab ishlatish uchun):

1. **Batareyka:**
   `{MODEL_NOMI}` = `battery.glb`, `{TAVSIF}` = "a cylindrical AA battery with
   metallic copper top terminal and green plastic body with + and - labels"

2. **DNK spirali:**
   `{MODEL_NOMI}` = `dna-helix.glb`, `{TAVSIF}` = "a double helix DNA strand
   with colorful nucleotide base pair rungs (red, blue, green, yellow spheres)"

3. **Shisha kolba:**
   `{MODEL_NOMI}` = `flask-erlenmeyer.glb`, `{TAVSIF}` = "a transparent glass
   Erlenmeyer flask with a narrow neck, empty, laboratory style"

4. **Sayyora (umumiy):**
   `{MODEL_NOMI}` = `planet-generic.glb`, `{TAVSIF}` = "a textured rocky
   planet sphere with visible craters and subtle atmospheric glow"

### Fayllarni joylashtirish

Yuklab olingan/generatsiya qilingan `.glb` fayllarni yuqoridagi jadvaldagi
yo'l bo'yicha joylashtiring, masalan:

```
public/models/physics/battery.glb
public/models/biology/dna-helix.glb
public/models/chemistry/flask-erlenmeyer.glb
```

So'ngra kodda `@react-three/drei`ning `useGLTF` hook'i orqali yuklanadi:

```tsx
import { useGLTF } from '@react-three/drei';

function Battery() {
  const { scene } = useGLTF('/models/physics/battery.glb');
  return <primitive object={scene} />;
}
```
