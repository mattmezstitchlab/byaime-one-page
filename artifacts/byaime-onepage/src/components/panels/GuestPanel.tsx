import { useState } from 'react';
import { useProject } from '@/store/project-store';
import { Users, Mail, Phone, CalendarDays, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Guest } from '@/lib/types';

export function GuestPanel() {
  const { project, updateEntity } = useProject();
  const [tab, setTab] = useState<'liste' | 'tables'>('liste');
  
  if (!project) return null;

  const guests = project.guests;
  const stats = {
    total: guests.length,
    confirmed: guests.filter(g => g.rsvp === 'confirme').length,
    pending: guests.filter(g => g.rsvp === 'en_attente').length,
    declined: guests.filter(g => g.rsvp === 'decline').length,
  };

  const getTable = (guest: Guest) => project.tables.find(t => t.id === guest.tableId);

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-full">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-2 mb-8">
        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
          <div className="text-2xl font-light">{stats.total}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/50 mt-1">Invités</div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-center text-emerald-400">
          <div className="text-2xl font-light">{stats.confirmed}</div>
          <div className="text-[10px] uppercase tracking-wider opacity-60 mt-1">Confirmés</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-center text-amber-400">
          <div className="text-2xl font-light">{stats.pending}</div>
          <div className="text-[10px] uppercase tracking-wider opacity-60 mt-1">En attente</div>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-center text-rose-400">
          <div className="text-2xl font-light">{stats.declined}</div>
          <div className="text-[10px] uppercase tracking-wider opacity-60 mt-1">Absents</div>
        </div>
      </div>

      <div className="flex bg-white/5 p-1 rounded-full w-fit mb-6">
        <button 
          onClick={() => setTab('liste')}
          className={cn("px-4 py-1.5 rounded-full text-xs font-medium transition-colors", tab === 'liste' ? "bg-white text-black" : "text-white/60 hover:text-white")}
        >
          Liste complète
        </button>
        <button 
          onClick={() => setTab('tables')}
          className={cn("px-4 py-1.5 rounded-full text-xs font-medium transition-colors", tab === 'tables' ? "bg-white text-black" : "text-white/60 hover:text-white")}
        >
          Plan de table
        </button>
      </div>

      {tab === 'liste' && (
        <div className="space-y-2 overflow-y-auto pb-20 scrollbar-none">
          {guests.map(guest => (
            <div key={guest.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
              <div>
                <div className="font-medium text-sm flex items-center gap-2">
                  {guest.name}
                  {guest.role !== 'invite' && (
                    <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                      {guest.role}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-white/50">
                  <span className={cn(
                    "flex items-center gap-1",
                    guest.rsvp === 'confirme' ? "text-emerald-400" :
                    guest.rsvp === 'decline' ? "text-rose-400" : "text-amber-400"
                  )}>
                    <CheckCircle2 className="w-3 h-3" />
                    {guest.rsvp.replace('_', ' ')}
                  </span>
                  {guest.dietary && (
                    <span className="border-l border-white/20 pl-3">{guest.dietary}</span>
                  )}
                  {guest.tableId && (
                    <span className="border-l border-white/20 pl-3">{getTable(guest)?.name}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'tables' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-20">
          {project.tables.map(table => {
            const tableGuests = guests.filter(g => g.tableId === table.id);
            return (
              <div key={table.id} className="border border-white/10 bg-white/5 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-sm">{table.name}</h4>
                  <span className="text-xs text-white/40">{tableGuests.length} / {table.capacity} places</span>
                </div>
                <div className="space-y-1.5">
                  {tableGuests.map(g => (
                    <div key={g.id} className="text-sm text-white/80 py-1 border-b border-white/5 last:border-0">
                      {g.name}
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, table.capacity - tableGuests.length) }).map((_, i) => (
                    <div key={i} className="text-sm text-white/20 py-1 border-b border-white/5 last:border-0 italic">
                      Place libre
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
