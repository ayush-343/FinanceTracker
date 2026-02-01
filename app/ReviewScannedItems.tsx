import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useTheme } from '../src/theme';
import { Button, EmptyState } from '../src/components';
import { useBudgetStore } from '../src/store';
import { useScanStore } from '../src/store/scanStore';
import { useCurrency, useHaptics } from '../src/hooks';
import { Category, Subcategory } from '../src/types';
import { getCategories, getSubcategories, createItem, getItems } from '../src/database';

const ReviewScannedItemsScreen: React.FC = () => {
    const router = useRouter();
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { format: formatCurrency } = useCurrency();
    const { success, error: errorHaptic, light } = useHaptics();
    const { addTransaction } = useBudgetStore();

    // Scan store
    const pendingItems = useScanStore((state) => state.pendingItems);
    const receiptDate = useScanStore((state) => state.receiptDate);
    const removeItem = useScanStore((state) => state.removeItem);
    const setReceiptDate = useScanStore((state) => state.setReceiptDate);
    const clearAll = useScanStore((state) => state.clearAll);

    // Local state
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [showSubcategoryPicker, setShowSubcategoryPicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get current item
    const currentItem = pendingItems.length > 0 ? pendingItems[0] : null;
    const totalItems = pendingItems.length;

    useEffect(() => {
        loadCategories();
        // Parse receipt date - validate it's reasonable (within last 30 days)
        if (receiptDate) {
            const parsed = new Date(`${receiptDate}T00:00:00`);
            const today = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            if (!Number.isNaN(parsed.getTime())) {
                // If the date is in the future or more than 30 days old, use today's date
                if (parsed > today || parsed < thirtyDaysAgo) {
                    console.log('[ReviewScannedItems] Receipt date out of range, using today:', receiptDate);
                    setDate(today);
                    setReceiptDate(format(today, 'yyyy-MM-dd'));
                    // Alert user about the date correction
                    Alert.alert(
                        'Date Adjusted',
                        `The receipt date (${format(parsed, 'MMM d, yyyy')}) seems incorrect. We've set it to today's date. You can change it if needed.`,
                        [{ text: 'OK' }]
                    );
                } else {
                    setDate(parsed);
                }
            }
        }
    }, [receiptDate]);

    // Pre-select category based on AI suggestion when item changes
    useEffect(() => {
        if (currentItem && categories.length > 0) {
            if (currentItem.suggestedCategoryId) {
                const suggestedCategory = categories.find(c => c.id === currentItem.suggestedCategoryId);
                if (suggestedCategory) {
                    setSelectedCategory(suggestedCategory);
                    loadSubcategories(suggestedCategory.id);

                    // Pre-select subcategory if suggested
                    if (currentItem.suggestedSubcategoryId) {
                        // Subcategories will be loaded async, so we handle this in a separate effect
                    }
                } else {
                    setSelectedCategory(null);
                    setSubcategories([]);
                }
            } else {
                setSelectedCategory(null);
                setSelectedSubcategory(null);
                setSubcategories([]);
            }
        }
    }, [currentItem?.id, categories]);

    // Pre-select subcategory when subcategories load
    useEffect(() => {
        if (currentItem?.suggestedSubcategoryId && subcategories.length > 0) {
            const suggestedSub = subcategories.find(s => s.id === currentItem.suggestedSubcategoryId);
            if (suggestedSub) {
                setSelectedSubcategory(suggestedSub);
            }
        }
    }, [subcategories, currentItem?.suggestedSubcategoryId]);

    const loadCategories = async () => {
        const cats = await getCategories();
        setCategories(cats);
    };

    const loadSubcategories = async (categoryId: number) => {
        const subs = await getSubcategories(categoryId);
        setSubcategories(subs);
        setSelectedSubcategory(null);
    };

    const handleCategorySelect = (category: Category) => {
        light();
        setSelectedCategory(category);
        setSelectedSubcategory(null);
        loadSubcategories(category.id);
        setShowCategoryPicker(false);
    };

    const handleSubcategorySelect = (subcategory: Subcategory | null) => {
        light();
        setSelectedSubcategory(subcategory);
        setShowSubcategoryPicker(false);
    };

    const handleDateChange = (selectedDate: Date) => {
        setDate(selectedDate);
        setReceiptDate(format(selectedDate, 'yyyy-MM-dd'));
    };

    const handleAddItem = async () => {
        if (!currentItem) return;

        if (!selectedCategory) {
            errorHaptic();
            Alert.alert('Select Category', 'Please select a category for this item.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Create or find an item with this name
            let itemId: number | null = null;
            if (selectedSubcategory) {
                const normalizedName = currentItem.name.trim().toLowerCase();
                const existingItems = await getItems(selectedSubcategory.id);
                const existingItem = existingItems.find(i => i.name.trim().toLowerCase() === normalizedName);
                if (existingItem) {
                    itemId = existingItem.id;
                } else {
                    itemId = await createItem({
                        subcategory_id: selectedSubcategory.id,
                        name: currentItem.name.trim(),
                        default_price: currentItem.amount,
                    });
                }
            }

            const transactionData = {
                category_id: selectedCategory.id,
                subcategory_id: selectedSubcategory?.id,
                item_id: itemId ?? undefined,
                amount: currentItem.amount,
                notes: `Scanned from receipt`,
                date: format(date, 'yyyy-MM-dd'),
            };
            
            console.log('[ReviewScannedItems] Adding transaction:', JSON.stringify(transactionData, null, 2));
            
            const transactionId = await addTransaction(transactionData);
            
            console.log('[ReviewScannedItems] Transaction added with ID:', transactionId);

            success();
            removeItem(currentItem.id);

            // Reset selections for next item
            setShowCategoryPicker(false);
            setShowSubcategoryPicker(false);
        } catch (err) {
            console.error('[ReviewScannedItems] Error adding transaction:', err);
            errorHaptic();
            Alert.alert('Error', 'Failed to add transaction. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkipItem = () => {
        if (!currentItem) return;
        light();
        removeItem(currentItem.id);
        setShowCategoryPicker(false);
        setShowSubcategoryPicker(false);
    };

    const handleClearAll = () => {
        Alert.alert(
            'Clear All Items',
            'Are you sure you want to discard all remaining items?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: () => {
                        light();
                        clearAll();
                        router.back();
                    },
                },
            ]
        );
    };

    const handleClose = () => {
        if (pendingItems.length > 0) {
            Alert.alert(
                'Items Remaining',
                `You have ${pendingItems.length} items left to review. They will be saved for later.`,
                [
                    { text: 'Stay', style: 'cancel' },
                    { text: 'Leave', onPress: () => router.back() },
                ]
            );
        } else {
            router.back();
        }
    };

    // Empty state - all items processed
    if (!currentItem) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Feather name="x" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[textStyles.h3, { color: colors.text }]}>Review Items</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.emptyContainer}>
                    <EmptyState
                        icon="check-circle"
                        title="All Done!"
                        description="You've reviewed all the scanned items."
                        actionLabel="Back to Home"
                        onAction={() => router.back()}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
                <TouchableOpacity onPress={handleClose}>
                    <Feather name="x" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[textStyles.h3, { color: colors.text }]}>Review Items</Text>
                <TouchableOpacity onPress={handleClearAll}>
                    <Feather name="trash-2" size={20} color={colors.error} />
                </TouchableOpacity>
            </View>

            {/* Progress indicator */}
            <View style={[styles.progressContainer, { paddingHorizontal: spacing.lg, marginTop: spacing.sm }]}>
                <Text style={[textStyles.labelSmall, { color: colors.textSecondary }]}>
                    Item 1 of {totalItems}
                </Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Date Picker */}
                <View style={{ marginTop: spacing.lg }}>
                    <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                        Purchase Date
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
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Feather name="calendar" size={20} color={colors.primary} />
                        <Text style={[textStyles.body, { color: colors.text, marginLeft: spacing.md, flex: 1 }]}>
                            {format(date, 'EEEE, MMMM d, yyyy')}
                        </Text>
                        <Feather name="chevron-right" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display="spinner"
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(Platform.OS === 'ios');
                                if (selectedDate) handleDateChange(selectedDate);
                            }}
                            maximumDate={new Date()}
                        />
                    )}
                </View>

                {/* Current Item Card */}
                <View
                    style={[
                        styles.itemCard,
                        {
                            backgroundColor: colors.card,
                            borderRadius: borderRadius.xl,
                            padding: spacing.xl,
                            marginTop: spacing.xl,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.08,
                            shadowRadius: 12,
                            elevation: 4,
                        },
                    ]}
                >
                    <Text style={[textStyles.h3, { color: colors.text, textAlign: 'center' }]}>
                        {currentItem.name}
                    </Text>
                    <Text
                        style={[
                            textStyles.currencyLarge,
                            { color: colors.primary, textAlign: 'center', marginTop: spacing.sm },
                        ]}
                    >
                        {formatCurrency(currentItem.amount)}
                    </Text>
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
                        onPress={() => {
                            setShowCategoryPicker(!showCategoryPicker);
                            setShowSubcategoryPicker(false);
                        }}
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

                {/* Subcategory Picker */}
                {selectedCategory && subcategories.length > 0 && (
                    <View style={{ marginTop: spacing.xl }}>
                        <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Subcategory (Optional)
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
                            onPress={() => {
                                setShowSubcategoryPicker(!showSubcategoryPicker);
                                setShowCategoryPicker(false);
                            }}
                        >
                            <Feather name="layers" size={20} color={selectedSubcategory ? colors.primary : colors.textSecondary} />
                            <Text
                                style={[
                                    textStyles.body,
                                    { color: selectedSubcategory ? colors.text : colors.textSecondary, marginLeft: spacing.md, flex: 1 },
                                ]}
                            >
                                {selectedSubcategory?.name || 'Select subcategory'}
                            </Text>
                            <Feather name={showSubcategoryPicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                        </TouchableOpacity>

                        {showSubcategoryPicker && (
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
                                <TouchableOpacity
                                    style={[
                                        styles.dropdownItem,
                                        {
                                            backgroundColor: !selectedSubcategory ? `${colors.primary}10` : 'transparent',
                                            borderRadius: borderRadius.md,
                                            padding: spacing.md,
                                        },
                                    ]}
                                    onPress={() => handleSubcategorySelect(null)}
                                >
                                    <Text style={[textStyles.body, { color: colors.textSecondary }]}>
                                        None
                                    </Text>
                                </TouchableOpacity>
                                {subcategories.map((sub) => (
                                    <TouchableOpacity
                                        key={sub.id}
                                        style={[
                                            styles.dropdownItem,
                                            {
                                                backgroundColor: selectedSubcategory?.id === sub.id ? `${colors.primary}10` : 'transparent',
                                                borderRadius: borderRadius.md,
                                                padding: spacing.md,
                                            },
                                        ]}
                                        onPress={() => handleSubcategorySelect(sub)}
                                    >
                                        <Text style={[textStyles.body, { color: colors.text, flex: 1 }]}>
                                            {sub.name}
                                        </Text>
                                        {selectedSubcategory?.id === sub.id && (
                                            <Feather name="check" size={18} color={colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* Action Buttons */}
                <View style={{ marginTop: spacing.xxl }}>
                    <Button
                        title="Add to Budget"
                        onPress={handleAddItem}
                        variant="primary"
                        fullWidth
                        loading={isSubmitting}
                        disabled={!selectedCategory || isSubmitting}
                    />
                    <Button
                        title="Skip"
                        onPress={handleSkipItem}
                        variant="ghost"
                        fullWidth
                        style={{ marginTop: spacing.md }}
                        disabled={isSubmitting}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        paddingBottom: 8,
    },
    progressContainer: {
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemCard: {},
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainerSmall: {
        width: 28,
        height: 28,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropdown: {},
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});

export default ReviewScannedItemsScreen;
