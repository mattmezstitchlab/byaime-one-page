export function pendingSaveOutcomeNotice(outcome, successNotice, syncError) {
    if (outcome === "saved") {
        return successNotice ?? "Modification enregistrée dans le Monde";
    }
    if (outcome === "conflict") {
        return "Modification non enregistrée : une autre version du Monde doit être vérifiée";
    }
    return (syncError ??
        "Modification conservée sur cet appareil, mais pas encore enregistrée en ligne");
}
//# sourceMappingURL=pending-save-notice.js.map