/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { AdminPanel } from './components/AdminPanel';
import { GuestRegisterForm } from './components/GuestRegisterForm';
import { TableSeatingOrganizer } from './components/TableSeatingOrganizer';
import { api } from './services/api';
import { EventData, AppView, FamilyGuest, EventTable } from './types';
import { Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AppView>({ type: 'admin_dashboard' });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('eventmaster_admin_auth') === 'true';
  });
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync URL query params or hash params with view state
  const parseViewFromUrl = useCallback((): AppView => {
    // 1. Check window.location.search
    let params = new URLSearchParams(window.location.search);
    let viewParam = params.get('view');
    let eventIdParam = params.get('eventId');

    // 2. Fallback: Check window.location.hash if not in search
    if (!viewParam && window.location.hash) {
      const hashStr = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
      const queryIdx = hashStr.indexOf('?');
      const hashQuery = queryIdx !== -1 ? hashStr.slice(queryIdx) : hashStr;
      const hashParams = new URLSearchParams(hashQuery);
      viewParam = hashParams.get('view') || viewParam;
      eventIdParam = hashParams.get('eventId') || eventIdParam;
    }

    if (viewParam === 'register' && eventIdParam) {
      return { type: 'guest_register', eventId: decodeURIComponent(eventIdParam).trim() };
    }
    if (viewParam === 'seating' && eventIdParam) {
      return { type: 'table_organizer', eventId: decodeURIComponent(eventIdParam).trim() };
    }
    return { type: 'admin_dashboard' };
  }, []);

  const updateUrlForView = (view: AppView) => {
    const url = new URL(window.location.href);
    if (view.type === 'guest_register') {
      url.searchParams.set('view', 'register');
      url.searchParams.set('eventId', view.eventId);
    } else if (view.type === 'table_organizer') {
      url.searchParams.set('view', 'seating');
      url.searchParams.set('eventId', view.eventId);
    } else {
      url.searchParams.delete('view');
      url.searchParams.delete('eventId');
    }
    window.history.pushState({}, '', url.toString());
  };

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
    updateUrlForView(view);
    if ('eventId' in view && view.eventId) {
      setSelectedEventId(view.eventId);
    }
  };

  // Load initial events from API
  const loadEvents = async () => {
    setIsLoading(true);
    try {
      // Parse desired view from URL immediately
      const parsedView = parseViewFromUrl();
      setCurrentView(parsedView);

      let data = await api.getEvents();

      // If the URL specifies a particular eventId, ensure we have it loaded
      if ('eventId' in parsedView && parsedView.eventId) {
        const targetId = parsedView.eventId;
        const lowerTarget = targetId.toLowerCase();
        const found = data.some(
          e => e.id === targetId || 
               e.id.toLowerCase() === lowerTarget || 
               decodeURIComponent(e.id).toLowerCase() === lowerTarget
        );
        if (!found) {
          try {
            const single = await api.getEvent(targetId);
            if (single) {
              data = [single, ...data];
            }
          } catch (e) {
            console.warn('Could not fetch specific event:', e);
          }
        }
        setSelectedEventId(targetId);
      } else if (data.length > 0) {
        setSelectedEventId(data[0].id);
      }

      setEvents(data);
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();

    const handlePopState = () => {
      const parsed = parseViewFromUrl();
      setCurrentView(parsed);
      if ('eventId' in parsed && parsed.eventId) {
        setSelectedEventId(parsed.eventId);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Admin authentication handlers
  const handleAdminAuthenticate = (pin: string): boolean => {
    // Master admin password or event-specific pin
    const trimmed = pin.trim();
    const valid = trimmed === 'termine12.nx' || events.some(e => e.adminPin === trimmed);
    if (valid) {
      setIsAdminAuthenticated(true);
      localStorage.setItem('eventmaster_admin_auth', 'true');
    }
    return valid;
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('eventmaster_admin_auth');
    handleNavigate({ type: 'admin_dashboard' });
  };

  // Event actions
  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
  };

  const handleCreateEvent = async (data: Partial<EventData>) => {
    const created = await api.createEvent(data);
    setEvents(prev => [created, ...prev]);
    setSelectedEventId(created.id);
    showToast('success', `Evento "${created.title}" creado con éxito`);
  };

  const handleDeleteEvent = async (eventId: string) => {
    await api.deleteEvent(eventId);
    setEvents(prev => prev.filter(e => e.id !== eventId));
    if (selectedEventId === eventId) {
      const remaining = events.filter(e => e.id !== eventId);
      setSelectedEventId(remaining[0]?.id || null);
    }
    showToast('success', 'Evento eliminado correctamente');
  };

  // Guest registration handler (Public form)
  const handleGuestRegistration = async (formData: {
    firstLastName: string;
    secondLastName: string;
    memberCount: number;
    contactName?: string;
    notes?: string;
    phone?: string;
    email?: string;
  }): Promise<{ message: string; family: FamilyGuest }> => {
    const targetEventId = ('eventId' in currentView && currentView.eventId) 
      ? currentView.eventId 
      : activeEvent?.id;

    if (!targetEventId) {
      throw new Error('No hay evento activo seleccionado');
    }

    const result = await api.registerFamily(targetEventId, formData);
    
    // Update local state for the active event
    setEvents(prev => prev.map(ev => {
      if (ev.id === targetEventId) {
        return {
          ...ev,
          families: [...(ev.families || []), result.family],
        };
      }
      return ev;
    }));

    return result;
  };

  // Seating actions (Assign / Unassign / Tables)
  const handleAssignTable = async (familyId: string, tableId: string) => {
    if (!activeEvent) return { success: false, error: 'No hay evento activo' };

    const result = await api.assignTable(activeEvent.id, familyId, tableId);
    if (result.success && result.family) {
      setEvents(prev => prev.map(ev => {
        if (ev.id === activeEvent.id) {
          return {
            ...ev,
            families: ev.families.map(f => f.id === familyId ? (result.family as FamilyGuest) : f),
          };
        }
        return ev;
      }));
    }
    return result;
  };

  const handleUnassignTable = async (familyId: string) => {
    if (!activeEvent) return { success: false };

    const result = await api.unassignTable(activeEvent.id, familyId);
    if (result.success && result.family) {
      setEvents(prev => prev.map(ev => {
        if (ev.id === activeEvent.id) {
          return {
            ...ev,
            families: ev.families.map(f => f.id === familyId ? (result.family as FamilyGuest) : f),
          };
        }
        return ev;
      }));
    }
    return { success: true };
  };

  const handleAddTable = async (tableData: Partial<EventTable>) => {
    if (!activeEvent) return;
    const newTbl = await api.addTable(activeEvent.id, tableData);
    setEvents(prev => prev.map(ev => {
      if (ev.id === activeEvent.id) {
        return {
          ...ev,
          tables: [...ev.tables, newTbl],
        };
      }
      return ev;
    }));
    showToast('success', `Mesa "${newTbl.name}" agregada`);
  };

  const handleUpdateTable = async (tableId: string, updates: Partial<EventTable>) => {
    if (!activeEvent) return;
    const updated = await api.updateTable(activeEvent.id, tableId, updates);
    if (updated) {
      setEvents(prev => prev.map(ev => {
        if (ev.id === activeEvent.id) {
          return {
            ...ev,
            tables: ev.tables.map(t => t.id === tableId ? updated : t),
          };
        }
        return ev;
      }));
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!activeEvent) return;
    await api.deleteTable(activeEvent.id, tableId);
    setEvents(prev => prev.map(ev => {
      if (ev.id === activeEvent.id) {
        return {
          ...ev,
          tables: ev.tables.filter(t => t.id !== tableId),
          families: ev.families.map(f => f.assignedTableId === tableId ? { ...f, assignedTableId: null, status: 'pending' } : f),
        };
      }
      return ev;
    }));
    showToast('success', 'Mesa eliminada');
  };

  const handleResetDemoData = async () => {
    if (confirm('¿Restaurar los eventos demo de prueba?')) {
      await api.resetDemoData();
      await loadEvents();
      showToast('success', 'Datos demo restaurados correctamente');
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Find currently active event object
  const activeEventId = ('eventId' in currentView && currentView.eventId) ? currentView.eventId : selectedEventId;
  const activeEvent = (() => {
    if (!activeEventId) return events[0] || null;
    const clean = activeEventId.trim();
    const lower = clean.toLowerCase();
    const decoded = decodeURIComponent(clean).toLowerCase();
    return (
      events.find(e => e.id === clean) ||
      events.find(e => e.id.toLowerCase() === lower) ||
      events.find(e => decodeURIComponent(e.id).toLowerCase() === decoded) ||
      events[0] ||
      null
    );
  })();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-300">Cargando EventMaster Pro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      
      {/* NAVBAR: Solamente visible en el Panel de Administración */}
      {currentView.type === 'admin_dashboard' && (
        <Navbar
          currentView={currentView}
          onNavigate={handleNavigate}
          activeEvent={activeEvent}
          isAdminAuthenticated={isAdminAuthenticated}
          onAdminLogout={handleAdminLogout}
        />
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-4 duration-200">
          <div className={`px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}>
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* VIEW ROUTER */}
      <main className="flex-1 flex flex-col">
        {currentView.type === 'admin_dashboard' && (
          <AdminPanel
            events={events}
            selectedEventId={activeEvent?.id || null}
            onSelectEvent={handleSelectEvent}
            onCreateEvent={handleCreateEvent}
            onDeleteEvent={handleDeleteEvent}
            onNavigate={handleNavigate}
            isAuthenticated={isAdminAuthenticated}
            onAuthenticate={handleAdminAuthenticate}
            onResetDemo={handleResetDemoData}
          />
        )}

        {currentView.type === 'guest_register' && (
          <GuestRegisterForm
            event={activeEvent}
            onSubmitRegistration={handleGuestRegistration}
          />
        )}

        {currentView.type === 'table_organizer' && (
          activeEvent ? (
            <TableSeatingOrganizer
              event={activeEvent}
              onAssignTable={handleAssignTable}
              onUnassignTable={handleUnassignTable}
              onAddTable={handleAddTable}
              onUpdateTable={handleUpdateTable}
              onDeleteTable={handleDeleteTable}
            />
          ) : (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-white">
              <div className="max-w-md w-full text-center bg-slate-800/80 p-8 rounded-2xl border border-slate-700 shadow-xl">
                <h2 className="text-xl font-bold font-serif">Evento no encontrado</h2>
                <p className="text-xs text-slate-400 mt-2">
                  El enlace de asignación de mesas no corresponde a un evento activo.
                </p>
              </div>
            </div>
          )
        )}
      </main>

    </div>
  );
}
