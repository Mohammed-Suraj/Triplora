const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const cats = await p.category.findMany();
  console.log('CATEGORIES:', cats.map((x) => x.name).join(' | '));
  const d = await p.destination.findMany();
  console.log('COUNT:', d.length);
  console.log('REGIONS:', [...new Set(d.map((x) => x.region))].join(' | '));
  console.log('PRICE range:', Math.min(...d.map((x) => x.priceFrom)), '-', Math.max(...d.map((x) => x.priceFrom)));
  console.log('DURATIONS:', [...new Set(d.map((x) => x.duration))].join(' | '));
  console.log('SEASONS:', [...new Set(d.map((x) => x.bestSeason))].join(' | '));
  console.log('ACTIVITIES:', [...new Set(d.flatMap((x) => x.activities))].join(' | '));
  const withCoords = d.filter((x) => x.latitude && x.longitude);
  console.log('WITH COORDS:', withCoords.length);
  console.log('SAMPLE:');
  for (const x of d.slice(0, 80)) {
    console.log(`${x.name} | ${x.region} | ${x.category?.name ?? x.categoryId} | ${x.priceFrom} | ${x.rating} | pop=${x.popularityScore} | ${x.duration} | ${x.bestSeason} | ${x.latitude},${x.longitude}`);
  }
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
