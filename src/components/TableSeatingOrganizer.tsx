import React, { useState, useRef, useEffect } from 'react';
import { 
  Grid, Plus, Trash2, Users, Move, FileDown, Search, Check, AlertTriangle, 
  X, ZoomIn, ZoomOut, RotateCcw, Sparkles, Filter, ChevronRight, UserCheck, 
  HelpCircle, Eye, Sliders, ArrowLeft
} from 'lucide-react';
import { EventData, EventTable, FamilyGuest, TableShape, DecorElement } from '../types';
import { exportSeatingChartToPDF } from '../services/pdfExporter';

interface TableSeatingOrganizerProps {
  event: EventData;
  onAssignTable: (familyId: string, tableId: string) => Promise<{ success: boolean; error?: string }>;
  onUnassignTable: (familyId: string) => Promise<{ success: boolean }>;
  onAddTable: (data: Partial<EventTable>) => Promise<void>;
  onUpdateTable: (tableId: string, updates: Partial<EventTable>) => Promise<void>;
  onDeleteTable: (tableId: string) => Promise<void>;
  onBackToAdmin: () => void;
  onNavigateToRegister: () => void;
}

export const TableSeatingOrganizer: React.FC<TableSeatingOrganizerProps> = ({
  event,
  onAssignTable,
  onUnassignTable,
  onAddTable,
  onUpdateTable,
  onDeleteTable,
  onBackToAdmin,
  onNavigateToRegister,
}) => {
  // Canvas State & Dragging
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [draggedFamily, setDraggedFamily] = useState<FamilyGuest | null>(null);
  const [dragOverTableId, setDragOverTableId] = useState<string | null>(null);

  // Moving tables on canvas
  const [movingTableId, setMovingTableId] = useState<string | null>(null);
  const [dragStartOffset, setDragStartOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Sidebar filters & search
  const [sidebarTab, setSidebarTab] = useState<'pending' | 'assigned' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Table Modal (Create/Edit)
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<EventTable | null>(null);
  const [tableName, setTableName] = useState('');
  const [tableShape, setTableShape] = useState<TableShape>('round');
  const [tableCapacity, setTableCapacity] = useState<number>(8);
  const [tableColor, setTableColor] = useState<string>('#6366f1');

  // Selected Table Details Drawer
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // Validation Error Toast / Alert
  const [capacityErrorAlert, setCapacityErrorAlert] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Auto-hide alert after 5s
  useEffect(() => {
    if (capacityErrorAlert) {
      const timer = setTimeout(() => setCapacityErrorAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [capacityErrorAlert]);

  // Calculations
  const totalGuests = event.families.reduce((sum, f) => sum + (Number(f.memberCount) || 0), 0);
  const assignedFamilies = event.families.filter(f => f.status === 'assigned' && f.assignedTableId);
  const assignedGuests = assignedFamilies.reduce((sum, f) => sum + (Number(f.memberCount) || 0), 0);
  const pendingFamilies = event.families.filter(f => f.status === 'pending' || !f.assignedTableId);
  const pendingGuests = pendingFamilies.reduce((sum, f) => sum + (Number(f.memberCount) || 0), 0);
  const totalCapacity = event.tables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);
  const occupancyPercentage = totalCapacity > 0 ? Math.round((assignedGuests / totalCapacity) * 100) : 0;

  // Filtered families for sidebar
  const filteredFamilies = event.families.filter(fam => {
    const fullName = `${fam.firstLastName} ${fam.secondLastName} ${fam.contactName || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (sidebarTab === 'pending') return fam.status === 'pending' || !fam.assignedTableId;
    if (sidebarTab === 'assigned') return fam.status === 'assigned' && fam.assignedTableId;
    return true;
  });

  // Table Occupancy Helper
  const getTableOccupancy = (tableId: string) => {
    const families = event.families.filter(f => f.assignedTableId === tableId);
    const seatedCount = families.reduce((sum, f) => sum + (Number(f.memberCount) || 0), 0);
    return { families, seatedCount };
  };

  // Drag and drop handlers for Guest Families
  const handleFamilyDragStart = (e: React.DragEvent, family: FamilyGuest) => {
    setDraggedFamily(family);
    e.dataTransfer.setData('text/plain', family.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTableDragOver = (e: React.DragEvent, tableId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTableId !== tableId) {
      setDragOverTableId(tableId);
    }
  };

  const handleTableDragLeave = (e: React.DragEvent, tableId: string) => {
    if (dragOverTableId === tableId) {
      setDragOverTableId(null);
    }
  };

  const handleTableDrop = async (e: React.DragEvent, targetTable: EventTable) => {
    e.preventDefault();
    setDragOverTableId(null);

    const familyId = e.dataTransfer.getData('text/plain') || (draggedFamily ? draggedFamily.id : null);
    if (!familyId) return;

    const family = event.families.find(f => f.id === familyId);
    if (!family) return;

    // Check capacity validation locally before API
    const { seatedCount } = getTableOccupancy(targetTable.id);
    const currentWithoutThis = family.assignedTableId === targetTable.id
      ? seatedCount - Number(family.memberCount)
      : seatedCount;
    
    const needed = Number(family.memberCount) || 0;
    const available = targetTable.capacity - currentWithoutThis;

    if (currentWithoutThis + needed > targetTable.capacity) {
      setCapacityErrorAlert(
        `¡No cabe en la ${targetTable.name}! Capacidad: ${targetTable.capacity} sillas (${currentWithoutThis} ocupadas, solo ${Math.max(0, available)} disponibles). La Familia ${family.firstLastName} requiere ${needed} sillas.`
      );
      setDraggedFamily(null);
      return;
    }

    // Call assignment
    const result = await onAssignTable(family.id, targetTable.id);
    if (!result.success && result.error) {
      setCapacityErrorAlert(result.error);
    }
    setDraggedFamily(null);
  };

  // Move table on canvas handlers
  const handleTableMouseDown = (e: React.MouseEvent, table: EventTable) => {
    if ((e.target as HTMLElement).closest('button')) return; // ignore clicks on buttons
    setMovingTableId(table.id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragStartOffset({
        x: (e.clientX - rect.left) / zoom - table.x,
        y: (e.clientY - rect.top) / zoom - table.y,
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!movingTableId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(20, Math.min(1050, Math.round(((e.clientX - rect.left) / zoom - dragStartOffset.x) / 10) * 10));
    const newY = Math.max(20, Math.min(750, Math.round(((e.clientY - rect.top) / zoom - dragStartOffset.y) / 10) * 10));

    // Update in local event representation immediately
    const table = event.tables.find(t => t.id === movingTableId);
    if (table && (table.x !== newX || table.y !== newY)) {
      table.x = newX;
      table.y = newY;
      // Force lightweight state tick
    }
  };

  const handleCanvasMouseUp = () => {
    if (movingTableId) {
      const table = event.tables.find(t => t.id === movingTableId);
      if (table) {
        onUpdateTable(table.id, { x: table.x, y: table.y });
      }
      setMovingTableId(null);
    }
  };

  // Table Modal submit
  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableName.trim()) return;

    if (editingTable) {
      await onUpdateTable(editingTable.id, {
        name: tableName.trim(),
        shape: tableShape,
        capacity: Number(tableCapacity) || 1,
        color: tableColor,
      });
    } else {
      await onAddTable({
        name: tableName.trim(),
        shape: tableShape,
        capacity: Number(tableCapacity) || 8,
        color: tableColor,
        x: 300 + (event.tables.length % 4) * 80,
        y: 200 + Math.floor(event.tables.length / 4) * 80,
      });
    }

    setIsTableModalOpen(false);
    setEditingTable(null);
    setTableName('');
  };

  const openCreateTableModal = () => {
    setEditingTable(null);
    setTableName(`Mesa ${event.tables.length + 1}`);
    setTableShape('round');
    setTableCapacity(8);
    setTableColor('#6366f1');
    setIsTableModalOpen(true);
  };

  const openEditTableModal = (table: EventTable) => {
    setEditingTable(table);
    setTableName(table.name);
    setTableShape(table.shape);
    setTableCapacity(table.capacity);
    setTableColor(table.color || '#6366f1');
    setIsTableModalOpen(true);
  };

  // PDF Export Trigger
  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      await exportSeatingChartToPDF(event, canvasRef.current);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const selectedTable = event.tables.find(t => t.id === selectedTableId) || null;
  const selectedTableData = selectedTable ? getTableOccupancy(selectedTable.id) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-100 overflow-hidden select-none">
      
      {/* TOP SUB-HEADER & TOOLBAR */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-4 z-20 shrink-0">
        
        {/* Left: Event Info & Back button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToAdmin}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Volver al panel admin"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 leading-none">{event.title}</span>
              <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                Organizador Interactivo de Mesas
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Arrastra las familias del panel derecho hacia las mesas del plano.
            </p>
          </div>
        </div>

        {/* Center: Live Occupancy Metrics */}
        <div className="hidden lg:flex items-center gap-4 bg-slate-50 px-4 py-1.5 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-slate-500">Asignados:</span>
            <span className="font-bold text-slate-900">{assignedGuests}/{totalGuests} pax</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Pendientes:</span>
            <span className={`font-bold ${pendingGuests > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {pendingGuests} pax ({pendingFamilies.length} fam)
            </span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Ocupación Salón:</span>
            <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${occupancyPercentage > 90 ? 'bg-rose-500' : occupancyPercentage > 60 ? 'bg-indigo-600' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, occupancyPercentage)}%` }}
              />
            </div>
            <span className="font-bold text-slate-900">{occupancyPercentage}%</span>
          </div>
        </div>

        {/* Right: Actions (Add Table, Zoom, Export PDF) */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={() => setZoom(z => Math.max(0.6, z - 0.1))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded"
              title="Alejar mapa"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono font-medium px-1 text-slate-600">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(1.4, z + 0.1))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded"
              title="Acercar mapa"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded border-l border-slate-200 ml-0.5"
              title="Restablecer zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Add Table Button */}
          <button
            id="btn-add-table"
            onClick={openCreateTableModal}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nueva Mesa</span>
          </button>

          {/* PDF Export Button (REQUISITO 4) */}
          <button
            id="btn-export-seating-pdf"
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
          >
            <FileDown className="w-3.5 h-3.5 text-amber-400" />
            <span>{isExportingPDF ? 'Generando PDF...' : 'Exportar PDF'}</span>
          </button>
        </div>

      </div>

      {/* CAPACITY WARNING ALERT TOAST */}
      {capacityErrorAlert && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4 animate-in slide-in-from-top duration-200">
          <div className="bg-rose-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-rose-500/50 flex items-start gap-3 backdrop-blur-md">
            <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-rose-200">Validación de Capacidad de Mesa</p>
              <p className="mt-0.5 text-rose-100">{capacityErrorAlert}</p>
            </div>
            <button
              onClick={() => setCapacityErrorAlert(null)}
              className="text-rose-300 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE: CANVAS (LEFT) + FAMILIES SIDEBAR (RIGHT) */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* 1. VISUAL INTERACTIVE CANVAS / MAP */}
        <div 
          className="flex-1 overflow-auto bg-slate-200/80 p-8 flex items-center justify-center relative cursor-grab active:cursor-grabbing"
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
        >
          {/* Canvas Blueprint Boundary */}
          <div
            ref={canvasRef}
            id="event-canvas-room"
            className="bg-white rounded-3xl shadow-xl border-2 border-slate-300/80 relative transition-transform duration-75"
            style={{
              width: '1100px',
              height: '800px',
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            {/* Room Title Watermark */}
            <div className="absolute top-3 left-4 text-[10px] font-bold uppercase tracking-widest text-slate-300 pointer-events-none">
              Plano de Distribución • {event.title}
            </div>

            {/* DECOR / ARCHITECTURAL ELEMENTS (Escenario, Pista, Bar, etc.) */}
            {event.decorElements.map((decor) => (
              <div
                key={decor.id}
                className={`absolute rounded-xl border flex items-center justify-center text-center p-2 font-bold transition-all ${
                  decor.type === 'stage' 
                    ? 'bg-slate-900 text-amber-300 border-slate-700 shadow-md text-xs' :
                  decor.type === 'dancefloor' 
                    ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 text-indigo-700 text-xs shadow-inner' :
                  decor.type === 'entrance' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 text-[11px]' :
                  'bg-slate-100 text-slate-700 border-slate-300 text-xs'
                }`}
                style={{
                  left: `${decor.x}px`,
                  top: `${decor.y}px`,
                  width: `${decor.width}px`,
                  height: `${decor.height}px`,
                }}
              >
                <span>{decor.label}</span>
              </div>
            ))}

            {/* TABLES (INSTANCIADAS Y ARRASTRABLES) */}
            {event.tables.map((table) => {
              const { families: tableFamilies, seatedCount } = getTableOccupancy(table.id);
              const isOverCapacity = seatedCount > table.capacity;
              const isFull = seatedCount === table.capacity;
              const isDragTarget = dragOverTableId === table.id;
              const isSelected = selectedTableId === table.id;

              // Size based on capacity and shape
              const isRound = table.shape === 'round';
              const size = isRound 
                ? Math.max(120, Math.min(180, 110 + table.capacity * 6))
                : 150;
              const height = isRound ? size : 100;

              return (
                <div
                  key={table.id}
                  id={`table-element-${table.id}`}
                  onMouseDown={(e) => handleTableMouseDown(e, table)}
                  onDragOver={(e) => handleTableDragOver(e, table.id)}
                  onDragLeave={(e) => handleTableDragLeave(e, table.id)}
                  onDrop={(e) => handleTableDrop(e, table)}
                  onClick={() => setSelectedTableId(table.id)}
                  className={`absolute transition-all cursor-move group ${
                    isDragTarget
                      ? 'scale-105 ring-4 ring-indigo-500 shadow-2xl z-30'
                      : isSelected
                      ? 'ring-3 ring-indigo-600 shadow-xl z-20'
                      : 'hover:shadow-lg z-10'
                  }`}
                  style={{
                    left: `${table.x}px`,
                    top: `${table.y}px`,
                    width: `${size}px`,
                    height: `${height}px`,
                  }}
                >
                  {/* Surrounding Chairs / Sillas visuales */}
                  <div className="absolute inset-0 pointer-events-none">
                    {Array.from({ length: table.capacity }).map((_, seatIdx) => {
                      const angle = (seatIdx / table.capacity) * 2 * Math.PI;
                      const radiusX = (size / 2) + 12;
                      const radiusY = (height / 2) + 12;
                      const seatX = size / 2 + radiusX * Math.cos(angle) - 7;
                      const seatY = height / 2 + radiusY * Math.sin(angle) - 7;
                      const isOccupied = seatIdx < seatedCount;

                      return (
                        <div
                          key={seatIdx}
                          className={`absolute w-3.5 h-3.5 rounded-full border transition-all ${
                            isOccupied
                              ? 'bg-indigo-600 border-indigo-700 shadow-xs'
                              : 'bg-white border-slate-300 shadow-xs'
                          }`}
                          style={{
                            left: `${seatX}px`,
                            top: `${seatY}px`,
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Main Table Surface */}
                  <div
                    className={`w-full h-full p-2 flex flex-col items-center justify-center text-center transition-all border-2 shadow-md ${
                      isRound ? 'rounded-full' : 'rounded-2xl'
                    } ${
                      isOverCapacity
                        ? 'bg-rose-50 border-rose-500 text-rose-900'
                        : isFull
                        ? 'bg-indigo-50/90 border-indigo-600 text-indigo-950'
                        : seatedCount > 0
                        ? 'bg-white border-indigo-400 text-slate-800'
                        : 'bg-white border-slate-300 text-slate-700'
                    }`}
                  >
                    {/* Table Name */}
                    <span className="font-bold text-xs leading-tight truncate max-w-[90%]">
                      {table.name}
                    </span>

                    {/* Capacity Badge */}
                    <div className="mt-1 flex items-center gap-1">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md font-mono ${
                          isFull
                            ? 'bg-indigo-600 text-white'
                            : seatedCount > 0
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {seatedCount}/{table.capacity} sillas
                      </span>
                    </div>

                    {/* Assigned Families preview chips */}
                    {tableFamilies.length > 0 && (
                      <div className="mt-1 flex flex-wrap justify-center gap-0.5 max-w-[85%] overflow-hidden">
                        {tableFamilies.slice(0, 2).map((f) => (
                          <span
                            key={f.id}
                            className="text-[9px] font-medium bg-slate-100/90 text-slate-700 px-1 rounded truncate max-w-[70px]"
                            title={`Fam. ${f.firstLastName} (${f.memberCount} pax)`}
                          >
                            {f.firstLastName} ({f.memberCount})
                          </span>
                        ))}
                        {tableFamilies.length > 2 && (
                          <span className="text-[9px] font-bold text-indigo-600">
                            +{tableFamilies.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Quick action buttons on hover */}
                    <div className="absolute -top-3 right-0 hidden group-hover:flex items-center gap-1 bg-white rounded-lg shadow-md border border-slate-200 p-0.5 z-40">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditTableModal(table);
                        }}
                        title="Editar mesa"
                        className="p-1 text-slate-600 hover:text-indigo-600 rounded"
                      >
                        <Sliders className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`¿Eliminar la ${table.name}? Las familias volverán a pendientes.`)) {
                            onDeleteTable(table.id);
                          }
                        }}
                        title="Eliminar mesa"
                        className="p-1 text-slate-600 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. RIGHT SIDEBAR: FAMILIES REGISTRY & DRAG-AND-DROP PANEL */}
        <div className="w-80 sm:w-96 bg-white border-l border-slate-200 flex flex-col z-20 shadow-lg shrink-0">
          
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                Familias Registradas ({event.families.length})
              </h3>
              <button
                onClick={onNavigateToRegister}
                title="Abrir formulario para registrar invitados"
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>+ Registrar</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-2.5">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por apellidos o titular..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
              />
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setSidebarTab('pending')}
                className={`py-1 rounded-lg transition-all ${
                  sidebarTab === 'pending'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Pendientes ({pendingFamilies.length})
              </button>
              <button
                onClick={() => setSidebarTab('assigned')}
                className={`py-1 rounded-lg transition-all ${
                  sidebarTab === 'assigned'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Asignadas ({assignedFamilies.length})
              </button>
              <button
                onClick={() => setSidebarTab('all')}
                className={`py-1 rounded-lg transition-all ${
                  sidebarTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todas ({event.families.length})
              </button>
            </div>
          </div>

          {/* Families Draggable List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredFamilies.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600">
                  {sidebarTab === 'pending'
                    ? '¡Excelente! No hay familias pendientes de asignar mesa.'
                    : 'No se encontraron registros con este filtro.'}
                </p>
                <button
                  onClick={onNavigateToRegister}
                  className="mt-3 text-xs text-indigo-600 font-semibold hover:underline"
                >
                  Registrar nueva familia
                </button>
              </div>
            ) : (
              filteredFamilies.map((family) => {
                const isAssigned = family.status === 'assigned' && family.assignedTableId;
                const assignedTable = isAssigned ? event.tables.find(t => t.id === family.assignedTableId) : null;

                return (
                  <div
                    key={family.id}
                    id={`family-card-${family.id}`}
                    draggable
                    onDragStart={(e) => handleFamilyDragStart(e, family)}
                    className={`p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing relative group ${
                      isAssigned
                        ? 'bg-slate-50/70 border-slate-200 text-slate-700'
                        : 'bg-white border-amber-300/80 shadow-xs hover:border-indigo-400 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {/* Family Lastnames Header */}
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-xs text-slate-900 truncate">
                            Familia {family.firstLastName} {family.secondLastName}
                          </h4>
                        </div>

                        {family.contactName && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            Titular: {family.contactName}
                          </p>
                        )}

                        {family.notes && (
                          <p className="text-[10px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-1 truncate max-w-[200px]" title={family.notes}>
                            📝 {family.notes}
                          </p>
                        )}
                      </div>

                      {/* Pax count pill */}
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-xs font-bold font-mono px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                          {family.memberCount} pax
                        </span>
                      </div>
                    </div>

                    {/* Footer with status & unassign action */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      {isAssigned && assignedTable ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium text-emerald-700 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            {assignedTable.name}
                          </span>
                          <button
                            onClick={() => onUnassignTable(family.id)}
                            className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-1.5 py-0.5 rounded transition-colors"
                          >
                            Desasignar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            ⏳ Pendiente de mesa
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Arrastrar a mesa →
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer Hint */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 text-center">
            💡 Arrastra cualquier familia hacia una mesa con sillas libres en el plano.
          </div>

        </div>

      </div>

      {/* 3. SELECTED TABLE DRAWER (VIEW SEATED GUESTS) */}
      {selectedTable && selectedTableData && (
        <div className="fixed bottom-4 left-6 z-40 max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom duration-150">
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-indigo-400" />
              <div>
                <h4 className="font-bold text-xs">{selectedTable.name}</h4>
                <p className="text-[10px] text-slate-300">
                  {selectedTableData.seatedCount} de {selectedTable.capacity} sillas ocupadas
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedTableId(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 max-h-60 overflow-y-auto space-y-2">
            {selectedTableData.families.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Mesa vacía. Arrastra familias aquí para ocuparla.
              </p>
            ) : (
              selectedTableData.families.map((fam) => (
                <div key={fam.id} className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800">
                      Fam. {fam.firstLastName} {fam.secondLastName}
                    </span>
                    <span className="text-slate-500 block text-[11px]">
                      {fam.memberCount} integrantes
                    </span>
                  </div>
                  <button
                    onClick={() => onUnassignTable(fam.id)}
                    className="text-[10px] text-rose-600 hover:bg-rose-50 px-2 py-1 rounded font-semibold"
                  >
                    Quitar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. CREATE / EDIT TABLE MODAL */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingTable ? 'Editar Mesa' : 'Crear e Instanciar Mesa'}
              </h3>
              <button
                onClick={() => setIsTableModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre / Número de Mesa *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Mesa 1, Mesa VIP, Mesa Presidencial..."
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Capacidad (Número de Sillas) *</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  required
                  value={tableCapacity}
                  onChange={(e) => setTableCapacity(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono text-sm text-slate-900"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Límite máximo de personas que pueden acomodarse en esta mesa.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Forma de la Mesa</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTableShape('round')}
                    className={`py-2 rounded-xl border font-semibold flex items-center justify-center gap-1.5 ${
                      tableShape === 'round'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-current" />
                    <span>Redonda</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableShape('rectangular')}
                    className={`py-2 rounded-xl border font-semibold flex items-center justify-center gap-1.5 ${
                      tableShape === 'rectangular'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-4 h-3 rounded-xs border-2 border-current" />
                    <span>Rectangular</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-sm"
                >
                  {editingTable ? 'Guardar Cambios' : 'Crear Mesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
