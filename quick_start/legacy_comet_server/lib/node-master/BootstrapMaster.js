var _ = require('lodash');
var fs = require('fs');
var os = require('os');
var cluster = require('cluster');
var ApplicationWorkers = require('./ApplicationWorkers');

var BootstrapMaster = function BootstrapMaster(config) {
	this._config = _.merge({
		cluster: {
			args: ["--expose_gc"]
		},
		applications: {}
	}, config || {});

	this._applications = {};

	process.on('uncaughtException', function(err) {
		console.error('Caught exception in master:', err, err.stack);

		// Restart everything
		// ? // this._onShutdown();
	}.bind(this));

	this.init();
}

BootstrapMaster.prototype = {

	init: function () {
		console.info('Start master...');

		// Set cluster options
		cluster.setupMaster(this._config.cluster);

		// Subscribe on shutdown event
		process.on('SIGTERM', _.bind(this._onShutdown, this));

		// Init applications
		_.map(_.keys(this._config.applications), _.bind(this._initApplication, this));
	},

	start: function() {
		// Start application workers
		_.map(this._applications, _.bind(this._runApplication, this));
	},

	/**
	 * Initialize application item
	 * @param name
	 */
	_initApplication: function(name) {
		// Skip folders with dot
		if (name == '.' || name == '..') {
			return;
		}

		// Skip ignores in config
		if (_.indexOf(this._config.ignores, name) !== -1) {
			return;
		}

		var config = this._config.applications[name];
		this._applications[name] = new ApplicationWorkers(name, config.master);
		this._applications[name].on('message', _.bind(this._onMessage, this));
	},

	/**
	 * Run application with all it workers
	 * @param application
	 */
	_runApplication: function(application) {
		application.run();
	},

	_onMessage: function(applicationId, worker, message) {

	},

	/**
	 * Handler for shutdown event
	 */
	_onShutdown: function () {
		console.log('Received SIGTERM event. Terminating all worker threads and self.');

		// kill application workers
		_.each(this._applications, function (application) {
			application.killAll();
		});

		// kill self
		process.exit(0);
	}
}

module.exports = BootstrapMaster;
