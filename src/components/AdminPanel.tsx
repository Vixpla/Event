import React, { useState } from 'react';
import { 
  Plus, Calendar, MapPin, Clock, Users, Grid, Link, Copy, Check, ExternalLink, 
  Trash2, Edit3, Shield, Lock, Unlock, QrCode, FileDown, Search, Sparkles, RefreshCw, 
  PieChart, AlertCircle, ArrowRight
} from 'lucide-react';
import { EventData, EventType, AppView } from '../types';
import { QRCodeModal } from './QRCodeModal';
import { exportSeatingChartToPDF } from '../services/pdfExporter';

interface AdminPanelProps {
  events: EventData[];
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  onCreateEvent: (data: Partial<EventData>) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
  onNavigate: (view: AppView) => void;
  isAuthenticated: boolean;
  onAuthenticate: (pin: string) => boolean;
  onResetDemo: () => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  events,
  selectedEventId,
  onSelectEvent,
  onCreateEvent,
  onDeleteEvent,
  onNavigate,
  isAuthenticated,
  onAuthenticate,
  onResetDemo,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  
  // Create Event Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<EventType>('wedding');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('18:00');
  const [newLocation, setNewLocation] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPin, setNewPin] = useState('termine12.nx');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Copy status
  const [copiedLinkType, setCopiedLinkType] = useState<string | null>(null);

  // QR Modal State
  const [qrModalData, setQrModalData] = useState<{ isOpen: boolean; url: string; title: string; subtitle?: string }>({
    isOpen: false,
    url: '',
    title: '',
  });

  // Selected event data
  const selectedEvent = events.find(e => e.id === selectedEventId) || events[0] || null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput) {
      setPinError('Ingrese el PIN de administrador');
      return;
    }
    const success = onAuthenticate(pinInput);
    if (!success) {
      setPinError('Contraseña incorrecta. (Contraseña por defecto: termine12.nx)');
    } else {
      setPinError('');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateEvent({
        title: newTitle.trim(),
        eventType: newType,
        date: newDate,
        time: newTime,
        location: newLocation.trim() || 'Salón Principal',
        description: newDescription.trim(),
        adminPin: newPin.trim() || 'termine12.nx',
      });
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewLocation('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBaseAppUrl = () => {
    return window.location.origin + window.location.pathname;
  };

  const getRegisterUrl = (eventId: string) => {
    return `${getBaseAppUrl()}?view=register&eventId=${encodeURIComponent(eventId)}`;
  };

  const getSeatingUrl = (eventId: string) => {
    return `${getBaseAppUrl()}?view=seating&eventId=${encodeURIComponent(eventId)}`;
  };

  const handleCopy = (text: string, typeKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLinkType(typeKey);
    setTimeout(() => setCopiedLinkType(null), 2500);
  };

  const handleExportPDF = async (ev: EventData) => {
    await exportSeatingChartToPDF(ev);
  };

  // If not authenticated, show restricted Admin Lock Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
        <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-amber-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Lock className="w-7 h-7 text-amber-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold font-serif text-slate-900">Acceso de Administrador</h2>
            <p className="text-xs text-slate-500 mt-1">
              Panel restringido para organizadores y administradores de eventos
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Contraseña de Administrador
              </label>
              <input
                id="input-admin-pin"
                type="password"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError('');
                }}
                placeholder="Ingresa la contraseña"
                className="w-full text-center text-lg font-mono py-3 px-4 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                autoFocus
              />
              {pinError && (
                <p className="text-xs font-medium text-rose-600 mt-1.5 flex items-center gap-1 justify-center">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {pinError}
                </p>
              )}
            </div>

            <button
              id="btn-submit-admin-pin"
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>Desbloquear Panel</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Contraseña predeterminada:</span>
            <button 
              onClick={() => { setPinInput('termine12.nx'); }}
              className="font-mono font-semibold text-indigo-600 hover:underline bg-indigo-50 px-2 py-0.5 rounded"
            >
              termine12.nx
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filter events
  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || e.eventType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Sesión de Administrador Activa
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 mt-1">
            Panel de Control de Eventos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Selecciona o crea un evento para gestionar su registro público y el mapa de mesas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-new-event"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nuevo Evento</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: EVENTS SELECTOR & LIST (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Selector de Eventos ({events.length})
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                Haz clic para activar
              </span>
            </div>

            {/* Search & Filter */}
            <div className="space-y-2 mb-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar evento por nombre o lugar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              {/* Type Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {['all', 'wedding', 'conference', 'birthday', 'gala', 'corporate'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-2.5 py-1 rounded-full whitespace-nowrap capitalize transition-colors ${
                      filterType === type 
                        ? 'bg-slate-900 text-white font-medium' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {type === 'all' ? 'Todos' : type === 'wedding' ? 'Bodas' : type === 'conference' ? 'Conferencias' : type === 'birthday' ? 'Cumpleaños' : type}
                  </button>
                ))}
              </div>
            </div>

            {/* Events List */}
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredEvents.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-500">No se encontraron eventos</p>
                </div>
              ) : (
                filteredEvents.map((ev) => {
                  const isSelected = selectedEvent?.id === ev.id;
                  const totalGuests = (ev.families || []).reduce((acc, f) => acc + (Number(f.memberCount) || 0), 0);
                  const assignedGuests = (ev.families || [])
                    .filter(f => f.status === 'assigned' && f.assignedTableId)
                    .reduce((acc, f) => acc + (Number(f.memberCount) || 0), 0);
                  const totalCapacity = (ev.tables || []).reduce((acc, t) => acc + (Number(t.capacity) || 0), 0);

                  return (
                    <div
                      key={ev.id}
                      id={`event-item-${ev.id}`}
                      onClick={() => onSelectEvent(ev.id)}
                      className={`group p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-50/90 to-indigo-50/40 border-indigo-500/80 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              ev.eventType === 'wedding' ? 'bg-pink-100 text-pink-700' :
                              ev.eventType === 'conference' ? 'bg-blue-100 text-blue-700' :
                              ev.eventType === 'birthday' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {ev.eventType === 'wedding' ? 'Boda' : ev.eventType === 'conference' ? 'Conferencia' : ev.eventType === 'birthday' ? 'Fiesta' : ev.eventType}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/90 px-2 py-0.5 rounded-md">
                                ACTIVO
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                            {ev.title}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {ev.date}
                            </span>
                            <span className="flex items-center gap-1 truncate max-w-[140px]">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {ev.location}
                            </span>
                          </div>
                        </div>

                        {/* Quick Delete */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`¿Estás seguro de eliminar el evento "${ev.title}"?`)) {
                              onDeleteEvent(ev.id);
                            }
                          }}
                          title="Eliminar evento"
                          className="text-slate-300 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Mini stats badges */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-[11px] text-slate-600">
                        <span className="flex items-center gap-1 font-medium">
                          <Users className="w-3 h-3 text-indigo-500" />
                          {assignedGuests}/{totalGuests} invitados
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <Grid className="w-3 h-3 text-slate-400" />
                          {ev.tables.length} mesas ({totalCapacity} sillas)
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: ACTIVE EVENT HUB & INDEPENDENT PUBLIC URLS (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {selectedEvent ? (
            <div className="space-y-6">
              
              {/* Event Main Summary Card */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-indigo-100/50 to-transparent rounded-bl-full pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                        Evento Seleccionado
                      </span>
                      <span className="text-xs text-slate-400 font-mono">ID: {selectedEvent.id}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold font-serif text-slate-900">
                      {selectedEvent.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 mt-2">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        {selectedEvent.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        {selectedEvent.time} hrs
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                        {selectedEvent.location}
                      </span>
                    </div>
                  </div>

                  <button
                    id="btn-export-pdf-header"
                    onClick={() => handleExportPDF(selectedEvent)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-2 self-start"
                  >
                    <FileDown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Descargar PDF</span>
                  </button>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                    <p className="text-[11px] font-medium text-slate-500">Familias Registradas</p>
                    <p className="text-lg font-bold text-slate-800 mt-0.5">{(selectedEvent.families || []).length}</p>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                    <p className="text-[11px] font-medium text-slate-500">Total Personas</p>
                    <p className="text-lg font-bold text-indigo-600 mt-0.5">
                      {(selectedEvent.families || []).reduce((acc, f) => acc + (Number(f.memberCount) || 0), 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                    <p className="text-[11px] font-medium text-slate-500">Asignadas a Mesa</p>
                    <p className="text-lg font-bold text-emerald-600 mt-0.5">
                      {(selectedEvent.families || []).filter(f => f.status === 'assigned' && f.assignedTableId).reduce((acc, f) => acc + (Number(f.memberCount) || 0), 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                    <p className="text-[11px] font-medium text-slate-500">Capacidad Total</p>
                    <p className="text-lg font-bold text-slate-800 mt-0.5">
                      {(selectedEvent.tables || []).reduce((acc, t) => acc + (Number(t.capacity) || 0), 0)} sillas
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION: TWO INDEPENDENT PUBLIC URLS (REQUISITO 1) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-600" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                    URLs Públicas e Independientes del Evento
                  </h3>
                </div>

                {/* 1. URL PÚBLICA DEL FORMULARIO DE REGISTRO (PARA INVITADOS) */}
                <div 
                  id="card-url-guest-register"
                  className="bg-white rounded-2xl border-2 border-amber-200/70 p-5 shadow-xs relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm">
                        1
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">
                          URL Pública del Formulario de Registro (Invitados)
                        </h4>
                        <p className="text-xs text-slate-500">
                          Comparte este enlace o QR con las familias para que registren sus datos.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                      Público para Invitados
                    </span>
                  </div>

                  {/* URL Box */}
                  <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2 mt-3 font-mono text-xs text-slate-700">
                    <span className="truncate max-w-[280px] sm:max-w-md">
                      {getRegisterUrl(selectedEvent.id)}
                    </span>
                    <button
                      id="btn-copy-register-url"
                      onClick={() => handleCopy(getRegisterUrl(selectedEvent.id), 'register')}
                      className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-sans font-semibold transition-all flex items-center gap-1 shrink-0"
                    >
                      {copiedLinkType === 'register' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar URL</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-amber-100">
                    <button
                      id="btn-open-register-view"
                      onClick={() => onNavigate({ type: 'guest_register', eventId: selectedEvent.id })}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Abrir Formulario de Registro</span>
                    </button>
                    <button
                      id="btn-open-qr-modal"
                      onClick={() => setQrModalData({
                        isOpen: true,
                        url: getRegisterUrl(selectedEvent.id),
                        title: selectedEvent.title,
                        subtitle: 'Escanear para registrarse al evento',
                      })}
                      className="py-2 px-3 rounded-xl bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Ver Código QR</span>
                    </button>
                  </div>
                </div>

                {/* 2. URL DEL ORGANIZADOR DE MESAS (DISTRIBUCIÓN INTERACTIVA) */}
                <div 
                  id="card-url-seating-organizer"
                  className="bg-white rounded-2xl border-2 border-indigo-200/80 p-5 shadow-xs relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold text-sm">
                        2
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">
                          URL del Organizador de Mesas (Plano Interactivo)
                        </h4>
                        <p className="text-xs text-slate-500">
                          Panel interactivo visual con Drag and Drop para acomodar a los invitados.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md">
                      Panel Organizador
                    </span>
                  </div>

                  {/* URL Box */}
                  <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2 mt-3 font-mono text-xs text-slate-700">
                    <span className="truncate max-w-[280px] sm:max-w-md">
                      {getSeatingUrl(selectedEvent.id)}
                    </span>
                    <button
                      id="btn-copy-seating-url"
                      onClick={() => handleCopy(getSeatingUrl(selectedEvent.id), 'seating')}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-300 rounded-lg text-xs font-sans font-semibold transition-all flex items-center gap-1 shrink-0"
                    >
                      {copiedLinkType === 'seating' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar URL</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-indigo-100">
                    <button
                      id="btn-open-seating-view"
                      onClick={() => onNavigate({ type: 'table_organizer', eventId: selectedEvent.id })}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span>Abrir Organizador de Mesas (Canvas D&D)</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No hay ningún evento activo</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                Comienza creando tu primer evento para obtener sus enlaces independientes de registro de invitados y distribución de mesas.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-600/20 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Primer Evento</span>
              </button>
            </div>
          )}

        </div>

      </div>

      {/* CREATE EVENT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Crear Nuevo Evento</h3>
                  <p className="text-xs text-indigo-200/80">Configura los detalles básicos</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre o Título del Evento *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Boda Mariana & Alejandro, Tech Summit 2026..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Evento</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as EventType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white text-slate-900"
                  >
                    <option value="wedding">Boda / Matrimonio</option>
                    <option value="conference">Conferencia / Congreso</option>
                    <option value="birthday">Cumpleaños / Fiesta</option>
                    <option value="gala">Gala Benéfica</option>
                    <option value="corporate">Corporativo / Empresa</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contraseña de Administrador (Opcional)</label>
                  <input
                    type="text"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha del Evento *</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hora de Inicio</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lugar / Salón</label>
                <input
                  type="text"
                  placeholder="ej. Salón Imperial - Hotel Grand Plaza"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción u Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Instrucciones para los invitados o notas..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md"
                >
                  {isSubmitting ? 'Guardando...' : 'Crear y Activar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      <QRCodeModal
        isOpen={qrModalData.isOpen}
        onClose={() => setQrModalData({ ...qrModalData, isOpen: false })}
        url={qrModalData.url}
        title={qrModalData.title}
        subtitle={qrModalData.subtitle}
      />

    </div>
  );
};
