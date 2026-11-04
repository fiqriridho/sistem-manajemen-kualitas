import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaClient, users } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/exception.filter.js';

type TestUser = 'admin' | 'supervisor' | 'evaluator';

describe('Security guards (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: App;
  let prisma: PrismaClient;

  const prefix = `guards-${Date.now().toString(36)}`;
  const jwtService = new JwtService({ secret: process.env.JWT_SECRET ?? 'default-secret' });

  let usersByRole: Record<TestUser, users>;
  const tokens: Partial<Record<TestUser, string>> = {};
  let seededCategory: { id: string };

  const bearer = (who: TestUser) => `Bearer ${tokens[who] as string}`;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const admin = await prisma.users.create({
      data: { email: `${prefix}-admin@example.com`, name: 'Guards Admin', password: 'x', role: 'ADMIN' },
    });
    const supervisor = await prisma.users.create({
      data: {
        email: `${prefix}-supervisor@example.com`,
        name: 'Guards Supervisor',
        password: 'x',
        role: 'SUPERVISOR',
      },
    });
    const evaluator = await prisma.users.create({
      data: {
        email: `${prefix}-evaluator@example.com`,
        name: 'Guards Evaluator',
        password: 'x',
        role: 'EVALUATOR',
      },
    });
    usersByRole = { admin, supervisor, evaluator };

    for (const name of Object.keys(usersByRole) as TestUser[]) {
      const user = usersByRole[name];
      tokens[name] = jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    }

    seededCategory = await prisma.categories.create({
      data: { name: `${prefix}-seeded`, slug: `${prefix}-seeded` },
    });

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
    if (prisma) {
      const userIds = Object.values(usersByRole).map((user) => user.id);
      await prisma.evaluations.deleteMany({ where: { evaluatorId: { in: userIds } } });
      await prisma.categories.deleteMany({ where: { slug: { startsWith: prefix } } });
      await prisma.users.deleteMany({ where: { id: { in: userIds } } });
      await prisma.$disconnect();
    }
  });

  it('requires JWT for categories, dashboard, and reports', async () => {
    const responses = await Promise.all([
      request(httpServer).get('/api/categories'),
      request(httpServer).post('/api/categories').send({
        name: `${prefix}-noauth`,
        slug: `${prefix}-noauth`,
      }),
      request(httpServer).get('/api/dashboard/stats'),
      request(httpServer).get('/api/reports/evaluations/history'),
    ]);

    expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401]);
  });

  it('rejects malformed JWT as 401', async () => {
    const response = await request(httpServer)
      .get('/api/categories')
      .set('Authorization', 'Bearer not-a-jwt');

    expect(response.status).toBe(401);
  });

  it('allows authenticated users to read categories', async () => {
    const response = await request(httpServer)
      .get('/api/categories')
      .set('Authorization', bearer('evaluator'));

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('forbids non-admin category writes', async () => {
    for (const who of ['evaluator', 'supervisor'] as TestUser[]) {
      const create = await request(httpServer)
        .post('/api/categories')
        .set('Authorization', bearer(who))
        .send({ name: `${prefix}-${who}`, slug: `${prefix}-${who}` });
      expect(create.status).toBe(403);

      const update = await request(httpServer)
        .put(`/api/categories/${seededCategory.id}`)
        .set('Authorization', bearer(who))
        .send({ name: `${prefix}-${who}-updated` });
      expect(update.status).toBe(403);
    }

    const remove = await request(httpServer)
      .delete(`/api/categories/${seededCategory.id}`)
      .set('Authorization', bearer('evaluator'));
    expect(remove.status).toBe(403);
  });

  it('allows admin to create, update, and delete categories', async () => {
    const create = await request(httpServer)
      .post('/api/categories')
      .set('Authorization', bearer('admin'))
      .send({ name: `${prefix}-created`, slug: `${prefix}-created` });
    expect(create.status).toBe(201);

    const update = await request(httpServer)
      .put(`/api/categories/${seededCategory.id}`)
      .set('Authorization', bearer('admin'))
      .send({ name: `${prefix}-seeded-updated` });
    expect(update.status).toBe(200);

    const remove = await request(httpServer)
      .delete(`/api/categories/${seededCategory.id}`)
      .set('Authorization', bearer('admin'));
    expect(remove.status).toBe(200);

    const stored = await prisma.categories.findUnique({ where: { id: seededCategory.id } });
    expect(stored).toBeNull();
  });

  it('requires JWT and allows any authenticated role for dashboard', async () => {
    const response = await request(httpServer)
      .get('/api/dashboard/stats')
      .set('Authorization', bearer('evaluator'));

    expect(response.status).toBe(200);
  });

  it('restricts reports to admin and supervisor', async () => {
    const evaluator = await request(httpServer)
      .get('/api/reports/evaluations/history')
      .set('Authorization', bearer('evaluator'));
    expect(evaluator.status).toBe(403);

    for (const who of ['admin', 'supervisor'] as TestUser[]) {
      const response = await request(httpServer)
        .get('/api/reports/evaluations/history')
        .set('Authorization', bearer(who));
      expect(response.status).toBe(200);
    }
  });
});