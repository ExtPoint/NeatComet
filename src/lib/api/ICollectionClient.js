/**
 * @copyright Copyright 2014-2017 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/**
 * @callback NeatComet.api.ICollectionClient~callAction
 * @param {Object[]} models
 * @param {string} action
 * @param {Array} params
 */

/**
 * @namespace NeatComet.api
 * @interface NeatComet.api.ICollectionClient
 */
NeatComet.api.ICollectionClient = function() {};

NeatComet.api.ICollectionClient.prototype = {

    /**
     * Get native collection for OpenedProfileClient.populateNamespace()
     * @returns {object}
     */
    getNative: function() {

    },

    /**
     * Set exact list of records
     * @param {object[]} list
     */
    reset: function(list) {

    },

    /**
     * Add record
     * @param {object} attributes
     */
    add: function(attributes) {

    },

    /**
     * Update record by oldAttributes
     * @param {object} newAttributes
     * @param {object} oldAttributes
     */
    update: function(newAttributes, oldAttributes) {

    },

    /**
     * Remove record by attributes
     * @param {object} oldAttributes
     */
    remove: function(oldAttributes) {

    },

    /**
     * Dispatch client action call
     * @param {object} attributes
     * @param {string} action
     * @param {Array} params
     */
    action: function(attributes, action, params) {

    }
};
