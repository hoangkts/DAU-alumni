# ALUMNI KTD — Cổng thông tin Mạng lưới Cựu sinh viên Đại học Kiến trúc Đà Nẵng (DAU)

Hệ thống kết nối Mạng lưới Cựu sinh viên, Ban Điều hành, Cộng đồng Doanh nghiệp và Quản lý Sự kiện (hỗ trợ đặt áo đồng phục, VietQR động cá nhân hóa, vé điện tử QR và xuất báo cáo Excel 3 sheet).

- **Tên miền Production:** `https://alumni.ktd.edu.vn`
- **Repository:** `git@github.com:hoangkts/DAU-alumni.git`

---

## 1. Kiến trúc & Công nghệ

| Tầng | Công nghệ sử dụng |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons, `exceljs`, `qrcode` |
| **Backend** | Node.js 22 (ESM), Express 4 (`server.ts`), Helmet CSP, `express-rate-limit`, `cookie-parser`, Nodemailer |
| **Cơ sở dữ liệu** | PostgreSQL 17 (`pg` connection pool, tự động khởi tạo schema idempotent khi boot) |
| **Xác thực & Phiên** | Email + Mật khẩu (`crypto.scrypt` + `timingSafeEqual`), Cookie `HttpOnly` (`alumni_ktd_session`, SHA-256 hash trong DB, hạn 7 ngày), Google Identity Services (`POST /api/auth/google/token` xác thực JWT RS256 qua Google JWKS) và tùy chọn OAuth 2.0 Redirect (`/api/auth/google`) |
| **Lưu trữ ảnh** | Upload xử lý kiểm tra magic bytes (WebP / JPEG / PNG, tối đa 500 KB), lưu tại `UPLOAD_DIR` (`/uploads/{avatars,logos,qr}`) |
| **Triển khai** | Docker multi-stage (`Dockerfile` + `docker-compose.yml`), Reverse Proxy qua Nginx Proxy Manager (`shared_net`) |

---

## 2. Cấu trúc Thư mục

