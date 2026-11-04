import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaClient, users } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/exception.filter.js';

type TestUser = 'admin' | 'evaluator' | 'supervisor';

interface Criterion {
  id: string;
  name: string;
  productId: string;
  isActive: boolean;
}

describe('Quality criteria filtering (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: App;
  let prisma: PrismaClient;

  const prefix = `quality-criteria-${Date.now().toString(36)}`;
  const jwtService = new JwtService({ secret: process.env.JWT_SECRET ?? 'default-secret' });
  const usersByRole = {} as Record<TestUser, users>;
  const tokens: Partial<Record<TestUser, string>> = {};

  let category: { id: string };
  let product1: { id: string };
  let product2: { id: string };
  let activeCriteria1: Criterion;
  let inactiveCriteria1: Criterion;
  let activeCriteria2: Criterion;

  const bearer = (who: TestUser) => `Bearer ${tokens[who] as string}`;
  const getCriteria = (who: TestUser, query: Record<string, string>) =>
    request(httpServer).get('/api/quality-criteria').query(query).set('Authorization', bearer(who));
  const getActiveCriteria = (who: TestUser, query: Record<string, string>) =>
    request(httpServer).get('/api/quality-criteria/active').query(query).set('Authorization', bearer(who));

  beforeAll(async () => {
    prisma = new PrismaClient();

    const admin = await prisma.users.create({
      data: { email: `${prefix}-admin@example.com`, name: 'Criteria Admin', password: 'x', role: 'ADMIN' },
    });
    const evaluator = await prisma.users.create({
      data: { email: `${prefix}-evaluator@example.com`, name: 'Criteria Evaluator', password: 'x', role: 'EVALUATOR' },
    });
    const supervisor = await prisma.users.create({
      data: { email: `${prefix}-supervisor@example.com`, name: 'Criteria Supervisor', password: 'x', role: 'SUPERVISOR' },
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
    product1 = await prisma.products.create({
      data: {
        code: `${prefix}-product-1`,
        name: `${prefix}-product-1`,
        slug: `${prefix}-product-1`,
        categoryId: category.id,
      },
    });
    product2 = await prisma.products.create({
      data: {
        code: `${prefix}-product-2`,
        name: `${prefix}-product-2`,
        slug: `${prefix}-product-2`,
        categoryId: category.id,
      },
    });

    activeCriteria1 = await prisma.quality_criteria.create({
      data: {
        productId: product1.id,
        name: `${prefix}-active-1`,
        method: 'RATING',
        standard: { minimum: 3 },
        isRequired: true,
        isActive: true,
      },
    });
    inactiveCriteria1 = await prisma.quality_criteria.create({
      data: {
        productId: product1.id,
        name: `${prefix}-inactive-1`,
        method: 'RATING',
        standard: { minimum: 2 },
        isRequired: true,
        isActive: false,
      },
    });
    activeCriteria2 = await prisma.quality_criteria.create({
      data: {
        productId: product2.id,
        name: `${prefix}-active-2`,
        method: 'RATING',
        standard: { minimum: 4 },
        isRequired: true,
        isActive: true,
      },
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
    if (!prisma) return;

    const userIds = Object.values(usersByRole).map((user) => user.id);
    await prisma.evaluations.deleteMany({ where: { evaluatorId: { in: userIds } } });
    await prisma.quality_criteria.deleteMany({ where: { name: { startsWith: prefix } } });
    await prisma.products.deleteMany({ where: { slug: { startsWith: prefix } } });
    await prisma.categories.deleteMany({ where: { slug: { startsWith: prefix } } });
    await prisma.users.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it('filters criteria list by product', async () => {
    const response = await getCriteria('admin', { productId: product1.id });
    expect(response.status).toBe(200);

    const criteria = response.body as Criterion[];
    expect(criteria.map((item) => item.id).sort()).toEqual([activeCriteria1.id, inactiveCriteria1.id].sort());
  });

  it('filters active criteria by product', async () => {
    const product1Response = await getActiveCriteria('admin', { productId: product1.id });
    expect(product1Response.status).toBe(200);
    expect((product1Response.body as Criterion[]).map((item) => item.id)).toEqual([activeCriteria1.id]);

    const product2Response = await getActiveCriteria('admin', { productId: product2.id });
    expect(product2Response.status).toBe(200);
    expect((product2Response.body as Criterion[]).map((item) => item.id)).toEqual([activeCriteria2.id]);
  });

  it('keeps all-criteria and active-criteria behavior without product filter', async () => {
    const listResponse = await getCriteria('admin');
    expect(listResponse.status).toBe(200);
    expect((listResponse.body as Criterion[]).map((item) => item.id)).toEqual(
      expect.arrayContaining([activeCriteria1.id, inactiveCriteria1.id, activeCriteria2.id]),
    );

    const activeResponse = await getActiveCriteria('admin');
    expect(activeResponse.status).toBe(200);
    expect((activeResponse.body as Criterion[]).map((item) => item.id)).toEqual(
      expect.arrayContaining([activeCriteria1.id, activeCriteria2.id]),
    );
    expect((activeResponse.body as Criterion[]).map((item) => item.id)).not.toContain(inactiveCriteria1.id);
  });

  it('rejects invalid productId query values', async () => {
    const invalidList = await getCriteria('admin', { productId: 'not-a-uuid' });
    expect(invalidList.status).toBe(400);

    const invalidActive = await getActiveCriteria('admin', { productId: 'not-a-uuid' });
    expect(invalidActive.status).toBe(400);
  });

  it('returns 404 when creating criteria with missing product', async () => {
    const response = await request(httpServer)
      .post('/api/quality-criteria')
      .set('Authorization', bearer('admin'))
      .send({
        productId: randomUUID(),
        name: `${prefix}-missing-product-criteria`,
        method: 'RATING',
        standard: { minimum: 1 },
        isRequired: true,
        isActive: true,
      });
    expect(response.status).toBe(404);
  });

  it('allows evaluator to read criteria and restricts write endpoints to admin', async () => {
    const evaluatorList = await getCriteria('evaluator', { productId: product1.id });
    expect(evaluatorList.status).toBe(200);

    const evaluatorActive = await getActiveCriteria('evaluator', { productId: product1.id });
    expect(evaluatorActive.status).toBe(200);

    const evaluatorCreate = await request(httpServer)
      .post('/api/quality-criteria')
      .set('Authorization', bearer('evaluator'))
      .send({
        productId: product1.id,
        name: `${prefix}-evaluator-criteria`,
        method: 'RATING',
        standard: { minimum: 1 },
        isRequired: true,
        isActive: true,
      });
    expect(evaluatorCreate.status).toBe(403);

    const evaluatorPatch = await request(httpServer)
      .patch(`/api/quality-criteria/${activeCriteria1.id}`)
      .set('Authorization', bearer('evaluator'))
      .send({ name: `${prefix}-evaluator-renamed` });
    expect(evaluatorPatch.status).toBe(403);

    const evaluatorDelete = await request(httpServer)
      .delete(`/api/quality-criteria/${activeCriteria1.id}`)
      .set('Authorization', bearer('evaluator'));
    expect(evaluatorDelete.status).toBe(403);

    const supervisorCreate = await request(httpServer)
      .post('/api/quality-criteria')
      .set('Authorization', bearer('supervisor'))
      .send({
        productId: product1.id,
        name: `${prefix}-supervisor-criteria`,
        method: 'RATING',
        standard: { minimum: 1 },
        isRequired: true,
        isActive: true,
      });
    expect(supervisorCreate.status).toBe(403);
  });

  it('creates criteria for existing product', async () => {
    const response = await request(httpServer)
      .post('/api/quality-criteria')
      .set('Authorization', bearer('admin'))
      .send({
        productId: product2.id,
        name: `${prefix}-new-criteria`,
        method: 'RATING',
        standard: { minimum: 2 },
        isRequired: true,
        isActive: true,
      });
    expect(response.status).toBe(201);
    expect(response.body.productId).toBe(product2.id);
  });

  it('snapshots only active product criteria for new evaluation', async () => {
    const response = await request(httpServer)
      .post('/api/evaluations')
      .set('Authorization', bearer('evaluator'))
      .send({ productId: product1.id });
    expect(response.status).toBe(201);
    expect(response.body.evaluation_details.map((detail: { criteriaId: string }) => detail.criteriaId)).toEqual([
      activeCriteria1.id,
    ]);
  });
});
