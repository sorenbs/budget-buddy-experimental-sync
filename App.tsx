import * as React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import Home from "./screens/Home";
import { ScrollView, TouchableOpacity, View, Text } from "react-native";

const Stack = createNativeStackNavigator();
export default function App() {
  return (
    <NavigationContainer>
        <Stack.Navigator>
        <Stack.Screen
            name="BudgetList"
            component={BudgetList}
            options={{
              headerTitle: "My Budgets",
              headerLargeTitle: true,
            }}
          />
          <Stack.Screen
            name="BudgetDetail"
            component={Home}
            initialParams={{name: "Personal Budget"}}
            options={({ route }) => ({
              headerTitle: (route.params) ? (route.params as any).name : "" ,
              headerLargeTitle: true,
            })}
          />
        </Stack.Navigator>
    </NavigationContainer>
  );
}

function BudgetList({ navigation, route, options, back }: any) {
  const budgets = ["Food", "Travel", "Family activities"]

  const deleteBudget = (name: string) => {}

  return (
    <ScrollView contentContainerStyle={{ padding: 15, paddingVertical: 170 }}>
       <View style={{ gap: 15 }}>
      {budgets.map((budgetName) => {
        return (
          <TouchableOpacity
            key={budgetName}
            activeOpacity={0.7}
            onLongPress={() => deleteBudget(budgetName)}
            onPress={() => navigation.push('BudgetDetail', {name: budgetName})}
          >
            <Text>{budgetName}</Text>
          </TouchableOpacity>
        );
      })}
    </View> 
    </ScrollView>
  )
}