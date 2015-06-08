/**
 * @copyright Copyright 2013 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://www.affka.ru">Vladimir Kozhin</a>
 * @license MIT
 */

// Only manual installed toobusy in OS
var toobusy = null;
try {
    //toobusy = require('toobusy');
} catch (e) {}

/**
 * @class Jii.components.comet.SockJsCometServer
 * @extends Jii.components.comet.BaseCometServer
 */
var self = Joints.defineClass('Jii.components.comet.SockJsCometServer', Jii.components.comet.BaseCometServer, {

    _toobusyCount: 0,

	_endConnections: function() {
		// Abort connections
		_.each(this._connections, function(connection) {
			connection.destroy();
		});
	},

    _initEngine: function() {
        this._server = require('sockjs').createServer({
            log: function(severity, message) {
	            severity = severity === 'error' ? 'error' : 'debug';
                Jii.app.logger.debug(severity, message);
            }
        });
    },

    _bindEngine: function(httpServer) {
        this._server.on('connection', this._addConnection.bind(this));
        this._server.installHandlers(httpServer, {prefix: this.urlPrefix});
    },

    _sendEngine: function(connection, message) {
        connection.write(message);
    },

    /**
     * Store client connection
     * @param {object} connection
     * @private
     */
    _addConnection: function (connection) {
        if (toobusy && toobusy()) {
            connection.close(503, 'Service is unavailable.');
            Jii.app.logger.warning('Toobusy detected! Count:', ++this._toobusyCount);
            return;
        }

        this._connections[connection.id] = connection;

        Jii.app.logger.debug('User connected (connection uid: `%s`).', connection.id);

        // Proxy all messages to redis hub
        connection.on('data', function (message) {
            this._onClientMessage(connection, message);
        }.bind(this));

        // Remove connection on close
        connection.on('close', function () {
            this._removeConnection(connection);
            this.trigger('connection:close', connection.id);
        }.bind(this));

        this.trigger('connection:open', connection.id);
    }

});
