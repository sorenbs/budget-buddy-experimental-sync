import { TouchableOpacity, View } from "react-native";
import TransactionListItem from "./TransactionListItem";
import { usePrismaContext } from "../ExperimentalPrismaProvider";
import { Mutators } from "../server/mutators";

export default function TransactionList() {

  const { prisma, mutators } = usePrismaContext<Mutators>();
  const transactions = prisma.transactions.useFindMany({ orderBy: { date: "desc" }, include: {category: true} })

  async function deleteTransaction(id: number) {
    await mutators.deleteTransaction(id)
  }

  return (
    <View style={{ gap: 15 }}>
      {transactions.map((transaction) => {
        return (
          <TouchableOpacity
            key={transaction.id}
            activeOpacity={0.7}
            onLongPress={() => deleteTransaction(transaction.id)}
          >
            <TransactionListItem
              transaction={transaction}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
