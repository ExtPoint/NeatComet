/**
 * @callback NeatComet.NeatCometClient~getCollection
 * @param {string} profileId
 * @param {string} bindingId
 * @param {*} clientParams
 * @param {NeatComet.router.OpenedProfileClient} openedProfile
 * @returns {NeatComet.api.ICollectionClient}
 */

/**
 * @class NeatComet.NeatCometClient
 * @extends NeatComet.Object
 */
NeatComet.NeatCometClient = NeatComet.Object.extend(/** @lends NeatComet.NeatCometClient.prototype */{

    /** @type {NeatComet.api.ICometClient} */
    comet: null,

    /** @type {NeatComet.NeatCometClient~getCollection} */
    getCollection: null,

    /** @type {Object.<string, Object.<string, *>>} */
    clientParams: null,

    /** @type {Object} */
    _openedProfileParams: null,

    /** @type {Object.<number, NeatComet.router.OpenedProfileClient>} */
    _openedProfiles: null,

    /** @type {Object.<string, NeatComet.router.OpenedProfileClient[]>} */
    _openedProfilesByProfileId: null,

    /** @type {NeatComet.SafeChannelClient} */
    _channel: null,

    /** @type {number} */
    _lastId: 0,

    init: function() {

        this._openedProfileParams = [];
        this._openedProfiles = {};
        this._openedProfilesByProfileId = {};

        // Setup channel
        this._channel = new NeatComet.SafeChannelClient({
            comet: this.comet,
            onConnectionRestore: _.bind(this.refresh, this),
            onInit: _.bind(this._onRefreshResponse, this),
            onMessage: _.bind(this._onChannelMessage, this)
        });
    },

    refresh: function() {

        // Call server
        if (this._openedProfileParams.length) {
            this._channel.sendOpen(this._openedProfileParams);
        }
    },

    openProfile: function(profileId, params) {

        var openedProfileId = ++this._lastId;

        this._openedProfileParams.push([openedProfileId, profileId, params]);

        // Init openedProfile
        var openedProfile = new NeatComet.router.OpenedProfileClient();
        openedProfile.id = openedProfileId;
        openedProfile.profileId = profileId;
        openedProfile.manager = this;
        openedProfile.init();
        this._openedProfiles[openedProfileId] = openedProfile;

        if (!this._openedProfilesByProfileId[profileId]) {
            this._openedProfilesByProfileId[profileId] = [];
        }
        this._openedProfilesByProfileId[profileId].push(openedProfile);

        // Connect
        // TODO: optimize
        if (this._channel && this._channel.isReady) {
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

    _onRefreshResponse: function(profileData) {

        // Setup enabled bindings
        _.each(profileData, function(profileBindings, profileId) {

            _.each(profileBindings, function(bindingId_data) {

                var bindingId = bindingId_data[0];

                _.each(this._openedProfilesByProfileId[profileId], function(openedProfile) {

                    // Init call
                    openedProfile.getCollection(bindingId).reset(bindingId_data[1]);
                }, this);

            }, this);

        }, this);
    },

    _onChannelMessage: function(channel, data) {

        var regs = channel.match(/^([^:]+):([^:]+)(:.+)?/);
        this._callCollections(regs[1], regs[2], data);
    },

    _callCollections: function(profileRef, bindingId, args) {

        var command = args[0];
        args = args.slice(1);

        function callCollection(openedProfile) {
            var collection = openedProfile.getCollection(bindingId);
            collection[command].apply(collection, args);
        }

        if (profileRef.substr(0, 1) === '!') {
            callCollection(this._openedProfiles[profileRef.substr(1)]);
        }
        else {
            _.each(this._openedProfilesByProfileId[profileRef], callCollection);
        }
    }

});
