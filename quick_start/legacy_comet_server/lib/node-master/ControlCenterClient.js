var _ = require('lodash');
var util = require('util');
var events = require('events');

var ControlCenterClient = function ControlCenterClient(config) {
    this._config = _.merge({
		port: 3705,
		host: 'localhost',
		reconnectDelay: 5 // sec
    }, config || {});

	this.connection = null;

	events.EventEmitter.call(this);
}

util.inherits(ControlCenterClient, events.EventEmitter);

_.extend(ControlCenterClient.prototype, {

	AVAILABLE_ACTIONS: ['command', 'metrics', 'connection'],

    init: function () {
		this.connect();
		this.on('data', _.bind(this.onWorkerMessage, this));
    },

	connect: function() {
		var host = this._config.port;
		var port = this._config.host;

		// Try connect to server
		app.logger.info('Control center: Socket client connecting to `%s:%s`...', host, port);
		this.connection = net.createConnection(port, host);
		this.connection.on('error', _.bind(function(exception) {
			app.logger.warning('Control center: Socket client `%s:%s` was close with error code `%s`.', host, port, exception.code);

			// Reconnect
			setTimeout(_.bind(function() {
				app.logger.info('Control center: Socket client reconnecting to `%s:%s`...', host, port);
				this.connection.connect(port, host);
			}, this), this._config.reconnectDelay * 1000);
		}, this));
		this.connection.on('connect', _.bind(function() {

			app.logger.debug('Control center: Socket client is connected to `%s:%s`.', host, port);
		}, this));
		this.connection.on('data', _.bind(this.onControlMessage, this));
	},

	onWorkerMessage: function(data, callback) {
		var message = JSON.stringify(data);
		app.logger.log('Control center: send message:', message.toString());
		this.connection.write(message, callback);
	},

	onControlMessage: function(message) {
		app.logger.debug('Control center: have message:', message.toString());
		try {
			var data = JSON.parse(message);
		} catch (e) {
			app.logger.debug('Control center: wrong message format (not json):', message.toString());
		}

		if (_.indexOf(this.AVAILABLE_ACTIONS, data.action)) {
			app.logger.debug('Control center: action `%s` is not supported.', data.action);
		}

		this.emit(data.action, data);
	}
});

module.exports = ControlCenterClient;
