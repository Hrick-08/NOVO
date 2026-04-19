// app/(tabs)/invest.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  StyleSheet, Animated,
} from 'react-native';
import Svg, { Circle, Path, G, Text as SvgText } from 'react-native-svg';
import { Colors } from '@/config/theme';
import { BASE_URL } from '@/config/api';  // add this import


// const API = 'http://localhost:8000'; 
const SESSION_ID = 'user_session_1'; 

const colors = Colors.dark;


type Screen = 'quiz' | 'amount' | 'building' | 'portfolio' | 'agent';

interface QuizAnswer { [key: string]: string }

interface Holding {
  ticker: string; name: string;
  weight: number; rupees: number; asset_class: string;
}

interface Health {
  overall: number; diversification: number;
  risk_adjusted: number; horizon_fit: number;
  annual_return: number; annual_vol: number;
}

interface Scenarios {
  amount: number; safe: number;
  moderate: number; optimistic: number; loss_prob: number;
}

interface MonteCarlo {
  loss_probability: number;
  median: number; p10: number; p90: number;
}

interface Portfolio {
  profile: string; amount: number;
  holdings: Holding[]; health: Health;
  scenarios: Scenarios; monte_carlo: MonteCarlo;
}

interface Message { role: 'user' | 'agent'; text: string }

// ── Quiz Data ─────────────────────────────────────────────────────────────────

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

// ── Sub-components ────────────────────────────────────────────────────────────

