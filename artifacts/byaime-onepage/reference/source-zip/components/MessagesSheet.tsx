import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { directoryQuery } from "@/lib/aime/chat";
import { ThreadList } from "@/components/aime/messages/ThreadList";
import { ThreadView } from "@/components/aime/messages/ThreadView";
import { DocumentsTab } from "@/components/aime/messages/DocumentsTab";
import { NewThreadDialog } from "@/components/aime/messages/NewThreadDialog";
import { onMessages, type MessagesTab } from "@/components/aime/messagesSheet";
import { cn } from "@/lib/utils";

/**
 * Les Échanges, partout dans le site : une capsule qui s'ouvre depuis l'en-tête,
 * avec deux modes — les discussions, et les documents partagés.
 */
export function MessagesSheet() {
  const { userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<MessagesTab>("discussions");
  const [thread, setThread] = useState<string | null>(null);
  const [focusEvent, setFocusEvent] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const { data: people = [] } = useQuery(directoryQuery);

  useEffect(
    () =>
      onMessages(({ threadId, tab: wanted, eventId }) => {
        if (threadId) setThread(threadId);
        if (wanted) setTab(wanted);
        setFocusEvent(eventId ?? null);
        setOpen((value) => (threadId || wanted ? true : !value));
      }),
    [],
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-hairline px-5 py-4 text-left">
          <SheetTitle className="text-[20px] font-semibold">Échanges</SheetTitle>
        </SheetHeader>

        <div className="sticky top-0 z-10 border-b border-hairline bg-background px-4 py-2.5">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
            {(
              [
                ["discussions", "Discussions"],
                ["documents", "Documents"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[13px] transition-colors",
                  tab === value && "bg-card font-medium shadow-soft",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1">
          {!open ? null : tab === "documents" ? (
            <DocumentsTab
              eventId={focusEvent}
              onOpenThread={(id) => {
                setThread(id);
                setTab("discussions");
              }}
            />
          ) : thread ? (
            <ThreadView threadId={thread} onBack={() => setThread(null)} />
          ) : (
            <ThreadList onOpen={setThread} onNew={() => setShowNew(true)} />
          )}
        </div>

        {showNew && userId && (
          <NewThreadDialog
            me={userId}
            people={people}
            onClose={() => setShowNew(false)}
            onCreated={(id) => {
              setShowNew(false);
              setThread(id);
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
