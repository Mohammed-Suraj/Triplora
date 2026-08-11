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
