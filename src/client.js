window._ = require('./../quick_start/legacy_comet_server/node_modules/lodash');

require('./lib/clientBaseBrowserify');
require('./lib/Object');
require('./lib/Exception');
require('./lib/NeatCometClient');
require('./lib/router/ConnectionClient');
require('./lib/router/OpenedProfileClient');

module.exports = window.NeatComet;