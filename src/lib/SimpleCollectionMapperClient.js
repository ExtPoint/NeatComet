/**
 * @copyright Copyright 2014 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/**
 * @class NeatComet.SimpleCollectionMapperClient
 * @extends NeatComet.Object
 */
NeatComet.SimpleCollectionMapperClient = NeatComet.Object.extend(/** @lends NeatComet.SimpleCollectionMapperClient.prototype */{

    /** @type {function} */
    createCollection: null,

    /** @type {object} */
    data: {},

    /**
     * @param {string} profileId
     * @param {string} bindingId
     * @returns {object}
     */
    get: function(profileId, bindingId) {

        var ns = (this.data[profileId] || (this.data[profileId] = {}));

        if (!ns[bindingId]) {
            ns[bindingId] = this.createCollection(profileId, bindingId);
        }

        return ns[bindingId];
    }

});
