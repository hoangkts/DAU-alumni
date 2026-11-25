import {
  EmailNotificationRecord,
  EventCustomField,
  EventRecord,
  EventRegistrationRecord,
  EventShirtOrder,
  ExecutiveRecord,
  BusinessRecord,
  MemberProfileRecord,
} from '../data/constants';
import {
  BusinessFormInput,
  EventFormInput,
  MemberFormInput,
} from '../utils/alumniLogic';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  adminRole?: 'admin1' | 'admin2';
  canConfirmBtc?: boolean;
  authMode: 'password' | 'google' | 'demo';
}

export interface PinnedIdsPayload {
  events: string[];
  businesses: string[];
  executives: string[];
  members: string[];
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  category: EmailNotificationRecord['category'];
  bodyLines: string[];
  recipientName?: string;
  senderName?: string;
  memberProfile?: MemberProfileRecord;
  icsContent?: string;
  icsFilename?: string;
}

export interface SendEmailResponse {
  messageId: string;
  deliveryMode: string;
  previewUrl?: string | null;
  htmlContent?: string;
  sentAt: string;
}

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
      credentials: 'include',
    });
  } catch (err) {
    const msg =
      err instanceof Error && err.message
        ? err.message
        : 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại kết nối mạng.';
    throw new ApiError(msg, 0);
  }

  const rawText = await response.text();
  let parsed: any = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }
  }

  if (!response.ok) {
    const serverMessage =
      (parsed && typeof parsed === 'object' && (parsed.error || parsed.message)) ||
      (typeof parsed === 'string' && parsed.trim()) ||
      `Yêu cầu thất bại (HTTP ${response.status}).`;
    throw new ApiError(String(serverMessage), response.status, parsed);
  }

  return (parsed ?? {}) as T;
}

