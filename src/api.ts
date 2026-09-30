export interface Affiliate { id: string; name: string; email: string; phone: string; status: 'pending'|'active'|'suspended'; referral_code: string; commission_bps: number; commission_cap_bps: number; identity_status: 'unsubmitted'|'pending'|'verified'|'rejected'; identity_type: 'nin'|'bvn'|null; identity_last4: string|null; totp_enabled: boolean; has_password: boolean; google_linked: boolean; created_at: string }
export interface Session { affiliate: Affiliate; accessToken: string }
export interface Overview { affiliate: Affiliate; vendorLeads: number; referralLinkReady: boolean; earningsAvailable: boolean; payoutsAvailable: boolean }
export interface Referral { id: string; name: string; city: string; created_at: string }
export interface Envelope<T> { ok: true; data: T; meta?: { page: number; pageSize: number; total: number } }
export class ApiError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
const base = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');
export async function api<T>(path: string, token?: string, options: RequestInit = {}): Promise<Envelope<T>> {
  if (!base) throw new ApiError(0, 'CONFIGURATION_REQUIRED', 'The API address is missing. Set VITE_API_BASE_URL and rebuild.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${base}/api/v1/affiliate${path}`, { ...options, credentials: 'omit', cache: 'no-store', signal: controller.signal, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
    const result = await response.json().catch(() => null);
    if (!result) throw new ApiError(response.status, 'INVALID_RESPONSE', 'The API returned an unreadable response.');
    if (!response.ok || result.ok !== true) throw new ApiError(response.status, result.error?.code || 'REQUEST_FAILED', result.error?.message || 'The request could not be completed.');
    return result as Envelope<T>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'NETWORK_ERROR', controller.signal.aborted ? 'The request timed out. Try again.' : 'Could not reach Koola. Check your connection.');
  } finally { clearTimeout(timer); }
}
