window._ = window._ || require('underscore');

require('./lib/clientBaseBrowserify');
require('./lib/Object');
require('./lib/Exception');
require('./lib/NeatCometClient');
require('./lib/router/ConnectionClient');
require('./lib/router/OpenedProfileClient');

module.exports = window.NeatComet;