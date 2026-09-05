export type EventType = 'wedding' | 'conference' | 'birthday' | 'gala' | 'corporate' | 'other';

export type GuestStatus = 'pending' | 'assigned';

export interface FamilyGuest {
  id: string;
  eventId: string;
  firstLastName: string; // Primer apellido
  secondLastName: string; // Segundo apellido
  contactName?: string; // Nombre del titular/contacto
  memberCount: number; // Total de integrantes
  status: GuestStatus; // 'pending' | 'assigned'
  assignedTableId: string | null;
  notes?: string;
  phone?: string;
  email?: string;
  registeredAt: string;
}

export type TableShape = 'round' | 'rectangular' | 'square';

export interface EventTable {
  id: string;
  eventId: string;
  name: string; // Nombre / Número de mesa
  shape: TableShape;
  capacity: number; // Capacidad máxima de sillas
  x: number; // Posición X en el lienzo (px)
  y: number; // Posición Y en el lienzo (px)
  color?: string; // Color distintivo o categoría
}

export type DecorType = 'stage' | 'dancefloor' | 'dj' | 'bar' | 'entrance' | 'buffet' | 'restroom';

export interface DecorElement {
  id: string;
  type: DecorType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EventData {
  id: string;
  title: string;
  eventType: EventType;
  date: string;
  time: string;
  location: string;
  description: string;
  adminPin: string;
  createdAt: string;
  tables: EventTable[];
  families: FamilyGuest[];
  decorElements: DecorElement[];
}

export type AppView = 
  | { type: 'admin_dashboard' }
  | { type: 'guest_register'; eventId: string }
  | { type: 'table_organizer'; eventId: string };
