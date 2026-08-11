// Fetches real cover + gallery images for the 41 new Kerala destinations from
// the English Wikipedia API, downloads them into public/images/ and writes
// backend/src/data/destinationImages.json mapping slug -> { image, gallery }.
// Usage: node scripts/fetch-images.mjs
// Resumes safely: existing valid files are skipped; JSON rewritten each run.
import { mkdir, stat, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'images');
const OUT_JSON = path.join(ROOT, 'backend', 'src', 'data', 'destinationImages.json');

const API = 'https://en.wikipedia.org/w/api.php';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'TriploraSeedBot/1.0 (trip-planning demo; contact: local)';
const QUIET = process.argv.includes('--quiet');
const PACING_MS = QUIET ? 4000 : 900;

// slug -> best English Wikipedia search term
const DESTINATIONS = [
  { slug: 'vagamon', search: 'Vagamon' },
  { slug: 'ponmudi', search: 'Ponmudi' },
  { slug: 'nelliyampathy', search: 'Nelliyampathy' },
  { slug: 'kolukkumalai', search: 'Kolukkumalai' },
  { slug: 'chinnakanal', search: 'Chinnakanal' },
  { slug: 'cherai', search: 'Cherai Beach' },
  { slug: 'muzhappilangad', search: 'Muzhappilangad Drive-in Beach' },
  { slug: 'payyambalam', search: 'Payyambalam Beach' },
  { slug: 'kappad', search: 'Kappad' },
  { slug: 'shankumugham', search: 'Shankumugham Beach' },
  { slug: 'kumarakom', search: 'Kumarakom' },
  { slug: 'kuttanad', search: 'Kuttanad' },
  { slug: 'ashtamudi', search: 'Ashtamudi Lake' },
  { slug: 'valiyaparamba', search: 'Valiyaparamba backwaters' },
  { slug: 'munroe-island', search: 'Munroe Island' },
  { slug: 'kuruvadweep', search: 'Kuruvadweep' },
  { slug: 'krishnapuram-palace', search: 'Krishnapuram Palace' },
  { slug: 'st-angelo-fort', search: 'St. Angelo Fort' },
  { slug: 'edakkal-caves', search: 'Edakkal Caves' },
  { slug: 'sakthan-thampuran-palace', search: 'Sakthan Thampuran Palace' },
  { slug: 'hill-palace', search: 'Hill Palace, Tripunithura' },
  { slug: 'guruvayur', search: 'Guruvayur Temple' },
  { slug: 'padmanabhaswamy', search: 'Padmanabhaswamy Temple' },
  { slug: 'sabarimala', search: 'Sabarimala' },
  { slug: 'chottanikkara', search: 'Chottanikkara Temple' },
  { slug: 'silent-valley', search: 'Silent Valley National Park' },
  { slug: 'parambikulam', search: 'Parambikulam Tiger Reserve' },
  { slug: 'thattekad', search: 'Thattekad Bird Sanctuary' },
  { slug: 'aralam', search: 'Aralam Wildlife Sanctuary' },
  { slug: 'chinnar', search: 'Chinnar Wildlife Sanctuary' },
  { slug: 'meenmutty', search: 'Meenmutty Falls (Wayanad)' },
  { slug: 'soochipara', search: 'Soochipara Falls' },
  { slug: 'cheeyappara', search: 'Cheeyappara Waterfalls' },
  { slug: 'palaruvi', search: 'Palaruvi Falls' },
  { slug: 'thusharagiri', search: 'Thusharagiri Falls' },
  { slug: 'valara', search: 'Valara' },
  { slug: 'chembra', search: 'Chembra Peak' },
  { slug: 'idukki-dam', search: 'Idukki Dam' },
  { slug: 'banasura', search: 'Banasura Sagar Dam' },
  { slug: 'thenmala', search: 'Thenmala' },
  { slug: 'pookode', search: 'Pookode Lake' },
  // Attraction expansion (zoos, museums, temples, dams, viewpoints, parks...)
  { slug: 'napier-museum', search: 'Napier Museum' },
  { slug: 'poovar-island', search: 'Poovar' },
  { slug: 'jatayu-earth-center', search: 'Jatayu Earth Center' },
  { slug: 'gavi', search: 'Gavi, Kerala' },
  { slug: 'marari', search: 'Marari Beach' },
  { slug: 'ilaveezhapoonchira', search: 'Ilaveezhapoonchira' },
  { slug: 'top-station', search: 'Top Station Munnar' },
  { slug: 'eravikulam', search: 'Eravikulam National Park' },
  { slug: 'mattupetty-dam', search: 'Mattupetty Dam' },
  { slug: 'anamudi', search: 'Anamudi' },
  { slug: 'marine-drive', search: 'Marine Drive, Kochi' },
  { slug: 'santa-cruz-basilica', search: 'Santa Cruz Cathedral Basilica, Kochi' },
  { slug: 'vazhachal', search: 'Vazhachal Falls' },
  { slug: 'thrissur-zoo', search: 'Thrissur Zoo' },
  { slug: 'vadakkumnathan', search: 'Vadakkumnathan Temple' },
  { slug: 'snehatheeram', search: 'Snehatheeram Beach' },
  { slug: 'chavakkad', search: 'Chavakkad Beach' },
  { slug: 'cheraman-masjid', search: 'Cheraman Juma Masjid' },
  { slug: 'malampuzha-dam', search: 'Malampuzha Dam' },
  { slug: 'kottakkunnu', search: 'Kottakkunnu' },
  { slug: 'nilambur-teak-museum', search: 'Teak Museum' },
  { slug: 'kozhikode-beach', search: 'Kozhikode Beach' },
  { slug: 'beypore', search: 'Beypore' },
  { slug: 'ranipuram', search: 'Ranipuram' },
];

