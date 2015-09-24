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
        _.each(requestParams, function(profileParams) {

            var openedProfileId = profileParams[0];
            var profileId = profileParams[1];
            var profileRequestParams = profileParams[2];

            // Get binding
            var profileBindings = this.server.profileBindings[profileId];
            if (!profileBindings) {
                throw new NeatComet.Exception('Wrong profile requested');
            }

            // Track opened profile
            var openedProfile = this._addOpenedProfile(openedProfileId, profileId, profileRequestParams);
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
     * @param {Number} openedProfileId
     * @param {string} profileId
     * @param {Object.<string, *>} requestParams
     * @returns {NeatComet.router.OpenedProfileServer}
     */
    _addOpenedProfile: function(openedProfileId, profileId, requestParams) {

        if (this._openedProfiles[openedProfileId]) {
            throw new NeatComet.Exception('Collision in client request. Same openedProfileId twice');
        }

        // Create
        var openedProfile = new NeatComet.router.OpenedProfileServer;
        openedProfile.id = openedProfileId;
        openedProfile.profile = profileId;
        openedProfile.connection = this;
        openedProfile.requestParams = requestParams;
        openedProfile.init();

        // Register
        this._openedProfiles[openedProfileId] = openedProfile;

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
