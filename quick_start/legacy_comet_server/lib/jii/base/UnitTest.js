/**
 * @copyright Copyright 2013 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://www.affka.ru">Vladimir Kozhin</a>
 * @license MIT
 */

/**
 * @class Jii.base.UnitTest
 * @extends Jii.base.Object
 */
var self = Joints.defineClass('Jii.base.UnitTest', Jii.base.Object, {

    setUp: function (callback) {
        if (process.env.NODE_ENV === 'production') {
            throw new Jii.exceptions.ApplicationException('Do not run unit tests in production!');
        }

	    if (Jii.app.db && !Jii.app.db.isConnected()) {
		    Jii.app.db.connect();
	    }

        // Remove all data from redis
        if (Jii.app.redis) {
	        if (Jii.app.redis.stream === null) {
		        Jii.app.redis.init();
	        }
            Jii.app.redis.flushall(function() {
                callback();
            });
        } else {
            callback();
        }
    },

	tearDown: function(callback) {
		// @todo Move code to redis component. End connection after test and reconnect in setUp
		Jii.app.redis && Jii.app.redis.end();
		Jii.app.redis.stream = null;

		Jii.app.db && Jii.app.db.close();
		Jii.app.comet && Jii.app.comet.end();

		callback();
	},

    exports: function() {
        // Base functions
        var result = {
            setUp: this.setUp,
            tearDown: this.tearDown
        };

        // Append test functions
        for (var key in this) {
            if (_.isFunction(this[key]) && key.substr(-4, 4) === 'Test') {
                result[key] = _.bind(this[key], this);
            }
        }

        return result;
    }

}, {

    /**
     *
     * @param time In seconds
     * @returns {Joints.Deferred}
     */
    waitDeferred: function(time) {
        var deferred = new Joints.Deferred();

        setTimeout(function() {
            deferred.resolve();
        }, time * 1000);

        return deferred.promise();
    }
});
