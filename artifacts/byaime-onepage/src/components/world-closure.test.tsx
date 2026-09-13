import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorldClosure, WorldClosureView } from "./WorldClosure";

const noop = () => {};

describe("WorldClosure", () => {
  it("proposes the closure to the owner without closing on a single click", () => {
    const markup = renderToStaticMarkup(
      <WorldClosure canClose onClose={noop} onReopen={noop} />,
    );

    expect(markup).toContain('data-testid="world-closure"');
    expect(markup).toContain('data-testid="world-closure-open"');
    expect(markup).toContain("Clôturer le Monde");
    // La confirmation n'apparaît qu'au second clic : rien n'est clos par accident.
    expect(markup).not.toContain('data-testid="world-closure-apply"');
    expect(markup).not.toContain('data-testid="world-closure-reopen"');
  });

  it("shows a closed Monde as a readable archive, with reopening left to the owner", () => {
    const markup = renderToStaticMarkup(
      <WorldClosure closedAt={Date.UTC(2027, 8, 20)} canClose onClose={noop} onReopen={noop} />,
    );

    expect(markup).toContain(">Monde clos<");
    expect(markup).toContain("20 septembre 2027");
    expect(markup).toContain("Tout reste consultable");
    expect(markup).toContain('data-testid="world-closure-reopen"');
    expect(markup).not.toContain('data-testid="world-closure-open"');
  });

  it("keeps the decision with the owner for everyone else", () => {
    const markup = renderToStaticMarkup(
      <WorldClosure canClose={false} onClose={noop} onReopen={noop} />,
    );

    expect(markup).toContain('data-testid="world-closure-locked"');
    expect(markup).not.toContain('data-testid="world-closure-open"');
  });

  it("affiche la confirmation au second clic, avec une sortie pour renoncer", () => {
    const markup = renderToStaticMarkup(
      <WorldClosureView
        confirming
        canClose
        onRequestClose={noop}
        onCancel={noop}
        onClose={noop}
        onReopen={noop}
      />,
    );

    expect(markup).toContain('data-testid="world-closure-confirm"');
    expect(markup).toContain('data-testid="world-closure-apply"');
    expect(markup).toContain("Confirmer la clôture");
    expect(markup).toContain('data-testid="world-closure-cancel"');
    // La confirmation remplace le premier bouton : on ne peut pas clôturer deux fois.
    expect(markup).not.toContain('data-testid="world-closure-open"');
    // L'apostrophe est échappée en &#x27; par le rendu statique : on assertit sans elle.
    expect(markup).toContain("édition est coupée pour tout le monde");
  });
});
