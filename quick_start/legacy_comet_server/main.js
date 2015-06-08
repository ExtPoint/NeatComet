var cluster = require('cluster');
var configs = require('./configuration/bootstrap');

if (cluster.isMaster) {
    var BootstrapMaster = require('./lib/node-master/BootstrapMaster');
    var config = {
        applications: {
            comet: configs('comet'),
            http: configs('http')
        }
    };
    new BootstrapMaster(config).start();

} else {

    var BootstrapWorker = require('./lib/node-master/BootstrapWorker');
    var bootstrapWorker = new BootstrapWorker();
	bootstrapWorker.run = function (name, index) {

        // Load all
        require('./bootstrap');

        // Get config
        var config = configs(name);
        delete config.master;

        // Init framework
        Jii.init(config);

		// Run services
        switch (name) {
	        case 'comet':
	            Jii.app.comet.port = parseInt(Jii.app.comet.port) + parseInt(index);
                Jii.app.comet.urlPrefix = '/stat/node-comet/[0-9]+'; // template: /{version}/comet/{index}'
                Jii.app.comet.start();
                break;

            case 'http':
                Jii.app.http.start();
                break;
        }
    };
    bootstrapWorker.end = function (name) {
        // Run services
        switch (name) {
            case 'comet':
                Jii.app.comet.end();
                break;

            case 'http':
                Jii.app.http.stop();
                break;
        }

	    Jii.app.redis.end();
    };
    bootstrapWorker.start();

}
