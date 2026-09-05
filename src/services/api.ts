import { EventData, FamilyGuest, EventTable, DecorElement } from '../types';
import { INITIAL_EVENTS } from '../data/initialData';

const LOCAL_STORAGE_KEY = 'eventmaster_events_data_v1';

// Local storage helpers
function getLocalEvents(): EventData[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading localStorage events:', e);
  }
  return INITIAL_EVENTS;
}

function saveLocalEvents(events: EventData[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(events));
  } catch (e) {
    console.error('Error saving localStorage events:', e);
  }
}

export const api = {
  // Fetch all events
  async getEvents(): Promise<EventData[]> {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        // also get full events or update
        return data;
      }
    } catch (err) {
      console.warn('Backend API fetch failed, falling back to local state:', err);
    }
    return getLocalEvents();
  },

  // Fetch single event by ID
  async getEvent(id: string): Promise<EventData | null> {
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(id)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Backend API single event fetch failed, fallback:', err);
    }
    const events = getLocalEvents();
    return events.find(e => e.id === id) || null;
  },

  // Create new event
  async createEvent(eventData: Partial<EventData>): Promise<EventData> {
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      if (res.ok) {
        const created = await res.json();
        const local = getLocalEvents();
        local.unshift(created);
        saveLocalEvents(local);
        return created;
      }
    } catch (err) {
      console.warn('Backend API create failed, using local storage:', err);
    }

    // Local fallback
    const slug = (eventData.title || 'nuevo-evento')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-') || `evento-${Date.now()}`;
    
    const local = getLocalEvents();
    const newEvent: EventData = {
      id: `${slug}-${Date.now().toString(36)}`,
      title: eventData.title || 'Nuevo Evento',
      eventType: eventData.eventType || 'wedding',
      date: eventData.date || new Date().toISOString().split('T')[0],
      time: eventData.time || '18:00',
      location: eventData.location || 'Salón de Eventos',
      description: eventData.description || '',
      adminPin: eventData.adminPin || '1234',
      createdAt: new Date().toISOString(),
      tables: [
        {
          id: `tbl-${Date.now()}-1`,
          eventId: slug,
          name: 'Mesa 1',
          shape: 'round',
          capacity: 8,
          x: 280,
          y: 200,
          color: '#6366f1',
        },
        {
          id: `tbl-${Date.now()}-2`,
          eventId: slug,
          name: 'Mesa 2',
          shape: 'round',
          capacity: 8,
          x: 620,
          y: 200,
          color: '#3b82f6',
        }
      ],
      families: [],
      decorElements: [
        {
          id: `decor-${Date.now()}-stage`,
          type: 'stage',
          label: 'Escenario',
          x: 380,
          y: 20,
          width: 240,
          height: 60,
        }
      ]
    };
    local.unshift(newEvent);
    saveLocalEvents(local);
    return newEvent;
  },

  // Update event
  async updateEvent(id: string, updates: Partial<EventData>): Promise<EventData | null> {
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        const local = getLocalEvents();
        const idx = local.findIndex(e => e.id === id);
        if (idx !== -1) {
          local[idx] = updated;
          saveLocalEvents(local);
        }
        return updated;
      }
    } catch (e) {
      console.warn('Backend update failed:', e);
    }
    const local = getLocalEvents();
    const idx = local.findIndex(e => e.id === id);
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...updates };
      saveLocalEvents(local);
      return local[idx];
    }
    return null;
  },

  // Delete event
  async deleteEvent(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        const local = getLocalEvents().filter(e => e.id !== id);
        saveLocalEvents(local);
        return true;
      }
    } catch (e) {
      console.warn('Backend delete failed:', e);
    }
    const local = getLocalEvents().filter(e => e.id !== id);
    saveLocalEvents(local);
    return true;
  },

  // Register Guest Family (Public)
  async registerFamily(eventId: string, data: {
    firstLastName: string;
    secondLastName: string;
    memberCount: number;
    contactName?: string;
    notes?: string;
    phone?: string;
    email?: string;
  }): Promise<{ message: string; family: FamilyGuest }> {
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/families`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Error al procesar el registro');
      }
      const resData = await res.json();
      return resData;
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) {
        throw err;
      }
      // Local fallback
      const local = getLocalEvents();
      const event = local.find(e => e.id === eventId);
      if (!event) throw new Error('Evento no encontrado');

      const newFamily: FamilyGuest = {
        id: `fam-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        eventId,
        firstLastName: data.firstLastName.trim(),
        secondLastName: data.secondLastName.trim(),
        contactName: data.contactName?.trim() || `${data.firstLastName} ${data.secondLastName}`,
        memberCount: Number(data.memberCount) || 1,
        status: 'pending',
        assignedTableId: null,
        notes: data.notes?.trim() || '',
        phone: data.phone?.trim() || '',
        email: data.email?.trim() || '',
        registeredAt: new Date().toISOString(),
      };
      event.families.push(newFamily);
      saveLocalEvents(local);
      return {
        message: 'Registro exitoso (modo sincronizado local). Se ha guardado en estado: Pendiente de asignación de mesa',
        family: newFamily,
      };
    }
  },

  // Add Table
  async addTable(eventId: string, tableData: Partial<EventTable>): Promise<EventTable> {
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tableData),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend addTable failed:', e);
    }
    const local = getLocalEvents();
    const event = local.find(e => e.id === eventId);
    if (!event) throw new Error('Evento no encontrado');
    const newTbl: EventTable = {
      id: `tbl-${Date.now()}`,
      eventId,
      name: tableData.name || `Mesa ${event.tables.length + 1}`,
      shape: tableData.shape || 'round',
      capacity: Number(tableData.capacity) || 8,
      x: tableData.x || 300,
      y: tableData.y || 300,
      color: tableData.color || '#6366f1',
    };
    event.tables.push(newTbl);
    saveLocalEvents(local);
    return newTbl;
  },

  // Update Table
  async updateTable(eventId: string, tableId: string, updates: Partial<EventTable>): Promise<EventTable | null> {
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/tables/${encodeURIComponent(tableId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend updateTable failed:', e);
    }
    const local = getLocalEvents();
    const event = local.find(e => e.id === eventId);
    if (!event) return null;
    const tbl = event.tables.find(t => t.id === tableId);
    if (!tbl) return null;
    Object.assign(tbl, updates);
    saveLocalEvents(local);
    return tbl;
  },

  // Delete Table
  async deleteTable(eventId: string, tableId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/tables/${encodeURIComponent(tableId)}`, {
        method: 'DELETE',
      });
      if (res.ok) return true;
    } catch (e) {
      console.warn('Backend deleteTable failed:', e);
    }
    const local = getLocalEvents();
    const event = local.find(e => e.id === eventId);
    if (!event) return false;
    event.tables = event.tables.filter(t => t.id !== tableId);
    event.families.forEach(f => {
      if (f.assignedTableId === tableId) {
        f.assignedTableId = null;
        f.status = 'pending';
      }
    });
    saveLocalEvents(local);
    return true;
  },

  // Delete Family
  async deleteFamily(eventId: string, familyId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/families/${encodeURIComponent(familyId)}`, {
        method: 'DELETE',
      });
      if (res.ok) return true;
    } catch (e) {
      console.warn('Backend deleteFamily failed:', e);
    }
    const local = getLocalEvents();
    const event = local.find(e => e.id === eventId);
    if (!event) return false;
    event.families = event.families.filter(f => f.id !== familyId);
    saveLocalEvents(local);
    return true;
  },

  // Assign Table (Drag & Drop) with validation
  async assignTable(eventId: string, familyId: string, tableId: string): Promise<{ success: boolean; error?: string; family?: FamilyGuest }> {
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/assign-table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId, tableId }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'No se pudo asignar la mesa' };
      }
      return { success: true, family: data.family };
    } catch (err: any) {
      // Local fallback with capacity validation
      const local = getLocalEvents();
      const event = local.find(e => e.id === eventId);
      if (!event) return { success: false, error: 'Evento no encontrado' };

      const family = event.families.find(f => f.id === familyId);
      if (!family) return { success: false, error: 'Familia no encontrada' };

      const table = event.tables.find(t => t.id === tableId);
      if (!table) return { success: false, error: 'Mesa no encontrada' };

      const currentOccupied = event.families
        .filter(f => f.assignedTableId === tableId && f.id !== familyId)
        .reduce((sum, f) => sum + (Number(f.memberCount) || 0), 0);

      const needed = Number(family.memberCount) || 0;
      if (currentOccupied + needed > table.capacity) {
        const avail = Math.max(0, table.capacity - currentOccupied);
        return {
          success: false,
          error: `Capacidad excedida en ${table.name}. Capacidad: ${table.capacity} (${currentOccupied} ocupadas, ${avail} disponibles). La familia requiere ${needed} sillas.`,
        };
      }

      family.assignedTableId = table.id;
      family.status = 'assigned';
      saveLocalEvents(local);
      return { success: true, family };
    }
  },

  // Unassign Table
  async unassignTable(eventId: string, familyId: string): Promise<{ success: boolean; family?: FamilyGuest }> {
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/unassign-table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId }),
      });
      const data = await res.json();
      return { success: true, family: data.family };
    } catch (e) {
      const local = getLocalEvents();
      const event = local.find(e => e.id === eventId);
      if (!event) return { success: false };
      const family = event.families.find(f => f.id === familyId);
      if (family) {
        family.assignedTableId = null;
        family.status = 'pending';
        saveLocalEvents(local);
      }
      return { success: true, family };
    }
  },

  // Save decor
  async saveDecor(eventId: string, decorElements: DecorElement[]): Promise<boolean> {
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/decor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decorElements }),
      });
      if (res.ok) return true;
    } catch (e) {
      console.warn('Backend saveDecor failed:', e);
    }
    const local = getLocalEvents();
    const event = local.find(e => e.id === eventId);
    if (event) {
      event.decorElements = decorElements;
      saveLocalEvents(local);
    }
    return true;
  },

  // Reset sample data
  async resetDemoData(): Promise<void> {
    try {
      await fetch('/api/seed', { method: 'POST' });
    } catch (e) {
      console.warn('Backend seed failed:', e);
    }
    saveLocalEvents(INITIAL_EVENTS);
  }
};
