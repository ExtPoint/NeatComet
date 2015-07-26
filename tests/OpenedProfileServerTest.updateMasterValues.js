require('./bootstrap');
var when = require('when');
require('../src/lib/router/OpenedProfileServer');
require('../src/lib/router/DataLoaderServer');

/**
 * @param {Object} mockProfileBindings
 * @param {Function} externalDataLoader
 * @returns {NeatComet.router.OpenedProfileServer}
 */
function initSubject(mockProfileBindings, externalDataLoader) {

    var openedProfile = new NeatComet.router.OpenedProfileServer();
    openedProfile.id = 123;
    openedProfile.profile = 'theProfile';

    // Mock ConnectionServer
    openedProfile.connection = {
        // Mock NeatCometServer
        server: {
            profileBindings: {
                theProfile: mockProfileBindings
            }
        }
    };

    openedProfile.requestParams = {};
    openedProfile.init();

    // Mock data source
    openedProfile.connection.server.externalDataLoader = externalDataLoader;


    // Emulate binding load. UNSAFE
    openedProfile._initMasterKeysForLoad();
    _.each(openedProfile.bindings, function(binding, bindingId) {
        openedProfile._markBindingLoaded(openedProfile.bindings[bindingId]);
    });


    return openedProfile;
}

module.exports = {

    /**
     * @param {NodeUnit} test
     */
    "test single binding": function(test) {

        var detailRecord = { id: 'theDetailMatchingId', 'theDetailAttribute': 'theMatchingValue' };


        // Init
        var openedProfileServer = initSubject(
            {
                'theBinding': {
                    id: 'theBinding'
                    // No channel.push side effect
                }
            },
            test.mockFunction('externalDataLoader')
        );


        // Test
        openedProfileServer.updateMasterValues(
            // Call for bindingId
            'theBinding',
            // Add
            'theId', {},
            // Remove
            null, null
            // No cascade = default false
        );
        test.deepEqual(openedProfileServer.requestParams, {});


        test.done();
    },

    /**
     * @param {NodeUnit} test
     */
    "test simple cascade": function(test) {

        var detailRecord = { id: 'theDetailMatchingId', 'theDetailAttribute': 'theMatchingValue' };
        var detailBinding = {
            id: 'theDetailBinding',
            match: {
                'theDetailAttribute': 'theMasterBinding.theMasterAttribute'
            },
            channel: {
                push: test.mockFunction('channel.push',
                    function(openedProfile, message) {
                        test.equal(arguments.length, 2);
                        //test.equal(openedProfile, openedProfileServer);
                        test.deepEqual(message, ['add', detailRecord]);

                        test.done();
                    }
                )
            }
        };
        var masterBinding = {
            id: 'theMasterBinding',
            masterKeys: { 'theMasterAttribute': [detailBinding] }
        };
        var masterDetailBindings = {
            'theMasterBinding': masterBinding,
            'theDetailBinding': detailBinding
        };


        // Init
        var openedProfileServer = initSubject(
            masterDetailBindings,
            test.mockFunction('externalDataLoader',
                {
                    arguments: [
                        // batchParams
                        [
                            ['theProfile', 'theDetailBinding', {
                                'theMasterBinding.theMasterAttribute': 'theMatchingValue'
                            }]
                        ]
                    ],
                    return: when.resolve([
                        [detailRecord]
                    ])
                }
            )
        );


        // Test
        openedProfileServer.updateMasterValues(
            // Call for bindingId
            'theMasterBinding',
            // Add
            'theId', { theMasterAttribute: 'theMatchingValue' },
            // Remove
            null, null
            // No cascade = default false
        );
        test.deepEqual(openedProfileServer.requestParams, {
            'theMasterBinding.theMasterAttribute': ['theMatchingValue']
        });


        // test.done() async, see above
    }

};