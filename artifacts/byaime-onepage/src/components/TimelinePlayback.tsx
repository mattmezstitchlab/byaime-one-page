import { useState } from "react";
import { createPortal } from "react-dom";
import { Play } from "lucide-react";
import type { TimelineEvent } from "@/lib/types";
import { PlayMode } from "@/components/PlayMode";

export function TimelinePlayback({ events }: { events: TimelineEvent[] }) {
  const [open, setOpen] = useState(false);
  const hasEvents = events.length > 0;

  return (
    <>
      <button
        data-testid="world-timeline-playback"
        type="button"
        disabled={!hasEvents}
        onClick={() => setOpen(true)}
        title={hasEvents ? "Lire les Moments visibles" : "Aucun Moment à lire dans cette période"}
        className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-foreground/10 px-4 py-2 text-[9px] uppercase tracking-[.13em] text-foreground/65 transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-35"
        aria-label="Lire la Timeline du Monde"
      >
        <Play className="h-3.5 w-3.5" />
        Lire la Timeline
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <PlayMode events={events} onClose={() => setOpen(false)} />,
            document.body,
          )
        : null}
    </>
  );
}