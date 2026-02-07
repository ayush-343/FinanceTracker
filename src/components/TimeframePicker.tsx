import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../theme';
import { useHaptics } from '../hooks';
import { TIMEFRAMES } from '../constants';
import { Timeframe } from '../types';

interface TimeframePickerProps {
    selected: Timeframe;
    onSelect: (timeframe: Timeframe) => void;
}

export const TimeframePicker: React.FC<TimeframePickerProps> = ({
    selected,
    onSelect,
}) => {
    const { colors, spacing, borderRadius } = useTheme();
    const { selection } = useHaptics();

    const handleSelect = (timeframe: Timeframe) => {
        selection();
        onSelect(timeframe);
    };

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: colors.cardDark,
                    borderRadius: borderRadius.xl,
                    padding: 4,
                },
            ]}
        >
            {TIMEFRAMES.map((tf) => {
                const isActive = selected === tf.key;
                return (
                    <TouchableOpacity
                        key={tf.key}
                        style={[
                            styles.option,
                            {
                                backgroundColor: isActive ? colors.card : 'transparent',
                                borderRadius: borderRadius.lg,
                                paddingVertical: spacing.sm + 2,
                                paddingHorizontal: spacing.md,
                                ...(isActive && Platform.OS === 'ios'
                                    ? {
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.25,
                                        shadowRadius: 6,
                                    }
                                    : {}),
                                ...(isActive && Platform.OS === 'android'
                                    ? { elevation: 4 }
                                    : {}),
                            },
                        ]}
                        onPress={() => handleSelect(tf.key)}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.optionText,
                                {
                                    color: isActive ? colors.text : colors.textTertiary,
                                    fontWeight: isActive ? '600' : '400',
                                },
                            ]}
                        >
                            {tf.shortLabel}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
    },
    option: {
        flex: 1,
        alignItems: 'center',
    },
    optionText: {
        fontSize: 14,
    },
});
