import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import '@prisma/client/react-native';
import { PrismaClient } from '@prisma/client/react-native';
import { reactiveHooksExtension } from "@prisma/react-native";
import { BaseMutators } from './server/BaseMutators';
import { LogBox, Platform } from 'react-native';
LogBox.ignoreLogs(["warn(prisma-client) This is the 10th instance of Prisma Client being started. Make sure this is intentional."])

export interface PrismaProviderProps {
    /**
     * The name of the database file to open.
     */
    databaseName: string;

    /**
     * The children to render.
     */
    children: React.ReactNode;

    /**
    * Handle errors from SQLiteProvider.
    * @default rethrow the error
    */
    onError?: (error: Error) => void;
}

const extendedPrisma = () => new PrismaClient().$extends(reactiveHooksExtension())
type PrismaClientExtended = ReturnType<typeof extendedPrisma>
type PrismaAndMutators<MutatorType extends BaseMutators> = { prisma: PrismaClientExtended, mutators: MutatorType, ws: WebSocket }
const PrismaContext = createContext<PrismaAndMutators<BaseMutators> | null>(null);

const getDeviceId = async () => {
    const prisma = new PrismaClient({ datasourceUrl: `file:./prismaSyncIndex.db` })
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS deviceId ("deviceId" TEXT)`)
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS databases ("id" TEXT PRIMARY KEY, lastSeenServerSequence)`)
    let deviceId = (await prisma.$queryRaw<Array<{ deviceId: string }>>`SELECT deviceId FROM deviceId`)[0]?.deviceId

    if (!deviceId) {
        deviceId = Math.random().toString().split(".")[1]
        await prisma.$executeRawUnsafe(`INSERT INTO deviceId VALUES ("${deviceId}")`)
    }

    return {deviceId, syncIndexPrisma: prisma}
}

const getLocalDb = async (name: string) => {
    const localDbPrisma = new PrismaClient({ datasourceUrl: "file:local?mode=memory" }).$extends(reactiveHooksExtension())

    return localDbPrisma
}

const getRemoteDb = async (name: string) => {
    const prisma = new PrismaClient({ datasourceUrl: `file:./${name}.db` })

    return prisma
}

const refreshLocalDb = async (prismaInstance: PrismaClientExtended, remotePrisma: PrismaClient, mutators: BaseMutators, name: string) => {
    await prismaInstance.$queryRawUnsafe<string>(`ATTACH 'file:./${name}.db' as remoteDb;`)
    const tables = await prismaInstance.$queryRaw<Array<{ name: string, sql: string }>>`SELECT name, sql FROM remoteDb.sqlite_master WHERE type='table' AND name != "sqlite_sequence" AND name != "prisma_pending_mutations";`

    await prismaInstance.$executeRawUnsafe(`PRAGMA foreign_keys = 0;`)

    for (const table of tables) {
        await prismaInstance.$executeRawUnsafe(`DROP TABLE IF EXISTS main.${table.name};`)
        await prismaInstance.$executeRawUnsafe(table.sql)
        await prismaInstance.$executeRawUnsafe(`INSERT INTO main.${table.name} SELECT * FROM remoteDB.${table.name};`)
    }

    await prismaInstance.$executeRawUnsafe(`PRAGMA foreign_keys = 1;`)
    await prismaInstance.$executeRawUnsafe(`DETACH DATABASE 'remoteDb';`)

    const pendingMutations = await remotePrisma.$queryRawUnsafe(`SELECT * FROM prisma_pending_mutations`) as Array<any>
    for (const mutation of pendingMutations) {
        const args = JSON.parse(mutation.args.replaceAll(`'''`, `"`))
        const name = mutation.name
        const sequenceNumber = mutation.id

        // @ts-ignore
        mutators[name](...args)
    }

    await prismaInstance.$refreshSubscriptions()
}

const applyRemoteSQL = async (remotePrisma: PrismaClient, pendingSqlStatements: Array<{ query: string, params: string }>, clientId: string, latestSequenceNumber: number) => {

    const toSQLString = (sql: string, args: Array<any>) => {
        args.reverse()
        while (sql.indexOf("?") > -1) {
            const rawArg = args.pop()
            let argSQL = ""

            if (typeof rawArg === 'number') {
                argSQL = `${rawArg}`
            }
            if (typeof rawArg === 'string') {
                argSQL = `"${rawArg}"`
            }
            if (typeof rawArg === 'bigint') {
                argSQL = `${rawArg}`
            }

            sql = sql.replace("?", argSQL)
        }

        return sql
    }


    for (const sql of pendingSqlStatements) {
        const query = toSQLString(sql.query, JSON.parse(sql.params))
        const a = await remotePrisma.$queryRawUnsafe(query)
        await remotePrisma.$executeRawUnsafe(`DELETE FROM prisma_pending_mutations WHERE client = "${clientId}" AND id = ${latestSequenceNumber}`)
    }

}

const applyMigrations = async (name: string) => {
    const prismaForMigrating = new PrismaClient({ datasourceUrl: `file:./${name}.db` })
    await prismaForMigrating.$applyPendingMigrations()
    await prismaForMigrating.$queryRawUnsafe(`CREATE TABLE IF NOT EXISTS prisma_pending_mutations ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, client TEXT, name TEXT, args TEXT)`)
    await prismaForMigrating.$disconnect()
}

