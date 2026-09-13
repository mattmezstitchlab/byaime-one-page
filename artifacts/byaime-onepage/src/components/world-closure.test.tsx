import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorldClosure } from "./WorldClosure";

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
});
