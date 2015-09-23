require('./bootstrap');
var when = require('when');
require('../src/lib/NeatCometServer'); // For intersectKeys, TODO: extract utils
require('../src/lib/router/OpenedProfileServer');
require('../src/lib/router/DataLoaderServer');


var TestingKit = function() {};

TestingKit.prototype = {

    /** @type {NodeUnit} */
    test: null,

    requestParams: {},

    /** @type {Function} */
    externalDataLoader: null,

    /** @type {Function} */
    updateMasterValues: null,

    /** @type {NeatComet.router.OpenedProfileServer} */
    openedProfileServer: null,

    mockBinding: function(properties) {

        return _.assign({

            channel: {
                openProfile: this.test.mockFunction('openProfile',
                    function () {
                        this.test.equal(arguments.length, 1);
                        this.test.equal(arguments[0], this.openedProfileServer);
                    }.bind(this)
                )
            },

            getIdFromAttributes: function (attributes) {
                return attributes.id;
            }

        }, properties);
    },

    _init: function(profile) {

        var openedProfileServer = new NeatComet.router.OpenedProfileServer();
        openedProfileServer.id = 123;
        openedProfileServer.profile = 'theProfile';

        // Mock ConnectionServer
        openedProfileServer.connection = {
            // Mock NeatCometServer
            server: {
                profileBindings: {
                    'theProfile': profile
                },

                externalDataLoader: { /* Define below */ }
            }
        };

        openedProfileServer.requestParams = this.requestParams;
        openedProfileServer.init();

        // Mock data source
        openedProfileServer.connection.server.externalDataLoader = this.externalDataLoader;

        // Don't test updateMasterValues this run. Mock it
        openedProfileServer.updateMasterValues = this.updateMasterValues;

        this.openedProfileServer = openedProfileServer;
    },

    run: function(profile, expectedResult) {

        // Init
        this._init(profile);


        // Test
        this.openedProfileServer.open()
            .then(function (result) {
                this.test.deepEqual(result, expectedResult);

                this.test.done();
            }.bind(this));
    }
};


module.exports = {

    /**
     * @param {NodeUnit} test
     */
    "test open: single binding": function(test) {

        var attempt = new TestingKit();
        attempt.test = test;

        // Response data
        var theBindingData = [ { id: 'theId', 'theAttribute': 'theValue' } ];

        // Mock DataLoader
        attempt.externalDataLoader = test.mockFunction('externalDataLoader',
            {
                arguments: [
                    // batchParams
                    [
                        ['theProfile', 'theBinding', {}]
                    ]
                ],
                return: when.resolve([theBindingData])
            }
        );

        // Side effect: updateMasterValues
        attempt.updateMasterValues = test.mockFunction('updateMasterValues');

        // Test
        attempt.run(
            // Profile
            {
                'theBinding': attempt.mockBinding({ id: 'theBinding' })
            },
            // Result
            {
                'theBinding': theBindingData
            }
        );

    },

    /**
     * @param {NodeUnit} test
     */
    "test open: double binding, single stage": function(test) {

        var attempt = new TestingKit();
        attempt.test = test;

        // Response data
        var theBindingData = [ { id: 'theId', 'theAttribute': 'theValue' } ];
        var theAnotherBindingData = [ { id: 'theAnotherId', 'theAttribute': 'theAnotherValue' } ];

        // Mock DataLoader
        attempt.externalDataLoader = test.mockFunction('externalDataLoader',
            {
                arguments: [
                    // batchParams
                    [
                        ['theProfile', 'theBinding', {}],
                        ['theProfile', 'theAnotherBinding', {}]
                    ]
                ],
                return: when.resolve([theBindingData, theAnotherBindingData])
            }
        );

        // Side effect: updateMasterValues
        attempt.updateMasterValues = test.mockFunction('updateMasterValues');

        // Test
        attempt.run(
            // Profile
            {
                'theBinding': attempt.mockBinding({ id: 'theBinding' }),
                'theAnotherBinding': attempt.mockBinding({ id: 'theAnotherBinding' })
            },
            // Result
            {
                'theBinding': theBindingData,
                'theAnotherBinding': theAnotherBindingData
            }
        );

    },

    /**
     * @param {NodeUnit} test
     */
    "test open: double binding, two stages": function(test) {

        var attempt = new TestingKit();
        attempt.test = test;


        // Response data
        var theMasterBindingData = [
            { id: 'theMasterMatchingId', 'theMasterAttribute': 'theMatchingValue' },
            { id: 'theMasterUnmatchingId', 'theMasterAttribute': 'theMasterUnmatchingValue' }
        ];
        var theDetailBindingData = [
            { id: 'theDetailMatchingId', 'theDetailAttribute': 'theMatchingValue' }
        ];


        // Mock bindings with relation
        var detailBinding = attempt.mockBinding({
            id: 'theDetailBinding',
            match: {
                'theDetailAttribute': 'theMasterBinding.theMasterAttribute'
            }
        });
        var masterBinding = attempt.mockBinding({
            id: 'theMasterBinding',
            masterKeys: { 'theMasterAttribute': [detailBinding] }
        });


        // Mock DataLoader
        attempt.externalDataLoader = test.mockFunction('externalDataLoader',
            {
                arguments: [
                    // batchParams
                    [
                        // Binding #0
                        ['theProfile', 'theMasterBinding', {
                            'theMasterBinding.theMasterAttribute': []
                        }]
                    ]
                ],
                return: when.resolve([theMasterBindingData])
            },
            {
                arguments: [
                    // batchParams
                    [
                        // Binding #0
                        ['theProfile', 'theDetailBinding', {
                            'theMasterBinding.theMasterAttribute': ['theMatchingValue', 'theMasterUnmatchingValue']
                        }]
                    ]
                ],
                return: when.resolve([theDetailBindingData])
            }
        );


        // Mock side effect of load: updateMasterValues
        attempt.updateMasterValues = test.mockFunction('updateMasterValues',
            {
                arguments: ['theMasterBinding',
                    // addOfModelId, addValues
                    'theMasterMatchingId', {theMasterAttribute: 'theMatchingValue'},
                    // removeOfModelId, removeValues
                    null, null,
                    // noCascade
                    true
                ],
                sideEffect: function() {
                    attempt.openedProfileServer.requestParams = {
                        'theMasterBinding.theMasterAttribute': ['theMatchingValue']
                    };
                }
            },
            {
                arguments: ['theMasterBinding',
                    // addOfModelId, addValues
                    'theMasterUnmatchingId', {theMasterAttribute: 'theMasterUnmatchingValue'},
                    // removeOfModelId, removeValues
                    null, null,
                    // noCascade
                    true
                ],
                sideEffect: function() {
                    attempt.openedProfileServer.requestParams = {
                        'theMasterBinding.theMasterAttribute': ['theMatchingValue', 'theMasterUnmatchingValue']
                    };
                }
            }
        );


        // Test
        attempt.run(

            // Profile
            {
                'theMasterBinding': masterBinding,
                'theDetailBinding': detailBinding
            },

            // Result
            {
                'theMasterBinding': theMasterBindingData,
                'theDetailBinding': theDetailBindingData
            }
        );
    }

};