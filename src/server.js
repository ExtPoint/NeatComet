global._ = require('./../quick_start/legacy_comet_server/node_modules/lodash');

require('./lib/serverBase');
require('./lib/Object');
require('./lib/Exception');
require('./lib/NeatCometServer');
require('./lib/bindings/BindingServer');
require('./lib/channels/BaseChannelServer');
require('./lib/channels/DirectChannelServer');
require('./lib/configReader/ConfigReader');
require('./lib/router/RouteServer');
require('./lib/router/ConnectionServer');
require('./lib/router/DataLoaderServer');
require('./lib/router/OpenedProfileServer');

module.exports = global.NeatComet;