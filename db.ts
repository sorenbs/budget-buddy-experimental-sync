import '@prisma/client/react-native';
import { PrismaClient } from '@prisma/client/react-native';
import { reactiveHooksExtension } from "@prisma/react-native";

const basePrisma = new PrismaClient()
basePrisma.$applyPendingMigrations();
export const prisma = basePrisma.$extends(reactiveHooksExtension());