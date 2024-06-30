console.log("Now listening to websockets")

import { WebSocketServer } from 'ws';
import { PrismaClient } from '../node_modules/.prisma/client'
import { $ } from 'zx'
import { Mutators } from './mutators';

/*

SERVER
receives
- named mutations with (clientId,clientSequence) pair
stores
- __prisma_mutations: named mutations with (clientId,clientSequence) pair and serverSequence
- __prisma_clients: last seen serverSequence for the client

CLIENT
receives
- SQL with (clientId,clientSequence) pair and serverSequence
stores
- pending named mutations with (clientId,clientSequence) pair

INTERACTIONS
client is online, generates a mutation
- Add to pendingMutations with clientSequence
- Send to server along with last seen serverSequence, which stores in mutations with (clientId,clientSequence) pair and serverSequence
- Receive SQL more recent than last seeen serverSequence
- Apply SQL more recent than last seeen serverSequence in remoteDB, and delete associated pendingMutations.
- override localDB with content of remoteDB

client is offline, generate a mutation
- Add to pendingMutations with clientSequence

client comes online with pendingMutations
- Send to server along with last seen serverSequence, which stores in mutations with (clientId,clientSequence) pair and serverSequence
- Receive SQL more recent than last seeen serverSequence
- Apply SQL more recent than last seeen serverSequence in remoteDB, and delete associated pendingMutations.
- override localDB with content of remoteDB

client comes online without pendingMutations
- Send last seen serverSequence
- Receive SQL more recent than last seeen serverSequence
- Apply SQL more recent than last seeen serverSequence in remoteDB, and delete associated pendingMutations.
- override localDB with content of remoteDB


*/

const configuredPrisma = () => new PrismaClient({ log: [{ emit: "event", level: "query" }] })
type ConfiguredPrismaType = ReturnType<typeof configuredPrisma>
type ClientType = { clientId: string, latestSequenceNumber: number, ws: WebSocket }
type ActiveDbType = { dbName: string, clients: Array<ClientType>, prisma: ConfiguredPrismaType, mutators: Mutators }
type ServerBroadcastMessage = { clientId: string, latestSequenceNumber: number, pendingSqlStatements: Array<{ query: string, params: string }> }
type ClientConnectMessage = { name: string, clientId: string }
type ClientMutationMessage = { mutationName: string, args: Array<any>, sequenceNumber: number }

const wss = new WebSocketServer({ port: 8080 });
const activeDatabases: Array<ActiveDbType> = []

wss.on('connection', (ws: WebSocket) => {

    let activeDb: ActiveDbType | null = null
    let client: ClientType | null = null

    ws.onmessage = async (message: MessageEvent) => {
        // 1. Open DB
        if (activeDb == null) {

            try {
                const { name, clientId } = JSON.parse(message.data) as ClientConnectMessage
                client = { clientId: clientId, latestSequenceNumber: 0, ws }

                let db = activeDatabases.find(x => x.dbName == name)
                if (db) {
                    db.clients.push(client)
                    activeDb = db
                } else {
                    const prisma = new PrismaClient({ datasourceUrl: `file:./server/dbs/${name}.db`, log: [{ emit: "event", level: "query" }] })
                    await applyPendingMigrations(name)
                    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS __prisma_mutations ("serverSequence" INTEGER PRIMARY KEY, "mutationName" TEXT, "mutationParams" TEXT, "clientId" TEXT, "clientSequence" INTEGER)`)
                    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS __prisma_clients ("clientId" TEXT PRIMARY KEY, "lastSeenServerSequence" INTEGER)`)

                    activeDb = {
                        dbName: name,
                        clients: [client],
                        prisma,
                        // @ts-ignore
                        mutators: new Mutators(prisma)
                    }
                    activeDatabases.push(activeDb)

                    prisma.$on("query", async (e) => {
                        if (e.query.startsWith("BEGIN") || e.query.startsWith("COMMIT") || e.query.startsWith("SELECT") || e.query.indexOf("__prisma_mutations") > 0) {
                            return
                        }

                        // there's probably a race condition here. Need to refactor this call-back based way of accessing prisma-generated SQL.
                        if (client) {
                            await prisma.$executeRawUnsafe(`INSERT INTO __prisma_mutations (mutationName, mutationParams, clientId, clientSequence) VALUES ("${e.query}", "${e.params.replaceAll(`"`, `'`)}", "${client.clientId}", ${client.latestSequenceNumber})`)
                        }


                        // 3. Broadcast resulting SQL to all clients
                        // TODO: also catch-up client when connecting, in case other clients have made changes when it was offline.
                        for (const client of activeDb?.clients || []) {
                            const message: ServerBroadcastMessage = {
                                clientId: client.clientId,
                                latestSequenceNumber: client.latestSequenceNumber,
                                pendingSqlStatements: [{ query: e.query, params: e.params }]
                            }
                            client.ws.send(JSON.stringify(message))
                        }
                    })
                }

                console.log(`✅ Client Connected [${clientId}:${name}]`)
                return
            } catch (e) {
                console.log(e)
                ws.send(`failed to open DB. expected 'name' and 'clientId' properties`)
                ws.close()
                return
            }
        }

        // 2. Process Client Mutations and store resulting SQL
        try {
            const { mutationName, args, sequenceNumber } = JSON.parse(message.data) as ClientMutationMessage

            // @ts-ignore
            activeDb.mutators[mutationName](...args)
            if (client) {
                client.latestSequenceNumber = sequenceNumber
            }
            console.log(`♻️ Client Mutation [${client?.clientId}:${mutationName}]`)
        } catch {
            ws.send(`failed to process mutation. expected 'mutationName' and 'args' properties`)
            ws.close()
            return
        }
    };

    ws.onclose = () => {
        const clientIndex = activeDb?.clients.findIndex(x => x.clientId == client?.clientId)
        if (activeDb && clientIndex != undefined && clientIndex > -1) {
            activeDb.clients.splice(clientIndex, 1)
        }

        console.log(`🛑 Client Disconnected [${client?.clientId}:${activeDb?.dbName}]`)
    };
});

async function applyPendingMigrations(dbName: string) {
    await $`DATABASE_URL="file:./server/dbs/${dbName}.db" npx prisma migrate deploy --schema ../schema.prisma`
}

