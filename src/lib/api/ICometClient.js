/**
 * @copyright Copyright 2014 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/**
 * @callback NeatComet.api.ICometClient~openSuccess
 * @param {Object} result
 */

/**
 * @namespace NeatComet.api
 * @interface NeatComet.api.ICometClient
 */
NeatComet.api.ICometClient = function() {};

NeatComet.api.ICometClient.prototype = {

    /**
     * Allowed to expect that it will be called only once per ICometServer instance
     * @param {NeatComet.api.ICometClientEvents} eventsHandler
     */
    bindEvents: function(eventsHandler) {

    },

    /**
     * @param {object} params
     * @param {NeatComet.api.ICometClient~openSuccess} successCallback
     */
    sendOpen: function(params, successCallback) {

    },

    /**
     * @param {string[]} ids
     */
    sendClose: function(ids) {

    }

};
