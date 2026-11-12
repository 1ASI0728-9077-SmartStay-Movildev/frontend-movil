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
