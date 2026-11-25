import React, { useState, useMemo } from 'react';
import {
  Pin,
  PinOff,
  Calendar,
  Building2,
  Shield,
  Users,
  ArrowRight,
  MapPin,
  Clock,
  Phone,
  Mail,
  MessageCircle,
  CheckCircle2,
  Sliders,
  X,
  Search,
  Ticket,
  QrCode,
  Globe,
} from 'lucide-react';
import {
  BusinessRecord,
  EventRecord,
  EventRegistrationRecord,
  ExecutiveRecord,
  MemberProfileRecord,
} from '../data/constants';
import {
  buildZaloChatUrl,
  maskPhoneKeepLast4,
  sanitizeExternalUrl,
} from '../utils/alumniLogic';
import { AvatarIllustration } from './AvatarIllustration';
import { ZaloConnectModal, ZaloMemberInfo } from './ZaloConnectModal';

export type PinnedCategory = 'event' | 'business' | 'executive' | 'member';

export interface PinnedIdsState {
  events: string[];
  businesses: string[];
  executives: string[];
  members: string[];
}

interface HomePinnedSpotlightProps {
  pinnedIds: PinnedIdsState;
  events: EventRecord[];
  businesses: BusinessRecord[];
  executives: ExecutiveRecord[];
  members: MemberProfileRecord[];
  currentUserUid?: string | null;
  userRegistrations: Record<string, EventRegistrationRecord>;
  allEventRegistrations?: Record<string, EventRegistrationRecord[]>;
  isAdmin: boolean;
  onTogglePin: (category: PinnedCategory, id: string) => void;
  onNavigateToEvent: (eventId: string, openRegister?: boolean) => void;
  onNavigateToBusiness: (businessId?: string) => void;
  onNavigateToExecutive: () => void;
  onNavigateToDirectory: (memberName?: string) => void;
}

