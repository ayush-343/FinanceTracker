import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    Platform,
    Alert,
    Vibration,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { Button } from './Button';
import { lookupBarcode, BarcodeProduct, BarcodeLookupError } from '../services/barcodeService';
import { useHaptics } from '../hooks/useHaptics';
import { ScannedItem } from '../services/receiptService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const VIEWFINDER_SIZE = SCREEN_WIDTH * 0.7;

interface BarcodeScannerModalProps {
    visible: boolean;
    onClose: () => void;
    onScanComplete: (items: ScannedItem[]) => void;
}

interface ScannedProduct extends BarcodeProduct {
    id: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
    visible,
    onClose,
    onScanComplete,
}) => {
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const insets = useSafeAreaInsets();
    const { success, error: errorHaptic, light } = useHaptics();

    const [permission, requestPermission] = useCameraPermissions();
    const [isProcessing, setIsProcessing] = useState(false);
    const [scannedProducts, setScannedProducts] = useState<ScannedProduct[]>([]);
    const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
    const [lookupError, setLookupError] = useState<string | null>(null);

    // Track scanned barcodes in current session to prevent duplicates
    const scannedBarcodesRef = useRef<Set<string>>(new Set());
    const processingRef = useRef(false);

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setScannedProducts([]);
            setLastScannedBarcode(null);
            setLookupError(null);
            setIsProcessing(false);
            scannedBarcodesRef.current = new Set();
            processingRef.current = false;
        }
    }, [visible]);

    // Request camera permission when modal opens
    useEffect(() => {
        if (visible && !permission?.granted) {
            requestPermission();
        }
    }, [visible, permission, requestPermission]);

    const handleBarcodeScanned = useCallback(async (result: BarcodeScanningResult) => {
        const barcode = result.data;

        // Prevent processing if already processing or duplicate
        if (processingRef.current) return;

        // Check for duplicate in current session
        if (scannedBarcodesRef.current.has(barcode)) {
            // Show "Already scanned" feedback only if it's a different scan attempt
            if (lastScannedBarcode !== barcode) {
                light();
                // Visual feedback through state update
                setLastScannedBarcode(barcode);
            }
            return;
        }

        processingRef.current = true;
        setIsProcessing(true);
        setLookupError(null);
        setLastScannedBarcode(barcode);

        try {
            const product = await lookupBarcode(barcode);

            // Add to scanned products
            const scannedProduct: ScannedProduct = {
                ...product,
                id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            };

            scannedBarcodesRef.current.add(barcode);
            setScannedProducts(prev => [...prev, scannedProduct]);

            success();
        } catch (err) {
            errorHaptic();

            if (err instanceof BarcodeLookupError) {
                setLookupError(err.message);
            } else {
                setLookupError('Failed to lookup product. Try again.');
            }
        } finally {
            setIsProcessing(false);
            // Add delay before allowing next scan
            setTimeout(() => {
                processingRef.current = false;
            }, 1500);
        }
    }, [lastScannedBarcode, success, errorHaptic, light]);

    const handleDone = useCallback(() => {
        if (scannedProducts.length === 0) {
            onClose();
            return;
        }

        // Convert scanned products to ScannedItems format
        const items: ScannedItem[] = scannedProducts.map(product => ({
            name: product.name,
            amount: product.price ?? 0,
            suggestedCategoryId: null, // Will be suggested during review
            suggestedSubcategoryId: null,
        }));

        onScanComplete(items);
    }, [scannedProducts, onClose, onScanComplete]);

    const handleRemoveProduct = useCallback((productId: string, barcode: string) => {
        setScannedProducts(prev => prev.filter(p => p.id !== productId));
        scannedBarcodesRef.current.delete(barcode);
    }, []);

    // Permission not granted
    if (permission && !permission.granted) {
        return (
            <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    <View style={[styles.permissionContainer, { padding: spacing.xxl }]}>
                        <Feather name="camera-off" size={64} color={colors.textSecondary} />
                        <Text style={[textStyles.h3, { color: colors.text, marginTop: spacing.xl, textAlign: 'center' }]}>
                            Camera Permission Required
                        </Text>
                        <Text style={[textStyles.body, { color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }]}>
                            To scan barcodes, please allow camera access in your device settings.
                        </Text>
                        <Button
                            title="Grant Permission"
                            onPress={requestPermission}
                            variant="primary"
                            style={{ marginTop: spacing.xl }}
                        />
                        <Button
                            title="Cancel"
                            onPress={onClose}
                            variant="ghost"
                            style={{ marginTop: spacing.md }}
                        />
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                {/* Camera View */}
                <CameraView
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    zoom={0.3}
                    barcodeScannerSettings={{
                        barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
                    }}
                    onBarcodeScanned={isProcessing ? undefined : handleBarcodeScanned}
                />

                {/* Overlay */}
                <View style={styles.overlay}>
                    {/* Top section with close button */}
                    <View style={[styles.topSection, { paddingTop: insets.top + spacing.md }]}>
                        <TouchableOpacity
                            style={[styles.closeButton, { backgroundColor: colors.card }]}
                            onPress={onClose}
                        >
                            <Feather name="x" size={24} color={colors.text} />
                        </TouchableOpacity>

                        {/* Scanned count badge */}
                        {scannedProducts.length > 0 && (
                            <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
                                <Text style={[textStyles.label, { color: '#fff' }]}>
                                    {scannedProducts.length} item{scannedProducts.length !== 1 ? 's' : ''}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Viewfinder area */}
                    <View style={styles.viewfinderContainer}>
                        <View style={[styles.viewfinder, { borderColor: isProcessing ? colors.primary : '#fff' }]}>
                            {/* Corner markers */}
                            <View style={[styles.corner, styles.cornerTopLeft, { borderColor: colors.primary }]} />
                            <View style={[styles.corner, styles.cornerTopRight, { borderColor: colors.primary }]} />
                            <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: colors.primary }]} />
                            <View style={[styles.corner, styles.cornerBottomRight, { borderColor: colors.primary }]} />

                            {/* Processing indicator */}
                            {isProcessing && (
                                <View style={styles.processingOverlay}>
                                    <ActivityIndicator size="large" color={colors.primary} />
                                    <Text style={[textStyles.label, { color: '#fff', marginTop: spacing.sm }]}>
                                        Looking up product...
                                    </Text>
                                </View>
                            )}
                        </View>

                        <Text style={[textStyles.body, { color: '#fff', marginTop: spacing.lg, textAlign: 'center' }]}>
                            Point camera at barcode
                        </Text>
                    </View>

                    {/* Bottom section with scanned items and done button */}
                    <View style={[styles.bottomSection, { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.card }]}>
                        {/* Last scanned product */}
                        {scannedProducts.length > 0 && (
                            <View style={[styles.lastScannedContainer, { borderBottomColor: colors.border }]}>
                                <Text style={[textStyles.labelSmall, { color: colors.textSecondary }]}>
                                    Last scanned:
                                </Text>
                                <View style={styles.lastScannedItem}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[textStyles.body, { color: colors.text }]} numberOfLines={1}>
                                            {scannedProducts[scannedProducts.length - 1].name}
                                        </Text>
                                        {scannedProducts[scannedProducts.length - 1].brand && (
                                            <Text style={[textStyles.labelSmall, { color: colors.textSecondary }]}>
                                                {scannedProducts[scannedProducts.length - 1].brand}
                                            </Text>
                                        )}
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => {
                                            const lastProduct = scannedProducts[scannedProducts.length - 1];
                                            handleRemoveProduct(lastProduct.id, lastProduct.barcode);
                                        }}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <Feather name="trash-2" size={20} color={colors.error} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Action buttons */}
                        <View style={[styles.buttonRow, { marginTop: spacing.md }]}>
                            <Button
                                title="Enter Manually"
                                onPress={() => {
                                    onClose();
                                    // Navigate to manual entry will be handled by parent
                                }}
                                variant="secondary"
                                style={{ flex: 1, marginRight: spacing.sm }}
                            />
                            <Button
                                title={scannedProducts.length > 0 ? `Done (${scannedProducts.length})` : 'Cancel'}
                                onPress={handleDone}
                                variant="primary"
                                style={{ flex: 1, marginLeft: spacing.sm }}
                            />
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    topSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    countBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    viewfinderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewfinder: {
        width: VIEWFINDER_SIZE,
        height: VIEWFINDER_SIZE * 0.6,
        borderWidth: 2,
        borderRadius: 12,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderWidth: 4,
    },
    cornerTopLeft: {
        top: -2,
        left: -2,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderTopLeftRadius: 12,
    },
    cornerTopRight: {
        top: -2,
        right: -2,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
        borderTopRightRadius: 12,
    },
    cornerBottomLeft: {
        bottom: -2,
        left: -2,
        borderRightWidth: 0,
        borderTopWidth: 0,
        borderBottomLeftRadius: 12,
    },
    cornerBottomRight: {
        bottom: -2,
        right: -2,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderBottomRightRadius: 12,
    },
    processingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },
    bottomSection: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    lastScannedContainer: {
        borderBottomWidth: 1,
        paddingBottom: 12,
    },
    lastScannedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    buttonRow: {
        flexDirection: 'row',
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
