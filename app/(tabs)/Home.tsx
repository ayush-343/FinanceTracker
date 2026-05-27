import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Platform, ActionSheetIOS, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { CategoryCard, EmptyState, PendingItemsBanner, ScanningModal, BarcodeScannerModal, showActionSheet } from '../../src/components';
import { useWalkthroughContext } from '../../src/components/WalkthroughContext';
import { BudgetSummaryCard } from '../../src/components/BudgetSummaryCard';
import { useBudgetStore, useSettingsStore, useWalkthroughStore } from '../../src/store';
import { useScanStore } from '../../src/store/scanStore';
import { useCurrency, useHaptics } from '../../src/hooks';
import { useReceiptScanner } from '../../src/hooks/useReceiptScanner';
import { getMonthRangeString, getWeekRangeString } from '../../src/utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 16;
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

const HomeScreen: React.FC = () => {
    const router = useRouter();
    const { colors, spacing } = useTheme();
    const { format } = useCurrency();
    const { light } = useHaptics();
    const { budgetPeriod, isOnboardingCompleted } = useSettingsStore();
    const {
        categoriesWithSpending,
        totalSpending,
        totalBudget,
        currentDate,
        isLoading,
        loadSpendingData,
        refreshData,
    } = useBudgetStore();

    // Scan store for pending items banner
    const pendingItems = useScanStore((state) => state.pendingItems);
    const clearAllPending = useScanStore((state) => state.clearAll);
    const [bannerDismissed, setBannerDismissed] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Receipt scanner hook
    const {
        isScanning,
        error: scanError,
        showModal,
        showBarcodeScanner,
        pickImage,
        retry,
        goToManualEntry,
        closeModal,
        closeBarcodeScanner,
        handleBarcodeScanComplete,
    } = useReceiptScanner();

    // Walkthrough refs (measured on-demand by overlay)
    const { registerRef } = useWalkthroughContext();
    const { isWalkthroughCompleted, isWalkthroughActive, startWalkthrough } = useWalkthroughStore();
    const budgetRef = useRef<View>(null);
    const gridRef = useRef<View>(null);
    const addCardRef = useRef<View>(null);
    const walkthroughTriggered = useRef(false);

    // Register refs for walkthrough spotlight
    useEffect(() => {
        registerRef('budget-card', budgetRef);
        registerRef('category-grid', gridRef);
        registerRef('add-category-card', addCardRef);
    }, [registerRef]);

    // Trigger walkthrough when Home screen mounts and onboarding is done
    useEffect(() => {
        if (isOnboardingCompleted && !isWalkthroughCompleted && !isWalkthroughActive && !walkthroughTriggered.current) {
            walkthroughTriggered.current = true;
            const timer = setTimeout(() => {
                startWalkthrough();
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [isOnboardingCompleted, isWalkthroughCompleted, isWalkthroughActive, startWalkthrough]);

    useFocusEffect(
        useCallback(() => {
            loadSpendingData();
        }, [])
    );

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await refreshData();
        setIsRefreshing(false);
    }, [refreshData]);

    const periodLabel = budgetPeriod === 'weekly'
        ? getWeekRangeString(currentDate)
        : getMonthRangeString(currentDate);

    const handleCategoryPress = (categoryId: number, categoryName: string) => {
        router.push({
            pathname: '/Category',
            params: { categoryId: String(categoryId), categoryName },
        });
    };

    const handleSearchPress = () => {
        light();
        // Could navigate to a search screen or open a search modal
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 120 }}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                    />
                }
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[0]}
            >
                {/* Sticky Header */}
                <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.headerTitle}>Home</Text>
                            <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>
                                {periodLabel}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.searchButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={handleSearchPress}
                            activeOpacity={0.7}
                        >
                            <Feather name="search" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Budget Summary */}
                    <View
                        style={styles.budgetContainer}
                        ref={budgetRef}
                        collapsable={false}
                    >
                        <BudgetSummaryCard
                            totalSpending={totalSpending}
                            totalBudget={totalBudget}
                            periodLabel={periodLabel}
                        />
                    </View>
                </View>

                {/* Pending Items Banner */}
                {pendingItems.length > 0 && !bannerDismissed && (
                    <PendingItemsBanner onDismiss={() => {
                        setBannerDismissed(true);
                        clearAllPending();
                    }} />
                )}

                {/* Category Grid */}
                <View style={styles.gridContainer} ref={gridRef} collapsable={false}>
                    {categoriesWithSpending.length > 0 ? (
                        <View
                            style={styles.grid}
                            collapsable={false}
                        >
                            {categoriesWithSpending.map((category) => (
                                <CategoryCard
                                    key={category.id}
                                    category={category}
                                    onPress={() => handleCategoryPress(category.id, category.name)}
                                    style={{ width: CARD_WIDTH }}
                                />
                            ))}

                            {/* Add New Card */}
                            <View ref={addCardRef} collapsable={false}>
                            <TouchableOpacity
                                style={[styles.addNewCard, { width: CARD_WIDTH }]}
                                onPress={() => {
                                    light();
                                    router.push('/AddCategory');
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={styles.addNewIconContainer}>
                                    <Feather name="plus" size={28} color={colors.textTertiary} />
                                </View>
                                <Text style={[styles.addNewText, { color: colors.textTertiary }]}>
                                    Add New
                                </Text>
                            </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <EmptyState
                            icon="folder"
                            title="No Categories"
                            description="Add categories to start tracking your spending"
                            actionLabel="Add Category"
                            onAction={() => router.push('/AddCategory')}
                            actionRef={addCardRef}
                            style={{ marginTop: spacing.xl }}
                        />
                    )}
                </View>
            </ScrollView>

            {/* Scanning Modal */}
            <ScanningModal
                visible={showModal}
                isLoading={isScanning}
                error={scanError}
                onRetry={retry}
                onManualEntry={goToManualEntry}
                onClose={closeModal}
            />

            {/* Barcode Scanner Modal */}
            <BarcodeScannerModal
                visible={showBarcodeScanner}
                onClose={closeBarcodeScanner}
                onScanComplete={handleBarcodeScanComplete}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: HORIZONTAL_PADDING,
        paddingTop: 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 2,
    },
    searchButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    budgetContainer: {
        marginBottom: 8,
    },
    gridContainer: {
        paddingHorizontal: HORIZONTAL_PADDING,
        paddingTop: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: CARD_GAP,
    },
    addNewCard: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        paddingHorizontal: 12,
        minHeight: 190,
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#404040',
    },
    addNewIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#1E1E1E',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#262626',
    },
    addNewText: {
        fontSize: 16,
        fontWeight: '700',
    },
});

export default HomeScreen;
