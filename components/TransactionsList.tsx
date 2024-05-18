import { Text, TouchableOpacity, View } from "react-native";
import TransactionListItem from "./TransactionListItem";
import { prisma } from "../db"

export default function TransactionList() {

  const transactions = prisma.transactions.useFindMany({ orderBy: { date: "desc" }, include: {category: true} })

  async function deleteTransaction(id: number) {
    await prisma.transactions.delete({ where: { id } });
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
