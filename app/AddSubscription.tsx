import React, { useReducer, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '../src/theme';
import { Button, TextInput as CustomTextInput } from '../src/components';
import { useSubscriptionStore } from '../src/store';
import { useHaptics } from '../src/hooks';
import { Category, SubscriptionFrequency } from '../src/types';
import { getCategories } from '../src/database';

const FREQUENCIES: { value: SubscriptionFrequency; label: string; description: string }[] = [
    { value: 'daily', label: 'Daily', description: 'Every day' },
    { value: 'weekly', label: 'Weekly', description: 'Once a week' },
    { value: 'monthly', label: 'Monthly', description: 'Once a month' },
];

// --- useReducer state & actions ---
type AddSubscriptionState = {
    name: string;
    amount: string;
    frequency: SubscriptionFrequency;
    selectedCategory: Category | null;
    categories: Category[];
    showCategoryPicker: boolean;
    isSubmitting: boolean;
};

type AddSubscriptionAction =
    | { type: 'SET_FIELD'; field: keyof AddSubscriptionState; value: any }
    | { type: 'LOAD_DATA'; payload: Partial<AddSubscriptionState> };

const initialState: AddSubscriptionState = {
    name: '',
    amount: '',
    frequency: 'monthly',
    selectedCategory: null,
    categories: [],
    showCategoryPicker: false,
    isSubmitting: false,
};

function addSubscriptionReducer(state: AddSubscriptionState, action: AddSubscriptionAction): AddSubscriptionState {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value };
        case 'LOAD_DATA':
            return { ...state, ...action.payload };
        default:
            return state;
    }
}

