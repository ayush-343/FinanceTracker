import React, { useReducer, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../src/theme';
import { Button, TextInput as CustomTextInput } from '../src/components';
import { useSubscriptionStore } from '../src/store';
import { useHaptics } from '../src/hooks';
import { Category, Subscription, SubscriptionFrequency } from '../src/types';
import { getCategories, getSubscriptionById, updateSubscription, deleteSubscription } from '../src/database';

const FREQUENCIES: { value: SubscriptionFrequency; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
];

// --- Extracted sub-component: Category Picker ---
const SubscriptionCategoryPicker: React.FC<{
    categories: Category[];
    selectedCategory: Category | null;
    showCategoryPicker: boolean;
    onTogglePicker: () => void;
    onSelectCategory: (category: Category) => void;
}> = ({ categories, selectedCategory, showCategoryPicker, onTogglePicker, onSelectCategory }) => {
    const { colors, spacing, textStyles, borderRadius } = useTheme();

    return (
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
                onPress={onTogglePicker}
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
                            onPress={() => onSelectCategory(category)}
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
                </View>
            )}
        </View>
    );
};

// --- useReducer state & actions ---
type EditSubscriptionState = {
    subscription: Subscription | null;
    name: string;
    amount: string;
    frequency: SubscriptionFrequency;
    isActive: boolean;
    selectedCategory: Category | null;
    categories: Category[];
    showCategoryPicker: boolean;
    isSubmitting: boolean;
    isLoading: boolean;
};

type EditSubscriptionAction =
    | { type: 'SET_FIELD'; field: keyof EditSubscriptionState; value: any }
    | { type: 'LOAD_DATA'; payload: Partial<EditSubscriptionState> };

const initialState: EditSubscriptionState = {
    subscription: null,
    name: '',
    amount: '',
    frequency: 'monthly',
    isActive: true,
    selectedCategory: null,
    categories: [],
    showCategoryPicker: false,
    isSubmitting: false,
    isLoading: true,
};

function editSubscriptionReducer(state: EditSubscriptionState, action: EditSubscriptionAction): EditSubscriptionState {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value };
        case 'LOAD_DATA':
            return { ...state, ...action.payload };
        default:
            return state;
    }
}

export const EditSubscriptionScreen: React.FC = () => {
    const router = useRouter();
    const { subscriptionId } = useLocalSearchParams<{ subscriptionId?: string }>();
    const parsedSubscriptionId = subscriptionId ? Number(subscriptionId) : NaN;
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { success, error: errorHaptic, light } = useHaptics();
    const { loadSubscriptions } = useSubscriptionStore();

    const [state, dispatch] = useReducer(editSubscriptionReducer, initialState);
    const { subscription, name, amount, frequency, isActive, selectedCategory, categories, showCategoryPicker, isSubmitting, isLoading } = state;

    useEffect(() => {
        if (Number.isFinite(parsedSubscriptionId)) {
            loadData();
        }
    }, [parsedSubscriptionId]);

    const loadData = async () => {
        dispatch({ type: 'SET_FIELD', field: 'isLoading', value: true });
        try {
            const sub = await getSubscriptionById(parsedSubscriptionId);
            const cats = await getCategories();
            const selectedCat = sub ? cats.find(c => c.id === sub.category_id) || null : null;

            dispatch({
                type: 'LOAD_DATA',
                payload: {
                    subscription: sub,
                    name: sub?.name || '',
                    amount: sub?.amount.toString() || '',
                    frequency: (sub?.frequency as SubscriptionFrequency) || 'monthly',
                    isActive: sub?.is_active ?? true,
                    categories: cats,
                    selectedCategory: selectedCat,
                    isLoading: false,
                },
            });
        } catch {
            dispatch({ type: 'SET_FIELD', field: 'isLoading', value: false });
        }
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
            await updateSubscription(parsedSubscriptionId, {
                category_id: selectedCategory.id,
                name: name.trim(),
                amount: parseFloat(amount),
                frequency,
                is_active: isActive,
            });
            await loadSubscriptions();
            success();
            router.back();
        } catch (err) {
            errorHaptic();
            Alert.alert('Error', 'Failed to update subscription. Please try again.');
        } finally {
            dispatch({ type: 'SET_FIELD', field: 'isSubmitting', value: false });
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Subscription',
            `Are you sure you want to delete "${name}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteSubscription(parsedSubscriptionId);
                            await loadSubscriptions();
                            success();
                            router.back();
                        } catch (err) {
                            errorHaptic();
                            Alert.alert('Error', 'Failed to delete subscription.');
                        }
                    },
                },
            ]
        );
    };

    if (!Number.isFinite(parsedSubscriptionId)) {
        return null;
    }

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <Text style={[textStyles.body, { color: colors.textSecondary }]}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header */}
                <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Feather name="arrow-left" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[textStyles.h3, { color: colors.text }]}>Edit Subscription</Text>
                    <TouchableOpacity onPress={handleDelete}>
                        <Feather name="trash-2" size={24} color={colors.error} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Active Toggle */}
                    <View
                        style={[
                            styles.toggleRow,
                            {
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.lg,
                                padding: spacing.lg,
                                marginTop: spacing.xl,
                            },
                        ]}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={[textStyles.body, { color: colors.text }]}>Active</Text>
                            <Text style={[textStyles.labelSmall, { color: colors.textSecondary }]}>
                                {isActive ? 'This subscription is active' : 'This subscription is paused'}
                            </Text>
                        </View>
                        <Switch
                            value={isActive}
                            onValueChange={(value) => {
                                light();
                                dispatch({ type: 'SET_FIELD', field: 'isActive', value });
                            }}
                            trackColor={{ false: colors.border, true: colors.primary }}
                        />
                    </View>

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
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <SubscriptionCategoryPicker
                        categories={categories}
                        selectedCategory={selectedCategory}
                        showCategoryPicker={showCategoryPicker}
                        onTogglePicker={() => dispatch({ type: 'SET_FIELD', field: 'showCategoryPicker', value: !showCategoryPicker })}
                        onSelectCategory={handleCategorySelect}
                    />

                    {/* Submit Button */}
                    <View style={{ marginTop: spacing.xxl }}>
                        <Button
                            title="Save Changes"
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
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
});

export default EditSubscriptionScreen;
