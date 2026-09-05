import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { INITIAL_EVENTS } from './src/data/initialData';
import { EventData, FamilyGuest, EventTable, DecorElement } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory data store initialized with default events
let eventsStore: EventData[] = JSON.parse(JSON.stringify(INITIAL_EVENTS));

// ==========================================
// API ROUTES
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), eventsCount: eventsStore.length });
});

// GET all events (Summary for Admin selector)
app.get('/api/events', (req, res) => {
  const summaries = eventsStore.map(ev => {
    const totalGuests = ev.families.reduce((acc, f) => acc + (Number(f.memberCount) || 0), 0);
    const assignedGuests = ev.families
      .filter(f => f.status === 'assigned' && f.assignedTableId)
      .reduce((acc, f) => acc + (Number(f.memberCount) || 0), 0);
    const totalCapacity = ev.tables.reduce((acc, t) => acc + (Number(t.capacity) || 0), 0);
    const pendingGuests = totalGuests - assignedGuests;

    return {
      id: ev.id,
      title: ev.title,
      eventType: ev.eventType,
      date: ev.date,
      time: ev.time,
      location: ev.location,
      description: ev.description,
      adminPin: ev.adminPin,
      createdAt: ev.createdAt,
      stats: {
        totalFamilies: ev.families.length,
        totalGuests,
        assignedGuests,
        pendingGuests,
        totalTables: ev.tables.length,
        totalCapacity,
        occupancyRate: totalCapacity > 0 ? Math.min(100, Math.round((assignedGuests / totalCapacity) * 100)) : 0,
      }
    };
  });
  res.json(summaries);
});

// GET single event with full tables and families
app.get('/api/events/:id', (req, res) => {
  const event = eventsStore.find(e => e.id === req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Evento no encontrado' });
  }
  res.json(event);
});

// POST create a new event
app.post('/api/events', (req, res) => {
  const { title, eventType, date, time, location, description, adminPin } = req.body;
  if (!title || !date) {
    return res.status(400).json({ error: 'El título y la fecha son obligatorios' });
  }

  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `evento-${Date.now()}`;

  // Unique ID check
  let finalId = slug;
  let counter = 1;
  while (eventsStore.some(e => e.id === finalId)) {
    finalId = `${slug}-${counter++}`;
  }

  const newEvent: EventData = {
    id: finalId,
    title,
    eventType: eventType || 'other',
    date,
    time: time || '19:00',
    location: location || 'Salón Principal',
    description: description || '',
    adminPin: adminPin || '1234',
    createdAt: new Date().toISOString(),
    tables: [
      {
        id: `tbl-${Date.now()}-1`,
        eventId: finalId,
        name: 'Mesa 1',
        shape: 'round',
        capacity: 8,
        x: 280,
        y: 200,
        color: '#6366f1',
      },
      {
        id: `tbl-${Date.now()}-2`,
        eventId: finalId,
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
      },
      {
        id: `decor-${Date.now()}-entrance`,
        type: 'entrance',
        label: 'Acceso Principal',
        x: 400,
        y: 600,
        width: 200,
        height: 45,
      }
    ]
  };

  eventsStore.unshift(newEvent);
  res.status(201).json(newEvent);
});

// PUT update event details
app.put('/api/events/:id', (req, res) => {
  const eventIndex = eventsStore.findIndex(e => e.id === req.params.id);
  if (eventIndex === -1) {
    return res.status(404).json({ error: 'Evento no encontrado' });
  }

  const updated = {
    ...eventsStore[eventIndex],
    ...req.body,
    id: eventsStore[eventIndex].id, // preserve ID
  };

  eventsStore[eventIndex] = updated;
  res.json(updated);
});

// DELETE event
app.delete('/api/events/:id', (req, res) => {
  const initialLength = eventsStore.length;
  eventsStore = eventsStore.filter(e => e.id !== req.params.id);
  if (eventsStore.length === initialLength) {
    return res.status(404).json({ error: 'Evento no encontrado' });
  }
  res.json({ message: 'Evento eliminado con éxito' });
});

