export type Room = {
  roomId: number;
  hotelId: number;
  hotelName: string;
  district: string;
  city: string;
  roomTypeName: string;
  nightlyPrice: number;
  currency: string;
  capacity: number;
  isBookable: boolean;
  tourPath: string | null;
  amenities: string[];
  areaM2?: number | null;
  bedSummary?: string | null;
  hasVr?: boolean | null;
};

export type BookingStatus = 'PendingPayment' | 'Confirmed' | 'Cancelled' | 'Expired';

export type Booking = {
  id: number;
  roomId: number;
  hotelId: number;
  guestName: string;
  guestEmail: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: number;
  currency: string;
  status: BookingStatus | string;
};

export type AuthUser = {
  id: number;
  username: string;
  token: string;
  role: string;
  hotelId: number | null;
  chainId: number | null;
};

export type CreateBookingInput = {
  roomId: number;
  guestName: string;
  guestEmail: string;
  checkInDate: string;
  checkOutDate: string;
};

export type RoomScene = {
  room: {
    widthM: number;
    lengthM: number;
    heightM: number;
    areaM2?: number;
    floor?: string;
    wallColor?: string;
  };
  walls: {
    start: { x: number; z: number };
    end: { x: number; z: number };
    heightM: number;
    openings?: { offsetM: number; widthM: number; sillM: number; heightM: number }[];
  }[];
  beds: {
    x: number;
    z: number;
    rotationDeg: number;
    widthM: number;
    lengthM: number;
    heightM: number;
  }[];
  panels?: { id: string; title: string; text: string }[];
};

export type Tour = {
  startNodeId: string;
  nodes: { id: string; name: string; panorama: string; links?: { nodeId: string }[] }[];
};

// ---- Cuenta y perfil ----
export type Profile = { id: number; fullName: string; email: string; streetAddress: string; userId: number | null };
export type ProfileInput = {
  firstName: string;
  lastName: string;
  email: string;
  street: string;
  number: string;
  city: string;
  postalCode: string;
  country: string;
  userId: number;
};

// ---- Pagos ----
export type Payment = {
  id: number;
  bookingId: number;
  transactionId: string;
  amount: number;
  status: 'Pending' | 'Completed' | 'Failed' | 'Refunded' | string;
  cardNumberMasked: string;
  paymentDate: string;
};
export type PaymentInput = {
  bookingId: number;
  amount: number;
  paymentMethod: string;
  cardNumber: string;
  cardHolderName: string;
  expirationDate: string;
  cvv: string;
};

// ---- Concierge (IA) ----
export type ConciergeRequest = {
  message: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  district: string;
  budgetTotal: number;
  currency: 'USD';
};
export type ConciergeOffer = {
  roomId: number;
  hotelId: number;
  hotelName: string;
  roomTypeName: string;
  district: string;
  nightlyPrice: number;
  stayTotal: number;
  currency: string;
  capacity: number;
  tourPath: string | null;
  amenities: string[];
};
export type ConciergeResponse = { assistantMessage: string; offers: ConciergeOffer[]; fallbackUsed: boolean };

// ---- Administración ----
export type Hotel = {
  id: number;
  hostId: number;
  name: string;
  location: string;
  imageUrl: string;
  description: string;
  basePrice: number;
  type: string;
  amenities: string[];
};
export type HotelInput = {
  name: string;
  address: string;
  city: string;
  country: string;
  imageUrl: string;
  description: string;
  type: string;
  amenities: string[];
};
export type AdminRoom = {
  id: number;
  hotelId: number;
  roomTypeId: number;
  roomTypeName: string;
  price: number;
  description: string;
  amenities: string[];
};
export type RoomInput = { roomTypeId: number; price: number; description: string; amenities: string[] };
export type RoomType = { id: number; name: string; description: string };
export type UserItem = {
  id: number;
  username: string;
  role: string;
  status: string;
  hotelId: number | null;
  chainId: number | null;
  createdAt: string;
  updatedAt: string;
};
export type Metrics = {
  totalRevenue: number;
  totalBookings: number;
  occupancyRate: number;
  cancelledBookings: number;
  generatedAt: string;
};

// ---- Layout de habitación (base de la vista 3D) ----
export type Wall = 'N' | 'S' | 'E' | 'W';
export type LayoutOpening = { wall: string; offset: number; width: number };
export type LayoutBed = { type: string; x: number; z: number; rotationDeg: number };
export type RoomLayout = {
  widthM: number;
  lengthM: number;
  heightM: number;
  floor: string;
  wallColor: string;
  beds: LayoutBed[];
  windows: LayoutOpening[];
  door: LayoutOpening;
};
export type LayoutCatalog = {
  beds: { type: string; label: string; widthM: number; lengthM: number; guests: number }[];
  floors: string[];
  minSideM: number;
  maxSideM: number;
  minHeightM: number;
  maxHeightM: number;
  maxBeds: number;
  maxWindows: number;
};
export type LayoutPreview = {
  isValid: boolean;
  areaM2: number;
  guestCapacity: number;
  bedSummary: string;
  errors: string[];
};
export type LayoutView = { roomId: number; areaM2: number; guestCapacity: number; bedSummary: string; layout?: RoomLayout | null };
