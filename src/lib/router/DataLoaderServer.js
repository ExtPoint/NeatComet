/**
 * @copyright Copyright 2014 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */
var when = require('when');

/**
 * @class NeatComet.router.DataLoaderServer
 *
 * @param {Object.<string, Array>} requestParams
 * @param {?function} [externalDataLoader]
 * @returns {NeatComet.router.DataLoaderServer}
 */
NeatComet.router.DataLoaderServer = function(requestParams, externalDataLoader) {

    this._batchParams = [];
    this._promises = [];
    this.associations = [];
};

NeatComet.router.DataLoaderServer.prototype = {

    /** @type {NeatComet.NeatCometServer} */
    neatComet: null,

    /** @type {string} */
    profile: null,

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
        if (!this.neatComet.externalDataLoader) {
            this._promises.push(this.neatComet.profileBindings[this.profile][bindingId].loadDataLocally(params));
        }
        // Or prepare external
        else {
            this._batchParams.push([this.profile, bindingId, params]);
        }

        // Save association
        this.associations.push(association);
    },

    /**
     * @returns {Promise}
     */
    load: function() {

        // External
        if (this.neatComet.externalDataLoader) {
            return this.neatComet.externalDataLoader(this._batchParams);
        }

        // Local
        else {
            return when.all(this._promises);
        }
    }
};
