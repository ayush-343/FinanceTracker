import React from 'react';
import {
    View,
    TextInput as RNTextInput,
    Text,
    StyleSheet,
    ViewStyle,
    TextInputProps as RNTextInputProps,
    TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface TextInputProps extends RNTextInputProps {
    label?: string;
    error?: string;
    leftIcon?: keyof typeof Feather.glyphMap;
    rightIcon?: keyof typeof Feather.glyphMap;
    onRightIconPress?: () => void;
    containerStyle?: ViewStyle;
}

export const TextInput: React.FC<TextInputProps> = ({
    label,
    error,
    leftIcon,
    rightIcon,
    onRightIconPress,
    containerStyle,
    style,
    ...props
}) => {
    const { colors, spacing, borderRadius, heights, textStyles } = useTheme();

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text
                    style={[
                        textStyles.label,
                        { color: colors.textSecondary, marginBottom: spacing.sm },
                    ]}
                >
                    {label}
                </Text>
            )}
            <View
                style={[
                    styles.inputContainer,
                    {
                        backgroundColor: colors.inputBackground,
                        borderRadius: borderRadius.lg,
                        borderWidth: 1,
                        borderColor: error ? colors.error : colors.inputBorder,
                        height: heights.input,
                        paddingHorizontal: spacing.lg,
                    },
                ]}
            >
                {leftIcon && (
                    <Feather
                        name={leftIcon}
                        size={20}
                        color={colors.textTertiary}
                        style={{ marginRight: spacing.sm }}
                    />
                )}
                <RNTextInput
                    style={[
                        styles.input,
                        textStyles.body,
                        { color: colors.text },
                        style,
                    ]}
                    placeholderTextColor={colors.placeholder}
                    {...props}
                />
                {rightIcon && (
                    <TouchableOpacity
                        onPress={onRightIconPress}
                        style={{ marginLeft: spacing.sm }}
                    >
                        <Feather name={rightIcon} size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                )}
            </View>
            {error && (
                <Text
                    style={[
                        textStyles.labelSmall,
                        { color: colors.error, marginTop: spacing.xs },
                    ]}
                >
                    {error}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        height: '100%',
    },
});
