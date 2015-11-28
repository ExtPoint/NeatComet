require('./bootstrap');
var when = require('when');
require('../src/server');


function next(fn) {
    return function (object, promise) {
        promise.then(fn);
    }
}


module.exports = {

    /**
     * @param {NodeUnit} test
     */
    "test profile with junction": function(test) {

        // Mock external data loader
        var externalDataLoader = test.mockFunction('externalDataLoader');


        // Mock comet adapter
        var comet = {
            /** @type {NeatComet.api.ICometServerEvents} */
            serverEvents: null,
            bindServerEvents: test.mockFunction('comet.bindServerEvents',
                function(newEvents) {
                    comet.serverEvents = newEvents;
                }
            ),
            getSupportsForwardToClient: function() { return false }, // Disabled
            subscribe: test.mockFunction('comet.subscribe'),
            unsubscribe: test.mockFunction('comet.unsubscribe'),
            pushToClient: test.mockFunction('comet.pushToClient')
        };
        var masterBindingHubListener;
        var junctionBindingHubListener;
        var detailBindingHubListener;


        // Init
        var neatComet = new NeatComet.NeatCometServer;
        neatComet.setup({
            externalDataLoader: externalDataLoader,
            config: {
                'theProfile': {
                    'theMasterBinding': {
                    },
                    'theJunctionBinding': {
                        "match": {
                            "masterId": "theMasterBinding.id"
                        }
                    },
                    'theDetailBinding': {
                        "match": {
                            "id": "theJunctionBinding.detailId"
                        }
                    }
                }
            },
            comet: comet
        });

        var chain = test.mockFunction('chain');
        neatComet.debugChainHandler = chain;


        // Open profile
        externalDataLoader.mockStep(
            {
                arguments: [
                    // requestParams
                    [['theProfile', 'theMasterBinding', {'theMasterBinding.id': [], 'theJunctionBinding.detailId': []}]]
                ],
                return: when.resolve([[]])
            }
        );
        comet.subscribe.mockStep(
            function(channelId, hubListener) {
                test.equal(channelId, 'theProfile:theMasterBinding:1');
                masterBindingHubListener = hubListener;
            }
        );

        comet.serverEvents.onNewConnection('theConnection');
        comet.serverEvents.onOpenProfileCommand('theConnection', [
            [
                'theOpenedProfile', // openedProfileId
                'theProfile', // profileId
                {} // profileRequestParams
            ]
        ]).then(function(loadedData) {
            test.deepEqual(loadedData, {
                theProfile: [
                    ['theMasterBinding', []],
                    ['theJunctionBinding', []],
                    ['theDetailBinding', []]
                ]
            });


            // Save master record
            externalDataLoader.mockStep(
                {
                    arguments: [
                        // requestParams
                        [[
                            'theProfile',
                            'theJunctionBinding',
                            {
                                'theMasterBinding.id': ['theMasterFirst'],
                                'theJunctionBinding.detailId': []
                            }
                        ]]
                    ],
                    return: when.resolve([[]])
                }
            );
            comet.subscribe.mockStep(
                function (channelId, hubListener) {
                    test.equal(channelId, 'theProfile:theJunctionBinding:masterId=theMasterFirst');
                    junctionBindingHubListener = hubListener;
                }
            );
            comet.pushToClient.mockStep(
                ['theConnection', '!theOpenedProfile:theMasterBinding', ['add', {id: 'theMasterFirst'}]]
            );
            chain.mockStep(
                next(saveJunction)
            );
            masterBindingHubListener('theProfile:theMasterBinding:1', ['add', {id: 'theMasterFirst'}]);
        });


        function saveJunction() {

            // Save junction record, while detail is already saved
            externalDataLoader.mockStep(
                {
                    arguments: [
                        // requestParams
                        [[
                            'theProfile',
                            'theDetailBinding',
                            {
                                'theMasterBinding.id': ['theMasterFirst'],
                                'theJunctionBinding.detailId': ['theDetailFirst']
                            }
                        ]]
                    ],
                    return: when.resolve([[{'id': 'theDetailFirst'}]])
                }
            );
            comet.subscribe.mockStep(
                function (channelId, hubListener) {
                    test.equal(channelId, 'theProfile:theDetailBinding:id=theDetailFirst');
                    detailBindingHubListener = hubListener;
                }
            );
            comet.pushToClient.mockStep(
                ['theConnection', '!theOpenedProfile:theJunctionBinding',
                    ['add', { masterId: 'theMasterFirst', detailId: 'theDetailFirst' }]],
                ['theConnection', '!theOpenedProfile:theDetailBinding',
                    ['add', { id: 'theDetailFirst' }]]
            );
            chain.mockStep(
                next(close)
            );
            junctionBindingHubListener('theProfile:theJunctionBinding:masterId=theMasterFirst',
                ['add', {masterId: 'theMasterFirst', detailId: 'theDetailFirst'}]);
        }


        function close() {
            // Close profile on connection lose
            comet.unsubscribe.mockStep(
                function(channelId, hubListener) {
                    test.equal(channelId, 'theProfile:theMasterBinding:1');
                    test.equal(masterBindingHubListener, hubListener);
                },
                function(channelId, hubListener) {
                    test.equal(channelId, 'theProfile:theJunctionBinding:masterId=theMasterFirst');
                    test.equal(junctionBindingHubListener, hubListener);
                },
                function(channelId, hubListener) {
                    test.equal(channelId, 'theProfile:theDetailBinding:id=theDetailFirst');
                    test.equal(detailBindingHubListener, hubListener);
                }
            );
            comet.serverEvents.onLostConnection('theConnection');


            test.done();
        }
    }
};