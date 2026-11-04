import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaClient, users } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/exception.filter.js';

type TestUser = 'admin' | 'evaluator' | 'supervisor';

describe('Data integrity (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: App;
  let prisma: PrismaClient;

  const prefix = `integrity-${Date.now().toString(36)}`;
  const jwtService = new JwtService({ secret: process.env.JWT_SECRET ?? 'default-secret' });
  const usersByRole = {} as Record<TestUser, users>;
  const tokens: Partial<Record<TestUser, string>> = {};

  let category: { id: string };
  let product: { id: string };
  let criteria: { id: string };
  let evaluation: { id: string };
  let evaluationDetail: { id: string };
  let cleanCategory: { id: string };
  let cleanProduct: { id: string };
  let cleanCriteria: { id: string };

  const bearer = (who: TestUser) => `Bearer ${tokens[who] as string}`;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const admin = await prisma.users.create({
      data: { email: `${prefix}-admin@example.com`, name: 'Integrity Admin', password: 'x', role: 'ADMIN' },
    });
    const evaluator = await prisma.users.create({
      data: { email: `${prefix}-evaluator@example.com`, name: 'Integrity Evaluator', password: 'x', role: 'EVALUATOR' },
    });
    const supervisor = await prisma.users.create({
      data: { email: `${prefix}-supervisor@example.com`, name: 'Integrity Supervisor', password: 'x', role: 'SUPERVISOR' },
    });
    usersByRole.admin = admin;
    usersByRole.evaluator = evaluator;
    usersByRole.supervisor = supervisor;
    tokens.admin = jwtService.sign({ sub: admin.id, email: admin.email, role: 'ADMIN' });
    tokens.evaluator = jwtService.sign({ sub: evaluator.id, email: evaluator.email, role: 'EVALUATOR' });
    tokens.supervisor = jwtService.sign({ sub: supervisor.id, email: supervisor.email, role: 'SUPERVISOR' });

    category = await prisma.categories.create({
      data: { name: `${prefix}-category`, slug: `${prefix}-category` },
    });
    product = await prisma.products.create({
      data: {
        code: `${prefix}-product`,
        name: `${prefix}-product`,
        slug: `${prefix}-product`,
        categoryId: category.id,
      },
    });
    criteria = await prisma.quality_criteria.create({
      data: {
        productId: product.id,
        name: `${prefix}-criteria`,
        method: 'RATING',
        standard: { minimum: 1, maximum: 5 },
        isRequired: true,
        isActive: true,
      },
    });
    evaluation = await prisma.evaluations.create({
      data: { productId: product.id, evaluatorId: evaluator.id },
    });
    evaluationDetail = await prisma.evaluation_details.create({
      data: {
        evaluationId: evaluation.id,
        criteriaId: criteria.id,
        criteriaName: criteria.name,
        method: 'RATING',
        standardSnapshot: { minimum: 1, maximum: 5 },
        actualValue: 5,
        result: 'PASS',
        isRequired: true,
      },
    });

    cleanProduct = await prisma.products.create({
      data: {
        code: `${prefix}-clean-product`,
        name: `${prefix}-clean-product`,
        slug: `${prefix}-clean-product`,
        categoryId: category.id,
      },
    });
    cleanCriteria = await prisma.quality_criteria.create({
      data: {
        productId: product.id,
        name: `${prefix}-clean-criteria`,
        method: 'RATING',
        standard: { minimum: 1, maximum: 5 },
        isRequired: true,
        isActive: true,
      },
    });
    cleanCategory = await prisma.categories.create({
      data: { name: `${prefix}-clean-category`, slug: `${prefix}-clean-category` },
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

  it('preserves evaluation history when deleting a product with evaluations', async () => {
    const response = await request(httpServer)
      .delete(`/api/products/${product.id}`)
      .set('Authorization', bearer('admin'));
    expect(response.status).toBe(409);

    const storedProduct = await prisma.products.findUnique({ where: { id: product.id } });
    const storedEvaluation = await prisma.evaluations.findUnique({ where: { id: evaluation.id } });
    expect(storedProduct).not.toBeNull();
    expect(storedEvaluation).not.toBeNull();
  });

  it('preserves products when deleting a category with products', async () => {
    const response = await request(httpServer)
      .delete(`/api/categories/${category.id}`)
      .set('Authorization', bearer('admin'));
    expect(response.status).toBe(409);

    const storedCategory = await prisma.categories.findUnique({ where: { id: category.id } });
    const storedProduct = await prisma.products.findUnique({ where: { id: product.id } });
    expect(storedCategory).not.toBeNull();
    expect(storedProduct).not.toBeNull();
  });

  it('preserves evaluation details when deleting used criteria', async () => {
    const response = await request(httpServer)
      .delete(`/api/quality-criteria/${criteria.id}`)
      .set('Authorization', bearer('admin'));
    expect(response.status).toBe(409);

    const storedCriteria = await prisma.quality_criteria.findUnique({ where: { id: criteria.id } });
    const storedDetail = await prisma.evaluation_details.findUnique({ where: { id: evaluationDetail.id } });
    expect(storedCriteria).not.toBeNull();
    expect(storedDetail).not.toBeNull();
  });

  it('allows admin to delete criteria without evaluation details', async () => {
    const response = await request(httpServer)
      .delete(`/api/quality-criteria/${cleanCriteria.id}`)
      .set('Authorization', bearer('admin'));
    expect(response.status).toBe(200);

    const storedCriteria = await prisma.quality_criteria.findUnique({ where: { id: cleanCriteria.id } });
    expect(storedCriteria).toBeNull();
  });

  it('allows admin to delete product without evaluations', async () => {
    const response = await request(httpServer)
      .delete(`/api/products/${cleanProduct.id}`)
      .set('Authorization', bearer('admin'));
    expect(response.status).toBe(200);

    const storedProduct = await prisma.products.findUnique({ where: { id: cleanProduct.id } });
    expect(storedProduct).toBeNull();
  });

  it('allows admin to delete category without products', async () => {
    const response = await request(httpServer)
      .delete(`/api/categories/${cleanCategory.id}`)
      .set('Authorization', bearer('admin'));
    expect(response.status).toBe(200);

    const storedCategory = await prisma.categories.findUnique({ where: { id: cleanCategory.id } });
    expect(storedCategory).toBeNull();
  });

  it('forbids non-admin delete attempts on protected master data', async () => {
    const responses = await Promise.all([
      request(httpServer).delete(`/api/products/${product.id}`).set('Authorization', bearer('evaluator')),
      request(httpServer).delete(`/api/categories/${category.id}`).set('Authorization', bearer('evaluator')),
      request(httpServer).delete(`/api/quality-criteria/${criteria.id}`).set('Authorization', bearer('evaluator')),
      request(httpServer).delete(`/api/products/${product.id}`).set('Authorization', bearer('supervisor')),
      request(httpServer).delete(`/api/categories/${category.id}`).set('Authorization', bearer('supervisor')),
      request(httpServer).delete(`/api/quality-criteria/${criteria.id}`).set('Authorization', bearer('supervisor')),
    ]);

    expect(responses.map((response) => response.status)).toEqual([403,403,403,403,403,403]);

    const storedProduct = await prisma.products.findUnique({ where: { id: product.id } });
    const storedEvaluation = await prisma.evaluations.findUnique({ where: { id: evaluation.id } });
    const storedDetail = await prisma.evaluation_details.findUnique({ where: { id: evaluationDetail.id } });
    expect(storedProduct).not.toBeNull();
    expect(storedEvaluation).not.toBeNull();
    expect(storedDetail).not.toBeNull();
  });
});
