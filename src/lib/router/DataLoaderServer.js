/**
 * @copyright Copyright 2014 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */
var when = require('when');

/**
 * @class NeatComet.router.DataLoaderServer
 * @extends NeatComet.Object
 *
 * @param {Object.<string, Array>} requestParams
 * @param {?function} [externalDataLoader]
 * @returns {NeatComet.router.DataLoaderServer}
 */
var self = NeatComet.router.DataLoaderServer = NeatComet.Object.extend(/** @lends NeatComet.router.DataLoaderServer.prototype */ {

    init: function() {

        this._batchParams = [];
        this._promises = [];
        this.associations = [];
    },

    /** @type {NeatComet.NeatCometServer} */
    manager: null,

    /** @type {string} */
    profileId: null,

    /** @type {Array} */
    _batchParams: null,

    /** @type {Promise[]} */
    _promises: null,

    /** @type {*[]} */
    associations: null,

    /**
     * @param {string} bindingId
     * @param {Object} params
     * @param {*} [association]
     */
    addParams: function(bindingId, params, association) {

        // Start local query immediately
        if (!this.manager.externalDataLoader) {
            this._promises.push(this.manager.profileBindings[this.profileId][bindingId].loadDataLocally(params));
        }
        // Or prepare external
        else {
            this._batchParams.push([this.profileId, bindingId, params]);
        }

        // Save association
        this.associations.push(association);
    },

    /**
     * @returns {Promise}
     */
    load: function() {

        // External
        if (this.manager.externalDataLoader) {
            return this.manager.externalDataLoader(this._batchParams);
        }

        // Local
        else {
            return when.all(this._promises);
        }
    }
});
