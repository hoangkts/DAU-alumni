import React, { useState, useEffect, useCallback } from 'react';
import {
  AdminNotificationConfig,
  BusinessRecord,
  DEFAULT_ADMIN_NOTIFICATION_CONFIG,
  EmailNotificationRecord,
  EventCustomField,
  EventRecord,
  EventRegistrationRecord,
  EventShirtOrder,
  ExecutiveRecord,
  MemberProfileRecord,
  OFFICIAL_GALA_EVENT,
} from './data/constants';
import {
  buildBusinessConfirmationEmail,
  buildEventRegistrationEmails,
  buildMemberConfirmationEmail,
  buildMemberWelcomeEmail,
  BusinessFormInput,
  EventFormInput,
  generateIcsCalendarContent,
  isConfirmedNetworkMember,
  MemberFormInput,
  sanitizeEventRecord,
  sanitizeExternalUrl,
} from './utils/alumniLogic';
import { api, AppUser } from './services/api';
import {
  Ticket,
  User,
  Building2,
  Mail,
  LogOut,
  ChevronDown,
  Users,
  Award,
  Calendar,
  ShieldCheck,
  Compass,
  HelpCircle,
  Smartphone,
  AlertCircle,
  X,
} from 'lucide-react';
import { NetworkSection } from './components/NetworkSection';
import { ExecutiveBoardSection } from './components/ExecutiveBoardSection';
import { BusinessCommunitySection } from './components/BusinessCommunitySection';
import { EventsTimelineSection } from './components/EventsTimelineSection';
import { AdminPortalSection } from './components/AdminPortalSection';
import { EmailOutboxModal } from './components/EmailOutboxModal';
import { MyTicketsModal } from './components/MyTicketsModal';
import { MemberProfileModal } from './components/MemberProfileModal';
import { InAppBrowserModal } from './components/InAppBrowserModal';
import { UserGuideModal } from './components/UserGuideModal';
import { AuthModal } from './components/AuthModal';
import { DauLogoMark } from './components/AvatarIllustration';
import {
  HomePinnedSpotlight,
  PinnedCategory,
  PinnedIdsState,
} from './components/HomePinnedSpotlight';

type ActiveTab = 'network' | 'executive' | 'business' | 'events' | 'admin';

const PINNED_STORAGE_KEY = 'alumni_ktd_pinned_items_v1';

const DEFAULT_PINNED_IDS: PinnedIdsState = {
  events: [OFFICIAL_GALA_EVENT.id],
  businesses: [],
  executives: [],
  members: [],
};

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_oauth_state:
    'Phiên xác thực Google đã hết hạn hoặc không hợp lệ. Vui lòng thử lại.',
  google_cancelled: 'Bạn đã hủy quá trình đăng nhập Google.',
  google_token_failed: 'Không thể kết nối xác thực với Google. Vui lòng thử lại.',
  google_no_token: 'Google không trả về mã truy cập hợp lệ.',
  google_userinfo_failed: 'Không thể lấy thông tin hồ sơ từ Google.',
  google_unverified_email:
    'Tài khoản Google của bạn chưa xác minh email. Vui lòng dùng Email & Mật khẩu.',
  google_callback_error:
    'Có lỗi xảy ra khi đăng nhập bằng Google. Vui lòng thử lại hoặc đăng nhập bằng Email.',
};

