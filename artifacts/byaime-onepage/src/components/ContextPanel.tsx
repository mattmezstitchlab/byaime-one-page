import type { ReactNode } from "react";
import { CenteredBlock } from "./CenteredBlock";

type ContextPanelProps = {
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function ContextPanel({ eyebrow, title, onClose, children }: ContextPanelProps) {
  return (
    <CenteredBlock eyebrow={eyebrow} title={title} onClose={onClose} size="lg">
      {children}
    </CenteredBlock>
  );
}