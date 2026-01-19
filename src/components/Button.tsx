import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme';
import { useHaptics } from '../hooks';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    style,
    textStyle,
    fullWidth = false,
}) => {
    const { colors, spacing, borderRadius, heights, textStyles } = useTheme();
    const { light } = useHaptics();

    const handlePress = () => {
        if (!disabled && !loading) {
            light();
            onPress();
        }
    };

    const getBackgroundColor = () => {
        if (disabled) return colors.backgroundTertiary;
        switch (variant) {
            case 'primary':
                return colors.primary;
            case 'secondary':
                return colors.backgroundSecondary;
            case 'outline':
            case 'ghost':
                return 'transparent';
            case 'danger':
                return colors.error;
            default:
                return colors.primary;
        }
    };

    const getTextColor = () => {
        if (disabled) return colors.textTertiary;
        switch (variant) {
            case 'primary':
            case 'danger':
                return '#FFFFFF';
            case 'secondary':
                return colors.text;
            case 'outline':
                return colors.primary;
            case 'ghost':
                return colors.primary;
            default:
                return '#FFFFFF';
        }
    };

    const getHeight = () => {
        switch (size) {
            case 'small':
                return heights.buttonSmall;
            case 'large':
                return heights.button + 8;
            default:
                return heights.button;
        }
    };

    const getFontStyle = () => {
        switch (size) {
            case 'small':
                return textStyles.buttonSmall;
            default:
                return textStyles.button;
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                {
                    backgroundColor: getBackgroundColor(),
                    height: getHeight(),
                    borderRadius: borderRadius.lg,
                    paddingHorizontal: spacing.xl,
                    borderWidth: variant === 'outline' ? 2 : 0,
                    borderColor: variant === 'outline' ? colors.primary : undefined,
                    opacity: disabled ? 0.6 : 1,
                },
                fullWidth && styles.fullWidth,
                style,
            ]}
            onPress={handlePress}
            activeOpacity={0.7}
            disabled={disabled || loading}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Text style={[getFontStyle(), { color: getTextColor() }, textStyle]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullWidth: {
        width: '100%',
    },
});
