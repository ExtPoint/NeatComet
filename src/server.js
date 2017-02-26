/**
 * @copyright Copyright 2014-2017 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

// TODO: Make production-friendly
global._ = require('underscore');

require('./lib/serverBase');
require('./lib/Object');
require('./lib/Exception');
require('./lib/NeatCometServer');
require('./lib/api/IOrmLoader');
require('./lib/bindings/BindingServer');
require('./lib/channels/BaseChannelServer');
require('./lib/channels/BaseChannelServer');
require('./lib/channels/DirectChannelServer');
require('./lib/configReader/ConfigReader');
require('./lib/router/RouteServer');
require('./lib/router/ConnectionServer');
require('./lib/router/DataLoaderServer');
require('./lib/router/OpenedProfileServer');
require('./lib/router/openedProfile/LimitsServer');

module.exports = global.NeatComet;