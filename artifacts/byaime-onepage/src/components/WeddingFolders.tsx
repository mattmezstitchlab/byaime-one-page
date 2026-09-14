import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Camera,
  FileText,
  Lock,
  Mail,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useProject } from "@/store/project-store";
import { useI18n } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import {
  getFolderCount,
  getWeddingFolders,
  isFolderLocked,
  openWeddingFolder,
  type WeddingFolder,
  type WeddingFolderId,
} from "@/lib/wedding-folders";
import { cn } from "@/lib/utils";

export const FOLDER_ICONS: Record<WeddingFolderId, LucideIcon> = {
  guests: Users,
  budget: Wallet,
  contracts: FileText,
  providers: Briefcase,
  program: CalendarDays,
  memories: Camera,
  messages: Mail,
};

/**
 * Les sept dossiers universels du mariage, dans l'esprit du BURO : une carte
 * par dossier — numéro, icône, libellé, une phrase, compteur honnête — qui
 * ouvre le bon panneau du Monde. Les dossiers verrouillés par le rôle
 * s'affichent quand même (mêmes dossiers pour tout le monde), non cliquables.
 */
export function WeddingFolders({ compact = false }: { compact?: boolean }) {
  const { project, currentRole } = useProject();
  const { t, locale } = useI18n();
  const folders = getWeddingFolders(locale);

  return (
    <div
      data-testid="wedding-folders"
      className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}
    >
      {folders.map((folder, index) => (
        <FolderCard
          key={folder.id}
          folder={folder}
          index={index}
          count={getFolderCount(folder.id, project)}
          locked={isFolderLocked(folder, currentRole)}
          openLabel={t("dossier.open")}
          lockedLabel={t("dossier.locked")}
          countLabel={t("dossier.count.items", { count: getFolderCount(folder.id, project) })}
          onOpen={() => {
            trackEvent("folder_open", { folder: folder.id });
            openWeddingFolder(folder);
          }}
        />
      ))}
    </div>
  );
}

function FolderCard({
  folder,
  index,
  locked,
  openLabel,
  lockedLabel,
  countLabel,
  onOpen,
}: {
  folder: WeddingFolder;
  index: number;
  count: number;
  locked: boolean;
  openLabel: string;
  lockedLabel: string;
  countLabel: string;
  onOpen: () => void;
}) {
  const Icon = FOLDER_ICONS[folder.id];
  return (
    <article
      data-testid={`wedding-folder-${folder.id}`}
      className={cn(
        "group flex flex-col rounded-3xl border border-border bg-card p-6 text-left transition-colors",
        locked ? "opacity-70" : "hover:border-foreground/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-foreground/5 text-foreground">
          <Icon aria-hidden className="h-5 w-5" strokeWidth={1.5} />
        </span>
        <span aria-hidden className="text-xs tabular-nums text-foreground/35">
          {`0${index + 1}`}
        </span>
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold tracking-tight text-foreground">
        {folder.label}
      </h3>
      <p className="mt-1 text-sm font-light leading-relaxed text-foreground/60">{folder.description}</p>
      <p className="mt-3 text-xs tabular-nums text-foreground/45">{countLabel}</p>
      <div className="mt-4 flex-1" />
      {locked ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-foreground/50">
          <Lock aria-hidden className="h-3.5 w-3.5" />
          {lockedLabel}
        </p>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          data-testid={`wedding-folder-${folder.id}-open`}
          className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {openLabel}
          <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      )}
    </article>
  );
}
