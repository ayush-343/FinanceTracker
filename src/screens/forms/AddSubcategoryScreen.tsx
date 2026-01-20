import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Button, TextInput as CustomTextInput } from '../../components';
import { useBudgetStore } from '../../store';
import { useHaptics } from '../../hooks';
import { RootStackParamList, Category } from '../../types';
import { getCategoryById, insertSubcategory } from '../../database';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'AddSubcategory'>;
    route: RouteProp<RootStackParamList, 'AddSubcategory'>;
};

export const AddSubcategoryScreen: React.FC<Props> = ({ navigation, route }) => {
    const { categoryId } = route.params;
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { success, error: errorHaptic } = useHaptics();
    const { loadSpendingData } = useBudgetStore();

    const [name, setName] = useState('');
    const [allocatedBudget, setAllocatedBudget] = useState('');
    const [parentCategory, setParentCategory] = useState<Category | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadParentCategory();
    }, [categoryId]);

    const loadParentCategory = async () => {
        const category = await getCategoryById(categoryId);
        setParentCategory(category);
    };

    const handleSubmit = async () => {
        // Validation
        if (!name.trim()) {
            errorHaptic();
            Alert.alert('Missing Name', 'Please enter a subcategory name.');
            return;
        }

        if (allocatedBudget && parseFloat(allocatedBudget) < 0) {
            errorHaptic();
            Alert.alert('Invalid Budget', 'Please enter a valid budget amount.');
            return;
        }

        setIsSubmitting(true);
        try {
            await insertSubcategory({
                category_id: categoryId,
                name: name.trim(),
                budget_limit: allocatedBudget ? parseFloat(allocatedBudget) : 0,
            });
            await loadSpendingData();
            success();
            navigation.goBack();
        } catch (err) {
            errorHaptic();
            Alert.alert('Error', 'Failed to create subcategory. Please try again.');
        } finally {
            setIsSubmitting(false);
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
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Feather name="x" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[textStyles.h3, { color: colors.text }]}>New Subcategory</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Parent Category Info */}
                    {parentCategory && (
                        <View
                            style={[
                                styles.parentInfo,
                                {
                                    backgroundColor: colors.card,
                                    borderRadius: borderRadius.lg,
                                    padding: spacing.lg,
                                    marginTop: spacing.xl,
                                    borderLeftWidth: 4,
                                    borderLeftColor: parentCategory.color,
                                },
                            ]}
                        >
                            <View
                                style={[
                                    styles.iconContainer,
                                    { backgroundColor: `${parentCategory.color}20` },
                                ]}
                            >
                                <Feather
                                    name={parentCategory.icon_name as any}
                                    size={24}
                                    color={parentCategory.color}
                                />
                            </View>
                            <View style={{ marginLeft: spacing.md }}>
                                <Text style={[textStyles.labelSmall, { color: colors.textSecondary }]}>
                                    Parent Category
                                </Text>
                                <Text style={[textStyles.body, { color: colors.text, fontWeight: '600' }]}>
                                    {parentCategory.name}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Name Input */}
                    <View style={{ marginTop: spacing.xl }}>
                        <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Subcategory Name
                        </Text>
                        <CustomTextInput
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g., Groceries, Restaurants"
                            autoCapitalize="words"
                            autoFocus
                        />
                        <Text style={[textStyles.labelSmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                            Subcategories help organize transactions within a category
                        </Text>
                    </View>

                    {/* Budget Input */}
                    <View style={{ marginTop: spacing.xl }}>
                        <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Allocated Budget (Optional)
                        </Text>
                        <CustomTextInput
                            value={allocatedBudget}
                            onChangeText={setAllocatedBudget}
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                        />
                    </View>

                    {/* Examples */}
                    <View style={{ marginTop: spacing.xl }}>
                        <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Suggestions
                        </Text>
                        <View style={styles.suggestions}>
                            {getSuggestionsForCategory(parentCategory?.name || '').map((suggestion, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[
                                        styles.suggestion,
                                        {
                                            backgroundColor: name === suggestion ? `${colors.primary}20` : colors.card,
                                            borderRadius: borderRadius.md,
                                            paddingHorizontal: spacing.md,
                                            paddingVertical: spacing.sm,
                                        },
                                    ]}
                                    onPress={() => setName(suggestion)}
                                >
                                    <Text
                                        style={[
                                            textStyles.body,
                                            { color: name === suggestion ? colors.primary : colors.text },
                                        ]}
                                    >
                                        {suggestion}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Submit Button */}
                    <View style={{ marginTop: spacing.xxl }}>
                        <Button
                            title="Create Subcategory"
                            onPress={handleSubmit}
                            loading={isSubmitting}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const getSuggestionsForCategory = (categoryName: string): string[] => {
    const lower = categoryName.toLowerCase();
    if (lower.includes('food') || lower.includes('dining')) {
        return ['Groceries', 'Restaurants', 'Takeout', 'Coffee', 'Snacks'];
    }
    if (lower.includes('transport') || lower.includes('travel')) {
        return ['Gas', 'Uber/Lyft', 'Public Transit', 'Parking', 'Flights'];
    }
    if (lower.includes('entertainment')) {
        return ['Movies', 'Games', 'Concerts', 'Streaming', 'Books'];
    }
    if (lower.includes('shopping')) {
        return ['Clothing', 'Electronics', 'Home', 'Gifts', 'Personal Care'];
    }
    if (lower.includes('health')) {
        return ['Doctor', 'Pharmacy', 'Gym', 'Vitamins', 'Dental'];
    }
    if (lower.includes('bills') || lower.includes('utilities')) {
        return ['Electricity', 'Water', 'Internet', 'Phone', 'Insurance'];
    }
    return ['Item 1', 'Item 2', 'Item 3'];
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
    parentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    suggestions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    suggestion: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
});
