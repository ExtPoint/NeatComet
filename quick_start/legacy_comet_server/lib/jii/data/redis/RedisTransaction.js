/**
 * @copyright Copyright 2013 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://www.affka.ru">Vladimir Kozhin</a>
 * @license MIT
 */
(function () {

	/**
	 * @class Jii.data.redis.RedisTransaction
	 * @extends Jii.base.Object
	 */
	var self = Joints.defineClass('Jii.data.redis.RedisTransaction', Jii.base.Object, {

		/**
		 * @type {Jii.components.Redis}
		 */
		_engine: null,

		/**
		 * @type {string[]}
		 */
		_commands: null,

		/**
		 * @type {boolean}
		 */
		writeLog: true,

		/**
		 *
		 * @param {Jii.components.Redis} engine
		 */
		constructor: function(engine) {
			this._engine = engine;
			this._commands = [];
		},

		addCommand: function(method, attributes) {
			var deferred = new Joints.Deferred();
			this._commands.push([method, attributes, deferred]);
			return deferred;
		},

		commit: function() {
			var deferred = new Joints.Deferred();

			// Fast quit
			if (this._commands.length == 0) {
				deferred.resolve(true);
				return deferred;
			}

			// Clean queue
			var commands = this._commands;
			this._commands = [];

			// Encode to send
			var multiArray = [];
			_.each(commands, function(params) {
				multiArray.push(
					[
						params[0]
					].concat(
						_.isArray(params[1]) ?
							params[1] : // Array is Redis command
							Jii.data.redis.Command.decode(params[0], params[1]) // Hash is Jii command
					)
				);
			});

			// Exec
			this._engine.multi(multiArray).exec(function (err, replies) {
				if (err && this.writeLog) {
					Jii.app.logger.error('Redis error: ' + err + ', multi requests: ' + multiArray.join('\n'));
				}

				// Write log
				var logMessage = ['Redis transaction:'];
				_.each(multiArray, function(commandLine, i) {
					logMessage.push('\t' + commandLine.join(' ') + ' = ' + replies[i])
				});
				Jii.app.logger.debug(logMessage.join('\n'));

				// Call callbacks
				var deferreds = _.map(commands, function(params, i) {
					return params[2].resolve(replies[i]);
				});

				Joints.when.apply(this, deferreds).then(function() {
					deferred.resolve(!err && _.indexOf(arguments, false) === -1);
				}.bind(this));
			}.bind(this));
			return deferred;
		},

		rollback: function() {
			this._commands = [];
		}

	});

})();