import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useHaptics } from '../hooks';
import { CATEGORY_ICONS } from '../constants';

// Modal version props
interface IconPickerModalProps {
    visible: boolean;
    selectedIcon: string;
    onSelect: (iconName: string) => void;
    onClose: () => void;
}

// Inline version props
interface IconPickerProps {
    selectedIcon: string;
    selectedColor?: string;
    onSelectIcon: (iconName: string) => void;
}

// Inline version (no modal)
export const IconPicker: React.FC<IconPickerProps> = ({
    selectedIcon,
    selectedColor = '#6366F1',
    onSelectIcon,
}) => {
    const { colors, spacing, borderRadius } = useTheme();
    const { selection } = useHaptics();

    const handleSelect = (iconName: string) => {
        selection();
        onSelectIcon(iconName);
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
            {CATEGORY_ICONS.map((icon) => (
                <TouchableOpacity
                    key={icon.name}
                    style={[
                        styles.iconButton,
                        {
                            backgroundColor:
                                selectedIcon === icon.name
                                    ? `${selectedColor}20`
                                    : 'transparent',
                            borderRadius: borderRadius.md,
                            borderWidth: selectedIcon === icon.name ? 2 : 0,
                            borderColor: selectedColor,
                        },
                    ]}
                    onPress={() => handleSelect(icon.name)}
                >
                    <Feather
                        name={icon.name as any}
                        size={24}
                        color={selectedIcon === icon.name ? selectedColor : colors.textSecondary}
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
};

// Modal version
export const IconPickerModal: React.FC<IconPickerModalProps> = ({
    visible,
    selectedIcon,
    onSelect,
    onClose,
}) => {
    const { colors, spacing, borderRadius, textStyles } = useTheme();
    const { selection } = useHaptics();

    const handleSelect = (iconName: string) => {
        selection();
        onSelect(iconName);
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
                            Choose Icon
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Feather name="x" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        contentContainerStyle={[styles.grid, { padding: spacing.lg }]}
                        showsVerticalScrollIndicator={false}
                    >
                        {CATEGORY_ICONS.map((icon) => (
                            <TouchableOpacity
                                key={icon.name}
                                style={[
                                    styles.iconButton,
                                    {
                                        backgroundColor:
                                            selectedIcon === icon.name
                                                ? colors.primary
                                                : colors.backgroundSecondary,
                                        borderRadius: borderRadius.lg,
                                    },
                                ]}
                                onPress={() => handleSelect(icon.name)}
                            >
                                <Feather
                                    name={icon.name as any}
                                    size={24}
                                    color={selectedIcon === icon.name ? '#FFF' : colors.text}
                                />
                                <Text
                                    style={[
                                        textStyles.labelSmall,
                                        {
                                            color:
                                                selectedIcon === icon.name ? '#FFF' : colors.textSecondary,
                                            marginTop: 4,
                                        },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {icon.label}
                                </Text>
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
        maxHeight: '70%',
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
    iconButton: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
    },
});
