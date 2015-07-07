/**
 * @copyright Copyright 2014 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */
var when = require('when');

/**
 * @class NeatComet.router.ConnectionServer
 * @extends Joints.Object
 */
var self = Joints.defineClass('NeatComet.router.ConnectionServer', Joints.Object, /** @lends NeatComet.router.ConnectionServer.prototype */{

    /** @type {string} */
    connectionId: null,

    /** @type {NeatComet.api.ICometServer} */
    comet: null,

    /** @type {NeatComet.NeatCometServer} */
    server: null,

    /** @type {Object.<string, NeatComet.router.OpenedProfileServer>} */
    _openedProfiles: null,

    /** @type {number} */
    _lastId: 0,

    constructor: function(connectionId) {

        this.connectionId = connectionId;
        this._openedProfiles = {};
    },

    destroy: function() {

        _.each(this._openedProfiles, function(openedProfile) {
            openedProfile.destroy();
        });

        this._openedProfiles = null;
    },


    /**
     * @param {*} requestParams
     * @return {Promise} for response {*}
     */
    onOpenProfileCommand: function(requestParams) {

        var promises = [];
        var openedProfiles = [];

        // Open each profile
        _.each(requestParams, function(profileRequestParams, profile) {

            // Get binding
            var profileBindings = this.server.profileBindings[profile];
            if (!profileBindings) {
                throw new NeatComet.Exception('Wrong profile requested');
            }

            // Track opened profile
            var openedProfile = this._addOpenedProfile(profile, profileRequestParams);
            var result = openedProfile.open();

            if (result !== null) {
                promises.push(result);
                openedProfiles.push(openedProfile);
            }

        }, this);

        // Load and format client response
        return when.all(promises)
            .then(this._formatInitResponse.bind(this, openedProfiles));
    },

    /**
     * @param {NeatComet.router.OpenedProfileServer[]} openedProfiles
     * @param {Array} data
     * @return {Object}
     * @private
     */
    _formatInitResponse: function(openedProfiles, data) {

        var result = {};

        _.each(openedProfiles,

            /**
             * @param {NeatComet.router.OpenedProfileServer} openedProfile
             * @param {Number} index
             */
            function(openedProfile, index) {

                var profile = openedProfile.profile;
                if (!result[profile]) {
                    result[profile] = [];
                }

                _.each(data[index], function(bindingData, bindingId) {

                    // Client init command
                    result[profile].push([
                        bindingId,
                        openedProfile.bindings[bindingId].client,
                        bindingData
                    ]);

                }, this);
            },
            this
        );

        return result;
    },

    /**
     * @param {String[]} ids
     * No response
     */
    onCloseProfileCommand: function(ids) {

        _.each(ids, function(id) {
            if (this._openedProfiles[id]) {
                this._openedProfiles[id].destroy();
            }
        }, this);
    },

    /**
     * @param {string} profile
     * @param {Object.<string, *>} requestParams
     * @returns {NeatComet.router.OpenedProfileServer}
     */
    _addOpenedProfile: function(profile, requestParams) {

        // Create
        var openedProfile = new NeatComet.router.OpenedProfileServer;
        openedProfile.id = ++this._lastId;
        openedProfile.profile = profile;
        openedProfile.connection = this;
        openedProfile.requestParams = requestParams;
        openedProfile.init();

        // Register
        this._openedProfiles[openedProfile.id] = openedProfile;

        return openedProfile;
    },

    removeOpenedProfile: function(id) {

        // Check API sanity
        if (this._openedProfiles[id].profile) {
            throw new NeatComet.Exception("Call OpenedProfileServer.destroy() to close profile");
        }

        // Release main reference
        delete this._openedProfiles[id];
    }

});
