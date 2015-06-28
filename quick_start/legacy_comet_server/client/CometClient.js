/**
 * @copyright Copyright 2013 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://www.affka.ru">Vladimir Kozhin</a>
 * @license MIT
 */

'use strict';

/**
 * @class NeatComet.quickStart.legacyCometServer.CometClient
 * @extends Joints.Object
 * @extends Backbone.Events
 * @implements NeatComet.api.ICometClientEvents
 */
Joints.defineClass('NeatComet.quickStart.legacyCometServer.CometClient', Joints.Object, /** @lends NeatComet.quickStart.legacyCometServer.CometClient.prototype */ {

    /**
     * Url to comet server
     * @type {String}
     */
    serverUrl: '',

    /**
     * Url pattern to comet server
     * @type {String||null}
     */
    serverUrlPattern: null,

    /**
     * @type {Number}
     */
    maxWorkerIndex: null,

    /**
     * @type {String}
     */
    stationUid: null,

    /**
     * @type {Number}
     */
    pingInterval: 10, // sec

    /**
     * @type {Number}
     */
    pingTimeout: 5, // sec

    /**
     * @type {Boolean}
     */
    autoReconnect: true,

    _deferred: null,
    _pingTimer: null,
    _requestDeferreds: {},
    _noSendMessages: [],
    _subscribeChannels: [],
    _isOpened: false,
    _forceClosed: false,


    /**
     * @type {SockJS}
     */
    _websocket: null,

    /**
     * @type {number}
     */
    _tryReconnectNumber: 0,

    /**
     * @type {string}
     */
    _lastProtocol: '',

    init: function() {
        this._forceClosed = false;
        this._deferred = $.Deferred();

        // Generate or get stationUid
        if (this.stationUid === null) {
            this.stationUid = NeatComet.quickStart.legacyCometServer.CometClient._generateUid();
        }

        // Init url
        if (this.serverUrlPattern !== null && this.maxWorkerIndex !== null) {
            var min = 0;
            var max = this.maxWorkerIndex;
            var workerIndex = min + Math.floor(Math.random() * (max - min + 1));
            this.serverUrl = this.serverUrlPattern.replace('{workerIndex}', workerIndex);
        }

        this._openEngine();
    },

    setConfiguration: function () {
        this._super.apply(this, arguments);

        // Switch to HTTP protocol if browser fully support HTTPS doesn't support
        this.serverUrl = this._protocolFallbackCheck(this.serverUrl);
        this.serverUrlPattern = this._protocolFallbackCheck(this.serverUrlPattern);
    },

    /**
     * Switch server URL protocol to HTTP instead of HTTPS if browser is IE9 or lesser
     *
     * @param {string} serverUrl
     * @return {string}
     * @private
     */
    _protocolFallbackCheck: function (serverUrl) {
        var pageProtocol = location.protocol;

        // Check url without protocol
        if (serverUrl.match(/https?:/) === null) {
            return pageProtocol + serverUrl;
        }

        var isIE9orLess = (/MSIE/.test(navigator.userAgent) && !/opera/i.test(navigator.userAgent)) && document.all && !window.atob;
        var serverProtocol = serverUrl.replace(/^(https?:).*/, '$1');

        return isIE9orLess && serverProtocol != pageProtocol
            ? serverUrl.replace(/^(https?:)/, pageProtocol)
            : serverUrl;
    },

    open: function() {
        if (this._isOpened === false) {
            this.init();
        }
    },

    close: function() {
        this._forceClosed = true;
        if (this._pingTimer) {
            clearTimeout(this._pingTimer);
        }
        if (this._isOpened) {
            this._closeEngine();
        }
    },

    /**
     *
     * @param {String} method
     * @param {Object} [data]
     * @param {Function} [callback]
     */
    request: function (method, data, callback) {
        data = data || {};

        // Append state data
        $.extend(data, {
            requestUid: NeatComet.quickStart.legacyCometServer.CometClient._generateUid()
        });

        var deferred = new $.Deferred();
        this._requestDeferreds[data.requestUid] = deferred;

        if (_.isFunction(callback)) {
            deferred.done(callback);
        }

        this._send('action ' + method + ' ' + JSON.stringify(data));

        return deferred;
    },

    onChannel: function(channel, handler) {
        if (_.indexOf(this._subscribeChannels, channel) === -1) {
            this.subscribe(channel);
        }

        this.on('channel:' + channel, handler);
    },

    offChannel: function(channel, handler) {
        if (_.indexOf(this._subscribeChannels, channel) !== -1) {
            this.unsubscribe(channel);
        }

        this.off('channel:' + channel, handler);
    },

    /**
     *
     * @param {string} channel
     */
    subscribe: function (channel) {
        // Skip already subscribed channels
        if (_.indexOf(this._subscribeChannels, channel) !== -1) {
            return;
        }

        this._send('subscribe ' + channel);
        this._subscribeChannels.push(channel);
    },

    /**
     *
     * @param {string} channel
     */
    unsubscribe: function (channel) {
        this._send('unsubscribe ' + channel);
        var index = _.indexOf(this._subscribeChannels, channel);
        delete this._subscribeChannels[index];
    },

    _ping: function() {
        if (this._pingTimer) {
            clearTimeout(this._pingTimer);
        }

        if (this._isOpened === false) {
            return;
        }

        var that = this;
        /*this._pingTimer = setTimeout(function() {
            var timeoutTimer = setTimeout(function() {
                that._closeEngine();
            }, that.pingTimeout * 1000);
            that.request('user.ping', {}, function(data) {
                if (data && data.pong) {
                    clearTimeout(timeoutTimer);
                    that._ping();
                }
            });
        }, this.pingInterval * 1000);*/
    },

    _openEngine: function() {
        this._websocket = new SockJS(this.serverUrl, null, {
            //debug: false,
            //protocols_whitelist: this.protocols
        });

        this._websocket.onopen = _.bind(this._onOpen, this);
        this._websocket.onmessage = _.bind(this._onMessage, this);
        this._websocket.onclose = _.bind(this._onClose, this);

        // Check subscribes from previous connection
        var channels = this._subscribeChannels;
        this._subscribeChannels = [];
        this._deferred.done(_.bind(function() {
            _.each(channels, _.bind(this.subscribe, this));
        }, this));
    },

    _closeEngine: function() {
        this._websocket.close();
    },

    _sendEngine: function(message) {
        this._websocket.send(message);
    },

    _send: function(message) {
        // If comet is not initialized, then stored messages
        if (this._isOpened === false) {
            if (message.indexOf('subscribe') !== 0) {
                this._noSendMessages.push(message);
            }

            if (this._forceClosed) {
                this.open();
            }
            return;
        }

        this._sendEngine(message);
    },

    _onOpen: function () {
        if (this._isOpened === true) {
            return;
        }
        this._isOpened = true;

        // Check subscribes from previous connection
        var channels = this._subscribeChannels;
        this._subscribeChannels = [];
        _.each(channels, _.bind(this.subscribe, this));

        this._tryReconnectNumber = 0;
        this._lastProtocol = this._websocket.protocol;

        // Send messages, which sending before open connection
        _.each(this._noSendMessages, _.bind(this._send, this));
        this._noSendMessages = [];

        this._ping();
        this.trigger('open');
    },

    _onClose: function () {
        if (this._isOpened === false) {
            return;
        }
        this._isOpened = false;

        this.trigger('close');

        // Retry connect after 5 or 20 sec
        if (this.autoReconnect === true && this._forceClosed === false) {
            setTimeout(_.bind(function() {
                this._tryReconnectNumber++;
                this.open();
            }, this), this._tryReconnectNumber > 10 ? 20000 : 5000);
        }
    },

    _onMessage: function (event) {
        if (event.type !== 'message') {
            return;
        }

        this._parseIncomingMessage(event.data);
    },

    _parseIncomingMessage: function(incomingMessage) {
        var i = incomingMessage.indexOf(' ');
        var type = incomingMessage.substr(0, i);
        var message = incomingMessage.substr(i + 1);

        switch (type) {
            case 'channel':
                var i2 = message.indexOf(' ');
                var channel = message.substr(0, i2);
                var dataString = message.substr(i2 + 1);
                var data = JSON.parse(dataString);

                this.trigger('channelMessage', channel, data);
                this.trigger('channel:' + channel, data); // TODO: Remove this kind of events

                break;

            case 'action':
                var response = JSON.parse(message);
                if (response.requestUid && this._requestDeferreds[response.requestUid]) {
                    this._requestDeferreds[response.requestUid].resolve(response);
                }
                break;
        }
    },

    sendOpen: function(params, successCallback) {

        this.request(
            'open',
            { neat: params },
            function(data) {

                // Chain with NeatComet handler
                successCallback(data.neat);
            }
        );
    },

    sendClose: function(ids) {

        this.request(
            'close',
            { neat: ids }
        );
    },

    /**
     * Allowed to expect that it will be called only once per ICometServer instance
     * @param {NeatComet.api.ICometClientEvents} eventsHandler
     */
    bindEvents: function(eventsHandler) {

        this.on('channelMessage', function(channel, data) {
            if (channel.indexOf('profiles:') == 0) {
                eventsHandler.onMessage(channel.substr(9), data);
            }
        });

        this.on('open', eventsHandler.onConnectionRestore.bind(eventsHandler));
    }

}, /** @lends NeatComet.quickStart.legacyCometServer.CometClient */ {

    _generateUid: function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);});
    }

});

_.extend(NeatComet.quickStart.legacyCometServer.CometClient.prototype, Backbone.Events);
