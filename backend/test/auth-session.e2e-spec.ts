import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaClient, users } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types.js';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/exception.filter.js';

type TestRole = 'ADMIN' | 'EVALUATOR' | 'SUPERVISOR';

describe('Auth session validation (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: App;
  let prisma: PrismaClient;

  const prefix = `session-${Date.now().toString(36)}`;
  const jwtService = new JwtService({ secret: process.env.JWT_SECRET ?? 'default-secret' });
  const password = 'secret1';
  let passwordHash: string;
  let sequence = 0;

  const bearer = (token: string) => `Bearer ${token}`;
  const emailFor = (label: string) => `${prefix}-${label}-${++sequence}@example.com`;

  const createUser = async (
    label: string,
    overrides: { role?: TestRole; isActive?: boolean } = {},
  ): Promise<users> => {
    const role = overrides.role ?? 'EVALUATOR';
    const isActive = overrides.isActive ?? true;

    return prisma.users.create({
      data: {
        email: emailFor(label),
        name: `Session ${label}`,
        password: passwordHash,
        role,
        isActive,
      },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
  };

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 10);
    prisma = new PrismaClient();

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
      await prisma.users.deleteMany({ where: { email: { startsWith: prefix } } });
      await prisma.$disconnect();
    }
  });

  it('allows active user to log in without exposing password', async () => {
    const user = await createUser('login-active', { role: 'ADMIN' });

    const response = await request(httpServer)
      .post('/api/auth/login')
      .send({ email: user.email, password });

    expect(response.status).toBe(201);
    expect(response.body.access_token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'ADMIN',
    });
    expect(response.body.user.password).toBeUndefined();
  });

  it('rejects login for inactive user', async () => {
    const inactive = await createUser('login-inactive-check', { role: 'EVALUATOR', isActive: false });

    const response = await request(httpServer)
      .post('/api/auth/login')
      .send({ email: inactive.email, password });

    expect(response.status).toBe(401);
  });

  it('rejects token issued before user is deactivated', async () => {
    const user = await createUser('deactivate-after-token', { role: 'EVALUATOR' });
    const token = jwtService.sign({ sub: user.id, email: user.email, role: user.role });

    await prisma.users.update({ where: { id: user.id }, data: { isActive: false } });

    const response = await request(httpServer)
      .get('/api/reports/evaluations/history')
      .set('Authorization', bearer(token));

    expect(response.status).toBe(401);
  });

  it('rejects token issued before user is deleted', async () => {
    const user = await createUser('delete-after-token', { role: 'EVALUATOR' });
    const token = jwtService.sign({ sub: user.id, email: user.email, role: user.role });

    await prisma.users.delete({ where: { id: user.id } });

    const response = await request(httpServer)
      .get('/api/reports/evaluations/history')
      .set('Authorization', bearer(token));

    expect(response.status).toBe(401);
  });

  it('applies database role changes to existing token', async () => {
    const evaluator = await createUser('role-change-check', { role: 'EVALUATOR' });
    const token = jwtService.sign({
      sub: evaluator.id,
      email: evaluator.email,
      role: 'EVALUATOR',
    });

    let response = await request(httpServer)
      .get('/api/reports/evaluations/history')
      .set('Authorization', bearer(token));
    expect(response.status).toBe(403);

    await prisma.users.update({ where: { id: evaluator.id }, data: { role: 'ADMIN' } });

    response = await request(httpServer)
      .get('/api/reports/evaluations/history')
      .set('Authorization', bearer(token));
    expect(response.status).toBe(200);
  });

  it('allows active admin token for reports history', async () => {
    const admin = await createUser('active-token-check', { role: 'ADMIN' });
    const token = jwtService.sign({ sub: admin.id, email: admin.email, role: 'ADMIN' });

    const response = await request(httpServer)
      .get('/api/reports/evaluations/history')
      .set('Authorization', bearer(token));

    expect(response.status).toBe(200);
  });

  it('rejects requests without token', async () => {
    const response = await request(httpServer).get('/api/reports/evaluations/history');
    expect(response.status).toBe(401);
  });
});
