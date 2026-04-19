import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  StyleSheet, Animated,
} from 'react-native';
import Svg, { Circle, Path, G, Text as SvgText } from 'react-native-svg';
import { Colors } from '@/config/theme';
import { useAppStore } from '@/store/useAppStore';


const API = 'http://localhost:8000'; 

const colors = Colors.dark;

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

export default function Portfolio() {
  const { portfolio: storePortfolio, sessionId: storeSessionId } = useAppStore();
  
  const [portfolio, setPortfolio] = useState<Portfolio | null>(storePortfolio);
  const [sessionId, setSessionId] = useState<string>(storeSessionId || '');
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [agentBusy, setAgentBusy] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Initialize with store data
    if (storePortfolio) {
      setPortfolio(storePortfolio);
      setMessages([{
        role: 'agent',
        text: `Your ${storePortfolio.profile} portfolio is ready! I've invested ₹${storePortfolio.amount.toLocaleString('en-IN')} across ${storePortfolio.holdings.length} instruments. Ask me anything about it.`,
      }]);
    }
    if (storeSessionId) {
      setSessionId(storeSessionId);
    }
  }, [storePortfolio, storeSessionId]);


  async function handleSend() {
    if (!input.trim() || agentBusy) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setAgentBusy(true);

    try {
      const res  = await fetch(`${API}/agent/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ session_id: sessionId, message: userMsg }),
      });
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

  if (!portfolio) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4ade80" />
      </View>
    );
  }

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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0d0d0d', padding: 20 },
  centered:        { flex: 1, backgroundColor: '#0d0d0d', alignItems: 'center', justifyContent: 'center' },
  section:         { marginBottom: 12 },
  sectionTitle:    { color: '#fff', fontSize: 20, fontWeight: '700' },
  sectionSub:      { color: '#888', fontSize: 13, marginTop: 4 },
  card:            { backgroundColor: '#111', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 0.5, borderColor: '#222' },
  cardTitle:       { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 12 },

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