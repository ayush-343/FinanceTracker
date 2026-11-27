import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../src/theme';
import { AskResultCard } from '../src/components';
import { useCurrency, useHaptics } from '../src/hooks';
import { useSettingsStore } from '../src/store';
import { getCategories } from '../src/database';
import { getEngine } from '../src/ai/engine';
import { askQuestion } from '../src/ai/ask/ask';
import { askDb } from '../src/ai/ask/db';
import { AskResult } from '../src/ai/ask/execute';

// Text on the brand blue stays white in both themes, as in the shared Button.
const ON_PRIMARY = '#FFFFFF';

const STARTERS = [
    'How much did I spend this month?',
    'Biggest categories last month',
    'This month vs last month',
    'Largest purchases this week',
];

interface Exchange { id: number; question: string; answer?: { result: AskResult; sentence: string } }

export function AskView({ asTab = false, initialQuestion }: { asTab?: boolean; initialQuestion?: string }) {
    const router = useRouter();
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { format: money } = useCurrency();
    const { light } = useHaptics();
    const { aiEngine, localModelId, budgetPeriod } = useSettingsStore();
    const [input, setInput] = useState('');
    const [exchanges, setExchanges] = useState<Exchange[]>([]);
    const [busy, setBusy] = useState(false);
    const scrollRef = useRef<ScrollView>(null);

    const ask = async (question: string) => {
        const q = question.trim();
        if (!q || busy) return;
        light();
        setInput('');
        const id = Date.now();
        setExchanges((prev) => [...prev, { id, question: q }]);
        setBusy(true);
        try {
            const engine = await getEngine(aiEngine, localModelId);
            const answer = engine
                ? await askQuestion(q, {
                    engine,
                    db: askDb,
                    today: new Date(),
                    categories: (await getCategories()).map((c) => ({ id: c.id, name: c.name })),
                    budgetPeriod,
                    formatMoney: money,
                })
                : { result: { kind: 'unsupported' as const, reason: 'On-device AI is off. Turn it on in Settings.' }, sentence: 'On-device AI is off. Turn it on in Settings.' };
            setExchanges((prev) => prev.map((e) => (e.id === id ? { ...e, answer } : e)));
        } catch (error) {
            console.warn('[Ask] failed:', error);
            const sentence = 'Something went wrong. Please try again.';
            setExchanges((prev) => prev.map((e) => (e.id === id ? { ...e, answer: { result: { kind: 'unsupported', reason: sentence }, sentence } } : e)));
        } finally {
            setBusy(false);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
        }
    };

    // Asked from Activity search: ask it once when it arrives.
    const lastAsked = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (initialQuestion && initialQuestion !== lastAsked.current) {
            lastAsked.current = initialQuestion;
            ask(initialQuestion);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialQuestion]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={asTab ? ['top'] : ['top', 'bottom']}>
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
                    {asTab ? <View style={{ width: 24 }} /> : (
                    <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Feather name="x" size={24} color={colors.text} />
                    </TouchableOpacity>
                    )}
                    <Text style={[textStyles.h3, { color: colors.text }]}>Ask</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
                    {exchanges.length === 0 && (
                        <View>
                            <Text style={[textStyles.h2, { color: colors.text }]}>Ask about your spending</Text>
                            <Text style={[textStyles.body, { color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.lg }]}>
                                Answers are worked out from your own data on this phone.
                            </Text>
                            {STARTERS.map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    onPress={() => ask(s)}
                                    accessibilityRole="button"
                                    style={[styles.starter, { borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm }]}
                                >
                                    <Text style={[textStyles.body, { color: colors.primary }]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {exchanges.map((e) => (
                        <View key={e.id} style={{ marginBottom: spacing.lg }}>
                            <View style={[styles.bubble, { backgroundColor: colors.primary, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm }]}>
                                <Text style={[textStyles.body, { color: ON_PRIMARY }]}>{e.question}</Text>
                            </View>
                            {e.answer ? (
                                <AskResultCard result={e.answer.result} sentence={e.answer.sentence} />
                            ) : (
                                <View style={[styles.thinking, { padding: spacing.md }]}>
                                    <ActivityIndicator color={colors.textSecondary} />
                                    <Text style={[textStyles.bodySmall, { color: colors.textSecondary, marginLeft: spacing.sm }]}>Thinking…</Text>
                                </View>
                            )}
                        </View>
                    ))}
                </ScrollView>

                <View style={[styles.inputRow, { borderTopColor: colors.border, padding: spacing.md }]}>
                    <TextInput
                        value={input}
                        onChangeText={setInput}
                        placeholder="Ask a question…"
                        placeholderTextColor={colors.textSecondary}
                        style={[textStyles.body, styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, borderRadius: borderRadius.full, paddingHorizontal: spacing.lg }]}
                        returnKeyType="send"
                        onSubmitEditing={() => ask(input)}
                        editable={!busy}
                        accessibilityLabel="Your question"
                    />
                    <TouchableOpacity
                        onPress={() => ask(input)}
                        disabled={busy || !input.trim()}
                        accessibilityRole="button"
                        accessibilityLabel="Send question"
                        style={[styles.send, { backgroundColor: busy || !input.trim() ? colors.border : colors.primary }]}
                    >
                        <Feather name="arrow-up" size={20} color={ON_PRIMARY} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
    starter: { borderWidth: 1, minHeight: 44, justifyContent: 'center' },
    bubble: { alignSelf: 'flex-end', maxWidth: '85%' },
    thinking: { flexDirection: 'row', alignItems: 'center' },
    inputRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
    input: { flex: 1, minHeight: 44, borderWidth: 1 },
    send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});

export default function AskScreen() {
    return <AskView />;
}
