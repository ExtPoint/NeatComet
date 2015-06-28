var configs = {
    web: require('./web'),
    test: require('./test'),
    custom: {},
    base: {
        main: require('./base/main'),
        development: require('./base/development'),
        production: require('./base/production')
    },
    comet: {
        main: require('./comet/main'),
        development: require('./comet/development'),
        production: require('./comet/production')
    },
    http: {
        main: require('./http/main'),
        development: require('./http/development'),
        production: require('./http/production')
    }
};

module.exports = function(applicationName, mode, nodeEnv) {
    mode = mode || 'web';
    nodeEnv = nodeEnv || configs.custom.profile || process.env.NODE_ENV || 'production';

    return require('lodash').merge(
        {}, // Clone to empty object
        configs.base.main,
        configs.base[nodeEnv],
        configs[mode],
        configs[applicationName].main,
        configs[applicationName][nodeEnv],
        configs.custom.base || {},
        configs.custom[applicationName] || {},
	    { profile: nodeEnv } // Set profile to config
    )
};

module.exports.loadCustom = function(fileName) {
    eval('configs.custom = require(' + JSON.stringify(fileName) + ')');
};