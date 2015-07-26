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

function initMasterDetailBindings(channelPush) {

    var detailBinding = {
        id: 'theDetailBinding',
        match: {
            'theDetailAttribute': 'theMasterBinding.theMasterAttribute'
        },
        channel: {
            push: channelPush
        }
    };

    var masterBinding = {
        id: 'theMasterBinding',
        masterKeys: {'theMasterAttribute': [detailBinding]}
    };

    return {
        'theMasterBinding': masterBinding,
        'theDetailBinding': detailBinding
    };
}


function simpleCascade(test, noCascade, externalDataLoader, channelPush) {

    // Init
    var openedProfileServer = initSubject(
        initMasterDetailBindings(channelPush),
        externalDataLoader
    );


    // Test
    openedProfileServer.updateMasterValues(
        // Call for bindingId
        'theMasterBinding',
        // Add
        'theId', { theMasterAttribute: 'theMatchingValue' },
        // Remove
        null, null,
        // No cascade
        noCascade
    );
    test.deepEqual(openedProfileServer.requestParams, {
        'theMasterBinding.theMasterAttribute': ['theMatchingValue']
    });

}


module.exports = {

    /**
     * @param {NodeUnit} test
     */
    "test single binding": function(test) {

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

        simpleCascade(test,
            false,
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
            ),
            test.mockFunction('channel.push',
                function(openedProfile, message) {
                    test.equal(arguments.length, 2);
                    //test.equal(openedProfile, openedProfileServer);
                    test.deepEqual(message, ['add', detailRecord]);

                    test.done();
                }
            )
        );
    },

    /**
     * @param {NodeUnit} test
     */
    "test simple no cascade": function(test) {

        simpleCascade(test,
            true,
            test.mockFunction('externalDataLoader'),
            test.mockFunction('channel.push')
        );

        test.done();
    },

    /**
     * @param {NodeUnit} test
     */
    "test add-update-delete": function(test) {

        // Macros
        var detailRecordNumber = 1;
        function newDetailRecord() {
            return {
                'theAttribute': detailRecordNumber++
            }
        }

        function mockDependencies(externalDataLoader, channelPush) {
            openedProfileServer.connection.server.externalDataLoader = externalDataLoader;
            openedProfileServer.bindings['theDetailBinding'].channel.push = channelPush;
        }

        var donePromise = when.resolve();
        function step(action) {
            donePromise = donePromise.then(function() {
                return when.promise(action);
            });
        }

        // Step scenarios
        function normalAdd(matchingValue, expectedResult) {

            step(function(resolveStepDone) {

                var addDetailRecord1 = newDetailRecord();
                var addDetailRecord2 = newDetailRecord();

                mockDependencies(
                    test.mockFunction('externalDataLoader',
                        {
                            arguments: [
                                // batchParams
                                [
                                    ['theProfile', 'theDetailBinding', {
                                        'theMasterBinding.theMasterAttribute': matchingValue
                                    }]
                                ]
                            ],
                            return: when.resolve([
                                [addDetailRecord1, addDetailRecord2]
                            ])
                        }
                    ),
                    test.mockFunction('channel.push',
                        {
                            arguments: [openedProfileServer, ['add', addDetailRecord1]]
                        },
                        {
                            arguments: [openedProfileServer, ['add', addDetailRecord2]],
                            sideEffect: resolveStepDone
                        }
                    )
                );

                openedProfileServer.updateMasterValues(
                    // Call for bindingId
                    'theMasterBinding',
                    // Add
                    'theId', { theMasterAttribute: matchingValue },
                    // Remove
                    null, null
                );

                test.deepEqual(openedProfileServer.requestParams, {
                    'theMasterBinding.theMasterAttribute': expectedResult
                });
            });
        }

        function normalUpdate(matchingAddValue, matchingRemoveValue, expectedResult) {

            step(function(resolveStepDone) {

                var addDetailRecord1 = newDetailRecord();
                var addDetailRecord2 = newDetailRecord();
                var removeDetailRecord1 = newDetailRecord();
                var removeDetailRecord2 = newDetailRecord();

                mockDependencies(
                    test.mockFunction('externalDataLoader',
                        {
                            arguments: [
                                // batchParams
                                [
                                    ['theProfile', 'theDetailBinding', {
                                        'theMasterBinding.theMasterAttribute': matchingAddValue
                                    }],
                                    ['theProfile', 'theDetailBinding', {
                                        'theMasterBinding.theMasterAttribute': matchingRemoveValue
                                    }]
                                ]
                            ],
                            return: when.resolve([
                                [addDetailRecord1, addDetailRecord2],
                                [removeDetailRecord1, removeDetailRecord2]
                            ])
                        }
                    ),
                    test.mockFunction('channel.push',
                        {
                            arguments: [openedProfileServer, ['add', addDetailRecord1]]
                        },
                        {
                            arguments: [openedProfileServer, ['add', addDetailRecord2]]
                        },
                        {
                            arguments: [openedProfileServer, ['remove', removeDetailRecord1]]
                        },
                        {
                            arguments: [openedProfileServer, ['remove', removeDetailRecord2]],
                            sideEffect: resolveStepDone
                        }
                    )
                );

                openedProfileServer.updateMasterValues(
                    // Call for bindingId
                    'theMasterBinding',
                    // Add
                    'theId', { theMasterAttribute: matchingAddValue },
                    // Remove
                    'theId', { theMasterAttribute: matchingRemoveValue }
                );

                test.deepEqual(openedProfileServer.requestParams, {
                    'theMasterBinding.theMasterAttribute': expectedResult
                });
            });
        }

        function problemUpdate(matchingAddValue, expectedResult) {

            step(function(resolveStepDone) {

                var addDetailRecord1 = newDetailRecord();
                var addDetailRecord2 = newDetailRecord();

                mockDependencies(
                    test.mockFunction('externalDataLoader',
                        {
                            arguments: [
                                // batchParams
                                [
                                    ['theProfile', 'theDetailBinding', {
                                        'theMasterBinding.theMasterAttribute': matchingAddValue
                                    }]
                                ]
                            ],
                            return: when.resolve([
                                [addDetailRecord1, addDetailRecord2]
                            ])
                        }
                    ),
                    test.mockFunction('channel.push',
                        {
                            arguments: [openedProfileServer, ['add', addDetailRecord1]]
                        },
                        {
                            arguments: [openedProfileServer, ['add', addDetailRecord2]],
                            sideEffect: resolveStepDone
                        }
                    )
                );

                openedProfileServer.updateMasterValues(
                    // Call for bindingId
                    'theMasterBinding',
                    // Add
                    'theId', { theMasterAttribute: matchingAddValue },
                    // Remove
                    'theId', { theMasterAttribute: 'theProblemValue' } // This value is prohibited now. Do not fail though.
                );

                test.deepEqual(openedProfileServer.requestParams, {
                    'theMasterBinding.theMasterAttribute': expectedResult
                });
            });
        }

        function normalRemove(matchingRemoveValue, expectedResult) {

            step(function(resolveStepDone) {

                var removeDetailRecord1 = newDetailRecord();
                var removeDetailRecord2 = newDetailRecord();

                mockDependencies(
                    test.mockFunction('externalDataLoader',
                        {
                            arguments: [
                                // batchParams
                                [
                                    ['theProfile', 'theDetailBinding', {
                                        'theMasterBinding.theMasterAttribute': matchingRemoveValue
                                    }]
                                ]
                            ],
                            return: when.resolve([
                                [removeDetailRecord1, removeDetailRecord2]
                            ])
                        }
                    ),
                    test.mockFunction('channel.push',
                        {
                            arguments: [openedProfileServer, ['remove', removeDetailRecord1]]
                        },
                        {
                            arguments: [openedProfileServer, ['remove', removeDetailRecord2]],
                            sideEffect: resolveStepDone
                        }
                    )
                );

                openedProfileServer.updateMasterValues(
                    // Call for bindingId
                    'theMasterBinding',
                    // Add
                    null, null,
                    // Remove
                    'theId', { theMasterAttribute: matchingRemoveValue }
                );

                test.deepEqual(openedProfileServer.requestParams, {
                    'theMasterBinding.theMasterAttribute': expectedResult
                });
            });
        }

        function problemRemove(expectedResult) {

            step(function(resolveStepDone) {

                mockDependencies(
                    test.mockFunction('externalDataLoader'),
                    test.mockFunction('channel.push')
                );

                openedProfileServer.updateMasterValues(
                    // Call for bindingId
                    'theMasterBinding',
                    // Add
                    null, null,
                    // Remove
                    'theId', { theMasterAttribute: 'theProblemValue' } // This value is prohibited now. Do not fail though.
                );

                test.deepEqual(openedProfileServer.requestParams, {
                    'theMasterBinding.theMasterAttribute': expectedResult
                });

                resolveStepDone();
            });
        }


        // Init
        var openedProfileServer = initSubject(
            initMasterDetailBindings(test.mockFunction('channel.push')),
            test.mockFunction('externalDataLoader')
        );


        // Test
        normalAdd(
            'theMatchingValue',
            ['theMatchingValue']
        );
        normalAdd(
            'theSecondMatchingValue',
            ['theMatchingValue', 'theSecondMatchingValue']
        );
        normalUpdate(
            'theThirdMatchingValue', // Add
            'theMatchingValue', // Remove
            ['theSecondMatchingValue', 'theThirdMatchingValue']
        );
        problemUpdate(
            'theForthMatchingValue', // Add this and ask to remove the irrelevant value.
            ['theSecondMatchingValue', 'theThirdMatchingValue', 'theForthMatchingValue']
        );
        normalRemove(
            'theThirdMatchingValue',
            ['theSecondMatchingValue', 'theForthMatchingValue']
        );
        problemRemove(
            // Asking to remove the irrelevant value. Don't crash
            ['theSecondMatchingValue', 'theForthMatchingValue']
        );
        normalRemove(
            'theForthMatchingValue',
            ['theSecondMatchingValue']
        );
        normalRemove(
            'theSecondMatchingValue',
            []
        );


        donePromise.then(function() {
            test.done();
        });
    }

};