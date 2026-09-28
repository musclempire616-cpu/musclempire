export interface Offer {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  discount: string;
  badge: string;
  validTill: string;
  ctaText: string;
  whatsappMessage: string;
  isFeatured?: boolean;
  showInPopup?: boolean;
  image?: string;
  couponCode?: string;
  status?: "active" | "upcoming" | "expired";
}

export const activeOffers: Offer[] = [];

export const defaultExpiredOffers: Offer[] = [];
