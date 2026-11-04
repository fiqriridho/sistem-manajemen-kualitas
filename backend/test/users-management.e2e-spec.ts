import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaClient, users } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/exception.filter.js';

type TestRole = 'admin' | 'evaluator' | 'supervisor';

type UserPayload = {
  email?: string;
  password?: string;
  name?: string;
  role?: 'ADMIN' | 'EVALUATOR' | 'SUPERVISOR';
};

describe('User management (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: App;
  let prisma: PrismaClient;

  const prefix = `users-${Date.now().toString(36)}`;
  const jwtService = new JwtService({ secret: process.env.JWT_SECRET ?? 'default-secret' });
  const tokens: Partial<Record<TestRole, string>> = {};
  const createdUserIds: string[] = [];
  const seeded = {} as Record<TestRole, users>;
  let sequence = 0;

  const bearer = (who: TestRole) => `Bearer ${tokens[who] as string}`;
  const emailFor = (label: string) => `${prefix}-${label}-${++sequence}@example.com`;

  const createUser = async (overrides: UserPayload = {}) => {
    const response = await request(httpServer)
      .post('/api/users')
      .set('Authorization', bearer('admin'))
      .send({
        email: emailFor('user'),
        password: 'secret1',
        name: 'Test User',
        ...overrides,
      });

    expect(response.status).toBe(201);
    createdUserIds.push(response.body.id);
    return response.body as { id: string; email: string; name: string; role: string; isActive: boolean };
  };

  beforeAll(async () => {
    prisma = new PrismaClient();

    seeded.admin = await prisma.users.create({
      data: { email: `${prefix}-admin@example.com`, name: 'Users Admin', password: 'x', role: 'ADMIN' },
    });
    seeded.evaluator = await prisma.users.create({
      data: { email: `${prefix}-evaluator@example.com`, name: 'Users Evaluator', password: 'x', role: 'EVALUATOR' },
    });
    seeded.supervisor = await prisma.users.create({
      data: { email: `${prefix}-supervisor@example.com`, name: 'Users Supervisor', password: 'x', role: 'SUPERVISOR' },
    });

    for (const role of Object.keys(seeded) as TestRole[]) {
      const user = seeded[role];
      tokens[role] = jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    }

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication<INestApplication<App>>();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    httpServer = app.getHttpServer();
  }, 30000);

  afterAll(async () => {
    await app?.close();
    if (!prisma) return;

    const userIds = [...Object.values(seeded).map((user) => user.id), ...createdUserIds];
    await prisma.evaluations.deleteMany({ where: { evaluatorId: { in: userIds } } });
    await prisma.products.deleteMany({ where: { slug: { startsWith: prefix } } });
    await prisma.categories.deleteMany({ where: { slug: { startsWith: prefix } } });
    await prisma.users.deleteMany({
      where: { OR: [{ id: { in: userIds } }, { email: { startsWith: prefix } }] },
    });
    await prisma.$disconnect();
  });

  it('requires JWT for all user management endpoints', async () => {
    const responses = await Promise.all([
      request(httpServer).post('/api/users').send({
        email: emailFor('noauth'),
        password: 'secret1',
        name: 'No Auth',
      }),
      request(httpServer).get('/api/users'),
      request(httpServer).get(`/api/users/${seeded.admin.id}`),
      request(httpServer).patch(`/api/users/${seeded.admin.id}`).send({ name: 'No Auth' }),
      request(httpServer).delete(`/api/users/${seeded.admin.id}`),
    ]);

    expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401, 401]);
  });

  it('forbids non-admin roles from user management', async () => {
    const victim = await createUser({ role: 'SUPERVISOR' });

    for (const who of ['evaluator', 'supervisor'] as TestRole[]) {
      const responses = await Promise.all([
        request(httpServer).post('/api/users').set('Authorization', bearer(who)).send({
          email: emailFor('forbidden'),
          password: 'secret1',
          name: 'Forbidden',
        }),
        request(httpServer).get('/api/users').set('Authorization', bearer(who)),
        request(httpServer).get(`/api/users/${victim.id}`).set('Authorization', bearer(who)),
        request(httpServer).patch(`/api/users/${victim.id}`).set('Authorization', bearer(who)).send({
          name: 'Forbidden Update',
        }),
        request(httpServer).delete(`/api/users/${victim.id}`).set('Authorization', bearer(who)),
      ]);

      expect(responses.map((response) => response.status)).toEqual([403, 403, 403, 403, 403]);
    }

    const after = await request(httpServer)
      .get(`/api/users/${victim.id}`)
      .set('Authorization', bearer('admin'));
    expect(after.status).toBe(200);
    expect(after.body.name).toBe('Test User');
  });

  it('allows admin to create and read a user without exposing password', async () => {
    const created = await createUser({ name: 'Created User', role: 'SUPERVISOR' });

    expect(created.role).toBe('SUPERVISOR');
    expect(created.isActive).toBe(true);
    expect(created).not.toHaveProperty('password');

    const list = await request(httpServer).get('/api/users').set('Authorization', bearer('admin'));
    expect(list.status).toBe(200);
    const listed = list.body.find((user: { id: string }) => user.id === created.id);
    expect(listed).toMatchObject({ email: created.email, name: 'Created User', role: 'SUPERVISOR' });
    expect(listed).not.toHaveProperty('password');

    const detail = await request(httpServer)
      .get(`/api/users/${created.id}`)
      .set('Authorization', bearer('admin'));
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({ email: created.email, name: 'Created User', role: 'SUPERVISOR' });
    expect(detail.body).not.toHaveProperty('password');
  });

  it('defaults the role to EVALUATOR when omitted', async () => {
    const created = await createUser({ name: 'Default Role' });
    expect(created.role).toBe('EVALUATOR');
  });

  it('allows admin to update a user', async () => {
    const created = await createUser({ name: 'Before Update', role: 'EVALUATOR' });

    const response = await request(httpServer)
      .patch(`/api/users/${created.id}`)
      .set('Authorization', bearer('admin'))
      .send({ name: 'After Update', role: 'SUPERVISOR', isActive: false });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: 'After Update', role: 'SUPERVISOR', isActive: false });
    expect(response.body).not.toHaveProperty('password');
  });

  it('allows admin to delete a user without evaluation history', async () => {
    const created = await createUser({ name: 'Delete Me' });

    const remove = await request(httpServer)
      .delete(`/api/users/${created.id}`)
      .set('Authorization', bearer('admin'));
    expect(remove.status).toBe(200);
    expect(remove.body).not.toHaveProperty('password');

    const detail = await request(httpServer)
      .get(`/api/users/${created.id}`)
      .set('Authorization', bearer('admin'));
    expect(detail.status).toBe(404);
  });

  it('rejects deleting a user with evaluation history', async () => {
    const created = await createUser({ name: 'Evaluator With History', role: 'EVALUATOR' });
    const category = await prisma.categories.create({
      data: { name: `${prefix}-history-category`, slug: `${prefix}-history-category` },
    });
    const product = await prisma.products.create({
      data: {
        code: `${prefix}-history-product`,
        name: 'History Product',
        slug: `${prefix}-history-product`,
        categoryId: category.id,
      },
    });
    await prisma.evaluations.create({
      data: { evaluatorId: created.id, productId: product.id },
    });

    const remove = await request(httpServer)
      .delete(`/api/users/${created.id}`)
      .set('Authorization', bearer('admin'));
    expect(remove.status).toBe(409);
    expect(remove.body.message).toBe('User has evaluation history');

    const detail = await request(httpServer)
      .get(`/api/users/${created.id}`)
      .set('Authorization', bearer('admin'));
    expect(detail.status).toBe(200);

    const evaluationCount = await prisma.evaluations.count({ where: { evaluatorId: created.id } });
    expect(evaluationCount).toBe(1);
  });

  it('rejects invalid create and update payloads', async () => {
    const invalidBodies = [
      { email: 'not-an-email', password: 'secret1', name: 'Invalid Email' },
      { email: emailFor('short-password'), password: '123', name: 'Short Password' },
      { email: emailFor('invalid-role'), password: 'secret1', name: 'Invalid Role', role: 'OWNER' },
      { email: emailFor('missing-name'), password: 'secret1' },
    ];

    for (const body of invalidBodies) {
      const response = await request(httpServer)
        .post('/api/users')
        .set('Authorization', bearer('admin'))
        .send(body);
      expect(response.status).toBe(400);
    }

    const target = await createUser({ name: 'Invalid Update' });
    for (const body of [{ isActive: 'true' }, { role: 'OWNER' }, { name: '' }]) {
      const response = await request(httpServer)
        .patch(`/api/users/${target.id}`)
        .set('Authorization', bearer('admin'))
        .send(body);
      expect(response.status).toBe(400);
    }
  });

  it('rejects duplicate email on create and update', async () => {
    const first = await createUser({ name: 'First' });
    const duplicate = await request(httpServer)
      .post('/api/users')
      .set('Authorization', bearer('admin'))
      .send({ email: first.email, password: 'secret1', name: 'Duplicate' });
    expect(duplicate.status).toBe(409);

    const second = await createUser({ name: 'Second' });
    const update = await request(httpServer)
      .patch(`/api/users/${second.id}`)
      .set('Authorization', bearer('admin'))
      .send({ email: first.email });
    expect(update.status).toBe(409);

    const ownEmail = await request(httpServer)
      .patch(`/api/users/${second.id}`)
      .set('Authorization', bearer('admin'))
      .send({ email: second.email, name: 'Second Updated' });
    expect(ownEmail.status).toBe(200);
    expect(ownEmail.body.name).toBe('Second Updated');
  });

  it('returns 404 for missing users', async () => {
    const missingId = randomUUID();
    const responses = await Promise.all([
      request(httpServer).get(`/api/users/${missingId}`).set('Authorization', bearer('admin')),
      request(httpServer)
        .patch(`/api/users/${missingId}`)
        .set('Authorization', bearer('admin'))
        .send({ name: 'Ghost' }),
      request(httpServer).delete(`/api/users/${missingId}`).set('Authorization', bearer('admin')),
    ]);

    expect(responses.map((response) => response.status)).toEqual([404, 404, 404]);
  });
});
