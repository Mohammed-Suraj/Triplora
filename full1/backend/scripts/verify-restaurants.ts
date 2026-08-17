import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const all = await prisma.restaurant.findMany({ orderBy: { name: 'asc' } });
  const byCategory = await prisma.restaurant.groupBy({ by: ['category'], _count: true });
  console.log(`TOTAL RESTAURANTS: ${all.length}`);
  for (const row of byCategory) console.log(`  ${row.category}: ${row._count}`);

  const imgRoot = path.join(__dirname, '..', '..', 'public', 'images', 'restaurants');
  let badHero = 0;
  let badGallery = 0;
  const used = new Set<string>();
  for (const r of all) {
    if (!fs.existsSync(path.join(imgRoot, r.image.replace('/images/restaurants/', '')))) badHero++;
    for (const g of r.gallery) {
      used.add(g);
      if (!fs.existsSync(path.join(imgRoot, g.replace('/images/restaurants/', '')))) badGallery++;
    }
  }
  console.log(`Bad heroes: ${badHero}, Bad gallery refs: ${badGallery}, Unique gallery files: ${used.size}`);
  const missingRatings = all.filter((r) => !r.ratingNote.toLowerCase().includes('sample'));
  console.log(`Restaurants without sample rating note: ${missingRatings.length}`);
  const cities = [...new Set(all.map((r) => r.city))];
  console.log(`Cities covered (${cities.length}): ${cities.join(', ')}`);
  console.log(`Sample: ${all[0].name} | ${all[0].category} | ${all[0].image} | ${all[0].gallery.length} gallery`);
}

main().finally(() => prisma.$disconnect());
