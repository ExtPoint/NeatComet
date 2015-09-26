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

    /** @type {NeatComet.NeatCometClient} */
    manager: null,

    /** @type {Object.<string, NeatComet.api.ICollectionClient>} */
    collections: null,

    init: function() {
        this.collections = {};
    },

    getCollection: function(bindingId) {

        // Lazy init
        if (!_.has(this.collections, bindingId)) {

            this.collections[bindingId] = this.manager.getCollection(
                this.profileId,
                bindingId,
                this.manager.clientParams && this.manager.clientParams[this.profileId]
                    && this.manager.clientParams[this.profileId][bindingId] || null,
                this
            );
        }

        return this.collections[bindingId];
    }

});