function interceptMethodCalls(obj: { [k: string]: any }, fn: (prop: string, argumentList: any[]) => void) {
    return new Proxy(obj, {
        get(target, prop) { // (A)
            if (typeof target[prop as string] === 'function') {
                return new Proxy(target[prop as string], {
                    apply: (target, thisArg, argumentsList) => { // (B)
                        fn(prop as string, argumentsList);
                        return Reflect.apply(target, thisArg, argumentsList);
                    }
                });
            } else {
                return Reflect.get(target, prop);
            }
        }
    });
}

/**
 * Context.Provider component that provides a SQLite database to all children.
 * All descendants of this component will be able to access the database using the [`usePrismaContext`](#useprismacontext) hook.
 */
export function createPrismaProvider<T extends BaseMutators>(mutatorClass: (new (prisma: PrismaClientExtended) => T)) {
    return function PrismaProvider({
        databaseName,
        children,
        onError,
        ...props
    }: PrismaProviderProps) {

        const databaseRef = useRef<PrismaAndMutators<T> | null>(null);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState<Error | null>(null);

        useEffect(() => {
            async function setup() {
                try {
                    const {deviceId, syncIndexPrisma} = await getDeviceId()
                    // set up databases
                    await applyMigrations(databaseName);
                    const prisma = await getLocalDb(databaseName)
                    const remotePrisma = await getRemoteDb(databaseName)
                    const mutators = new mutatorClass(prisma)
                    await refreshLocalDb(prisma, remotePrisma, mutators, databaseName) // TODO: this last argument should not be 0. It should be stored from the last data sync from the server.


                    // setup sync mechanism
                    const ws = new WebSocket(`ws://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:8080`);
                    ws.onopen = () => {
                        console.log('Connected to server');

                        ws.send(JSON.stringify({ name: databaseName, clientId: deviceId }));
                    }

                    ws.onmessage = async (ev: MessageEvent) => {
                        const data = JSON.parse(ev.data) as { clientId: string, latestSequenceNumber: number, pendingSqlStatements: Array<{ query: string, params: string }> }

                        if (data.pendingSqlStatements && data.pendingSqlStatements.length > 0) {
                            await applyRemoteSQL(remotePrisma, data.pendingSqlStatements, data.clientId, data.latestSequenceNumber)
                            await syncIndexPrisma.$executeRawUnsafe(`INSERT INTO databases (id, lastSeenServerSequence) VALUES ("${databaseName}", ${data.latestSequenceNumber}) ON CONFLICT(id) DO UPDATE SET lastSeenServerSequence=excluded.lastSeenServerSequence`)
                            await refreshLocalDb(prisma, remotePrisma, mutators, databaseName)
                        }
                    }

                    ws.onclose = () => {
                        console.log('Disconnected from server');
                    }

                    ws.onerror = (e) => {
                        console.log(e);
                    }



                    const proxiedMutators = interceptMethodCalls(mutators, async (prop, argumentList) => {
                        const name = prop
                        const args = JSON.stringify(argumentList).replaceAll(`"`, `'''`)

                        const remotePrisma = await getRemoteDb(databaseName)
                        const sequenceNumber = (await remotePrisma.$queryRawUnsafe<Array<{ id: number }>>(`INSERT INTO prisma_pending_mutations (client, name, args) VALUES ("${deviceId}", "${name}", "${args}") RETURNING id;`))[0].id
                        await remotePrisma.$disconnect()

                        const outgoingMessage = JSON.stringify({ mutationName: name, args: argumentList, sequenceNumber })
                        ws.send(outgoingMessage)
                    }) as T

                    databaseRef.current = { prisma, mutators: proxiedMutators, ws };
                    setLoading(false);
                } catch (e: any) {
                    setError(e);
                }
            }

            async function teardown(db: PrismaClientExtended, ws: WebSocket) {
                try {
                    await db.$disconnect()
                    ws.close()
                } catch (e: any) {
                    setError(e);
                }
            }

            setup();

            return () => {
                if (databaseRef.current) {
                    teardown(databaseRef.current.prisma, databaseRef.current.ws);
                    databaseRef.current = null;
                    setLoading(true);
                }
            };
        }, [databaseName]);

        if (error != null) {
            const handler =
                onError ??
                ((e) => {
                    throw e;
                });
            handler(error);
        }
        if (loading || !databaseRef.current) {
            return null;
        }

        return <PrismaContext.Provider value={databaseRef.current}>{children}</PrismaContext.Provider>;
    }
}


/**
 * A global hook for accessing the Prisma managed database across components.
 * This hook should only be used within a [`<PrismaProvider>`](#prismaprovider) component.
 *
 * @example
 * ```tsx
 * export default function App() {
 *   return (
 *     <PrismaProvider databaseName="test.db">
 *       <Main />
 *     </PrismaProvider>
 *   );
 * }
 *
 * export function Main() {
 *   const prisma = usePrismaContext();
 *   return <View />
 * }
 * ```
 */
export function usePrismaContext<MutatorType extends BaseMutators>(): PrismaAndMutators<MutatorType> {
    const context = useContext(PrismaContext) as PrismaAndMutators<MutatorType>;
    if (context == null) {
        throw new Error('usePrismaContext must be used within a <PrismaProvider>');
    }
    return context;
}