function LossProbabilityMeter({ probability }: { probability: number }) {
  const size    = 160;
  const stroke  = 14;
  const r       = (size - stroke) / 2;
  const circ    = 2 * Math.PI * r;
  const safe    = 100 - probability;
  const safeDash = (safe / 100) * circ;
  const lossDash = (probability / 100) * circ;

  const color = probability < 20 ? '#4ade80' : probability < 40 ? '#fbbf24' : '#f87171';

  return (
    <View style={styles.meterWrap}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2},${size / 2}`}>
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            stroke="#1e1e1e" strokeWidth={stroke} fill="none"
          />
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            stroke="#4ade80"
            strokeWidth={stroke} fill="none"
            strokeDasharray={`${safeDash} ${circ}`}
            strokeLinecap="round"
          />
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={color}
            strokeWidth={stroke} fill="none"
            strokeDasharray={`${lossDash} ${circ}`}
            strokeDashoffset={-safeDash}
            strokeLinecap="round"
          />
        </G>
        <SvgText
          x={size / 2} y={size / 2 - 8}
          textAnchor="middle" fontSize={26} fontWeight="700" fill="#fff"
        >
          {probability}%
        </SvgText>
        <SvgText
          x={size / 2} y={size / 2 + 14}
          textAnchor="middle" fontSize={11} fill="#888"
        >
          loss chance
        </SvgText>
      </Svg>
      <Text style={styles.meterLabel}>
        There is a <Text style={{ color }}>{probability}% chance</Text> you
        earn less than you put in over 1 year.
      </Text>
    </View>
  );
}

function ScenarioCard({
  label, amount, color, sub,
}: {
  label: string; amount: number; color: string; sub: string
}) {
  return (
    <View style={[styles.scenarioCard, { borderColor: color }]}>
      <Text style={styles.scenarioLabel}>{label}</Text>
      <Text style={[styles.scenarioAmount, { color }]}>
        ₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </Text>
      <Text style={styles.scenarioSub}>{sub}</Text>
    </View>
  );
}

function AllocationBar({ holdings }: { holdings: Holding[] }) {
  const CLASS_COLORS: Record<string, string> = {
    Equity: '#4ade80',
    Debt:   '#60a5fa',
    Gold:   '#fbbf24',
  };

  // Merge by asset class
  const merged: Record<string, number> = {};
  holdings.forEach(h => {
    merged[h.asset_class] = (merged[h.asset_class] || 0) + h.weight;
  });

  return (
    <View>
      <View style={styles.barTrack}>
        {Object.entries(merged).map(([cls, pct]) => (
          <View
            key={cls}
            style={{
              width:           `${pct}%`,
              height:          12,
              backgroundColor: CLASS_COLORS[cls] || '#888',
              borderRadius:    4,
            }}
          />
        ))}
      </View>
      <View style={styles.barLegend}>
        {Object.entries(merged).map(([cls, pct]) => (
          <View key={cls} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: CLASS_COLORS[cls] || '#888' }]} />
            <Text style={styles.legendText}>{cls} {pct.toFixed(0)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function HealthRing({ score }: { score: number }) {
  const size  = 80;
  const sw    = 8;
  const r     = (size - sw) / 2;
  const circ  = 2 * Math.PI * r;
  const dash  = (score / 100) * circ;
  const color = score >= 70 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#f87171';

  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${size / 2},${size / 2}`}>
        <Circle cx={size/2} cy={size/2} r={r} stroke="#1e1e1e" strokeWidth={sw} fill="none" />
        <Circle cx={size/2} cy={size/2} r={r} stroke={color}
          strokeWidth={sw} fill="none"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </G>
      <SvgText x={size/2} y={size/2+5} textAnchor="middle"
        fontSize={16} fontWeight="700" fill="#fff">{score}</SvgText>
    </Svg>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAgent]}>
      {!isUser && (
        <Text style={styles.bubbleTag}>AI Agent</Text>
      )}
      <Text style={styles.bubbleText}>{message.text}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function InvestScreen() {
  const [screen,    setScreen]    = useState<Screen>('quiz');
  const [qIndex,    setQIndex]    = useState(0);
  const [answers,   setAnswers]   = useState<QuizAnswer>({});
  const [profile,   setProfile]   = useState<any>(null);
  const [amount,    setAmount]    = useState('');
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [agentBusy, setAgentBusy] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
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
        const res  = await fetch(`${BASE_URL}/quiz/score`, {
          method:  'POST',
          headers: { 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body:    JSON.stringify({ answers: updated }),
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`API Error: ${errText}`);
        }
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
      const res  = await fetch(`${BASE_URL}/portfolio/build`, {
        method:  'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          profile_name: profile.profile,
          total_score:  profile.total_score,
          answers:      profile.answers,
          amount:       parseFloat(amount),
          session_id:   SESSION_ID,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API Error: ${errText}`);
      }
      const data = await res.json();
      setPortfolio(data);

      setMessages([{
        role: 'agent',
        text: `Your ${data.profile} portfolio is ready! I've invested ₹${parseFloat(amount).toLocaleString('en-IN')} across ${data.holdings.length} instruments. Ask me anything about it.`,
      }]);

      setScreen('portfolio');
    } catch (e) {
      console.error(e);
      setScreen('amount');
    }
  }


  async function handleSend() {
    if (!input.trim() || agentBusy) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setAgentBusy(true);

    try {
      const res  = await fetch(`${BASE_URL}/agent/chat`, {
        method:  'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body:    JSON.stringify({ session_id: SESSION_ID, message: userMsg }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API Error: ${errText}`);
      }
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'agent', text: data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'agent',
        text: 'Something went wrong. Please try again.',
      }]);
    } finally {
      setAgentBusy(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

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

  if (screen === 'portfolio' && portfolio) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>

          {/* Header */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{portfolio.profile} Portfolio</Text>
            <Text style={styles.sectionSub}>
              ₹{portfolio.amount.toLocaleString('en-IN')} invested across {portfolio.holdings.length} instruments
            </Text>
          </View>

          {/* Health Score */}
          <View style={styles.card}>
            <View style={styles.healthRow}>
              <HealthRing score={portfolio.health.overall} />
              <View style={styles.healthDetails}>
                <Text style={styles.cardTitle}>Portfolio Health</Text>
                {[
                  { label: 'Diversification', val: portfolio.health.diversification },
                  { label: 'Risk-adjusted',   val: portfolio.health.risk_adjusted   },
                  { label: 'Horizon fit',     val: portfolio.health.horizon_fit     },
                ].map(item => (
                  <View key={item.label} style={styles.healthItem}>
                    <Text style={styles.healthLabel}>{item.label}</Text>
                    <View style={styles.healthBarTrack}>
                      <View style={[styles.healthBarFill, { width: `${item.val}%` }]} />
                    </View>
                    <Text style={styles.healthVal}>{item.val}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Loss Probability Meter */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Loss Probability</Text>
            <LossProbabilityMeter probability={portfolio.monte_carlo.loss_probability} />
          </View>

          {/* ₹X Scenarios */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              What would ₹{portfolio.amount.toLocaleString('en-IN')} do in 1 year?
            </Text>
            <View style={styles.scenarioRow}>
              <ScenarioCard label="Worst case"  amount={portfolio.scenarios.safe}       color="#f87171" sub="10th percentile" />
              <ScenarioCard label="Most likely" amount={portfolio.scenarios.moderate}   color="#4ade80" sub="Median"          />
              <ScenarioCard label="Best case"   amount={portfolio.scenarios.optimistic} color="#60a5fa" sub="90th percentile" />
            </View>
          </View>

          {/* Allocation */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Allocation</Text>
            <AllocationBar holdings={portfolio.holdings} />
            <View style={{ marginTop: 16 }}>
              {portfolio.holdings.map(h => (
                <View key={h.ticker} style={styles.holdingRow}>
                  <View>
                    <Text style={styles.holdingName}>{h.name}</Text>
                    <Text style={styles.holdingClass}>{h.asset_class}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.holdingPct}>{h.weight.toFixed(1)}%</Text>
                    <Text style={styles.holdingRupees}>
                      ₹{h.rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ask AI Agent</Text>
            <View style={styles.suggestions}>
              {[
                'Why these stocks?',
                'What if markets crash 20%?',
                'Explain my risk level',
              ].map(s => (
                <TouchableOpacity
                  key={s}
                  style={styles.suggestionChip}
                  onPress={() => { setInput(s); }}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {messages.map((m, i) => <ChatBubble key={i} message={m} />)}
            {agentBusy && (
              <View style={styles.bubbleAgent}>
                <ActivityIndicator size="small" color="#4ade80" />
              </View>
            )}
          </View>

        </ScrollView>

        <View style={styles.chatBar}>
          <TextInput
            style={styles.chatInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything about your portfolio..."
            placeholderTextColor="#555"
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, agentBusy && { opacity: 0.4 }]}
            onPress={handleSend}
            disabled={agentBusy}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    );
  }

  return null;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0d0d0d', padding: 20 },
  centered:        { flex: 1, backgroundColor: '#0d0d0d', alignItems: 'center', justifyContent: 'center' },
  section:         { marginBottom: 12 },
  sectionTitle:    { color: '#fff', fontSize: 20, fontWeight: '700' },
  sectionSub:      { color: '#888', fontSize: 13, marginTop: 4 },
  card:            { backgroundColor: '#111', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 0.5, borderColor: '#222' },
  cardTitle:       { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 12 },

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

  // Meter
  meterWrap:       { alignItems: 'center', gap: 12 },
  meterLabel:      { color: '#888', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // Scenarios
  scenarioRow:     { flexDirection: 'row', gap: 8 },
  scenarioCard:    { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 12, borderWidth: 1, alignItems: 'center' },
  scenarioLabel:   { color: '#888', fontSize: 11, marginBottom: 6 },
  scenarioAmount:  { fontSize: 15, fontWeight: '700' },
  scenarioSub:     { color: '#555', fontSize: 10, marginTop: 4 },

  // Allocation bar
  barTrack:        { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2, marginBottom: 10 },
  barLegend:       { flexDirection: 'row', gap: 16 },
  legendItem:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:       { width: 8, height: 8, borderRadius: 4 },
  legendText:      { color: '#888', fontSize: 12 },

  // Holdings
  holdingRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#1e1e1e' },
  holdingName:     { color: '#fff', fontSize: 13, fontWeight: '500', maxWidth: 200 },
  holdingClass:    { color: '#555', fontSize: 11, marginTop: 2 },
  holdingPct:      { color: '#4ade80', fontSize: 14, fontWeight: '700' },
  holdingRupees:   { color: '#666', fontSize: 12, marginTop: 2 },

  // Health
  healthRow:       { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  healthDetails:   { flex: 1 },
  healthItem:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  healthLabel:     { color: '#888', fontSize: 11, width: 90 },
  healthBarTrack:  { flex: 1, height: 4, backgroundColor: '#2a2a2a', borderRadius: 2, overflow: 'hidden' },
  healthBarFill:   { height: 4, backgroundColor: '#4ade80', borderRadius: 2 },
  healthVal:       { color: '#fff', fontSize: 11, fontWeight: '600', width: 28, textAlign: 'right' },

  // Chat
  suggestions:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  suggestionChip:  { backgroundColor: '#1a2e1a', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  suggestionText:  { color: '#4ade80', fontSize: 12 },
  bubble:          { borderRadius: 14, padding: 12, marginBottom: 12, maxWidth: '85%'},
  bubbleUser:      { backgroundColor: '#1a2e1a', alignSelf: 'flex-end' },
  bubbleAgent:     { backgroundColor: '#1a1a1a', alignSelf: 'flex-start' },
  bubbleTag:       { color: '#4ade80', fontSize: 10, fontWeight: '700', marginBottom: 4 },
  bubbleText:      { color: '#ddd', fontSize: 14, lineHeight: 20 },
  chatBar:         { flexDirection: 'row', padding: 12, gap: 10, backgroundColor: '#111', borderTopWidth: 0.5, borderTopColor: '#222',paddingBottom: 70 },
  chatInput:       { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 14 },
  sendBtn:         { width: 44, height: 44, backgroundColor: '#4ade80', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sendBtnText:     { color: '#052e16', fontSize: 20, fontWeight: '700' },
});