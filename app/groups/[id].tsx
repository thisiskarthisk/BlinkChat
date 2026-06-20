import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function GroupDetailsScreen() {
  const { id } = useLocalSearchParams();

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Group Details Screen</Text>
      <Text>Group ID: {id}</Text>
    </View>
  );
}
