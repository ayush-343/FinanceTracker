// The app schedules only local notifications (weekly review, budget alerts), which need no push entitlement.
// expo-notifications adds aps-environment anyway; personal Apple teams cannot sign that, so remove it.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = (config) =>
  withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
