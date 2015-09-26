require('./bootstrap');
var when = require('when');
require('../src/lib/router/OpenedProfileServer');

/**
 * @param {Object} requestParams
 * @param {Object} mockProfileBindings
 * @returns {NeatComet.router.OpenedProfileServer}
 */
function initSubject(requestParams, mockProfileBindings) {

    var openedProfile = new NeatComet.router.OpenedProfileServer();
    openedProfile.id = 123;
    openedProfile.profile = 'theProfile';

    // Mock ConnectionServer
    openedProfile.connection = {
        // Mock NeatCometServer
        manager: {
            profileBindings: mockProfileBindings,

            externalDataLoader: null // Used below
        }
    };

    openedProfile.requestParams = requestParams;
    openedProfile.init();

    return openedProfile;
}

module.exports = {

    /**
     * @param {NodeUnit} test
     */
    "test primitives": function(test) {

        var mockProfileBindings = {
            'theProfile': {}
        };

        var openedProfileServer = initSubject(
            {},
            mockProfileBindings
        );

        test.equal(openedProfileServer.bindings, mockProfileBindings.theProfile);

        test.done();
    }

    // TODO: test channels management (addChannels, removeChannels, updateChannels, destroy)

};