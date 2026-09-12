import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { ActionCenter, PrivateHomeLink } from "@/components/PrivateLayout";
import { TimelinePlayback } from "@/components/TimelinePlayback";
import type { TimelineEvent } from "@/lib/types";
import type { PrivateDestinationId } from "@/lib/private-navigation";
import { Router } from "wouter";

describe("private shell controls", () => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Router hook={() => ["/profile", () => {}]}>{children}</Router>
  );

  it.each<PrivateDestinationId>(["profile", "world"])(
    "keeps AI, create and ME visible from %s",
    destination => {
      const markup = renderToStaticMarkup(
        <Wrapper>
          <ActionCenter destination={destination} onOpenMe={vi.fn()} />
        </Wrapper>,
      );

      expect(markup).toContain('aria-label="Ouvrir l’aide"');
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

  it("sends the private AIME logo back to the public home", () => {
    const markup = renderToStaticMarkup(
      <Wrapper>
        <PrivateHomeLink textClassName="text-lg" />
      </Wrapper>,
    );

    expect(markup).toContain('data-testid="private-home-logo"');
    expect(markup).toContain('href="/"');
    expect(markup).toContain('aria-label="Retour à l’accueil AIME"');
  });
});