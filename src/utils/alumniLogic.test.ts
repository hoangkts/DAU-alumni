import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BusinessRecord,
  EventRecord,
  ExecutiveRecord,
  FACULTY_MAJORS_LIST,
  MemberProfileRecord,
  VIETNAM_34_PROVINCES_2025,
} from '../data/constants';
import {
  buildBusinessConfirmationEmail,
  buildEventRegistrationEmails,
  buildMemberConfirmationEmail,
  filterBusinesses,
  filterExecutives,
  getMajorsByFaculty,
  isValidFacultyMajorPair,
  isValidVietnam2025Province,
  validateBusinessForm,
  validateEventForm,
  validateMemberForm,
  isConfirmedNetworkMember,
  normalizePhoneTo84,
  buildZaloDeepLink,
  buildZaloChatUrl,
  formatPhoneNumber,
  sanitizeEventInfoText,
  sanitizeEventRecord,
  sanitizeExternalUrl,
  escapeHtml,
  getVietnamDateIso,
} from './alumniLogic';

test('34 provinces of Vietnam 2025 list contains 34 administrative units plus international option', () => {
  assert.equal(VIETNAM_34_PROVINCES_2025.length, 35);
  assert.equal(isValidVietnam2025Province('Thành phố Đà Nẵng'), true);
  assert.equal(isValidVietnam2025Province('Thành phố Huế'), true);
  assert.equal(isValidVietnam2025Province('Thành phố Hồ Chí Minh'), true);
  assert.equal(isValidVietnam2025Province('Tỉnh Không Tồn Tại'), false);
});

test('Zalo deep links bypass web login QR code and correctly normalize Vietnam international phones', () => {
  assert.equal(normalizePhoneTo84('0919132858'), '84919132858');
  assert.equal(normalizePhoneTo84('+84919132858'), '84919132858');
  assert.equal(normalizePhoneTo84('0905 123 456'), '84905123456');

  assert.equal(buildZaloDeepLink('0919132858'), 'zalo://conversation?phone=84919132858');
  assert.equal(buildZaloChatUrl('0919132858'), 'zalo://conversation?phone=84919132858');

  assert.equal(formatPhoneNumber('0919132858'), '0919 132 858');
});

test('Dependent Faculty -> Majors mapping matches all 8 faculties and exact majors', () => {
  assert.equal(FACULTY_MAJORS_LIST.length, 8);
  assert.deepEqual(getMajorsByFaculty('Khoa Kiến trúc'), [
    'Ngành Kiến trúc công trình',
    'Ngành Quy hoạch vùng và đô thị',
    'Ngành Thiết kế đồ họa',
  ]);
  assert.deepEqual(getMajorsByFaculty('Khoa Xây dựng'), [
    'Ngành Kỹ thuật xây dựng',
    'Ngành Quản lý xây dựng',
    'Ngành Kỹ thuật xây dựng công trình giao thông',
    'Ngành Kỹ thuật xây dựng hạ tầng',
  ]);
  assert.deepEqual(getMajorsByFaculty('Khoa Kinh tế'), [
    'Ngành Quản trị kinh doanh',
    'Ngành Kế toán',
    'Ngành Tài chính - Ngân hàng',
    'Ngành Logistics và Quản lý chuỗi cung ứng',
  ]);
  assert.equal(
    isValidFacultyMajorPair('Khoa Ngoại Ngữ', 'Ngành Ngôn ngữ Trung Quốc'),
    true
  );
  assert.equal(
    isValidFacultyMajorPair('Khoa Ngoại Ngữ', 'Ngành Kỹ thuật xây dựng'),
    false
  );
});

