import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

export function CoinDisplay({ coins }: { coins: number }) {
  return (
    <View style={styles.container}>
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="10" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
        <SvgText x="12" y="16" textAnchor="middle" fontSize="11"
          fontWeight="700" fill="#78350f">$</SvgText>
      </Svg>
      <Text style={styles.text}>{coins.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    paddingVertical: 5,
    paddingLeft: 7,
    paddingRight: 10,
  },
  text: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '600',
  },
});