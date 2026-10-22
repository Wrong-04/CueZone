// Run from backend: node scripts/check-staff.cjs
// Script kiểm thử độc lập cho tính năng SCRUM-757: Quản lý nhân sự, phân quyền RBAC & Bật/Tắt trạng thái hoạt động tài khoản
require('dotenv/config');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { App } = require('../dist/app');
const { User, UserRole } = require('../dist/modules/user/user.model');
const { Role } = require('../dist/modules/role/role.model');

async function main() {
  const dbName = `cz_staff_check_${randomUUID().slice(0, 14)}`;
  let server;
  try {
    console.log(`Connecting to temporary test db: ${dbName}...`);
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cuezone_db', {
      dbName,
      serverSelectionTimeoutMS: 5000,
    });

    await Promise.all([User.init(), Role.init()]);

    server = new App().app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;

    async function request(path, method = 'GET', body, token) {
      const response = await fetch(base + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    }

    console.log('--- 1. Tạo tài khoản Admin, Staff và Role ban đầu (SCRUM-765) ---');
    await Role.create([
      { name: 'admin', displayName: 'Quản trị viên', permissions: [{ module: 'users', actions: ['*'] }] },
      { name: 'staff', displayName: 'Nhân viên', permissions: [{ module: 'tables', actions: ['read', 'update'] }] },
      { name: 'cashier', displayName: 'Thu ngân', permissions: [{ module: 'invoices', actions: ['create', 'read'] }] },
    ]);

    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@cuezone.vn',
      password: 'AdminPassword123',
      role: UserRole.ADMIN,
      isActive: true,
      isLocked: false,
    });

    // Login để lấy Admin Token
    const adminLoginRes = await request('/auth/login', 'POST', {
      email: 'admin@cuezone.vn',
      password: 'AdminPassword123',
    });
    assert.equal(adminLoginRes.body.success, true);
    const adminToken = adminLoginRes.body.data.accessToken;

    console.log('--- 2. Admin tạo mới tài khoản nhân viên (SCRUM-758, 759) ---');
    const newStaffRes = await request('/users', 'POST', {
      name: 'Nhan Vien Kho 1',
      email: 'staff.warehouse@cuezone.vn',
      phone: '0912345678',
      password: 'StaffPassword123',
      role: 'warehouse',
      branch: 'Chi nhánh Quận 1',
      position: 'Thủ kho chính',
    }, adminToken);

    assert.equal(newStaffRes.body.success, true);
    assert.equal(newStaffRes.body.data.name, 'Nhan Vien Kho 1');
    assert.equal(newStaffRes.body.data.role, 'warehouse');
    assert.equal(newStaffRes.body.data.branch, 'Chi nhánh Quận 1');
    assert.equal(newStaffRes.body.data.isActive, true);
    assert.equal(newStaffRes.body.data.isLocked, false);
    assert.ok(!('password' in newStaffRes.body.data), 'Không được để lộ mật khẩu trong response');
    const createdStaffId = newStaffRes.body.data._id;

    // Kiểm tra không cho phép tạo trùng email
    const duplicateEmailRes = await request('/users', 'POST', {
      name: 'Nhan Vien Kho 2',
      email: 'staff.warehouse@cuezone.vn',
      password: 'StaffPassword123',
      role: 'warehouse',
    }, adminToken);
    assert.equal(duplicateEmailRes.body.success, false);
    assert.match(duplicateEmailRes.body.message, /Email đã được sử dụng/);

    console.log('--- 3. Lấy danh sách nhân viên và xem chi tiết (SCRUM-762) ---');
    // Xem danh sách lọc theo role
    const staffListRes = await request('/users?role=warehouse', 'GET', undefined, adminToken);
    assert.equal(staffListRes.body.success, true);
    assert.ok(Array.isArray(staffListRes.body.data));
    assert.ok(staffListRes.body.data.length >= 1);
    assert.equal(staffListRes.body.data[0].role, 'warehouse');

    // Xem chi tiết tài khoản
    const staffDetailRes = await request(`/users/${createdStaffId}`, 'GET', undefined, adminToken);
    assert.equal(staffDetailRes.body.success, true);
    assert.equal(staffDetailRes.body.data.email, 'staff.warehouse@cuezone.vn');

    console.log('--- 4. Đăng nhập nhân viên và chuẩn bị token phiên làm việc ---');
    const staffLoginRes = await request('/auth/login', 'POST', {
      email: 'staff.warehouse@cuezone.vn',
      password: 'StaffPassword123',
    });
    assert.equal(staffLoginRes.body.success, true);
    const staffToken = staffLoginRes.body.data.accessToken;
    const staffRefreshToken = staffLoginRes.body.data.refreshToken;

    // Nhân viên truy cập bình thường khi tài khoản còn active
    const normalAccessRes = await request('/notifications', 'GET', undefined, staffToken);
    assert.equal(normalAccessRes.status, 200);

    console.log('--- 5. Admin khóa tài khoản (Toggle Lock) & Thu hồi phiên tức thì (SCRUM-760, 761, 763) ---');
    const toggleLockRes = await request(`/users/${createdStaffId}/toggle-lock`, 'PUT', undefined, adminToken);
    assert.equal(toggleLockRes.body.success, true);
    assert.equal(toggleLockRes.body.data.isLocked, true);

    // KHI TÀI KHOẢN BỊ KHÓA: Access Token hiện tại phải bị từ chối ngay lập tức
    const lockedAccessRes = await request('/notifications', 'GET', undefined, staffToken);
    assert.equal(lockedAccessRes.status, 403, 'Yêu cầu phải bị từ chối với status 403');
    assert.match(lockedAccessRes.body.message, /Tài khoản đã bị khóa/);

    // Refresh Token cũng phải bị từ chối
    const lockedRefreshRes = await request('/auth/refresh-token', 'POST', { refreshToken: staffRefreshToken });
    assert.equal(lockedRefreshRes.status, 401);
    assert.match(lockedRefreshRes.body.message, /khóa/i);

    console.log('--- 6. Admin mở khóa và chuyển sang Inactive (Toggle Active) & Kiểm tra thu hồi (SCRUM-760, 763) ---');
    // Mở khóa lại
    await request(`/users/${createdStaffId}/toggle-lock`, 'PUT', undefined, adminToken);
    // Vô hiệu hóa tài khoản (isActive: false)
    const toggleActiveRes = await request(`/users/${createdStaffId}/toggle-active`, 'PUT', undefined, adminToken);
    assert.equal(toggleActiveRes.body.success, true);
    assert.equal(toggleActiveRes.body.data.isActive, false);

    // KHI TÀI KHOẢN INACTIVE: Access Token phải bị từ chối ngay lập tức
    const inactiveAccessRes = await request('/notifications', 'GET', undefined, staffToken);
    assert.equal(inactiveAccessRes.status, 403, 'Yêu cầu phải bị từ chối với status 403');
    assert.match(inactiveAccessRes.body.message, /vô hiệu hóa/);

    console.log('--- 7. Kiểm tra phân quyền RBAC: Non-admin không được truy cập API nhân sự (SCRUM-765) ---');
    // Tạo 1 cashier khác đang active
    const cashierUser = await User.create({
      name: 'Cashier Normal',
      email: 'cashier@cuezone.vn',
      password: 'CashierPassword123',
      role: UserRole.CASHIER,
      isActive: true,
      isLocked: false,
    });
    const cashierLogin = await request('/auth/login', 'POST', {
      email: 'cashier@cuezone.vn',
      password: 'CashierPassword123',
    });
    const cashierToken = cashierLogin.body.data.accessToken;

    // Cashier thử gọi API danh sách nhân viên
    const cashierForbiddenRes = await request('/users', 'GET', undefined, cashierToken);
    assert.equal(cashierForbiddenRes.status, 403, 'Cashier không được phép vào quản lý nhân sự');
    assert.match(cashierForbiddenRes.body.message, /Bạn không có quyền thực hiện thao tác này/);

    console.log('✅ ALL SCRUM-757 STAFF MANAGEMENT & REVOCATION TESTS PASSED!');
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  }
}

main().catch((err) => {
  console.error('❌ Check staff failed:', err);
  process.exit(1);
});
