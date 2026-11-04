import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const admin = await prisma.users.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'admin@example.com',
      name: 'Admin User',
      password: '$2b$10$Dc7J.x0jCQV9FQ5jZ5j3F.6QcZ5jZ5j3F.6QcZ5jZ5j3F.',
      role: 'ADMIN',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  });

  const evaluator = await prisma.users.upsert({
    where: { email: 'evaluator@example.com' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'evaluator@example.com',
      name: 'Evaluator User',
      password: '$2b$10$Dc7J.x0jCQV9FQ5jZ5j3F.6QcZ5jZ5j3F.6QcZ5jZ5j3F.',
      role: 'EVALUATOR',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  });

  const category = await prisma.categories.upsert({
    where: { name: 'Makanan' },
    update: {},
    create: {
      id: randomUUID(),
      name: 'Makanan',
      slug: 'makanan',
      createdAt: now,
      updatedAt: now,
    },
  });

  const product = await prisma.products.upsert({
    where: { code: 'PROD001' },
    update: {},
    create: {
      id: randomUUID(),
      code: 'PROD001',
      name: 'Produk Test',
      slug: 'produk-test',
      description: 'Produk untuk testing sistem kualitas',
      categoryId: category.id,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
  });

  const productId = product.id;

  const criteria1 = await prisma.quality_criteria.upsert({
    where: { id: randomUUID() },
    update: {},
    create: {
      id: randomUUID(),
      name: 'Kriteria Rating',
      description: 'Kriteria dengan metode rating 1-5',
      productId,
      method: 'RATING',
      standard: { minimum: 3 },
      isRequired: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  });

  const criteria2 = await prisma.quality_criteria.upsert({
    where: { id: randomUUID() },
    update: {},
    create: {
      id: randomUUID(),
      name: 'Kriteria Pass/Fail',
      description: 'Kriteria dengan metode Pass/Fail',
      productId,
      method: 'PASS_FAIL',
      standard: {},
      isRequired: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  });

  const criteria3 = await prisma.quality_criteria.upsert({
    where: { id: randomUUID() },
    update: {},
    create: {
      id: randomUUID(),
      name: 'Kriteria Numeric',
      description: 'Kriteria dengan metode Numeric',
      productId,
      method: 'NUMERIC',
      standard: { maximum: 20 },
      isRequired: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  });

  console.log({ admin, evaluator, category, product, criteria: [criteria1, criteria2, criteria3] });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
