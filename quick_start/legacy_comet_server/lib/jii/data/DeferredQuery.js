/**
 * @copyright Copyright 2013 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://www.affka.ru">Vladimir Kozhin</a>
 * @license MIT
 */

(function () {
    /**
     * @class Jii.data.DeferredQuery
     * @extends Jii.data.Query
     */
    var self = Joints.defineClass('Jii.data.DeferredQuery', Jii.data.Query, {

        _deferred: null,

        constructor: function(params) {
            _.extend(this, params);
            this._deferred = new Joints.Deferred();
        },

        /**
         * @param {Object} [connection]
         */
        one: function(connection) {
            this._multiple = false;
            return this._deferred;
        },

        /**
         * @param {Object} [connection]
         */
        all: function(connection) {
            this._multiple = true;
            return this._deferred;
        },

        resolve: function() {
            this._deferred.resolve.apply(this, arguments);
        },

        reject: function() {
            this._deferred.reject.apply(this, arguments);
        },

        then: function() {
            this._deferred.then.apply(this, arguments);
        }

    });

})();