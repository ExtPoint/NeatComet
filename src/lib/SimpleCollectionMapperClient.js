/**
 * @copyright Copyright 2014 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/**
 * @class NeatComet.SimpleCollectionMapperClient
 * @extends Joints.Object
 */
Joints.defineClass('NeatComet.SimpleCollectionMapperClient', Joints.Object, {

    /** @type {function} */
    createCollection: null,

    /** @type {object} */
    data: {},

    constructor: function(options) {

        this._super();

        // Fast start
        if (options) {
            _.extend(this, options);
        }
    },

    /**
     * @param {string} profileId
     * @param {string} bindingId
     * @return {object}
     */
    get: function(profileId, bindingId) {

        var ns = (this.data[profileId] || (this.data[profileId] = {}));

        if (!ns[bindingId]) {
            ns[bindingId] = this.createCollection(profileId, bindingId);
        }

        return ns[bindingId];
    }

});