function normalizeWebsiteInput(rawWebsite: string): string {
  const trimmed = rawWebsite.trim();
  if (!trimmed) return '';
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return sanitizeExternalUrl(trimmed) || trimmed;
  }
  return trimmed;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('network');
  const [currentUser, setCurrentUserState] = useState<AppUser | null>(null);
  const currentUserRef = React.useRef<AppUser | null>(null);
  const setCurrentUser = useCallback((user: AppUser | null) => {
    currentUserRef.current = user;
    setCurrentUserState(user);
  }, []);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [googleRedirectEnabled, setGoogleRedirectEnabled] = useState(false);

  const [adminConfig, setAdminConfig] = useState<AdminNotificationConfig>(
    DEFAULT_ADMIN_NOTIFICATION_CONFIG
  );

  const [members, setMembers] = useState<MemberProfileRecord[]>([]);
  const [myMemberProfile, setMyMemberProfile] =
    useState<MemberProfileRecord | null>(null);
  const [sessionPhoneDraft, setSessionPhoneDraft] = useState('');
  const [executives, setExecutives] = useState<ExecutiveRecord[]>([]);
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([
    sanitizeEventRecord(OFFICIAL_GALA_EVENT),
  ]);
  const [userRegistrations, setUserRegistrations] = useState<
    Record<string, EventRegistrationRecord>
  >({});
  const [allEventRegistrations, setAllEventRegistrations] = useState<
    Record<string, EventRegistrationRecord[]>
  >({});

  const [emails, setEmails] = useState<EmailNotificationRecord[]>([]);
  const [isEmailOutboxOpen, setIsEmailOutboxOpen] = useState(false);
  const [isMyTicketsOpen, setIsMyTicketsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isFirstTimeLoginModal, setIsFirstTimeLoginModal] = useState(false);
  const [isInAppBrowserModalOpen, setIsInAppBrowserModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [authModalError, setAuthModalError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [userGuideState, setUserGuideState] = useState<{
    isOpen: boolean;
    section: 'newbie' | 'ios';
  }>({
    isOpen: false,
    section: 'newbie',
  });
  const [initialOpenRegisterEventId, setInitialOpenRegisterEventId] = useState<
    string | null
  >(null);

  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [pinnedIds, setPinnedIds] = useState<PinnedIdsState>(() => {
    try {
      const saved = localStorage.getItem(PINNED_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedEvents = Array.isArray(parsed.events) ? parsed.events : [];
        return {
          events:
            savedEvents.length > 0 ? savedEvents : DEFAULT_PINNED_IDS.events,
          businesses: Array.isArray(parsed.businesses)
            ? parsed.businesses
            : DEFAULT_PINNED_IDS.businesses,
          executives: Array.isArray(parsed.executives)
            ? parsed.executives
            : DEFAULT_PINNED_IDS.executives,
          members: Array.isArray(parsed.members)
            ? parsed.members
            : DEFAULT_PINNED_IDS.members,
        };
      }
    } catch {
      // Ignore invalid local draft
    }
    return DEFAULT_PINNED_IDS;
  });

  const surfaceError = useCallback((err: unknown, fallback: string): string => {
    const msg =
      err instanceof Error && err.message ? err.message : fallback;
    setActionError(msg);
    return msg;
  }, []);

  const refreshAllEventRegistrations = useCallback(async (eventList: EventRecord[]) => {
    const ids = Array.from(
      new Set([OFFICIAL_GALA_EVENT.id, ...eventList.map((e) => e.id)])
    ).filter(Boolean);
    if (ids.length === 0) return;

    const settled = await Promise.allSettled(
      ids.map(async (eid) => ({
        eid,
        regs: await api.getEventRegistrations(eid),
      }))
    );

    const nextMap: Record<string, EventRegistrationRecord[]> = {};
    settled.forEach((res) => {
      if (res.status === 'fulfilled') {
        nextMap[res.value.eid] = res.value.regs;
      }
    });
    if (Object.keys(nextMap).length > 0) {
      setAllEventRegistrations((prev) => ({ ...prev, ...nextMap }));
    }
  }, []);

  const refreshAuthenticatedData = useCallback(
    async (user: AppUser | null, currentEvents?: EventRecord[]) => {
      if (!user) {
        setMyMemberProfile(null);
        setUserRegistrations({});
        setEmails([]);
        setSessionPhoneDraft('');
        const [membersRes, eventsRes] = await Promise.allSettled([
          api.getMembers(),
          currentEvents ? Promise.resolve(currentEvents) : api.getEvents(),
        ]);
        if (membersRes.status === 'fulfilled') {
          setMembers(membersRes.value);
        }
        const resolvedEvents =
          eventsRes.status === 'fulfilled' && eventsRes.value.length > 0
            ? eventsRes.value.map((ev) => sanitizeEventRecord(ev))
            : currentEvents || [];
        if (eventsRes.status === 'fulfilled' && eventsRes.value.length > 0) {
          setEvents(resolvedEvents);
        }
        await refreshAllEventRegistrations(resolvedEvents);
        return;
      }

      const [membersRes, myMemberRes, myRegsRes, emailsRes, eventsRes] =
        await Promise.allSettled([
          api.getMembers(),
          api.getMyMember(),
          api.getMyRegistrations(),
          api.getEmails(),
          currentEvents ? Promise.resolve(currentEvents) : api.getEvents(),
        ]);

      if (membersRes.status === 'fulfilled') {
        setMembers(membersRes.value);
      }
      if (myMemberRes.status === 'fulfilled') {
        setMyMemberProfile(myMemberRes.value);
      }
      if (myRegsRes.status === 'fulfilled') {
        setUserRegistrations(myRegsRes.value);
      }
      if (emailsRes.status === 'fulfilled') {
        setEmails(emailsRes.value);
      }

      const resolvedEvents =
        eventsRes.status === 'fulfilled' && eventsRes.value.length > 0
          ? eventsRes.value.map((ev) => sanitizeEventRecord(ev))
          : currentEvents || [];
      if (eventsRes.status === 'fulfilled' && eventsRes.value.length > 0) {
        setEvents(resolvedEvents);
      }
      await refreshAllEventRegistrations(resolvedEvents);
    },
    [refreshAllEventRegistrations]
  );

  // Bootstrap application state from PostgreSQL API on mount
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      // Surface Google OAuth redirect errors if redirected from /api/auth/google/callback
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const oauthErr = params.get('auth_error');
        if (oauthErr) {
          const msg =
            OAUTH_ERROR_MESSAGES[oauthErr] ||
            'Đăng nhập Google không thành công. Vui lòng thử lại.';
          setAuthError(msg);
          setAuthModalError(msg);
          setIsAuthModalOpen(true);
          params.delete('auth_error');
          const nextSearch = params.toString();
          const nextUrl =
            window.location.pathname +
            (nextSearch ? `?${nextSearch}` : '') +
            window.location.hash;
          window.history.replaceState({}, '', nextUrl);
        }
      }

      const [meRes, membersRes, bizRes, execRes, eventsRes, pinnedRes] =
        await Promise.allSettled([
          api.getMe(),
          api.getMembers(),
          api.getBusinesses(),
          api.getExecutives(),
          api.getEvents(),
          api.getPinnedSettings(),
        ]);

      if (cancelled) return;

      const meData =
        meRes.status === 'fulfilled'
          ? meRes.value
          : {
              user: null,
              googleOAuthEnabled: false,
              googleClientId: null,
              googleRedirectEnabled: false,
            };
      setCurrentUser(meData.user);
      setGoogleOAuthEnabled(Boolean(meData.googleOAuthEnabled));
      setGoogleClientId(meData.googleClientId || null);
      setGoogleRedirectEnabled(Boolean(meData.googleRedirectEnabled));

      if (membersRes.status === 'fulfilled') {
        setMembers(membersRes.value);
      }
      if (bizRes.status === 'fulfilled') {
        setBusinesses(bizRes.value);
      }
      if (execRes.status === 'fulfilled') {
        setExecutives(execRes.value);
      }

      let resolvedEvents: EventRecord[] = [
        sanitizeEventRecord(OFFICIAL_GALA_EVENT),
      ];
      if (eventsRes.status === 'fulfilled' && eventsRes.value.length > 0) {
        resolvedEvents = eventsRes.value.map((ev) => sanitizeEventRecord(ev));
        setEvents(resolvedEvents);
      }

      if (pinnedRes.status === 'fulfilled') {
        const remotePinned = pinnedRes.value;
        const normalizedPinned: PinnedIdsState = {
          events:
            remotePinned.events.length > 0
              ? remotePinned.events
              : [OFFICIAL_GALA_EVENT.id],
          businesses: remotePinned.businesses,
          executives: remotePinned.executives,
          members: remotePinned.members,
        };
        setPinnedIds(normalizedPinned);
        try {
          localStorage.setItem(
            PINNED_STORAGE_KEY,
            JSON.stringify(normalizedPinned)
          );
        } catch {
          // Ignore storage fallback error
        }
      }

      if (meData.user) {
        const [myMemberRes, myRegsRes, emailsRes, refreshedMembersRes] =
          await Promise.allSettled([
            api.getMyMember(),
            api.getMyRegistrations(),
            api.getEmails(),
            api.getMembers(),
          ]);
        if (cancelled) return;
        if (myMemberRes.status === 'fulfilled') {
          setMyMemberProfile(myMemberRes.value);
        }
        if (myRegsRes.status === 'fulfilled') {
          setUserRegistrations(myRegsRes.value);
        }
        if (emailsRes.status === 'fulfilled') {
          setEmails(emailsRes.value);
        }
        if (refreshedMembersRes.status === 'fulfilled') {
          setMembers(refreshedMembersRes.value);
        }
      }

      await refreshAllEventRegistrations(resolvedEvents);
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [refreshAllEventRegistrations]);

  // Close user dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#user-account-menu-container')) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const currentMemberProfile = React.useMemo(() => {
    if (!currentUser) return null;
    if (myMemberProfile && myMemberProfile.uid === currentUser.uid) {
      return myMemberProfile;
    }
    return (
      members.find((m) => m.uid === currentUser.uid) ||
      members.find(
        (m) =>
          m.email &&
          currentUser.email &&
          m.email.toLowerCase() === currentUser.email.toLowerCase()
      ) ||
      null
    );
  }, [myMemberProfile, members, currentUser]);

  const savedUserPhone =
    currentMemberProfile?.zaloPhone || sessionPhoneDraft || '';

  const checkIsInAppBrowser = (): boolean => {
    if (typeof window === 'undefined') return false;
    const ua =
      navigator.userAgent || navigator.vendor || (window as any).opera || '';
    return /FBAN|FBAV|Instagram|Line|Zalo|ZaloTheme|ZaloPC|MicroMessenger/i.test(
      ua
    );
  };

  const handleOpenAuthModal = (tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setAuthModalError(null);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = async (
    user: AppUser,
    _mode: 'login' | 'register' | 'google'
  ) => {
    setIsLoggingIn(true);
    setAuthError(null);
    setAuthModalError(null);
    setCurrentUser(user);
    setIsAuthModalOpen(false);

    try {
      await refreshAuthenticatedData(user, events);
      if (activeTab === 'business') {
        const myProfile = await api.getMyMember().catch(() => null);
        if (!isConfirmedNetworkMember(myProfile)) {
          setIsFirstTimeLoginModal(true);
          setIsProfileModalOpen(true);
        }
      }
    } catch (err) {
      surfaceError(err, 'Không thể tải dữ liệu tài khoản.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminLogin = async (
    emailInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoggingIn(true);
    try {
      const res = await api.login(emailInput, passwordInput);
      setCurrentUser(res.user);
      setAuthError(null);
      await refreshAuthenticatedData(res.user, events);
      if (!res.user.isAdmin) {
        return {
          success: false,
          error:
            'Tài khoản này không có quyền quản trị viên Ban Điều hành.',
        };
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Tài khoản hoặc mật mã quản trị viên chưa chính xác.',
      };
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      surfaceError(err, 'Không thể đăng xuất khỏi máy chủ.');
    }
    setCurrentUser(null);
    setMyMemberProfile(null);
    setUserRegistrations({});
    setEmails([]);
    setSessionPhoneDraft('');
    setIsMyTicketsOpen(false);
    await refreshAuthenticatedData(null, events);
  };

  const handleTogglePin = async (category: PinnedCategory, id: string) => {
    if (!currentUser?.isAdmin) return;

    const keyMap: Record<PinnedCategory, keyof PinnedIdsState> = {
      event: 'events',
      business: 'businesses',
      executive: 'executives',
      member: 'members',
    };
    const stateKey = keyMap[category];

    const currentList = pinnedIds[stateKey] || [];
    const exists = currentList.includes(id);
    const nextList = exists
      ? currentList.filter((item: string) => item !== id)
      : [id, ...currentList];
    const nextState: PinnedIdsState = {
      ...pinnedIds,
      [stateKey]: nextList,
    };

    try {
      const saved = await api.savePinnedSettings(nextState);
      setPinnedIds(saved);
      try {
        localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(saved));
      } catch {
        // Ignore storage fallback
      }
    } catch (err) {
      surfaceError(err, 'Không thể lưu cấu hình ghim nổi bật lên máy chủ.');
    }
  };

  const dispatchEmailToServer = async (
    emailRecord: EmailNotificationRecord
  ): Promise<EmailNotificationRecord> => {
    const data = await api.sendEmail({
      to: emailRecord.to,
      subject: emailRecord.subject,
      category: emailRecord.category,
      bodyLines: emailRecord.bodyLines,
      recipientName: emailRecord.recipientName,
      senderName: emailRecord.senderName,
      memberProfile: emailRecord.memberSnapshot,
      icsContent: emailRecord.icsEvent
        ? generateIcsCalendarContent(emailRecord.icsEvent)
        : undefined,
      icsFilename: emailRecord.icsEvent
        ? `alumni-ktd-${emailRecord.icsEvent.id}.ics`
        : undefined,
    });
    return {
      ...emailRecord,
      messageId: data.messageId,
      deliveryMode: data.deliveryMode,
      previewUrl: data.previewUrl || null,
      htmlContent: data.htmlContent,
      sentAt: data.sentAt || emailRecord.sentAt,
    };
  };

  const handleSaveUserPhone = async (phone: string, fullName?: string) => {
    const cleanPhone = phone.trim();
    const cleanName = fullName?.trim();
    setSessionPhoneDraft(cleanPhone);

    if (
      currentUser &&
      cleanPhone.length >= 9 &&
      currentMemberProfile &&
      isConfirmedNetworkMember(currentMemberProfile) &&
      currentMemberProfile.zaloPhone !== cleanPhone
    ) {
      try {
        const updated = await api.saveMyPhone(cleanPhone, cleanName);
        if (updated) {
          setMyMemberProfile(updated);
          setMembers((prev) =>
            prev.map((m) => (m.uid === updated.uid ? updated : m))
          );
        }
      } catch (err) {
        surfaceError(
          err,
          'Không thể cập nhật số điện thoại lên máy chủ.'
        );
      }
    }
  };

  const handleSaveMemberProfile = async (
    input: MemberFormInput
  ): Promise<EmailNotificationRecord | null> => {
    if (!currentUser) {
      handleOpenAuthModal('login');
      throw new Error('Vui lòng đăng nhập để lưu hồ sơ thành viên.');
    }

    const isNewMember = !members.some((m) => m.uid === currentUser.uid);

    let savedMember: MemberProfileRecord;
    try {
      savedMember = await api.saveMyMember({
        ...input,
        email: input.email.trim(),
        fullName: input.fullName.trim(),
        birthDate:
          input.birthDate && input.birthDate.trim() !== '—'
            ? input.birthDate.trim()
            : '1995-01-01',
        className: input.className.trim(),
        enrollmentYear: input.enrollmentYear.trim(),
        graduationYear: input.graduationYear.trim(),
        workplace: input.workplace.trim(),
        zaloPhone: (input.zaloPhone || '').trim(),
        avatarUrl: input.avatarUrl || currentMemberProfile?.avatarUrl,
      });
    } catch (err) {
      surfaceError(err, 'Không thể lưu hồ sơ thành viên lên máy chủ.');
      throw err;
    }

    setMyMemberProfile(savedMember);
    setMembers((prev) => {
      const rest = prev.filter((m) => m.uid !== savedMember.uid);
      return [savedMember, ...rest];
    });
    if (savedMember.zaloPhone) {
      setSessionPhoneDraft(savedMember.zaloPhone);
    }

    let deliveredEmail: EmailNotificationRecord | null = null;
    if (adminConfig.autoSendWelcomeEmail) {
      const draftEmail = isNewMember
        ? buildMemberWelcomeEmail(
            savedMember,
            adminConfig.senderTitle,
            adminConfig.customFooterNote
          )
        : buildMemberConfirmationEmail(
            savedMember,
            adminConfig.senderTitle,
            adminConfig.customFooterNote
          );
      try {
        deliveredEmail = await dispatchEmailToServer(draftEmail);
        setEmails((prev) => [deliveredEmail!, ...prev]);
      } catch (mailErr) {
        console.warn('Could not dispatch welcome/confirm email:', mailErr);
      }
    }

    setIsProfileModalOpen(false);
    setIsFirstTimeLoginModal(false);
    setIsProfileEditing(false);
    setActiveTab('network');
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // Ignore scroll error
    }

    return deliveredEmail;
  };

  const handleDeleteMember = async (targetUid: string) => {
    if (!currentUser?.isAdmin) return;
    try {
      await api.deleteMember(targetUid);
      setMembers((prev) => prev.filter((m) => m.uid !== targetUid));
      if (myMemberProfile?.uid === targetUid) {
        setMyMemberProfile(null);
      }
      if (pinnedIds.members.includes(targetUid)) {
        setPinnedIds((prev) => ({
          ...prev,
          members: prev.members.filter((id) => id !== targetUid),
        }));
      }
    } catch (err) {
      surfaceError(err, 'Không thể xóa thành viên trên máy chủ.');
      throw err;
    }
  };

  const handleSendMemberWelcomeEmail = async (
    profile: MemberProfileRecord
  ): Promise<EmailNotificationRecord> => {
    const draftEmail = buildMemberWelcomeEmail(
      profile,
      adminConfig.senderTitle,
      adminConfig.customFooterNote
    );
    try {
      const deliveredEmail = await dispatchEmailToServer(draftEmail);
      setEmails((prev) => [deliveredEmail, ...prev]);
      return deliveredEmail;
    } catch (err) {
      surfaceError(err, 'Không thể gửi thư chào mừng.');
      throw err;
    }
  };

  const handleSendMemberConfirmationEmail = async (
    profile: MemberProfileRecord
  ): Promise<EmailNotificationRecord> => {
    const draftEmail = buildMemberConfirmationEmail(
      profile,
      adminConfig.senderTitle,
      adminConfig.customFooterNote
    );
    try {
      const deliveredEmail = await dispatchEmailToServer(draftEmail);
      setEmails((prev) => [deliveredEmail, ...prev]);
      return deliveredEmail;
    } catch (err) {
      surfaceError(err, 'Không thể gửi thư xác nhận.');
      throw err;
    }
  };

  const handleUpdateAdminConfig = (
    updated: Partial<AdminNotificationConfig>
  ) => {
    setAdminConfig((prev) => ({ ...prev, ...updated }));
  };

  const handleResendMemberConfirmationEmail = async (
    profile: MemberProfileRecord
  ): Promise<EmailNotificationRecord> => {
    return handleSendMemberConfirmationEmail(profile);
  };

  const handleSendBoardNotification = async (params: {
    targetMemberUid: string | 'ALL';
    subject: string;
    message: string;
  }): Promise<EmailNotificationRecord[]> => {
    const targets =
      params.targetMemberUid === 'ALL'
        ? members
        : members.filter((m) => m.uid === params.targetMemberUid);

    const validTargets = targets.filter(
      (m) => m.email && m.email.includes('@')
    );
    if (validTargets.length === 0) {
      const msg =
        'Không tìm thấy địa chỉ email hợp lệ cho thành viên được chọn.';
      setActionError(msg);
      throw new Error(msg);
    }

    const senderDisplay =
      currentUser?.displayName || 'Ban Điều hành Mạng lưới ALUMNI KTD';

    const recordsToDispatch: EmailNotificationRecord[] = validTargets.map(
      (member, idx) => ({
        id: `board-mail-${Date.now()}-${idx}`,
        to: member.email,
        recipientName: member.fullName,
        senderName: senderDisplay,
        subject: params.subject,
        category: 'BOARD_NOTIFICATION',
        sentAt: new Date().toISOString(),
        memberSnapshot: member,
        bodyLines: [
          `Kính gửi thành viên: ${member.fullName} (${member.className} · ${member.faculty})`,
          `Người gửi: ${senderDisplay} — Mạng lưới ALUMNI KTD`,
          `--------------------------------------------------`,
          ...params.message.split('\n').filter((line) => line.trim().length > 0),
        ],
      })
    );

    try {
      const deliveredRecords = await Promise.all(
        recordsToDispatch.map((rec) => dispatchEmailToServer(rec))
      );
      setEmails((prev) => [...deliveredRecords, ...prev]);
      return deliveredRecords;
    } catch (err) {
      surfaceError(err, 'Gửi thông báo Ban Điều hành thất bại.');
      throw err;
    }
  };

  const handleAddExecutive = async (execInput: Omit<ExecutiveRecord, 'id'>) => {
    if (!currentUser?.isAdmin) return;
    try {
      const created = await api.addExecutive(execInput);
      setExecutives((prev) => [created, ...prev]);
    } catch (err) {
      surfaceError(err, 'Không thể thêm thành viên Ban Điều hành.');
      throw err;
    }
  };

  const handleUpdateExecutive = async (updatedExec: ExecutiveRecord) => {
    if (!currentUser?.isAdmin) return;
    try {
      const saved = await api.updateExecutive(updatedExec);
      setExecutives((prev) =>
        prev.map((e) => (e.id === saved.id ? saved : e))
      );
    } catch (err) {
      surfaceError(err, 'Không thể cập nhật thông tin Ban Điều hành.');
      throw err;
    }
  };

  const handleDeleteExecutive = async (id: string) => {
    if (!currentUser?.isAdmin) return;
    try {
      await api.deleteExecutive(id);
      setExecutives((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      surfaceError(err, 'Không thể xóa thành viên Ban Điều hành.');
      throw err;
    }
  };

  const handleRegisterBusiness = async (input: BusinessFormInput) => {
    if (!currentUser) {
      handleOpenAuthModal('login');
      throw new Error('Vui lòng đăng nhập để đăng ký doanh nghiệp.');
    }
    if (!currentMemberProfile || !isConfirmedNetworkMember(currentMemberProfile)) {
      throw new Error(
        'Chỉ Thành viên Mạng lưới đã hoàn thiện hồ sơ và ảnh đại diện mới được đăng ký Doanh nghiệp.'
      );
    }

    let createdBiz: BusinessRecord;
    try {
      createdBiz = await api.registerBusiness({
        ...input,
        companyName: input.companyName.trim(),
        address: input.address.trim(),
        website: normalizeWebsiteInput(input.website),
        contactEmail: input.contactEmail.trim(),
        contactPhone: input.contactPhone.trim(),
        description: input.description.trim(),
        logoUrl: input.logoUrl ? input.logoUrl.trim() : undefined,
        logoAspectRatio: input.logoAspectRatio || '1:1',
      });
    } catch (err) {
      surfaceError(err, 'Không thể đăng ký doanh nghiệp.');
      throw err;
    }

    setBusinesses((prev) => [createdBiz, ...prev]);

    const draftEmail = buildBusinessConfirmationEmail(
      createdBiz,
      currentUser.email
    );
    try {
      const deliveredEmail = await dispatchEmailToServer(draftEmail);
      setEmails((prev) => [deliveredEmail, ...prev]);
    } catch (mailErr) {
      console.warn('Business confirm email warning:', mailErr);
    }
  };

  const handleUpdateBusiness = async (
    bizId: string,
    input: BusinessFormInput
  ) => {
    if (!currentUser) return;
    try {
      const updated = await api.updateBusiness(bizId, {
        ...input,
        companyName: input.companyName.trim(),
        address: input.address.trim(),
        website: normalizeWebsiteInput(input.website),
        contactEmail: input.contactEmail.trim(),
        contactPhone: input.contactPhone.trim(),
        description: input.description.trim(),
        logoUrl: input.logoUrl ? input.logoUrl.trim() : undefined,
      });
      setBusinesses((prev) =>
        prev.map((b) => (b.id === bizId ? updated : b))
      );
    } catch (err) {
      surfaceError(err, 'Không thể cập nhật thông tin doanh nghiệp.');
      throw err;
    }
  };

  const handleDeleteBusiness = async (bizId: string) => {
    if (!currentUser) return;
    try {
      await api.deleteBusiness(bizId);
      setBusinesses((prev) => prev.filter((b) => b.id !== bizId));
      if (pinnedIds.businesses.includes(bizId)) {
        setPinnedIds((prev) => ({
          ...prev,
          businesses: prev.businesses.filter((id) => id !== bizId),
        }));
      }
    } catch (err) {
      surfaceError(err, 'Không thể xóa doanh nghiệp.');
      throw err;
    }
  };

  const handleCreateEvent = async (input: EventFormInput) => {
    if (!currentUser?.isAdmin) return;
    try {
      const created = await api.createEvent(input);
      setEvents((prev) => [sanitizeEventRecord(created), ...prev]);
    } catch (err) {
      surfaceError(err, 'Không thể tạo sự kiện mới.');
      throw err;
    }
  };

  const handleUpdateEvent = async (eventId: string, input: EventFormInput) => {
    if (!currentUser?.isAdmin) return;
    try {
      const updated = await api.updateEvent(eventId, input);
      setEvents((prev) =>
        prev.map((ev) => (ev.id === eventId ? sanitizeEventRecord(updated) : ev))
      );
      // Refresh registrations in case fees were updated
      const [regsRes, myRegsRes] = await Promise.allSettled([
        api.getEventRegistrations(eventId),
        api.getMyRegistrations(),
      ]);
      if (regsRes.status === 'fulfilled') {
        setAllEventRegistrations((prev) => ({
          ...prev,
          [eventId]: regsRes.value,
        }));
      }
      if (myRegsRes.status === 'fulfilled') {
        setUserRegistrations(myRegsRes.value);
      }
    } catch (err) {
      surfaceError(err, 'Không thể cập nhật sự kiện.');
      throw err;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!currentUser?.isAdmin) return;
    try {
      await api.deleteEvent(eventId);
      setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
      setAllEventRegistrations((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
      setUserRegistrations((prev) => {
        if (!prev[eventId]) return prev;
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
    } catch (err) {
      surfaceError(err, 'Không thể xóa sự kiện.');
      throw err;
    }
  };

  const handleUpdateEventCustomFields = async (
    eventId: string,
    fields: EventCustomField[]
  ) => {
    if (!currentUser?.isAdmin) return;
    try {
      const updated = await api.updateEventCustomFields(eventId, fields);
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === eventId
            ? sanitizeEventRecord({ ...ev, ...updated, customFields: fields })
            : ev
        )
      );
    } catch (err) {
      surfaceError(err, 'Không thể lưu biểu mẫu đăng ký sự kiện.');
      throw err;
    }
  };

  const handleRegisterForEvent = async (
    event: EventRecord,
    note: string,
    customAnswers?: Record<string, any>,
    regDetails?: {
      attendGala?: boolean;
      shirtOrders?: EventShirtOrder[];
      totalFee?: number;
      payerPhone?: string;
      payerName?: string;
    }
  ) => {
    if (!currentUser) {
      handleOpenAuthModal('login');
      throw new Error('Vui lòng đăng nhập để đăng ký tham gia sự kiện.');
    }

    const userFullName = (
      regDetails?.payerName ||
      currentMemberProfile?.fullName ||
      currentUser.displayName ||
      'Cựu sinh viên KTD'
    ).trim();
    const userPhone = (
      regDetails?.payerPhone ||
      currentMemberProfile?.zaloPhone ||
      sessionPhoneDraft ||
      ''
    ).trim();
    const userFaculty = (
      currentMemberProfile?.faculty || 'Khoa Kiến trúc'
    ).trim();
    const userGraduationYear = (
      currentMemberProfile?.graduationYear || ''
    ).trim();
    const userClassName = (
      currentMemberProfile?.className ||
      customAnswers?.className ||
      ''
    ).trim();
    const userWorkplace = (
      currentMemberProfile?.workplace ||
      customAnswers?.workplace ||
      ''
    ).trim();
    const userProvince = (
      currentMemberProfile?.currentProvince ||
      customAnswers?.province ||
      'Thành phố Đà Nẵng'
    ).trim();

    if (userPhone) {
      setSessionPhoneDraft(userPhone);
    }

    const enrichedCustomAnswers: Record<string, any> = {
      ...(customAnswers || {}),
      ...(userPhone ? { payerPhone: userPhone, phone: userPhone } : {}),
      ...(userClassName ? { className: userClassName } : {}),
      ...(userWorkplace ? { workplace: userWorkplace } : {}),
      ...(userProvince ? { province: userProvince } : {}),
    };

    const wasAlreadyRegistered = Boolean(userRegistrations[event.id]);

    let savedReg: EventRegistrationRecord;
    try {
      savedReg = await api.registerForEvent(event.id, {
        note: note.slice(0, 300),
        customAnswers:
          Object.keys(enrichedCustomAnswers).length > 0
            ? enrichedCustomAnswers
            : undefined,
        attendGala: regDetails?.attendGala,
        shirtOrders: regDetails?.shirtOrders,
        payerPhone: userPhone || undefined,
        payerName: userFullName,
      });
    } catch (err) {
      surfaceError(err, 'Không thể hoàn tất đăng ký sự kiện.');
      throw err;
    }

    if (userPhone) {
      void handleSaveUserPhone(userPhone, userFullName);
    }

    setUserRegistrations((prev) => ({
      ...prev,
      [event.id]: savedReg,
    }));

    setAllEventRegistrations((prev) => {
      const currentList = prev[event.id] || [];
      const rest = currentList.filter((r) => r.uid !== savedReg.uid);
      return {
        ...prev,
        [event.id]: [savedReg, ...rest],
      };
    });

    if (!wasAlreadyRegistered) {
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === event.id
            ? { ...ev, registeredCount: ev.registeredCount + 1 }
            : ev
        )
      );
    }

    const effectiveProfile: MemberProfileRecord = currentMemberProfile
      ? {
          ...currentMemberProfile,
          fullName: userFullName,
          zaloPhone: userPhone || currentMemberProfile.zaloPhone || '',
        }
      : {
          uid: currentUser.uid,
          email: currentUser.email,
          fullName: userFullName,
          birthDate: '—',
          className: userClassName,
          enrollmentYear: '',
          graduationYear: userGraduationYear,
          faculty: userFaculty,
          major: 'Ngành Kiến trúc công trình',
          currentProvince: userProvince,
          workplace: userWorkplace,
          workplaceProvince: userProvince,
          zaloPhone: userPhone,
          updatedAt: new Date().toISOString(),
        };

    const generatedEmails = buildEventRegistrationEmails(
      event,
      effectiveProfile,
      note,
      enrichedCustomAnswers,
      {
        attendGala: savedReg.attendGala ?? regDetails?.attendGala,
        shirtOrders: savedReg.shirtOrders ?? regDetails?.shirtOrders,
        totalFee: savedReg.totalFee ?? regDetails?.totalFee,
      }
    );

    try {
      const deliveredEmails = await Promise.all(
        generatedEmails.map((em) => dispatchEmailToServer(em))
      );
      setEmails((prev) => [...deliveredEmails, ...prev]);
    } catch (mailErr) {
      console.warn('Event confirmation email warning:', mailErr);
    }
  };

  const handleAdminUpdateRegistration = async (
    eventId: string,
    targetUid: string,
    updates: {
      attendGala?: boolean;
      shirtOrders?: EventShirtOrder[];
      totalFee?: number;
      paymentStatus?: 'pending' | 'completed';
      btcConfirmed?: boolean;
      note?: string;
    }
  ) => {
    const activeUser = currentUserRef.current;
    if (!activeUser?.isAdmin) {
      const msg = 'Bạn cần quyền Quản trị viên để thực hiện thao tác này.';
      setActionError(msg);
      throw new Error(msg);
    }

    try {
      const updatedReg = await api.adminUpdateRegistration(
        eventId,
        targetUid,
        updates
      );

      if (
        userRegistrations[eventId]?.uid === targetUid ||
        activeUser.uid === targetUid
      ) {
        setUserRegistrations((prev) => ({
          ...prev,
          [eventId]: updatedReg,
        }));
      }

      setAllEventRegistrations((prev) => {
        const list = prev[eventId] || [];
        const exists = list.some((r) => r.uid === targetUid);
        const nextList = exists
          ? list.map((r) => (r.uid === targetUid ? updatedReg : r))
          : [updatedReg, ...list];
        return {
          ...prev,
          [eventId]: nextList,
        };
      });
    } catch (err) {
      surfaceError(err, 'Không thể cập nhật thông tin đăng ký đại biểu.');
      throw err;
    }
  };

  const handleAdminResetEventRegistrations = async (
    eventId: string
  ): Promise<boolean> => {
    if (!currentUser?.isAdmin) return false;
    try {
      await api.adminResetEventRegistrations(eventId);
      setAllEventRegistrations((prev) => ({ ...prev, [eventId]: [] }));
      setUserRegistrations((prev) => {
        if (!prev[eventId]) return prev;
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === eventId ? { ...ev, registeredCount: 0 } : ev
        )
      );
      return true;
    } catch (err) {
      surfaceError(err, 'Không thể reset danh sách đăng ký sự kiện.');
      return false;
    }
  };

  const handleAdminDeleteSingleRegistration = async (
    eventId: string,
    targetUid: string
  ): Promise<boolean> => {
    if (!currentUser?.isAdmin) return false;
    try {
      await api.adminDeleteRegistration(eventId, targetUid);
      setAllEventRegistrations((prev) => {
        const currentList = prev[eventId] || [];
        return {
          ...prev,
          [eventId]: currentList.filter((r) => r.uid !== targetUid),
        };
      });
      if (currentUser.uid === targetUid) {
        setUserRegistrations((prev) => {
          if (!prev[eventId]) return prev;
          const next = { ...prev };
          delete next[eventId];
          return next;
        });
      }
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === eventId
            ? { ...ev, registeredCount: Math.max(0, (ev.registeredCount || 1) - 1) }
            : ev
        )
      );
      return true;
    } catch (err) {
      surfaceError(err, 'Không thể xóa lượt đăng ký của đại biểu.');
      throw err;
    }
  };

  const navItems: {
    id: ActiveTab;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'network', label: 'ALUMNI', shortLabel: 'ALUMNI', icon: Users },
    { id: 'executive', label: 'Ban ĐH', shortLabel: 'Ban ĐH', icon: Award },
    {
      id: 'business',
      label: 'Cộng đồng doanh nghiệp',
      shortLabel: 'Doanh nghiệp',
      icon: Building2,
    },
    { id: 'events', label: 'Sự kiện', shortLabel: 'Sự kiện', icon: Calendar },
    { id: 'admin', label: 'Quản trị', shortLabel: 'Quản trị', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] pb-20 md:pb-0 overflow-x-hidden">
      {/* Iconic DAU Crimson Top Rule */}
      <div className="h-1.5 w-full bg-[#9E1B20]" aria-hidden="true" />

      {/* Server Error Toast Banner */}
      {actionError && (
        <div
          role="alert"
          className="fixed bottom-20 md:bottom-5 right-3 sm:right-5 z-50 max-w-md bg-rose-950 text-white border border-rose-700 rounded-xl shadow-2xl px-4 py-3 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm leading-relaxed flex-1">
            {actionError}
          </p>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="p-1 text-rose-300 hover:text-white rounded-lg cursor-pointer shrink-0"
            aria-label="Đóng thông báo lỗi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* In-App Browser Helper Banner for Zalo / Facebook Mobile Users */}
      {checkIsInAppBrowser() && !currentUser && (
        <aside
          aria-label="Thông báo đăng nhập trên Zalo/Facebook"
          className="bg-amber-500 text-white px-3.5 sm:px-6 py-2 text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs z-50 sticky top-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Compass className="w-4 h-4 shrink-0 text-amber-100" />
            <span className="truncate">
              Đang mở trong Zalo/FB: Bạn có thể đăng nhập trực tiếp bằng{' '}
              <strong>Email &amp; Mật khẩu</strong> ngay tại đây.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsInAppBrowserModalOpen(true)}
            className="underline shrink-0 font-bold hover:text-amber-100 cursor-pointer text-[11px] whitespace-nowrap"
          >
            Xem hướng dẫn
          </button>
        </aside>
      )}

      {/* Swiss Architectural Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 lg:gap-4 xl:gap-6 px-3 sm:px-6 lg:px-8 h-14 sm:h-16">
          {/* Zone 1: Brand Mark & Wordmark */}
          <a
            href="#network"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('network');
            }}
            className="flex items-center gap-2 sm:gap-2.5 whitespace-nowrap shrink-0 group cursor-pointer min-w-0"
          >
            <DauLogoMark className="w-8 h-8 sm:w-9 sm:h-9 group-hover:scale-105 transition-transform shrink-0" />
            <div className="flex flex-col justify-center text-left leading-tight min-w-0">
              <span className="text-xs sm:text-base font-extrabold tracking-tight text-[#0F172A] leading-tight">
                ALUMNI KTD
              </span>
              <span className="text-[8.5px] sm:text-[10px] xl:text-[11px] font-bold text-[#9E1B20] tracking-wider uppercase leading-tight truncate">
                ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG
              </span>
            </div>
          </a>

          {/* Zone 2: Clean Single-Line Text Navigation Links */}
          <nav
            aria-label="Điều hướng chính ALUMNI KTD"
            className="hidden lg:flex items-center justify-center gap-3 xl:gap-6 h-full text-xs xl:text-sm min-w-0 flex-1"
          >
            {navItems.map((item, index) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`h-full inline-flex items-center gap-1 xl:gap-1.5 whitespace-nowrap shrink-0 cursor-pointer border-b-2 transition-colors px-0.5 ${
                    isActive
                      ? 'border-[#9E1B20] text-[#9E1B20] font-semibold'
                      : 'border-transparent text-slate-600 hover:text-[#0F172A] hover:border-slate-300 font-medium'
                  }`}
                >
                  <span className="text-[11px] xl:text-xs font-semibold text-[#9E1B20]/80 tabular-nums">
                    0{index + 1}.
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: User Status & Primary Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto lg:ml-0">
            {currentUser ? (
              <div className="flex items-center gap-2 sm:gap-3 relative">
                {/* User Account Trigger & Dropdown Menu */}
                <div id="user-account-menu-container" className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer border border-slate-200/80 hover:border-slate-300 bg-white shadow-xs group min-h-[40px]"
                    aria-expanded={isUserMenuOpen}
                    aria-haspopup="true"
                    title="Thông tin tài khoản & Menu tiện ích"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#9E1B20] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                      {currentUser.displayName
                        ? currentUser.displayName.slice(0, 2)
                        : 'TV'}
                    </div>
                    <div className="flex flex-col items-start text-xs leading-tight text-left">
                      <span className="font-bold text-[#0F172A] truncate max-w-[92px] sm:max-w-[130px] xl:max-w-[150px] group-hover:text-[#9E1B20] transition-colors">
                        {currentUser.displayName}
                      </span>
                      <span
                        className={`text-[10px] sm:text-[11px] font-semibold ${
                          currentUser.isAdmin
                            ? 'text-[#9E1B20]'
                            : 'text-slate-500'
                        }`}
                      >
                        {currentUser.isAdmin ? 'Ban Điều hành' : 'Cựu sinh viên'}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-slate-600 transition-transform ${
                        isUserMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isUserMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] max-w-88 sm:w-88 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                      role="menu"
                    >
                      {/* User Summary Header */}
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-full bg-[#9E1B20] text-white flex items-center justify-center font-bold text-sm uppercase shadow-xs shrink-0">
                            {currentUser.displayName
                              ? currentUser.displayName.slice(0, 2)
                              : 'TV'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-[#0F172A] truncate">
                              {currentMemberProfile?.fullName ||
                                currentUser.displayName}
                            </p>
                            <p className="text-xs text-[#9E1B20] font-semibold truncate">
                              {currentUser.email}
                            </p>
                            {isConfirmedNetworkMember(currentMemberProfile) ? (
                              <span className="inline-block mt-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                ✓ Thành viên Mạng lưới đã xác nhận
                              </span>
                            ) : (
                              <span className="inline-block mt-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                Đã đăng nhập tài khoản · Chưa xác nhận Thành viên
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-2 space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setIsFirstTimeLoginModal(false);
                            setIsProfileModalOpen(true);
                          }}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-50 text-left cursor-pointer transition-colors group"
                          role="menuitem"
                        >
                          <div className="w-9 h-9 rounded-xl bg-red-50 text-[#9E1B20] flex items-center justify-center shrink-0 group-hover:bg-[#9E1B20] group-hover:text-white transition-colors">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[#0F172A] group-hover:text-[#9E1B20] transition-colors">
                              Hồ sơ cá nhân
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              Cập nhật thông tin thành viên, khoa, khóa &amp; đơn vị công tác
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setActiveTab('business');
                            setTimeout(() => {
                              const el = document.getElementById(
                                'business-community-section'
                              );
                              el?.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          }}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-50 text-left cursor-pointer transition-colors group"
                          role="menuitem"
                        >
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[#0F172A] group-hover:text-blue-600 transition-colors">
                              Hồ sơ doanh nghiệp
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              Đăng ký doanh nghiệp cựu SV &amp; kết nối giao thương B2B
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setIsMyTicketsOpen(true);
                          }}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-50 text-left cursor-pointer transition-colors group"
                          role="menuitem"
                        >
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <Ticket className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold text-[#0F172A] group-hover:text-emerald-700 transition-colors">
                                Đơn đăng ký &amp; Mã QR Sự kiện
                              </p>
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                {Object.keys(userRegistrations).length} đơn
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 truncate">
                              Xem chi tiết Đơn đăng ký &amp; Mã QR Thanh toán cá nhân
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setIsEmailOutboxOpen(true);
                          }}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-50 text-left cursor-pointer transition-colors group"
                          role="menuitem"
                        >
                          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold text-[#0F172A] group-hover:text-amber-700 transition-colors">
                                Hộp thư
                              </p>
                              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                {emails.length} thư
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 truncate">
                              Lưu trữ thư chào mừng, xác nhận &amp; nhắc lịch từ BTC
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setUserGuideState({ isOpen: true, section: 'ios' });
                          }}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-50 text-left cursor-pointer transition-colors group"
                          role="menuitem"
                        >
                          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-[#9E1B20] group-hover:text-white transition-colors">
                            <Smartphone className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[#0F172A] group-hover:text-[#9E1B20] transition-colors">
                              Hướng dẫn &amp; Lưu ý iOS (iPhone)
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              Cẩm nang cho người mới &amp; mẹo dùng trên iPhone/iPad
                            </p>
                          </div>
                        </button>
                      </div>

                      <div className="pt-1.5 mt-1 border-t border-slate-100 px-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            void handleLogout();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 text-left cursor-pointer transition-colors font-semibold text-sm"
                          role="menuitem"
                        >
                          <LogOut className="w-4 h-4 shrink-0" />
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenAuthModal('login')}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-[#9E1B20] rounded-lg hover:bg-[#7D1418] active:bg-[#5E0D10] transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs min-h-[38px]"
                >
                  Đăng nhập / Đăng ký
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dedicated Tablet Navigation Row (768px - 1023px) */}
        <nav
          aria-label="Điều hướng máy tính bảng ALUMNI KTD"
          className="hidden md:block lg:hidden border-t border-slate-200/80 bg-slate-50/80"
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-2 h-11 overflow-x-auto">
            {navItems.map((item, index) => {
              const isActive = activeTab === item.id;
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`h-full inline-flex items-center justify-center gap-1.5 px-2.5 whitespace-nowrap shrink-0 cursor-pointer border-b-2 text-xs transition-colors ${
                    isActive
                      ? 'border-[#9E1B20] text-[#9E1B20] font-bold bg-red-50/50'
                      : 'border-transparent text-slate-600 hover:text-[#0F172A] hover:border-slate-300 font-medium'
                  }`}
                >
                  <IconComponent
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-[#9E1B20]' : 'text-slate-400'
                    }`}
                  />
                  <span className="text-[11px] font-semibold text-[#9E1B20]/80 tabular-nums">
                    0{index + 1}.
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Sub-menu HELP Bar */}
        <div className="border-t border-slate-200/70 bg-slate-50/90">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 whitespace-nowrap">
              <span className="font-semibold text-slate-700">
                Cổng thông tin Cựu sinh viên KTD
              </span>
              <span aria-hidden="true" className="hidden sm:inline text-slate-300">
                ·
              </span>
              <span className="hidden sm:inline">
                Đăng nhập tài khoản để đăng ký sự kiện nhanh chóng
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
              <button
                type="button"
                onClick={() =>
                  setUserGuideState({ isOpen: true, section: 'newbie' })
                }
                className="px-2.5 py-1 text-[11px] sm:text-xs font-bold text-slate-700 hover:text-[#9E1B20] bg-white hover:bg-red-50 border border-slate-200/90 hover:border-red-200 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs whitespace-nowrap"
                title="Hướng dẫn sử dụng cho người mới"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#9E1B20] shrink-0" />
                <span>HELP · Hướng dẫn sử dụng</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setUserGuideState({ isOpen: true, section: 'ios' })
                }
                className="px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-slate-600 hover:text-[#9E1B20] bg-white hover:bg-red-50 border border-slate-200/90 hover:border-red-200 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs whitespace-nowrap"
                title="Lưu ý đăng nhập trên iPhone / iPad (iOS) và Zalo"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#9E1B20] shrink-0" />
                <span>Lưu ý iOS / Zalo</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-3.5 sm:py-8">
        {activeTab === 'network' && (
          <NetworkSection
            currentUser={currentUser}
            currentMemberProfile={currentMemberProfile}
            members={members}
            emails={emails}
            onGoogleLogin={async () => handleOpenAuthModal('login')}
            onLogout={handleLogout}
            onSaveMemberProfile={handleSaveMemberProfile}
            onSaveUserPhone={handleSaveUserPhone}
            savedUserPhone={savedUserPhone}
            onResendMemberEmail={handleResendMemberConfirmationEmail}
            onOpenEmailOutbox={() => setIsEmailOutboxOpen(true)}
            latestMemberEmail={
              emails.find(
                (e) =>
                  e.category === 'MEMBER_WELCOME' ||
                  e.category === 'MEMBER_CONFIRM'
              ) || null
            }
            authError={authError}
            isLoggingIn={isLoggingIn}
            isProfileEditing={isProfileEditing}
            onToggleProfileEditing={setIsProfileEditing}
            onOpenProfileModal={() => {
              setIsFirstTimeLoginModal(false);
              setIsProfileModalOpen(true);
            }}
            pinnedMemberIds={pinnedIds.members}
            onTogglePinMember={(uid) => handleTogglePin('member', uid)}
            onDeleteMember={handleDeleteMember}
            onOpenUserGuide={(section) =>
              setUserGuideState({ isOpen: true, section: section || 'newbie' })
            }
            pinnedSpotlightNode={
              <HomePinnedSpotlight
                pinnedIds={pinnedIds}
                events={events}
                businesses={businesses}
                executives={executives}
                members={members}
                currentUserUid={currentUser?.uid || null}
                userRegistrations={userRegistrations}
                allEventRegistrations={allEventRegistrations}
                isAdmin={Boolean(currentUser?.isAdmin)}
                onTogglePin={handleTogglePin}
                onNavigateToEvent={(eventId, openRegister) => {
                  if (openRegister) {
                    setInitialOpenRegisterEventId(eventId);
                  }
                  setActiveTab('events');
                  setTimeout(() => {
                    const el = document.getElementById(`event-card-${eventId}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 150);
                }}
                onNavigateToBusiness={() => {
                  setActiveTab('business');
                  setTimeout(() => {
                    const el = document.getElementById(
                      'business-community-section'
                    );
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }, 120);
                }}
                onNavigateToExecutive={() => {
                  setActiveTab('executive');
                }}
                onNavigateToDirectory={() => {
                  const el = document.getElementById(
                    'alumni-directory-table-section'
                  );
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            }
          />
        )}

        {activeTab === 'executive' && (
          <ExecutiveBoardSection
            executives={executives}
            members={members}
            isAdmin={Boolean(currentUser?.isAdmin)}
            onAddExecutive={handleAddExecutive}
            onUpdateExecutive={handleUpdateExecutive}
            onDeleteExecutive={handleDeleteExecutive}
            pinnedExecutiveIds={pinnedIds.executives}
            onTogglePinExecutive={(execId) =>
              handleTogglePin('executive', execId)
            }
          />
        )}

        {activeTab === 'business' && (
          <BusinessCommunitySection
            currentUser={currentUser}
            isAdmin={Boolean(currentUser?.isAdmin)}
            currentMemberProfile={currentMemberProfile}
            businesses={businesses}
            onRegisterBusiness={handleRegisterBusiness}
            onUpdateBusiness={handleUpdateBusiness}
            onDeleteBusiness={handleDeleteBusiness}
            onNavigateToNetwork={() => setActiveTab('network')}
            onGoogleLogin={() => handleOpenAuthModal('login')}
            onOpenProfileModal={() => {
              setIsFirstTimeLoginModal(false);
              setIsProfileModalOpen(true);
            }}
            onOpenEmailOutbox={() => setIsEmailOutboxOpen(true)}
            pinnedBusinessIds={pinnedIds.businesses}
            onTogglePinBusiness={(bizId) => handleTogglePin('business', bizId)}
          />
        )}

        {activeTab === 'events' && (
          <EventsTimelineSection
            currentUser={currentUser}
            currentMemberProfile={currentMemberProfile}
            events={events}
            members={members}
            userRegistrations={userRegistrations}
            allEventRegistrations={allEventRegistrations}
            onCreateEvent={handleCreateEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            onRegisterForEvent={handleRegisterForEvent}
            onAdminUpdateRegistration={handleAdminUpdateRegistration}
            onAdminLogin={handleAdminLogin}
            onResetEventRegistrations={handleAdminResetEventRegistrations}
            onDeleteSingleRegistration={handleAdminDeleteSingleRegistration}
            onSaveUserPhone={handleSaveUserPhone}
            savedUserPhone={savedUserPhone}
            onUpdateEventCustomFields={handleUpdateEventCustomFields}
            onNavigateToNetwork={() => setActiveTab('network')}
            onGoogleLogin={() => handleOpenAuthModal('login')}
            onOpenProfileModal={() => {
              setIsFirstTimeLoginModal(false);
              setIsProfileModalOpen(true);
            }}
            onOpenEmailOutbox={() => setIsEmailOutboxOpen(true)}
            onOpenMyTickets={() => setIsMyTicketsOpen(true)}
            pinnedEventIds={pinnedIds.events}
            onTogglePinEvent={(evtId) => handleTogglePin('event', evtId)}
            initialOpenRegisterEventId={initialOpenRegisterEventId}
            onClearInitialOpenRegisterEvent={() =>
              setInitialOpenRegisterEventId(null)
            }
          />
        )}

        {activeTab === 'admin' && (
          <AdminPortalSection
            currentUser={currentUser}
            members={members}
            emails={emails}
            adminConfig={adminConfig}
            executives={executives}
            events={events}
            allEventRegistrations={allEventRegistrations}
            userRegistrations={userRegistrations}
            onAdminUpdateRegistration={handleAdminUpdateRegistration}
            onResetEventRegistrations={handleAdminResetEventRegistrations}
            onDeleteSingleRegistration={handleAdminDeleteSingleRegistration}
            onNavigateToEvents={() => setActiveTab('events')}
            onUpdateAdminConfig={handleUpdateAdminConfig}
            onAdminLogin={handleAdminLogin}
            onLogout={handleLogout}
            onSendBoardNotification={handleSendBoardNotification}
            onSendWelcomeEmail={handleSendMemberWelcomeEmail}
            onSendConfirmationEmail={handleSendMemberConfirmationEmail}
            onOpenEmailOutbox={() => setIsEmailOutboxOpen(true)}
            onAddExecutive={handleAddExecutive}
            onUpdateExecutive={handleUpdateExecutive}
            onDeleteExecutive={handleDeleteExecutive}
            onDeleteMember={handleDeleteMember}
          />
        )}
      </main>

      {/* Architectural Editorial Footer */}
      <footer className="bg-white border-t border-slate-200 mt-10 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-slate-600 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <DauLogoMark className="w-6 h-6 shrink-0" />
            <p>
              © 2026 Mạng lưới Cựu sinh viên Trường Đại học Kiến trúc Đà Nẵng
              (DAU · ALUMNI KTD) · 566 Núi Thành, TP. Đà Nẵng.
            </p>
          </div>
          <div className="hidden sm:flex flex-wrap items-center justify-center gap-4 sm:gap-5 font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('network')}
              className="hover:text-[#9E1B20] cursor-pointer transition-colors"
            >
              01. ALUMNI
            </button>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('executive')}
              className="hover:text-[#9E1B20] cursor-pointer transition-colors"
            >
              02. Ban ĐH
            </button>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('business')}
              className="hover:text-[#9E1B20] cursor-pointer transition-colors"
            >
              03. Cộng đồng doanh nghiệp
            </button>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('events')}
              className="hover:text-[#9E1B20] cursor-pointer transition-colors"
            >
              04. Sự kiện
            </button>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className="hover:text-[#9E1B20] cursor-pointer transition-colors"
            >
              05. Quản trị
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Điều hướng di động ALUMNI KTD"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_-4px_rgba(15,23,42,0.08)]"
      >
        <div className="grid grid-cols-5 h-16 px-0.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`relative flex flex-col items-center justify-center gap-1 py-1.5 px-0.5 cursor-pointer transition-colors ${
                  isActive
                    ? 'text-[#9E1B20] font-bold'
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                {isActive && (
                  <span
                    className="absolute top-0 left-2.5 right-2.5 h-0.5 bg-[#9E1B20] rounded-b-full"
                    aria-hidden="true"
                  />
                )}
                <IconComponent
                  className={`w-5 h-5 ${
                    isActive ? 'text-[#9E1B20] scale-105' : 'text-slate-500'
                  } transition-transform`}
                />
                <span className="text-[10px] sm:text-[11px] tracking-tight leading-none whitespace-nowrap">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Email & Password + Optional Google Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        googleOAuthEnabled={googleOAuthEnabled}
        googleClientId={googleClientId}
        googleRedirectEnabled={googleRedirectEnabled}
        initialTab={authModalTab}
        initialError={authModalError}
      />

      {/* Automated Email Confirmation & Reminder Outbox Modal */}
      <EmailOutboxModal
        isOpen={isEmailOutboxOpen}
        emails={emails}
        onClose={() => setIsEmailOutboxOpen(false)}
      />

      {/* Member Personal Event Registrations & Payment QR Modal */}
      <MyTicketsModal
        isOpen={isMyTicketsOpen}
        onClose={() => setIsMyTicketsOpen(false)}
        currentUser={currentUser}
        currentMemberProfile={currentMemberProfile}
        savedUserPhone={savedUserPhone}
        events={events}
        userRegistrations={userRegistrations}
        onExploreEvents={() => setActiveTab('events')}
        onNavigateToEventDetail={(eventId) => {
          setIsMyTicketsOpen(false);
          setInitialOpenRegisterEventId(eventId);
          setActiveTab('events');
          setTimeout(() => {
            const el = document.getElementById(`event-card-${eventId}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 150);
        }}
      />

      {/* Member Profile Update & Onboarding Modal */}
      <MemberProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        currentMemberProfile={currentMemberProfile}
        savedUserPhone={savedUserPhone}
        isFirstLogin={isFirstTimeLoginModal}
        onSaveMemberProfile={handleSaveMemberProfile}
        onSaveUserPhone={handleSaveUserPhone}
        onNavigateToTab={setActiveTab}
      />

      {/* In-App Browser Guidance Modal */}
      <InAppBrowserModal
        isOpen={isInAppBrowserModalOpen}
        onClose={() => setIsInAppBrowserModalOpen(false)}
        onContinueAnyway={() => {
          setIsInAppBrowserModalOpen(false);
          handleOpenAuthModal('login');
        }}
      />

      {/* User Guide & iOS Device Instructions Modal */}
      <UserGuideModal
        isOpen={userGuideState.isOpen}
        initialSection={userGuideState.section}
        onClose={() =>
          setUserGuideState((prev) => ({ ...prev, isOpen: false }))
        }
        onNavigateToTab={(tab) => setActiveTab(tab)}
        onTriggerGoogleLogin={() => handleOpenAuthModal('login')}
      />
    </div>
  );
}
