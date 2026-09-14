import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { OrbButton, PrivateHomeLink } from "@/components/PrivateLayout";
import { TimelinePlayback } from "@/components/TimelinePlayback";
import type { TimelineEvent } from "@/lib/types";
import { Router } from "wouter";

describe("private shell controls", () => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Router hook={() => ["/profile", () => {}]}>{children}</Router>
  );

  it("shows a single orb button that opens the unified panel", () => {
    const markup = renderToStaticMarkup(
      <Wrapper>
        <OrbButton />
      </Wrapper>,
    );

    expect(markup).toContain('data-testid="orb-button"');
    expect(markup).toContain('aria-label="Ouvrir le panneau AIME"');
  });

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
    expect(markup).toContain('href="/monde"');
    expect(markup).toContain('aria-label="Retour à l’accueil AIME"');
  });
});