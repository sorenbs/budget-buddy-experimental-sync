import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import '@prisma/client/react-native';
import { PrismaClient } from '@prisma/client/react-native';
import { reactiveHooksExtension } from "@prisma/react-native";
import { BaseMutators } from './server/BaseMutators';
import { LogBox, Platform } from 'react-native';
import { SyncClient } from './server/sync/client';
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
type PrismaAndMutators<MutatorType extends BaseMutators> = { prisma: PrismaClientExtended, mutators: MutatorType }
const PrismaContext = createContext<PrismaAndMutators<BaseMutators> | null>(null);

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

        const databaseRef = useRef<SyncClient<T> | null>(null);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState<Error | null>(null);

        useEffect(() => {
            async function setup() {
                try {

                    const syncClient = new SyncClient(databaseName, Platform.OS === 'android', mutatorClass)
                   
                    await syncClient.initDb(databaseName);
                    await syncClient.refreshLocalDb()
                    syncClient.enableSyncing()

                    databaseRef.current = syncClient // = { prisma: syncClient.localDb, mutators: proxiedMutators, ws: syncClient.ws! };
                    setLoading(false);
                } catch (e: any) {
                    console.log(e)
                    setError(e);
                }
            }

            setup();

            return () => {
                if (databaseRef.current) {
                    databaseRef.current.close()
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

        const value = {prisma: databaseRef.current.localDb, mutators: databaseRef.current.mutators }

        return <PrismaContext.Provider value={value}>{children}</PrismaContext.Provider>;
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