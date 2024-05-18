import * as React from "react";
import {
  ScrollView,
  StyleSheet,
  Platform,
  Text,
  TextStyle,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import TransactionList from "../components/TransactionsList";
import Card from "../components/ui/Card";
import AddTransaction from "../components/AddTransaction";

import { prisma } from "../db";

export default function Home() {
  return (
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
  );
}

function TransactionSummary() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  endOfMonth.setMilliseconds(endOfMonth.getMilliseconds() - 1);

  const startOfMonthTimestamp = Math.floor(startOfMonth.getTime() / 1000);
  const endOfMonthTimestamp = Math.floor(endOfMonth.getTime() / 1000);

  const totalExpenses =
    prisma.transactions.useAggregate({
      _sum: { amount: true },
      where: {
        type: "Expense",
        AND: { date: { lte: endOfMonthTimestamp, gte: startOfMonthTimestamp } },
      },
    })?._sum.amount || 0;

  const totalIncome =
    prisma.transactions.useAggregate({
      _sum: { amount: true },
      where: {
        type: "Income",
        AND: { date: { lte: endOfMonthTimestamp, gte: startOfMonthTimestamp } },
      },
    })?._sum.amount || 0;

  const savings = totalIncome - totalExpenses;
  const readablePeriod = new Date().toLocaleDateString("default", {
    month: "long",
    year: "numeric",
  });

  // Function to determine the style based on the value (positive or negative)
  const getMoneyTextStyle = (value: number): TextStyle => ({
    fontWeight: "bold",
    color: value < 0 ? "#ff4500" : "#2e8b57", // Red for negative, custom green for positive
  });

  // Helper function to format monetary values
  const formatMoney = (value: number) => {
    const absValue = Math.abs(value).toFixed(2);
    return `${value < 0 ? "-" : ""}$${absValue}`;
  };

  return (
    <Card style={styles.container}>
      <Text style={styles.periodTitle}>Summary for {readablePeriod}</Text>
      <Text style={styles.summaryText}>
        Income:{" "}
        <Text style={getMoneyTextStyle(totalIncome)}>
          {formatMoney(totalIncome)}
        </Text>
      </Text>
      <Text style={styles.summaryText}>
        Total Expenses:{" "}
        <Text style={getMoneyTextStyle(-totalExpenses)}>
          {formatMoney(-totalExpenses)}
        </Text>
      </Text>
      <Text style={styles.summaryText}>
        Savings:{" "}
        <Text style={getMoneyTextStyle(savings)}>{formatMoney(savings)}</Text>
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
    paddingBottom: 7,
    // Add other container styles as necessary
  },
  periodTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  summaryText: {
    fontSize: 18,
    color: "#333",
    marginBottom: 10,
  },
  // Removed moneyText style since we're now generating it dynamically
});
