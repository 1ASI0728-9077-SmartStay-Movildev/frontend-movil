import type {
  AdminRoom,
  AuthUser,
  Booking,
  ConciergeRequest,
  ConciergeResponse,
  CreateBookingInput,
  Hotel,
  HotelInput,
  LayoutCatalog,
  LayoutPreview,
  LayoutView,
  Metrics,
  Payment,
  PaymentInput,
  Profile,
  ProfileInput,
  Room,
  RoomInput,
  RoomLayout,
  RoomScene,
  RoomType,
  Tour,
  UserItem,
} from './types';

declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };

// Todo vive solo en memoria: no se usa AsyncStorage ni caché.
let baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8080').replace(/\/+$/, '');
let token: string | null = null;

export const getBaseUrl = () => baseUrl;
export const setBaseUrl = (url: string) => {
  baseUrl = url.trim().replace(/\/+$/, '');
};
export const setToken = (t: string | null) => {
  token = t;
};

// La sesión vive solo en memoria; si el servidor responde 401 con token, se cierra sesión.
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public network = false,
  ) {
    super(message);
  }
}

async function readError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    if (typeof j === 'string') return j;
    // Errores de validación: { errors: [..] } o { errors: { Campo: [..] } }
    if (Array.isArray(j.errors)) return j.errors.join('\n');
    if (j.errors && typeof j.errors === 'object') {
      const all = (Object.values(j.errors) as unknown[]).flat().filter((x) => typeof x === 'string');
      if (all.length) return all.join('\n');
    }
    return j.message ?? j.error ?? j.title ?? text;
  } catch {
    return text;
  }
}

async function request<T>(path: string, init: RequestInit & { extraHeaders?: Record<string, string> } = {}): Promise<T> {
  const { extraHeaders, ...rest } = init;
  init = rest;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    // Evita la página de aviso del plan gratuito de ngrok; es inofensivo en otros casos.
    'ngrok-skip-browser-warning': '1',
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders ?? {}),
  };
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, { ...init, headers });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión y la URL.', 0, true);
  }
  if (!res.ok) {
    if (res.status === 401 && token && !path.endsWith('/change-password')) onUnauthorized?.();
    const detail = await readError(res);
    const fallback: Record<number, string> = {
      401: 'Credenciales inválidas o sesión vencida.',
      403: 'No tienes permiso para esta acción.',
      404: 'No encontrado.',
      409: 'La habitación ya está reservada en esas fechas.',
      429: 'Demasiadas solicitudes. Espera un momento.',
    };
    throw new ApiError(detail || fallback[res.status] || `Error ${res.status}`, res.status);
  }
  // Algunas respuestas vienen vacías o como texto plano.
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

const json = (method: string, body?: unknown): RequestInit =>
  body === undefined ? { method } : { method, body: JSON.stringify(body) };
type Msg = { message: string };

