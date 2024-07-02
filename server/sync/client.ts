import { PrismaClient } from "@prisma/client/react-native";
import { reactiveHooksExtension } from "@prisma/react-native";
import { BaseMutators } from "../BaseMutators";

const extendedPrisma = () => new PrismaClient().$extends(reactiveHooksExtension())
type PrismaClientExtended = ReturnType<typeof extendedPrisma>

export class SyncClient<T extends BaseMutators> {
    name: string;
    ws: WebSocket | null = null;
    wsAddress: string;
    localDb: PrismaClientExtended;
    remoteDb: PrismaClient;
    syncIndexDb: PrismaClient;
    mutators: T;
    clientId: string | null = null;
    constructor(name: string, isAndroid: boolean, mutatorClass: (new (prisma: PrismaClientExtended) => T)) {
        this.name = name;
        this.wsAddress = `ws://${isAndroid ? '10.0.2.2' : 'localhost'}:8080`
        
        this.localDb = this.getLocalDb(name)
        this.mutators = this._createProxiedMutatorClass(new mutatorClass(this.localDb))
        this.remoteDb = this.getRemoteDb(name)
        this.syncIndexDb = this.getSyncIndexDb()

        
    }

    checkSyncIsEnabled() {
        if(this.ws == null) {
            throw new Error('Must call `enableSyncing()` first.')
        }
    }

    enableSyncing() {
        this.ws = new WebSocket(this.wsAddress)
        this.ws.onopen = async () => {
            console.log('Connected to server');

            const clientId = this.clientId ?? await this.initSyncIndexDb() // the call to initSyncIndexDb() also sets this.clientId. It's a bit messy. 

            this.ws!.send(JSON.stringify({ name: this.name, clientId }));
        }

        this.ws.onmessage = async (ev: MessageEvent) => {
            const data = JSON.parse(ev.data) as { clientId: string, latestSequenceNumber: number, pendingSqlStatements: Array<{ query: string, params: string }> }

            if (data.pendingSqlStatements && data.pendingSqlStatements.length > 0) {
                await this.applyRemoteSQL(data.pendingSqlStatements, data.clientId, data.latestSequenceNumber)
                await this.syncIndexDb.$executeRawUnsafe(`INSERT INTO databases (id, lastSeenServerSequence) VALUES ("${this.name}", ${data.latestSequenceNumber}) ON CONFLICT(id) DO UPDATE SET lastSeenServerSequence=excluded.lastSeenServerSequence`)
                await this.refreshLocalDb()
            }
        }

        this.ws.onclose = () => {
            console.log('Disconnected from server');
        }

        this.ws.onerror = (e) => {
            console.log(e);
        }
    }

    async applyRemoteSQL(pendingSqlStatements: Array<{ query: string, params: string }>, clientId: string, latestSequenceNumber: number) {

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
            const a = await this.remoteDb.$queryRawUnsafe(query)
            await this.remoteDb.$executeRawUnsafe(`DELETE FROM prisma_pending_mutations WHERE client = "${clientId}" AND id = ${latestSequenceNumber}`)
        }
    
    }

    async refreshLocalDb() {
        await this.localDb.$queryRawUnsafe<string>(`ATTACH 'file:./${this.name}.db' as remoteDb;`)
        const tables = await this.localDb.$queryRaw<Array<{ name: string, sql: string }>>`SELECT name, sql FROM remoteDb.sqlite_master WHERE type='table' AND name != "sqlite_sequence" AND name != "prisma_pending_mutations";`
    
        await this.localDb.$executeRawUnsafe(`PRAGMA foreign_keys = 0;`)
    
        for (const table of tables) {
            await this.localDb.$executeRawUnsafe(`DROP TABLE IF EXISTS main.${table.name};`)
            await this.localDb.$executeRawUnsafe(table.sql)
            await this.localDb.$executeRawUnsafe(`INSERT INTO main.${table.name} SELECT * FROM remoteDB.${table.name};`)
        }
    
        await this.localDb.$executeRawUnsafe(`PRAGMA foreign_keys = 1;`)
        await this.localDb.$executeRawUnsafe(`DETACH DATABASE 'remoteDb';`)
    
        const pendingMutations = await this.remoteDb.$queryRawUnsafe(`SELECT * FROM prisma_pending_mutations`) as Array<any>
        for (const mutation of pendingMutations) {
            const args = JSON.parse(mutation.args.replaceAll(`'''`, `"`))
            const name = mutation.name
            const sequenceNumber = mutation.id
    
            // @ts-ignore
            this.mutators[name](...args)
        }
    
        await this.localDb.$refreshSubscriptions()
    }

    async initDb(name: string) {
        const prismaForMigrating = new PrismaClient({ datasourceUrl: `file:./${name}.db` })
        await prismaForMigrating.$applyPendingMigrations()
        await prismaForMigrating.$queryRawUnsafe(`CREATE TABLE IF NOT EXISTS prisma_pending_mutations ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, client TEXT, name TEXT, args TEXT)`)
        await prismaForMigrating.$disconnect()
    }

    getLocalDb(name: string) {
        return new PrismaClient({ datasourceUrl: "file:local?mode=memory" }).$extends(reactiveHooksExtension())
    }
    
    getRemoteDb(name: string) {
        return new PrismaClient({ datasourceUrl: `file:./${name}.db` })
    }

    getSyncIndexDb() {
        return new PrismaClient({ datasourceUrl: `file:./prismaSyncIndex.db` })
    }

    async initSyncIndexDb(): Promise<string> {
        await this.syncIndexDb.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS deviceId ("deviceId" TEXT)`)
        await this.syncIndexDb.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS databases ("id" TEXT PRIMARY KEY, lastSeenServerSequence)`)
        let deviceId = (await this.syncIndexDb.$queryRaw<Array<{ deviceId: string }>>`SELECT deviceId FROM deviceId`)[0]?.deviceId
    
        if (!deviceId) {
            deviceId = Math.random().toString().split(".")[1]
            await this.syncIndexDb.$executeRawUnsafe(`INSERT INTO deviceId VALUES ("${deviceId}")`)
        }

        this.clientId = deviceId; // code smell ...
    
        return deviceId
    }

    async close() {
        this.ws?.close()
        await this.localDb.$disconnect()
        await this.remoteDb.$disconnect()
    }

    _createProxiedMutatorClass(mutators: BaseMutators) {
        return this._interceptMethodCalls(mutators, async (prop, argumentList) => {
            if(this.ws == null) {
                throw new Error('Must call `enableSyncing()` first.')
            }

            const mutationName = prop
            const args = JSON.stringify(argumentList).replaceAll(`"`, `'''`)

            const remotePrisma = this.getRemoteDb(this.name)
            const sequenceNumber = (await remotePrisma.$queryRawUnsafe<Array<{ id: number }>>(`INSERT INTO prisma_pending_mutations (client, name, args) VALUES ("${this.clientId}", "${mutationName}", "${args}") RETURNING id;`))[0].id
            await remotePrisma.$disconnect()

            const outgoingMessage = JSON.stringify({ mutationName, args: argumentList, sequenceNumber })
            this.ws.send(outgoingMessage)
        }) as T
    }

    _interceptMethodCalls(obj: { [k: string]: any }, fn: (prop: string, argumentList: any[]) => void) {
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
}