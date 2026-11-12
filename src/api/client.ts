import type { AuthUser, Booking, CreateBookingInput, Room, RoomScene, Tour } from './types';

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
    return j.message ?? j.error ?? j.title ?? text;
  } catch {
    return text;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    // Evita la página de aviso del plan gratuito de ngrok; es inofensivo en otros casos.
    'ngrok-skip-browser-warning': '1',
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, { ...init, headers });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión y la URL.', 0, true);
  }
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
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
  return (await res.json()) as T;
}

export const api = {
  signIn: (username: string, password: string) =>
    request<AuthUser>('/api/v1/authentication/sign-in', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  searchRooms: (p: { district?: string; guests?: number; maxPrice?: number }) => {
    const q = new URLSearchParams();
    if (p.district) q.set('district', p.district);
    if (p.guests) q.set('guests', String(p.guests));
    if (p.maxPrice) q.set('maxPrice', String(p.maxPrice));
    const s = q.toString();
    return request<Room[]>(`/api/v1/rooms/search${s ? `?${s}` : ''}`);
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
  roomTour: (id: number) => request<Tour>(`/api/v1/rooms/${id}/tour`),
  myBookings: () => request<Booking[]>('/api/v1/bookings/mine'),
  cancelBooking: (id: number) => request<Booking>(`/api/v1/bookings/${id}/cancel`, { method: 'POST' }),
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
