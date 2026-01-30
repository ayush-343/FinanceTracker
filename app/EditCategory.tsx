import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../src/theme';
import { Button, TextInput as CustomTextInput, IconPicker, ColorPicker, LoadingScreen } from '../src/components';
import { useBudgetStore } from '../src/store';
import { useHaptics } from '../src/hooks';
import { Category } from '../src/types';
import { getCategoryById, updateCategory, deleteCategory } from '../src/database/queries';

export const EditCategoryScreen: React.FC = () => {
    const router = useRouter();
    const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();
    const parsedCategoryId = categoryId ? Number(categoryId) : NaN;
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { success, error: errorHaptic } = useHaptics();
    const { refreshData } = useBudgetStore();

    const [category, setCategory] = useState<Category | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [name, setName] = useState('');
    const [allocatedBudget, setAllocatedBudget] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('folder');
    const [selectedColor, setSelectedColor] = useState('#6366F1');
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (Number.isFinite(parsedCategoryId)) {
            loadCategory();
        }
    }, [parsedCategoryId]);

    const loadCategory = async () => {
        try {
            const cat = await getCategoryById(parsedCategoryId);
            if (cat) {
                setCategory(cat);
                setName(cat.name);
                setAllocatedBudget(cat.budget_limit.toString());
                setSelectedIcon(cat.icon_name);
                setSelectedColor(cat.color);
            }
        } catch (err) {
            console.error('Failed to load category:', err);
            Alert.alert('Error', 'Failed to load category.');
            router.back();
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!name.trim()) {
            errorHaptic();
            Alert.alert('Missing Name', 'Please enter a category name.');
            return;
        }

        if (!allocatedBudget || parseFloat(allocatedBudget) <= 0) {
            errorHaptic();
            Alert.alert('Invalid Budget', 'Please enter a valid budget amount.');
            return;
        }

        setIsSubmitting(true);
        try {
            await updateCategory(parsedCategoryId, {
                name: name.trim(),
                budget_limit: parseFloat(allocatedBudget),
                icon_name: selectedIcon,
                color: selectedColor,
            });
            await refreshData();
            success();
            router.back();
        } catch (err) {
            errorHaptic();
            Alert.alert('Error', 'Failed to update category. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Category',
            'Are you sure you want to delete this category? This will also delete all subcategories, items, and transactions.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteCategory(parsedCategoryId);
                            await refreshData();
                            success();
                            router.back();
                        } catch (err) {
                            errorHaptic();
                            Alert.alert('Error', 'Failed to delete category.');
                        }
                    },
                },
            ]
        );
    };

    if (!Number.isFinite(parsedCategoryId)) {
        return null;
    }

    if (isLoading) {
        return <LoadingScreen message="Loading category..." />;
    }

    if (!category) {
        return null;
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
                        <Feather name="x" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[textStyles.h3, { color: colors.text }]}>Edit Category</Text>
                    <TouchableOpacity onPress={handleDelete}>
                        <Feather name="trash-2" size={22} color={colors.error} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Preview */}
                    <View
                        style={[
                            styles.preview,
                            {
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.xl,
                                padding: spacing.xl,
                                marginTop: spacing.xl,
                                alignItems: 'center',
                            },
                        ]}
                    >
                        <View
                            style={[
                                styles.previewIcon,
                                { backgroundColor: `${selectedColor}20` },
                            ]}
                        >
                            <Feather name={selectedIcon as any} size={32} color={selectedColor} />
                        </View>
                        <Text
                            style={[
                                textStyles.h3,
                                { color: colors.text, marginTop: spacing.md, textAlign: 'center' },
                            ]}
                        >
                            {name || 'Category Name'}
                        </Text>
                    </View>

                    {/* Name Input */}
                    <View style={{ marginTop: spacing.xl }}>
                        <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Category Name
                        </Text>
                        <CustomTextInput
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g., Food & Dining"
                            autoCapitalize="words"
                        />
                    </View>

                    {/* Budget Input */}
                    <View style={{ marginTop: spacing.xl }}>
                        <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Allocated Budget
                        </Text>
                        <CustomTextInput
                            value={allocatedBudget}
                            onChangeText={setAllocatedBudget}
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                        />
                    </View>

                    {/* Icon Picker */}
                    <View style={{ marginTop: spacing.xl }}>
                        <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Icon
                        </Text>
                        <TouchableOpacity
                            style={[
                                styles.pickerButton,
                                {
                                    backgroundColor: colors.card,
                                    borderRadius: borderRadius.lg,
                                    padding: spacing.lg,
                                },
                            ]}
                            onPress={() => setShowIconPicker(!showIconPicker)}
                        >
                            <View
                                style={[
                                    styles.iconContainerSmall,
                                    { backgroundColor: `${selectedColor}20` },
                                ]}
                            >
                                <Feather name={selectedIcon as any} size={20} color={selectedColor} />
                            </View>
                            <Text style={[textStyles.body, { color: colors.text, marginLeft: spacing.md, flex: 1 }]}>
                                {selectedIcon}
                            </Text>
                            <Feather name={showIconPicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                        </TouchableOpacity>

                        {showIconPicker && (
                            <View style={{ marginTop: spacing.md }}>
                                <IconPicker
                                    selectedIcon={selectedIcon}
                                    selectedColor={selectedColor}
                                    onSelectIcon={(icon) => {
                                        setSelectedIcon(icon);
                                        setShowIconPicker(false);
                                    }}
                                />
                            </View>
                        )}
                    </View>

                    {/* Color Picker */}
                    <View style={{ marginTop: spacing.xl }}>
                        <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Color
                        </Text>
                        <TouchableOpacity
                            style={[
                                styles.pickerButton,
                                {
                                    backgroundColor: colors.card,
                                    borderRadius: borderRadius.lg,
                                    padding: spacing.lg,
                                },
                            ]}
                            onPress={() => setShowColorPicker(!showColorPicker)}
                        >
                            <View
                                style={[
                                    styles.colorDot,
                                    { backgroundColor: selectedColor },
                                ]}
                            />
                            <Text style={[textStyles.body, { color: colors.text, marginLeft: spacing.md, flex: 1 }]}>
                                {selectedColor}
                            </Text>
                            <Feather name={showColorPicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                        </TouchableOpacity>

                        {showColorPicker && (
                            <View style={{ marginTop: spacing.md }}>
                                <ColorPicker
                                    selectedColor={selectedColor}
                                    onSelectColor={(color) => {
                                        setSelectedColor(color);
                                        setShowColorPicker(false);
                                    }}
                                />
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
    preview: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    previewIcon: {
        width: 72,
        height: 72,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
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
    iconContainerSmall: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
});

export default EditCategoryScreen;