test('Member profile form validation enforces required fields and dependent major', () => {
  const invalidResult = validateMemberForm({
    email: 'test@gmail.com',
    fullName: '',
    birthDate: '',
    className: '',
    enrollmentYear: '2015',
    graduationYear: '2020',
    faculty: 'Khoa Kiến trúc',
    major: 'Ngành Kế toán', // mismatched major
    currentProvince: 'Thành phố Đà Nẵng',
    workplace: 'Studio X',
    workplaceProvince: 'Thành phố Đà Nẵng',
  });
  assert.equal(invalidResult.valid, false);
  assert.ok(invalidResult.errors.fullName);
  assert.ok(invalidResult.errors.birthDate);
  assert.ok(invalidResult.errors.className);
  assert.ok(invalidResult.errors.major);

  assert.ok(invalidResult.errors.avatarUrl);

  const missingAvatarResult = validateMemberForm({
    email: 'ktd.member@gmail.com',
    fullName: 'Nguyễn Văn An',
    birthDate: '1995-06-15',
    className: '13KT1',
    enrollmentYear: '2013',
    graduationYear: '2018',
    faculty: 'Khoa Kiến trúc',
    major: 'Ngành Kiến trúc công trình',
    currentProvince: 'Thành phố Đà Nẵng',
    workplace: 'Công ty Kiến trúc An Việt',
    workplaceProvince: 'Thành phố Đà Nẵng',
    zaloPhone: '0905123456',
  });
  assert.equal(missingAvatarResult.valid, false);
  assert.ok(missingAvatarResult.errors.avatarUrl);

  const validResult = validateMemberForm({
    email: 'ktd.member@gmail.com',
    fullName: 'Nguyễn Văn An',
    birthDate: '1995-06-15',
    className: '13KT1',
    enrollmentYear: '2013',
    graduationYear: '2018',
    faculty: 'Khoa Kiến trúc',
    major: 'Ngành Kiến trúc công trình',
    currentProvince: 'Thành phố Đà Nẵng',
    workplace: 'Công ty Kiến trúc An Việt',
    workplaceProvince: 'Thành phố Đà Nẵng',
    zaloPhone: '0905123456',
    avatarUrl: 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=',
  });
  assert.equal(validResult.valid, true);
  assert.equal(
    isConfirmedNetworkMember({
      uid: 'u1',
      email: 'ktd.member@gmail.com',
      fullName: 'Nguyễn Văn An',
      birthDate: '1995-06-15',
      className: '13KT1',
      enrollmentYear: '2013',
      graduationYear: '2018',
      faculty: 'Khoa Kiến trúc',
      major: 'Ngành Kiến trúc công trình',
      currentProvince: 'Thành phố Đà Nẵng',
      workplace: 'Công ty Kiến trúc An Việt',
      workplaceProvince: 'Thành phố Đà Nẵng',
      zaloPhone: '0905123456',
      avatarUrl: 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=',
      updatedAt: new Date().toISOString(),
    }),
    true
  );
  assert.equal(
    isConfirmedNetworkMember({
      uid: 'u1',
      email: 'ktd.member@gmail.com',
      fullName: 'Nguyễn Văn An',
      birthDate: '1995-06-15',
      className: '13KT1',
      enrollmentYear: '2013',
      graduationYear: '2018',
      faculty: 'Khoa Kiến trúc',
      major: 'Ngành Kiến trúc công trình',
      currentProvince: 'Thành phố Đà Nẵng',
      workplace: 'Công ty Kiến trúc An Việt',
      workplaceProvince: 'Thành phố Đà Nẵng',
      zaloPhone: '0905123456',
      avatarUrl: '',
      updatedAt: new Date().toISOString(),
    }),
    false
  );
});

test('Business community registration strictly requires prior personal member profile', () => {
  const payload = {
    companyName: 'Công ty TNHH Kiến trúc Nam Việt',
    industry: 'Tư vấn Thiết kế Kiến trúc & Quy hoạch',
    scale: '10 - 49 nhân sự (Doanh nghiệp nhỏ)',
    province: 'Thành phố Đà Nẵng',
    address: '120 Nguyễn Văn Linh',
    website: 'https://namvietarch.vn',
    contactEmail: 'hello@namvietarch.vn',
    contactPhone: '0905111222',
    description: 'Tư vấn thiết kế công trình dân dụng.',
  };

  const blocked = validateBusinessForm(payload, false);
  assert.equal(blocked.valid, false);
  assert.ok(blocked.errors.memberGate);

  const allowed = validateBusinessForm(payload, true);
  assert.equal(allowed.valid, true);
});

