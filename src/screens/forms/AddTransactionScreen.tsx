import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useTheme } from '../../theme';
import { Button, TextInput as CustomTextInput } from '../../components';
import { useBudgetStore } from '../../store';
import { useCurrency, useHaptics } from '../../hooks';
import { RootStackParamList, Category, Subcategory } from '../../types';
import { getCategories, getSubcategories, createItem, getItems } from '../../database';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'AddTransaction'>;
    route: RouteProp<RootStackParamList, 'AddTransaction'>;
};

export const AddTransactionScreen: React.FC<Props> = ({ navigation, route }) => {
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { format: formatCurrency } = useCurrency();
    const { success, error: errorHaptic } = useHaptics();
    const { addTransaction } = useBudgetStore();

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

    useEffect(() => {
        loadCategories();
    }, []);

    useEffect(() => {
        if (route.params?.categoryId) {
            const category = categories.find(c => c.id === route.params.categoryId);
            if (category) {
                setSelectedCategory(category);
                loadSubcategories(category.id);
            }
        }
        if (route.params?.subcategoryId) {
            const subcategory = subcategories.find(s => s.id === route.params.subcategoryId);
            if (subcategory) {
                setSelectedSubcategory(subcategory);
            }
        }
    }, [route.params, categories, subcategories]);

    const loadCategories = async () => {
        const cats = await getCategories();
        setCategories(cats);
    };

    const loadSubcategories = async (categoryId: number) => {
        const subs = await getSubcategories(categoryId);
        setSubcategories(subs);
    };

    const handleCategorySelect = (category: Category) => {
        setSelectedCategory(category);
        setSelectedSubcategory(null);
        loadSubcategories(category.id);
        setShowCategoryPicker(false);
    };

    const handleSubcategorySelect = (subcategory: Subcategory) => {
        setSelectedSubcategory(subcategory);
        setShowSubcategoryPicker(false);
    };

    const handleSubmit = async () => {
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
            // Create or find an item with this name
            let itemId: number | null = null;
            if (selectedSubcategory) {
                // Create a new item under the subcategory
                itemId = await createItem({
                    subcategory_id: selectedSubcategory.id,
                    name: itemName.trim(),
                    default_price: parseFloat(amount),
                });
            }

            await addTransaction({
                category_id: selectedCategory.id,
                subcategory_id: selectedSubcategory?.id,
                item_id: itemId ?? undefined,
                amount: parseFloat(amount),
                notes: description.trim(),
                date: format(date, 'yyyy-MM-dd'),
            });
            success();
            navigation.goBack();
        } catch (err) {
            errorHaptic();
            Alert.alert('Error', 'Failed to add transaction. Please try again.');
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
                    <Text style={[textStyles.h3, { color: colors.text }]}>Add Transaction</Text>
                    <View style={{ width: 24 }} />
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
                            style={{ fontSize: 32, fontWeight: '700', textAlign: 'center' }}
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

                    {/* Subcategory Picker (if category selected and has subcategories) */}
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

                    {/* Description */}
                    <View style={{ marginTop: spacing.xl }}>
                        <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Description (Optional)
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
                            title="Add Transaction"
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
