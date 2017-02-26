/**
 * @copyright Copyright 2014-2017 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

window._ = window._ || require('underscore');

require('./lib/clientBaseBrowserify');
require('./lib/Object');
require('./lib/Exception');
require('./lib/NeatCometClient');
require('./lib/router/ConnectionClient');
require('./lib/router/OpenedProfileClient');

module.exports = window.NeatComet;