// POST register a family/guest (PUBLIC FORM)
// Requirements: strictly linked to eventId, fields: firstLastName, secondLastName, memberCount
// Status saved as: 'pending' (Pendiente de asignación de mesa)
app.post('/api/events/:id/families', (req, res) => {
  const event = eventsStore.find(e => e.id === req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'El evento especificado no existe o ha expirado' });
  }

  const { firstLastName, secondLastName, memberCount, contactName, notes, phone, email } = req.body;

  if (!firstLastName || !firstLastName.trim()) {
    return res.status(400).json({ error: 'El primer apellido de la familia es obligatorio' });
  }
  if (!secondLastName || !secondLastName.trim()) {
    return res.status(400).json({ error: 'El segundo apellido de la familia es obligatorio' });
  }
  const count = Number(memberCount);
  if (!count || count < 1) {
    return res.status(400).json({ error: 'El número total de integrantes debe ser al menos 1' });
  }

  const newFamily: FamilyGuest = {
    id: `fam-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    eventId: event.id,
    firstLastName: firstLastName.trim(),
    secondLastName: secondLastName.trim(),
    contactName: (contactName || `${firstLastName.trim()} ${secondLastName.trim()}`).trim(),
    memberCount: count,
    status: 'pending', // Requerido: Guardarse en estado 'Pendiente de asignación de mesa'
    assignedTableId: null,
    notes: notes?.trim() || '',
    phone: phone?.trim() || '',
    email: email?.trim() || '',
    registeredAt: new Date().toISOString(),
  };

  event.families.push(newFamily);
  res.status(201).json({
    message: 'Registro exitoso. Se ha guardado en estado: Pendiente de asignación de mesa',
    family: newFamily,
  });
});

// DELETE a family
app.delete('/api/events/:id/families/:familyId', (req, res) => {
  const event = eventsStore.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

  const idx = event.families.findIndex(f => f.id === req.params.familyId);
  if (idx === -1) return res.status(404).json({ error: 'Familia no encontrada' });

  event.families.splice(idx, 1);
  res.json({ message: 'Familia eliminada correctamente' });
});

// POST add a table
app.post('/api/events/:id/tables', (req, res) => {
  const event = eventsStore.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

  const { name, shape, capacity, x, y, color } = req.body;
  const tableCapacity = Number(capacity) || 8;

  const newTable: EventTable = {
    id: `tbl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    eventId: event.id,
    name: name?.trim() || `Mesa ${event.tables.length + 1}`,
    shape: shape || 'round',
    capacity: tableCapacity,
    x: typeof x === 'number' ? x : 350,
    y: typeof y === 'number' ? y : 250,
    color: color || '#6366f1',
  };

  event.tables.push(newTable);
  res.status(201).json(newTable);
});

// PUT update table (position, name, capacity, shape)
app.put('/api/events/:id/tables/:tableId', (req, res) => {
  const event = eventsStore.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

  const table = event.tables.find(t => t.id === req.params.tableId);
  if (!table) return res.status(404).json({ error: 'Mesa no encontrada' });

  if (req.body.name !== undefined) table.name = req.body.name;
  if (req.body.shape !== undefined) table.shape = req.body.shape;
  if (req.body.capacity !== undefined) table.capacity = Number(req.body.capacity) || 1;
  if (req.body.x !== undefined) table.x = Number(req.body.x);
  if (req.body.y !== undefined) table.y = Number(req.body.y);
  if (req.body.color !== undefined) table.color = req.body.color;

  res.json(table);
});

// DELETE table
app.delete('/api/events/:id/tables/:tableId', (req, res) => {
  const event = eventsStore.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

  // Unassign all families seated at this table back to pending
  event.families.forEach(f => {
    if (f.assignedTableId === req.params.tableId) {
      f.assignedTableId = null;
      f.status = 'pending';
    }
  });

  event.tables = event.tables.filter(t => t.id !== req.params.tableId);
  res.json({ message: 'Mesa eliminada y familias devueltas a pendientes' });
});

// POST assign family to table with capacity validation
app.post('/api/events/:id/assign-table', (req, res) => {
  const event = eventsStore.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

  const { familyId, tableId } = req.body;
  const family = event.families.find(f => f.id === familyId);
  if (!family) return res.status(404).json({ error: 'Familia no encontrada' });

  const table = event.tables.find(t => t.id === tableId);
  if (!table) return res.status(404).json({ error: 'Mesa no encontrada' });

  // Calculate current occupied seats in this table (excluding this family if already here)
  const currentOccupied = event.families
    .filter(f => f.assignedTableId === tableId && f.id !== familyId)
    .reduce((sum, f) => sum + (Number(f.memberCount) || 0), 0);

  const neededSeats = Number(family.memberCount) || 0;
  const totalAfter = currentOccupied + neededSeats;

  // Capacity validation rule
  if (totalAfter > table.capacity) {
    const available = Math.max(0, table.capacity - currentOccupied);
    return res.status(400).json({
      error: `Capacidad excedida en ${table.name}. La mesa tiene capacidad de ${table.capacity} sillas (${currentOccupied} ocupadas, ${available} disponibles). La familia requiere ${neededSeats} sillas.`,
      capacity: table.capacity,
      currentOccupied,
      available,
      neededSeats,
    });
  }

  family.assignedTableId = table.id;
  family.status = 'assigned';

  res.json({
    message: `Familia ${family.firstLastName} ${family.secondLastName} asignada exitosamente a ${table.name}`,
    family,
    table,
    currentOccupied: totalAfter,
    capacity: table.capacity,
  });
});

// POST unassign family from table
app.post('/api/events/:id/unassign-table', (req, res) => {
  const event = eventsStore.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

  const { familyId } = req.body;
  const family = event.families.find(f => f.id === familyId);
  if (!family) return res.status(404).json({ error: 'Familia no encontrada' });

  family.assignedTableId = null;
  family.status = 'pending';

  res.json({ message: 'Familia desasignada y devuelta al estado pendiente', family });
});

// PUT update decor elements
app.put('/api/events/:id/decor', (req, res) => {
  const event = eventsStore.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

  event.decorElements = req.body.decorElements || [];
  res.json({ message: 'Decoración actualizada', decorElements: event.decorElements });
});

// POST Reset/Seed default events
app.post('/api/seed', (req, res) => {
  eventsStore = JSON.parse(JSON.stringify(INITIAL_EVENTS));
  res.json({ message: 'Base de datos restaurada a datos demo', count: eventsStore.length });
});

// ==========================================
// VITE MIDDLEWARE & STATIC SERVING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EventMaster Pro Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