export const api = {
  // ---------------- Auth ----------------
  getMe(): Promise<{
    user: AppUser | null;
    googleOAuthEnabled: boolean;
    googleClientId?: string | null;
    googleRedirectEnabled?: boolean;
  }> {
    return requestJson<{
      user: AppUser | null;
      googleOAuthEnabled: boolean;
      googleClientId?: string | null;
      googleRedirectEnabled?: boolean;
    }>('/api/auth/me');
  },

  loginWithGoogleToken(credential: string): Promise<{ user: AppUser }> {
    return requestJson<{ user: AppUser }>('/api/auth/google/token', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
  },

  register(email: string, password: string, fullName: string): Promise<{ user: AppUser }> {
    return requestJson<{ user: AppUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
  },

  login(identifier: string, password: string): Promise<{ user: AppUser }> {
    return requestJson<{ user: AppUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, email: identifier, password }),
    });
  },

  async logout(): Promise<void> {
    await requestJson<{ ok?: boolean }>('/api/auth/logout', {
      method: 'POST',
    });
  },

  getGoogleAuthUrl(): string {
    return '/api/auth/google';
  },

  // ---------------- Uploads ----------------
  uploadImage(dataUrl: string, category: 'avatar' | 'logo' | 'qr'): Promise<{ url: string }> {
    return requestJson<{ url: string }>('/api/uploads/image', {
      method: 'POST',
      body: JSON.stringify({ dataUrl, category }),
    });
  },

  // ---------------- Members ----------------
  async getMembers(): Promise<MemberProfileRecord[]> {
    const data = await requestJson<{ members: MemberProfileRecord[] }>('/api/members');
    return Array.isArray(data.members) ? data.members : [];
  },

  async getMyMember(): Promise<MemberProfileRecord | null> {
    const data = await requestJson<{ member: MemberProfileRecord | null }>('/api/members/me');
    return data.member ?? null;
  },

  async saveMyMember(input: MemberFormInput): Promise<MemberProfileRecord> {
    const data = await requestJson<{ member: MemberProfileRecord }>('/api/members/me', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return data.member;
  },

  async saveMyPhone(phone: string, fullName?: string): Promise<MemberProfileRecord | null> {
    const data = await requestJson<{ member: MemberProfileRecord | null }>('/api/members/me/phone', {
      method: 'PATCH',
      body: JSON.stringify({ phone, zaloPhone: phone, fullName }),
    });
    return data.member ?? null;
  },

  async deleteMember(uid: string): Promise<void> {
    await requestJson(`/api/members/${encodeURIComponent(uid)}`, {
      method: 'DELETE',
    });
  },

  // ---------------- Executives ----------------
  async getExecutives(): Promise<ExecutiveRecord[]> {
    const data = await requestJson<{ executives: ExecutiveRecord[] }>('/api/executives');
    return Array.isArray(data.executives) ? data.executives : [];
  },

  async addExecutive(exec: Omit<ExecutiveRecord, 'id'>): Promise<ExecutiveRecord> {
    const data = await requestJson<{ executive?: ExecutiveRecord } & ExecutiveRecord>(
      '/api/executives',
      {
        method: 'POST',
        body: JSON.stringify(exec),
      }
    );
    return data.executive || data;
  },

  async updateExecutive(exec: ExecutiveRecord): Promise<ExecutiveRecord> {
    const data = await requestJson<{ executive?: ExecutiveRecord } & ExecutiveRecord>(
      `/api/executives/${encodeURIComponent(exec.id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(exec),
      }
    );
    return data.executive || data;
  },

  async deleteExecutive(id: string): Promise<void> {
    await requestJson(`/api/executives/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // ---------------- Businesses ----------------
  async getBusinesses(): Promise<BusinessRecord[]> {
    const data = await requestJson<{ businesses: BusinessRecord[] }>('/api/businesses');
    return Array.isArray(data.businesses) ? data.businesses : [];
  },

  async registerBusiness(input: BusinessFormInput): Promise<BusinessRecord> {
    const data = await requestJson<{ business: BusinessRecord }>('/api/businesses', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.business;
  },

  async updateBusiness(id: string, input: BusinessFormInput): Promise<BusinessRecord> {
    const data = await requestJson<{ business: BusinessRecord }>(
      `/api/businesses/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(input),
      }
    );
    return data.business;
  },

  async deleteBusiness(id: string): Promise<void> {
    await requestJson(`/api/businesses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // ---------------- Events & Registrations ----------------
  async getEvents(): Promise<EventRecord[]> {
    const data = await requestJson<{ events: EventRecord[] }>('/api/events');
    return Array.isArray(data.events) ? data.events : [];
  },

  async createEvent(input: EventFormInput): Promise<EventRecord> {
    const data = await requestJson<{ event?: EventRecord } & EventRecord>('/api/events', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.event || data;
  },

  async updateEvent(id: string, input: EventFormInput): Promise<EventRecord> {
    const data = await requestJson<{ event?: EventRecord } & EventRecord>(
      `/api/events/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(input),
      }
    );
    return data.event || data;
  },

  async updateEventCustomFields(
    id: string,
    fields: EventCustomField[]
  ): Promise<EventRecord> {
    const data = await requestJson<{ event?: EventRecord } & EventRecord>(
      `/api/events/${encodeURIComponent(id)}/custom-fields`,
      {
        method: 'PUT',
        body: JSON.stringify({ customFields: fields }),
      }
    );
    return data.event || data;
  },

  async deleteEvent(id: string): Promise<void> {
    await requestJson(`/api/events/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async getEventRegistrations(eventId: string): Promise<EventRegistrationRecord[]> {
    const data = await requestJson<{ registrations: EventRegistrationRecord[] }>(
      `/api/events/${encodeURIComponent(eventId)}/registrations`
    );
    return Array.isArray(data.registrations) ? data.registrations : [];
  },

  async getMyRegistrations(): Promise<Record<string, EventRegistrationRecord>> {
    const data = await requestJson<{
      registrations: Record<string, EventRegistrationRecord>;
    }>('/api/registrations/me');
    return data.registrations && typeof data.registrations === 'object'
      ? data.registrations
      : {};
  },

  async registerForEvent(
    eventId: string,
    payload: {
      note: string;
      customAnswers?: Record<string, any>;
      attendGala?: boolean;
      shirtOrders?: EventShirtOrder[];
      payerPhone?: string;
      payerName?: string;
    }
  ): Promise<EventRegistrationRecord> {
    const data = await requestJson<{ registration: EventRegistrationRecord }>(
      `/api/events/${encodeURIComponent(eventId)}/registrations`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return data.registration;
  },

  async adminUpdateRegistration(
    eventId: string,
    uid: string,
    updates: {
      attendGala?: boolean;
      shirtOrders?: EventShirtOrder[];
      totalFee?: number;
      paymentStatus?: 'pending' | 'completed';
      btcConfirmed?: boolean;
      note?: string;
    }
  ): Promise<EventRegistrationRecord> {
    const data = await requestJson<{ registration: EventRegistrationRecord }>(
      `/api/events/${encodeURIComponent(eventId)}/registrations/${encodeURIComponent(uid)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
    return data.registration;
  },

  async adminDeleteRegistration(eventId: string, uid: string): Promise<void> {
    await requestJson(
      `/api/events/${encodeURIComponent(eventId)}/registrations/${encodeURIComponent(uid)}`,
      {
        method: 'DELETE',
      }
    );
  },

  async adminResetEventRegistrations(eventId: string): Promise<void> {
    await requestJson(`/api/events/${encodeURIComponent(eventId)}/registrations`, {
      method: 'DELETE',
    });
  },

  // ---------------- Settings & Emails ----------------
  async getPinnedSettings(): Promise<PinnedIdsPayload> {
    const data = await requestJson<{ pinned?: PinnedIdsPayload } & Partial<PinnedIdsPayload>>(
      '/api/settings/pinned'
    );
    const pinned = data.pinned || data;
    return {
      events: Array.isArray(pinned.events) ? pinned.events : [],
      businesses: Array.isArray(pinned.businesses) ? pinned.businesses : [],
      executives: Array.isArray(pinned.executives) ? pinned.executives : [],
      members: Array.isArray(pinned.members) ? pinned.members : [],
    };
  },

  async savePinnedSettings(pinned: PinnedIdsPayload): Promise<PinnedIdsPayload> {
    const data = await requestJson<{ pinned?: PinnedIdsPayload } & Partial<PinnedIdsPayload>>(
      '/api/settings/pinned',
      {
        method: 'PUT',
        body: JSON.stringify(pinned),
      }
    );
    const saved = data.pinned || data;
    return {
      events: Array.isArray(saved.events) ? saved.events : pinned.events,
      businesses: Array.isArray(saved.businesses) ? saved.businesses : pinned.businesses,
      executives: Array.isArray(saved.executives) ? saved.executives : pinned.executives,
      members: Array.isArray(saved.members) ? saved.members : pinned.members,
    };
  },

  async getEmails(): Promise<EmailNotificationRecord[]> {
    const data = await requestJson<{ emails: EmailNotificationRecord[] }>('/api/emails');
    return Array.isArray(data.emails) ? data.emails : [];
  },

  sendEmail(payload: SendEmailPayload): Promise<SendEmailResponse> {
    return requestJson<SendEmailResponse>('/api/send-email', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
