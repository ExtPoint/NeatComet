if (!global.Promise) {
    global.Promise = require('when').Promise;
}

// Load libs
require('./lib/jii/main');
require('../../src/server');
require('../../src/lib/adapters/jii/JiiCometServerMultiProcess');

// Load modules
require('./modules/neat/package');
require('./modules/proxy/package');