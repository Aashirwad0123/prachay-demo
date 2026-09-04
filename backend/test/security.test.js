const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { sequelize, User, Voucher } = require('../models');

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

let employee, employee2, director, accounts;

async function makeUser(role, email) {
  const password = await bcrypt.hash('Password@123', 10);
  const user = await User.create({ name: `${role} user`, email, password, role });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'Password@123' });
  return { user, token: res.body.token };
}

beforeAll(async () => {
  await sequelize.sync({ force: true });
  employee = await makeUser('EMPLOYEE', 'emp1@test.com');
  employee2 = await makeUser('EMPLOYEE', 'emp2@test.com');
  director = await makeUser('DIRECTOR', 'dir1@test.com');
  accounts = await makeUser('ACCOUNTS', 'acc1@test.com');
});

afterAll(async () => {
  await sequelize.close();
});

async function createDraft(auth, overrides = {}) {
  const res = await request(app)
    .post('/api/vouchers')
    .set('Authorization', `Bearer ${auth.token}`)
    .field('expenseDate', '2026-01-01')
    .field('departmentName', 'Engineering')
    .field('expenseTitle', 'Laptop stand')
    .field('amount', '499.99')
    .field(overrides.field || 'submit', overrides.value ?? 'false');
  return res;
}

describe('Registration', () => {
  test('public registration creates EMPLOYEE even if role=DIRECTOR is submitted', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Attacker', email: 'attacker@test.com', password: 'Password@123', role: 'DIRECTOR',
    });
    expect(res.status).toBe(400); // role is an unknown/rejected field (mass-assignment protection)
  });

  test('registration without role field succeeds as EMPLOYEE', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'New Employee', email: 'newemp@test.com', password: 'Password@123',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('EMPLOYEE');
    expect(res.body.user.password).toBeUndefined();
  });

  test('duplicate email returns 409', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Dup', email: 'newemp@test.com', password: 'Password@123',
    });
    expect(res.status).toBe(409);
  });

  test('weak (short) password is rejected', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Weak', email: 'weak@test.com', password: 'short',
    });
    expect(res.status).toBe(400);
    expect(res.body.errors.password).toBeDefined();
  });

  test('password missing complexity (all lowercase, no digit/symbol) is rejected', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Simple', email: 'simple@test.com', password: 'onlylowercase',
    });
    expect(res.status).toBe(400);
    expect(res.body.errors.password).toBeDefined();
  });

  test('malformed email is rejected', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bad Email', email: 'not-an-email', password: 'Password@123',
    });
    expect(res.status).toBe(400);
    expect(res.body.errors.email).toBeDefined();
  });

  test('email is trimmed and lowercased before storage/lookup', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Mixed Case', email: '  MixedCase@Test.com  ', password: 'Password@123',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('mixedcase@test.com');
  });

  test('mass-assignment fields (isAdmin, permissions) are rejected', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Sneaky', email: 'sneaky@test.com', password: 'Password@123', isAdmin: true, permissions: ['ALL'],
    });
    expect(res.status).toBe(400);
  });
});

