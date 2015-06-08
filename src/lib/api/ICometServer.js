/**
 * @copyright Copyright 2014 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/**
 * @namespace NeatComet.api
 * @interface NeatComet.api.ICometServer
 */
NeatComet.api.ICometServer = function() {};

NeatComet.api.ICometServer.prototype = {

    /**
     * Allowed to expect that it will be called only once per ICometServer instance
     * @param {NeatComet.api.ICometServerEvents} eventsHandler
     */
    bindServerEvents: function(eventsHandler) {

    },

    // I. Inter server part

    /**
     * @param {String} channel
     * @param {*} message
     */
    broadcast: function(channel, message) {

    },

    /**
     * @param {String} channel
     * @param {Function} callback
     */
    subscribe: function(channel, callback) {

    },

    /**
     * @param {String} channel
     * @param {Function} callback
     */
    unsubscribe: function(channel, callback) {

    },


    // II. Client connection part

    /**
     * @param {String} connectionId
     * @param {String} channel
     * @param {*} data
     */
    pushToClient: function(connectionId, channel, data) {

    },


    // III. Direct forward part

    /**
     * @return {boolean}
     */
    getSupportsForwardToClient: function() {

    },

    /**
     * @param {String} channel
     */
    forwardToClient: function(channel) {

    },

    /**
     * @param {String} channel
     */
    stopForwardingToClient: function(channel) {

    }
};
