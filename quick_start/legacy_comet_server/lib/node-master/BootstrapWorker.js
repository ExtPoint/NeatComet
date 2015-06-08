var _ = require('lodash');
var ControlCenterClient = require('./ControlCenterClient');

var BootstrapWorker = function BootstrapWorker() {
	this.init();
    this.run = null;
    this.end = null;
	this.controlCenterClient = new ControlCenterClient();
	this.onRun = null;

    process.on('uncaughtException', function(err) {
        console.error('Caught exception:', err, err.stack);

        // Normal stop services
        this.stop();

        // Timeout for stop, force exit on timeout
        var killtimer = setTimeout(function() {
            console.info('Force exit `%s` worker...', process.env.APPLICATION_NAME);
            process.exit();
        }); // 0 sec

        // But don't keep the process open just for that!
        //killtimer.unref();
    }.bind(this));
}

BootstrapWorker.prototype = {

	init: function() {
		//this.controlCenterClient.connect();
	},

	start: function() {
        if (this.run === null) {
            throw new Error('Run method not defined in BootstrapWorker. Please fill it in start main.js file.')
        }

		console.info('Worker `%s` thread started...', process.env.APPLICATION_NAME);
        this.run(process.env.APPLICATION_NAME, process.env.WORKER_INDEX);
	},

    stop: function() {
        console.info('Worker `%s` thread stopped...', process.env.APPLICATION_NAME);
        if (this.end !== null) {
            this.end(process.env.APPLICATION_NAME);
	        require('cluster').worker.disconnect();
        }
    }
}

module.exports = BootstrapWorker;
