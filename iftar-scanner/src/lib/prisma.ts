import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const url = process.env.DATABASE_URL!
const authToken = process.env.TURSO_AUTH_TOKEN || (url.includes('authToken=') ? url.split('authToken=')[1].split('&')[0] : undefined)

const libsql = createClient({
    url: url.split('?')[0],
    authToken,
})

const adapter = new PrismaLibSQL(libsql)

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({
    adapter: adapter as any,
    log: ['warn', 'error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
