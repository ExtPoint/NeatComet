/**
 * @copyright Copyright 2013 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://www.affka.ru">Vladimir Kozhin</a>
 * @license MIT
 */

/**
 * @class Jii.data.redis.RedisModel
 * @extends Jii.data.DataModel
 */
Joints.defineClass('Jii.data.redis.RedisModel', Jii.data.DataModel, {

	_index: null,

	/**
	 * @type {Jii.data.redis.RedisTransaction}
	 */
	_transaction: null,

	indexes: {},

	schema: function () {
		return {};
	},

	getIndex: function () {
		return this._index;
	},

	getTransaction: function () {

		// Create on demand
		if (!this._transaction) {
			this._transaction = new Jii.data.redis.RedisTransaction(this.static.getRedis());
		}

		return this._transaction;
	},

	_updateIndexes: function() {
		this._eachIndex(this.getAttributes(), function(key, value) {

			this.getTransaction().createCommand('sadd', {
				key: key,
				member: value
			}).execute();
		});
	},

	_deleteIndexes: function(previousAttributes) {
		this._eachIndex(previousAttributes, function(key, member) {

			this.getTransaction().createCommand('srem', {
				key: key,
				member: member
			}).execute();
		});
	},

	_eachIndex: function(data, fn) {

		// Get pk
		var pk = this.getPrimaryKey();
		if (!pk) {

			if (!_.isEmpty(this.indexes)) {
				Jii.app.log.error("Indexes are defined on a model with no primary key");
			}

			return;
		}

		// Group indexes at the end of Redis admin
		var prefix = 'zzz:' + this.debugClassName + ':'; // TODO: Decide what is the ID

		// Iterate
		_.each(this.indexes, function(index) {
			fn(prefix + index.keyFromData(data), pk);
		});
	},

	_saveInternal: function () {
		var schema = this.static.getSchema();
		var schemaKey = schema.getKey(this.getAttributes());

		// Fill query params
		switch (schema.getFormat()) {
			case Jii.data.redis.CollectionSchema.FORMAT_STRING:
				this.getTransaction().addCommand('set', {
					key: schemaKey,
					value: JSON.stringify(this.getAttributes())
				}).then(function (reply) {
					return reply === 'OK'
				});
				break;

			case Jii.data.redis.CollectionSchema.FORMAT_HASHES:
				this.getTransaction().addCommand('hset', {
					key: schemaKey,
					field: this.getPrimaryKey(),
					value: JSON.stringify(this.getAttributes())
				}).then(function (reply) {
						return reply === 0 || reply === 1;
					});
				break;

			case Jii.data.redis.CollectionSchema.FORMAT_LISTS:
				this.getTransaction().addCommand('rpush', {
					key: schemaKey,
					value: JSON.stringify(this.getAttributes())
				}).then(function (reply) {
						this._index = reply;
						return reply !== null && reply > 0;
					}.bind(this));
				break;

			case Jii.data.redis.CollectionSchema.FORMAT_SETS:
				if (!this.isNewRecord()) {
					throw new Jii.exceptions.ApplicationException('Scheme format `SETS` supported only insert scenario.');
				}

				this.getTransaction().addCommand('sadd', {
					key: schemaKey,
					member: JSON.stringify(this.getAttributes())
				}).then(function (reply) {
						this._index = reply;
						return reply === 0 || reply === 1;
					}.bind(this));
				break;

			case Jii.data.redis.CollectionSchema.FORMAT_SORTED_SETS:
				if (!this.isNewRecord()) {
					throw new Jii.exceptions.ApplicationException('Scheme format `SORTED_SETS` supported only insert scenario.');
				}
				if (scheme.scoreAttribute === null) {
					throw new Jii.exceptions.ApplicationException('Param `scoreAttribute` must be set.');
				}

				this.getTransaction().addCommand('zadd', {
					key: schemaKey,
					score: this.get(scheme.scoreAttribute),
					member: JSON.stringify(this.getAttributes())
				}).then(function (reply) {
						this._index = reply;
						return reply === 0 || reply === 1;
					}.bind(this));
				break;

			default:
				throw new Jii.exceptions.ApplicationException('Format `' + schema.getFormat() + '` not supported in save() method.');
		}

		return this.getTransaction().commit();
	},

	_deleteInternal: function () {
		var schema = this.static.getSchema();
		var schemaKey = schema.getKey(this.getAttributes());

		// Fill query params
		switch (schema.getFormat()) {
			case Jii.data.redis.CollectionSchema.FORMAT_STRING:
				this.getTransaction().addCommand('del', {
					key: schemaKey
				}).then(function (reply) {
					return reply !== null;
				});
				break;

			case Jii.data.redis.CollectionSchema.FORMAT_HASHES:
				this.getTransaction().addCommand('hdel', {
					key: schemaKey,
					field: this.getPrimaryKey()
				}).then(function (reply) {
					return reply !== null;
				});
				break;

			case Jii.data.redis.CollectionSchema.FORMAT_LISTS:
				this.getTransaction().addCommand('lrem', {
					key: schemaKey,
					count: -1,
					value: JSON.stringify(this.getAttributes())
				}).then(function (reply) {
						return reply !== null;
					});
				break;

			case Jii.data.redis.CollectionSchema.FORMAT_SETS:
				this.getTransaction().addCommand('srem', {
					key: schemaKey,
					member: JSON.stringify(this.getAttributes())
				}).then(function (reply) {
						return reply !== null;
					});
				break;

			case Jii.data.redis.CollectionSchema.FORMAT_SORTED_SETS:
				this.getTransaction().addCommand('zrem', {
					key: schemaKey,
					member: JSON.stringify(this.getAttributes())
				}).then(function (reply) {
						return reply !== null;
					});
				break;

			default:
				throw new Jii.exceptions.ApplicationException('Format `' + schema.getFormat() + '` not supported in delete() method.');
		}

		return this.getTransaction().commit();
	}

}, {

	_schema: null,

	getRedis: function () {
		return Jii.app.redis;
	},

	createQuery: function () {
		return new Jii.data.redis.RedisQuery({
			modelClass: this
		});
	},

	/*createRelationQuery: function(config) {
	 return new Jii.data.redis.RedisQuery(config);
	 },*/

	findByPk: function (value) {
		return this.createQuery().findByPk(value);
	},

	/**
	 *
	 * @param {string|number|null} value
	 * @param {function} casCallback
	 */
	findByPkAndLock: function(value, casCallback) {
		var schema = this.getSchema();

		// Check correct schema
		if (!schema.isSupportedOptimisticLock()) {
			throw new Jii.exceptions.ApplicationException('Schema format `' + schema.getFormat() + '` not supported optimistic lock.');
		}

		var optimisticLock = new Jii.data.redis.RedisOptimisticLock({
			engine: this.getRedis(),
			lockKey: schema.getHashOptimisticLockKey(value)
		});

		return optimisticLock.lock().then(function() {
			return this.findByPk(value).one();
		}.bind(this)).then(function(model) {
			return casCallback(model);
		}).then(function() {
			return optimisticLock.unlock();
		});

	},

	/**
	 *
	 * @return {Jii.data.redis.Schema}
	 */
	getSchema: function () {
		if (this._schema === null) {
			this._schema = new Jii.data.redis.CollectionSchema(this.prototype.schema());
		}
		return this._schema;
	}

});
