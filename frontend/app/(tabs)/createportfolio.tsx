import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/config/theme';
import { useAppStore } from '@/store/useAppStore';
import { BASE_URL } from '@/config/api';

const API = BASE_URL;
const SESSION_ID = Math.random().toString(36).substring(7);

const colors = Colors.dark;

type Screen = 'quiz' | 'amount' | 'building';

interface QuizAnswer { [key: string]: string }

const QUESTIONS = [
  {
    id: 'q1',
    text: 'How would you react if your investment dropped 20% in one month?',
    options: [
      { key: 'a', label: "Sell everything immediately" },
      { key: 'b', label: "Worried, but wait and watch" },
      { key: 'c', label: "Hold — markets recover" },
      { key: 'd', label: "Buy more while prices are low" },
    ],
  },
  {
    id: 'q2',
    text: 'What is your primary investment goal?',
    options: [
      { key: 'a', label: "Protect my money" },
      { key: 'b', label: "Steady growth, minimal risk" },
      { key: 'c', label: "Grow wealth over 5–10 years" },
      { key: 'd', label: "Maximum returns, high risk ok" },
    ],
  },
  {
    id: 'q3',
    text: 'How long can you leave your money invested?',
    options: [
      { key: 'a', label: "Less than 1 year" },
      { key: 'b', label: "1–3 years" },
      { key: 'c', label: "3–7 years" },
      { key: 'd', label: "More than 7 years" },
    ],
  },
  {
    id: 'q4',
    text: 'What portion of your income can you invest monthly?',
    options: [
      { key: 'a', label: "Less than 5%" },
      { key: 'b', label: "5–15%" },
      { key: 'c', label: "15–30%" },
      { key: 'd', label: "More than 30%" },
    ],
  },
  {
    id: 'q5',
    text: 'Have you invested before?',
    options: [
      { key: 'a', label: "Never — first time" },
      { key: 'b', label: "Only FDs or savings" },
      { key: 'c', label: "Some mutual funds or stocks" },
      { key: 'd', label: "Active trader" },
    ],
  },
];

