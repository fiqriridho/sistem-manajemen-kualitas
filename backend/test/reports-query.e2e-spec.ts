import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaClient, users } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/exception.filter.js';

type TestUser = 'admin' | 'supervisor' | 'evaluator';

describe('Reports (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: App;
  let prisma: PrismaClient;

  const prefix = `reports-${Date.now().toString(36)}`;
  const jwtService = new JwtService({ secret: process.env.JWT_SECRET ?? 'default-secret' });
  const usersByRole = {} as Record<TestUser, users>;
  const tokens: Partial<Record<TestUser, string>> = {};

  let admin: users;
  let supervisor: users;
  let evaluator: users;
  let categoryA: { id: string };
  let categoryB: { id: string };
  let productA: { id: string };
  let productB: { id: string };

  const bearer = (who: TestUser) => `Bearer ${tokens[who] as string}`;
  const getHistory = (query: Record<string, string> = {}) =>
    request(httpServer)
      .get('/api/reports/evaluations/history')
      .set('Authorization', bearer('admin'))
      .query(query);

  const getSummary = (query: Record<string, string> = {}) =>
    request(httpServer)
      .get('/api/reports/evaluations/summary')
      .set('Authorization', bearer('admin'))
      .query(query);

  beforeAll(async () => {
    prisma = new PrismaClient();

    admin = await prisma.users.create({
      data: { email: `${prefix}-admin@example.com`, name: 'Reports Admin', password: 'x', role: 'ADMIN' },
    });
    supervisor = await prisma.users.create({
      data: { email: `${prefix}-supervisor@example.com`, name: 'Reports Supervisor', password: 'x', role: 'SUPERVISOR' },
    });
    evaluator = await prisma.users.create({
      data: { email: `${prefix}-evaluator@example.com`, name: 'Reports Evaluator', password: 'x', role: 'EVALUATOR' },
    });
    usersByRole.admin = admin;
    usersByRole.supervisor = supervisor;
    usersByRole.evaluator = evaluator;
    for (const name of Object.keys(usersByRole) as TestUser[]) {
      const user = usersByRole[name];
      tokens[name] = jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    }

    categoryA = await prisma.categories.create({
      data: { name: `${prefix}-category-a`, slug: `${prefix}-category-a` },
    });
    categoryB = await prisma.categories.create({
      data: { name: `${prefix}-category-b`, slug: `${prefix}-category-b` },
    });

    productA = await prisma.products.create({
      data: {
        code: `${prefix}-product-a`,
        name: `${prefix}-product-a`,
        slug: `${prefix}-product-a`,
        categoryId: categoryA.id,
      },
    });
    productB = await prisma.products.create({
      data: {
        code: `${prefix}-product-b`,
        name: `${prefix}-product-b`,
        slug: `${prefix}-product-b`,
        categoryId: categoryB.id,
      },
    });

    await prisma.evaluations.createMany({
      data: [
        {
          productId: productA.id,
          evaluatorId: evaluator.id,
          status: 'FAIL',
          evaluatedAt: new Date('2026-11-01T10:00:00.000Z'),
        },
        {
          productId: productA.id,
          evaluatorId: evaluator.id,
          status: 'PASS',
          evaluatedAt: new Date('2026-11-03T10:00:00.000Z'),
        },
        {
          productId: productB.id,
          evaluatorId: evaluator.id,
          status: 'PASS',
          evaluatedAt: new Date('2026-11-02T10:00:00.000Z'),
        },
        {
          productId: productB.id,
          evaluatorId: evaluator.id,
          status: 'FAIL',
          evaluatedAt: new Date('2026-11-04T10:00:00.000Z'),
        },
      ],
    });

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

    const productIds = [productA.id, productB.id];
    await prisma.evaluations.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.products.deleteMany({ where: { id: { in: productIds } } });
    await prisma.categories.deleteMany({ where: { id: { in: [categoryA.id, categoryB.id] } } });
    await prisma.users.deleteMany({ where: { id: { in: Object.values(usersByRole).map((user) => user.id) } } });
    await prisma.$disconnect();
  });

  it('filters history and summary by category', async () => {
    const history = await getHistory({ categoryId: categoryA.id });
    expect(history.status).toBe(200);
    expect(history.body.data).toHaveLength(2);
    expect(history.body.meta.totalItems).toBe(2);

    const summary = await getSummary({ categoryId: categoryA.id });
    expect(summary.status).toBe(200);
    expect(summary.body).toEqual({
      totalEvaluations: 2,
      byStatus: { PASS: 1, FAIL: 1, INCOMPLETE: 0 },
    });
  });

  it('filters summary and history by product, category, and date range', async () => {
    const history = await getHistory({
      productId: productA.id,
      categoryId: categoryA.id,
      startDate: '2026-11-03',
      endDate: '2026-11-04',
    });
    expect(history.status).toBe(200);
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0].status).toBe('PASS');
    expect(history.body.meta.totalItems).toBe(1);

    const summary = await getSummary({
      productId: productA.id,
      categoryId: categoryA.id,
      startDate: '2026-11-03',
      endDate: '2026-11-04',
    });
    expect(summary.status).toBe(200);
    expect(summary.body).toEqual({
      totalEvaluations: 1,
      byStatus: { PASS: 1, FAIL: 0, INCOMPLETE: 0 },
    });
  });

  it('treats date-only endDate as inclusive end of day', async () => {
    const history = await getHistory({
      productId: productB.id,
      startDate: '2026-11-04',
      endDate: '2026-11-04',
    });
    expect(history.status).toBe(200);
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0].status).toBe('FAIL');

    const summary = await getSummary({
      productId: productB.id,
      startDate: '2026-11-04',
      endDate: '2026-11-04',
    });
    expect(summary.status).toBe(200);
    expect(summary.body).toEqual({
      totalEvaluations: 1,
      byStatus: { PASS: 0, FAIL: 1, INCOMPLETE: 0 },
    });
  });

  it('rejects invalid dates and reversed ranges', async () => {
    const invalidStart = await getHistory({ startDate: 'not-a-date' });
    expect(invalidStart.status).toBe(400);

    const invalidEnd = await getHistory({ endDate: 'not-a-date' });
    expect(invalidEnd.status).toBe(400);

    const reversed = await getHistory({
      startDate: '2026-11-05',
      endDate: '2026-11-04',
    });
    expect(reversed.status).toBe(400);
  });

  it('rejects limit above maximum', async () => {
    const tooHigh = await getHistory({ limit: '101' });
    expect(tooHigh.status).toBe(400);

    const valid = await getHistory({ limit: '100' });
    expect(valid.status).toBe(200);
  });

  it('restricts reports to admin and supervisor', async () => {
    const evaluatorHistory = await request(httpServer)
      .get('/api/reports/evaluations/history')
      .set('Authorization', bearer('evaluator'));
    expect(evaluatorHistory.status).toBe(403);

    const evaluatorSummary = await request(httpServer)
      .get('/api/reports/evaluations/summary')
      .set('Authorization', bearer('evaluator'));
    expect(evaluatorSummary.status).toBe(403);

    for (const who of ['admin', 'supervisor'] as TestUser[]) {
      const history = await request(httpServer)
        .get('/api/reports/evaluations/history')
        .set('Authorization', bearer(who));
      expect(history.status).toBe(200);

      const summary = await request(httpServer)
        .get('/api/reports/evaluations/summary')
        .set('Authorization', bearer(who));
      expect(summary.status).toBe(200);
    }
  });
});
