/**
 * @copyright Copyright 2014 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/**
 * @class NeatComet.router.OpenedProfileClient
 * @extends NeatComet.Object
 */
NeatComet.router.OpenedProfileClient = NeatComet.Object.extend(/** @lends NeatComet.router.OpenedProfileServer.prototype */{

    /** @type {Number} */
    id: null,

    /** @type {String} */
    profileId: null,

    /** @type {NeatComet.NeatCometClient~createCollection} */
    createCollection: null,

    /** @type {Object.<string, Object.<string, *>>} */
    profileDefinition: null,

    /** @type {Object.<string, NeatComet.api.ICollectionClient>} */
    collections: null,

    /** @type {NeatComet.NeatCometClient} */
    client: null,

    init: function() {
        this.collections = {};
    },

    getCollection: function(bindingId) {

        // Lazy init
        if (!_.has(this.collections, bindingId)) {
            
            if (!_.has(this.profileDefinition, bindingId)) {
                throw new NeatComet.Exception('Wrong bindingId ' + bindingId);
            }

            this.collections[bindingId] = this.createCollection(
                this.profileId,
                bindingId,
                this.profileDefinition[bindingId],
                this
            );
        }

        return this.collections[bindingId];
    },

    close: function () {
        this.client.closeProfile(this.id, this.profileId);

        // TODO: Dispose cyclic references, if possible
        this.collections = null;

        this.client = null;
    },

    updateParams: function (params) {
        this.client.refreshProfile(this.id, params);
    },

    /**
     * @param {Object} target
     */
    populateNamespace: function(target) {

        _.each(this.profileDefinition, function (params, bindingId) {
            target[bindingId] = this.getCollection(bindingId).getNative();
        }, this);
    }

});
