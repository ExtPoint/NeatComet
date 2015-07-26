/**
 * @copyright Copyright 2014 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/**
 * @typedef {Object.<string, function>} NeatComet.channels.ChannelsMap
 */

/**
 * @typedef {object} NeatComet.channels.FiltersList
 * @property {boolean} hasJs
 * @property {NeatComet.channels.ChannelsMap} channels
 */

/**
 * @class NeatComet.channels.BaseChannelServer
 * @extends Joints.Object
 */
var self = Joints.defineClass('NeatComet.channels.BaseChannelServer', Joints.Object, /** @lends NeatComet.channels.BaseChannelServer.prototype */{

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
     * @param {NeatComet.router.OpenedProfileServer} openedProfile
     * @param {Array} message
     */
    push: function(openedProfile, message) {
        throw new NeatComet.Exception('Abstract method call');
    }

}, {

    /**
     *
     * @param {string} routeMode
     * @return {NeatComet.channels.BaseChannelServer}
     */
    create: function(routeMode) {

        switch (routeMode) {
            case null: // Direct is default
            case 'direct': return new NeatComet.channels.DirectChannelServer();
            case 'merged': return new NeatComet.channels.DirectChannelServer();
            default: throw new NeatComet.Exception('Unknown routeMode: ' . $routeMode);
        }
    }
});
