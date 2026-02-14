import { registerSheet, SheetDefinition } from 'react-native-actions-sheet';
import { TransactionActionSheet, ActionSheetOption } from './ActionSheet';

// Register all sheets
registerSheet('transaction-actions', TransactionActionSheet);

// Type declarations for sheets
declare module 'react-native-actions-sheet' {
    interface Sheets {
        'transaction-actions': SheetDefinition<{
            payload: {
                title?: string;
                message?: string;
                options: ActionSheetOption[];
            };
        }>;
    }
}

export { };
