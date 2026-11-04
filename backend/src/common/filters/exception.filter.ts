import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    const prismaError = exception as { code?: unknown };
    if (typeof prismaError?.code === 'string') {
      const knownPrisma: Record<string, { status: number; message: string }> = {
        P2002: { status: HttpStatus.CONFLICT, message: 'Data sudah terdaftar.' },
        P2003: { status: HttpStatus.BAD_REQUEST, message: 'Referensi tidak valid.' },
        P2025: { status: HttpStatus.NOT_FOUND, message: 'Data tidak ditemukan.' },
      };
      const mapping = knownPrisma[prismaError.code];
      if (mapping) {
        status = mapping.status;
        message = mapping.message;
      }
    }

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();
      if (typeof responseBody === 'string') {
        message = responseBody;
      } else if (typeof responseBody === 'object' && responseBody && 'message' in responseBody) {
        const detail = responseBody.message;
        message = Array.isArray(detail) ? detail.join(', ') : String(detail);
      }
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
