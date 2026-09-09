import { CenteredBlock } from "./CenteredBlock";
export function ContextPanel({ eyebrow, title, onClose, children }) {
    return (<CenteredBlock eyebrow={eyebrow} title={title} onClose={onClose} size="lg">
      {children}
    </CenteredBlock>);
}
//# sourceMappingURL=ContextPanel.jsx.map