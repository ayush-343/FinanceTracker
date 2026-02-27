import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { Button, TextInput, IconPickerModal, ColorPickerModal } from '../../src/components';
import { useBudgetStore, useSettingsStore } from '../../src/store';
import { useCurrency, useHaptics } from '../../src/hooks';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../src/constants';
import { Category } from '../../src/types';

interface CategoryDraft {
    name: string;
    icon_name: string;
    color: string;
    budget_limit: string;
}

export const CategorySetupScreen: React.FC = () => {
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { addCategory } = useBudgetStore();
    const { setOnboardingCompleted } = useSettingsStore();
    const { format, symbol } = useCurrency();
    const { success, light } = useHaptics();

    const [categories, setCategories] = useState<Omit<Category, 'id'>[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [draft, setDraft] = useState<CategoryDraft>({
        name: '',
        icon_name: CATEGORY_ICONS[0].name,
        color: CATEGORY_COLORS[0],
        budget_limit: '',
    });
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleAddCategory = () => {
        if (!draft.name.trim()) {
            Alert.alert('Error', 'Please enter a category name');
            return;
        }

        const budgetLimit = parseFloat(draft.budget_limit) || 0;

        const newCategory: Omit<Category, 'id'> = {
            name: draft.name.trim(),
            icon_name: draft.icon_name,
            color: draft.color,
            budget_limit: budgetLimit,
        };

        setCategories([...categories, newCategory]);
        success();

        // Reset draft
        setDraft({
            name: '',
            icon_name: CATEGORY_ICONS[Math.floor(Math.random() * CATEGORY_ICONS.length)].name,
            color: CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)],
            budget_limit: '',
        });
        setIsAdding(false);
    };

    const handleRemoveCategory = (index: number) => {
        light();
        setCategories(categories.filter((_, i) => i !== index));
    };

    const handleFinish = async () => {
        setIsSaving(true);

        // Save all categories to database
        for (const category of categories) {
            await addCategory(category);
        }

        // Mark onboarding as complete
        await setOnboardingCompleted(true);
        success();

        setIsSaving(false);
        // Navigation will be handled by the root navigator
    };

    const handleSkip = async () => {
        await setOnboardingCompleted(true);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[textStyles.h1, { color: colors.text }]}>
                    Set Up Categories
                </Text>
                <Text
                    style={[
                        textStyles.body,
                        { color: colors.textSecondary, marginTop: spacing.sm },
                    ]}
                >
                    Create categories to organize your spending. You can add more later.
                </Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ padding: spacing.lg }}
                showsVerticalScrollIndicator={false}
            >
                {/* Added categories */}
                {categories.map((category, index) => (
                    <View
                        key={category.name}
                        style={[
                            styles.categoryCard,
                            {
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.lg,
                                padding: spacing.lg,
                                marginBottom: spacing.md,
                                borderLeftWidth: 4,
                                borderLeftColor: category.color,
                            },
                        ]}
                    >
                        <View style={styles.categoryInfo}>
                            <View
                                style={[
                                    styles.iconContainer,
                                    { backgroundColor: `${category.color}20` },
                                ]}
                            >
                                <Feather
                                    name={category.icon_name as any}
                                    size={20}
                                    color={category.color}
                                />
                            </View>
                            <View style={{ marginLeft: spacing.md }}>
                                <Text style={[textStyles.body, { color: colors.text, fontWeight: '600' }]}>
                                    {category.name}
                                </Text>
                                <Text style={[textStyles.labelSmall, { color: colors.textSecondary }]}>
                                    Budget: {format(category.budget_limit)}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => handleRemoveCategory(index)}>
                            <Feather name="x" size={20} color={colors.textTertiary} />
                        </TouchableOpacity>
                    </View>
                ))}

                {/* Add category form */}
                {isAdding ? (
                    <View
                        style={[
                            styles.addForm,
                            {
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.lg,
                                padding: spacing.lg,
                            },
                        ]}
                    >
                        <TextInput
                            label="Category Name"
                            placeholder="e.g., Food, Transport, Entertainment"
                            value={draft.name}
                            onChangeText={(text) => setDraft({ ...draft, name: text })}
                        />

                        <View style={[styles.row, { marginTop: spacing.lg }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                                    Icon
                                </Text>
                                <TouchableOpacity
                                    style={[
                                        styles.pickerButton,
                                        {
                                            backgroundColor: colors.inputBackground,
                                            borderRadius: borderRadius.lg,
                                        },
                                    ]}
                                    onPress={() => setShowIconPicker(true)}
                                >
                                    <Feather name={draft.icon_name as any} size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <View style={{ flex: 1, marginLeft: spacing.md }}>
                                <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                                    Color
                                </Text>
                                <TouchableOpacity
                                    style={[
                                        styles.pickerButton,
                                        {
                                            backgroundColor: draft.color,
                                            borderRadius: borderRadius.lg,
                                        },
                                    ]}
                                    onPress={() => setShowColorPicker(true)}
                                />
                            </View>
                        </View>

                        <TextInput
                            label="Monthly Budget (optional)"
                            placeholder={`${symbol}0.00`}
                            value={draft.budget_limit}
                            onChangeText={(text) => setDraft({ ...draft, budget_limit: text })}
                            keyboardType="decimal-pad"
                            containerStyle={{ marginTop: spacing.lg }}
                        />

                        <View style={[styles.row, { marginTop: spacing.lg }]}>
                            <Button
                                title="Cancel"
                                variant="ghost"
                                onPress={() => setIsAdding(false)}
                                style={{ flex: 1 }}
                            />
                            <Button
                                title="Add"
                                onPress={handleAddCategory}
                                style={{ flex: 1, marginLeft: spacing.md }}
                            />
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[
                            styles.addButton,
                            {
                                backgroundColor: colors.backgroundSecondary,
                                borderRadius: borderRadius.lg,
                                borderColor: colors.border,
                            },
                        ]}
                        onPress={() => setIsAdding(true)}
                    >
                        <Feather name="plus" size={24} color={colors.primary} />
                        <Text style={[textStyles.body, { color: colors.primary, marginLeft: spacing.sm }]}>
                            Add Category
                        </Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            <View style={[styles.footer, { paddingHorizontal: spacing.xl }]}>
                {categories.length > 0 ? (
                    <Button
                        title="Finish Setup"
                        onPress={handleFinish}
                        loading={isSaving}
                        fullWidth
                    />
                ) : (
                    <Button
                        title="Continue"
                        onPress={handleFinish}
                        fullWidth
                    />
                )}
                <TouchableOpacity
                    style={[styles.skipButton, { marginTop: spacing.lg }]}
                    onPress={handleSkip}
                >
                    <Text style={[textStyles.body, { color: colors.textSecondary }]}>
                        Skip for now
                    </Text>
                </TouchableOpacity>
            </View>

            <IconPickerModal
                visible={showIconPicker}
                selectedIcon={draft.icon_name}
                onSelect={(icon: string) => setDraft({ ...draft, icon_name: icon })}
                onClose={() => setShowIconPicker(false)}
            />

            <ColorPickerModal
                visible={showColorPicker}
                selectedColor={draft.color}
                onSelect={(color: string) => setDraft({ ...draft, color: color })}
                onClose={() => setShowColorPicker(false)}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    scrollView: {
        flex: 1,
    },
    categoryCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addForm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
    },
    pickerButton: {
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        borderWidth: 2,
        borderStyle: 'dashed',
    },
    footer: {
        paddingBottom: 20,
        paddingTop: 12,
    },
    skipButton: {
        alignItems: 'center',
    },
});

export default CategorySetupScreen;
