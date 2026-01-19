import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Button, TextInput as CustomTextInput } from '../../components';
import { useSubscriptionStore } from '../../store';
import { useHaptics } from '../../hooks';
import { RootStackParamList, Category, Subscription, SubscriptionFrequency } from '../../types';
import { getCategories, getSubscriptionById, updateSubscription, deleteSubscription } from '../../database';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'EditSubscription'>;
    route: RouteProp<RootStackParamList, 'EditSubscription'>;
};

const FREQUENCIES: { value: SubscriptionFrequency; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
];

export const EditSubscriptionScreen: React.FC<Props> = ({ navigation, route }) => {
    const { subscriptionId } = route.params;
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { success, error: errorHaptic, light } = useHaptics();
    const { loadSubscriptions } = useSubscriptionStore();

    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState<SubscriptionFrequency>('monthly');
    const [isActive, setIsActive] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [subscriptionId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load subscription
            const sub = await getSubscriptionById(subscriptionId);
            if (sub) {
                setSubscription(sub);
                setName(sub.name);
                setAmount(sub.amount.toString());
                setFrequency(sub.frequency as SubscriptionFrequency);
                setIsActive(sub.is_active);
            }

            // Load categories
            const cats = await getCategories();
            setCategories(cats);

            // Set selected category
            if (sub) {
                const cat = cats.find(c => c.id === sub.category_id);
                setSelectedCategory(cat || null);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCategorySelect = (category: Category) => {
        light();
        setSelectedCategory(category);
        setShowCategoryPicker(false);
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

        setIsSubmitting(true);
        try {
            await updateSubscription(subscriptionId, {
                category_id: selectedCategory.id,
                name: name.trim(),
                amount: parseFloat(amount),
                frequency,
                is_active: isActive,
            });
            await loadSubscriptions();
            success();
            navigation.goBack();
        } catch (err) {
            errorHaptic();
            Alert.alert('Error', 'Failed to update subscription. Please try again.');
        } finally {
            setIsSubmitting(false);
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
                            await deleteSubscription(subscriptionId);
                            await loadSubscriptions();
                            success();
                            navigation.goBack();
                        } catch (err) {
                            errorHaptic();
                            Alert.alert('Error', 'Failed to delete subscription.');
                        }
                    },
                },
            ]
        );
    };

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
                    <TouchableOpacity onPress={() => navigation.goBack()}>
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
                                setIsActive(value);
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
                            onChangeText={setName}
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
                            onChangeText={setAmount}
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
                                        setFrequency(f.value);
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
                            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
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
                            </View>
                        )}
                    </View>

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