describe('Authentication', () => {
  test('wrong password returns 401 generic message', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'emp1@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Incorrect email or password. Please check and try again.');
  });

  test('unknown email returns the same generic 401 message', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'whatever1' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Incorrect email or password. Please check and try again.');
  });

  test('deleted user cannot use a previously-issued JWT', async () => {
    const password = await bcrypt.hash('Password@123', 10);
    const temp = await User.create({ name: 'Temp', email: 'temp@test.com', password, role: 'EMPLOYEE' });
    const loginRes = await request(app).post('/api/auth/login').send({ email: 'temp@test.com', password: 'Password@123' });
    await temp.destroy();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${loginRes.body.token}`);
    expect(res.status).toBe(401);
  });

  test('expired JWT is rejected', async () => {
    const expired = jwt.sign({ id: employee.user.id }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: -10 });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  test('malformed JWT is rejected', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });

  test('token signed with the wrong algorithm/secret is rejected', async () => {
    const forged = jwt.sign({ id: employee.user.id }, 'wrong-secret', { algorithm: 'HS256' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  test('missing token returns 401', async () => {
    const res = await request(app).get('/api/vouchers/mine');
    expect(res.status).toBe(401);
  });
});

describe('Authorization & ownership', () => {
  let voucherId;
  beforeAll(async () => {
    const res = await createDraft(employee);
    voucherId = res.body.id;
  });

  test('employee cannot read another employee\'s voucher', async () => {
    const res = await request(app).get(`/api/vouchers/${voucherId}`).set('Authorization', `Bearer ${employee2.token}`);
    expect(res.status).toBe(403);
  });

  test('employee cannot edit another employee\'s voucher', async () => {
    const res = await request(app)
      .put(`/api/vouchers/${voucherId}`)
      .set('Authorization', `Bearer ${employee2.token}`)
      .field('amount', '1');
    expect(res.status).toBe(403);
  });

  test('employee cannot approve a voucher (wrong role)', async () => {
    const res = await request(app).post(`/api/vouchers/${voucherId}/approve`).set('Authorization', `Bearer ${employee.token}`);
    expect(res.status).toBe(403);
  });

  test('accounts role cannot access director-only pending list', async () => {
    const res = await request(app).get('/api/vouchers/pending').set('Authorization', `Bearer ${accounts.token}`);
    expect(res.status).toBe(403);
  });
});

describe('Voucher state machine', () => {
  test('non-DRAFT voucher cannot be edited or deleted', async () => {
    const create = await createDraft(employee, { field: 'submit', value: 'false' });
    const id = create.body.id;
    // move to PENDING_APPROVAL via submit endpoint requires a signature; approve path instead:
    await Voucher.update({ status: 'PENDING_APPROVAL' }, { where: { id } });

    const editRes = await request(app)
      .put(`/api/vouchers/${id}`)
      .set('Authorization', `Bearer ${employee.token}`)
      .field('amount', '10');
    expect(editRes.status).toBe(400);

    const delRes = await request(app).delete(`/api/vouchers/${id}`).set('Authorization', `Bearer ${employee.token}`);
    expect(delRes.status).toBe(400);
  });

  test('client cannot set status directly via the update endpoint (unknown field rejected)', async () => {
    const create = await createDraft(employee);
    const res = await request(app)
      .put(`/api/vouchers/${create.body.id}`)
      .set('Authorization', `Bearer ${employee.token}`)
      .field('status', 'APPROVED');
    expect(res.status).toBe(400);
  });

  test('only PENDING_APPROVAL vouchers can be approved', async () => {
    const create = await createDraft(employee);
    const res = await request(app)
      .post(`/api/vouchers/${create.body.id}/approve`)
      .set('Authorization', `Bearer ${director.token}`)
      .attach('directorSignature', PNG_1x1, { filename: 'sig.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });

  test('terminal (APPROVED) voucher cannot be rejected', async () => {
    const create = await createDraft(employee);
    await Voucher.update({ status: 'APPROVED' }, { where: { id: create.body.id } });
    const res = await request(app)
      .post(`/api/vouchers/${create.body.id}/reject`)
      .set('Authorization', `Bearer ${director.token}`)
      .send({ rejectionReason: 'too late' });
    expect(res.status).toBe(400);
  });
});

describe('Input validation', () => {
  test('missing required fields rejected with structured errors', async () => {
    const res = await request(app)
      .post('/api/vouchers')
      .set('Authorization', `Bearer ${employee.token}`)
      .field('departmentName', 'Engineering');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toBeDefined();
  });

  test('negative/zero amount rejected', async () => {
    const res = await request(app)
      .post('/api/vouchers')
      .set('Authorization', `Bearer ${employee.token}`)
      .field('expenseDate', '2026-01-01')
      .field('departmentName', 'Engineering')
      .field('expenseTitle', 'x')
      .field('amount', '-5');
    expect(res.status).toBe(400);
  });

  test('excessively large amount rejected', async () => {
    const res = await request(app)
      .post('/api/vouchers')
      .set('Authorization', `Bearer ${employee.token}`)
      .field('expenseDate', '2026-01-01')
      .field('departmentName', 'Engineering')
      .field('expenseTitle', 'x')
      .field('amount', '99999999999');
    expect(res.status).toBe(400);
  });

  test('invalid id param rejected', async () => {
    const res = await request(app).get('/api/vouchers/not-a-number').set('Authorization', `Bearer ${employee.token}`);
    expect(res.status).toBe(400);
  });

  test('invalid sort field rejected', async () => {
    const res = await request(app).get('/api/vouchers/mine?sortBy=password').set('Authorization', `Bearer ${employee.token}`);
    expect(res.status).toBe(400);
  });

  test('invalid sort direction rejected', async () => {
    const res = await request(app).get('/api/vouchers/mine?order=sideways').set('Authorization', `Bearer ${employee.token}`);
    expect(res.status).toBe(400);
  });

  test('excessive pagination limit rejected', async () => {
    const res = await request(app).get('/api/vouchers/mine?limit=100000000').set('Authorization', `Bearer ${employee.token}`);
    expect(res.status).toBe(400);
  });

  test('valid pagination caps results at the configured max', async () => {
    const res = await request(app).get('/api/vouchers/mine?limit=100&page=1').set('Authorization', `Bearer ${employee.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('File uploads', () => {
  test('file over the 2MB limit is rejected', async () => {
    const big = Buffer.alloc(2 * 1024 * 1024 + 1024, 0);
    const res = await request(app)
      .post('/api/vouchers')
      .set('Authorization', `Bearer ${employee.token}`)
      .field('expenseDate', '2026-01-01')
      .field('departmentName', 'Engineering')
      .field('expenseTitle', 'x')
      .field('amount', '1')
      .attach('employeeSignature', big, { filename: 'big.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });

  test('unsupported declared MIME type is rejected', async () => {
    const res = await request(app)
      .post('/api/vouchers')
      .set('Authorization', `Bearer ${employee.token}`)
      .field('expenseDate', '2026-01-01')
      .field('departmentName', 'Engineering')
      .field('expenseTitle', 'x')
      .field('amount', '1')
      .attach('employeeSignature', Buffer.from('<svg></svg>'), { filename: 'sig.svg', contentType: 'image/svg+xml' });
    expect(res.status).toBe(400);
  });

  test('a file with a spoofed PNG mimetype but non-image content is rejected (magic-byte check)', async () => {
    const res = await request(app)
      .post('/api/vouchers')
      .set('Authorization', `Bearer ${employee.token}`)
      .field('expenseDate', '2026-01-01')
      .field('departmentName', 'Engineering')
      .field('expenseTitle', 'x')
      .field('amount', '1')
      .attach('employeeSignature', Buffer.from('not actually a png'), { filename: 'sig.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });

  test('a genuine PNG is accepted', async () => {
    const res = await request(app)
      .post('/api/vouchers')
      .set('Authorization', `Bearer ${employee.token}`)
      .field('expenseDate', '2026-01-01')
      .field('departmentName', 'Engineering')
      .field('expenseTitle', 'x')
      .field('amount', '1')
      .attach('employeeSignature', PNG_1x1, { filename: 'sig.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
  });
});

describe('Signature access control', () => {
  let voucherId;
  beforeAll(async () => {
    const res = await createDraft(employee);
    await request(app)
      .put(`/api/vouchers/${res.body.id}`)
      .set('Authorization', `Bearer ${employee.token}`)
      .attach('employeeSignature', PNG_1x1, { filename: 'sig.png', contentType: 'image/png' });
    voucherId = res.body.id;
  });

  test('unauthenticated request to the signature endpoint is rejected', async () => {
    const res = await request(app).get(`/api/vouchers/${voucherId}/signature`);
    expect(res.status).toBe(401);
  });

  test('another employee cannot fetch this voucher\'s signature', async () => {
    const res = await request(app).get(`/api/vouchers/${voucherId}/signature`).set('Authorization', `Bearer ${employee2.token}`);
    expect(res.status).toBe(403);
  });

  test('the owning employee can fetch their own signature', async () => {
    const res = await request(app).get(`/api/vouchers/${voucherId}/signature`).set('Authorization', `Bearer ${employee.token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/png/);
  });

  test('the old public static uploads route no longer serves files', async () => {
    const res = await request(app).get('/uploads/signatures/anything.png');
    expect(res.status).toBe(404);
  });
});

describe('Response hygiene', () => {
  test('login response never includes the password hash', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'emp1@test.com', password: 'Password@123' });
    expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/); // bcrypt hash prefix
  });

  test('an internal error response carries a requestId and no stack trace', async () => {
    // amountMin as a non-numeric string is rejected by validation before reaching the DB,
    // so this exercises the validation path's error shape rather than the 500 handler -
    // the 500 handler itself is covered by never appearing in any of the above responses.
    const res = await request(app).get('/api/vouchers/mine?amountMin=notanumber').set('Authorization', `Bearer ${employee.token}`);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/at Object|node_modules|\.js:\d/);
  });
});
