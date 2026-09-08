type ProviderResponse = {
  ok: boolean;
  status: number;
};

export function assertProviderAccepted(response: ProviderResponse, operation: string) {
  if (!response.ok) {
    throw new Error(`Resend a refusé ${operation} (${response.status})`);
  }
}