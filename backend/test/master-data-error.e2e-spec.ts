import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/exception.filter.js';

describe('Master data error mapping (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: App;
  let prisma: PrismaClient;

  const prefix = `master-error-${Date.now().toString(36)}`;
  const jwtService = new JwtService({ secret: process.env.JWT_SECRET ?? 'default-secret' });
  const tokens: { admin: string } = { admin: '' };
  const bearer = (who: 'admin') => `Bearer ${tokens[who] as string}`;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const admin = await prisma.users.create({
      data: { email: `${prefix}-admin@example.com`, name: 'Master Error Admin', password: 'x', role: 'ADMIN' },
    });
    tokens.admin = jwtService.sign({ sub: admin.id, email: admin.email, role: admin.role });

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication<INestApplication<App>>();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 409 when creating a product with a duplicate code', async () => {
    const category = await prisma.categories.create({
      data: { name: `${prefix}-category`, slug: `${prefix}-category` },
    });
    const first = await request(httpServer)
      .post('/api/products')
      .set('Authorization', bearer('admin'))
      .send({
        code: `${prefix}-duplicate-code`,
        name: `${prefix}-duplicate-name`,
        slug: `${prefix}-duplicate-slug`,
        categoryId: category.id,
        status: 'ACTIVE',
      });
    expect(first.status).toBe(201);

    const response = await request(httpServer)
      .post('/api/products')
      .set('Authorization', bearer('admin'))
      .send({
        code: `${prefix}-duplicate-code`,
        name: `${prefix}-duplicate-name-2`,
        slug: `${prefix}-duplicate-slug-2`,
        categoryId: category.id,
        status: 'ACTIVE',
      });

    expect(response.status).toBe(409);
  });

  it('returns 400 when creating a product with a missing category', async () => {
    const response = await request(httpServer)
      .post('/api/products')
      .set('Authorization', bearer('admin'))
      .send({
        code: randomUUID(),
        name: `${prefix}-orphan-name`,
        slug: `${prefix}-orphan-slug`,
        categoryId: randomUUID(),
        status: 'ACTIVE',
      });

    expect(response.status).toBe(400);
    expect(response.status).toBeLessThan(500);
  });

  it('returns 409 when creating a category with a duplicate name', async () => {
    const category = await prisma.categories.create({
      data: { name: `${prefix}-dup-category`, slug: `${prefix}-dup-category` },
    });
    const response = await request(httpServer)
      .post('/api/categories')
      .set('Authorization', bearer('admin'))
      .send({ name: category.name, slug: `${prefix}-dup-category` });

    expect(response.status).toBe(409);
  });

  it('returns 404 when creating a criteria with a missing product', async () => {
    const response = await request(httpServer)
      .post('/api/quality-criteria')
      .set('Authorization', bearer('admin'))
      .send({
        productId: randomUUID(),
        name: `${prefix}-criteria`,
        method: 'RATING',
        standard: { minimum: 1 },
      });

    expect(response.status).toBe(404);
  });
});