test('Automated email builders create member, business, and event confirmation + reminder emails', () => {
  const member: MemberProfileRecord = {
    uid: 'test-user-1',
    email: 'test@alumni-ktd.edu.vn',
    fullName: 'Trần Văn Test',
    birthDate: '1990-01-01',
    className: '08KT1',
    enrollmentYear: '2008',
    graduationYear: '2013',
    faculty: 'Khoa Kiến trúc',
    major: 'Ngành Kiến trúc công trình',
    currentProvince: 'Thành phố Đà Nẵng',
    workplace: 'Công ty Test',
    workplaceProvince: 'Thành phố Đà Nẵng',
    updatedAt: new Date().toISOString(),
  };
  const memberEmail = buildMemberConfirmationEmail(member);
  assert.equal(memberEmail.to, member.email);
  assert.equal(memberEmail.category, 'MEMBER_CONFIRM');

  const biz: BusinessRecord = {
    id: 'biz-test-1',
    ownerUid: member.uid,
    ownerName: member.fullName,
    ownerFaculty: member.faculty,
    companyName: 'Công ty Cổ phần Kiến trúc Test',
    industry: 'Tư vấn Thiết kế Kiến trúc & Quy hoạch',
    scale: '10 - 49 nhân sự (Doanh nghiệp nhỏ)',
    province: 'Thành phố Đà Nẵng',
    address: 'Hải Châu, TP. Đà Nẵng',
    website: 'https://test.vn',
    contactEmail: 'contact@test.vn',
    contactPhone: '0905123456',
    description: 'Mô tả công ty test',
    createdAt: new Date().toISOString(),
  };
  const bizEmail = buildBusinessConfirmationEmail(biz, member.email);
  assert.equal(bizEmail.to, member.email);
  assert.equal(bizEmail.category, 'BUSINESS_CONFIRM');

  const event: EventRecord = {
    id: 'evt-test-1',
    title: 'Gala Họp mặt Cựu sinh viên Test',
    eventDate: '2026-12-25',
    eventTime: '17:30 - 21:00',
    province: 'Thành phố Đà Nẵng',
    venue: 'Grand Mercure Đà Nẵng',
    category: 'Gala Truyền thống & Họp mặt',
    capacity: 200,
    summary: 'Mô tả sự kiện test',
    organizer: 'Ban Điều hành',
    status: 'open',
    registeredCount: 10,
  };
  const eventEmails = buildEventRegistrationEmails(event, member, 'Tham dự phiên buổi sáng');
  assert.equal(eventEmails.length, 2);
  assert.equal(eventEmails[0].category, 'EVENT_CONFIRM');
  assert.equal(eventEmails[1].category, 'EVENT_REMINDER');
});

test('Executive board and Business filters work accurately', () => {
  const testExecs: ExecutiveRecord[] = [
    {
      id: 'exec-1',
      fullName: 'Trần Minh Hoàng',
      boardRole: 'Chủ tịch',
      phone: '0905128689',
      faculty: 'Khoa Kiến trúc',
      major: 'Ngành Kiến trúc công trình',
      graduationYear: '2011',
      email: 'hoang@alumni.vn',
      workplace: 'Đông Dương',
      workPosition: 'Tổng Giám đốc',
      avatarKey: 'president',
    },
  ];
  const execFiltered = filterExecutives(testExecs, 'Trần Minh Hoàng', 'ALL');
  assert.equal(execFiltered.length, 1);
  assert.equal(execFiltered[0].faculty, 'Khoa Kiến trúc');

  const testBizs: BusinessRecord[] = [
    {
      id: 'biz-seed-3',
      ownerUid: 'uid-3',
      ownerName: 'Lê Quốc Bảo',
      ownerFaculty: 'Khoa Xây dựng',
      companyName: 'Công ty Cổ phần CENCON',
      industry: 'Tổng thầu Xây dựng & Hạ tầng',
      scale: '200 - 499 nhân sự',
      province: 'Thành phố Đà Nẵng',
      address: 'Đà Nẵng',
      website: '',
      contactEmail: 'cencon@vn.vn',
      contactPhone: '0988712345',
      description: 'CENCON',
      createdAt: new Date().toISOString(),
    },
  ];
  const bizFiltered = filterBusinesses(
    testBizs,
    'CENCON',
    'ALL',
    'Thành phố Đà Nẵng'
  );
  assert.equal(bizFiltered.length, 1);
  assert.equal(bizFiltered[0].id, 'biz-seed-3');

  const validEvt = validateEventForm({
    title: 'Ngày hội Việc làm Kiến trúc Xây dựng 2026',
    eventDate: '2026-12-25',
    eventTime: '08:00 - 16:00',
    province: 'Thành phố Đà Nẵng',
    venue: 'Sảnh Trung tâm Đại học Kiến trúc Đà Nẵng',
    category: 'Hướng nghiệp',
    capacity: 250,
    summary: 'Kết nối tuyển dụng giữa doanh nghiệp cựu sinh viên và sinh viên năm cuối.',
    organizer: 'Ban Điều hành ALUMNI KTD',
  });
  assert.equal(validEvt.valid, true);
});

