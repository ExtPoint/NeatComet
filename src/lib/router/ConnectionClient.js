/**
 * @copyright Copyright 2014 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/**
 * @class NeatComet.router.ConnectionClient
 * @extends NeatComet.Object
 */
NeatComet.router.ConnectionClient = NeatComet.Object.extend(/** @lends NeatComet.router.ConnectionClient.prototype */{

	/** @type {NeatComet.api.ICometClient} */
	comet: null,

	/** @type {Function} */
	onConnectionRestore: null,

	/** @type {Function} */
	onInit: null,

	/** @type {Function} */
	onMessage: null,

	isReady: false,

	_lastInitId: 0,
	_waitingFor: 1, // Lock initially. Null = not waiting
	_messageQueue: [],

	init: function() {

		// Install comet listeners
        this.comet.bindEvents({
            onConnectionRestore: _.bind(this._onCometConnectionRestore, this),
            onMessage: _.bind(this._onCometMessage, this)
        });
	},

	_onCometConnectionRestore: function() {

		this.isReady = true;
		this.onConnectionRestore();
	},

	_onCometMessage: function(channel, data) {

		if (this._waitingFor) {
			this._messageQueue.push([channel, data]);
		}
		else {
			this.onMessage(channel, data);
		}
	},

    sendOpen: function(params) {

		// Force initialization-time messages to run after initialization
		var requestId = ++this._lastInitId;
		this._waitingFor = requestId;
		this._messageQueue = [];

		this.comet.sendOpen(params, _.bind(function(data) {

			// Drop the result of a wrong call
			if (this._waitingFor != requestId) {
				return;
			}

			// Stop waiting
			this._waitingFor = null;

			// Effective init
			this.onInit(data);

			// Flush pending messages
			_.each(this._messageQueue, function(message) {
				this.onMessage.apply(this, message);
			}, this);
			this._messageQueue = [];

		}, this));
	}

});
