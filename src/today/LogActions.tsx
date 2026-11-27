import React from 'react';

/** Opens the "how do you want to log?" menu (type or say, manual, scan). Provided by the tabs layout. */
export const LogActionsContext = React.createContext<{ openLogMenu: () => void }>({ openLogMenu: () => {} });
export const useLogActions = () => React.useContext(LogActionsContext);
