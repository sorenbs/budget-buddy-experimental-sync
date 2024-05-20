import { PrismaClient } from '@prisma/client';

export class BaseMutators {
  prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }
}
