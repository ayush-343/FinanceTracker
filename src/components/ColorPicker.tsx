import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useHaptics } from '../hooks';
import { CATEGORY_COLORS } from '../constants';

// Modal version props
interface ColorPickerModalProps {
    visible: boolean;
    selectedColor: string;
    onSelect: (color: string) => void;
    onClose: () => void;
}

// Inline version props
interface ColorPickerProps {
    selectedColor: string;
    onSelectColor: (color: string) => void;
}

// Inline version (no modal)
export const ColorPicker: React.FC<ColorPickerProps> = ({
    selectedColor,
    onSelectColor,
}) => {
    const { colors, spacing, borderRadius } = useTheme();
    const { selection } = useHaptics();

    const handleSelect = (color: string) => {
        selection();
        onSelectColor(color);
    };

    return (
        <View
            style={[
                styles.inlineGrid,
                {
                    backgroundColor: colors.card,
                    borderRadius: borderRadius.lg,
                    padding: spacing.md,
                },
            ]}
        >
            {CATEGORY_COLORS.map((color) => (
                <TouchableOpacity
                    key={color}
                    style={[
                        styles.colorButtonSmall,
                        {
                            backgroundColor: color,
                            borderRadius: borderRadius.md,
                            borderWidth: selectedColor === color ? 3 : 0,
                            borderColor: colors.text,
                        },
                    ]}
                    onPress={() => handleSelect(color)}
                >
                    {selectedColor === color && (
                        <Feather name="check" size={16} color="#FFF" />
                    )}
                </TouchableOpacity>
            ))}
        </View>
    );
};

// Modal version
export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
    visible,
    selectedColor,
    onSelect,
    onClose,
}) => {
    const { colors, spacing, borderRadius, textStyles } = useTheme();
    const { selection } = useHaptics();

    const handleSelect = (color: string) => {
        selection();
        onSelect(color);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
                <View
                    style={[
                        styles.container,
                        {
                            backgroundColor: colors.background,
                            borderTopLeftRadius: borderRadius.xxl,
                            borderTopRightRadius: borderRadius.xxl,
                        },
                    ]}
                >
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <Text style={[textStyles.h3, { color: colors.text }]}>
                            Choose Color
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Feather name="x" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        contentContainerStyle={[styles.grid, { padding: spacing.lg }]}
                        showsVerticalScrollIndicator={false}
                    >
                        {CATEGORY_COLORS.map((color) => (
                            <TouchableOpacity
                                key={color}
                                style={[
                                    styles.colorButton,
                                    {
                                        backgroundColor: color,
                                        borderRadius: borderRadius.lg,
                                        borderWidth: selectedColor === color ? 3 : 0,
                                        borderColor: colors.text,
                                    },
                                ]}
                                onPress={() => handleSelect(color)}
                            >
                                {selectedColor === color && (
                                    <Feather name="check" size={24} color="#FFF" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    container: {
        maxHeight: '50%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: 12,
    },
    inlineGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: 8,
    },
    colorButton: {
        width: 56,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorButtonSmall: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
