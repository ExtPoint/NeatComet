require('./bootstrap');
var when = require('when');
require('../src/lib/router/OpenedProfileServer');

// Stub
NeatComet.router.openedProfile.LimitsServer = function () {};

/**
 * @param {Object} requestParams
 * @param {Object} mockProfileBindings
 * @returns {NeatComet.router.OpenedProfileServer}
 */
function initSubject(requestParams, mockProfileBindings) {

    var openedProfile = new NeatComet.router.OpenedProfileServer();
    openedProfile.id = 123;
    openedProfile.profileId = 'theProfile';

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
    },

    /**
     * @param {NodeUnit} test
     */
    "test channels management no comet forward": function(test) {

        // Mocks
        var mockProfileBindings = {
            'theProfile': {}
        };
        var subscribe = test.mockFunction('comet.subscribe');
        var unsubscribe = test.mockFunction('comet.unsubscribe');
        var fn1 = function() { /* f1 */ };
        var fn2 = function() { /* f2 */ };


        // Init
        var openedProfileServer = initSubject(
            {},
            mockProfileBindings
        );
        openedProfileServer.connection.comet = {
            getSupportsForwardToClient: function() { return false },
            subscribe: subscribe,
            unsubscribe: unsubscribe
        };


        // Step
        subscribe.mockStep(
            ['theChannel', fn1]
        );
        unsubscribe.mockStep(
        );
        openedProfileServer.addChannels('theBinding', {
            'theChannel': fn1
        }, fn1);


        // Step
        subscribe.mockStep(
        );
        unsubscribe.mockStep(
        );
        openedProfileServer.updateChannels('theBinding', {
            'theChannel': fn1
        }, fn1);


        // Step
        subscribe.mockStep(
            ['theChannel', fn2]
        );
        unsubscribe.mockStep(
            ['theChannel', fn1]
        );
        openedProfileServer.updateChannels('theBinding', {
            'theChannel': fn2
        }, fn1);


        // Step
        subscribe.mockStep(
            ['theAltChannel', fn1]
        );
        unsubscribe.mockStep(
            ['theChannel', fn2]
        );
        openedProfileServer.updateChannels('theBinding', {
            'theAltChannel': fn1
        }, fn1);


        // Step
        subscribe.mockStep(
            ['theChannel', fn1]
        );
        unsubscribe.mockStep(
        );
        openedProfileServer.updateChannels('theAnotherBinding', {
            'theChannel': fn1
        }, fn1);


        // Step
        subscribe.mockStep(
        );
        unsubscribe.mockStep(
            ['theAltChannel', fn1]
        );
        openedProfileServer.removeChannels('theBinding', {
            'theAltChannel': fn1
        });


        // Step
        subscribe.mockStep(
            ['theChannel', fn1]
        );
        unsubscribe.mockStep(
        );
        openedProfileServer.updateChannels('theBinding', {
            'theChannel': fn1
        }, fn1);


        test.done();
    }

};