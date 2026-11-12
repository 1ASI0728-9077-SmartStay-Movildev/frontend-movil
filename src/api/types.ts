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
