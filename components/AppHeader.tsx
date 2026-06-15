import { router } from "expo-router";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function AppHeader({
  title,
}: {
  title: string;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => router.back()}
      >
        <Text style={styles.back}>
          ← Back
        </Text>
      </TouchableOpacity>

      <Text style={styles.title}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 50,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },

  back: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 15,
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
});