export const HomePinnedSpotlight: React.FC<HomePinnedSpotlightProps> = ({
  pinnedIds,
  events,
  businesses,
  executives,
  members,
  currentUserUid = null,
  userRegistrations,
  allEventRegistrations,
  isAdmin,
  onTogglePin,
  onNavigateToEvent,
  onNavigateToBusiness,
  onNavigateToExecutive,
  onNavigateToDirectory,
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | PinnedCategory>('ALL');
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageTab, setManageTab] = useState<PinnedCategory>('event');
  const [manageSearch, setManageSearch] = useState('');
  const [zaloModalMember, setZaloModalMember] = useState<ZaloMemberInfo | null>(null);

  const getEffectiveRegCount = (ev: EventRecord) => {
    const rawUserReg = currentUserUid ? userRegistrations[ev.id] : undefined;
    const userReg =
      rawUserReg && rawUserReg.uid === currentUserUid ? rawUserReg : undefined;
    const allRegs = allEventRegistrations?.[ev.id];
    if (allRegs !== undefined) {
      const userInAll = userReg ? allRegs.some((r) => r.uid === userReg.uid) : false;
      return allRegs.length + (userReg && !userInAll ? 1 : 0);
    }
    return (ev.registeredCount || 0) + (userReg ? 1 : 0);
  };

  const pinnedEvents = useMemo(
    () => events.filter((e) => pinnedIds.events.includes(e.id)),
    [events, pinnedIds.events]
  );

  const pinnedBusinesses = useMemo(
    () => businesses.filter((b) => pinnedIds.businesses.includes(b.id)),
    [businesses, pinnedIds.businesses]
  );

  const pinnedExecutives = useMemo(
    () => executives.filter((ex) => pinnedIds.executives.includes(ex.id)),
    [executives, pinnedIds.executives]
  );

  const pinnedMembers = useMemo(
    () => members.filter((m) => pinnedIds.members.includes(m.uid)),
    [members, pinnedIds.members]
  );

  const explicitPinnedCount =
    pinnedEvents.length +
    pinnedBusinesses.length +
    pinnedExecutives.length +
    pinnedMembers.length;

  // Fallback: If no event is explicitly pinned yet, feature the primary event (events[0])
  // so visitors and members always see the key celebration spotlight rather than an empty placeholder.
  const displayEvents = useMemo(() => {
    if (pinnedEvents.length > 0) return pinnedEvents;
    if (explicitPinnedCount === 0 && events.length > 0) {
      return [events[0]];
    }
    return [];
  }, [pinnedEvents, explicitPinnedCount, events]);

  const totalPinnedCount =
    displayEvents.length +
    pinnedBusinesses.length +
    pinnedExecutives.length +
    pinnedMembers.length;

  const showEvents = activeFilter === 'ALL' || activeFilter === 'event';
  const showBusinesses = activeFilter === 'ALL' || activeFilter === 'business';
  const showExecutives = activeFilter === 'ALL' || activeFilter === 'executive';
  const showMembers = activeFilter === 'ALL' || activeFilter === 'member';

  return (
    <section
      id="home-pinned-spotlight"
      className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6"
    >
      {/* Top Header & Category Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Pin className="w-3.5 h-3.5 text-[#9E1B20] rotate-45" />
            <span className="font-bold text-[#9E1B20]">TIÊU ĐIỂM GHIM TRÊN TRANG CHỦ</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums font-medium">
              {totalPinnedCount} nội dung quan trọng từ các chuyên mục
            </span>
          </div>
          <h2
            className="text-xl sm:text-2xl font-bold text-[#0F172A]"
            style={{ textWrap: 'balance' }}
          >
            Bảng Tin & Sự kiện Trọng tâm ALUMNI KTD
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
            Tổng hợp các sự kiện đang mở đăng ký, doanh nghiệp tiêu biểu, Ban Điều hành và gương mặt cựu sinh viên được ghim trực tiếp từ các chuyên mục lên Trang chủ.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsManageModalOpen(true)}
              className="px-3.5 py-2 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Quản lý Ghim Trang chủ ({totalPinnedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveFilter('ALL')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeFilter === 'ALL'
              ? 'bg-white text-[#0F172A] shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Tất cả đã ghim ({totalPinnedCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('event')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeFilter === 'event'
              ? 'bg-white text-[#9E1B20] shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Sự kiện ({displayEvents.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('business')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeFilter === 'business'
              ? 'bg-white text-[#9E1B20] shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Doanh nghiệp ({pinnedBusinesses.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('executive')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeFilter === 'executive'
              ? 'bg-white text-[#9E1B20] shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Ban Điều hành ({pinnedExecutives.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('member')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeFilter === 'member'
              ? 'bg-white text-[#9E1B20] shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Thành viên ({pinnedMembers.length})</span>
        </button>
      </div>

      {/* Empty State */}
      {totalPinnedCount === 0 ? (
        <div className="py-12 px-4 text-center bg-slate-50/60 border border-dashed border-slate-200 rounded-xl space-y-3">
          <Pin className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">
              Chưa có nội dung nào được ghim lên Trang chủ
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {isAdmin
                ? 'Quản trị viên có thể chọn các Sự kiện, Doanh nghiệp, thành viên Ban Điều hành hoặc Cựu sinh viên tiêu biểu để ghim lên Trang chủ.'
                : 'Ban Quản trị sẽ cập nhật các sự kiện trọng tâm và doanh nghiệp tiêu biểu tại đây.'}
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsManageModalOpen(true)}
              className="px-4 py-2 bg-[#9E1B20] text-white text-xs font-semibold rounded-lg hover:bg-[#7D1418] transition-colors cursor-pointer"
            >
              Chọn nội dung ghim lên Trang chủ
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. Pinned Events Section */}
          {showEvents && displayEvents.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#9E1B20]">01. SỰ KIỆN TRỌNG TÂM ĐÃ GHIM</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{displayEvents.length} sự kiện</span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateToEvent(displayEvents[0].id, false)}
                  className="text-[#9E1B20] hover:underline font-semibold cursor-pointer flex items-center gap-1"
                >
                  <span>Xem toàn bộ lịch trình</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {displayEvents.map((ev) => {
                  const userReg = currentUserUid ? userRegistrations[ev.id] : undefined;
                  const isRegistered = Boolean(
                    currentUserUid && userReg && userReg.uid === currentUserUid
                  );
                  const dateObj = new Date(ev.eventDate);
                  const day = dateObj.getDate() || 15;
                  const month = dateObj.getMonth() + 1 || 11;
                  const year = dateObj.getFullYear() || 2026;
                  const effectiveRegCount = getEffectiveRegCount(ev);
                  const capacityPct = Math.min(
                    100,
                    Math.round((effectiveRegCount / Math.max(ev.capacity, 1)) * 100)
                  );

                  return (
                    <article
                      key={ev.id}
                      className="bg-slate-50/70 hover:bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4 transition-colors group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="flex flex-col items-center justify-center w-14 h-16 rounded-lg bg-[#9E1B20] text-white shrink-0 text-center">
                              <span className="text-[10px] font-semibold uppercase text-red-100 leading-none">
                                T{month}
                              </span>
                              <span className="text-xl font-bold tabular-nums leading-none my-1">
                                {day}
                              </span>
                              <span className="text-[10px] text-red-100 tabular-nums leading-none">
                                {year}
                              </span>
                            </div>

                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                <span className="font-semibold text-[#9E1B20]">{ev.category}</span>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-1 tabular-nums">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {ev.eventTime}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-slate-700">{ev.province}</span>
                              </div>

                              <h3 className="text-base font-bold text-[#0F172A] group-hover:text-[#9E1B20] transition-colors leading-snug">
                                {ev.title}
                              </h3>
                            </div>
                          </div>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => onTogglePin('event', ev.id)}
                              className="p-1.5 text-[#9E1B20] hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Bỏ ghim sự kiện này khỏi Trang chủ"
                            >
                              <PinOff className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {ev.summary}
                        </p>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                          <span className="truncate max-w-[65%]">
                            <MapPin className="w-3.5 h-3.5 text-[#9E1B20] inline mr-1" />
                            {ev.venue}
                          </span>
                          <span className="font-semibold text-[#9E1B20] tabular-nums shrink-0">
                            {effectiveRegCount}/{ev.capacity} đại biểu ({capacityPct}%)
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                        {isRegistered ? (
                          <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Bạn đã đăng ký tham gia</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            {ev.isGalaWithShirtFee || ev.id === 'evt-gala-can-bo-doan'
                              ? 'Có đăng ký Tiệc Gala & Áo đồng phục kỷ niệm'
                              : 'Đang mở cổng đăng ký trực tuyến'}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => onNavigateToEvent(ev.id, true)}
                          className="px-3.5 py-1.5 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                        >
                          {isRegistered ? (
                            <>
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Xem Đơn ĐK & Mã QR</span>
                            </>
                          ) : (
                            <>
                              <span>Đăng ký tham gia</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Pinned Businesses Section */}
          {showBusinesses && pinnedBusinesses.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#9E1B20]">02. DOANH NGHIỆP TIÊU BIỂU ĐÃ GHIM</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{pinnedBusinesses.length} doanh nghiệp</span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateToBusiness()}
                  className="text-[#9E1B20] hover:underline font-semibold cursor-pointer flex items-center gap-1"
                >
                  <span>Khám phá Cộng đồng Doanh nghiệp</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedBusinesses.map((biz) => {
                  const zaloUrl = buildZaloChatUrl(biz.contactPhone);
                  const safeWebsite = sanitizeExternalUrl(biz.website);
                  return (
                    <article
                      key={biz.id}
                      className="bg-slate-50/70 hover:bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3 transition-colors group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            {biz.logoUrl ? (
                              <div className="h-11 w-auto min-w-[36px] max-w-[80px] rounded-lg bg-white border border-slate-200 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                                <img
                                  src={biz.logoUrl}
                                  alt={biz.companyName}
                                  referrerPolicy="no-referrer"
                                  className="h-full w-auto max-h-full max-w-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="w-11 h-11 rounded-lg bg-red-50 text-[#9E1B20] border border-red-100 flex items-center justify-center shrink-0">
                                <Building2 className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold text-[#9E1B20] truncate">
                                {biz.industry}
                              </p>
                              <h3 className="text-sm font-bold text-[#0F172A] group-hover:text-[#9E1B20] transition-colors line-clamp-1">
                                {biz.companyName}
                              </h3>
                            </div>
                          </div>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => onTogglePin('business', biz.id)}
                              className="p-1 text-[#9E1B20] hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Bỏ ghim doanh nghiệp này khỏi Trang chủ"
                            >
                              <PinOff className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {biz.description}
                        </p>

                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                          <span>
                            Đại diện: <strong className="text-slate-800">{biz.ownerName}</strong>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{biz.province}</span>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          {zaloUrl && biz.contactPhone && (
                            <button
                              type="button"
                              onClick={() =>
                                setZaloModalMember({
                                  fullName: `${biz.ownerName} (${biz.companyName})`,
                                  phone: biz.contactPhone,
                                  faculty: biz.ownerFaculty,
                                  workplace: biz.companyName,
                                  avatarUrl: biz.logoUrl,
                                })
                              }
                              className="text-[#0068FF] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Zalo</span>
                            </button>
                          )}
                          {safeWebsite && (
                            <a
                              href={safeWebsite}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-600 hover:text-[#9E1B20] flex items-center gap-1"
                            >
                              <Globe className="w-3.5 h-3.5" />
                              <span>Web</span>
                            </a>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onNavigateToBusiness(biz.id)}
                          className="text-xs font-semibold text-[#9E1B20] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <span>Chi tiết B2B</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Pinned Executives & Members Section */}
          {((showExecutives && pinnedExecutives.length > 0) ||
            (showMembers && pinnedMembers.length > 0)) && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#9E1B20]">
                    03. BAN ĐIỀU HÀNH & GƯƠNG MẶT CỰU SINH VIÊN ĐÃ GHIM
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {pinnedExecutives.length + pinnedMembers.length} cá nhân
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onNavigateToExecutive}
                  className="text-[#9E1B20] hover:underline font-semibold cursor-pointer flex items-center gap-1"
                >
                  <span>Xem Ban Điều hành</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {showExecutives &&
                  pinnedExecutives.map((exec) => (
                    <div
                      key={exec.id}
                      className="bg-slate-50/70 hover:bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <AvatarIllustration
                            avatarKey={exec.avatarKey}
                            name={exec.fullName}
                            className="w-12 h-12 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-[#9E1B20] truncate">
                              {exec.boardRole}
                            </p>
                            <h3 className="text-sm font-bold text-[#0F172A] truncate">
                              {exec.fullName}
                            </h3>
                            <p className="text-xs text-slate-500 truncate">
                              {exec.faculty} · Khóa TN {exec.graduationYear}
                            </p>
                          </div>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => onTogglePin('executive', exec.id)}
                            className="p-1 text-[#9E1B20] hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Bỏ ghim khỏi Trang chủ"
                          >
                            <PinOff className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 truncate">
                        {exec.workPosition} — <strong className="text-slate-800">{exec.workplace}</strong>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                        <a
                          href={`tel:${exec.phone.replace(/\s+/g, '')}`}
                          className="font-mono text-slate-700 hover:text-[#9E1B20] flex items-center gap-1 tabular-nums"
                        >
                          <Phone className="w-3 h-3 text-[#9E1B20]" />
                          <span>{exec.phone}</span>
                        </a>
                        <button
                          type="button"
                          onClick={onNavigateToExecutive}
                          className="font-semibold text-[#9E1B20] hover:underline cursor-pointer"
                        >
                          Liên hệ BĐH →
                        </button>
                      </div>
                    </div>
                  ))}

                {showMembers &&
                  pinnedMembers.map((mem) => (
                    <div
                      key={mem.uid}
                      className="bg-slate-50/70 hover:bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {mem.avatarUrl ? (
                            <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center bg-slate-100">
                              <img
                                src={mem.avatarUrl}
                                alt={mem.fullName}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-red-50 text-[#9E1B20] font-bold text-sm flex items-center justify-center border border-red-200 shrink-0">
                              {mem.fullName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-slate-500 truncate">
                              Cựu sinh viên tiêu biểu · {mem.className}
                            </p>
                            <h3 className="text-sm font-bold text-[#0F172A] truncate">
                              {mem.fullName}
                            </h3>
                            <p className="text-xs text-slate-500 truncate">
                              {mem.faculty} · {mem.currentProvince}
                            </p>
                          </div>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => onTogglePin('member', mem.uid)}
                            className="p-1 text-[#9E1B20] hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Bỏ ghim khỏi Trang chủ"
                          >
                            <PinOff className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 truncate">
                        Đơn vị: <strong className="text-slate-800">{mem.workplace || 'Đang cập nhật'}</strong>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium">
                          {isAdmin
                            ? (maskPhoneKeepLast4(mem.zaloPhone) || mem.zaloPhoneMasked || 'Chưa cập nhật SĐT')
                            : (mem.className ? `Lớp ${mem.className}` : 'Thành viên ALUMNI')}
                        </span>
                        <button
                          type="button"
                          onClick={() => onNavigateToDirectory(mem.fullName)}
                          className="font-semibold text-[#9E1B20] hover:underline cursor-pointer"
                        >
                          Xem trong Danh bạ →
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Quản lý Chọn Nội dung Ghim từ tất cả các Tab */}
      {isManageModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-pins-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 space-y-5 max-h-[88vh] flex flex-col shadow-2xl">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#9E1B20] font-bold">
                  <Pin className="w-3.5 h-3.5 rotate-45" />
                  <span>CẤU HÌNH TIÊU ĐIỂM TRANG CHỦ</span>
                </div>
                <h3 id="manage-pins-modal-title" className="text-lg font-bold text-[#0F172A] mt-0.5">
                  Ghim hoặc Bỏ ghim Nội dung Quan trọng từ các Tab
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chọn các Sự kiện, Doanh nghiệp, thành viên Ban Điều hành hoặc Cựu sinh viên để hiển thị nổi bật ngay đầu Trang chủ.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Selector + Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setManageTab('event')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap ${
                    manageTab === 'event'
                      ? 'bg-white text-[#9E1B20] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  04. Sự kiện ({pinnedIds.events.length}/{events.length})
                </button>
                <button
                  type="button"
                  onClick={() => setManageTab('business')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap ${
                    manageTab === 'business'
                      ? 'bg-white text-[#9E1B20] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  03. Doanh nghiệp ({pinnedIds.businesses.length}/{businesses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setManageTab('executive')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap ${
                    manageTab === 'executive'
                      ? 'bg-white text-[#9E1B20] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  02. Ban Điều hành ({pinnedIds.executives.length}/{executives.length})
                </button>
                <button
                  type="button"
                  onClick={() => setManageTab('member')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap ${
                    manageTab === 'member'
                      ? 'bg-white text-[#9E1B20] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  01. Thành viên ({pinnedIds.members.length}/{members.length})
                </button>
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={manageSearch}
                  onChange={(e) => setManageSearch(e.target.value)}
                  placeholder="Tìm nhanh..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                />
              </div>
            </div>

            {/* Scrollable List of Items to Pin/Unpin */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-200 border border-slate-200 rounded-xl">
              {manageTab === 'event' &&
                events
                  .filter(
                    (e) =>
                      !manageSearch.trim() ||
                      e.title.toLowerCase().includes(manageSearch.toLowerCase()) ||
                      e.province.toLowerCase().includes(manageSearch.toLowerCase())
                  )
                  .map((ev) => {
                    const isPinned = pinnedIds.events.includes(ev.id);
                    return (
                      <div
                        key={ev.id}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{ev.title}</p>
                          <p className="text-[11px] text-slate-500 tabular-nums">
                            {ev.eventDate} ({ev.eventTime}) · {ev.province} · {getEffectiveRegCount(ev)}/{ev.capacity} đại biểu
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onTogglePin('event', ev.id)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                            isPinned
                              ? 'bg-[#9E1B20] text-white border-[#9E1B20]'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-[#9E1B20] hover:text-[#9E1B20]'
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                          <span>{isPinned ? 'Đã ghim Trang chủ' : 'Ghim lên Trang chủ'}</span>
                        </button>
                      </div>
                    );
                  })}

              {manageTab === 'business' &&
                businesses
                  .filter(
                    (b) =>
                      !manageSearch.trim() ||
                      b.companyName.toLowerCase().includes(manageSearch.toLowerCase()) ||
                      b.ownerName.toLowerCase().includes(manageSearch.toLowerCase())
                  )
                  .map((biz) => {
                    const isPinned = pinnedIds.businesses.includes(biz.id);
                    return (
                      <div
                        key={biz.id}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {biz.companyName}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            Đại diện: {biz.ownerName} · {biz.industry} · {biz.province}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onTogglePin('business', biz.id)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                            isPinned
                              ? 'bg-[#9E1B20] text-white border-[#9E1B20]'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-[#9E1B20] hover:text-[#9E1B20]'
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                          <span>{isPinned ? 'Đã ghim Trang chủ' : 'Ghim lên Trang chủ'}</span>
                        </button>
                      </div>
                    );
                  })}

              {manageTab === 'executive' &&
                executives
                  .filter(
                    (ex) =>
                      !manageSearch.trim() ||
                      ex.fullName.toLowerCase().includes(manageSearch.toLowerCase()) ||
                      ex.boardRole.toLowerCase().includes(manageSearch.toLowerCase())
                  )
                  .map((ex) => {
                    const isPinned = pinnedIds.executives.includes(ex.id);
                    return (
                      <div
                        key={ex.id}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {ex.fullName} — <span className="text-[#9E1B20]">{ex.boardRole}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {ex.faculty} (Khóa TN {ex.graduationYear}) · {ex.workplace}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onTogglePin('executive', ex.id)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                            isPinned
                              ? 'bg-[#9E1B20] text-white border-[#9E1B20]'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-[#9E1B20] hover:text-[#9E1B20]'
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                          <span>{isPinned ? 'Đã ghim Trang chủ' : 'Ghim lên Trang chủ'}</span>
                        </button>
                      </div>
                    );
                  })}

              {manageTab === 'member' &&
                members
                  .filter(
                    (m) =>
                      !manageSearch.trim() ||
                      m.fullName.toLowerCase().includes(manageSearch.toLowerCase()) ||
                      m.className.toLowerCase().includes(manageSearch.toLowerCase()) ||
                      m.workplace.toLowerCase().includes(manageSearch.toLowerCase())
                  )
                  .slice(0, 30)
                  .map((m) => {
                    const isPinned = pinnedIds.members.includes(m.uid);
                    return (
                      <div
                        key={m.uid}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {m.fullName} ({m.className})
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {m.faculty} · {m.workplace} ({m.currentProvince})
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onTogglePin('member', m.uid)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                            isPinned
                              ? 'bg-[#9E1B20] text-white border-[#9E1B20]'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-[#9E1B20] hover:text-[#9E1B20]'
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                          <span>{isPinned ? 'Đã ghim Trang chủ' : 'Ghim lên Trang chủ'}</span>
                        </button>
                      </div>
                    );
                  })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Mẹo: Bạn cũng có thể bấm nút <strong>Ghim Trang chủ</strong> trực tiếp trên từng thẻ ở các tab Sự kiện, Doanh nghiệp, Ban Điều hành.
              </span>
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="px-4 py-2 bg-[#9E1B20] text-white text-xs font-semibold rounded-lg hover:bg-[#7D1418] cursor-pointer"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Zalo Connect Modal */}
      <ZaloConnectModal
        isOpen={Boolean(zaloModalMember)}
        onClose={() => setZaloModalMember(null)}
        member={zaloModalMember}
      />
    </section>
  );
};
