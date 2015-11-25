/**
 * @copyright Copyright 2014 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/**
 * @typedef {Object.<string, function>} NeatComet.channels.ChannelsMap
 */

/**
 * @class NeatComet.channels.BaseChannelServer
 * @extends NeatComet.Object
 */
var self = NeatComet.channels.BaseChannelServer = NeatComet.Object.extend(/** @lends NeatComet.channels.BaseChannelServer.prototype */{

    /** @type {NeatComet.bindings.BindingServer} */
    binding: null,

    /**
     * Do not port this in other languages
     * @param {NeatComet.router.OpenedProfileServer} openedProfile
     */
    openProfile: function(openedProfile) {
        throw new NeatComet.Exception('Abstract method call');
    },

    init: function() {

    },

    /**
     * Do not port this in other languages
     * @param {NeatComet.router.OpenedProfileServer} openedProfile
     */
    updateChannels: function(openedProfile) {
        throw new NeatComet.Exception('Abstract method call');
    },

    /**
     * @param {NeatComet.router.OpenedProfileServer} openedProfile
     * @param {Array} message
     */
    push: function(openedProfile, message) {
        throw new NeatComet.Exception('Abstract method call');
    }

}, /** @lends NeatComet.channels.BaseChannelServer */{

    /**
     * @param {string} routeMode
     * @returns {NeatComet.channels.BaseChannelServer}
     */
    create: function(routeMode) {

        switch (routeMode) {
            case null: // Direct is default
            case 'direct': return new NeatComet.channels.DirectChannelServer;
            case 'merged': return new NeatComet.channels.DirectChannelServer;
            default: throw new NeatComet.Exception('Unknown routeMode: ' + routeMode);
        }
    }
});