export default function CreatePortfolioScreen() {
  const router = useRouter();
  const { setPortfolio, setSessionId } = useAppStore();
  const [screen,    setScreen]    = useState<Screen>('quiz');
  const [qIndex,    setQIndex]    = useState(0);
  const [answers,   setAnswers]   = useState<QuizAnswer>({});
  const [profile,   setProfile]   = useState<any>(null);
  const [amount,    setAmount]    = useState('');
  const [loading,   setLoading]   = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 300, useNativeDriver: true,
    }).start();
  }, [screen, qIndex]);

  // ── Quiz ──────────────────────────────────────────────────────────────────

  async function handleAnswer(key: string) {
    const q       = QUESTIONS[qIndex];
    const updated = { ...answers, [q.id]: key };
    setAnswers(updated);

    if (qIndex < QUESTIONS.length - 1) {
      fadeAnim.setValue(0);
      setQIndex(qIndex + 1);
    } else {
      // All answered — score on backend
      setLoading(true);
      try {
        const res  = await fetch(`${API}/quiz/score`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ answers: updated }),
        });
        const data = await res.json();
        setProfile(data);
        setScreen('amount');
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  }

  // ── Portfolio Build ───────────────────────────────────────────────────────

  async function handleBuild() {
    if (!amount || isNaN(Number(amount))) return;
    setScreen('building');
    try {
      const res  = await fetch(`${API}/portfolio/build`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_name: profile.profile,
          total_score:  profile.total_score,
          answers:      profile.answers,
          amount:       parseFloat(amount),
          session_id:   SESSION_ID,
        }),
      });
      const data = await res.json();

      setPortfolio(data);
      setSessionId(SESSION_ID);
      router.push('/(tabs)/portfolio' as any);
    } catch (e) {
      console.error(e);
      setScreen('amount');
    }
  }


  if (screen === 'quiz') {
    const q = QUESTIONS[qIndex];
    return (
      <View style={styles.container}>
        <View style={styles.quizProgress}>
          {QUESTIONS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i <= qIndex && { backgroundColor: '#4ade80' },
              ]}
            />
          ))}
        </View>

        <Animated.View style={[styles.quizCard, { opacity: fadeAnim }]}>
          <Text style={styles.quizStep}>Question {qIndex + 1} of {QUESTIONS.length}</Text>
          <Text style={styles.quizQuestion}>{q.text}</Text>

          {q.options.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={styles.quizOption}
              onPress={() => handleAnswer(opt.key)}
              disabled={loading}
            >
              <View style={styles.quizKey}>
                <Text style={styles.quizKeyText}>{opt.key.toUpperCase()}</Text>
              </View>
              <Text style={styles.quizOptionText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {loading && <ActivityIndicator color="#4ade80" style={{ marginTop: 20 }} />}
      </View>
    );
  }

  if (screen === 'amount') {
    return (
      <View style={styles.container}>
        <View style={styles.profileBadge}>
          <Text style={styles.profileBadgeText}>{profile?.profile} Investor</Text>
        </View>
        <Text style={styles.profileDesc}>{profile?.description}</Text>

        <View style={styles.allocationRow}>
          {[
            { label: 'Equity', val: profile?.equity_pct, color: '#4ade80' },
            { label: 'Debt',   val: profile?.debt_pct,   color: '#60a5fa' },
            { label: 'Gold',   val: profile?.gold_pct,   color: '#fbbf24' },
          ].map(item => (
            <View key={item.label} style={styles.allocationBadge}>
              <Text style={[styles.allocationPct, { color: item.color }]}>{item.val}%</Text>
              <Text style={styles.allocationLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.amountLabel}>How much do you want to invest?</Text>
        <View style={styles.amountInputRow}>
          <Text style={styles.rupeeSign}>₹</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="10,000"
            placeholderTextColor="#555"
          />
        </View>

        <TouchableOpacity
          style={[styles.buildBtn, !amount && { opacity: 0.4 }]}
          onPress={handleBuild}
          disabled={!amount}
        >
          <Text style={styles.buildBtnText}>Build My Portfolio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screen === 'building') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4ade80" />
        <Text style={styles.buildingText}>Running ML analysis on NSE stocks...</Text>
        <Text style={styles.buildingSub}>This takes 30–60 seconds</Text>
      </View>
    );
  }

  return null;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0d0d0d', padding: 20 },
  centered:        { flex: 1, backgroundColor: '#0d0d0d', alignItems: 'center', justifyContent: 'center' },

  // Quiz
  quizProgress:    { flexDirection: 'row', gap: 8, marginBottom: 32, justifyContent: 'center' },
  progressDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
  quizCard:        { flex: 1 },
  quizStep:        { color: '#666', fontSize: 13, marginBottom: 8 },
  quizQuestion:    { color: '#fff', fontSize: 20, fontWeight: '600', marginBottom: 28, lineHeight: 28 },
  quizOption:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 0.5, borderColor: '#2a2a2a', gap: 14 },
  quizKey:         { width: 28, height: 28, borderRadius: 8, backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  quizKeyText:     { color: '#4ade80', fontSize: 13, fontWeight: '700' },
  quizOptionText:  { color: '#ccc', fontSize: 15, flex: 1 },

  // Profile + Amount
  profileBadge:    { backgroundColor: '#1a2e1a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start', marginBottom: 12 },
  profileBadgeText:{ color: '#4ade80', fontSize: 15, fontWeight: '700' },
  profileDesc:     { color: '#888', fontSize: 14, lineHeight: 22, marginBottom: 24 },
  allocationRow:   { flexDirection: 'row', gap: 12, marginBottom: 32 },
  allocationBadge: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 12, alignItems: 'center' },
  allocationPct:   { fontSize: 22, fontWeight: '700' },
  allocationLabel: { color: '#666', fontSize: 12, marginTop: 2 },
  amountLabel:     { color: '#ccc', fontSize: 15, marginBottom: 12 },
  amountInputRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 12, paddingHorizontal: 16, marginBottom: 24, borderWidth: 0.5, borderColor: '#333' },
  rupeeSign:       { color: '#4ade80', fontSize: 22, fontWeight: '700', marginRight: 8 },
  amountInput:     { flex: 1, color: '#fff', fontSize: 22, height: 56, fontWeight: '600' },
  buildBtn:        { backgroundColor: '#4ade80', borderRadius: 14, padding: 18, alignItems: 'center' },
  buildBtnText:    { color: '#052e16', fontSize: 16, fontWeight: '700' },
  buildingText:    { color: '#fff', fontSize: 16, marginTop: 20, fontWeight: '600' },
  buildingSub:     { color: '#666', fontSize: 13, marginTop: 8 },
});