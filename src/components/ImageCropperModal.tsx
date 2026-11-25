import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Check,
  Sparkles,
  Move,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import {
  CropSettings,
  ImageCropAspectRatio,
  processAndCompressImage,
  autoResizeAndOptimizeFile,
  OptimizedImageResult,
} from '../utils/imageOptimizer';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  mode: 'avatar' | 'business_logo';
  initialImage?: string;
  initialAspectRatio?: ImageCropAspectRatio;
  onSave: (result: OptimizedImageResult, aspectRatio: ImageCropAspectRatio) => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  mode,
  initialImage,
  onSave,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(initialImage || null);
  const [originalFileSizeBytes, setOriginalFileSizeBytes] = useState<number>(0);
  // Luôn giữ khung tự do ('free') để tiết kiệm diện tích và tùy chỉnh hoàn toàn bằng Zoom & Kéo di chuyển
  const aspectRatio: ImageCropAspectRatio = 'free';
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewResult, setPreviewResult] = useState<OptimizedImageResult | null>(null);

  const CONTAINER_HEIGHT = 240;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  // Khóa cuộn dọc của trang nền khi mở cửa sổ chỉnh ảnh
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, [isOpen]);

  // Reset or load initial image when opened
  useEffect(() => {
    if (isOpen) {
      if (initialImage) {
        setImageSrc(initialImage);
        setOriginalFileSizeBytes(0);
      }
      setZoom(1);
      setPan({ x: 0, y: 0 });
      panRef.current = { x: 0, y: 0 };
      setRotation(0);
    }
  }, [isOpen, initialImage]);

  // Ngăn chặn tuyệt đối cuộn trang dọc khi kéo ngón tay trên khung ảnh (passive: false)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !isOpen) return;

    const onTouchStartNative = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        isDraggingRef.current = true;
        const touch = e.touches[0];
        dragStartRef.current = {
          x: touch.clientX - panRef.current.x,
          y: touch.clientY - panRef.current.y,
        };
      }
    };

    const onTouchMoveNative = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      const nextPan = {
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y,
      };
      panRef.current = nextPan;
      setPan(nextPan);
    };

    const onTouchEndNative = () => {
      isDraggingRef.current = false;
    };

    el.addEventListener('touchstart', onTouchStartNative, { passive: false });
    el.addEventListener('touchmove', onTouchMoveNative, { passive: false });
    el.addEventListener('touchend', onTouchEndNative);
    el.addEventListener('touchcancel', onTouchEndNative);

    return () => {
      el.removeEventListener('touchstart', onTouchStartNative);
      el.removeEventListener('touchmove', onTouchMoveNative);
      el.removeEventListener('touchend', onTouchEndNative);
      el.removeEventListener('touchcancel', onTouchEndNative);
    };
  }, [isOpen, imageSrc]);

  // Handle file select with automatic system resizing in free aspect ratio
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn một tập tin hình ảnh hợp lệ (PNG, JPG, WEBP, GIF).');
      return;
    }

    setOriginalFileSizeBytes(file.size);
    try {
      const autoResized = await autoResizeAndOptimizeFile(file, mode, 'free');
      setImageSrc(autoResized.dataUrl);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      panRef.current = { x: 0, y: 0 };
      setRotation(0);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        panRef.current = { x: 0, y: 0 };
        setRotation(0);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Generate live preview when image or crop parameters change
  const updatePreview = useCallback(async () => {
    if (!imageElementRef.current || !imageSrc) return;
    try {
      const cropSettings: CropSettings = {
        zoom,
        panX: pan.x,
        panY: pan.y,
        rotation,
        aspectRatio: 'free',
        containerHeight: CONTAINER_HEIGHT,
        mode,
      };

      const maxDim = mode === 'avatar' ? 400 : 560;
      const result = await processAndCompressImage(
        imageElementRef.current,
        cropSettings,
        maxDim,
        originalFileSizeBytes
      );
      setPreviewResult(result);
    } catch {
      // Ignored for live preview
    }
  }, [imageSrc, zoom, pan, rotation, mode, originalFileSizeBytes]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updatePreview();
    }, 150);
    return () => clearTimeout(timer);
  }, [updatePreview]);

  // Mouse Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const nextPan = {
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    };
    panRef.current = nextPan;
    setPan(nextPan);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    panRef.current = { x: 0, y: 0 };
    setRotation(0);
  };

  const handleConfirmSave = async () => {
    if (!imageElementRef.current || !imageSrc) return;

    try {
      setIsProcessing(true);
      const cropSettings: CropSettings = {
        zoom,
        panX: pan.x,
        panY: pan.y,
        rotation,
        aspectRatio: 'free',
        containerHeight: CONTAINER_HEIGHT,
        mode,
      };

      const maxDim = mode === 'avatar' ? 400 : 600;
      const result = await processAndCompressImage(
        imageElementRef.current,
        cropSettings,
        maxDim,
        originalFileSizeBytes
      );

      onSave(result, aspectRatio);
      onClose();
    } catch (err: any) {
      alert(`Không thể xử lý ảnh: ${err.message || 'Lỗi không xác định'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  // Khung tự do theo tỷ lệ ảnh gốc, giới hạn chiều cao 240px gọn gàng trên điện thoại
  const getViewportStyle = (): React.CSSProperties => {
    let ratio = 1;
    if (naturalDimensions.width && naturalDimensions.height) {
      ratio = naturalDimensions.width / naturalDimensions.height;
    }

    const computedWidth = Math.round(CONTAINER_HEIGHT * ratio);

    return {
      height: `${CONTAINER_HEIGHT}px`,
      width: `min(100%, ${computedWidth}px)`,
      aspectRatio: `${ratio}`,
      maxWidth: '100%',
      touchAction: 'none',
    };
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-hidden overscroll-none animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#9E1B20] shrink-0" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">{title}</h3>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 pl-4 truncate">
              {description || 'Khung ảnh tự do · Kéo để di chuyển và dùng thanh trượt Zoom (0% - 300%)'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-hidden">
          {!imageSrc ? (
            /* Upload Empty State */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#9E1B20] bg-slate-50/60 hover:bg-red-50/30 rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 group"
            >
              <div className="w-14 h-14 rounded-full bg-red-50 text-[#9E1B20] flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                {mode === 'avatar' ? (
                  <Camera className="w-7 h-7" />
                ) : (
                  <Upload className="w-7 h-7" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  {mode === 'avatar'
                    ? 'Nhấp để tải ảnh chân dung / ảnh đại diện'
                    : 'Nhấp để tải lên Logo doanh nghiệp'}
                </p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Tự động giữ khung ảnh tự do gốc và nén thông minh về chuẩn &lt; 50KB WebP.
                </p>
              </div>
              <button
                type="button"
                className="px-4 py-2 bg-[#9E1B20] text-white text-xs font-semibold rounded-lg hover:bg-[#7D1418] transition-colors pointer-events-none"
              >
                Chọn ảnh từ máy tính / điện thoại
              </button>
            </div>
          ) : (
            /* Active Freeform Crop Viewport & Controls */
            <div className="space-y-3.5">
              {/* Crop Canvas Viewport (touch-none locks page scroll completely while dragging) */}
              <div className="flex flex-col items-center">
                <div
                  className="relative bg-slate-900 rounded-xl overflow-hidden border border-slate-300 w-full flex items-center justify-center p-2 select-none touch-none"
                  style={{ touchAction: 'none' }}
                >
                  <div
                    ref={viewportRef}
                    style={getViewportStyle()}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="relative overflow-hidden cursor-grab active:cursor-grabbing bg-slate-950 flex items-center justify-center rounded-xl shadow-inner ring-2 ring-white/25 touch-none select-none"
                  >
                    {/* Source Image */}
                    <img
                      ref={imageElementRef}
                      src={imageSrc}
                      alt="Crop target"
                      draggable={false}
                      onLoad={(e) => {
                        const target = e.currentTarget;
                        setNaturalDimensions({
                          width: target.naturalWidth,
                          height: target.naturalHeight,
                        });
                      }}
                      style={{
                        height: '100%',
                        width: 'auto',
                        maxHeight: '100%',
                        maxWidth: 'none',
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                        transformOrigin: 'center center',
                        transition: isDraggingRef.current ? 'none' : 'transform 0.05s ease-out',
                      }}
                      className="absolute pointer-events-none select-none"
                    />

                    {/* Rule of Thirds Guide Grid */}
                    <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/25">
                      <div className="border-r border-b border-white/15" />
                      <div className="border-r border-b border-white/15" />
                      <div className="border-b border-white/15" />
                      <div className="border-r border-b border-white/15" />
                      <div className="border-r border-b border-white/15" />
                      <div className="border-b border-white/15" />
                      <div className="border-r border-white/15" />
                      <div className="border-r border-white/15" />
                      <div />
                    </div>

                    {/* Drag hint overlay */}
                    <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/65 backdrop-blur-xs text-white/90 text-[11px] font-medium rounded-md flex items-center gap-1.5 pointer-events-none">
                      <Move className="w-3.5 h-3.5 text-amber-300" />
                      <span>Chạm & kéo trực tiếp trên ảnh để di chuyển</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls Toolbar: Zoom Slider (0% - 300%), Rotate, Reset */}
              <div className="bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200 space-y-3">
                {/* Zoom Control (0% - 300%) */}
                <div className="flex items-center gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={() => setZoom((prev) => Math.max(0, +(prev - 0.1).toFixed(2)))}
                    className="p-2 text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Thu nhỏ"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-2 accent-[#9E1B20] cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setZoom((prev) => Math.min(3, +(prev + 0.1).toFixed(2)))}
                    className="p-2 text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Phóng to"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-[#9E1B20] bg-red-50 border border-red-200 px-2 py-1 rounded-md tabular-nums min-w-[52px] text-center shrink-0">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>

                {/* Secondary Actions */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/80">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleRotate}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Xoay 90 độ"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-[#9E1B20]" />
                      <span>Xoay 90°</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Đặt lại vị trí và mức zoom 100%"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Đặt lại</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-semibold text-[#9E1B20] bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Đổi ảnh khác</span>
                  </button>
                </div>
              </div>

              {/* Compact Optimization Info */}
              {previewResult && (
                <div className="px-3 py-2 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-[11px] sm:text-xs text-emerald-900">
                  <div className="flex items-center gap-1.5 truncate">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      Khung tự do: <strong>{previewResult.width}×{previewResult.height}px</strong> · Dung lượng:{' '}
                      <strong className="text-emerald-700">{previewResult.formattedSize}</strong>
                    </span>
                  </div>
                  {previewResult.compressionRatioPercent > 0 && (
                    <span className="font-semibold text-emerald-800 shrink-0 ml-2">
                      -{previewResult.compressionRatioPercent}%
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            disabled={!imageSrc || isProcessing}
            onClick={handleConfirmSave}
            className="px-5 py-2.5 bg-[#9E1B20] hover:bg-[#7D1418] active:bg-[#5E0D10] text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-xs"
          >
            <Check className="w-4 h-4" />
            <span>{isProcessing ? 'Đang lưu...' : 'Áp dụng & Lưu ảnh'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