const EXCLUDE =
  /\.(svg|gif|tif|tiff|webp|ico|bmp|png)$|logo|icon|flag|seal|emblem|coat|sig|diagram|chart|locator|locator|map|plan|text|watermark|wikimedia|puzzle|question|outline/i;

let lastNetwork = 0;
async function paced(fn) {
  const now = Date.now();
  const wait = Math.max(0, lastNetwork + PACING_MS - now);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNetwork = Date.now();
  return fn();
}

async function api(params, retries = 5, base = API) {
  const url = new URL(base);
  url.search = new URLSearchParams({ ...params, format: 'json', origin: '*' }).toString();
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await paced(() =>
      fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) }),
    );
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  }
  throw new Error(`API rate limited after ${retries} retries`);
}

async function resolve(titles) {
  const q = titles.join('|');
  const data = await api({
    action: 'query',
    prop: 'info|pageimages',
    inprop: 'url',
    piprop: 'original',
    pithumbsize: 1280,
    redirects: 1,
    titles: q,
  });
  const pages = Object.values(data.query?.pages ?? {});
  return pages[0] && pages[0].title ? pages[0] : null;
}

async function listImages(title) {
  const data = await api({
    action: 'query',
    generator: 'images',
    titles: title,
    prop: 'imageinfo',
    iiprop: 'url|size|mime',
    iiurlwidth: 1280,
    gimlimit: 25,
  });
  const pages = Object.values(data.query?.pages ?? {});
  return pages.filter((p) => p.imageinfo && p.imageinfo[0] && p.imageinfo[0].thumburl);
}

// Commons file search (namespace 6) as a fallback for pages with few photos.
async function commonsSearchImages(search, limit = 25) {
  const data = await api(
    {
      action: 'query',
      generator: 'search',
      gsrsearch: search,
      gsrnamespace: 6,
      gsrlimit: limit,
      prop: 'imageinfo',
      iiprop: 'url|size|mime',
      iiurlwidth: 1280,
    },
    5,
    COMMONS_API,
  );
  const pages = Object.values(data.query?.pages ?? {});
  return pages.filter((p) => p.imageinfo && p.imageinfo[0] && p.imageinfo[0].thumburl);
}

