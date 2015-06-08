global.Promise = require('when').Promise;

// Load libs
require('./lib/jii/main');
require('../lib/NeatComet/server');
require('../lib/NeatComet/lib/adapters/jii/JiiCometServerMultiProcess');

// Load modules
require('./modules/neat/package');
require('./modules/proxy/package');