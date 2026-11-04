import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaClient, users } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/exception.filter.js';

type TestUser = 'admin' | 'supervisor' | 'evaluatorA' | 'evaluatorB' | 'evaluatorC';

interface ProductEvaluation {
  id: string;
  evaluatorId: string;
}

interface ProductBody {
  id: string;
  name: string;
  categories: unknown;
  evaluations: ProductEvaluation[];
}

describe('Product evaluation visibility (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: App;
  let prisma: PrismaClient;

  const prefix = `e2e-product-eval-${Date.now().toString(36)}`;
  const jwtService = new JwtService({ secret: process.env.JWT_SECRET ?? 'default-secret' });

  const usersByRole = {} as Record<TestUser, users>;
  const tokens: Partial<Record<TestUser, string>> = {};

  let category: { id: string };
  let product: { id: string; name: string };
  let evaluationA: { id: string };
  let evaluationB: { id: string };

  const bearer = (who: TestUser) => `Bearer ${tokens[who] as string}`;

  const getProducts = (who: TestUser) =>
    request(httpServer).get('/api/products').set('Authorization', bearer(who));

  const getProduct = (who: TestUser, id: string) =>
    request(httpServer).get(`/api/products/${id}`).set('Authorization', bearer(who));

  beforeAll(async () => {
    prisma = new PrismaClient();

    const admin = await prisma.users.create({
      data: { email: `${prefix}-admin@example.com`, name: 'E2E Product Admin', password: 'x', role: 'ADMIN' },
    });
    const supervisor = await prisma.users.create({
      data: {
        email: `${prefix}-supervisor@example.com`,
        name: 'E2E Product Supervisor',
        password: 'x',
        role: 'SUPERVISOR',
      },
    });
    const evaluatorA = await prisma.users.create({
      data: { email: `${prefix}-eval-a@example.com`, name: 'E2E Product Evaluator A', password: 'x', role: 'EVALUATOR' },
    });
    const evaluatorB = await prisma.users.create({
      data: { email: `${prefix}-eval-b@example.com`, name: 'E2E Product Evaluator B', password: 'x', role: 'EVALUATOR' },
    });
    const evaluatorC = await prisma.users.create({
      data: { email: `${prefix}-eval-c@example.com`, name: 'E2E Product Evaluator C', password: 'x', role: 'EVALUATOR' },
    });
    usersByRole.admin = admin;
    usersByRole.supervisor = supervisor;
    usersByRole.evaluatorA = evaluatorA;
    usersByRole.evaluatorB = evaluatorB;
    usersByRole.evaluatorC = evaluatorC;

    for (const name of Object.keys(usersByRole) as TestUser[]) {
      const user = usersByRole[name];
      tokens[name] = jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    }

    category = await prisma.categories.create({
      data: { name: `${prefix}-category`, slug: `${prefix}-category` },
    });
    product = await prisma.products.create({
      data: {
        code: `${prefix}-product`,
        name: 'E2E Product Evaluation Visibility',
        slug: `${prefix}-product`,
        categoryId: category.id,
      },
    });
    evaluationA = await prisma.evaluations.create({
      data: { productId: product.id, evaluatorId: evaluatorA.id },
    });
    evaluationB = await prisma.evaluations.create({
      data: { productId: product.id, evaluatorId: evaluatorB.id },
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
      if (userIds.length > 0) {
        await prisma.evaluations.deleteMany({ where: { evaluatorId: { in: userIds } } });
      }
      if (product) {
        await prisma.products.deleteMany({ where: { id: product.id } });
      }
      if (category) {
        await prisma.categories.deleteMany({ where: { id: category.id } });
      }
      if (userIds.length > 0) {
        await prisma.users.deleteMany({ where: { id: { in: userIds } } });
      }
      await prisma.$disconnect();
    }
  });

  it('rejects unauthenticated product reads', async () => {
    const responses = await Promise.all([
      request(httpServer).get('/api/products'),
      request(httpServer).get(`/api/products/${product.id}`),
    ]);

    expect(responses.map((response) => response.status)).toEqual([401, 401]);
  });

  it('returns only evaluator A evaluations in the product list', async () => {
    const response = await getProducts('evaluatorA');
    expect(response.status).toBe(200);

    const target = (response.body as ProductBody[]).find((item) => item.id === product.id);
    expect(target).toBeDefined();
    expect(target?.evaluations.map((evaluation) => evaluation.id)).toEqual([evaluationA.id]);

    for (const item of response.body as ProductBody[]) {
      for (const evaluation of item.evaluations) {
        expect(evaluation.evaluatorId).toBe(usersByRole.evaluatorA.id);
      }
    }
  });

  it('returns product details with only evaluator A evaluations', async () => {
    const response = await getProduct('evaluatorA', product.id);
    expect(response.status).toBe(200);

    const body = response.body as ProductBody;
    expect(body.id).toBe(product.id);
    expect(body.name).toBe(product.name);
    expect(body.categories).toBeDefined();
    expect(body.evaluations.map((evaluation) => evaluation.id)).toEqual([evaluationA.id]);
    expect(body.evaluations.some((evaluation) => evaluation.id === evaluationB.id)).toBe(false);
  });

  it('returns only evaluator B evaluations for evaluator B', async () => {
    const response = await getProduct('evaluatorB', product.id);
    expect(response.status).toBe(200);

    const body = response.body as ProductBody;
    expect(body.evaluations.map((evaluation) => evaluation.id)).toEqual([evaluationB.id]);
    expect(body.evaluations.some((evaluation) => evaluation.id === evaluationA.id)).toBe(false);
  });

  it('returns a product with an empty evaluation list for an evaluator without evaluations', async () => {
    const response = await getProduct('evaluatorC', product.id);
    expect(response.status).toBe(200);

    const body = response.body as ProductBody;
    expect(body.id).toBe(product.id);
    expect(body.evaluations).toEqual([]);
  });

  it('returns all evaluations to an admin', async () => {
    const list = await getProducts('admin');
    expect(list.status).toBe(200);
    const target = (list.body as ProductBody[]).find((item) => item.id === product.id);
    expect(target).toBeDefined();
    expect(new Set(target?.evaluations.map((evaluation) => evaluation.id))).toEqual(
      new Set([evaluationA.id, evaluationB.id]),
    );

    const detail = await getProduct('admin', product.id);
    expect(detail.status).toBe(200);
    expect(new Set((detail.body as ProductBody).evaluations.map((evaluation) => evaluation.id))).toEqual(
      new Set([evaluationA.id, evaluationB.id]),
    );
  });

  it('returns all evaluations to a supervisor', async () => {
    const list = await getProducts('supervisor');
    expect(list.status).toBe(200);
    const target = (list.body as ProductBody[]).find((item) => item.id === product.id);
    expect(target).toBeDefined();
    expect(new Set(target?.evaluations.map((evaluation) => evaluation.id))).toEqual(
      new Set([evaluationA.id, evaluationB.id]),
    );

    const detail = await getProduct('supervisor', product.id);
    expect(detail.status).toBe(200);
    expect(new Set((detail.body as ProductBody).evaluations.map((evaluation) => evaluation.id))).toEqual(
      new Set([evaluationA.id, evaluationB.id]),
    );
  });

  it('keeps the product not-found response', async () => {
    const response = await getProduct('admin', '00000000-0000-0000-0000-000000000000');
    expect(response.status).toBe(404);
  });
});
