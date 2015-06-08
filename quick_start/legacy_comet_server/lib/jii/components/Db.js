/**
 * @copyright Copyright 2013 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://www.affka.ru">Vladimir Kozhin</a>
 * @license MIT
 */

var mysql = require('mysql');

/**
 * @class Jii.components.Db
 * @extends Jii.base.Component
 */
var self = Joints.defineClass('Jii.components.Db', Jii.base.Component, {

    host: '127.0.0.1',
    port: '',
    username: '',
    password: '',
    database: '',
    timezone: 'local',

    _isConnected: false,
    _connection: null,

    init: function () {

    },

    /**
     * Connect to mysql server
     */
    connect: function () {
        if (this._isConnected) {
            return;
        }
	    this._isConnected = true;

        this._connection = mysql.createConnection({
            host: this.host,
            port: this.port,
            user: this.username,
            password: this.password,
            database: this.database,
            timezone: this.timezone,
            typeCast: this._typeCast
        });
        this._connection.on('error', this._onError.bind(this));
        this._connection.connect(function(error) {
	        if (error) {
		        Jii.app.logger.error('Database `%s` connection error:', this.host, error.message);
		        this._isConnected = false;
	        }
        }.bind(this));
    },

	isConnected: function() {
		return this._isConnected;
	},

	/**
	 * Closing a connection and creating a new one instead
	 * */
	replaceClientConnection: function () {
		this.close();
		this.connect();
	},

    /**
     * Close mysql connection
     */
    close: function () {
        if (this._isConnected && this._connection) {
            this._connection.end();
	        this._connection = null;
	        this._isConnected = false;
        }
    },

    /**
     * Execute INSERT, UPDATE and DELETE queries
     * @param {string} query
     * @param {array|*} [values]
     * @param {function} [callback]
     * @return {Joints.Deferred}
     */
    execute: function(query, values, callback) {
        return this._typeQuery('execute', query, values, callback);
    },

    /**
     * Get row by query
     * @param {string} query
     * @param {array|*} [values]
     * @param {function} [callback]
     * @return {Joints.Deferred}
     */
    queryRow: function(query, values, callback) {
        return this._typeQuery('row', query, values, callback);
    },

    /**
     * Get first value from first fined row
     * @param {string} query
     * @param {array|*} [values]
     * @param {function} [callback]
     * @return {Joints.Deferred}
     */
    queryScalar: function(query, values, callback) {
        return this._typeQuery('scalar', query, values, callback);
    },

    /**
     * Get row list
     * @param {string} query
     * @param {array|*} [values]
     * @param {function} [callback]
     * @return {Joints.Deferred}
     */
    queryAll: function (query, values, callback) {
        return this._typeQuery('all', query, values, callback);
    },

    /**
     * Default query method for node-mysql module
     * @param {string} query
     * @param {array|*} [values]
     * @param {function} [callback]
     */
    query: function (query, values, callback) {
        this.connect();
        this._connection.query.apply(this._connection, arguments);
    },

    _typeQuery: function(queryType, query, values, callback) {
        var deferred = new Joints.Deferred();

        if (_.isFunction(values)) {
            callback = values;
            values = [];
        }

        if (!_.isArray(values)) {
            values = [values];
        }

        callback = this._wrapCallback(callback, deferred, queryType);
        this.query(query, values, callback);

        return deferred.promise();
    },

    _wrapCallback: function(callback, deferred, returnValueType) {
        return function(err, rows) {
            if (err) {
                Jii.app.logger.error('Database `%s` query error: `%s`.', this.host, err);
                deferred.reject();
	            //this.replaceClientConnection();
                return;
            }

            var value = null;

            // Check return value format
            switch (returnValueType) {
                case 'execute':
                    // @todo
                    value = 1;
                    break;

                case 'all':
                    value = rows;
                    break;

                case 'row':
                    if (rows.length > 0) {
                        value = rows[0];
                    }
                    break;

                case 'scalar':
                    if (rows.length > 0) {
                        value = _.values(rows[0])[0] || null;
                    }
                    break;
            }

            if (_.isFunction(callback)) {
                callback.call(this._connection, value);
            }
            deferred.resolve(value);
        }.bind(this);
    },

    /**
     * Отключаем автоматическое преобразование типов
     * @returns {string}
     * @private
     */
    _typeCast: function (field, next) {
        return field.string();
    },

    /**
     * Error handling
     * @param error Error object
     * @private
     */
    _onError: function (error) {
	    Jii.app.logger.error('Database `%s` error handle:', this.host, error.message);

	    if (!error.fatal) {
		    return;
	    }

	    // In case of connection lost try to restore it
	    if (error.code === "PROTOCOL_CONNECTION_LOST") {
		    this.replaceClientConnection();
	    }
    }

});
