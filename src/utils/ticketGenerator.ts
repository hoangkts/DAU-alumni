import QRCode from 'qrcode';
import { EventRecord } from '../data/constants';

interface TicketDetails {
  event: EventRecord;
  attendeeName: string;
  attendeeEmail: string;
  attendeeFaculty: string;
  attendeeGradYear: string;
  attendeeCohortYear?: string;
  ticketCode: string;
  registrationDate?: string;
}

/**
 * Draws a real scannable QR code onto the canvas inside the white stub QR box
 */
async function drawQrCode(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  size: number,
  payload: string
): Promise<void> {
  // Background white box with subtle border
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(startX - 8, startY - 8, size + 16, size + 16);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(startX - 8, startY - 8, size + 16, size + 16);

  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, payload, {
    width: size * 2,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
  });

  ctx.drawImage(qrCanvas, startX, startY, size, size);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Formats YYYY-MM-DD string into Vietnamese formal format: "24/11/2026"
 */
function formatEventDateVn(dateStr?: string): string {
  if (!dateStr) return '24/11/2026';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Renders and downloads a high-resolution luxury Gala VIP E-Pass / Ticket PNG
 */
export async function downloadEventTicketPng(details: TicketDetails): Promise<void> {
  const {
    event,
    attendeeName,
    attendeeEmail,
    attendeeFaculty,
    attendeeGradYear,
    attendeeCohortYear,
    ticketCode,
    registrationDate,
  } = details;

  // Ultra-crisp 2x retina canvas dimensions
  const scale = 2;
  const canvasW = 1040;
  const canvasH = 530;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW * scale;
  canvas.height = canvasH * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(scale, scale);

  // Outer dark background with subtle slate vignette
  const bgGrad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
  bgGrad.addColorStop(0, '#090D16');
  bgGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Subtle background luxury star/grid dots
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let x = 15; x < canvasW; x += 30) {
    for (let y = 15; y < canvasH; y += 30) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Main Ticket Boundaries
  const cardX = 25;
  const cardY = 22;
  const cardW = 990;
  const cardH = 486;
  const cardRadius = 20;
  const stubX = 735; // Perforation tear line position

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
  ctx.clip();

  // Card Background: Porcelain White
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cardX, cardY, cardW, cardH);

  // Left red brand banner accent strip
  ctx.fillStyle = '#881318';
  ctx.fillRect(cardX, cardY, 14, cardH);

  // Golden accent pinstripe
  const goldStripe = ctx.createLinearGradient(cardX + 14, cardY, cardX + 18, cardY + cardH);
  goldStripe.addColorStop(0, '#D97706');
  goldStripe.addColorStop(0.5, '#F59E0B');
  goldStripe.addColorStop(1, '#B45309');
  ctx.fillStyle = goldStripe;
  ctx.fillRect(cardX + 14, cardY, 4, cardH);

  // ================= MAIN TICKET SECTION (Left) =================
  // Header Banner: Royal Crimson Gradient
  const bannerH = 78;
  const headerGrad = ctx.createLinearGradient(cardX + 18, cardY, stubX, cardY);
  headerGrad.addColorStop(0, '#7D0E12');
  headerGrad.addColorStop(0.6, '#93171D');
  headerGrad.addColorStop(1, '#6F0A0E');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(cardX + 18, cardY, stubX - (cardX + 18), bannerH);

  // Gold accent line under header
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(cardX + 18, cardY + bannerH - 2, stubX - (cardX + 18), 2);

  // University Subtitle in Gold
  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG · DAU', cardX + 38, cardY + 16);

  // Main Header Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18.5px system-ui, -apple-system, sans-serif';
  ctx.fillText('MẠNG LƯỚI ALUMNI KTD · THẺ ĐẠI BIỂU & VÉ THAM DỰ GALA', cardX + 38, cardY + 36);

  // Status Badge in Header
  const badgeW = 150;
  const badgeH = 34;
  const badgeX = stubX - badgeW - 20;
  const badgeY = cardY + 22;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(253, 230, 138, 0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✓ ĐÃ XÁC NHẬN CHỖ', badgeX + badgeW / 2, badgeY + 10);

  // Category Tag Pill
  ctx.fillStyle = '#FEF2F2';
  ctx.strokeStyle = '#FECACA';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(cardX + 38, cardY + 98, 175, 25, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#9E1B20';
  ctx.font = 'bold 11.5px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('• Gala Truyền thống & Họp mặt', cardX + 48, cardY + 104);

  // Event Title (Refined & Prominent)
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 23px system-ui, -apple-system, sans-serif';
  const titleMaxWidth = stubX - (cardX + 38) - 20;
  const titleLines = wrapText(ctx, event.title, titleMaxWidth);
  let curY = cardY + 134;
  for (const line of titleLines.slice(0, 2)) {
    ctx.fillText(line, cardX + 38, curY);
    curY += 28;
  }

  // ================= BOX 1: EVENT DETAILS (Thời gian, Địa điểm, Ban tổ chức) =================
  const box1Y = Math.max(curY + 8, cardY + 196);
  const boxW = stubX - (cardX + 38) - 15;
  const box1H = 118;

  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(cardX + 38, box1Y, boxW, box1H, 12);
  ctx.fill();
  ctx.stroke();

  // Column Left (Width: 320px)
  const colLeftX = cardX + 54;
  const colRightX = cardX + 375;

  // Item 1: Time & Date
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillText('THỜI GIAN TỔ CHỨC', colLeftX, box1Y + 14);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  const formattedDate = formatEventDateVn(event.eventDate);
  ctx.fillText(`${event.eventTime || '11h00'} · Ngày ${formattedDate}`, colLeftX, box1Y + 30);

  // Item 2: Venue (Wrapped cleanly without ugly truncation)
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillText('ĐỊA ĐIỂM TỔ CHỨC', colLeftX, box1Y + 54);

  ctx.fillStyle = '#9E1B20';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  const venueTitle = event.venue ? event.venue.split(',')[0].trim() : 'Nhà hàng Quảng Đại Gold';
  ctx.fillText(venueTitle, colLeftX, box1Y + 70);

  ctx.fillStyle = '#334155';
  ctx.font = 'normal 11.5px system-ui, -apple-system, sans-serif';
  const venueAddress = event.venue && event.venue.includes(',')
    ? event.venue.slice(event.venue.indexOf(',') + 1).trim()
    : 'Số 187 đường 30/4, Hải Châu, Tp. Đà Nẵng';
  ctx.fillText(venueAddress, colLeftX, box1Y + 89);

  // Item 3: Organizer (Right column, wrapped properly)
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillText('ĐƠN VỊ TỔ CHỨC', colRightX, box1Y + 14);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 12.5px system-ui, -apple-system, sans-serif';
  const organizerMaxWidth = stubX - colRightX - 25;
  const organizerLines = wrapText(ctx, event.organizer, organizerMaxWidth);
  let orgY = box1Y + 30;
  for (const oLine of organizerLines.slice(0, 3)) {
    ctx.fillText(oLine, colRightX, orgY);
    orgY += 18;
  }

  // ================= BOX 2: ATTENDEE PROFILE (Đại biểu tham dự) =================
  const box2Y = box1Y + box1H + 12;
  const box2H = 92;

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(cardX + 38, box2Y, boxW, box2H, 12);
  ctx.fill();
  ctx.stroke();

  // Left side of attendee box: Name & Class
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillText('ĐẠI BIỂU THAM DỰ', colLeftX, box2Y + 14);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
  ctx.fillText(attendeeName, colLeftX, box2Y + 32);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillText('KHOA / KHÓA (NĂM VÀO TRƯỜNG)', colLeftX, box2Y + 54);

  ctx.fillStyle = '#9E1B20';
  ctx.font = 'bold 12.5px system-ui, -apple-system, sans-serif';
  const displayCohort =
    attendeeCohortYear ||
    (attendeeGradYear === '2011' ? '2006' : attendeeGradYear) ||
    '2006';
  const facultyText = attendeeFaculty
    ? `${attendeeFaculty} (Khóa ${displayCohort})`
    : `Cựu sinh viên KTD (Khóa ${displayCohort})`;
  ctx.fillText(facultyText, colLeftX, box2Y + 70);

  // Right side of attendee box: Email & Date issued
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillText('EMAIL XÁC NHẬN ĐĂNG KÝ', colRightX, box2Y + 14);

  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText(attendeeEmail, colRightX, box2Y + 32);

  ctx.fillStyle = '#64748B';
  ctx.font = '10.5px system-ui, -apple-system, sans-serif';
  const dateIssuedText = `Cấp ngày: ${registrationDate || new Date().toLocaleDateString('vi-VN')} · Mạng lưới Cựu sinh viên KTD`;
  ctx.fillText(dateIssuedText, colRightX, box2Y + 68);

  // ================= PERFORATION TEAR LINE =================
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(stubX, cardY);
  ctx.lineTo(stubX, cardY + cardH);
  ctx.stroke();
  ctx.setLineDash([]); // Reset line dash

  // ================= RIGHT STUB (E-PASS SECTION) =================
  const stubW = cardW - (stubX - cardX);
  const stubCenterX = stubX + stubW / 2;

  // Stub Background
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(stubX + 1, cardY, stubW - 1, cardH);

  // Gold luxury security band on right edge of stub
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(cardX + cardW - 6, cardY, 6, cardH);

  // Stub Header Banner
  const stubBannerH = 50;
  const stubHeaderGrad = ctx.createLinearGradient(stubX, cardY, cardX + cardW, cardY);
  stubHeaderGrad.addColorStop(0, '#7D0E12');
  stubHeaderGrad.addColorStop(1, '#93171D');
  ctx.fillStyle = stubHeaderGrad;
  ctx.fillRect(stubX + 1, cardY, stubW - 7, stubBannerH);

  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 13.5px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ALUMNI VIP E-PASS', stubCenterX, cardY + 14);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 9.5px system-ui, -apple-system, sans-serif';
  ctx.fillText('VÉ VÀO CỬA ĐIỆN TỬ CHÍNH THỨC', stubCenterX, cardY + 32);

  // Stub QR Code Box
  const qrSize = 142;
  const qrX = stubCenterX - qrSize / 2;
  const qrY = cardY + 68;
  await drawQrCode(
    ctx,
    qrX,
    qrY,
    qrSize,
    `KTD|${event.id}|${ticketCode}|${attendeeEmail}`
  );

  // Ticket Code Pill Badge
  const codeBadgeY = qrY + qrSize + 20;
  const codeBadgeW = 186;
  const codeBadgeH = 28;
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(stubCenterX - codeBadgeW / 2, codeBadgeY, codeBadgeW, codeBadgeH, 6);
  ctx.fill();

  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 12.5px monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(ticketCode, stubCenterX, codeBadgeY + 7);

  // Attendee Name on stub
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  const displayShortName = attendeeName.length > 24 ? attendeeName.slice(0, 22) + '...' : attendeeName;
  ctx.fillText(displayShortName, stubCenterX, codeBadgeY + 40);

  // Date on stub
  ctx.fillStyle = '#64748B';
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.fillText(formattedDate, stubCenterX, codeBadgeY + 58);

  // Bottom Notice
  ctx.fillStyle = '#94A3B8';
  ctx.font = '9.5px system-ui, -apple-system, sans-serif';
  ctx.fillText('Xuất trình mã này tại bàn đón tiếp', stubCenterX, cardY + cardH - 32);
  ctx.fillText('Không có giá trị quy đổi thành tiền mặt', stubCenterX, cardY + cardH - 18);

  // Semi-circle cutout notches at top and bottom of perforation line
  ctx.fillStyle = '#0F172A'; // Match canvas dark background
  ctx.beginPath();
  ctx.arc(stubX, cardY, 15, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(stubX, cardY + cardH, 15, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Convert to high-res PNG and trigger download
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve();
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanEventTitle = event.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 30);
      a.download = `ve-dien-tu-gala-${cleanEventTitle}-${ticketCode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}
