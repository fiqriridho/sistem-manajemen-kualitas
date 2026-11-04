import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaClient, users } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/exception.filter.js';

type TestUser = 'admin' | 'evaluatorA' | 'evaluatorB' | 'supervisor';

interface EvaluationDetailBody {
  id: string;
  actualValue: unknown;
  result: string;
}

interface EvaluationBody {
  id: string;
  evaluatorId: string;
  status: string;
  evaluation_details: EvaluationDetailBody[];
}

describe('Evaluation API authorization (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: App;
  let prisma: PrismaClient;

  const prefix = `e2e-${Date.now().toString(36)}`;
  const jwtService = new JwtService({ secret: process.env.JWT_SECRET ?? 'default-secret' });

  let usersByRole: Record<TestUser, users>;
  const tokens: Partial<Record<TestUser, string>> = {};

  let category: { id: string };
  let product: { id: string };
  let evaluationA: EvaluationBody;
  let evaluationB: EvaluationBody;
  let detailA: EvaluationDetailBody;
  let detailB: EvaluationDetailBody;

  const bearer = (who: TestUser) => `Bearer ${tokens[who] as string}`;

  const patchBody = (detailId: string, actualValue: number) => ({
    details: [{ id: detailId, actualValue }],
  });

  beforeAll(async () => {
    prisma = new PrismaClient();

    const admin = await prisma.users.create({
      data: { email: `${prefix}-admin@example.com`, name: 'E2E Admin', password: 'x', role: 'ADMIN' },
    });
    const evaluatorA = await prisma.users.create({
      data: { email: `${prefix}-eval-a@example.com`, name: 'E2E Evaluator A', password: 'x', role: 'EVALUATOR' },
    });
    const evaluatorB = await prisma.users.create({
      data: { email: `${prefix}-eval-b@example.com`, name: 'E2E Evaluator B', password: 'x', role: 'EVALUATOR' },
    });
    const supervisor = await prisma.users.create({
      data: { email: `${prefix}-supervisor@example.com`, name: 'E2E Supervisor', password: 'x', role: 'SUPERVISOR' },
    });
    usersByRole = { admin, evaluatorA, evaluatorB, supervisor };

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
        name: 'E2E Product',
        slug: `${prefix}-product`,
        categoryId: category.id,
      },
    });
    await prisma.quality_criteria.create({
      data: {
        productId: product.id,
        name: 'E2E Criteria',
        method: 'NUMERIC',
        standard: { minimum: 1, maximum: 10 },
      },
    });

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication<INestApplication<App>>();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    httpServer = app.getHttpServer();

    const createA = await request(httpServer)
      .post('/api/evaluations')
      .set('Authorization', bearer('evaluatorA'))
      .send({ productId: product.id });
    expect(createA.status).toBe(201);
    evaluationA = createA.body;
    detailA = evaluationA.evaluation_details[0];

    const createB = await request(httpServer)
      .post('/api/evaluations')
      .set('Authorization', bearer('evaluatorB'))
      .send({ productId: product.id });
    expect(createB.status).toBe(201);
    evaluationB = createB.body;
    detailB = evaluationB.evaluation_details[0];
  }, 30000);

  afterAll(async () => {
    await app?.close();
    if (prisma) {
      await prisma.evaluations.deleteMany({
        where: { evaluatorId: { in: Object.values(usersByRole).map((user) => user.id) } },
      });
      await prisma.products.deleteMany({ where: { id: product?.id } });
      await prisma.categories.deleteMany({ where: { id: category?.id } });
      await prisma.users.deleteMany({ where: { id: { in: Object.values(usersByRole).map((user) => user.id) } } });
      await prisma.$disconnect();
    }
  });

  it('rejects unauthenticated requests on every evaluation route', async () => {
    const responses = await Promise.all([
      request(httpServer).post('/api/evaluations').send({ productId: product.id }),
      request(httpServer).get('/api/evaluations'),
      request(httpServer).get(`/api/evaluations/${evaluationA.id}`),
      request(httpServer).get(`/api/evaluations/${evaluationA.id}/status`),
      request(httpServer).patch(`/api/evaluations/${evaluationA.id}`).send(patchBody(detailA.id, 5)),
      request(httpServer).delete(`/api/evaluations/${evaluationA.id}`),
    ]);

    expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401, 401, 401]);
  });

  it('forbids ADMIN and SUPERVISOR from creating evaluations', async () => {
    for (const who of ['admin', 'supervisor'] as TestUser[]) {
      const response = await request(httpServer)
        .post('/api/evaluations')
        .set('Authorization', bearer(who))
        .send({ productId: product.id });

      expect(response.status).toBe(403);
    }
  });

  it('rejects tokens with an unknown role', async () => {
    const token = jwtService.sign({
      sub: usersByRole.evaluatorA.id,
      email: usersByRole.evaluatorA.email,
      role: 'GUEST',
    });

    const response = await request(httpServer)
      .get('/api/evaluations')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it('ignores evaluatorId from the request body', async () => {
    const response = await request(httpServer)
      .post('/api/evaluations')
      .set('Authorization', bearer('evaluatorA'))
      .send({ productId: product.id, evaluatorId: usersByRole.evaluatorB.id });

    expect(response.status).toBe(201);
    expect(response.body.evaluatorId).toBe(usersByRole.evaluatorA.id);
  });

  it('scopes the evaluation list to the authenticated evaluator', async () => {
    const asA = await request(httpServer)
      .get(`/api/evaluations?productId=${product.id}`)
      .set('Authorization', bearer('evaluatorA'));
    expect(asA.status).toBe(200);
    expect(asA.body.length).toBeGreaterThan(0);
    expect(asA.body.every((evaluation: EvaluationBody) => evaluation.evaluatorId === usersByRole.evaluatorA.id)).toBe(true);
    expect(asA.body.map((evaluation: EvaluationBody) => evaluation.id)).toContain(evaluationA.id);

    const asB = await request(httpServer)
      .get(`/api/evaluations?productId=${product.id}`)
      .set('Authorization', bearer('evaluatorB'));
    expect(asB.status).toBe(200);
    expect(asB.body.every((evaluation: EvaluationBody) => evaluation.evaluatorId === usersByRole.evaluatorB.id)).toBe(true);

    for (const who of ['admin', 'supervisor'] as TestUser[]) {
      const response = await request(httpServer)
        .get(`/api/evaluations?productId=${product.id}`)
        .set('Authorization', bearer(who));
      const ids = response.body.map((evaluation: EvaluationBody) => evaluation.id);
      expect(response.status).toBe(200);
      expect(ids).toContain(evaluationA.id);
      expect(ids).toContain(evaluationB.id);
    }
  });

  it('rejects an invalid status filter', async () => {
    const response = await request(httpServer)
      .get('/api/evaluations?status=WHATEVER')
      .set('Authorization', bearer('supervisor'));
    expect(response.status).toBe(400);
  });

  it('allows an evaluator to read their own evaluation and status', async () => {
    const detail = await request(httpServer)
      .get(`/api/evaluations/${evaluationA.id}`)
      .set('Authorization', bearer('evaluatorA'));
    expect(detail.status).toBe(200);

    const status = await request(httpServer)
      .get(`/api/evaluations/${evaluationA.id}/status`)
      .set('Authorization', bearer('evaluatorA'));
    expect(status.status).toBe(200);
    expect(['PASS', 'FAIL', 'INCOMPLETE']).toContain(status.body.status);
  });

  it('forbids reading and checking status of another evaluator evaluation', async () => {
    const detail = await request(httpServer)
      .get(`/api/evaluations/${evaluationB.id}`)
      .set('Authorization', bearer('evaluatorA'));
    expect(detail.status).toBe(403);

    const status = await request(httpServer)
      .get(`/api/evaluations/${evaluationB.id}/status`)
      .set('Authorization', bearer('evaluatorA'));
    expect(status.status).toBe(403);
  });

  it('forbids updating another evaluator evaluation', async () => {
    const response = await request(httpServer)
      .patch(`/api/evaluations/${evaluationB.id}`)
      .set('Authorization', bearer('evaluatorA'))
      .send(patchBody(detailB.id, 9));
    expect(response.status).toBe(403);

    const stored = await prisma.evaluation_details.findUnique({ where: { id: detailB.id } });
    expect(stored?.actualValue).toBeNull();
  });

  it('rejects a detail id that belongs to another evaluation', async () => {
    const response = await request(httpServer)
      .patch(`/api/evaluations/${evaluationA.id}`)
      .set('Authorization', bearer('evaluatorA'))
      .send(patchBody(detailB.id, 9));
    expect(response.status).toBe(400);

    const foreign = await prisma.evaluation_details.findUnique({ where: { id: detailB.id } });
    expect(foreign?.actualValue).toBeNull();

    const ownEvaluation = await prisma.evaluations.findUnique({ where: { id: evaluationA.id } });
    expect(ownEvaluation?.status).toBe('INCOMPLETE');
  });

  it('rejects duplicated detail ids', async () => {
    const response = await request(httpServer)
      .patch(`/api/evaluations/${evaluationA.id}`)
      .set('Authorization', bearer('evaluatorA'))
      .send({ details: [patchBody(detailA.id, 5).details[0], patchBody(detailA.id, 6).details[0]] });
    expect(response.status).toBe(400);

    const stored = await prisma.evaluation_details.findUnique({ where: { id: detailA.id } });
    expect(stored?.actualValue).toBeNull();
  });

  it('updates a detail that belongs to the evaluation', async () => {
    const response = await request(httpServer)
      .patch(`/api/evaluations/${evaluationA.id}`)
      .set('Authorization', bearer('evaluatorA'))
      .send(patchBody(detailA.id, 7));
    expect(response.status).toBe(200);

    const updatedDetail = response.body.evaluation_details.find((detail: EvaluationDetailBody) => detail.id === detailA.id);
    expect(updatedDetail.actualValue).toBe(7);
  });

  it('restricts deletion to ADMIN', async () => {
    const target = await request(httpServer)
      .post('/api/evaluations')
      .set('Authorization', bearer('evaluatorA'))
      .send({ productId: product.id });
    expect(target.status).toBe(201);

    for (const who of ['evaluatorA', 'supervisor'] as TestUser[]) {
      const response = await request(httpServer)
        .delete(`/api/evaluations/${target.body.id}`)
        .set('Authorization', bearer(who));
      expect(response.status).toBe(403);
    }

    const asAdmin = await request(httpServer)
      .delete(`/api/evaluations/${target.body.id}`)
      .set('Authorization', bearer('admin'));
    expect(asAdmin.status).toBe(200);

    const stored = await prisma.evaluations.findUnique({ where: { id: target.body.id } });
    expect(stored).toBeNull();
  });
});