/**
 * @copyright Copyright 2014-2017 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/**
 * @callback NeatComet.NeatCometClient~createCollection
 * @param {string} profileId
 * @param {string} bindingId
 * @param {*} profilesDefinition
 * @param {NeatComet.router.OpenedProfileClient} openedProfile
 * @returns {NeatComet.api.ICollectionClient}
 */

/**
 * @callback NeatComet.NeatCometClient~callCollection
 * @param {NeatComet.api.ICollectionClient} collection
 * @param {string} method
 * @param {...*} param1
 */

/**
 * @class NeatComet.NeatCometClient
 * @extends NeatComet.Object
 */
NeatComet.NeatCometClient = NeatComet.Object.extend(/** @lends NeatComet.NeatCometClient.prototype */{

    /** @type {NeatComet.api.ICometClient} */
    comet: null,

    /** @type {NeatComet.NeatCometClient~createCollection} */
    createCollection: null,

    /** @type {NeatComet.NeatCometClient~callCollection} */
    callCollection: null,

    /** @type {Object.<string, Object.<string, *>>} */
    profilesDefinition: null,

    /** @type {Object} */
    _openedProfileParams: null,

    /** @type {Object.<number, NeatComet.router.OpenedProfileClient>} */
    _openedProfiles: null,

    /** @type {Object.<string, NeatComet.router.OpenedProfileClient[]>} */
    _openedProfilesByProfileId: null,

    /** @type {NeatComet.router.ConnectionClient} */
    _connection: null,

    /** @type {number} */
    _lastId: 0,

    init: function() {

        this._openedProfileParams = [];
        this._openedProfiles = {};
        this._openedProfilesByProfileId = {};
        this.callCollection = this.callCollection || this._callCollection.bind(this);

        // Setup channel
        this._connection = new NeatComet.router.ConnectionClient({
            comet: this.comet,
            onConnectionRestore: _.bind(this.refresh, this),
            onInit: _.bind(this._onRefreshResponse, this),
            onMessage: _.bind(this._onChannelMessage, this)
        });
    },

    refresh: function() {

        // Call server
        if (this._openedProfileParams.length) {
            this._connection.sendOpen(this._openedProfileParams);
        }
    },

    /**
     *
     * @param {string} profileId
     * @param {object} [params]
     * @returns {NeatComet.router.OpenedProfileClient}
     */
    openProfile: function(profileId, params) {

        var openedProfileId = ++this._lastId;

        this._openedProfileParams.push([openedProfileId, profileId, params || {}]);

        // Init openedProfile
        var openedProfile = new NeatComet.router.OpenedProfileClient();
        openedProfile.id = openedProfileId;
        openedProfile.profileId = profileId;
        openedProfile.createCollection = this.createCollection || /* legacy */ this.getCollection;
        openedProfile.profileDefinition = this.profilesDefinition[profileId];
        openedProfile.client = this;
        openedProfile.init();
        this._openedProfiles[openedProfileId] = openedProfile;

        if (!this._openedProfilesByProfileId[profileId]) {
            this._openedProfilesByProfileId[profileId] = [];
        }
        this._openedProfilesByProfileId[profileId].push(openedProfile);

        // Connect
        // TODO: optimize
        if (this._connection && this._connection.isReady) {
            this.refresh();
        }

        return openedProfile;
    },

    /**
     * @param profiles
     * @param callback
     * @deprecated
     */
    open: function(profiles, callback) {

        // Mark
        _.each(profiles, function(params, profileId) {

            var openedProfile = this.openProfile(profileId, params);

            if (callback) {
                callback(openedProfile, openedProfile.profileId, openedProfile.id);
            }

        }, this);
    },

    closeProfile: function(openedProfileId, profileId) {

        // Clear references
        this._openedProfileParams = _.filter(this._openedProfileParams, function (command) {
            return command[0] !== openedProfileId;
        });

        delete this._openedProfiles[openedProfileId];

        this._openedProfilesByProfileId[profileId] = _.filter(this._openedProfilesByProfileId[profileId], function (command) {
            return command[0] !== openedProfileId;
        });
        if (!this._openedProfilesByProfileId[profileId].length) {
            delete this._openedProfilesByProfileId[profileId];
        }

        // Close server side
        this._connection.sendClose([openedProfileId]);
    },

    refreshProfile: function (openedProfileId, params) {

        // Send partial refresh
        this._connection.sendOpen(
            _.filter(this._openedProfileParams, function (command) {
                if (command[0] === openedProfileId) {

                    // Update params
                    command[2] = params;

                    return true;
                }
                return false;
            })
        );
    },

    _onRefreshResponse: function(profileData) {

        // Setup enabled bindings
        _.each(profileData, function(profileBindings, profileId) {

            _.each(profileBindings, function(bindingId_data) {

                var bindingId = bindingId_data[0];

                _.each(this._openedProfilesByProfileId[profileId], function(openedProfile) {

                    // Init call
                    var collection = openedProfile.getCollection(bindingId);
                    this.callCollection.call(null, collection, 'reset', bindingId_data[1]);
                }, this);

            }, this);

        }, this);
    },

    _onChannelMessage: function(channel, data) {

        var regs = channel.match(/^([^:]+):([^:]+)(:.+)?/);
        this._callCollections(regs[1], regs[2], data);
    },

    _callCollections: function(profileRef, bindingId, args) {
        var callCollection = function (openedProfile) {
            var collection = openedProfile.getCollection(bindingId);
            this.callCollection.apply(null, [collection].concat(args));
        }.bind(this);

        if (profileRef.substr(0, 1) === '!') {
            callCollection(this._openedProfiles[profileRef.substr(1)]);
        }
        else {
            _.each(this._openedProfilesByProfileId[profileRef], callCollection);
        }
    },

    /**
     * @param {NeatComet.api.ICollectionClient} collection
     * @param {string} method
     * @param {...*} param1
     * @protected
     */
    _callCollection: function(collection, method, param1) {
        collection[method].apply(collection, _.toArray(arguments).slice(2));
    }

});
