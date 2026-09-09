function resendApiKey() {
    const value = process.env.RESEND_API_KEY?.trim();
    if (!value) {
        throw new Error("RESEND_API_KEY is required to send email");
    }
    return value;
}
export async function sendResendEmail(payload) {
    return fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: "Bearer " + resendApiKey(),
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
}
//# sourceMappingURL=resend.js.map