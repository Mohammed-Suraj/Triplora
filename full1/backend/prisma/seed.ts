import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { keralaDestinations, newCategories, destinationPopularity, destinationCoordinates } from '../src/data/keralaDestinations';
import { hotelSeeds } from '../src/data/hotelSeed';
import { restaurantSeeds } from '../src/data/restaurantSeed';
import { experienceSeeds } from '../src/data/experienceSeed';

const prisma = new PrismaClient();

const categories = [
  'Hill Station',
  'Backwaters',
  'Beach',
  'Heritage',
  'Wildlife',
  'Waterfall',
  ...newCategories,
];

// Mirrors src/data/destinations.ts from the existing frontend, so destination
// `slug` values match the frontend's Destination.id values 1:1
// (e.g. GET /api/destinations/munnar resolves via slug).
const destinations = [
  {
    slug: 'munnar',
    name: 'Munnar',
    tagline: 'Rolling hills of emerald tea',
    region: 'Idukki',
    category: 'Hill Station',
    image: '/images/munnar.png',
    rating: 4.9,
    reviewsCount: 2841,
    priceFrom: 4500,
    duration: '2-3 days',
    bestSeason: 'Sep - May',
    description:
      'A hill station draped in endless tea plantations, misty valleys and cool mountain air at 1,600 metres above sea level.',
    longDescription:
      "Munnar is Kerala's most beloved hill station, where emerald tea gardens roll across the Western Ghats as far as the eye can see. Once the summer resort of the British Raj, it remains a sanctuary of cool air, winding mountain roads and mist that drifts through the valleys each morning. Visit the Tea Museum, trek to Anamudi \u2014 South India's highest peak \u2014 or simply watch the light change over the plantations from a hilltop cottage.",
    highlights: ['Tea plantation walks', 'Eravikulam National Park', 'Anamudi Peak', 'Mattupetty Dam', 'Top Station viewpoint'],
    activities: ['Trekking', 'Tea tasting', 'Wildlife spotting', 'Photography', 'Camping'],
    gallery: ['/images/munnar.png', '/images/thekkady.png', '/images/wayanad.png'],
  },
  {
    slug: 'alleppey',
    name: 'Alleppey',
    tagline: 'Venice of the East',
    region: 'Alappuzha',
    category: 'Backwaters',
    image: '/images/alleppey.png',
    rating: 4.8,
    reviewsCount: 3120,
    priceFrom: 6800,
    duration: '1-2 days',
    bestSeason: 'Nov - Feb',
    description:
      'Drift along serene backwaters aboard a traditional kettuvallam houseboat through a maze of canals, lagoons and paddy fields.',
    longDescription:
      "Alappuzha \u2014 affectionately called Alleppey \u2014 is the heart of Kerala's backwater country. A night aboard a converted rice-barge houseboat is one of India's definitive travel experiences: glide past emerald paddies below sea level, watch village life unfold along the banks, and dine on freshly caught karimeen as the sun sets over the lagoon. The annual Nehru Trophy snake-boat race each August turns the waters into a thundering spectacle.",
    highlights: ['Houseboat overnight cruise', 'Alleppey Beach', 'Kuttanad paddy fields', 'Snake boat races', 'Village canoe tours'],
    activities: ['Houseboat cruise', 'Kayaking', 'Village walks', 'Ayurvedic spa', 'Birdwatching'],
    gallery: ['/images/alleppey.png', '/images/hero-kerala.png', '/images/kochi.png'],
  },
  {
    slug: 'kochi',
    name: 'Kochi',
    tagline: 'Where cultures converge',
    region: 'Ernakulam',
    category: 'Heritage',
    image: '/images/kochi.png',
    rating: 4.7,
    reviewsCount: 2564,
    priceFrom: 3200,
    duration: '2 days',
    bestSeason: 'Oct - Mar',
    description: 'A port city of Chinese fishing nets, colonial lanes, spice markets and a thriving contemporary art scene.',
    longDescription:
      "Kochi has drawn traders from across the seas for six centuries \u2014 Portuguese, Dutch, British, Arab and Chinese influences layer its streets. Watch the iconic cheena vala fishing nets rise at sunset, wander the art-splashed lanes of Fort Kochi, browse antique shops in Jew Town, and catch a Kathakali performance at dusk. The Kochi-Muziris Biennale has made the city South Asia's contemporary art capital.",
    highlights: ['Chinese fishing nets', 'Fort Kochi heritage walk', 'Mattancherry Palace', 'Kathakali performances', 'Marine Drive'],
    activities: ['Heritage walks', 'Art galleries', 'Food tours', 'Sunset cruises', 'Shopping'],
    gallery: ['/images/kochi.png', '/images/alleppey.png', '/images/kovalam.png'],
  },
  {
    slug: 'wayanad',
    name: 'Wayanad',
    tagline: 'Wild heart of the Ghats',
    region: 'Wayanad',
    category: 'Wildlife',
    image: '/images/wayanad.png',
    rating: 4.8,
    reviewsCount: 1987,
    priceFrom: 5200,
    duration: '2-3 days',
    bestSeason: 'Oct - May',
    description: "Misty rainforests, prehistoric caves, waterfalls and wildlife sanctuaries in Kerala's green northern highlands.",
    longDescription:
      "Wayanad is where Kerala turns wild. Dense rainforest cloaks the hills, wild elephants roam the sanctuaries, and the heart-shaped Chembra lake rewards trekkers at the summit of the district's highest peak. Explore the Edakkal Caves with their Neolithic petroglyphs, chase the spray at Meenmutty Falls, and wake to mist rolling over coffee and spice plantations.",
    highlights: ['Chembra Peak trek', 'Edakkal Caves', 'Wayanad Wildlife Sanctuary', 'Banasura Sagar Dam', 'Coffee plantations'],
    activities: ['Trekking', 'Cave exploration', 'Safari', 'Ziplining', 'Plantation stays'],
    gallery: ['/images/wayanad.png', '/images/munnar.png', '/images/athirappally.png'],
  },
  {
    slug: 'varkala',
    name: 'Varkala',
    tagline: 'Cliffs over the Arabian Sea',
    region: 'Thiruvananthapuram',
    category: 'Beach',
    image: '/images/varkala.png',
    rating: 4.7,
    reviewsCount: 2233,
    priceFrom: 3800,
    duration: '2-3 days',
    bestSeason: 'Nov - Mar',
    description: 'Dramatic red laterite cliffs rising above golden sands, natural springs and a laid-back clifftop caf\u00e9 culture.',
    longDescription:
      "Varkala is unlike any other beach in India \u2014 russet cliffs plunge to a ribbon of golden sand and the turquoise Arabian Sea. The clifftop path is strung with caf\u00e9s, yoga shalas and boutiques, while below, Papanasam Beach's mineral springs are believed to wash away sins. Sunsets here are ritual: the whole town gathers on the cliff edge as the sky turns crimson.",
    highlights: ['North Cliff sunsets', 'Papanasam Beach', 'Janardanaswamy Temple', 'Kappil Lagoon', 'Yoga retreats'],
    activities: ['Surfing', 'Yoga', 'Paragliding', 'Cliff walks', 'Ayurveda'],
    gallery: ['/images/varkala.png', '/images/kovalam.png', '/images/bekal.png'],
  },
  {
    slug: 'thekkady',
    name: 'Thekkady',
    tagline: 'Realm of wild elephants',
    region: 'Idukki',
    category: 'Wildlife',
    image: '/images/thekkady.png',
    rating: 4.6,
    reviewsCount: 1756,
    priceFrom: 4200,
    duration: '1-2 days',
    bestSeason: 'Sep - May',
    description: 'Home to Periyar Tiger Reserve, where boat safaris drift past herds of wild elephants on a forest-ringed lake.',
    longDescription:
      "Thekkady is the gateway to the Periyar Tiger Reserve, one of India's finest wildlife sanctuaries. Boat safaris on Periyar Lake offer sightings of elephants, gaur, sambar and \u2014 for the fortunate \u2014 tigers coming to the water's edge. The surrounding hills are carpeted with cardamom, pepper and cinnamon plantations, and guided spice walks fill the air with fragrance.",
    highlights: ['Periyar Lake boat safari', 'Bamboo rafting', 'Spice plantation tours', 'Elephant sightings', 'Nature walks'],
    activities: ['Boat safari', 'Bamboo rafting', 'Spice tours', 'Border trekking', 'Night patrols'],
    gallery: ['/images/thekkady.png', '/images/wayanad.png', '/images/munnar.png'],
  },
  {
    slug: 'athirappally',
    name: 'Athirappally',
    tagline: 'The Niagara of India',
    region: 'Thrissur',
    category: 'Waterfall',
    image: '/images/athirappally.png',
    rating: 4.7,
    reviewsCount: 1432,
    priceFrom: 2800,
    duration: '1 day',
    bestSeason: 'Jun - Jan',
    description: "Kerala's mightiest waterfall thunders 25 metres over rocky cliffs into rainforest, spectacular in monsoon spate.",
    longDescription:
      "Athirappally Falls is Kerala at its most dramatic \u2014 the Chalakudy River plunges 25 metres in a wall of white water framed by dense Sholayar rainforest. During the monsoon the falls swell to a thundering torrent visible from kilometres away. The surrounding forests shelter hornbills, lion-tailed macaques and elephants, and the drive along the Chalakudy river valley is among the state's most scenic.",
    highlights: ['Main falls viewpoint', 'Vazhachal Falls', 'Riverside rainforest walks', 'Hornbill spotting', 'Charpa Falls'],
    activities: ['Waterfall treks', 'River bathing', 'Birdwatching', 'Photography', 'Picnics'],
    gallery: ['/images/athirappally.png', '/images/wayanad.png', '/images/thekkady.png'],
  },
  {
    slug: 'bekal',
    name: 'Bekal',
    tagline: 'Fortress by the sea',
    region: 'Kasaragod',
    category: 'Heritage',
    image: '/images/bekal.png',
    rating: 4.5,
    reviewsCount: 987,
    priceFrom: 3500,
    duration: '1-2 days',
    bestSeason: 'Oct - Mar',
    description: "A 300-year-old laterite fort standing sentinel over unspoiled beaches on Kerala's far northern coast.",
    longDescription:
      "Bekal Fort is the largest and best-preserved fort in Kerala, its massive laterite ramparts rising directly from the Arabian Sea. Built in the 1650s, its keyhole-shaped walls offer sweeping views of an untouched coastline. The beaches here are among Kerala's quietest, and nearby Valiyaparamba backwaters offer houseboat cruises without the crowds of the south.",
    highlights: ['Bekal Fort ramparts', 'Bekal Beach', 'Valiyaparamba backwaters', 'Kappil Beach', 'Theyyam rituals'],
    activities: ['Fort exploration', 'Beach walks', 'Houseboat cruises', 'Theyyam viewing', 'Water sports'],
    gallery: ['/images/bekal.png', '/images/varkala.png', '/images/kochi.png'],
  },
  {
    slug: 'kovalam',
    name: 'Kovalam',
    tagline: 'Crescent of golden sand',
    region: 'Thiruvananthapuram',
    category: 'Beach',
    image: '/images/kovalam.png',
    rating: 4.6,
    reviewsCount: 2678,
    priceFrom: 4000,
    duration: '2-3 days',
    bestSeason: 'Sep - Mar',
    description: "Three crescent beaches beneath a candy-striped lighthouse \u2014 Kerala's original and most iconic seaside escape.",
    longDescription:
      "Kovalam put Kerala on the world travel map in the 1970s, and its three crescent coves remain irresistible. Lighthouse Beach, watched over by the red-and-white striped Vizhinjam lighthouse, hums with seafood shacks and surf schools; Hawa Beach is calmer; Samudra quieter still. Ayurvedic resorts line the palm-fringed shore, offering the treatments that made Kerala the home of wellness travel.",
    highlights: ['Lighthouse Beach', 'Vizhinjam Lighthouse climb', 'Ayurvedic treatments', 'Surf schools', 'Seafood shacks'],
    activities: ['Surfing', 'Ayurveda', 'Catamaran rides', 'Lighthouse visits', 'Swimming'],
    gallery: ['/images/kovalam.png', '/images/varkala.png', '/images/bekal.png'],
  },
];

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  console.log('Seeding categories...');
  const categoryMap = new Map<string, string>();
  for (const name of categories) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, slug: toSlug(name) },
    });
    categoryMap.set(name, category.id);
  }

  console.log('Seeding destinations...');
  const allDestinations = [...destinations, ...keralaDestinations];
  for (const dest of allDestinations) {
    const categoryId = categoryMap.get(dest.category);
    if (!categoryId) continue;

    await prisma.destination.upsert({
      where: { slug: dest.slug },
      // Refresh image/gallery from the seed pipeline on re-runs (e.g. after
      // new images are fetched) while leaving admin-edited text untouched.
      update: {
        image: dest.image,
        gallery: dest.gallery,
      },
      create: {
        slug: dest.slug,
        name: dest.name,
        tagline: dest.tagline,
        region: dest.region,
        image: dest.image,
        gallery: dest.gallery,
        rating: dest.rating,
        reviewsCount: dest.reviewsCount,
        popularityScore: destinationPopularity[dest.slug] ?? 0,
        priceFrom: dest.priceFrom,
        latitude: destinationCoordinates[dest.slug]?.latitude ?? null,
        longitude: destinationCoordinates[dest.slug]?.longitude ?? null,
        duration: dest.duration,
        bestSeason: dest.bestSeason,
        description: dest.description,
        longDescription: dest.longDescription,
        highlights: dest.highlights,
        activities: dest.activities,
        isFeatured: ['munnar', 'alleppey', 'kochi'].includes(dest.slug),
        category: { connect: { id: categoryId } },
      },
    });
  }

  // Backfill curated popularity scores and real GPS coordinates for rows that
  // already existed before these fields were introduced (idempotent; safe to
  // run repeatedly).
  console.log('Applying popularity scores and coordinates...');
  for (const [slug, score] of Object.entries(destinationPopularity)) {
    await prisma.destination.updateMany({
      where: { slug },
      data: { popularityScore: score },
    });
  }
  for (const [slug, coords] of Object.entries(destinationCoordinates)) {
    await prisma.destination.updateMany({
      where: { slug },
      data: { latitude: coords.latitude, longitude: coords.longitude },
    });
  }

  console.log('Seeding hotels...');
  for (const hotel of hotelSeeds) {
    const destination = await prisma.destination.findUnique({
      where: { slug: hotel.destinationSlug },
      select: { id: true },
    });
    if (!destination) continue;

    const created = await prisma.hotel.upsert({
      where: { slug: hotel.slug },
      // Refresh image/gallery on re-runs while leaving admin edits untouched.
      update: { image: hotel.image, gallery: hotel.gallery },
      create: {
        slug: hotel.slug,
        name: hotel.name,
        tagline: hotel.tagline,
        description: hotel.description,
        longDescription: hotel.longDescription,
        image: hotel.image,
        gallery: hotel.gallery,
        starRating: hotel.starRating,
        rating: hotel.rating,
        reviewsCount: hotel.reviewsCount,
        popularityScore: hotel.popularityScore,
        priceFrom: hotel.priceFrom,
        hotelType: hotel.hotelType,
        location: hotel.location,
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        distanceFromAttraction: hotel.distanceFromAttraction,
        checkIn: hotel.checkIn,
        checkOut: hotel.checkOut,
        cancellationPolicy: hotel.cancellationPolicy,
        amenities: hotel.amenities,
        familyFriendly: hotel.familyFriendly,
        coupleFriendly: hotel.coupleFriendly,
        freeBreakfast: hotel.freeBreakfast,
        freeWiFi: hotel.freeWiFi,
        swimmingPool: hotel.swimmingPool,
        parking: hotel.parking,
        airConditioning: hotel.airConditioning,
        nearbyAttractions: hotel.nearbyAttractions,
        nearbyRestaurants: hotel.nearbyRestaurants,
        nearbyTransport: hotel.nearbyTransport,
        destinationId: destination.id,
      },
    });

    for (const room of hotel.rooms) {
      await prisma.hotelRoom.upsert({
        where: { hotelId_name: { hotelId: created.id, name: room.name } },
        update: {
          pricePerNight: room.pricePerNight,
          totalRooms: room.totalRooms,
          images: room.images && room.images.length > 0 ? room.images : [created.image],
        },
        create: {
          hotelId: created.id,
          name: room.name,
          description: room.description ?? null,
          pricePerNight: room.pricePerNight,
          maxGuests: room.maxGuests,
          bedType: room.bedType,
          totalRooms: room.totalRooms,
          amenities: room.amenities,
          images: room.images && room.images.length > 0 ? room.images : [created.image],
        },
      });
    }
  }

  console.log('Seeding restaurants...');
  for (const restaurant of restaurantSeeds) {
    await prisma.restaurant.upsert({
      where: { slug: restaurant.slug },
      // Refresh demo-facing fields on re-runs while leaving admin edits untouched.
      update: { image: restaurant.image, gallery: restaurant.gallery, rating: restaurant.rating, reviewsCount: restaurant.reviewsCount },
      create: {
        slug: restaurant.slug,
        name: restaurant.name,
        tagline: restaurant.tagline,
        description: restaurant.description,
        longDescription: restaurant.longDescription,
        category: restaurant.category,
        cuisines: restaurant.cuisines,
        priceRange: restaurant.priceRange,
        priceLevel: restaurant.priceLevel,
        openingHours: restaurant.openingHours,
        phone: restaurant.phone,
        address: restaurant.address,
        city: restaurant.city,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        googleMapsUrl: restaurant.googleMapsUrl,
        rating: restaurant.rating,
        ratingNote: restaurant.ratingNote,
        popularityScore: restaurant.popularityScore,
        bestFor: restaurant.bestFor,
        image: restaurant.image,
        gallery: restaurant.gallery,
      },
    });
  }

  console.log('Seeding experiences...');
  for (const experience of experienceSeeds) {
    await prisma.experience.upsert({
      where: { slug: experience.slug },
      update: {
        image: experience.image,
        gallery: experience.gallery,
        rating: experience.rating,
        reviewsCount: experience.reviewsCount,
        isFeatured: experience.isFeatured,
      },
      create: {
        slug: experience.slug,
        name: experience.name,
        tagline: experience.tagline,
        description: experience.description,
        longDescription: experience.longDescription,
        category: experience.category,
        duration: experience.duration,
        price: experience.price,
        location: experience.location,
        city: experience.city,
        latitude: experience.latitude,
        longitude: experience.longitude,
        difficulty: experience.difficulty,
        bestSeason: experience.bestSeason,
        suitableFor: experience.suitableFor,
        highlights: experience.highlights,
        rating: experience.rating,
        ratingNote: experience.ratingNote,
        popularityScore: experience.popularityScore,
        isFeatured: experience.isFeatured,
        image: experience.image,
        gallery: experience.gallery,
      },
    });
  }

  console.log('Seeding demo hotel reviews...');
  const demoUser = await prisma.user.findUnique({ where: { email: 'demo@triplora.travel' } });
  if (demoUser) {
    const reviewTargets = [
      { hotelSlug: 'teanest-munnar', rating: 5, comment: 'The veranda views over the tea estate are unreal. Home-cooked dinners, bonfire nights and a host family that treats you like their own. Worth every rupee.' },
      { hotelSlug: 'mist-valley-resort-munnar', rating: 4, comment: 'Gorgeous infinity pool above the clouds and a fantastic spa. Rooms are plush; breakfast buffet is outstanding.' },
      { hotelSlug: 'lake-palace-alleppey', rating: 5, comment: 'Stayed two nights and took the houseboat for a day trip. Antique charm meets real comfort — the karimeen pollichathu at sunset is a memory for life.' },
    ];
    for (const target of reviewTargets) {
      const hotel = await prisma.hotel.findUnique({ where: { slug: target.hotelSlug }, select: { id: true } });
      if (!hotel) continue;
      await prisma.hotelReview.upsert({
        where: { userId_hotelId: { userId: demoUser.id, hotelId: hotel.id } },
        update: {},
        create: {
          userId: demoUser.id,
          hotelId: hotel.id,
          rating: target.rating,
          comment: target.comment,
          stayDate: new Date(),
        },
      });
    }
  }

  console.log('Seeding demo user...');
  const passwordHash = await bcrypt.hash('Password@123', 12);
  await prisma.user.upsert({
    where: { email: 'demo@triplora.travel' },
    update: {},
    create: {
      name: 'Demo Traveller',
      email: 'demo@triplora.travel',
      password: passwordHash,
      role: 'USER',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@triplora.travel' },
    update: {},
    create: {
      name: 'Triplora Admin',
      email: 'admin@triplora.travel',
      password: passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
