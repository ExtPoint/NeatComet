/**
 * @copyright Copyright 2014 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://www.affka.ru">Vladimir Kozhin</a>
 * @license MIT
 */
(function () {

	/**
	 * @class Jii.data.redis.RedisOptimisticLock
	 * @extends Jii.base.Object
	 */
	var self = Joints.defineClass('Jii.data.redis.RedisOptimisticLock', Jii.base.Object, {

		/**
		 * @type {Jii.components.Redis}
		 */
		engine: null,

		/**
		 * @type {string}
		 */
		lockKey: null,

		/**
		 * @type {number}
		 */
		_tryCount: 0,

		/**
		 *
		 */
		lock: function() {
			return this._waitAndLock().then(function() {

				return this.engine.createCommand('expire', {
					key: this.lockKey,
					seconds: this.static.EXPIRE_TIME
				}).execute();
			}.bind(this));
		},

		unlock: function() {
			return this.engine.createCommand('del', {
				key: this.lockKey
			}).execute();
		},

		/**
		 *
		 */
		_waitAndLock: function() {
			if (this._tryCount >= this.static.MAX_TRY_COUNT) {
				return false;
			}
			this._tryCount++;

			return this.engine.createCommand('getset', {
				key: this.lockKey,
				value: ''
			}).execute().then(function(reply) {
				if (reply === null) {
					return this._delay().then(function() {
						return this._waitAndLock();
					}.bind(this));
				}

				return true;
			}.bind(this));
		},

		_delay: function() {
			var deferred = new Joints.Deferred();
			setTimeout(function() {
				deferred.resolve();
			}, this.static.DELAY_TIME_MS);
			return deferred;
		}

	}, {

		EXPIRE_TIME: 3, // Need < delay * max count
		DELAY_TIME_MS: 200,
		MAX_TRY_COUNT: 20

	});

})();