import type { BudgetType, ContactStatus, Prisma, Role, TravelStyle } from '@prisma/client';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: Role;
  createdAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface DestinationDTO {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  region: string;
  category: string;
  image: string;
  gallery: string[];
  rating: number;
  reviews: number;
  popularityScore: number;
  priceFrom: number;
  latitude: number | null;
  longitude: number | null;
  duration: string;
  bestSeason: string;
  description: string;
  longDescription: string;
  highlights: string[];
  activities: string[];
}

export interface ItineraryDayDTO {
  day: number;
  focus: string;
  destination: DestinationDTO;
}

export interface TripPlanDTO {
  id: string;
  title: string | null;
  budget: BudgetType;
  days: number;
  travelStyle: TravelStyle;
  interests: string[];
  payload: Prisma.JsonValue | null;
  createdAt: Date;
  itinerary: ItineraryDayDTO[];
}

export type PlannerItemType = 'HOTEL' | 'RESTAURANT' | 'DESTINATION' | 'EXPERIENCE';

export interface PlannerTripItem {
  id: string;
  type: PlannerItemType;
  refId: string | null;
  name: string;
  city: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  image: string;
  price: number;
  rating: number;
  duration: string;
  category: string;
  slug: string;
  href: string;
}

export interface PlannerTripDay {
  id: string;
  title: string;
  notes: string;
  /** AI-generated content (added by Deep AI Optimize; optional for hand-built trips). */
  description?: string;
  morning?: string;
  afternoon?: string;
  evening?: string;
  estimatedDailyCost?: string;
  localTransportation?: string[];
  nearbyAttractions?: string[];
  hiddenGems?: string[];
  shopping?: string[];
  travelTips?: string[];
  items: PlannerTripItem[];
}

export interface PlannerPackingItem {
  label: string;
  checked: boolean;
}

export interface PlannerTripDTO {
  id: string;
  title: string;
  startDate: string | null;
  days: PlannerTripDay[];
  packing: PlannerPackingItem[];
  shareCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactMessageDTO {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: ContactStatus;
  createdAt: Date;
}