export const api = {
  signIn: (username: string, password: string) =>
    request<AuthUser>('/api/v1/authentication/sign-in', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  signUp: (username: string, password: string) =>
    request<Msg>('/api/v1/authentication/sign-up', json('POST', { username, password })),
  searchRooms: (p: {
    district?: string;
    guests?: number;
    minPrice?: number;
    maxPrice?: number;
    minArea?: number;
    bedType?: string;
  }) => {
    const parts: string[] = [];
    (Object.keys(p) as (keyof typeof p)[]).forEach((k) => {
      const v = p[k];
      if (v !== undefined && v !== '' && v !== 0) parts.push(`${k}=${encodeURIComponent(String(v))}`);
    });
    return request<Room[]>(`/api/v1/rooms/search${parts.length ? `?${parts.join('&')}` : ''}`);
  },
  // El backend recibe fechas ISO (igual que el frontend web): AAAA-MM-DDT00:00:00Z
  createBooking: (b: CreateBookingInput) =>
    request<Booking>('/api/v1/bookings', {
      method: 'POST',
      body: JSON.stringify({
        ...b,
        checkInDate: `${b.checkInDate}T00:00:00Z`,
        checkOutDate: `${b.checkOutDate}T00:00:00Z`,
      }),
    }),
  roomScene: (id: number) => request<RoomScene>(`/api/v1/rooms/${id}/vr`),
  // El backend guarda la ruta del recorrido como ".../manifest.json" y le añade el nombre de la foto,
  // lo que produce ".../manifest.json/entry.jpg" (no existe). Se quita ese tramo para llegar a la foto real.
  roomTour: async (id: number) => {
    const tour = await request<Tour>(`/api/v1/rooms/${id}/tour`);
    return {
      ...tour,
      nodes: (tour?.nodes ?? []).map((n) => ({ ...n, panorama: String(n.panorama).replace(/\/manifest\.json(?=\/)/i, '') })),
    };
  },
  myBookings: () => request<Booking[]>('/api/v1/bookings/mine'),
  cancelBooking: (id: number) => request<Booking>(`/api/v1/bookings/${id}/cancel`, { method: 'POST' }),

  // ---- Cuenta y perfil ----
  changePassword: (currentPassword: string, newPassword: string) =>
    request<Msg>('/api/v1/users/change-password', json('POST', { currentPassword, newPassword })),
  profileByUser: (userId: number) => request<Profile>(`/api/v1/profiles/user/${userId}`),
  createProfile: (p: ProfileInput) => request<Profile>('/api/v1/profiles', json('POST', p)),

  // ---- Pagos (simulados por el backend) ----
  pay: (p: PaymentInput, idempotencyKey: string) =>
    request<Payment>('/api/v1/payments', { ...json('POST', p), extraHeaders: { 'Idempotency-Key': idempotencyKey } }),
  paymentByBooking: (bookingId: number) => request<Payment>(`/api/v1/payments/booking/${bookingId}`),

  // ---- Concierge (IA) ----
  concierge: (r: ConciergeRequest) => request<ConciergeResponse>('/api/v1/concierge/messages', json('POST', r)),

  // ---- Catálogo ----
  hotels: () => request<Hotel[]>('/api/v1/hotels'),
  createHotel: (h: HotelInput & { hostId: number }) => request<Hotel>('/api/v1/hotels', json('POST', h)),
  updateHotel: (id: number, h: HotelInput) => request<Hotel>(`/api/v1/hotels/${id}`, json('PUT', h)),
  deleteHotel: (id: number) => request<Hotel>(`/api/v1/hotels/${id}`, json('DELETE')),
  rooms: () => request<AdminRoom[]>('/api/v1/rooms'),
  createRoom: (r: RoomInput & { hotelId: number }) => request<AdminRoom>('/api/v1/rooms', json('POST', r)),
  updateRoom: (id: number, r: RoomInput) => request<AdminRoom>(`/api/v1/rooms/${id}`, json('PUT', r)),
  deleteRoom: (id: number) => request<AdminRoom>(`/api/v1/rooms/${id}`, json('DELETE')),
  roomTypes: () => request<RoomType[]>('/api/v1/room-types'),
  createRoomType: (name: string, description: string) =>
    request<RoomType>('/api/v1/room-types', json('POST', { name, description })),
  categories: () => request<string[]>('/api/v1/accommodations/options/categories'),
  amenities: () => request<string[]>('/api/v1/accommodations/options/amenities'),
  createCategory: (name: string) => request<string>('/api/v1/accommodations/options/categories', json('POST', { name })),
  createAmenity: (name: string) => request<string>('/api/v1/accommodations/options/amenities', json('POST', { name })),

  // ---- Layout (vista 3D) ----
  layoutCatalog: () => request<LayoutCatalog>('/api/v1/rooms/layout/catalog'),
  layoutPreview: (l: RoomLayout) => request<LayoutPreview>('/api/v1/rooms/layout/preview', json('POST', l)),
  roomLayout: (id: number) => request<LayoutView>(`/api/v1/rooms/${id}/layout`),
  saveRoomLayout: (id: number, l: RoomLayout) => request<LayoutView>(`/api/v1/rooms/${id}/layout`, json('PUT', l)),

  // ---- Reservas (administración) ----
  allBookings: () => request<Booking[]>('/api/v1/bookings'),
  bookingsByRoom: (roomId: number) => request<Booking[]>(`/api/v1/bookings/room/${roomId}`),
  confirmBooking: (id: number) => request<Booking>(`/api/v1/bookings/${id}/confirm`, { method: 'POST' }),

  // ---- Usuarios (administración) ----
  users: () => request<UserItem[]>('/api/v1/users'),
  createUser: (u: { username: string; password: string; role: string; hotelId: number | null; chainId: number | null }) =>
    request<Msg>('/api/v1/users', json('POST', u)),
  updateUser: (
    id: number,
    u: { newUsername?: string; newPassword?: string; newHotelId?: number; newChainId?: number },
  ) => request<Msg>(`/api/v1/users/${id}`, json('PUT', u)),
  assignRole: (id: number, newRole: string) =>
    request<Msg>(`/api/v1/users/${id}/assign-role`, json('POST', { targetUserId: id, newRole })),
  deactivateUser: (id: number) => request<Msg>(`/api/v1/users/${id}`, json('DELETE')),
  activateUser: (id: number) => request<Msg>(`/api/v1/users/${id}/activate`, { method: 'POST' }),
  profiles: () => request<Profile[]>('/api/v1/profiles'),

  // ---- Reporte ----
  monthlyMetrics: () => request<Metrics>('/api/v1/analytics/performance/monthly'),
};

export function validScene(s: RoomScene | null | undefined): s is RoomScene {
  return !!(
    s?.room &&
    [s.room.widthM, s.room.lengthM, s.room.heightM].every((n) => Number.isFinite(n) && n > 0) &&
    Array.isArray(s.walls) &&
    Array.isArray(s.beds)
  );
}

// Las imágenes se descargan desde la app (así funcionan CORS y la cabecera de ngrok)
// y se pasan al visor como data URL. Solo se aceptan rutas del mismo servidor.
export async function fetchImageDataUrl(path: string): Promise<string> {
  let url: string;
  if (/^https?:\/\//i.test(path)) {
    if (!path.toLowerCase().startsWith(baseUrl.toLowerCase() + '/')) {
      throw new ApiError('El panorama no pertenece al servidor configurado.', 0);
    }
    url = path;
  } else {
    url = baseUrl + (path.startsWith('/') ? '' : '/') + path;
  }
  let res: Response;
  try {
    res = await fetch(url, { headers: { 'ngrok-skip-browser-warning': '1' } });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión y la URL.', 0, true);
  }
  if (!res.ok) throw new ApiError(`No se pudo cargar la imagen (${res.status}).`, res.status);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new ApiError('Imagen inválida.', 0));
    reader.readAsDataURL(blob);
  });
}