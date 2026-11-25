import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  X,
  AlertTriangle,
  Smartphone,
  Compass,
} from 'lucide-react';

interface InAppBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueAnyway?: () => void;
}

export const InAppBrowserModal: React.FC<InAppBrowserModalProps> = ({
  isOpen,
  onClose,
  onContinueAnyway,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const input = document.createElement('input');
        input.value = currentUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 text-[#9E1B20]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                Mở trong Trình duyệt Ngoài (Safari / Chrome)
              </h3>
              <p className="text-xs text-slate-500">
                Để đăng nhập Google thành công mà không bị chặn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reason Explainer */}
        <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1.5 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Nguyên nhân màn hình báo lỗi:</span>
          </div>
          <p>
            Bạn đang mở liên kết bên trong ứng dụng (Zalo, Facebook hoặc Messenger). Trình duyệt nhúng này chặn cửa sổ bảo mật (sessionStorage / popup) của Google, gây ra lỗi <em>"missing initial state"</em>.
          </p>
        </div>

        {/* 2-Step Instructions with Visual Badge */}
        <div className="space-y-3 text-xs text-slate-700">
          <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
            Cách xử lý nhanh trong 3 giây:
          </p>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-[#9E1B20] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <div className="space-y-0.5">
              <p className="font-semibold text-slate-900">
                Bấm vào dấu 3 chấm (•••) ở góc trên bên phải màn hình Zalo/Facebook
              </p>
              <p className="text-slate-500 text-[11px]">
                (Nút biểu tượng 3 chấm tròn nằm ở góc trên cùng bên phải thanh tiêu đề)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-[#9E1B20] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <div className="space-y-0.5">
              <p className="font-semibold text-slate-900">
                Chọn &quot;Mở bằng trình duyệt&quot; (Safari trên iPhone hoặc Chrome)
              </p>
              <p className="text-slate-500 text-[11px]">
                Trang sẽ mở ra trong Safari/Chrome và bạn đăng nhập Google bình thường ngay lập tức.
              </p>
            </div>
          </div>
        </div>

        {/* Copy Link Option */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-bold">
                  Đã sao chép liên kết! Dán vào Safari / Chrome để mở
                </span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-600" />
                <span>Sao chép liên kết trang web</span>
              </>
            )}
          </button>

          {onContinueAnyway && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onContinueAnyway();
              }}
              className="w-full py-2 text-center text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
            >
              Vẫn muốn thử đăng nhập Google trực tiếp tại đây
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
