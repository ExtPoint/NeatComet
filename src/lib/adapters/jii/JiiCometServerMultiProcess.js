/**
 * @copyright Copyright 2014-2017 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/** @namespace NeatComet.adapters.jii */
NeatComet.adapters.jii || (NeatComet.adapters.jii = {});

/**
 * @class NeatComet.adapters.jii.JiiCometServerMultiProcess
 * @extends NeatComet.Object
 * @implements NeatComet.api.ICometServer
 */
var self = NeatComet.adapters.jii.JiiCometServerMultiProcess = NeatComet.Object.extend(/** @lends NeatComet.adapters.jii.JiiCometServerMultiProcess.prototype */ {

    /** @type {Jii.components.comet.BaseCometServer} */
    comet: null,

    /**
     * Note: onOpenProfileCommand() and onCloseProfileCommand must be called from actions explicitly.
     * There's no way to subscribe for them in Jii.
     *
     * @type {NeatComet.api.ICometServerEvents}
     */
    events: null,

    /**
     * Customize in your favor
     * @type {string}
     */
    routePrefix: 'profiles:',

    _ownConnection: {
        id: 'neatCometRouteServer'
    },

    /** @type {Object.<string, Array.<function>>} */
    _subscribedChannels: null,

    /** @type {Object.<string, Array.<function>>} */
    _callbackWrappers: null,

    /**
     * @param {Jii.components.comet.BaseCometServer} jiiCometClient
     */
    constructor: function(jiiCometClient) {

        this._subscribedChannels = {};
        this._callbackWrappers = {};
        this.comet = jiiCometClient;
    },

    /**
     * @param {NeatComet.api.ICometServerEvents} eventsHandler
     */
    bindServerEvents: function(eventsHandler) {

        this.events = eventsHandler;

        this.comet.on('connection:open', _.bind(function(connectionId) {
            eventsHandler.onNewConnection(connectionId);
        }, this));

        this.comet.on('connection:close', _.bind(function(connectionId) {
            eventsHandler.onLostConnection(connectionId);
        }, this));
    },

    /**
     *
     * @param {String} channel
     * @param {*} data
     */
    broadcast: function(channel, data) {
        this.comet.send(this.routePrefix + channel, data);
    },

    /**
     * @param {String} connectionId
     * @param {String} channel
     * @param {*} data
     */
    pushToClient: function(connectionId, channel, data) {
        this.comet.sendToConnection(connectionId, this.routePrefix + channel, data);
    },

    /**
     * @param {String} channel
     * @param {Function} callback
     */
    subscribe: function(channel, callback) {

        var effectiveChannel = this.routePrefix + channel;

        // On in comet server
        if (_.isEmpty(this._callbackWrappers)) {
            if (!this._hubMessageHandlerWrapper) {
                this._hubMessageHandlerWrapper = this._hubMessageHandler.bind(this);
            }
            this.comet.on('hubMessage', this._hubMessageHandlerWrapper);
        }

        // Implement nodejs client
        if (!this._subscribedChannels[channel]) {

            // HACK
            this.comet._connections[this._ownConnection.id] = this._ownConnection;

            this.comet.subscribe(this._ownConnection.id, effectiveChannel);
            this._subscribedChannels[channel] = [];
            this._callbackWrappers[channel] = [];
        }

        // On locally
        var callbackWrapper = function(eventEffectiveChannel, message, connectionId) {
            if (eventEffectiveChannel === effectiveChannel && connectionId === this._ownConnection.id) {
                callback(channel, JSON.parse(message));
            }
        }.bind(this);
        this._subscribedChannels[channel].push(callback);
        this._callbackWrappers[channel].push(callbackWrapper);
    },

    /**
     * @param {String} channel
     * @param {Function} callback
     */
    unsubscribe: function(channel, callback) {

        var index = this._subscribedChannels[channel] ? this._subscribedChannels[channel].indexOf(callback) : -1;

        if (index == -1) {
            throw new NeatComet.Exception('Wrong callback to unsubscribe');
        }

        // Off locally
        this._subscribedChannels[channel].splice(index, 1);
        if (this._subscribedChannels[channel].length == 0) {
            delete this._subscribedChannels[channel];
            delete this._callbackWrappers[channel];
            this.comet.unsubscribe(this._ownConnection.id, this.routePrefix + channel);
        }
        else {
            this._callbackWrappers[channel].splice(index, 1);
        }

        // Off in comet server
        if (_.isEmpty(this._callbackWrappers)) {
            this.comet.removeListener('hubMessage', this._hubMessageHandlerWrapper);
        }
    },

    /**
     * @returns {boolean}
     */
    getSupportsForwardToClient: function() {
        // TODO: Implement
        return false;
    },

    /**
     * To avoid use of this.comet.setMaxListeners(?)
     * @private
     */
    _hubMessageHandler: function(channel, message, connectionId) {

        // Broadcast event
        _.each(this._callbackWrappers, function(array) {
            _.each(array, function(fn) {
                fn(channel, message, connectionId);
            });
        });
    }

});
