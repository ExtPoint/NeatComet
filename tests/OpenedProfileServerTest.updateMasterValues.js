require('./bootstrap');
var when = require('when');
require('../src/lib/NeatCometServer'); // For intersectKeys, TODO: extract utils
require('../src/lib/router/OpenedProfileServer');
require('../src/lib/router/DataLoaderServer');

var TestingKit = function(test) {
    this.test = test;
    this.init();
};

TestingKit.prototype = {

    /** @type {NodeUnit} */
    test: null,

    /** @type {NeatComet.router.OpenedProfileServer} */
    openedProfile: null,

    /** @type {Function} */
    externalDataLoader: null,

    /** @type {Function} */
    detailChannelPush: null,

    /** @type {Function} */
    detailChannelUpdateChannels: null,

    /** @type {Object.<string, NeatComet.bindings.BindingServer>} */
    profileBindings: null,

    init: function() {

        this.externalDataLoader = this.test.mockFunction('externalDataLoader');
        this.detailChannelPush = this.test.mockFunction('detailChannelPush');
        this.detailChannelUpdateChannels = this.test.mockFunction('detailChannelUpdateChannels');
    },

    initOpenedProfile: function() {

        var openedProfile = this.openedProfile = new NeatComet.router.OpenedProfileServer();
        openedProfile.id = 123;
        openedProfile.profileId = 'theProfile';

        // Mock ConnectionServer
        openedProfile.connection = {
            // Mock NeatCometServer
            manager: {
                profileBindings: {
                    theProfile: this.profileBindings
                }
            }
        };

        openedProfile.requestParams = {};
        openedProfile.init();

        // Mock data source
        openedProfile.connection.manager.externalDataLoader = this.externalDataLoader;


        // Emulate binding load. UNSAFE
        openedProfile._initMasterKeysForLoad();
        _.each(openedProfile.bindings, function(binding, bindingId) {
            openedProfile._markBindingLoaded(openedProfile.bindings[bindingId]);
        });
    },

    useMasterDetailBindings: function() {

        var detailBinding = {
            id: 'theDetailBinding',
            match: {
                'theDetailAttribute': 'theMasterBinding.theMasterAttribute'
            },
            channel: {
                push: this.detailChannelPush,
                updateChannels: this.detailChannelUpdateChannels
            }
        };

        var masterBinding = {
            id: 'theMasterBinding',
            masterKeys: {'theMasterAttribute': [detailBinding]}
        };

        this.profileBindings = {
            'theMasterBinding': masterBinding,
            'theDetailBinding': detailBinding
        };
    },

    runSimpleCascade: function(noCascade) {

        // Init
        this.useMasterDetailBindings();
        this.initOpenedProfile();


        // Test
        this.openedProfile.updateMasterValues(
            // Call for bindingId
            'theMasterBinding',
            // Add
            'theId', { theMasterAttribute: 'theMatchingValue' },
            // Remove
            null, null,
            // No cascade
            noCascade
        );
        this.test.deepEqual(this.openedProfile.requestParams, {
            'theMasterBinding.theMasterAttribute': ['theMatchingValue']
        });

    }

};


