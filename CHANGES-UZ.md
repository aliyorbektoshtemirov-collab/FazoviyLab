# PHAZEX 3D — yangilangan versiya

## Ishga tushirish

Node.js 22 yoki yangiroq versiya kerak.

```sh
npm ci
npm run dev
```

Brauzerda terminal ko‘rsatgan manzilni oching. Ishlab chiqarish uchun: `npm run build`. `dist/` papkasi Cloudflare Pages kabi statik hostingga tayyor. ZIP ichidagi `functions/`, `schema.sql` va `wrangler.toml` asl D1 integratsiyasi uchun saqlangan.

## O‘zgarishlar

- Namunaga yaqin oq-binafsha bosh sahifa, fan kartalari, 40 mavzu, qidiruv, fan filtrlari va darslar tanlovi.
- Jonli 3D laboratoriya: Nyuton beshigi, yorug‘lik beradigan lampochka, atom ko‘rgazmasi, aylantirish, siljitish, pauza, qayta boshlash, to‘liq ekran va parametrlar.
- Poly Haven studio HDRI, PBR akslar, metall/shisha materiallari va yuqori sifatli soyalar.
- GLB normalizatsiyasidagi StrictMode xatosi tuzatildi: qayta renderda modellar juda kichrayib ketmaydi.
- Elektr zanjiri tayyor namuna bilan ochiladi; ulash/uzish tugmasi tok va lampochkani boshqaradi. Bu zanjir miqdoriy o‘quv modeli: mavjud komponentlar asosida umumiy qarshilik hisoblanadi; simlarni erkin terminalga sudrab ulash tizimi emas.
- Mayatnik qayta boshlash tugmasi endi fizik integrator holatini ham tiklaydi. Fizik tayanch qo‘shildi.
- Server bo‘lmaganda natijalar shu brauzerda saqlanadi. Saqlash joyi panelda ko‘rsatiladi. Brauzer ma’lumotlarini tozalash lokal natijalarni o‘chiradi.

## 3D va model manbalari

Asl ZIPdagi teksturali GLB modellar saqlangan. Ularning ichki metama’lumotida ko‘rsatilgan manba: grab3d.com, CC0-1.0. Barcha modellar tashqi saytdan yangidan yuklandi deb da’vo qilinmaydi. Hero sahnasidagi mexanik va elektr elementlarning bir qismi aniq geometriya va fizik materiallar bilan qurilgan. Atom va molekulalar ilmiy ko‘rgazma modellari, mikroskopik fototasvirlar emas.

Qo‘shilgan HDRI: Poly Haven, Studio Small 03 (CC0).
Manba: https://polyhaven.com/a/studio_small_03
Fayl: public/environments/studio_small_03_1k.hdr

## Tekshiruv

TypeScript va Vite production build bajarilgan. Bosh sahifa, parametr o‘zgarishi, pauza, chiroq, fan filtrlari, qidiruv va tanlangan tajriba oqimi brauzerda tekshirilgan. Kamera apparati va haqiqiy Cloudflare D1 ma’lumotlar bazasi bu muhitda tekshirilmagan. Kamera faqat foydalanuvchi tugmani bosib ruxsat berganda yoqiladi.

WebGL kerak. Murakkab 3D sahnalar kuchsiz telefonlarda sekinroq ishlashi mumkin. Hero ko‘rgazmasi idealizatsiyalangan; kichik burchaklar uchun mayatnik davri T=2π√(L/g). Massa davrga ta’sir qilmaydi, energiya hisobida qatnashadi.

Qo‘shimcha tuzatishlar: kimyo reaksiyasi va gen ekspressiyasi animatsiyalari Canvas ichidagi alohida komponentlarga ko‘chirildi; shu ikki tajribaning ochilganda bo‘sh sahifa berish xatosi tuzatildi. Model yoki WebGL yuklash xatosi bo‘lsa, tajribalar ro‘yxatiga qaytish tugmasi chiqadi.
