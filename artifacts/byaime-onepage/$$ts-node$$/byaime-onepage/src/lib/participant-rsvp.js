export function effectiveGuestRsvp(guest, link) {
    if (link?.response?.status === "confirmed")
        return "confirme";
    if (link?.response?.status === "declined")
        return "decline";
    return guest.rsvp;
}
export function effectiveGuestDietary(guest, link) {
    return link?.response?.dietary ?? guest.dietary ?? "";
}
//# sourceMappingURL=participant-rsvp.js.map