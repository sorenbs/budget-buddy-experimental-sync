import * as React from "react";
import { Button, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Card from "./ui/Card";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { prisma } from "../db"

export default function AddTransaction() {

  const defaultViewData = {
    isAddingTransaction: false,
    amount: 0,
    description: "",
    type: "Expense",
    categoryId: null,
  }

  const viewData = prisma.addTransactionView.useFindFirst() || defaultViewData
  const expenseCategories = prisma.categories.useFindMany({ where: { type: "Expense" } })
  const incomeCategories = prisma.categories.useFindMany({ where: { type: "Income" } })

  async function handleSave() {
    await prisma.transactions.create({
      data: {
        amount: viewData.amount,
        description: viewData.description,
        category_id: viewData.categoryId || 0,
        date: new Date().getTime() / 1000,
        type: viewData.type,
      }
    })
    await prisma.addTransactionView.updateMany({ data: defaultViewData })
  }

  return (
    <View style={{ marginBottom: 15 }}>
      {viewData.isAddingTransaction ? (
        <View>
          <Card>
            <TextInput
              placeholder="$Amount"
              style={{ fontSize: 32, marginBottom: 15, fontWeight: "bold" }}
              keyboardType="numeric"
              onChangeText={(text) => {
                // Remove any non-numeric characters before setting the state
                const numericValue = Number(text.replace(/[^0-9.]/g, ""));
                prisma.addTransactionView.updateMany({ data: { amount: numericValue } })
              }}
            />
            <TextInput
              placeholder="Description"
              style={{ marginBottom: 15 }}
              onChangeText={(text) =>
                prisma.addTransactionView.updateMany({ data: { description: text } })}
            />
            <Text style={{ marginBottom: 6 }}>Select a entry type</Text>
            <SegmentedControl
              values={["Expense", "Income"]}
              style={{ marginBottom: 15 }}
              selectedIndex={0}
              onChange={async (event) => {
                await prisma.addTransactionView.updateMany({ data: { type: event.nativeEvent.value } })
              }}
            />
            {(viewData.type == "Expense" ? expenseCategories : incomeCategories).map((cat) => (
              <CategoryButton
                key={cat.id}
                id={cat.id}
                title={cat.name}
                isSelected={viewData.categoryId === cat.id}
              />
            ))}
          </Card>
          <View
            style={{ flexDirection: "row", justifyContent: "space-around" }}
          >
            <Button
              title="Cancel"
              color="red"
              onPress={() =>
                prisma.addTransactionView.updateMany({ data: { isAddingTransaction: false } })}
            />
            <Button title="Save" onPress={handleSave} />
          </View>
        </View>
      ) : (
        <AddButton />
      )}
    </View>
  );
}

function CategoryButton({
  id,
  title,
  isSelected,
}: {
  id: number;
  title: string;
  isSelected: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={() => {
        prisma.addTransactionView.updateMany({ data: { categoryId: id } })
      }}
      activeOpacity={0.6}
      style={{
        height: 40,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isSelected ? "#007BFF20" : "#00000020",
        borderRadius: 15,
        marginBottom: 6,
      }}
    >
      <Text
        style={{
          fontWeight: "700",
          color: isSelected ? "#007BFF" : "#000000",
          marginLeft: 5,
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function AddButton() {
  return (
    <TouchableOpacity
      onPress={() =>
        prisma.addTransactionView.updateMany({ data: { isAddingTransaction: true } })}
      activeOpacity={0.6}
      style={{
        height: 40,
        flexDirection: "row",
        alignItems: "center",

        justifyContent: "center",
        backgroundColor: "#007BFF20",
        borderRadius: 15,
      }}
    >
      <MaterialIcons name="add-circle-outline" size={24} color="#007BFF" />
      <Text style={{ fontWeight: "700", color: "#007BFF", marginLeft: 5 }}>
        New Entry
      </Text>
    </TouchableOpacity>
  );
}