module.exports = {

    /**
     * @param {NodeUnit} test
     */
    "test single binding": function(test) {

        var attempt = new TestingKit(test);


        // Init
        attempt.profileBindings = {
            'theBinding': {
                id: 'theBinding'
                // No channel.push side effect
            }
        };
        attempt.initOpenedProfile();


        // Test
        attempt.openedProfile.updateMasterValues(
            // Call for bindingId
            'theBinding',
            // Add
            'theId', {},
            // Remove
            null, null
            // No cascade = default false
        );
        test.deepEqual(attempt.openedProfile.requestParams, {});


        test.done();
    },

    /**
     * @param {NodeUnit} test
     */
    "test simple cascade": function(test) {

        var attempt = new TestingKit(test);


        // Init
        var detailRecord = { id: 'theDetailMatchingId', 'theDetailAttribute': 'theMatchingValue' };

        // Mock expected calls
        attempt.externalDataLoader.mockStep({
            arguments: [
                // batchParams
                [
                    ['theProfile', 'theDetailBinding', {
                        'theMasterBinding.theMasterAttribute': ['theMatchingValue']
                    }]
                ]
            ],
            return: when.resolve([
                [detailRecord]
            ])
        });

        attempt.detailChannelPush.mockStep(
            function(openedProfile, message) {
                test.equal(arguments.length, 2);
                //test.equal(openedProfile, attempt.openedProfile);
                test.deepEqual(message, ['add', detailRecord]);

                test.done();
            }.bind(this)
        );

        attempt.detailChannelUpdateChannels.mockStep(
            function(openedProfile) {
                attempt.test.equal(arguments.length, 1);
                attempt.test.deepEqual(openedProfile.requestParams, {
                    'theMasterBinding.theMasterAttribute': ['theMatchingValue']
                });
            }.bind(this)
        );


        // Test
        attempt.runSimpleCascade(false);
    },

    /**
     * @param {NodeUnit} test
     */
    "test simple no cascade": function(test) {

        var attempt = new TestingKit(test);

        // Test
        attempt.runSimpleCascade(true);

        test.done();
    },

    /**
     * @param {NodeUnit} test
     */
    "test add-update-delete": function(test) {

        var attempt = new TestingKit(test);


        // Macros
        var detailRecordNumber = 1;
        function newDetailRecord() {
            return {
                'theAttribute': detailRecordNumber++
            }
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

                attempt.externalDataLoader.mockStep(
                    {
                        arguments: [
                            // batchParams
                            [
                                ['theProfile', 'theDetailBinding', {
                                    'theMasterBinding.theMasterAttribute': [matchingValue]
                                }]
                            ]
                        ],
                        return: when.resolve([
                            [addDetailRecord1, addDetailRecord2]
                        ])
                    }
                );

                attempt.detailChannelPush.mockStep(
                    {
                        arguments: [attempt.openedProfile, ['add', addDetailRecord1]]
                    },
                    {
                        arguments: [attempt.openedProfile, ['add', addDetailRecord2]],
                        sideEffect: resolveStepDone
                    }
                );

                attempt.detailChannelUpdateChannels.mockStep(
                    function(openedProfile) {
                        test.equal(openedProfile, attempt.openedProfile);
                        test.deepEqual(openedProfile.requestParams, expectedResult);
                    }
                );

                attempt.openedProfile.updateMasterValues(
                    // Call for bindingId
                    'theMasterBinding',
                    // Add
                    'theId', { theMasterAttribute: matchingValue },
                    // Remove
                    null, null
                );

                test.deepEqual(attempt.openedProfile.requestParams, expectedResult);
            });
        }

        function normalUpdate(matchingAddValue, matchingRemoveValue, expectedResult) {

            step(function(resolveStepDone) {

                var addDetailRecord1 = newDetailRecord();
                var addDetailRecord2 = newDetailRecord();
                var removeDetailRecord1 = newDetailRecord();
                var removeDetailRecord2 = newDetailRecord();

                attempt.externalDataLoader.mockStep(
                    {
                        arguments: [
                            // batchParams
                            [
                                ['theProfile', 'theDetailBinding', {
                                    'theMasterBinding.theMasterAttribute': [matchingAddValue]
                                }],
                                ['theProfile', 'theDetailBinding', {
                                    'theMasterBinding.theMasterAttribute': [matchingRemoveValue]
                                }]
                            ]
                        ],
                        return: when.resolve([
                            [addDetailRecord1, addDetailRecord2],
                            [removeDetailRecord1, removeDetailRecord2]
                        ])
                    }
                );

                attempt.detailChannelPush.mockStep(
                    {
                        arguments: [attempt.openedProfile, ['add', addDetailRecord1]]
                    },
                    {
                        arguments: [attempt.openedProfile, ['add', addDetailRecord2]]
                    },
                    {
                        arguments: [attempt.openedProfile, ['remove', removeDetailRecord1]]
                    },
                    {
                        arguments: [attempt.openedProfile, ['remove', removeDetailRecord2]],
                        sideEffect: resolveStepDone
                    }
                );

                attempt.detailChannelUpdateChannels.mockStep(
                    function(openedProfile) {
                        test.equal(openedProfile, attempt.openedProfile);
                        test.deepEqual(openedProfile.requestParams, expectedResult);
                    }
                );

                attempt.openedProfile.updateMasterValues(
                    // Call for bindingId
                    'theMasterBinding',
                    // Add
                    'theId', { theMasterAttribute: matchingAddValue },
                    // Remove
                    'theId', { theMasterAttribute: matchingRemoveValue }
                );

                test.deepEqual(attempt.openedProfile.requestParams, expectedResult);
            });
        }

        function problemUpdate(matchingAddValue, expectedResult) {

            step(function(resolveStepDone) {

                var addDetailRecord1 = newDetailRecord();
                var addDetailRecord2 = newDetailRecord();

                attempt.externalDataLoader.mockStep(
                    {
                        arguments: [
                            // batchParams
                            [
                                ['theProfile', 'theDetailBinding', {
                                    'theMasterBinding.theMasterAttribute': [matchingAddValue]
                                }]
                            ]
                        ],
                        return: when.resolve([
                            [addDetailRecord1, addDetailRecord2]
                        ])
                    }
                );

                attempt.detailChannelPush.mockStep(
                    {
                        arguments: [attempt.openedProfile, ['add', addDetailRecord1]]
                    },
                    {
                        arguments: [attempt.openedProfile, ['add', addDetailRecord2]],
                        sideEffect: resolveStepDone
                    }
                );

                attempt.detailChannelUpdateChannels.mockStep(
                    function(openedProfile) {
                        test.equal(openedProfile, attempt.openedProfile);
                        test.deepEqual(openedProfile.requestParams, expectedResult);
                    }
                );

                attempt.openedProfile.updateMasterValues(
                    // Call for bindingId
                    'theMasterBinding',
                    // Add
                    'theId', { theMasterAttribute: matchingAddValue },
                    // Remove
                    'theId', { theMasterAttribute: 'theProblemValue' } // This value is prohibited now. Do not fail though.
                );

                test.deepEqual(attempt.openedProfile.requestParams, expectedResult);
            });
        }

        function normalRemove(matchingRemoveValue, expectedResult) {

            step(function(resolveStepDone) {

                var removeDetailRecord1 = newDetailRecord();
                var removeDetailRecord2 = newDetailRecord();

                attempt.externalDataLoader.mockStep(
                    {
                        arguments: [
                            // batchParams
                            [
                                ['theProfile', 'theDetailBinding', {
                                    'theMasterBinding.theMasterAttribute': [matchingRemoveValue]
                                }]
                            ]
                        ],
                        return: when.resolve([
                            [removeDetailRecord1, removeDetailRecord2]
                        ])
                    }
                );

                attempt.detailChannelPush.mockStep(
                    {
                        arguments: [attempt.openedProfile, ['remove', removeDetailRecord1]]
                    },
                    {
                        arguments: [attempt.openedProfile, ['remove', removeDetailRecord2]],
                        sideEffect: resolveStepDone
                    }
                );

                attempt.detailChannelUpdateChannels.mockStep(
                    function(openedProfile) {
                        test.equal(openedProfile, attempt.openedProfile);
                        test.deepEqual(openedProfile.requestParams, expectedResult);
                    }
                );

                attempt.openedProfile.updateMasterValues(
                    // Call for bindingId
                    'theMasterBinding',
                    // Add
                    null, null,
                    // Remove
                    'theId', { theMasterAttribute: matchingRemoveValue }
                );

                test.deepEqual(attempt.openedProfile.requestParams, expectedResult);
            });
        }

        function problemRemove(expectedResult) {

            step(function(resolveStepDone) {

                attempt.externalDataLoader.mockStep();
                attempt.detailChannelPush.mockStep();
                attempt.detailChannelUpdateChannels.mockStep();

                attempt.openedProfile.updateMasterValues(
                    // Call for bindingId
                    'theMasterBinding',
                    // Add
                    null, null,
                    // Remove
                    'theId', { theMasterAttribute: 'theProblemValue' } // This value is prohibited now. Do not fail though.
                );

                test.deepEqual(attempt.openedProfile.requestParams, expectedResult);

                resolveStepDone();
            });
        }


        // Init
        attempt.useMasterDetailBindings();
        attempt.initOpenedProfile();


        // Test
        normalAdd(
            'theMatchingValue',
            {
                'theMasterBinding.theMasterAttribute': ['theMatchingValue']
            }
        );
        normalAdd(
            'theSecondMatchingValue',
            {
                'theMasterBinding.theMasterAttribute': ['theMatchingValue', 'theSecondMatchingValue']
            }
        );
        normalUpdate(
            'theThirdMatchingValue', // Add
            'theMatchingValue', // Remove
            {
                'theMasterBinding.theMasterAttribute': ['theSecondMatchingValue', 'theThirdMatchingValue']
            }
        );
        problemUpdate(
            'theForthMatchingValue', // Add this and ask to remove the irrelevant value.
            {
                'theMasterBinding.theMasterAttribute': ['theSecondMatchingValue', 'theThirdMatchingValue', 'theForthMatchingValue']
            }
        );
        normalRemove(
            'theThirdMatchingValue',
            {
                'theMasterBinding.theMasterAttribute': ['theSecondMatchingValue', 'theForthMatchingValue']
            }
        );
        problemRemove(
            // Asking to remove the irrelevant value. Don't crash
            {
                'theMasterBinding.theMasterAttribute': ['theSecondMatchingValue', 'theForthMatchingValue']
            }
        );
        normalRemove(
            'theForthMatchingValue',
            {
                'theMasterBinding.theMasterAttribute': ['theSecondMatchingValue']
            }
        );
        normalRemove(
            'theSecondMatchingValue',
            {
                'theMasterBinding.theMasterAttribute': []
            }
        );


        donePromise.then(function() {
            test.done();
        });
    }
};