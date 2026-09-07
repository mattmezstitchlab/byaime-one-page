import { motion, AnimatePresence } from 'framer-motion';
import { TimelineEvent } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, CalendarDays, Clock3, Music2, MessageCircle, WalletCards, MapPin, X, Plus, Images } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProject } from '@/store/project-store';

const KIND_ICONS = {
  jalon: CalendarDays,
  tache: Clock3,
  intention: MessageCircle,
  souvenir: Images,
  document: FileText,
  devis: FileText,
  facture: WalletCards,
  paiement: WalletCards,
  evenement: MapPin,
  message: MessageCircle,
};

const KIND_COLORS = {
  jalon: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  tache: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  intention: "bg-white/10 text-white/70 border-white/20",
  souvenir: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
  document: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  devis: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  facture: "bg-red-500/20 text-red-400 border-red-500/30",
  paiement: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  evenement: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  message: "bg-sky-500/20 text-sky-400 border-sky-500/30",
};

const STATUS_LABELS = {
  prepare: "Prévu",
  execute: "Terminé",
  en_attente: "En attente",
  a_valider: "À valider",
  bloque: "Bloqué",
  echoue: "Échec"
};

export function UniversalTimeline({ events }: { events: TimelineEvent[] }) {
  const { removeEntity } = useProject();

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
        <div className="w-px h-24 bg-gradient-to-b from-white/30 to-transparent mb-4" />
        <p className="text-xs uppercase tracking-[0.2em]">Aucun événement dans cette vue</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-3xl mx-auto py-10">
      {/* Central Axis */}
      <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-white/10 md:-translate-x-1/2" />

      <div className="space-y-12">
        <AnimatePresence mode="popLayout">
          {events.map((event, i) => {
            const Icon = KIND_ICONS[event.kind] || CalendarDays;
            const isEven = i % 2 === 0;

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={event.id}
                className={cn(
                  "relative flex flex-col md:flex-row items-start md:items-center gap-6 group",
                  isEven ? "md:flex-row-reverse" : ""
                )}
              >
                {/* Timeline Node */}
                <div className="absolute left-6 md:left-1/2 w-3 h-3 rounded-full bg-black border-2 border-white/30 -translate-x-[5px] md:-translate-x-1.5 mt-1.5 md:mt-0 transition-colors group-hover:border-white z-10" />

                {/* Content Box */}
                <div className={cn(
                  "flex-1 w-full pl-16 md:pl-0",
                  isEven ? "md:pr-12 md:text-right" : "md:pl-12 md:text-left"
                )}>
                  <div className={cn(
                    "p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors relative overflow-hidden group/card",
                    isEven ? "md:items-end flex flex-col" : "md:items-start flex flex-col"
                  )}>
                    {/* Event Header */}
                    <div className={cn(
                      "flex items-center gap-3 mb-3 w-full",
                      isEven ? "md:flex-row-reverse justify-start md:justify-start" : "justify-start"
                    )}>
                      <div className={cn("p-2 rounded-lg border", KIND_COLORS[event.kind])}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[11px] text-white/50 tracking-wider font-mono">
                          {format(event.time, "d MMM yyyy", { locale: fr })}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-white/40 mt-0.5">
                          {event.kind}
                        </div>
                      </div>
                    </div>

                    <h4 className="text-lg font-medium text-white mb-2">{event.title}</h4>
                    
                    {event.detail && (
                      <p className="text-sm text-white/60 font-light leading-relaxed mb-4">
                        {event.detail}
                      </p>
                    )}

                    {/* Metadata Footer */}
                    <div className={cn(
                      "flex flex-wrap items-center gap-2 mt-auto w-full",
                      isEven ? "md:justify-end" : "justify-start"
                    )}>
                      <span className={cn(
                        "text-[10px] uppercase px-2 py-1 rounded-sm border",
                        event.status === 'execute' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        event.status === 'prepare' ? "bg-white/10 text-white/70 border-white/20" :
                        event.status === 'a_valider' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-zinc-800 text-zinc-400 border-zinc-700"
                      )}>
                        {STATUS_LABELS[event.status] || event.status}
                      </span>

                      {event.amountCents !== undefined && (
                        <span className="text-[11px] font-mono px-2 py-1 rounded-sm bg-white/5 border border-white/10">
                          {(event.amountCents / 100).toLocaleString('fr-FR')} €
                        </span>
                      )}

                      {event.location && (
                        <span className="text-[10px] flex items-center gap-1 text-white/60">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </span>
                      )}
                    </div>

                    {/* Delete Action (Hover) */}
                    <button 
                      onClick={() => removeEntity('timeline', event.id)}
                      className="absolute top-4 right-4 opacity-0 group-hover/card:opacity-100 p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Empty space for alternating layout */}
                <div className="hidden md:block flex-1" />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Add New Node Area */}
      <div className="relative flex justify-center mt-12">
        <button className="w-12 h-12 rounded-full border border-white/20 bg-black flex items-center justify-center hover:bg-white hover:text-black transition-colors z-10">
          <Plus className="w-5 h-5" />
        </button>
        <div className="absolute top-full mt-4 text-[10px] uppercase tracking-widest text-white/40 text-center w-full">
          Ajouter un jalon
        </div>
      </div>
    </div>
  );
}
