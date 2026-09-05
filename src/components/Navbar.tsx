import React from 'react';
import { Calendar, LayoutDashboard, Users, Grid, Sparkles, ShieldCheck, ExternalLink, LogOut } from 'lucide-react';
import { AppView, EventData } from '../types';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  activeEvent: EventData | null;
  isAdminAuthenticated: boolean;
  onAdminLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  activeEvent,
  isAdminAuthenticated,
  onAdminLogout,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <div 
            id="nav-logo" 
            onClick={() => onNavigate({ type: 'admin_dashboard' })}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-400 p-0.5 shadow-lg shadow-indigo-900/30 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="font-serif font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                EventMaster
              </span>
              <span className="ml-1 text-xs font-semibold px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                PRO
              </span>
            </div>
          </div>

          {/* Center: Context Breadcrumb or Active Event Info */}
          {activeEvent && (
            <div className="hidden md:flex items-center gap-2 bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-700/60 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">Evento Activo:</span>
              <span className="font-medium text-slate-100 max-w-[200px] truncate">{activeEvent.title}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">{activeEvent.date}</span>
            </div>
          )}

          {/* Right Navigation & View Switchers */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* View Switchers */}
            <button
              id="nav-btn-admin"
              onClick={() => onNavigate({ type: 'admin_dashboard' })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView.type === 'admin_dashboard'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Panel Admin</span>
            </button>

            {activeEvent && (
              <>
                <button
                  id="nav-btn-seating"
                  onClick={() => onNavigate({ type: 'table_organizer', eventId: activeEvent.id })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currentView.type === 'table_organizer'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                  <span>Organizador Mesas</span>
                </button>

                <button
                  id="nav-btn-guest-form"
                  onClick={() => onNavigate({ type: 'guest_register', eventId: activeEvent.id })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currentView.type === 'guest_register'
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                      : 'bg-slate-800 text-amber-300 hover:bg-slate-750 border border-amber-400/20'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Formulario Invitados</span>
                  <span className="sm:hidden">Invitados</span>
                </button>
              </>
            )}

            {/* Admin Logout button if authenticated */}
            {isAdminAuthenticated && (
              <button
                id="btn-admin-logout"
                onClick={onAdminLogout}
                title="Cerrar sesión de administrador"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
