import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Users, Calendar, MapPin, Clock, CheckCircle2, AlertCircle, 
  Send, Plus, Minus, ShieldAlert
} from 'lucide-react';
import { EventData, FamilyGuest } from '../types';

interface GuestRegisterFormProps {
  event: EventData | null;
  onSubmitRegistration: (data: {
    firstLastName: string;
    secondLastName: string;
    memberCount: number;
    contactName?: string;
    notes?: string;
    phone?: string;
    email?: string;
  }) => Promise<{ message: string; family: FamilyGuest }>;
}

export const GuestRegisterForm: React.FC<GuestRegisterFormProps> = ({
  event,
  onSubmitRegistration,
}) => {
  // Required fields according to specification
  const [firstLastName, setFirstLastName] = useState('');
  const [secondLastName, setSecondLastName] = useState('');
  const [memberCount, setMemberCount] = useState<number>(2);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedFamily, setSubmittedFamily] = useState<FamilyGuest | null>(null);

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-white">
        <div className="max-w-md w-full text-center bg-slate-800/80 p-8 rounded-2xl border border-slate-700 shadow-xl">
          <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold font-serif">Evento no encontrado</h2>
          <p className="text-xs text-slate-400 mt-2">
            El enlace de registro no es válido, el evento ha concluido o no existe en el sistema.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!firstLastName.trim()) {
      setErrorMessage('Por favor ingresa el primer apellido de la familia.');
      return;
    }
    if (!secondLastName.trim()) {
      setErrorMessage('Por favor ingresa el segundo apellido de la familia.');
      return;
    }
    if (memberCount < 1) {
      setErrorMessage('El número total de integrantes debe ser al menos 1.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmitRegistration({
        firstLastName: firstLastName.trim(),
        secondLastName: secondLastName.trim(),
        memberCount,
        contactName: `${firstLastName.trim()} ${secondLastName.trim()}`,
        phone: '',
        email: '',
        notes: '',
      });

      setSubmittedFamily(result.family);

      // Trigger Celebration Confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4f46e5', '#f59e0b', '#10b981', '#ec4899'],
        });
      } catch (err) {
        // silent
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocurrió un error al registrar a la familia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setFirstLastName('');
    setSecondLastName('');
    setMemberCount(2);
    setSubmittedFamily(null);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-2xl w-full mx-auto">

        {/* SUCCESS CONFIRMATION SCREEN */}
        {submittedFamily ? (
          <div 
            id="registration-success-card"
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-center p-8 sm:p-10 animate-in zoom-in-95 duration-200"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <span className="px-3.5 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-full uppercase tracking-wider">
              Estado: Pendiente de asignación de mesa
            </span>

            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 mt-3">
              ¡Registro Confirmado con Éxito!
            </h2>
            
            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto">
              Muchas gracias. Los datos de la <strong className="text-slate-900">Familia {submittedFamily.firstLastName} {submittedFamily.secondLastName}</strong> han sido registrados para el evento <strong className="text-indigo-600">{event.title}</strong>.
            </p>

            {/* Registration Ticket Details */}
            <div className="my-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs text-slate-700 space-y-2.5 max-w-md mx-auto">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Evento:</span>
                <span className="font-bold text-slate-900 text-right">{event.title}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Familia:</span>
                <span className="font-bold text-slate-900">
                  {submittedFamily.firstLastName} {submittedFamily.secondLastName}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Total de Personas:</span>
                <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {submittedFamily.memberCount} integrantes
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Estado en Sistema:</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  Pendiente de asignación de mesa
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Folio de Registro:</span>
                <span className="font-mono text-[11px] text-slate-400">{submittedFamily.id}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-6 italic">
              El equipo organizador distribuirá las mesas y te informará a tu llegada.
            </p>

            <button
              id="btn-register-another"
              onClick={handleResetForm}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-md"
            >
              Registrar a Otra Familia o Invitado
            </button>
          </div>
        ) : (

          /* REGISTRATION FORM */
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden">
            
            {/* Header with Event Branding */}
            <div className="p-6 sm:p-8 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                  Formulario Oficial de Invitados
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white">
                {event.title}
              </h1>

              {event.description && (
                <p className="text-xs sm:text-sm text-indigo-200/90 mt-2 max-w-xl">
                  {event.description}
                </p>
              )}

              {/* Event Meta Badges */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-300 mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-xs">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>{event.date}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{event.time} hrs</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-xs">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{event.location}</span>
                </div>
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
                <Users className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <p className="font-semibold">Registro para asignación de mesas</p>
                  <p className="text-amber-800/80 mt-0.5">
                    Por favor indica los apellidos de tu familia y el número total de personas que asistirán. Al enviar, quedarán registrados como <strong>'Pendiente de asignación de mesa'</strong>.
                  </p>
                </div>
              </div>

              {/* REQUIRED FIELDS SECTION */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Datos de la Familia
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* 1. Primer Apellido (REQUERIDO) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Primer Apellido de la Familia *
                    </label>
                    <input
                      id="input-first-lastname"
                      type="text"
                      required
                      placeholder="ej. González, Hernández, Morales..."
                      value={firstLastName}
                      onChange={(e) => setFirstLastName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 font-medium"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">Primer apellido paterno</span>
                  </div>

                  {/* 2. Segundo Apellido (REQUERIDO) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Segundo Apellido de la Familia *
                    </label>
                    <input
                      id="input-second-lastname"
                      type="text"
                      required
                      placeholder="ej. Pérez, Silva, Mendoza..."
                      value={secondLastName}
                      onChange={(e) => setSecondLastName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 font-medium"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">Segundo apellido materno</span>
                  </div>

                </div>

                {/* 3. Número Total de Integrantes (REQUERIDO) */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-900">
                        Número Total de Integrantes / Personas Asistiendo *
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Incluye todas las personas que requerirán una silla en la mesa.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-center">
                      <button
                        type="button"
                        onClick={() => setMemberCount(prev => Math.max(1, prev - 1))}
                        className="w-10 h-10 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold transition-colors shadow-xs active:scale-95"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <div className="w-14 text-center">
                        <span className="text-xl font-bold font-mono text-indigo-600">
                          {memberCount}
                        </span>
                        <span className="block text-[10px] text-slate-500 font-medium">
                          {memberCount === 1 ? 'persona' : 'personas'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setMemberCount(prev => Math.min(20, prev + 1))}
                        className="w-10 h-10 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold transition-colors shadow-xs active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* ERROR MESSAGE */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <button
                id="btn-submit-registration"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Registrando a la familia...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirmar y Enviar Registro de Asistencia</span>
                  </>
                )}
              </button>

            </form>

          </div>
        )}

      </div>
    </div>
  );
};
