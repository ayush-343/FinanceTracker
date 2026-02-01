import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Alert, Platform, ActionSheetIOS } from 'react-native';
import { scanReceiptImage, ReceiptScanError } from '../services/receiptService';
import { useScanStore } from '../store/scanStore';
import { useHaptics } from './useHaptics';

interface UseReceiptScannerReturn {
    isScanning: boolean;
    error: string | null;
    showModal: boolean;
    pickImage: () => void;
    retry: () => void;
    goToManualEntry: () => void;
    closeModal: () => void;
}

// Store the last used image URI for retry
let lastImageUri: string | null = null;

export const useReceiptScanner = (): UseReceiptScannerReturn => {
    const router = useRouter();
    const { success, error: errorHaptic } = useHaptics();
    const addPendingItems = useScanStore((state) => state.addPendingItems);

    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);

    const processImage = useCallback(async (imageUri: string) => {
        lastImageUri = imageUri;
        setIsScanning(true);
        setError(null);
        setShowModal(true);

        try {
            const result = await scanReceiptImage(imageUri);

            // Store items in scan store
            addPendingItems(result.items, result.receiptDate);

            success();
            setShowModal(false);

            // Navigate to review screen
            router.push('/ReviewScannedItems');
        } catch (err) {
            errorHaptic();

            if (err instanceof ReceiptScanError) {
                setError(err.message);
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setIsScanning(false);
        }
    }, [addPendingItems, router, success, errorHaptic]);

    const showImageSourcePicker = useCallback(() => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Take Photo', 'Choose from Library'],
                    cancelButtonIndex: 0,
                },
                async (buttonIndex) => {
                    if (buttonIndex === 1) {
                        launchCamera();
                    } else if (buttonIndex === 2) {
                        launchLibrary();
                    }
                }
            );
        } else {
            // For Android, show a simple alert with options
            Alert.alert(
                'Select Image Source',
                'Choose where to get the receipt image from',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Camera', onPress: launchCamera },
                    { text: 'Library', onPress: launchLibrary },
                ]
            );
        }
    }, []);

    const launchCamera = useCallback(async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert(
                'Permission Required',
                'Camera permission is required to take photos of receipts.',
                [{ text: 'OK' }]
            );
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: false,
        });

        if (!result.canceled && result.assets[0]) {
            processImage(result.assets[0].uri);
        }
    }, [processImage]);

    const launchLibrary = useCallback(async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert(
                'Permission Required',
                'Photo library permission is required to select receipt images.',
                [{ text: 'OK' }]
            );
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: false,
        });

        if (!result.canceled && result.assets[0]) {
            processImage(result.assets[0].uri);
        }
    }, [processImage]);

    const pickImage = useCallback(() => {
        showImageSourcePicker();
    }, [showImageSourcePicker]);

    const retry = useCallback(() => {
        if (lastImageUri) {
            processImage(lastImageUri);
        } else {
            // If no previous image, start fresh
            setShowModal(false);
            setError(null);
            pickImage();
        }
    }, [processImage, pickImage]);

    const goToManualEntry = useCallback(() => {
        setShowModal(false);
        setError(null);
        router.push('/AddTransaction');
    }, [router]);

    const closeModal = useCallback(() => {
        if (!isScanning) {
            setShowModal(false);
            setError(null);
        }
    }, [isScanning]);

    return {
        isScanning,
        error,
        showModal,
        pickImage,
        retry,
        goToManualEntry,
        closeModal,
    };
};
