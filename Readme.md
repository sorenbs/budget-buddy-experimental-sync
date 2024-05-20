# Budget Buddy App

![Budget Buddy App Thumbnail](https://i.ytimg.com/vi/dl74XgJYK1A/maxresdefault.jpg)

## Introduction

This repository contains a version of the Budget Buddy app converted to use Prisma for React Native and includes an experimental Sync Server. This is not a production-ready solution, and should be seen for what it is - an experiment.

- Original Budget Buddy App: https://codewithbeto.dev/projects/budget-buddy-app
- Budget Buddy App ported to Prisma for React Native: https://github.com/sorenbs/budget-buddy-expo


## Prisma for React Native

Prisma is a widely used ORM for JS/TS backend applications. It is fast, easy to use and provides auto-completion plus complete type-safety of both queries and returned data. At Expos [App.js Conference](https://appjs.co/) we announced that Prisma now supports Expo and React Native. Follow the [getting-started instructions here](https://www.npmjs.com/package/@prisma/react-native) to set up Prisma in your own project.

## Running the app

```
npm install
npx prisma generate
npx expo prebuild --clean
npx expo run:ios
```

## Running the Experimental Sync Server

The server server can be run from the `server` directory witn `npm run dev`. When running, it will show a message whenever a client connects, disconnects or performs a mutation:

```
cd server
npm run dev

> server@1.0.0 dev
> tsx ./index.ts

Now listening to websockets
✅ Client Connected [0053288486575924394:c]
✅ Client Connected [7537615544763064:c]
♻️ Client Mutation [7537615544763064:deleteTransaction]
♻️ Client Mutation [0053288486575924394:deleteTransaction]
♻️ Client Mutation [0053288486575924394:deleteTransaction]
🛑 Client Disconnected [0053288486575924394:c]
✅ Client Connected [0053288486575924394:a]
🛑 Client Disconnected [0053288486575924394:a]
🛑 Client Disconnected [7537615544763064:c]
✅ Client Connected [7537615544763064:Food]
✅ Client Connected [0053288486575924394:Food]
♻️ Client Mutation [0053288486575924394:deleteTransaction]
♻️ Client Mutation [7537615544763064:deleteTransaction]
```

## How it works

The Sync Server works by implementing a latency hiding mechanism that has been used in realtime games since [John Carmack added it to Quake](https://raw.githubusercontent.com/ESWAT/john-carmack-plan-archive/master/by_day/johnc_plan_19960802.txt). The basic idea is very simple - whenever a change is made to the databese, that change is made locally and reflected in the UI right away. In the background, a request to make that same change is sent to a central server. Some time later, when the server has processed the event, the local database is updated to be an exact copy of the central db on the server. In most cases, the server will arrive at the same result, and the local db will remain unchanged. If some other client had performed a conflicting database change at the same time, the combined effect of the two changes will be represented on all clients and the server after the final server message is delivered.

In this repository, this pattern is implemented through named mutators, a PrismaProvider and a Sync Server. As an app developer, you only need to care about the mutators. 

### Mutators

All database mutations - that is create, update and delete calls, are moved to a file with named mutators located in `server/mutators.ts`.

```ts
export class Mutators extends BaseMutators {
    async deleteTransaction(id: number) {
        await this.prisma.transactions.delete({ where: { id } });
    }
}
```

A mutator can perform many database operations and contain arbitrary logic. The main thing is that it has a name, and can be executed on both the client and the server with the same result.

It is used in a react function like this:

```ts
const { prisma, mutators } = usePrismaContext<Mutators>();

async function deleteTransaction(id: number) {
    await mutators.deleteTransaction(id)
}
```

### ExperimentalPrismaProvider

The ExperimentalPrismaProvider is currently just a file in the app repository. Eventually this will become part of the Prisma for React Native bundle.

It is used to open a local database and a websocket connection to the sync server. As long as the `PrismaProvider` component is in scope, the websocket will stay open, and the database will be synced:

```ts
const PrismaProvider = createPrismaProvider(Mutators)

return (
  <PrismaProvider databaseName={budgetName}>
    <ScrollView
    contentContainerStyle={{
        padding: 15,
        paddingTop: Platform.select({ ios: 170, default: 15 }),
    }}
    >
    <AddTransaction />
    <TransactionSummary />
    <TransactionList />
    <StatusBar style="auto" />
    </ScrollView>
  </PrismaProvider>
);
```

### Sync Server

The Sync Server creates a central version of each database in the `dbs` folder. As a user, the only thing you need to be aware of is that it will run your code from `server/mutators.ts`. The Sync Server is very much a work in progress at this point.
