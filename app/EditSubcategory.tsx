import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../src/theme';
import { Button, TextInput as CustomTextInput } from '../src/components';
import { useBudgetStore } from '../src/store';
import { useHaptics } from '../src/hooks';
import { Category, Subcategory } from '../src/types';
import { getCategoryById, getSubcategoryById, updateSubcategory, deleteSubcategory } from '../src/database';

export const EditSubcategoryScreen: React.FC = () => {
    const router = useRouter();
    const { subcategoryId, categoryId } = useLocalSearchParams<{
        subcategoryId?: string;
        categoryId?: string;
    }>();
    const parsedSubcategoryId = subcategoryId ? Number(subcategoryId) : NaN;
    const parsedCategoryId = categoryId ? Number(categoryId) : NaN;
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { success, error: errorHaptic } = useHaptics();
    const { loadSpendingData } = useBudgetStore();

    const [name, setName] = useState('');
    const [parentCategory, setParentCategory] = useState<Category | null>(null);
    const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (Number.isFinite(parsedSubcategoryId) && Number.isFinite(parsedCategoryId)) {
            loadData();
        }
    }, [parsedSubcategoryId, parsedCategoryId]);

    if (!Number.isFinite(parsedSubcategoryId) || !Number.isFinite(parsedCategoryId)) {
        return null;
    }

    const loadData = async () => {
        const category = await getCategoryById(parsedCategoryId);
        setParentCategory(category);

        const sub = await getSubcategoryById(parsedSubcategoryId);
        setSubcategory(sub);
        setName(sub?.name || '');
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            errorHaptic();
            Alert.alert('Missing Name', 'Please enter a subcategory name.');
            return;
        }

        setIsSubmitting(true);
        try {
            await updateSubcategory(parsedSubcategoryId, {
                name: name.trim(),
            });
            await loadSpendingData();
            success();
            router.back();
        } catch (err) {
            errorHaptic();
            Alert.alert('Error', 'Failed to update subcategory. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Subcategory',
            `Are you sure you want to delete "${subcategory?.name}"? This will also remove items and transactions under it.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteSubcategory(parsedSubcategoryId);
                            await loadSpendingData();
                            success();
                            router.back();
                        } catch (err) {
                            errorHaptic();
                            Alert.alert('Error', 'Failed to delete subcategory.');
                        }
                    },
                },
            ]
        );
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
                    <Text style={[textStyles.h3, { color: colors.text }]}>Edit Subcategory</Text>
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
                                <Text style={[textStyles.labelSmall, { color: colors.textSecondary }]}>Parent Category</Text>
                                <Text style={[textStyles.body, { color: colors.text, fontWeight: '600' }]}>
                                    {parentCategory.name}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Name Input */}
                    <View style={{ marginTop: spacing.xl }}>
                        <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Subcategory Name</Text>
                        <CustomTextInput
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g., Groceries, Restaurants"
                            autoCapitalize="words"
                        />
                    </View>

                    {/* Actions */}
                    <View style={{ marginTop: spacing.xxl }}>
                        <Button
                            title="Save Changes"
                            onPress={handleSubmit}
                            loading={isSubmitting}
                        />
                        <Button
                            title="Delete Subcategory"
                            variant="danger"
                            onPress={handleDelete}
                            style={{ marginTop: spacing.md }}
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
    parentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default EditSubcategoryScreen;
