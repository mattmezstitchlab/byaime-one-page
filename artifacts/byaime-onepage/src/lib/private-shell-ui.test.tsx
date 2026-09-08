import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ActionCenter } from "@/components/PrivateLayout";
import { TimelinePlayback } from "@/components/TimelinePlayback";
import type { TimelineEvent } from "@/lib/types";
import type { PrivateDestinationId } from "@/lib/private-navigation";

describe("private shell controls", () => {
  it.each<PrivateDestinationId>(["profile", "world", "network"])(
    "keeps AI, create and ME visible from %s",
    destination => {
      const markup = renderToStaticMarkup(
        <ActionCenter destination={destination} onOpenMe={vi.fn()} />,
      );

      expect(markup).toContain('aria-label="Ouvrir l’aide contextuelle AI"');
      expect(markup).toContain('aria-label="Créer ou relier"');
      expect(markup).toContain('aria-label="Ouvrir mon espace ME"');
    },
  );

  it("keeps Timeline playback reachable from a World with visible Moments", () => {
    const event = {
      id: "moment-1",
      title: "Le Moment",
      time: Date.now(),
      phase: "avant",
    } as TimelineEvent;
    const markup = renderToStaticMarkup(<TimelinePlayback events={[event]} />);

    expect(markup).toContain('data-testid="world-timeline-playback"');
    expect(markup).toContain('aria-label="Lire la Timeline du Monde"');
    expect(markup).not.toContain(' disabled=""');
  });

  it("explains why playback is unavailable without visible Moments", () => {
    const markup = renderToStaticMarkup(<TimelinePlayback events={[]} />);

    expect(markup).toContain(' disabled=""');
    expect(markup).toContain("Aucun Moment à lire dans cette période");
  });
});