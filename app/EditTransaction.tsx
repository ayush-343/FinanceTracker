import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { useTheme } from '../src/theme';
import { Button, TextInput as CustomTextInput } from '../src/components';
import { useBudgetStore } from '../src/store';
import { useCurrency, useHaptics } from '../src/hooks';
import { Category, Subcategory, TransactionWithDetails } from '../src/types';
import { getCategories, getSubcategories, getTransactionById, updateTransaction, deleteTransaction, createItem } from '../src/database';

export const EditTransactionScreen: React.FC = () => {
    const router = useRouter();
    const { transactionId } = useLocalSearchParams<{ transactionId?: string }>();
    const parsedTransactionId = transactionId ? Number(transactionId) : NaN;
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { format: formatCurrency } = useCurrency();
    const { success, error: errorHaptic, light } = useHaptics();
    const { refreshData } = useBudgetStore();

    const [transaction, setTransaction] = useState<TransactionWithDetails | null>(null);
    const [amount, setAmount] = useState('');
    const [itemName, setItemName] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [showSubcategoryPicker, setShowSubcategoryPicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (Number.isFinite(parsedTransactionId)) {
            loadData();
        }
    }, [parsedTransactionId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load transaction
            const trans = await getTransactionById(parsedTransactionId);
            if (trans) {
                setTransaction(trans);
                setAmount(trans.amount.toString());
                setItemName(trans.item_name || '');
                setDescription(trans.notes || '');
                setDate(parseISO(trans.date));
            }

            // Load categories
            const cats = await getCategories();
            setCategories(cats);

            // Set selected category and load subcategories
            if (trans) {
                const cat = cats.find(c => c.id === trans.category_id);
                setSelectedCategory(cat || null);

                if (cat) {
                    const subs = await getSubcategories(cat.id);
                    setSubcategories(subs);

                    if (trans.subcategory_id) {
                        const sub = subs.find(s => s.id === trans.subcategory_id);
                        setSelectedSubcategory(sub || null);
                    }
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    const loadSubcategories = async (categoryId: number) => {
        const subs = await getSubcategories(categoryId);
        setSubcategories(subs);
    };

    const handleCategorySelect = (category: Category) => {
        light();
        setSelectedCategory(category);
        setSelectedSubcategory(null);
        loadSubcategories(category.id);
        setShowCategoryPicker(false);
    };

    const handleSubcategorySelect = (subcategory: Subcategory) => {
        light();
        setSelectedSubcategory(subcategory);
        setShowSubcategoryPicker(false);
    };

    const handleSubmit = async () => {
        if (!Number.isFinite(parsedTransactionId)) {
            return;
        }
        // Validation
        if (!amount || parseFloat(amount) <= 0) {
            errorHaptic();
            Alert.alert('Invalid Amount', 'Please enter a valid amount.');
            return;
        }

        if (!selectedCategory) {
            errorHaptic();
            Alert.alert('Select Category', 'Please select a category for this transaction.');
            return;
        }

        if (!itemName.trim()) {
            errorHaptic();
            Alert.alert('Missing Item Name', 'Please enter an item name for this transaction.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Create a new item if we have a subcategory
            let itemId: number | null = transaction?.item_id || null;
            if (selectedSubcategory && itemName.trim() !== transaction?.item_name) {
                itemId = await createItem({
                    subcategory_id: selectedSubcategory.id,
                    name: itemName.trim(),
                    default_price: parseFloat(amount),
                });
            }

            await updateTransaction(parsedTransactionId, {
                category_id: selectedCategory.id,
                subcategory_id: selectedSubcategory?.id || null,
                item_id: itemId,
                amount: parseFloat(amount),
                notes: description.trim(),
                date: format(date, 'yyyy-MM-dd'),
            });
            await refreshData();
            success();
            router.back();
        } catch (err) {
            errorHaptic();
            Alert.alert('Error', 'Failed to update transaction. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        if (!Number.isFinite(parsedTransactionId)) {
            return;
        }
        Alert.alert(
            'Delete Transaction',
            'Are you sure you want to delete this transaction? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteTransaction(parsedTransactionId);
                            await refreshData();
                            success();
                            router.back();
                        } catch (err) {
                            errorHaptic();
                            Alert.alert('Error', 'Failed to delete transaction.');
                        }
                    },
                },
            ]
        );
    };

    if (!Number.isFinite(parsedTransactionId)) {
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
                        <Feather name="x" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[textStyles.h3, { color: colors.text }]}>Edit Transaction</Text>
                    <TouchableOpacity onPress={handleDelete}>
                        <Feather name="trash-2" size={24} color={colors.error} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled"
                >
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
                            inputContainerStyle={{ height: 64 }}
                            style={{ fontSize: 32, fontWeight: '700', textAlign: 'center', lineHeight: 36 }}
                        />
                    </View>

                    {/* Item Name Input */}
                    <View style={{ marginTop: spacing.xl }}>
                        <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Item Name
                        </Text>
                        <CustomTextInput
                            value={itemName}
                            onChangeText={setItemName}
                            placeholder="e.g., Coffee, Groceries, Gas..."
                            autoCapitalize="words"
                        />
                    </View>

                    {/* Date Picker */}
                    <View style={{ marginTop: spacing.xl }}>
                        <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Date
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
                                    if (selectedDate) setDate(selectedDate);
                                }}
                                maximumDate={new Date()}
                            />
                        )}
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
                                <Text style={[textStyles.body, { color: colors.textSecondary, flex: 1 }]}>
                                    Select a category
                                </Text>
                            )}
                            <Feather
                                name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                                size={20}
                                color={colors.textSecondary}
                            />
                        </TouchableOpacity>

                        {/* Category Options */}
                        {showCategoryPicker && (
                            <View
                                style={[
                                    styles.optionsList,
                                    {
                                        backgroundColor: colors.card,
                                        borderRadius: borderRadius.lg,
                                        marginTop: spacing.sm,
                                    },
                                ]}
                            >
                                {categories.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            styles.optionItem,
                                            {
                                                padding: spacing.md,
                                                backgroundColor: selectedCategory?.id === cat.id ? `${colors.primary}10` : 'transparent',
                                            },
                                        ]}
                                        onPress={() => handleCategorySelect(cat)}
                                    >
                                        <View
                                            style={[
                                                styles.iconContainer,
                                                { backgroundColor: `${cat.color}20` },
                                            ]}
                                        >
                                            <Feather name={cat.icon_name as any} size={18} color={cat.color} />
                                        </View>
                                        <Text style={[textStyles.body, { color: colors.text, marginLeft: spacing.md }]}>
                                            {cat.name}
                                        </Text>
                                        {selectedCategory?.id === cat.id && (
                                            <Feather name="check" size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />
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
                                onPress={() => setShowSubcategoryPicker(!showSubcategoryPicker)}
                            >
                                <Text style={[textStyles.body, { color: selectedSubcategory ? colors.text : colors.textSecondary, flex: 1 }]}>
                                    {selectedSubcategory?.name || 'Select a subcategory'}
                                </Text>
                                <Feather
                                    name={showSubcategoryPicker ? 'chevron-up' : 'chevron-down'}
                                    size={20}
                                    color={colors.textSecondary}
                                />
                            </TouchableOpacity>

                            {showSubcategoryPicker && (
                                <View
                                    style={[
                                        styles.optionsList,
                                        {
                                            backgroundColor: colors.card,
                                            borderRadius: borderRadius.lg,
                                            marginTop: spacing.sm,
                                        },
                                    ]}
                                >
                                    <TouchableOpacity
                                        style={[styles.optionItem, { padding: spacing.md }]}
                                        onPress={() => {
                                            setSelectedSubcategory(null);
                                            setShowSubcategoryPicker(false);
                                        }}
                                    >
                                        <Text style={[textStyles.body, { color: colors.textSecondary }]}>
                                            None
                                        </Text>
                                    </TouchableOpacity>
                                    {subcategories.map((sub) => (
                                        <TouchableOpacity
                                            key={sub.id}
                                            style={[
                                                styles.optionItem,
                                                {
                                                    padding: spacing.md,
                                                    backgroundColor: selectedSubcategory?.id === sub.id ? `${colors.primary}10` : 'transparent',
                                                },
                                            ]}
                                            onPress={() => handleSubcategorySelect(sub)}
                                        >
                                            <Text style={[textStyles.body, { color: colors.text }]}>
                                                {sub.name}
                                            </Text>
                                            {selectedSubcategory?.id === sub.id && (
                                                <Feather name="check" size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Notes Input */}
                    <View style={{ marginTop: spacing.xl }}>
                        <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Notes (Optional)
                        </Text>
                        <CustomTextInput
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Add a note..."
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    {/* Submit Button */}
                    <View style={{ marginTop: spacing.xxl }}>
                        <Button
                            title="Save Changes"
                            onPress={handleSubmit}
                            loading={isSubmitting}
                            fullWidth
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
    },
    scrollView: {
        flex: 1,
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionsList: {
        overflow: 'hidden',
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});

export default EditTransactionScreen;
