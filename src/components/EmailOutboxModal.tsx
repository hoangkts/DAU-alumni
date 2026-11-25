import React, { useState } from 'react';
import {
  Download,
  Mail,
  X,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Send,
  Copy,
  Check,
} from 'lucide-react';
import { EmailNotificationRecord, EventRecord } from '../data/constants';
import {
  buildGmailComposeUrl,
  buildMailtoUrl,
  escapeHtml,
  generateIcsCalendarContent,
} from '../utils/alumniLogic';

interface EmailOutboxModalProps {
  isOpen: boolean;
  emails: EmailNotificationRecord[];
  onClose: () => void;
}

const CATEGORY_LABELS: Record<
  EmailNotificationRecord['category'],
  { label: string; color: string }
> = {
  MEMBER_WELCOME: {
    label: 'THƯ CHÀO MỪNG CỰU SINH VIÊN',
    color: 'text-[#9E1B20]',
  },
  MEMBER_CONFIRM: {
    label: 'XÁC NHẬN THÔNG TIN HỒ SƠ',
    color: 'text-[#9E1B20]',
  },
  BUSINESS_CONFIRM: {
    label: 'XÁC NHẬN DOANH NGHIỆP ALUMNI',
    color: 'text-[#9E1B20]',
  },
  EVENT_CONFIRM: {
    label: 'XÁC NHẬN ĐĂNG KÝ SỰ KIỆN',
    color: 'text-emerald-700',
  },
  EVENT_REMINDER: {
    label: 'NHẮC LỊCH SỰ KIỆN TỰ ĐỘNG (.ICS)',
    color: 'text-amber-700',
  },
  BOARD_NOTIFICATION: {
    label: 'THÔNG BÁO & EMAIL TỪ BAN ĐIỀU HÀNH',
    color: 'text-[#9E1B20]',
  },
};

export const EmailOutboxModal: React.FC<EmailOutboxModalProps> = ({
  isOpen,
  emails,
  onClose,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadIcs = (event: EventRecord) => {
    const ics = generateIcsCalendarContent(event);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alumni-ktd-${event.id}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtml = (mail: EmailNotificationRecord) => {
    const safeSubject = escapeHtml(mail.subject);
    const bodyText = mail.bodyLines
      ? mail.bodyLines.join('\n')
      : (mail as unknown as { body?: string }).body || '';
    const safeBody = escapeHtml(bodyText);
    const html =
      mail.htmlContent ||
      `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>${safeSubject}</title></head><body style="font-family:sans-serif;padding:24px;"><h2>${safeSubject}</h2><pre style="font-family:sans-serif;white-space:pre-wrap;">${safeBody}</pre></body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thu-xac-nhan-alumni-ktd-${mail.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyMail = async (mail: EmailNotificationRecord) => {
    const text = `${mail.subject}\nNgười nhận: ${mail.to}\n\n${mail.bodyLines.join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(mail.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // Ignore clipboard fallback
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-outbox-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 space-y-5 max-h-[88vh] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#9E1B20] flex items-center justify-center text-white shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="email-outbox-title"
                className="text-lg font-bold text-[#0F172A]"
              >
                Trung tâm Thư Xác nhận & Gửi nhanh Gmail (1-Click)
              </h2>
              <p className="text-sm text-slate-500">
                Quản trị viên có thể mở trực tiếp Gmail hoặc ứng dụng Mail đã điền sẵn 100% nội dung mà không cần cấu hình máy chủ phức tạp.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thư xác nhận"
            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Email list */}
        <div className="overflow-y-auto space-y-4 flex-1 pr-1">
          {emails.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Mail className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-base font-bold text-slate-700">
                Chưa có thư xác nhận nào trong phiên làm việc này.
              </p>
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Khi thành viên Cập nhật Hồ sơ Cá nhân, Đăng ký Doanh nghiệp hoặc Đăng ký tham gia Sự kiện (hoặc khi Quản trị viên bấm Duyệt), thư xác nhận sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            emails.map((mail) => {
              const catMeta = CATEGORY_LABELS[mail.category];
              const bodyText = mail.bodyLines
                ? mail.bodyLines.join('\n')
                : (mail as unknown as { body?: string }).body || '';
              const gmailUrl = buildGmailComposeUrl({
                to: mail.to.includes('@') ? mail.to : '',
                subject: mail.subject,
                body: bodyText,
              });
              const mailtoUrl = buildMailtoUrl({
                to: mail.to.includes('@') ? mail.to : '',
                subject: mail.subject,
                body: bodyText,
              });

              return (
                <article
                  key={mail.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"
                >
                  <div className="h-1 w-full bg-[#9E1B20]" aria-hidden="true" />
                  <div className="p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-bold text-xs tracking-wider ${catMeta.color}`}
                        >
                          {catMeta.label}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Đã tạo xác nhận</span>
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="text-slate-600">
                          Tới:{' '}
                          <strong className="text-[#0F172A] font-semibold">
                            {mail.to}
                          </strong>
                        </span>
                      </div>
                      <span className="text-slate-400 tabular-nums text-xs">
                        {new Date(mail.sentAt).toLocaleString('vi-VN')}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <h3 className="text-base font-bold text-[#0F172A]">
                          {mail.subject}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <a
                          href={gmailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-xs font-semibold rounded-md inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Gửi bằng Gmail</span>
                        </a>

                        <a
                          href={mailtoUrl}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md inline-flex items-center gap-1.5"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#9E1B20]" />
                          <span>Mở Mail App</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleCopyMail(mail)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md cursor-pointer inline-flex items-center gap-1.5"
                        >
                          {copiedId === mail.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadHtml(mail)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5 text-[#9E1B20]" />
                          <span>Tải (.html)</span>
                        </button>

                        {mail.previewUrl && (
                          <a
                            href={mail.previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-[#FEF2F2] text-[#9E1B20] border border-[#9E1B20]/30 hover:bg-red-100 text-xs font-semibold rounded-md inline-flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Webmail</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Formatted body view */}
                    <div
                      tabIndex={0}
                      role="region"
                      aria-label={`Nội dung thư: ${mail.subject}`}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap text-slate-800 select-text"
                    >
                      {bodyText}
                    </div>

                    {/* ICS Attachment action if event reminder */}
                    {mail.icsEvent && (
                      <div className="pt-2 flex items-center justify-between text-sm bg-[#FEF2F2] border-l-4 border-[#9E1B20] rounded-r-lg p-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#9E1B20]" />
                          <span className="text-slate-700 font-medium">
                            Tệp lịch đính kèm:{' '}
                            <strong>alumni-ktd-{mail.icsEvent.id}.ics</strong>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadIcs(mail.icsEvent!)}
                          className="px-3.5 py-1.5 bg-[#9E1B20] text-white text-xs font-semibold rounded-md hover:bg-[#7D1418] cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Tải về .ics</span>
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500 shrink-0">
          <span>
            Hỗ trợ xác nhận trực tiếp trên Web, gửi 1-Click qua Gmail của Quản trị viên và SMTP tự động
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
