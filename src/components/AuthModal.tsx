import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { api, AppUser } from '../services/api';
import { DauLogoMark } from './AvatarIllustration';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>
          ) => void;
        };
      };
    };
  }
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (
    user: AppUser,
    mode: 'login' | 'register' | 'google'
  ) => Promise<void> | void;
  googleOAuthEnabled?: boolean;
  googleClientId?: string | null;
  googleRedirectEnabled?: boolean;
  initialTab?: 'login' | 'register';
  initialError?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  googleOAuthEnabled = false,
  googleClientId = null,
  googleRedirectEnabled = false,
  initialTab = 'login',
  initialError = null,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const onAuthSuccessRef = useRef(onAuthSuccess);
  onAuthSuccessRef.current = onAuthSuccess;
  const [gisFailed, setGisFailed] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setErrorMessage(initialError || null);
      setGisFailed(false);
    }
  }, [isOpen, initialTab, initialError]);

  useEffect(() => {
    if (!isOpen || !googleClientId) return;
    let cancelled = false;

    const renderGoogleSignIn = () => {
      if (cancelled || !googleButtonRef.current) return;
      const gsi = window.google?.accounts?.id;
      if (!gsi) {
        setGisFailed(true);
        return;
      }

      try {
        gsi.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            const credential = response?.credential;
            if (!credential) {
              setErrorMessage(
                'Không nhận được mã xác thực từ Google. Vui lòng thử lại.'
              );
              return;
            }
            setErrorMessage(null);
            setIsSubmitting(true);
            try {
              const res = await api.loginWithGoogleToken(credential);
              await onAuthSuccessRef.current(res.user, 'google');
            } catch (err) {
              setErrorMessage(
                err instanceof Error
                  ? err.message
                  : 'Đăng nhập Google không thành công. Vui lòng thử lại.'
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        });

        googleButtonRef.current.innerHTML = '';
        const containerWidth = Math.max(
          260,
          Math.min(400, googleButtonRef.current.clientWidth || 360)
        );
        gsi.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'rectangular',
          text: 'signin_with',
          logo_alignment: 'left',
          width: containerWidth,
          locale: 'vi',
        });
      } catch {
        setGisFailed(true);
      }
    };

    if (window.google?.accounts?.id) {
      renderGoogleSignIn();
      return () => {
        cancelled = true;
      };
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-google-gsi="true"]'
    );
    if (existingScript) {
      const onLoad = () => renderGoogleSignIn();
      const onError = () => {
        if (!cancelled) setGisFailed(true);
      };
      existingScript.addEventListener('load', onLoad);
      existingScript.addEventListener('error', onError);
      return () => {
        cancelled = true;
        existingScript.removeEventListener('load', onLoad);
        existingScript.removeEventListener('error', onError);
      };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = 'true';
    script.onload = () => renderGoogleSignIn();
    script.onerror = () => {
      if (!cancelled) setGisFailed(true);
    };
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [isOpen, googleClientId, activeTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleTabSwitch = (nextTab: 'login' | 'register') => {
    if (isSubmitting) return;
    setActiveTab(nextTab);
    setErrorMessage(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const identifier = loginEmail.trim();
    const password = loginPassword;

    if (!identifier) {
      setErrorMessage('Vui lòng nhập Email tài khoản.');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập Mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.login(identifier, password);
      setLoginPassword('');
      await onAuthSuccess(res.user, 'login');
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const fullName = regFullName.trim();
    const email = regEmail.trim().toLowerCase();
    const password = regPassword;
    const confirmPassword = regConfirmPassword;

    if (fullName.length < 2) {
      setErrorMessage('Vui lòng nhập Họ và tên đầy đủ (tối thiểu 2 ký tự).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Địa chỉ Email chưa hợp lệ.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Mật khẩu phải có tối thiểu 8 ký tự để đảm bảo an toàn.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp. Vui lòng nhập lại.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.register(email, password, fullName);
      setRegPassword('');
      setRegConfirmPassword('');
      await onAuthSuccess(res.user, 'register');
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Đăng ký tài khoản không thành công. Vui lòng thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Iconic DAU Crimson Top Rule */}
        <div className="h-1.5 w-full bg-[#9E1B20]" />

        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <DauLogoMark className="w-10 h-10 shrink-0" />
            <div>
              <h2
                id="auth-modal-title"
                className="text-base sm:text-lg font-extrabold text-[#0F172A] tracking-tight"
              >
                Tài khoản ALUMNI KTD
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Đăng nhập nhanh trên mọi trình duyệt (Zalo, Facebook, Safari, Chrome)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!isSubmitting) onClose();
            }}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Đóng hộp thoại đăng nhập"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-5 sm:px-6 pt-4">
          <div
            className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'login'}
              onClick={() => handleTabSwitch('login')}
              className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'login'
                  ? 'bg-white text-[#9E1B20] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span>Đăng nhập</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'register'}
              onClick={() => handleTabSwitch('register')}
              className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-white text-[#9E1B20] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" />
              <span>Đăng ký tài khoản mới</span>
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="auth-login-email"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Email tài khoản
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-login-email"
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="cuusinhvien@gmail.com"
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9E1B20]/20 focus:border-[#9E1B20] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-login-password"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Nhập mật khẩu của bạn"
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9E1B20]/20 focus:border-[#9E1B20] focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-[#9E1B20] hover:bg-[#7D1418] active:bg-[#5E0D10] text-white text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang đăng nhập...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Đăng nhập</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="auth-reg-fullname"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Họ và tên <span className="text-[#9E1B20]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-reg-fullname"
                    type="text"
                    autoComplete="name"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Nguyễn Văn An"
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9E1B20]/20 focus:border-[#9E1B20] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-reg-email"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Email <span className="text-[#9E1B20]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-reg-email"
                    type="email"
                    autoComplete="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="cuusinhvien@gmail.com"
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9E1B20]/20 focus:border-[#9E1B20] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-reg-password"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Mật khẩu (tối thiểu 8 ký tự) <span className="text-[#9E1B20]">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-reg-password"
                    type={showRegPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Ít nhất 8 ký tự"
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9E1B20]/20 focus:border-[#9E1B20] focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label={showRegPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showRegPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-reg-confirm"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Xác nhận mật khẩu <span className="text-[#9E1B20]">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-reg-confirm"
                    type={showRegPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9E1B20]/20 focus:border-[#9E1B20] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-[#9E1B20] hover:bg-[#7D1418] active:bg-[#5E0D10] text-white text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang tạo tài khoản...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Đăng ký &amp; Đăng nhập</span>
                  </>
                )}
              </button>
            </form>
          )}

          {(googleOAuthEnabled || Boolean(googleClientId)) && (
            <>
              <div className="relative flex items-center py-1">
                <div className="grow border-t border-slate-200" />
                <span className="shrink mx-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  hoặc
                </span>
                <div className="grow border-t border-slate-200" />
              </div>

              {googleClientId && !gisFailed && (
                <div
                  ref={googleButtonRef}
                  className="w-full min-h-[42px] flex items-center justify-center"
                />
              )}

              {googleRedirectEnabled && (!googleClientId || gisFailed) && (
                <a
                  href={api.getGoogleAuthUrl()}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2.5 shadow-2xs"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                    />
                  </svg>
                  <span>Đăng nhập bằng Google</span>
                </a>
              )}

              {googleClientId && gisFailed && !googleRedirectEnabled && (
                <p className="text-[11px] text-center text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Trình duyệt hiện tại đang chặn dịch vụ Google Sign-In. Vui lòng đăng nhập bằng Email &amp; Mật khẩu ở trên hoặc mở bằng Safari/Chrome.
                </p>
              )}
            </>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Phiên đăng nhập được bảo mật bằng Cookie HttpOnly trên máy chủ ALUMNI KTD.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
