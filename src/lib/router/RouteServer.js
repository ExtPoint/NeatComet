/**
 * @copyright Copyright 2014-2017 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */
var when = require('when');

/**
 * @class NeatComet.router.RouteServer
 * @extends NeatComet.Object
 * @implements NeatComet.api.ICometServerEvents
 */
var self = NeatComet.router.RouteServer = NeatComet.Object.extend(/** @lends NeatComet.router.RouteServer.prototype */{

    /** @type {NeatComet.NeatCometServer} */
    manager: null,

    /** @type {Object.<string, NeatComet.router.ConnectionServer>} */
    _connections: null,

    init: function() {

        this._connections = {};
    },


    /**
     * @param {String} connectionId
     */
    onNewConnection: function(connectionId) {

        if (this._connections[connectionId]) {
            NeatComet.Exception.warning("Adding the connection with an already known id");
        }
        else {
            // Init
            var connection = new NeatComet.router.ConnectionServer;
            connection.connectionId = connectionId;
            connection.comet = this.manager.comet;
            connection.manager = this.manager;
            connection.init();

            // List
            this._connections[connectionId] = connection;

            // TODO: trigger external tracker
        }
    },

    /**
     * @param {String} connectionId
     */
    onLostConnection: function(connectionId) {

        if (!this._connections[connectionId]) {
            NeatComet.Exception.warning("Removing unknown connection");
        }
        else {
            this._connections[connectionId].destroy();
            delete this._connections[connectionId];

            // TODO: trigger external tracker
        }
    },

    /**
     * @param {String} connectionId
     * @param {*} requestParams
     * @returns {Promise} for response {*}
     */
    onOpenProfileCommand: function(connectionId, requestParams) {

        // Require connection
        if (!this._connections[connectionId]) {
            return when.reject(new NeatComet.Exception("OpenProfile on unknown connection " + connectionId));
        }

        // Map call
        return this._connections[connectionId].onOpenProfileCommand(requestParams);
    },

    /**
     * @param {String} connectionId
     * @param {String[]} ids
     * No response
     */
    onCloseProfileCommand: function(connectionId, ids) {

        // Require connection
        if (!this._connections[connectionId]) {
            NeatComet.Exception.warning("CloseProfile on unknown connection " + connectionId);
            return;
        }

        // Map call
        this._connections[connectionId].onCloseProfileCommand(ids);
    }

});
