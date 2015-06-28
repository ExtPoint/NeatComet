/**
 * @copyright Copyright 2014 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/**
 * @namespace NeatComet.api
 * @interface NeatComet.api.ICometClientEvents
 */
NeatComet.api.ICometClientEvents = function() {};

NeatComet.api.ICometClientEvents.prototype = {

    /**
     * @param {string} channel
     * @param {NeatComet.api.ICometClient~openSuccess} data
     */
    onMessage: function(channel, data) {

    },

    onConnectionRestore: function() {

    }

};
