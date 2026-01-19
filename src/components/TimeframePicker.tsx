import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
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
                    backgroundColor: colors.backgroundSecondary,
                    borderRadius: borderRadius.lg,
                    padding: spacing.xs,
                },
            ]}
        >
            {TIMEFRAMES.map((tf) => (
                <TouchableOpacity
                    key={tf.key}
                    style={[
                        styles.option,
                        {
                            backgroundColor:
                                selected === tf.key ? colors.card : 'transparent',
                            borderRadius: borderRadius.md,
                            paddingVertical: spacing.sm,
                            paddingHorizontal: spacing.md,
                        },
                    ]}
                    onPress={() => handleSelect(tf.key)}
                >
                    <Text
                        style={[
                            styles.optionText,
                            {
                                color: selected === tf.key ? colors.text : colors.textSecondary,
                                fontWeight: selected === tf.key ? '600' : '400',
                            },
                        ]}
                    >
                        {tf.shortLabel}
                    </Text>
                </TouchableOpacity>
            ))}
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
