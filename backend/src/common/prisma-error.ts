import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

export function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}

export type PrismaErrorContext = {
  duplicate?: string;
  notFound?: string;
  foreignKey?: string;
  foreignKeyStatus?: 400 | 404;
};

export function rethrowPrismaError(
  error: unknown,
  messages: PrismaErrorContext,
): never {
  if (isPrismaError(error, 'P2002')) {
    throw new ConflictException(messages.duplicate ?? 'Data sudah terdaftar.');
  }

  if (isPrismaError(error, 'P2025')) {
    throw new NotFoundException(messages.notFound ?? 'Data tidak ditemukan.');
  }

  if (isPrismaError(error, 'P2003')) {
    const Exception =
      messages.foreignKeyStatus === 404
        ? NotFoundException
        : BadRequestException;
    throw new Exception(messages.foreignKey ?? 'Referensi tidak valid.');
  }

  throw error;
}