```text
.
├── public/
│   ├── logo-dau.png                 # Logo chính thức Đại học Kiến trúc Đà Nẵng
│   └── assets/aistudio/             # Hình ảnh bảng size áo đồng phục
├── server/
│   ├── schema.sql                   # Lược đồ 9 bảng PostgreSQL
│   ├── db.ts                        # Pool PostgreSQL + seed sự kiện Gala, pinned settings, Admin từ ENV
│   ├── auth.ts                      # Đăng ký, đăng nhập, phiên HttpOnly, Google ID Token & OAuth2
│   ├── uploads.ts                   # Kiểm tra magic bytes & lưu ảnh local
│   └── routes.ts                    # Toàn bộ REST API + phân quyền RBAC + lọc PII
├── src/
│   ├── components/
│   │   ├── AuthModal.tsx            # Hộp thoại Đăng nhập / Đăng ký + nút Google Sign-In (GIS)
│   │   ├── NetworkSection.tsx       # Danh bạ thành viên 8 khoa / 34 tỉnh thành 2025
│   │   ├── ExecutiveBoardSection.tsx# Ban Điều hành
│   │   ├── BusinessCommunitySection.tsx # Cộng đồng Doanh nghiệp B2B
│   │   ├── EventsTimelineSection.tsx# Sự kiện, form đăng ký, đặt áo, VietQR & xác nhận BTC
│   │   ├── AdminPortalSection.tsx   # Cổng Quản trị hệ thống
│   │   ├── HomePinnedSpotlight.tsx  # Tiêu điểm ghim Trang chủ
│   │   ├── MemberProfileModal.tsx   # Cập nhật hồ sơ thành viên & crop ảnh
│   │   ├── MyTicketsModal.tsx       # Đơn đăng ký cá nhân & mã VietQR thanh toán
│   │   ├── EmailOutboxModal.tsx     # Hộp thư xác nhận & nhắc lịch (.ics)
│   │   └── ...
│   ├── data/
│   │   ├── constants.ts             # Danh mục 8 Khoa/Ngành, 34 Tỉnh/Thành 2025, kiểu dữ liệu
│   │   └── shirtSizeChart.ts        # Bảng thông số size áo Nam/Nữ
│   ├── services/api.ts              # HTTP client gọi REST API (`credentials: 'include'`)
│   ├── utils/
│   │   ├── alumniLogic.ts           # Validate form, VietQR builder, sanitizeExternalUrl, escapeHtml, getVietnamDateIso
│   │   ├── alumniLogic.test.ts      # Unit tests (node:test)
│   │   ├── excelExporter.ts         # Xuất báo cáo Excel 3 sheet bằng ExcelJS (có công thức =SUM & chống formula injection)
│   │   ├── imageOptimizer.ts        # Nén & crop ảnh WebP/JPEG trên trình duyệt
│   │   └── ticketGenerator.ts       # Sinh vé điện tử VIP E-Pass PNG kèm mã QR check-in
│   └── App.tsx
├── server.ts                        # Điểm khởi chạy Express + Helmet CSP + static frontend
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## 3. Lược đồ PostgreSQL & Phân quyền RBAC

### 9 bảng trong `server/schema.sql`
1. `users`: Tài khoản (`role`: `'member' | 'admin1' | 'admin2'`, `password_hash`, `google_sub`).
2. `sessions`: Phiên đăng nhập lưu SHA-256 `token_hash` và `expires_at`.
3. `members`: Hồ sơ cựu sinh viên (`uid` liên kết `users`).
4. `executives`: Danh sách Ban Điều hành.
5. `businesses`: Hồ sơ doanh nghiệp (yêu cầu chủ sở hữu đã hoàn thiện hồ sơ `members` có `class_name` và `avatar_url`).
6. `events`: Sự kiện, cấu hình lệ phí Gala/áo, tài khoản VietQR và `custom_fields` (JSONB).
7. `event_registrations`: Đơn đăng ký tham dự, `shirt_orders` (JSONB), `total_fee` (do server tính), `payment_status`, `btc_confirmed`.
8. `app_settings`: Cấu hình ghim Trang chủ (`key = 'pinned'`).
9. `email_logs`: Nhật ký email xác nhận / nhắc lịch / thông báo Ban Điều hành.

### Quy tắc Bảo mật & Phân quyền
- **`member`:** Cập nhật hồ sơ cá nhân, đăng ký doanh nghiệp (sau khi đủ hồ sơ + avatar), đăng ký sự kiện khi đang mở. Không thể tự sửa `totalFee`, `paymentStatus`, `btcConfirmed` hoặc gửi email ra ngoài địa chỉ của chính mình.
- **`admin1` (Quản trị hệ thống):** Quản lý thành viên, Ban Điều hành, doanh nghiệp, sự kiện, ghim Trang chủ, sửa/xóa đơn đăng ký, gửi thông báo hàng loạt — **không** tự tích nút *"BTC đã xác nhận"*.
- **`admin2` (Ban Tổ chức xác nhận tài chính):** Có đầy đủ quyền quản trị sự kiện và là vai trò **duy nhất** được phép bật/tắt `btcConfirmed` (`PATCH /api/events/:id/registrations/:uid`).
- **Bảo vệ PII công khai:** API `GET /api/members` và `GET /api/events/:id/registrations` tự động ẩn `email`, `birthDate`, `zaloPhone` đầy đủ (chỉ trả `zaloPhoneMasked`), `totalFee`, `paymentStatus`, `shirtOrders` đối với khách hoặc thành viên không phải chủ đơn/Admin.

---

## 4. Danh sách API Endpoints

| Nhóm | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| **Health** | `GET /api/health` | Public | Kiểm tra trạng thái app & kết nối PostgreSQL |
| **Auth** | `GET /api/auth/me` | Public | Trả về thông tin user hiện tại & `googleClientId` |
| | `POST /api/auth/register` | Public (RL) | Đăng ký tài khoản Email + Mật khẩu (`>= 8` ký tự) |
| | `POST /api/auth/login` | Public (RL) | Đăng nhập Email/bí danh admin (`admin`/`admin1`/`admin 2`/`admin2`) |
| | `POST /api/auth/google/token` | Public (RL) | Xác thực Google ID Token (`RS256`) từ Google Identity Services |
| | `GET /api/auth/google` & `/callback` | Public | Luồng OAuth 2.0 Redirect (khi có `GOOGLE_CLIENT_SECRET`) |
| | `POST /api/auth/logout` | Public | Xóa session trong DB & clear cookie |
| **Upload** | `POST /api/uploads/image` | Auth | Lưu ảnh WebP/JPEG/PNG (magic bytes, `<= 500KB`) vào `/uploads/...` |
| **Members** | `GET /api/members` | Public (lọc PII) | Danh bạ thành viên (ẩn PII người khác nếu không phải Admin) |
| | `GET /api/members/me` · `PUT /api/members/me` | Auth | Xem & cập nhật hồ sơ cá nhân |
| | `PATCH /api/members/me/phone` | Auth | Cập nhật nhanh số điện thoại Zalo |
| | `DELETE /api/members/:uid` | Admin | Xóa hồ sơ thành viên |
| **Executives** | `GET /api/executives` | Public | Danh sách Ban Điều hành |
| | `POST/PUT/DELETE /api/executives(/:id)` | Admin | Thêm/sửa/xóa thành viên Ban Điều hành |
| **Businesses** | `GET /api/businesses` | Public | Danh bạ doanh nghiệp |
| | `POST /api/businesses` | Auth (Gate) | Đăng ký doanh nghiệp (bắt buộc đã xác nhận hồ sơ thành viên) |
| | `PUT/DELETE /api/businesses/:id` | Owner / Admin | Sửa hoặc xóa doanh nghiệp |
| **Events** | `GET /api/events` | Public | Danh sách sự kiện kèm `registeredCount` đếm từ DB |
| | `POST/PUT/DELETE /api/events(/:id)` | Admin | Tạo/sửa/xóa sự kiện & `PUT /api/events/:id/custom-fields` |
| | `GET /api/events/:id/registrations` | Public (lọc PII) / Admin | Danh sách đại biểu (Admin xem đủ, khách chỉ xem thông tin không nhạy cảm) |
| | `GET /api/registrations/me` | Auth | Lấy toàn bộ đơn đăng ký & thông tin thanh toán của bản thân |
| | `POST /api/events/:id/registrations` | Auth | Đăng ký tham dự sự kiện (server tự tính `totalFee`) |
| | `PATCH /api/events/:id/registrations/:uid` | Admin / Admin2 | Admin sửa đơn; chỉ `admin2` được sửa `btcConfirmed` |
| | `DELETE /api/events/:id/registrations(/:uid)` | Admin | Xóa 1 đơn hoặc reset toàn bộ đơn của sự kiện |
| **Settings & Mail** | `GET /api/settings/pinned` · `PUT` | Public / Admin | Đọc và lưu mục ghim Trang chủ |
| | `GET /api/emails` · `POST /api/send-email` | Auth (RL) | Đọc log email & gửi email (member chỉ gửi cho chính mình; Admin gửi hội viên) |

---

## 5. Cài đặt & Phát triển Local

### Yêu cầu môi trường
- Node.js `>= 20` (khuyến nghị Node 22 LTS)
- PostgreSQL 17 (hoặc chạy bằng Docker)

### Các bước chạy Local
```bash
# 1. Cài dependencies
npm install