function pick(list) {
  const jpeg = list.filter(
    (p) => EXCLUDE.test(p.title) === false && (p.imageinfo[0].mime || '').includes('jpeg'),
  );
  const pool = jpeg.length
    ? jpeg
    : list.filter(
        (p) =>
          EXCLUDE.test(p.title) === false &&
          ((p.imageinfo[0].mime || '').includes('jpeg') || (p.imageinfo[0].mime || '').includes('png')),
      );
  return [...pool].sort((a, b) => b.imageinfo[0].width - a.imageinfo[0].width);
}

async function hasValidFile(p) {
  try {
    const s = await stat(p);
    return s.size >= 20_000;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  // Strip tracking query params (utm_source etc.) — some proxies reject them.
  const clean = url.split('?')[0];
  if (QUIET) {
    // Gentle single-attempt pass: one direct request per file; long cool-down
    // on 429 instead of retry storms (retries keep the rate-limit block alive).
    const r = await paced(() =>
      fetch(clean, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(60000),
      }),
    );
    if (r.status === 429) {
      console.warn('  429, cooling down 120s');
      await new Promise((resolve) => setTimeout(resolve, 120_000));
      throw new Error('rate limited (quiet mode, no retry)');
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    await writeFile(dest, buf);
    if (buf.length < 20_000) throw new Error(`too small ${buf.length}`);
    return { mode: 'direct', bytes: buf.length };
  }
  const attempts = [
    {
      mode: 'direct',
      get: () =>
        fetch(clean, {
          headers: { 'User-Agent': UA },
          signal: AbortSignal.timeout(60000),
        }),
      retries: 3,
    },
    {
      mode: 'proxy',
      get: () =>
        fetch(`https://images.weserv.nl/?url=${encodeURIComponent(clean)}&w=1280`, {
          headers: { 'User-Agent': UA },
          signal: AbortSignal.timeout(120000),
        }),
      retries: 3,
    },
    {
      mode: 'proxy-large',
      get: () =>
        fetch(`https://images.weserv.nl/?url=${encodeURIComponent(clean)}&w=2560`, {
          headers: { 'User-Agent': UA },
          signal: AbortSignal.timeout(120000),
        }),
      retries: 3,
    },
  ];
  for (const attempt of attempts) {
    let res = null;
    for (let tryNum = 0; tryNum <= attempt.retries && !res; tryNum++) {
      const r = await paced(attempt.get);
      if (r.status === 429) {
        console.warn(`  ${attempt.mode} 429, backing off (try ${tryNum + 1})`);
        await new Promise((resolve) => setTimeout(resolve, 15_000 * 2 ** tryNum));
        continue;
      }
      res = r;
    }
    if (res && res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(dest, buf);
      if (buf.length < 20_000) throw new Error(`too small ${buf.length}`);
      return { mode: attempt.mode, bytes: buf.length };
    }
    if (res) console.warn(`  download via ${attempt.mode} failed (${res.status}), trying fallback`);
  }
  throw new Error('download failed (direct + proxy)');
}

async function ensureFile(url, dest) {
  if (await hasValidFile(dest)) return true;
  await download(url, dest);
  return true;
}

function fileExt(url) {
  const e = path.extname(new URL(url).pathname).split('?')[0];
  return e.toLowerCase();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  // Load existing progress so re-runs merge instead of resetting.
  let result = {};
  try {
    result = JSON.parse(await readFile(OUT_JSON, 'utf8'));
  } catch {
    result = {};
  }
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice('--only='.length).split(',').filter(Boolean) : null;
  const failures = [];
  const jobs = only
    ? DESTINATIONS.filter((d) => only.includes(d.slug))
    : [...DESTINATIONS];

  const worker = async () => {
    while (jobs.length) {
      const dest = jobs.shift();
      await processDestination(dest, result, failures);
    }
  };
  await Promise.all(Array.from({ length: 1 }, () => worker()));

  await writeFile(OUT_JSON, JSON.stringify(result, null, 2), 'utf8');
  console.log('\n=== SUMMARY ===');
  console.log(`Saved ${Object.keys(result).length}/${DESTINATIONS.length}`);
  if (failures.length) {
    console.log('Failures:');
    failures.forEach((f) => console.log('  ' + f));
  }
}

async function processDestination(dest, result, failures) {
  try {
    const page = await resolve([dest.search]);
    if (!page) {
      failures.push(`${dest.slug}: no page found`);
      return;
    }

    let images = [];
    try {
      images = pick(await listImages(page.title));
    } catch (err) {
      failures.push(`${dest.slug}: listImages failed (${err.message})`);
      return;
    }

    // Try several cover candidates in order until one downloads.
    const coverCandidates = [
      page.original?.source,
      page.thumbnail?.source,
      ...images.map((i) => i.imageinfo[0].url),
    ].filter(Boolean);

    let coverUrl = null;
    let coverName = null;
    for (const candidate of coverCandidates) {
      const ext = fileExt(candidate) || '.jpg';
      const name = `${dest.slug}-cover${ext}`;
      try {
        await ensureFile(candidate, path.join(OUT_DIR, name));
        coverUrl = candidate;
        coverName = name;
        break;
      } catch {
        // try next candidate
      }
    }
    if (!coverUrl) {
      // Commons fallback for the cover when the article has no usable photos.
      const commons = pick(await commonsSearchImages(dest.search));
      for (const img of commons) {
        if (coverUrl) break;
        const url = img.imageinfo[0].thumburl || img.imageinfo[0].url;
        const ext = fileExt(url) || '.jpg';
        const name = `${dest.slug}-cover${ext}`;
        try {
          await ensureFile(url, path.join(OUT_DIR, name));
          coverUrl = url;
          coverName = name;
        } catch {
          // try next commons candidate
        }
      }
    }
    if (!coverUrl) {
      failures.push(`${dest.slug}: no cover image could be downloaded`);
      return;
    }

    const galleryPaths = [];
    let used = 0;
    const usedUrls = new Set([coverUrl]);
    for (const img of images) {
      if (used >= 6) break;
      const url = img.imageinfo[0].thumburl || img.imageinfo[0].url;
      if (usedUrls.has(url)) continue;
      usedUrls.add(url);
      const ext = fileExt(url) || '.jpg';
      const name = `${dest.slug}-gallery-${galleryPaths.length + 1}${ext}`;
      try {
        await ensureFile(url, path.join(OUT_DIR, name));
        galleryPaths.push(`/images/${name}`);
        used++;
      } catch (err) {
        console.warn(`  ${name} skipped: ${err.message}`);
      }
    }

    // Top up from Commons when the article page has few usable photos.
    if (used < 6) {
      try {
        const commons = pick(await commonsSearchImages(dest.search));
        for (const img of commons) {
          if (used >= 6) break;
          const url = img.imageinfo[0].thumburl || img.imageinfo[0].url;
          if (usedUrls.has(url)) continue;
          usedUrls.add(url);
          const ext = fileExt(url) || '.jpg';
          const name = `${dest.slug}-gallery-${galleryPaths.length + 1}${ext}`;
          try {
            await ensureFile(url, path.join(OUT_DIR, name));
            galleryPaths.push(`/images/${name}`);
            used++;
          } catch (err) {
            console.warn(`  ${name} skipped: ${err.message}`);
          }
        }
      } catch (err) {
        console.warn(`  commons search failed for ${dest.slug}: ${err.message}`);
      }
    }

    result[dest.slug] = {
      image: `/images/${coverName}`,
      gallery: [`/images/${coverName}`, ...galleryPaths],
    };
    // Persist progress after each destination so a mid-run crash never loses work.
    await writeFile(OUT_JSON, JSON.stringify(result, null, 2), 'utf8');
    console.log(
      `OK ${dest.slug}: cover + ${galleryPaths.length} gallery (page="${page.title}")`,
    );
  } catch (err) {
    failures.push(`${dest.slug}: ${err.message}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
