import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../src/theme';
import { Button } from '../src/components';
import { useDictation, useHaptics } from '../src/hooks';
import { useSettingsStore } from '../src/store';
import { getCategories, loadCategoryMemory, loadKnownItems } from '../src/database';
import { getEngine } from '../src/ai/engine';
import { parseQuickLog } from '../src/ai/quicklog/parse';
import { suggestCategory } from '../src/ai/categorizer';

const EXAMPLES = ['250 uber yesterday', '₹1,200 groceries at DMart', 'coffee 180 at Blue Tokai last friday'];

export default function QuickLogScreen() {
    const router = useRouter();
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { light, error: errorHaptic } = useHaptics();
    const { currency, aiEngine, localModelId } = useSettingsStore();
    const dictation = useDictation();
    const [text, setText] = useState('');
    const [usedMic, setUsedMic] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (dictation.transcript) setText(dictation.transcript);
    }, [dictation.transcript]);

    const toggleMic = async () => {
        light();
        if (dictation.listening) {
            dictation.stop();
        } else {
            setUsedMic(true);
            await dictation.start();
        }
    };

    const handleContinue = async () => {
        const input = text.trim();
        if (!input) {
            errorHaptic();
            return;
        }
        if (dictation.listening) dictation.stop();
        setIsParsing(true);
        try {
            const categories = await getCategories();
            const engine = await getEngine(aiEngine, localModelId);
            const result = await parseQuickLog(input, {
                engine,
                today: new Date(),
                currency,
                categoryNames: categories.map((c) => c.name),
            });

            const [memory, items] = await Promise.all([loadCategoryMemory(), loadKnownItems()]);
            const learned = suggestCategory(result.merchant ?? result.item ?? input, memory, items, new Set(categories.map((c) => c.id)));
            const hinted = result.categoryHint
                ? categories.find((c) => c.name.toLowerCase() === result.categoryHint!.toLowerCase())
                : undefined;
            const categoryId = learned?.categoryId ?? hinted?.id;

            router.replace({
                pathname: '/AddTransaction',
                params: {
                    ...(result.amount != null ? { amount: String(result.amount) } : {}),
                    itemName: result.item ?? result.merchant ?? input,
                    date: result.date,
                    ...(result.merchant ? { merchant: result.merchant } : {}),
                    source: usedMic ? 'voice' : 'text',
                    ...(categoryId != null ? { categoryId: String(categoryId) } : {}),
                    ...(learned?.subcategoryId != null ? { subcategoryId: String(learned.subcategoryId) } : {}),
                },
            });
        } catch (error) {
            console.warn('[QuickLog] failed:', error);
            errorHaptic();
            Alert.alert("Couldn't Read That", 'Try rewording it, or add the purchase manually.', [
                { text: 'Add Manually', onPress: () => router.replace('/AddTransaction') },
                { text: 'OK', style: 'cancel' },
            ]);
        } finally {
            setIsParsing(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
                    <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Feather name="x" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[textStyles.h3, { color: colors.text }]}>Type or Say It</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
                    <Text style={[textStyles.label, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.sm }]}>
                        What did you spend on?
                    </Text>
                    <View style={[styles.inputCard, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, borderRadius: borderRadius.lg, padding: spacing.lg }]}>
                        <TextInput
                            ref={inputRef}
                            value={text}
                            onChangeText={(value) => { setText(value); }}
                            placeholder="e.g. 250 uber yesterday"
                            placeholderTextColor={colors.textSecondary}
                            style={[textStyles.h3, styles.input, { color: colors.text }]}
                            multiline
                            autoFocus
                            returnKeyType="done"
                            blurOnSubmit
                            onSubmitEditing={handleContinue}
                            accessibilityLabel="Describe your purchase"
                        />
                        {dictation.available && (
                            <TouchableOpacity
                                onPress={toggleMic}
                                accessibilityRole="button"
                                accessibilityLabel={dictation.listening ? 'Stop dictation' : 'Start dictation'}
                                style={[
                                    styles.mic,
                                    {
                                        backgroundColor: dictation.listening ? colors.primary : `${colors.primary}1A`,
                                        borderRadius: borderRadius.full,
                                    },
                                ]}
                            >
                                <Feather name={dictation.listening ? 'square' : 'mic'} size={22} color={dictation.listening ? '#FFFFFF' : colors.primary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={[textStyles.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                        {dictation.listening
                            ? 'Listening… tap stop when you’re done.'
                            : dictation.error
                                ? dictation.error
                                : dictation.available
                                    ? 'Type, or tap the mic. Speech stays on this phone.'
                                    : 'Voice isn’t available on this device. Typing works.'}
                    </Text>

                    <Text style={[textStyles.label, { color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.sm }]}>
                        Try
                    </Text>
                    {EXAMPLES.map((example) => (
                        <TouchableOpacity
                            key={example}
                            onPress={() => { light(); setText(example); setUsedMic(false); }}
                            style={styles.example}
                            accessibilityRole="button"
                            accessibilityHint="Fills the box with this example"
                        >
                            <Text style={[textStyles.body, { color: colors.primary }]}>“{example}”</Text>
                        </TouchableOpacity>
                    ))}

                    <View style={{ flex: 1 }} />
                    <Text style={[textStyles.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.sm }]}>
                        You’ll check everything before it’s saved.
                    </Text>
                    <Button title="Continue" onPress={handleContinue} loading={isParsing} disabled={isParsing || !text.trim()} fullWidth style={{ marginBottom: spacing.lg }} />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
    inputCard: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1 },
  example: { minHeight: 44, justifyContent: 'center' },
    input: { flex: 1, minHeight: 72, textAlignVertical: 'top' },
    mic: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
});