# 2. Tạo file .env từ mẫu và điền DATABASE_URL + ADMIN1/2_PASSWORD
cp .env.example .env

# 3. Chạy môi trường phát triển (Express + Vite HMR trên cổng 3000)
npm run dev

# 4. Kiểm tra TypeScript, unit test và build production
npm run lint
npm test
npm run build
```

### Cấu hình Google Sign-In
Trong **Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID**:
- **Authorized JavaScript origins:** thêm `https://alumni.ktd.edu.vn` (và `http://localhost:3000` nếu test local).
- Điền `GOOGLE_CLIENT_ID` vào `.env` (ứng dụng sẽ tự bật nút Google Identity Services trên modal đăng nhập mà không bắt buộc `GOOGLE_CLIENT_SECRET`).
- Nếu muốn bật thêm luồng redirect `/api/auth/google/callback`, bổ sung `GOOGLE_CLIENT_SECRET` và thêm `https://alumni.ktd.edu.vn/api/auth/google/callback` vào **Authorized redirect URIs**.

---

## 6. Triển khai & Vận hành trên VPS

Ứng dụng được cài đặt cô lập tại `/opt/alumni-ktd` với hai container `alumni-ktd-app` (`127.0.0.1:4395->3000`) và `alumni-ktd-db` (`postgres:17-alpine`).

Dành cho tài khoản developer `anhnt` trên VPS (được phân quyền chỉnh sửa mã nguồn trong `/opt/alumni-ktd` và thao tác qua công cụ quản lý an toàn `alumni-ctl`):

```bash
# Kiểm tra trạng thái container và health API
sudo alumni-ctl status
sudo alumni-ctl health

# Sau khi chỉnh sửa hoặc git pull mã nguồn mới trong /opt/alumni-ktd: rebuild & khởi động lại app
sudo alumni-ctl deploy

# Xem log ứng dụng / PostgreSQL
sudo alumni-ctl logs app 100
sudo alumni-ctl logs db 100

# Sao lưu database thủ công (bản sao lưu tự động chạy mỗi ngày lúc 02:30 tại /opt/alumni-ktd/backups/)
sudo alumni-ctl db-backup
```
