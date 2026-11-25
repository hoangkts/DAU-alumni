import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  Copy,
  Check,
  Phone,
  ExternalLink,
  X,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import {
  buildZaloDeepLink,
  buildZaloWebUrl,
  formatPhoneNumber,
} from '../utils/alumniLogic';

export interface ZaloMemberInfo {
  fullName: string;
  phone: string;
  className?: string;
  faculty?: string;
  workplace?: string;
  avatarUrl?: string;
}

interface ZaloConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: ZaloMemberInfo | null;
}

export const ZaloConnectModal: React.FC<ZaloConnectModalProps> = ({
  isOpen,
  onClose,
  member,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && member?.phone) {
      setCopied(false);
      // Cố gắng tự động kích hoạt deep link mở ứng dụng Zalo trực tiếp
      const deepLink = buildZaloDeepLink(member.phone);
      if (deepLink) {
        try {
          const timeout = setTimeout(() => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = deepLink;
            document.body.appendChild(iframe);
            setTimeout(() => {
              document.body.removeChild(iframe);
            }, 1000);
          }, 150);
          return () => clearTimeout(timeout);
        } catch {
          // Ignored
        }
      }
    }
  }, [isOpen, member?.phone]);

  if (!isOpen || !member) return null;

  const rawPhone = member.phone.replace(/[\s.\-()]/g, '');
  const formattedPhone = formatPhoneNumber(member.phone);
  const deepLink = buildZaloDeepLink(member.phone);
  const webUrl = buildZaloWebUrl(member.phone);

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText(rawPhone);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback copy
      const textArea = document.createElement('textarea');
      textArea.value = rawPhone;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleOpenApp = () => {
    if (deepLink) {
      window.location.href = deepLink;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0068FF] to-[#0052cc] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-snug">Kết nối Zalo Thành viên</h3>
              <p className="text-xs text-blue-100">ALUMNI KTD • Mở chat trực tiếp</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Member Info Card */}
          <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt={member.fullName}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#9E1B20] to-[#781317] text-white font-bold text-base flex items-center justify-center shadow-xs shrink-0">
                {member.fullName
                  .split(' ')
                  .map((w) => w[0])
                  .slice(-2)
                  .join('')
                  .toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-slate-900 text-base truncate">{member.fullName}</h4>
              <p className="text-xs text-slate-600 truncate">
                {member.className ? `Lớp ${member.className}` : ''}
                {member.className && member.faculty ? ' • ' : ''}
                {member.faculty || ''}
              </p>
              {member.workplace && (
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  Đơn vị: {member.workplace}
                </p>
              )}
            </div>
          </div>

          {/* Phone Display & Quick Copy Box (Bảo mật: Không làm lộ số điện thoại) */}
          <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200/90 text-center">
            <span className="text-xs uppercase tracking-wider font-semibold text-blue-900/80 block mb-1">
              Kênh kết nối Zalo an toàn (Bảo mật số điện thoại)
            </span>
            <div className="text-2xl font-bold font-mono tracking-wider text-blue-900 select-all my-1">
              {rawPhone.length > 4 ? `••••••${rawPhone.slice(-4)}` : formattedPhone}
            </div>

            <div className="flex items-center justify-center gap-2 mt-2">
              <button
                type="button"
                onClick={handleOpenApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0068FF] hover:bg-[#0055d4] text-white transition-all cursor-pointer shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Mở trò chuyện Zalo ngay</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {/* Primary Action: Launch Zalo App directly without QR login */}
            <button
              type="button"
              onClick={handleOpenApp}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0068FF] hover:bg-[#0055d4] active:bg-[#0042a3] text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer text-sm"
            >
              <Smartphone className="w-4 h-4" />
              <span>Mở ứng dụng Zalo (Deep Link trực tiếp)</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              {/* Call button */}
              <a
                href={`tel:${rawPhone}`}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-slate-600" />
                <span>Gọi trực tiếp</span>
              </a>

              {/* Web link fallback */}
              {webUrl && (
                <a
                  href={webUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition-colors"
                  title="Mở Zalo Web (có thể yêu cầu đăng nhập nếu chưa dùng trên trình duyệt này)"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                  <span>Mở Zalo Web</span>
                </a>
              )}
            </div>
          </div>

          {/* Explanatory Note */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Không cần quét mã QR:</strong> Hệ thống tự động kích hoạt Zalo trên máy tính hoặc điện thoại của bạn. Nếu Zalo Web yêu cầu mã QR, hãy bấm <strong>"Sao chép số"</strong> và dán vào thanh tìm kiếm của Zalo để nhắn tin ngay.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
