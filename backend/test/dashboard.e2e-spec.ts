import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaClient, users } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/exception.filter.js';

type TestUser = 'admin' | 'evaluator' | 'supervisor';

interface FixtureProduct {
  id: string;
  name: string;
  slug: string;
}

describe('Dashboard stats (e2e)', () => {
  let app: INestApplication;
  let httpServer: App;
  let prisma: PrismaClient;

  const prefix = `dashboard-${Date.now().toString(36)}`;
  const jwtService = new JwtService({ secret: process.env.JWT_SECRET ?? 'default-secret' });
  const usersByRole = {} as Record<TestUser, users>;
  const tokens: Partial<Record<TestUser, string>> = {};

  let category: { id: string };
  let passProduct: FixtureProduct;
  let failProduct: FixtureProduct;
  let incompleteProduct: FixtureProduct;
  let unevaluatedProduct: FixtureProduct;
  let latestChangedProduct: FixtureProduct;

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

  const bearer = (who: TestUser) => `Bearer ${tokens[who] as string}`;
  const getStats = (who: TestUser) =>
    request(httpServer).get('/api/dashboard/stats').set('Authorization', bearer(who));

  const computeExpectedStats = async () => {
    const allProducts = await prisma.products.findMany({
      include: {
        evaluations: {
          orderBy: [{ evaluatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
          take: 1,
        },
      },
    });
    const allEvaluations = await prisma.evaluations.findMany({
      select: { status: true, evaluatedAt: true },
    });

    const recentSince = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const productsByQualityStatus = { PASS: 0, FAIL: 0, INCOMPLETE: 0, UNEVALUATED: 0 };
    for (const product of allProducts) {
      const latest = product.evaluations[0];
      if (!latest) {
        productsByQualityStatus.UNEVALUATED += 1;
        continue;
      }
      if (latest.status === 'PASS') productsByQualityStatus.PASS += 1;
      else if (latest.status === 'FAIL') productsByQualityStatus.FAIL += 1;
      else if (latest.status === 'INCOMPLETE') productsByQualityStatus.INCOMPLETE += 1;
    }

    const evaluationsByStatus = { PASS: 0, FAIL: 0, INCOMPLETE: 0 };
    for (const evaluation of allEvaluations) {
      if (evaluation.status === 'PASS') evaluationsByStatus.PASS += 1;
      else if (evaluation.status === 'FAIL') evaluationsByStatus.FAIL += 1;
      else if (evaluation.status === 'INCOMPLETE') evaluationsByStatus.INCOMPLETE += 1;
    }

    return {
      totalProducts: await prisma.products.count(),
      totalEvaluations: await prisma.evaluations.count(),
      productsByQualityStatus,
      evaluationsByStatus,
      recentEvaluations: allEvaluations.filter(
        (evaluation) => evaluation.evaluatedAt >= recentSince,
      ).length,
    };
  };

  beforeAll(async () => {
    prisma = new PrismaClient();

    const admin = await prisma.users.create({
      data: { email: `${prefix}-admin@example.com`, name: 'Dashboard Admin', password: 'x', role: 'ADMIN' },
    });
    const evaluator = await prisma.users.create({
      data: { email: `${prefix}-evaluator@example.com`, name: 'Dashboard Evaluator', password: 'x', role: 'EVALUATOR' },
    });
    const supervisor = await prisma.users.create({
      data: { email: `${prefix}-supervisor@example.com`, name: 'Dashboard Supervisor', password: 'x', role: 'SUPERVISOR' },
    });
    usersByRole.admin = admin;
    usersByRole.evaluator = evaluator;
    usersByRole.supervisor = supervisor;
    for (const name of Object.keys(usersByRole) as TestUser[]) {
      const user = usersByRole[name];
      tokens[name] = jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    }

    category = await prisma.categories.create({
      data: { name: `${prefix}-category`, slug: `${prefix}-category` },
    });

    passProduct = await prisma.products.create({
      data: {
        code: `${prefix}-pass-product`,
        name: `${prefix}-pass-product`,
        slug: `${prefix}-pass-product`,
        categoryId: category.id,
      },
    });
    failProduct = await prisma.products.create({
      data: {
        code: `${prefix}-fail-product`,
        name: `${prefix}-fail-product`,
        slug: `${prefix}-fail-product`,
        categoryId: category.id,
      },
    });
    incompleteProduct = await prisma.products.create({
      data: {
        code: `${prefix}-incomplete-product`,
        name: `${prefix}-incomplete-product`,
        slug: `${prefix}-incomplete-product`,
        categoryId: category.id,
      },
    });
    unevaluatedProduct = await prisma.products.create({
      data: {
        code: `${prefix}-unevaluated-product`,
        name: `${prefix}-unevaluated-product`,
        slug: `${prefix}-unevaluated-product`,
        categoryId: category.id,
      },
    });
    latestChangedProduct = await prisma.products.create({
      data: {
        code: `${prefix}-changed-product`,
        name: `${prefix}-changed-product`,
        slug: `${prefix}-changed-product`,
        categoryId: category.id,
      },
    });

    await prisma.evaluations.create({
      data: {
        productId: passProduct.id,
        evaluatorId: evaluator.id,
        status: 'PASS',
        evaluatedAt: oneHourAgo,
      },
    });
    await prisma.evaluations.create({
      data: {
        productId: failProduct.id,
        evaluatorId: evaluator.id,
        status: 'FAIL',
        evaluatedAt: oneHourAgo,
      },
    });
    await prisma.evaluations.create({
      data: {
        productId: incompleteProduct.id,
        evaluatorId: evaluator.id,
        status: 'INCOMPLETE',
        evaluatedAt: oneHourAgo,
      },
    });
    await prisma.evaluations.create({
      data: {
        productId: latestChangedProduct.id,
        evaluatorId: evaluator.id,
        status: 'FAIL',
        evaluatedAt: tenDaysAgo,
      },
    });
    await prisma.evaluations.create({
      data: {
        productId: latestChangedProduct.id,
        evaluatorId: evaluator.id,
        status: 'PASS',
        evaluatedAt: fiveMinutesAgo,
      },
    });

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication<INestApplication>();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    httpServer = app.getHttpServer();
  }, 30000);

  afterAll(async () => {
    await app?.close();
    if (!prisma) return;

    const productIds = [
      passProduct.id,
      failProduct.id,
      incompleteProduct.id,
      unevaluatedProduct.id,
      latestChangedProduct.id,
    ];
    await prisma.evaluations.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.products.deleteMany({ where: { slug: { startsWith: prefix } } });
    await prisma.categories.deleteMany({ where: { slug: { startsWith: prefix } } });
    await prisma.users.deleteMany({ where: { id: { in: Object.values(usersByRole).map((u) => u.id) } } });
    await prisma.$disconnect();
  });

  it('returns real dashboard stats for every authenticated role', async () => {
    const latestByProduct = await prisma.products.findMany({
      where: { slug: { startsWith: prefix } },
      include: {
        evaluations: {
          orderBy: [{ evaluatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
          take: 1,
        },
      },
    });
    const latestStatus = Object.fromEntries(
      latestByProduct.map((product) => [product.id, product.evaluations[0]?.status ?? null]),
    );

    expect(latestStatus[passProduct.id]).toBe('PASS');
    expect(latestStatus[failProduct.id]).toBe('FAIL');
    expect(latestStatus[incompleteProduct.id]).toBe('INCOMPLETE');
    expect(latestStatus[unevaluatedProduct.id]).toBeNull();
    expect(latestStatus[latestChangedProduct.id]).toBe('PASS');

    const expected = await computeExpectedStats();

    for (const who of ['admin', 'evaluator', 'supervisor'] as TestUser[]) {
      const response = await getStats(who);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(expected);
    }
  });

  it('rejects unauthenticated dashboard access', async () => {
    const response = await request(httpServer).get('/api/dashboard/stats');
    expect(response.status).toBe(401);
  });
});
