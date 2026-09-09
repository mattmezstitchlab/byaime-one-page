export function assertProviderAccepted(response, operation) {
    if (!response.ok) {
        throw new Error(`Resend a refusé ${operation} (${response.status})`);
    }
}
//# sourceMappingURL=providerResponse.js.map