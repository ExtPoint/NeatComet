/**
 * @copyright Copyright 2014-2017 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/**
 * @namespace NeatComet.api
 * @interface NeatComet.api.ICometServerEvents
 */
NeatComet.api.ICometServerEvents = function() {};

NeatComet.api.ICometServerEvents.prototype = {

    /**
     * @param {String} connectionId
     */
    onNewConnection: function(connectionId) {

    },

    /**
     * @param {String} connectionId
     */
    onLostConnection: function(connectionId) {

    },

    /**
     * @param {String} connectionId
     * @param {*} params
     * @returns {Promise} for response {*}
     */
    onOpenProfileCommand: function(connectionId, params) {

    },

    /**
     * @param {String} connectionId
     * @param {String[]} ids
     * No response
     */
    onCloseProfileCommand: function(connectionId, ids) {

    }

};
