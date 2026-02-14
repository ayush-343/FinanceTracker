import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    Animated,
    Dimensions,
    Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme';
import { useHaptics } from '../hooks';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AnimatedFabMenuProps {
    visible: boolean;
    onClose: () => void;
    onAddManually: () => void;
    onScanReceipt: () => void;
    fabPosition: { x: number; y: number };
}

interface ScanOptionProps {
    visible: boolean;
    onUploadImage: () => void;
    onScanCamera: () => void;
    onBack: () => void;
}

const ScanOptions: React.FC<ScanOptionProps> = ({
    visible,
    onUploadImage,
    onScanCamera,
    onBack,
}) => {
    const { colors, borderRadius, spacing } = useTheme();
    const { light } = useHaptics();
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(animatedValue, {
            toValue: visible ? 1 : 0,
            useNativeDriver: true,
            tension: 65,
            friction: 8,
        }).start();
    }, [visible]);

    const scale = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 1],
    });

    const opacity = animatedValue;

    return (
        <Animated.View
            style={[
                styles.scanOptionsContainer,
                {
                    opacity,
                    transform: [{ scale }],
                },
            ]}
            pointerEvents={visible ? 'auto' : 'none'}
        >
            {/* Header with back button */}
            <View style={[styles.scanHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    onPress={() => {
                        light();
                        onBack();
                    }}
                    style={styles.backButton}
                >
                    <Feather name="arrow-left" size={20} color={colors.primary} />
                    <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
                </TouchableOpacity>
                <Text style={[styles.scanHeaderTitle, { color: colors.text }]}>
                    Scan Receipt
                </Text>
                <View style={styles.backButton} />
            </View>

            {/* Scan options */}
            <TouchableOpacity
                style={[styles.scanOption, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => {
                    light();
                    onUploadImage();
                }}
                activeOpacity={0.7}
            >
                <View style={[styles.scanIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                    <Feather name="image" size={24} color={colors.primary} />
                </View>
                <View style={styles.scanOptionText}>
                    <Text style={[styles.scanOptionTitle, { color: colors.text }]}>
                        Upload Image
                    </Text>
                    <Text style={[styles.scanOptionSubtitle, { color: colors.textSecondary }]}>
                        Choose from your gallery
                    </Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.scanOption, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => {
                    light();
                    onScanCamera();
                }}
                activeOpacity={0.7}
            >
                <View style={[styles.scanIconContainer, { backgroundColor: `${colors.success}15` }]}>
                    <Feather name="camera" size={24} color={colors.success} />
                </View>
                <View style={styles.scanOptionText}>
                    <Text style={[styles.scanOptionTitle, { color: colors.text }]}>
                        Scan with Camera
                    </Text>
                    <Text style={[styles.scanOptionSubtitle, { color: colors.textSecondary }]}>
                        Take a photo of your receipt
                    </Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
        </Animated.View>
    );
};

export const AnimatedFabMenu: React.FC<AnimatedFabMenuProps> = ({
    visible,
    onClose,
    onAddManually,
    onScanReceipt,
    fabPosition,
}) => {
    const { colors, borderRadius, spacing } = useTheme();
    const { light, medium } = useHaptics();
    const [showScanOptions, setShowScanOptions] = useState(false);

    // Animation values
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const menuScale = useRef(new Animated.Value(0)).current;
    const menuOpacity = useRef(new Animated.Value(0)).current;
    const option1Anim = useRef(new Animated.Value(0)).current;
    const option2Anim = useRef(new Animated.Value(0)).current;
    const fabRotation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setShowScanOptions(false);

            // Opening animation sequence
            Animated.parallel([
                Animated.timing(overlayOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(menuScale, {
                    toValue: 1,
                    tension: 65,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(menuOpacity, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.spring(fabRotation, {
                    toValue: 1,
                    tension: 80,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();

            // Staggered animation for options
            Animated.stagger(80, [
                Animated.spring(option1Anim, {
                    toValue: 1,
                    tension: 60,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.spring(option2Anim, {
                    toValue: 1,
                    tension: 60,
                    friction: 7,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Closing animation
            Animated.parallel([
                Animated.timing(overlayOpacity, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(menuScale, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(menuOpacity, {
                    toValue: 0,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(option1Anim, {
                    toValue: 0,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(option2Anim, {
                    toValue: 0,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.spring(fabRotation, {
                    toValue: 0,
                    tension: 80,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const handleClose = () => {
        light();
        onClose();
    };

    const handleAddManually = () => {
        medium();
        onClose();
        setTimeout(() => {
            onAddManually();
        }, 100);
    };

    const handleScanReceiptPress = () => {
        light();
        setShowScanOptions(true);
    };

    const handleUploadImage = () => {
        medium();
        onClose();
        setTimeout(() => {
            // Navigate to scan receipt with upload mode
            onScanReceipt();
        }, 100);
    };

    const handleScanCamera = () => {
        medium();
        onClose();
        setTimeout(() => {
            // Navigate to scan receipt with camera mode
            onScanReceipt();
        }, 100);
    };

    const rotate = fabRotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '45deg'],
    });

    const option1TranslateY = option1Anim.interpolate({
        inputRange: [0, 1],
        outputRange: [50, 0],
    });

    const option2TranslateY = option2Anim.interpolate({
        inputRange: [0, 1],
        outputRange: [50, 0],
    });

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            {/* Backdrop */}
            <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
                <BlurView
                    intensity={20}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                />
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            {/* Menu Container */}
            <Animated.View
                style={[
                    styles.menuContainer,
                    {
                        opacity: menuOpacity,
                        transform: [{ scale: menuScale }],
                    },
                ]}
            >
                <View
                    style={[
                        styles.menuCard,
                        {
                            backgroundColor: colors.card,
                            borderRadius: borderRadius.xl,
                            shadowColor: colors.shadow,
                        },
                    ]}
                >
                    {/* Main Options */}
                    {!showScanOptions && (
                        <View style={styles.optionsWrapper}>
                            <Text
                                style={[
                                    styles.menuTitle,
                                    { color: colors.text, marginBottom: spacing.lg },
                                ]}
                            >
                                Add Transaction
                            </Text>

                            {/* Option 1: Add Manually */}
                            <Animated.View
                                style={{
                                    opacity: option1Anim,
                                    transform: [{ translateY: option1TranslateY }],
                                }}
                            >
                                <TouchableOpacity
                                    style={[
                                        styles.optionButton,
                                        { backgroundColor: colors.backgroundSecondary },
                                    ]}
                                    onPress={handleAddManually}
                                    activeOpacity={0.7}
                                >
                                    <View
                                        style={[
                                            styles.optionIconContainer,
                                            { backgroundColor: `${colors.primary}15` },
                                        ]}
                                    >
                                        <Feather name="edit-3" size={24} color={colors.primary} />
                                    </View>
                                    <View style={styles.optionTextContainer}>
                                        <Text style={[styles.optionTitle, { color: colors.text }]}>
                                            Add Manually
                                        </Text>
                                        <Text
                                            style={[
                                                styles.optionSubtitle,
                                                { color: colors.textSecondary },
                                            ]}
                                        >
                                            Enter transaction details yourself
                                        </Text>
                                    </View>
                                    <Feather
                                        name="chevron-right"
                                        size={20}
                                        color={colors.textTertiary}
                                    />
                                </TouchableOpacity>
                            </Animated.View>

                            {/* Option 2: Scan Receipt */}
                            <Animated.View
                                style={{
                                    opacity: option2Anim,
                                    transform: [{ translateY: option2TranslateY }],
                                    marginTop: spacing.md,
                                }}
                            >
                                <TouchableOpacity
                                    style={[
                                        styles.optionButton,
                                        { backgroundColor: colors.backgroundSecondary },
                                    ]}
                                    onPress={handleScanReceiptPress}
                                    activeOpacity={0.7}
                                >
                                    <View
                                        style={[
                                            styles.optionIconContainer,
                                            { backgroundColor: `${colors.success}15` },
                                        ]}
                                    >
                                        <Feather name="camera" size={24} color={colors.success} />
                                    </View>
                                    <View style={styles.optionTextContainer}>
                                        <Text style={[styles.optionTitle, { color: colors.text }]}>
                                            Scan Receipt
                                        </Text>
                                        <Text
                                            style={[
                                                styles.optionSubtitle,
                                                { color: colors.textSecondary },
                                            ]}
                                        >
                                            Auto-fill from photo or camera
                                        </Text>
                                    </View>
                                    <Feather
                                        name="chevron-right"
                                        size={20}
                                        color={colors.textTertiary}
                                    />
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
                    )}

                    {/* Scan Receipt Sub-options */}
                    <ScanOptions
                        visible={showScanOptions}
                        onUploadImage={handleUploadImage}
                        onScanCamera={handleScanCamera}
                        onBack={() => setShowScanOptions(false)}
                    />
                </View>

                {/* Animated Close FAB */}
                <TouchableOpacity
                    style={[
                        styles.closeFab,
                        {
                            backgroundColor: colors.primary,
                            shadowColor: colors.primary,
                        },
                    ]}
                    onPress={handleClose}
                    activeOpacity={0.85}
                >
                    <Animated.View style={{ transform: [{ rotate }] }}>
                        <Feather name="plus" size={32} color="#FFFFFF" />
                    </Animated.View>
                </TouchableOpacity>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    menuContainer: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        alignItems: 'center',
    },
    menuCard: {
        width: '100%',
        padding: 20,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 15,
        minHeight: 200,
    },
    optionsWrapper: {
        width: '100%',
    },
    menuTitle: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
    },
    optionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionTextContainer: {
        flex: 1,
        marginLeft: 14,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    optionSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    closeFab: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 4,
        borderColor: '#0D0D0D',
    },
    // Scan options styles
    scanOptionsContainer: {
        width: '100%',
    },
    scanHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 16,
        marginBottom: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 70,
    },
    backText: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 4,
    },
    scanHeaderTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    scanOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    scanIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanOptionText: {
        flex: 1,
        marginLeft: 14,
    },
    scanOptionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    scanOptionSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
});
