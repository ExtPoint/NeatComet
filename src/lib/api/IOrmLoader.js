/**
 * @copyright Copyright 2014-2017 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/**
 * @namespace NeatComet.api
 * @interface NeatComet.api.IOrmLoader
 */
NeatComet.api.IOrmLoader = function() {};

NeatComet.api.IOrmLoader.TABLE_ALIAS_IN_SQL = 'model';
NeatComet.api.IOrmLoader.WHERE_NONE = 'none';
NeatComet.api.IOrmLoader.WHERE_JS = 'js';
NeatComet.api.IOrmLoader.WHERE_SQL = 'sql';

NeatComet.api.IOrmLoader.prototype = {

    /**
     * @param {string|function} modelClass
     * @param {object|null} match
     * @param {string} whereType
     * @param {string|null} where
     * @param {string[]} attributes
     * @param {NeatComet.bindings.BindingServer} binding
     * @param {number[]|number|null} limit
     * @returns {Promise} Array of records data
     */
    loadRecords: function(modelClass, match, whereType, where, attributes, binding, limit) {
    }

};
