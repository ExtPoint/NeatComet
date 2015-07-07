/**
 * @callback NeatComet.NeatCometClient~getCollection
 * @param {string} profile
 * @param {string} bindingId
 * @param {string} openedProfileId
 * @returns {NeatComet.api.ICollectionClient}
 */

/**
 * @class NeatComet.NeatCometClient
 * @extends Joints.Object
 */
Joints.defineClass('NeatComet.NeatCometClient', Joints.Object, /** @lends NeatComet.NeatCometClient.prototype */{

    /** @type {NeatComet.NeatCometClient~getCollection} */
    getCollection: null,

    /** @type {Object.<string, Object.<string, *>>} */
    profileBindings: null,

    /** @type {Object} */
    _openedProfileParams: null,

    /** @type {Object} */
    _openedProfiles: null,

    /** @type {NeatComet.SafeChannelClient} */
    _channel: null,

    /** @type {number} */
    _lastId: 0,

    constructor: function(options) {

        this._super();

        // Fast start
        if (options) {
            this.setup(options);
        }
    },

    /**
     *
     * @param {Object} options
     */
    setup: function(options) {

        this._openedProfileParams = {};
        this._openedProfiles = {};
        if (options.getCollection) {
            this.getCollection = options.getCollection;
        }

        // Setup channel
        this._channel = new NeatComet.SafeChannelClient({
            comet: options.comet,
            onConnectionRestore: _.bind(this.refresh, this),
            onInit: _.bind(this._onRefreshResponse, this),
            onMessage: _.bind(this._onChannelMessage, this)
        });
    },

    refresh: function() {

        // Call server
        if (!_.isEmpty(this._openedProfileParams)) {
            this._channel.sendOpen(this._openedProfileParams);
        }
    },

    open: function(profiles, callback) {

        // Mark
        _.each(profiles, function(profileParams, profileId) {

            this._openedProfileParams[profileId] = profileParams;

            var openedProfileId = ++this._lastId;

            // Init openedProfile
            this._openedProfiles[openedProfileId] = {
                id: openedProfileId,
                profile: profileId,
                collections: {}
            };
            if (this.profileBindings && this.profileBindings[profileId]) {
                _.each(this.profileBindings[profileId], function(clientParams, bindingId) {
                    this._openedProfiles[openedProfileId].collections[bindingId] =
                        this.getCollection(profileId, bindingId, openedProfileId, clientParams);
                }, this);
            }

            if (callback) {
                callback(this._openedProfiles[openedProfileId], profileId, openedProfileId);
            }

        }, this);

        // Connect
        if (this._channel && this._channel.isReady) {
            this.refresh();
        }
    },

    _onRefreshResponse: function(profileData) {

        // Setup enabled bindings
        _.each(profileData, function(profileBindings, profile) {

            _.each(profileBindings, function(bindingId_clientParams_data) {

                var bindingId = bindingId_clientParams_data[0];

                // TODO: tmp
                var openedProfile = this._openedProfiles[1];
                var collection = openedProfile.collections[bindingId];

                // Init collection, if not preloaded
                if (!collection) {
                    collection = this.getCollection(openedProfile.profile, bindingId,
                        openedProfile.id, bindingId_clientParams_data[1]);
                    openedProfile.collections[bindingId] = collection;
                }

                // Init call
                collection.reset(bindingId_clientParams_data[2]);

            }, this);

        }, this);
    },

    _onChannelMessage: function(channel, data) {

        var regs = channel.match(/^([^:]+):([^:]+)(:.+)?/);
        this._callCollections(regs[1], regs[2], data);
    },

    _callCollections: function(profile, bindingId, args) {

        // TODO: queue message, if collection is not ready

        var command = args[0];
        args = args.slice(1);

        function callCollection(openedProfile) {
            var collection = openedProfile.collections[bindingId];
            collection[command].apply(collection, args);
        }

        if (profile.substr(0, 1) === '!') {
            callCollection(this._openedProfiles[profile.substr(1)]);
        }
        else {
            // TODO: filter by profile
            _.each(this._openedProfiles, callCollection);
        }
    }

});
