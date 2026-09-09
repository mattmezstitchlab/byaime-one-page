"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertProviderAccepted = assertProviderAccepted;
function assertProviderAccepted(response, operation) {
    if (!response.ok) {
        throw new Error("Resend a refus\u00E9 ".concat(operation, " (").concat(response.status, ")"));
    }
}
//# sourceMappingURL=providerResponse.js.map