export const AddSubscriptionScreen: React.FC = () => {
    const router = useRouter();
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { success, error: errorHaptic, light } = useHaptics();
    const { addSubscription } = useSubscriptionStore();

    const [state, dispatch] = useReducer(addSubscriptionReducer, initialState);
    const { name, amount, frequency, selectedCategory, categories, showCategoryPicker, isSubmitting } = state;

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        const cats = await getCategories();
        dispatch({ type: 'SET_FIELD', field: 'categories', value: cats });
    };

    const handleCategorySelect = (category: Category) => {
        light();
        dispatch({ type: 'LOAD_DATA', payload: { selectedCategory: category, showCategoryPicker: false } });
    };

    const handleSubmit = async () => {
        // Validation
        if (!name.trim()) {
            errorHaptic();
            Alert.alert('Missing Name', 'Please enter a subscription name.');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            errorHaptic();
            Alert.alert('Invalid Amount', 'Please enter a valid amount.');
            return;
        }

        if (!selectedCategory) {
            errorHaptic();
            Alert.alert('Select Category', 'Please select a category for this subscription.');
            return;
        }

        dispatch({ type: 'SET_FIELD', field: 'isSubmitting', value: true });
        try {
            await addSubscription({
                category_id: selectedCategory.id,
                name: name.trim(),
                amount: parseFloat(amount),
                frequency,
                start_date: format(new Date(), 'yyyy-MM-dd'),
            });
            success();
            router.back();
        } catch (err) {
            errorHaptic();
            Alert.alert('Error', 'Failed to create subscription. Please try again.');
        } finally {
            dispatch({ type: 'SET_FIELD', field: 'isSubmitting', value: false });
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header */}
                <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Feather name="x" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[textStyles.h3, { color: colors.text }]}>New Subscription</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Name Input */}
                    <View style={{ marginTop: spacing.xl }}>
                        <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Subscription Name
                        </Text>
                        <CustomTextInput
                            value={name}
                            onChangeText={(v) => dispatch({ type: 'SET_FIELD', field: 'name', value: v })}
                            placeholder="e.g., Netflix, Gym Membership"
                            autoCapitalize="words"
                        />
                    </View>

                    {/* Amount Input */}
                    <View style={{ marginTop: spacing.xl }}>
                        <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Amount
                        </Text>
                        <CustomTextInput
                            value={amount}
                            onChangeText={(v) => dispatch({ type: 'SET_FIELD', field: 'amount', value: v })}
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                        />
                    </View>

                    {/* Frequency Picker */}
                    <View style={{ marginTop: spacing.xl }}>
                        <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Frequency
                        </Text>
                        <View style={styles.frequencyContainer}>
                            {FREQUENCIES.map((f) => (
                                <TouchableOpacity
                                    key={f.value}
                                    style={[
                                        styles.frequencyOption,
                                        {
                                            backgroundColor: frequency === f.value ? colors.primary : colors.card,
                                            borderRadius: borderRadius.lg,
                                            padding: spacing.md,
                                            flex: 1,
                                        },
                                    ]}
                                    onPress={() => {
                                        light();
                                        dispatch({ type: 'SET_FIELD', field: 'frequency', value: f.value });
                                    }}
                                >
                                    <Text
                                        style={[
                                            textStyles.body,
                                            {
                                                color: frequency === f.value ? '#FFF' : colors.text,
                                                fontWeight: '600',
                                                textAlign: 'center',
                                            },
                                        ]}
                                    >
                                        {f.label}
                                    </Text>
                                    <Text
                                        style={[
                                            textStyles.labelSmall,
                                            {
                                                color: frequency === f.value ? 'rgba(255,255,255,0.8)' : colors.textSecondary,
                                                textAlign: 'center',
                                                marginTop: 2,
                                            },
                                        ]}
                                    >
                                        {f.description}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Category Picker */}
                    <View style={{ marginTop: spacing.xl }}>
                        <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Category
                        </Text>
                        <TouchableOpacity
                            style={[
                                styles.pickerButton,
                                {
                                    backgroundColor: colors.card,
                                    borderRadius: borderRadius.lg,
                                    padding: spacing.lg,
                                    borderLeftWidth: selectedCategory ? 4 : 0,
                                    borderLeftColor: selectedCategory?.color,
                                },
                            ]}
                            onPress={() => dispatch({ type: 'SET_FIELD', field: 'showCategoryPicker', value: !showCategoryPicker })}
                        >
                            {selectedCategory ? (
                                <>
                                    <View
                                        style={[
                                            styles.iconContainer,
                                            { backgroundColor: `${selectedCategory.color}20` },
                                        ]}
                                    >
                                        <Feather
                                            name={selectedCategory.icon_name as any}
                                            size={20}
                                            color={selectedCategory.color}
                                        />
                                    </View>
                                    <Text style={[textStyles.body, { color: colors.text, marginLeft: spacing.md, flex: 1 }]}>
                                        {selectedCategory.name}
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Feather name="folder" size={20} color={colors.textSecondary} />
                                    <Text style={[textStyles.body, { color: colors.textSecondary, marginLeft: spacing.md, flex: 1 }]}>
                                        Select a category
                                    </Text>
                                </>
                            )}
                            <Feather name={showCategoryPicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                        </TouchableOpacity>

                        {showCategoryPicker && (
                            <View
                                style={[
                                    styles.dropdown,
                                    {
                                        backgroundColor: colors.card,
                                        borderRadius: borderRadius.lg,
                                        marginTop: spacing.sm,
                                        padding: spacing.sm,
                                    },
                                ]}
                            >
                                {categories.map((category) => (
                                    <TouchableOpacity
                                        key={category.id}
                                        style={[
                                            styles.dropdownItem,
                                            {
                                                backgroundColor: selectedCategory?.id === category.id ? `${colors.primary}10` : 'transparent',
                                                borderRadius: borderRadius.md,
                                                padding: spacing.md,
                                            },
                                        ]}
                                        onPress={() => handleCategorySelect(category)}
                                    >
                                        <View
                                            style={[
                                                styles.iconContainerSmall,
                                                { backgroundColor: `${category.color}20` },
                                            ]}
                                        >
                                            <Feather name={category.icon_name as any} size={16} color={category.color} />
                                        </View>
                                        <Text style={[textStyles.body, { color: colors.text, marginLeft: spacing.sm, flex: 1 }]}>
                                            {category.name}
                                        </Text>
                                        {selectedCategory?.id === category.id && (
                                            <Feather name="check" size={18} color={colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                                {categories.length === 0 && (
                                    <Text style={[textStyles.body, { color: colors.textSecondary, textAlign: 'center', padding: spacing.lg }]}>
                                        No categories yet. Create one first.
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Info */}
                    <View
                        style={[
                            styles.infoBox,
                            {
                                backgroundColor: `${colors.primary}10`,
                                borderRadius: borderRadius.lg,
                                padding: spacing.lg,
                                marginTop: spacing.xl,
                            },
                        ]}
                    >
                        <Feather name="info" size={20} color={colors.primary} />
                        <Text style={[textStyles.bodySmall, { color: colors.text, marginLeft: spacing.sm, flex: 1 }]}>
                            Recurring subscriptions will automatically create transactions based on the frequency. You can skip individual occurrences if needed.
                        </Text>
                    </View>

                    {/* Submit Button */}
                    <View style={{ marginTop: spacing.xxl }}>
                        <Button
                            title="Create Subscription"
                            onPress={handleSubmit}
                            loading={isSubmitting}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    scrollView: {
        flex: 1,
    },
    frequencyContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    frequencyOption: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainerSmall: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropdown: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
});

export default AddSubscriptionScreen;
