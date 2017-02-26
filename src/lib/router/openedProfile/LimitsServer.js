/**
 * @copyright Copyright 2014-2017 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/**
 * @class NeatComet.router.OpenedProfileServer
 * @extends NeatComet.Object
 */
var self = NeatComet.router.openedProfile.LimitsServer = NeatComet.Object.extend(/** @lends NeatComet.router.openedProfile.LimitsServer.prototype */{

    /** @type {Object.<string, Array.<string|number|null>>} */
    _active: null,
    
    constructor: function() {
        this._active = {};
    },

    /**
     * @param {string} bindingId
     * @param {string|number|null} lowValue
     * @param {string|number|null} highValue
     */
    update: function (bindingId, lowValue, highValue) {

        if (lowValue === null && highValue === null) {
            delete this._active[bindingId];
        }
        else {
            this._active[bindingId] = [lowValue, highValue];
        }
    },

    /**
     * @param {NeatComet.bindings.BindingServer} binding
     * @param {Object.<string, *>} requestParams
     * @param {Array} records
     */
    extractAndUpdate: function (binding, requestParams, records) {

        var lowValue = null;
        var closeLowValue = binding.limitOrder[1] == 'DESC' || _.isArray(requestParams[binding.limitParam]);
        var highValue = null;
        var closeHighValue = binding.limitOrder[1] != 'DESC' || _.isArray(requestParams[binding.limitParam]);
        var orderAttribute = binding.limitOrder[0];
        _.each(records, function (record) {
            if (closeLowValue && (lowValue === null || record[orderAttribute] < lowValue)) {
                lowValue = record[orderAttribute];
            }
            if (closeHighValue && (highValue === null || record[orderAttribute] > highValue)) {
                highValue = record[orderAttribute];
            }
        }, this);

        this.update(binding.id, lowValue, highValue);
    },

    /**
     * @param {NeatComet.bindings.BindingServer} binding
     * @param {object} record
     * @return {boolean}
     */
    matchRecord: function (binding, record) {
        return this.match(binding.id, record[binding.limitOrder[0]])
    },

    /**
     *
     * @param {string} bingingId
     * @param {string|number} value
     * @return {boolean}
     */
    match: function (bingingId, value) {
        var limit = this._active[bingingId];
        return !limit
            || (
                (limit[0] === null || limit[0] <= value)
                && (limit[1] === null || limit[1] >= value)
            );
    },

    /**
     * @param {string} bindingId
     * @return {Object.<string, Array.<string|number|null>>}
     */
    getRange: function (bindingId) {
        return this._active[bindingId] || [null, null];
    }
});