test('sanitizeEventInfoText and sanitizeEventRecord strip legacy hardcoded Gala & Shirt prices from event summary and customFields', () => {
  const legacySummary =
    'Gặp mặt truyền thống. Thành viên có thể đăng ký tham dự Đêm Gala (350.000 VNĐ/người) và đặt Áo thun Polo kỷ niệm Form Nam / Nữ (110.000 VNĐ/áo, có thể chỉ đặt áo mà không tham gia Gala).';
  const cleaned = sanitizeEventInfoText(legacySummary);
  assert.equal(cleaned.includes('350.000'), false);
  assert.equal(cleaned.includes('110.000'), false);
  assert.equal(cleaned.includes('350k'), false);
  assert.equal(cleaned.includes('110k'), false);
  assert.equal(cleaned.includes('Đêm Gala'), true);

  const sanitizedEvent = sanitizeEventRecord({
    id: 'evt-gala-can-bo-doan',
    title: 'Gala Gặp mặt Cán bộ Đoàn, Cán sự lớp qua các thời kỳ',
    eventDate: '2026-11-19',
    eventTime: '17:00 - 21:30',
    province: 'Thành phố Đà Nẵng',
    venue: 'Hội trường Lớn',
    category: 'Gala Truyền thống',
    capacity: 300,
    summary: legacySummary,
    organizer: 'Ban Điều hành Mạng lưới ALUMNI KTD',
    status: 'open',
    registeredCount: 0,
    galaFeeAmount: 400000,
    shirtFeeAmount: 130000,
    customFields: [
      {
        id: 'cf_attend_gala',
        label: '1. Đăng ký tham dự Tiệc Gala Gặp mặt (Lệ phí 350.000 VNĐ / người)',
        type: 'radio',
        required: true,
        options: ['Có tham dự Đêm Gala (350.000 VNĐ)', 'Không tham dự Gala (0 VNĐ - Chỉ đặt áo kỷ niệm)'],
      },
    ],
  });

  assert.equal(sanitizedEvent.summary.includes('350.000'), false);
  assert.equal(sanitizedEvent.summary.includes('110.000'), false);
  assert.equal(sanitizedEvent.customFields?.[0]?.label.includes('350.000'), false);
  assert.equal(sanitizedEvent.customFields?.[0]?.options?.[0]?.includes('350.000'), false);
  assert.equal(sanitizedEvent.galaFeeAmount, 400000);
  assert.equal(sanitizedEvent.shirtFeeAmount, 130000);
});

test('sanitizeExternalUrl validates http/https URLs and blocks dangerous schemes', () => {
  assert.equal(sanitizeExternalUrl('https://alumni.ktd.edu.vn'), 'https://alumni.ktd.edu.vn');
  assert.equal(sanitizeExternalUrl('http://example.vn/gioi-thieu'), 'http://example.vn/gioi-thieu');
  assert.equal(sanitizeExternalUrl('example.vn'), 'https://example.vn');
  assert.equal(sanitizeExternalUrl('  namvietarch.vn/du-an  '), 'https://namvietarch.vn/du-an');
  assert.equal(sanitizeExternalUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeExternalUrl('  JaVaScRiPt:alert(document.cookie)'), null);
  assert.equal(sanitizeExternalUrl('java\tscript:alert(1)'), null);
  assert.equal(sanitizeExternalUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(sanitizeExternalUrl('vbscript:msgbox(1)'), null);
  assert.equal(sanitizeExternalUrl('/relative/path'), null);
  assert.equal(sanitizeExternalUrl(''), null);
  assert.equal(sanitizeExternalUrl(undefined), null);
});

test('escapeHtml escapes &, <, >, ", and single quote characters', () => {
  assert.equal(
    escapeHtml(`<script>alert("XSS" & 'test')</script>`),
    '&lt;script&gt;alert(&quot;XSS&quot; &amp; &#39;test&#39;)&lt;/script&gt;'
  );
  assert.equal(escapeHtml('ALUMNI KTD & DAU'), 'ALUMNI KTD &amp; DAU');
});

test('getVietnamDateIso returns YYYY-MM-DD formatted date in Asia/Ho_Chi_Minh timezone', () => {
  const iso = getVietnamDateIso();
  assert.match(iso, /^\d{4}-\d{2}-\d{2}$/);
  const expected = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  assert.equal(iso, expected);
});


