import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaClient, users } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/exception.filter.js';

type TestUser = 'admin' | 'evaluator';

interface DetailBody {
  id: string;
  criteriaName: string;
  method: string;
  actualValue: unknown;
  result: string;
  isRequired: boolean;
}

interface EvaluationBody {
  id: string;
  status: string;
  evaluation_details: DetailBody[];
}

describe('Evaluation calculation (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: App;
  let prisma: PrismaClient;

  const prefix = `calc-${Date.now().toString(36)}`;
  const jwtService = new JwtService({ secret: process.env.JWT_SECRET ?? 'default-secret' });

  let usersByRole: Record<TestUser, users>;
  const tokens: Partial<Record<TestUser, string>> = {};

  let category: { id: string };
  let product: { id: string };
  let productSnapshot: { id: string };
  let productNoCriteria: { id: string };
  let productInvalidStandard: { id: string };
  let productCriteriaUpdates: { id: string };

  let ratingSnapshotCriteria: { id: string };
  let passFailSnapshotCriteria: { id: string };
  let ratingUpdateCriteria: { id: string };
  let numericUpdateCriteria: { id: string };
  let ratingMinimumUpdateCriteria: { id: string };

  const bearer = (who: TestUser) => `Bearer ${tokens[who] as string}`;

  const detailOf = (evaluation: EvaluationBody, criteriaName: string): DetailBody => {
    const detail = evaluation.evaluation_details.find(
      (item) => item.criteriaName === criteriaName,
    );
    if (!detail) {
      throw new Error(`Detail ${criteriaName} tidak ditemukan`);
    }
    return detail;
  };

  const createEvaluation = async (productId: string): Promise<EvaluationBody> => {
    const response = await request(httpServer)
      .post('/api/evaluations')
      .set('Authorization', bearer('evaluator'))
      .send({ productId });
    expect(response.status).toBe(201);
    return response.body;
  };

  const patchDetails = (
    evaluationId: string,
    details: Array<{ id: string; actualValue: unknown } & Record<string, unknown>>,
    extra: Record<string, unknown> = {},
  ) =>
    request(httpServer)
      .patch(`/api/evaluations/${evaluationId}`)
      .set('Authorization', bearer('evaluator'))
      .send({ ...extra, details });

  const patchCriteria = (criteriaId: string, body: Record<string, unknown>) =>
    request(httpServer)
      .patch(`/api/quality-criteria/${criteriaId}`)
      .set('Authorization', bearer('admin'))
      .send(body);

  beforeAll(async () => {
    prisma = new PrismaClient();

    const admin = await prisma.users.create({
      data: { email: `${prefix}-admin@example.com`, name: 'Calc Admin', password: 'x', role: 'ADMIN' },
    });
    const evaluator = await prisma.users.create({
      data: {
        email: `${prefix}-evaluator@example.com`,
        name: 'Calc Evaluator',
        password: 'x',
        role: 'EVALUATOR',
      },
    });
    usersByRole = { admin, evaluator };
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
        name: 'Calc Product',
        slug: `${prefix}-product`,
        categoryId: category.id,
      },
    });
    await prisma.quality_criteria.createMany({
      data: [
        {
          productId: product.id,
          name: 'Rating',
          method: 'RATING',
          standard: { minimum: 3 },
          isRequired: true,
          isActive: true,
        },
        {
          productId: product.id,
          name: 'Numeric',
          method: 'NUMERIC',
          standard: { minimum: 10, maximum: 20 },
          isRequired: true,
          isActive: true,
        },
        {
          productId: product.id,
          name: 'PassFail',
          method: 'PASS_FAIL',
          standard: {},
          isRequired: false,
          isActive: true,
        },
      ],
    });

    productSnapshot = await prisma.products.create({
      data: {
        code: `${prefix}-snapshot`,
        name: 'Snapshot Product',
        slug: `${prefix}-snapshot`,
        categoryId: category.id,
      },
    });
    ratingSnapshotCriteria = await prisma.quality_criteria.create({
      data: {
        productId: productSnapshot.id,
        name: 'Snapshot Rating',
        method: 'RATING',
        standard: { minimum: 3 },
        isRequired: true,
        isActive: true,
      },
    });
    passFailSnapshotCriteria = await prisma.quality_criteria.create({
      data: {
        productId: productSnapshot.id,
        name: 'Snapshot PassFail',
        method: 'PASS_FAIL',
        standard: {},
        isRequired: false,
        isActive: true,
      },
    });

    productNoCriteria = await prisma.products.create({
      data: {
        code: `${prefix}-empty`,
        name: 'Empty Product',
        slug: `${prefix}-empty`,
        categoryId: category.id,
      },
    });

    productInvalidStandard = await prisma.products.create({
      data: {
        code: `${prefix}-invalid-standard`,
        name: 'Invalid Standard Product',
        slug: `${prefix}-invalid-standard`,
        categoryId: category.id,
      },
    });
    await prisma.quality_criteria.create({
      data: {
        productId: productInvalidStandard.id,
        name: 'Invalid Rating',
        method: 'RATING',
        standard: { maximum: 20 },
        isRequired: true,
        isActive: true,
      },
    });

    productCriteriaUpdates = await prisma.products.create({
      data: {
        code: `${prefix}-criteria`,
        name: 'Criteria Product',
        slug: `${prefix}-criteria`,
        categoryId: category.id,
      },
    });
    ratingUpdateCriteria = await prisma.quality_criteria.create({
      data: {
        productId: productCriteriaUpdates.id,
        name: 'Rating Update',
        method: 'RATING',
        standard: { minimum: 3 },
        isRequired: true,
        isActive: true,
      },
    });
    numericUpdateCriteria = await prisma.quality_criteria.create({
      data: {
        productId: productCriteriaUpdates.id,
        name: 'Numeric Update',
        method: 'NUMERIC',
        standard: { maximum: 20 },
        isRequired: true,
        isActive: true,
      },
    });
    ratingMinimumUpdateCriteria = await prisma.quality_criteria.create({
      data: {
        productId: productCriteriaUpdates.id,
        name: 'Rating Minimum Update',
        method: 'RATING',
        standard: { minimum: 3 },
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
    if (prisma) {
      const userIds = Object.values(usersByRole).map((user) => user.id);
      await prisma.evaluations.deleteMany({ where: { evaluatorId: { in: userIds } } });
      await prisma.products.deleteMany({ where: { code: { startsWith: prefix } } });
      await prisma.categories.deleteMany({ where: { slug: { startsWith: prefix } } });
      await prisma.users.deleteMany({ where: { id: { in: userIds } } });
      await prisma.$disconnect();
    }
  });

  it('creates an evaluation with all active criteria as SKIPPED', async () => {
    const evaluation = await createEvaluation(product.id);

    expect(evaluation.status).toBe('INCOMPLETE');
    expect(evaluation.evaluation_details).toHaveLength(3);
    expect(evaluation.evaluation_details.every((detail) => detail.result === 'SKIPPED')).toBe(true);
    expect(evaluation.evaluation_details.every((detail) => detail.actualValue === null)).toBe(true);
    expect(detailOf(evaluation, 'PassFail').isRequired).toBe(false);
  });

  it('preserves stored details when a partial patch recalculates status', async () => {
    const evaluation = await createEvaluation(product.id);
    const numeric = detailOf(evaluation, 'Numeric');
    const rating = detailOf(evaluation, 'Rating');

    const first = await patchDetails(evaluation.id, [
      { id: numeric.id, actualValue: 15 },
    ]);
    expect(first.status).toBe(200);
    expect(detailOf(first.body, 'Numeric').result).toBe('PASS');

    const second = await patchDetails(evaluation.id, [{ id: rating.id, actualValue: 4 }]);
    expect(second.status).toBe(200);
    expect(second.body.status).toBe('INCOMPLETE');
    expect(detailOf(second.body, 'Numeric').actualValue).toBe(15);
    expect(detailOf(second.body, 'Numeric').result).toBe('PASS');
    expect(detailOf(second.body, 'PassFail').actualValue).toBeNull();

    const status = await request(httpServer)
      .get(`/api/evaluations/${evaluation.id}/status`)
      .set('Authorization', bearer('evaluator'));
    expect(status.body.status).toBe('INCOMPLETE');
  });

  it('returns PASS when required criteria pass and optional criterion fails', async () => {
    const evaluation = await createEvaluation(product.id);
    const response = await patchDetails(evaluation.id, [
      { id: detailOf(evaluation, 'Rating').id, actualValue: 4 },
      { id: detailOf(evaluation, 'Numeric').id, actualValue: 15 },
      { id: detailOf(evaluation, 'PassFail').id, actualValue: 'FAIL' },
    ]);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('PASS');
    expect(detailOf(response.body, 'PassFail').result).toBe('FAIL');
  });

  it('returns FAIL when a required criterion fails', async () => {
    const evaluation = await createEvaluation(product.id);
    const response = await patchDetails(evaluation.id, [
      { id: detailOf(evaluation, 'Rating').id, actualValue: 2 },
      { id: detailOf(evaluation, 'Numeric').id, actualValue: 15 },
      { id: detailOf(evaluation, 'PassFail').id, actualValue: 'PASS' },
    ]);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('FAIL');
    expect(detailOf(response.body, 'Rating').result).toBe('FAIL');
  });

  it('ignores forged result and status from the client', async () => {
    const evaluation = await createEvaluation(product.id);
    const response = await patchDetails(
      evaluation.id,
      [
        { id: detailOf(evaluation, 'Rating').id, actualValue: 2, result: 'PASS' },
        { id: detailOf(evaluation, 'Numeric').id, actualValue: 15, result: 'PASS' },
        { id: detailOf(evaluation, 'PassFail').id, actualValue: 'PASS', result: 'PASS' },
      ],
      { status: 'PASS' },
    );

    expect(response.status).toBe(200);
    expect(detailOf(response.body, 'Rating').result).toBe('FAIL');
    expect(response.body.status).toBe('FAIL');
  });

  it('keeps INCOMPLETE when an active optional criterion is not filled', async () => {
    const evaluation = await createEvaluation(product.id);
    const response = await patchDetails(evaluation.id, [
      { id: detailOf(evaluation, 'Rating').id, actualValue: 4 },
      { id: detailOf(evaluation, 'Numeric').id, actualValue: 15 },
    ]);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('INCOMPLETE');
    expect(detailOf(response.body, 'PassFail').result).toBe('SKIPPED');
  });

  it('rejects invalid values per criterion type without changing data', async () => {
    const evaluation = await createEvaluation(product.id);
    const rating = detailOf(evaluation, 'Rating');
    const numeric = detailOf(evaluation, 'Numeric');
    const passFail = detailOf(evaluation, 'PassFail');

    for (const actualValue of [0, 6, 2.5, '4', null, true]) {
      const response = await patchDetails(evaluation.id, [{ id: rating.id, actualValue }]);
      expect(response.status).toBe(400);
    }
    for (const actualValue of ['15', null, true]) {
      const response = await patchDetails(evaluation.id, [{ id: numeric.id, actualValue }]);
      expect(response.status).toBe(400);
    }
    for (const actualValue of ['pass', 'FAILED', true, null]) {
      const response = await patchDetails(evaluation.id, [{ id: passFail.id, actualValue }]);
      expect(response.status).toBe(400);
    }

    const stored = await prisma.evaluations.findUnique({
      where: { id: evaluation.id },
      include: { evaluation_details: true },
    });
    expect(stored?.status).toBe('INCOMPLETE');
    expect(stored?.evaluation_details.every((detail) => detail.actualValue === null)).toBe(true);
  });

  it('rejects a null detail element', async () => {
    const evaluation = await createEvaluation(product.id);

    const response = await request(httpServer)
      .patch(`/api/evaluations/${evaluation.id}`)
      .set('Authorization', bearer('evaluator'))
      .send({ details: [null] });

    expect(response.status).toBe(400);
  });

  it('rejects a detail from another evaluation', async () => {
    const first = await createEvaluation(product.id);
    const second = await createEvaluation(product.id);

    const response = await patchDetails(first.id, [
      { id: detailOf(second, 'Rating').id, actualValue: 4 },
    ]);
    expect(response.status).toBe(400);

    const stored = await prisma.evaluation_details.findUnique({
      where: { id: detailOf(second, 'Rating').id },
    });
    expect(stored?.actualValue).toBeNull();
  });

  it('rejects creating an evaluation for a product without active criteria', async () => {
    const response = await request(httpServer)
      .post('/api/evaluations')
      .set('Authorization', bearer('evaluator'))
      .send({ productId: productNoCriteria.id });

    expect(response.status).toBe(400);
  });

  it('rejects creating an evaluation when master standard is invalid', async () => {
    const response = await request(httpServer)
      .post('/api/evaluations')
      .set('Authorization', bearer('evaluator'))
      .send({ productId: productInvalidStandard.id });

    expect(response.status).toBe(400);
  });

  it('uses snapshots after master criteria change', async () => {
    const evaluation = await createEvaluation(productSnapshot.id);

    const updatedRating = await patchCriteria(ratingSnapshotCriteria.id, {
      standard: { minimum: 5 },
    });
    expect(updatedRating.status).toBe(200);
    const updatedPassFail = await patchCriteria(passFailSnapshotCriteria.id, {
      isRequired: true,
    });
    expect(updatedPassFail.status).toBe(200);

    const response = await patchDetails(evaluation.id, [
      { id: detailOf(evaluation, 'Snapshot Rating').id, actualValue: 4 },
      { id: detailOf(evaluation, 'Snapshot PassFail').id, actualValue: 'FAIL' },
    ]);

    expect(response.status).toBe(200);
    expect(detailOf(response.body, 'Snapshot Rating').result).toBe('PASS');
    expect(detailOf(response.body, 'Snapshot PassFail').result).toBe('FAIL');
    expect(response.body.status).toBe('PASS');
  });

  it('validates the effective method and standard on criteria update', async () => {
    const validMethodChange = await patchCriteria(ratingUpdateCriteria.id, {
      method: 'NUMERIC',
    });
    expect(validMethodChange.status).toBe(200);
    expect(validMethodChange.body.method).toBe('NUMERIC');
    expect(validMethodChange.body.standard).toEqual({ minimum: 3 });

    const invalidMethodChange = await patchCriteria(numericUpdateCriteria.id, {
      method: 'RATING',
    });
    expect(invalidMethodChange.status).toBe(400);

    const invalidMinimum = await patchCriteria(ratingMinimumUpdateCriteria.id, {
      standard: { minimum: 2.5 },
    });
    expect(invalidMinimum.status).toBe(400);
  });
});