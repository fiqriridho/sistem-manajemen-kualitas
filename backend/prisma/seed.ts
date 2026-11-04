import { PrismaClient, evaluations_status, products_status, quality_criteria_method, users_role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const SEED_PASSWORD = process.env.SEED_PASSWORD;

if (!SEED_PASSWORD) {
  throw new Error('SEED_PASSWORD environment variable is required');
}

async function upsertUser(email: string, name: string, role: users_role) {
  const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);
  return prisma.users.upsert({
    where: { email },
    update: { name, role, password: hashedPassword, isActive: true },
    create: { id: randomUUID(), email, name, password: hashedPassword, role, isActive: true },
  });
}

async function upsertCategory(name: string, slug: string) {
  const existing = await prisma.categories.findFirst({ where: { name } });
  if (existing) {
    return prisma.categories.update({ where: { id: existing.id }, data: { name, slug } });
  }
  return prisma.categories.create({ data: { id: randomUUID(), name, slug } });
}

async function upsertProduct(code: string, data: { name: string; slug: string; description?: string | null; categoryId: string; status: products_status }) {
  const existing = await prisma.products.findFirst({ where: { code } });
  if (existing) {
    return prisma.products.update({ where: { id: existing.id }, data });
  }
  return prisma.products.create({ data: { id: randomUUID(), code, ...data } });
}

async function upsertCriteria(
  productId: string,
  name: string,
  data: { description?: string | null; method: quality_criteria_method; standard: unknown; isRequired?: boolean; isActive?: boolean },
) {
  const existing = await prisma.quality_criteria.findFirst({ where: { productId, name } });
  if (existing) {
    return prisma.quality_criteria.update({
      where: { id: existing.id },
      data: {
        description: data.description,
        method: data.method,
        standard: data.standard as never,
        isRequired: data.isRequired ?? true,
        isActive: data.isActive ?? true,
      },
    });
  }
  return prisma.quality_criteria.create({
    data: {
      id: randomUUID(),
      productId,
      name,
      description: data.description,
      method: data.method,
      standard: data.standard as never,
      isRequired: data.isRequired ?? true,
      isActive: data.isActive ?? true,
    },
  });
}

async function upsertEvaluation(productId: string, evaluatorId: string, status: evaluations_status) {
  const existing = await prisma.evaluations.findFirst({ where: { productId, evaluatorId, status } });
  if (existing) {
    return existing;
  }
  return prisma.evaluations.create({
    data: {
      id: randomUUID(),
      productId,
      evaluatorId,
      status,
      evaluatedAt: new Date('2026-11-01T00:00:00.000Z'),
    },
  });
}

async function main() {
  const admin = await upsertUser('admin@example.com', 'Admin User', 'ADMIN');
  const supervisor = await upsertUser('supervisor@example.com', 'Supervisor User', 'SUPERVISOR');
  const evaluator = await upsertUser('evaluator@example.com', 'Evaluator User', 'EVALUATOR');

  const catFood = await upsertCategory('Makanan', 'makanan');
  const catDrink = await upsertCategory('Minuman', 'minuman');

  const prodA = await upsertProduct('PROD001', {
    name: 'Kopi Robusta',
    slug: 'kopi-robusta',
    description: 'Kopi bubuk premium',
    categoryId: catFood.id,
    status: 'ACTIVE',
  });
  const prodB = await upsertProduct('PROD002', {
    name: 'Teh Hijau',
    slug: 'teh-hijau',
    description: 'Teh segar',
    categoryId: catDrink.id,
    status: 'DRAFT',
  });
  const prodC = await upsertProduct('PROD003', {
    name: 'Gula Merah',
    slug: 'gula-merah',
    description: 'Gula aren',
    categoryId: catFood.id,
    status: 'INACTIVE',
  });

  await upsertCriteria(prodA.id, 'Rasa', {
    description: 'Penilaian rasa produk',
    method: 'RATING',
    standard: { minimum: 3 },
    isRequired: true,
    isActive: true,
  });
  await upsertCriteria(prodA.id, 'Kemasan', {
    description: 'Penilaian kemasan',
    method: 'PASS_FAIL',
    standard: { pass: true },
    isRequired: true,
    isActive: true,
  });
  await upsertCriteria(prodB.id, 'Kadar Gula', {
    description: 'Penilaian kadar gula',
    method: 'NUMERIC',
    standard: { minimum: 0, maximum: 50 },
    isRequired: true,
    isActive: true,
  });
  await upsertCriteria(prodC.id, 'Kesegaran', {
    description: 'Penilaian kesegaran',
    method: 'RATING',
    standard: { minimum: 4 },
    isRequired: true,
    isActive: true,
  });

  await upsertEvaluation(prodA.id, evaluator.id, 'PASS');
  await upsertEvaluation(prodB.id, evaluator.id, 'FAIL');
  await upsertEvaluation(prodC.id, evaluator.id, 'INCOMPLETE');

  console.log(`Seed selesai. Kredensial demo (password: ${SEED_PASSWORD}):`);
  console.log(`  admin:    ${admin.email} (${admin.role})`);
  console.log(`  supervisor: ${supervisor.email} (${supervisor.role})`);
  console.log(`  evaluator:  ${evaluator.email} (${evaluator.role})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
