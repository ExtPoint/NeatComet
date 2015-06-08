/**
 * @copyright Copyright 2013 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://www.affka.ru">Vladimir Kozhin</a>
 * @license MIT
 */

var redis = require('redis');

/**
 * @class Jii.components.comet.SocketIoCometServer
 * @extends Jii.components.comet.BaseCometServer
 */
var self = Joints.defineClass('Jii.components.comet.SocketIoCometServer', Jii.components.comet.BaseCometServer, {

    _bindEngine: function(httpServer) {
        this._server = require('socket.io')(httpServer);
        this._server.on('connection', this._addConnection.bind(this));

        // Init redis
        this._server.adapter(require('socket.io-redis')({ host: this.redisHost, port: this.redisPort}));
    },

    _getConnectionRequest: function(socket) {
        return {
            headers: socket.conn.request.headers,
            ip: socket.request.connection.remoteAddress,
            remotePort: socket.request.connection.remotePort
        };
    },

    _sendEngine: function(socket, message) {
        socket.emit([message]);
    },

    /**
     * Store client connection
     * @param {object} socket
     * @private
     */
    _addConnection: function (socket) {
        this._connections[socket.id] = socket;

        // Proxy all messages to redis hub
        socket.conn.on('data', function(event) {
            if (event.charAt(0) !== "2") {
                return;
            }

            var message = event.substr(3, event.length - 5);
            message = JSON.parse(message);
            //message = message.replace(/\\"/g, '"');
            this._onClientMessage(socket, message);
        }.bind(this));

        Jii.app.logger.debug('User connected (connection uid: `%s`).', socket.id);

        // Remove connection on close
        socket.on('disconnect', function () {
            this._removeConnection(socket);
            this.trigger('connection:close', socket.id);
        }.bind(this));

        this.trigger('connection:open', socket.id);
    }

});
