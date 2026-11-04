import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaClient, users } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/exception.filter.js';

type TestUser = 'admin' | 'evaluator' | 'evaluator2' | 'supervisor';

interface ProductBody {
  id: string;
  code: string;
  name: string;
  status: string;
  evaluations: Array<{ id: string; evaluatorId: string }>;
}

describe('Product query (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: App;
  let prisma: PrismaClient;

  const prefix = `product-query-${Date.now().toString(36)}`;
  const jwtService = new JwtService({ secret: process.env.JWT_SECRET ?? 'default-secret' });
  const usersByRole = {} as Record<TestUser, users>;
  const tokens: Partial<Record<TestUser, string>> = {};

  let category: { id: string };
  let activeProduct: ProductBody;
  let inactiveProduct: ProductBody;
  let draftProduct: ProductBody;

  const bearer = (who: TestUser) => `Bearer ${tokens[who] as string}`;
  const getProducts = (who: TestUser, query: Record<string, string>) =>
    request(httpServer).get('/api/products').query(query).set('Authorization', bearer(who));
  const productById = (products: ProductBody[], id: string) => {
    const product = products.find((item) => item.id === id);
    if (!product) {
      throw new Error(`Product ${id} tidak ditemukan`);
    }
    return product;
  };

  beforeAll(async () => {
    prisma = new PrismaClient();

    const admin = await prisma.users.create({
      data: { email: `${prefix}-admin@example.com`, name: 'Query Admin', password: 'x', role: 'ADMIN' },
    });
    const evaluator = await prisma.users.create({
      data: { email: `${prefix}-evaluator@example.com`, name: 'Query Evaluator', password: 'x', role: 'EVALUATOR' },
    });
    const evaluator2 = await prisma.users.create({
      data: { email: `${prefix}-evaluator2@example.com`, name: 'Query Evaluator 2', password: 'x', role: 'EVALUATOR' },
    });
    const supervisor = await prisma.users.create({
      data: { email: `${prefix}-supervisor@example.com`, name: 'Query Supervisor', password: 'x', role: 'SUPERVISOR' },
    });
    usersByRole.admin = admin;
    usersByRole.evaluator = evaluator;
    usersByRole.evaluator2 = evaluator2;
    usersByRole.supervisor = supervisor;
    for (const name of Object.keys(usersByRole) as TestUser[]) {
      const user = usersByRole[name];
      tokens[name] = jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    }

    category = await prisma.categories.create({
      data: { name: `${prefix}-category`, slug: `${prefix}-category` },
    });

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication<INestApplication<App>>();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    httpServer = app.getHttpServer();

    const createProduct = (body: Record<string, unknown>) =>
      request(httpServer)
        .post('/api/products')
        .set('Authorization', bearer('admin'))
        .send({ categoryId: category.id, ...body });

    const active = await createProduct({
      code: `${prefix}-alpha-code`,
      name: `${prefix}-alpha`,
      slug: `${prefix}-alpha`,
      status: 'ACTIVE',
    });
    expect(active.status).toBe(201);
    activeProduct = active.body;

    const inactive = await createProduct({
      code: `${prefix}-beta-code`,
      name: `${prefix}-beta`,
      slug: `${prefix}-beta`,
      status: 'INACTIVE',
    });
    expect(inactive.status).toBe(201);
    inactiveProduct = inactive.body;

    const draft = await createProduct({
      code: `${prefix}-gamma-code`,
      name: `${prefix}-gamma`,
      slug: `${prefix}-gamma`,
    });
    expect(draft.status).toBe(201);
    draftProduct = draft.body;
    const criteria = await request(httpServer)
      .post('/api/quality-criteria')
      .set('Authorization', bearer('admin'))
      .send({
        productId: activeProduct.id,
        name: `${prefix}-criteria`,
        method: 'RATING',
        standard: { minimum: 1 },
        isRequired: true,
        isActive: true,
      });
    expect(criteria.status).toBe(201);

    const evaluation = await request(httpServer)
      .post('/api/evaluations')
      .set('Authorization', bearer('evaluator'))
      .send({ productId: activeProduct.id });
    expect(evaluation.status).toBe(201);

    const evaluation2 = await request(httpServer)
      .post('/api/evaluations')
      .set('Authorization', bearer('evaluator2'))
      .send({ productId: activeProduct.id });
    expect(evaluation2.status).toBe(201);
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

  it('creates products with explicit and default lifecycle statuses', () => {
    expect(activeProduct.status).toBe('ACTIVE');
    expect(inactiveProduct.status).toBe('INACTIVE');
    expect(draftProduct.status).toBe('DRAFT');
  });

  it('filters products by category', async () => {
    const response = await getProducts('admin', { categoryId: category.id });
    expect(response.status).toBe(200);

    const ids = (response.body as ProductBody[]).map((product) => product.id).sort();
    expect(ids).toEqual([activeProduct.id, inactiveProduct.id, draftProduct.id].sort());
  });

  it('filters products by lifecycle status', async () => {
    const response = await getProducts('admin', { status: 'ACTIVE' });
    expect(response.status).toBe(200);

    const products = response.body as ProductBody[];
    expect(products.every((product) => product.status === 'ACTIVE')).toBe(true);
    const ids = products.map((product) => product.id);
    expect(ids).toContain(activeProduct.id);
    expect(ids).not.toContain(inactiveProduct.id);
    expect(ids).not.toContain(draftProduct.id);
  });

  it('matches search against product name and code', async () => {
    const byName = await getProducts('admin', {
      categoryId: category.id,
      search: '-alpha',
    });
    expect(byName.status).toBe(200);
    expect((byName.body as ProductBody[]).map((product) => product.id)).toEqual([activeProduct.id]);

    const byCode = await getProducts('admin', {
      categoryId: category.id,
      search: 'beta-code',
    });
    expect(byCode.status).toBe(200);
    expect((byCode.body as ProductBody[]).map((product) => product.id)).toEqual([inactiveProduct.id]);
  });

  it('combines search, category, and status filters', async () => {
    const response = await getProducts('admin', {
      categoryId: category.id,
      status: 'ACTIVE',
      search: '-alpha',
    });
    expect(response.status).toBe(200);
    expect((response.body as ProductBody[]).map((product) => product.id)).toEqual([activeProduct.id]);
  });

  it('returns empty array when no product matches', async () => {
    const response = await getProducts('admin', {
      categoryId: category.id,
      search: 'tidak-ada-produk',
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });


  it('rejects invalid status and category query values', async () => {
    const invalidStatus = await getProducts('admin', { status: 'ARCHIVED' });
    expect(invalidStatus.status).toBe(400);

    const invalidCategory = await getProducts('admin', { categoryId: 'not-a-uuid' });
    expect(invalidCategory.status).toBe(400);
  });

  it('updates product lifecycle status', async () => {
    const response = await request(httpServer)
      .patch(`/api/products/${draftProduct.id}`)
      .set('Authorization', bearer('admin'))
      .send({ status: 'ACTIVE' });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ACTIVE');

    const filtered = await getProducts('admin', {
      categoryId: category.id,
      status: 'ACTIVE',
    });
    expect(filtered.status).toBe(200);
    expect((filtered.body as ProductBody[]).map((product) => product.id).sort()).toEqual(
      [activeProduct.id, draftProduct.id].sort(),
    );
  });

  it('preserves evaluator evaluation visibility in filtered product lists', async () => {
    const evaluatorResponse = await getProducts('evaluator', { categoryId: category.id });
    expect(evaluatorResponse.status).toBe(200);
    const evaluatorProduct = productById(evaluatorResponse.body as ProductBody[], activeProduct.id);
    expect(evaluatorProduct.evaluations).toHaveLength(1);
    expect(evaluatorProduct.evaluations[0].evaluatorId).toBe(usersByRole.evaluator.id);

    for (const who of ['admin', 'supervisor'] as TestUser[]) {
      const response = await getProducts(who, { categoryId: category.id });
      expect(response.status).toBe(200);
      const product = productById(response.body as ProductBody[], activeProduct.id);
      expect(product.evaluations).toHaveLength(2);
    }
  });
});
