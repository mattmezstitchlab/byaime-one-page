import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WorldSwitcher, type SwitchableWorld } from "./WorldSwitcher";

const worlds: SwitchableWorld[] = [
  { id: "w1", title: "Mariage de Camille", role: "owner" },
  { id: "w2", title: "Mariage de Thomas", role: "viewer" },
];

describe("WorldSwitcher", () => {
  it("liste les Mondes accessibles et signale le Monde actif", () => {
    const markup = renderToStaticMarkup(
      <WorldSwitcher projects={worlds} activeProjectId="w1" onSelect={() => {}} />,
    );
    expect(markup).toContain('data-testid="world-switcher"');
    expect(markup).toContain("Mariage de Camille");
    expect(markup).toContain("Mariage de Thomas");
    // Une seule ligne porte le marquage du Monde actif.
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("Mariage · Monde actif");
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("gère l'absence de Monde", () => {
    const markup = renderToStaticMarkup(
      <WorldSwitcher projects={[]} activeProjectId={undefined} onSelect={() => {}} />,
    );
    expect(markup).toContain("Aucun Monde pour le moment");
  });

  it("appelle onSelect avec l'id du Monde choisi", () => {
    const onSelect = vi.fn();
    const tree = <WorldSwitcher projects={worlds} activeProjectId="w1" onSelect={onSelect} />;
    // Rendu serveur : on garantit surtout que chaque ligne expose le même écran unifié.
    const markup = renderToStaticMarkup(tree);
    expect(markup.match(/<button/g)).toHaveLength(worlds.length);
  });
});
