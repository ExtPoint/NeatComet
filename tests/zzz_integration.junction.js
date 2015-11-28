require('./bootstrap');
var when = require('when');
require('../src/server');


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
                        [['theProfile', 'theJunctionBinding',
                            {'theMasterBinding.id': 'theMasterFirst', 'theJunctionBinding.detailId': [] }]]
                    ],
                    return: when.resolve([[]])
                }
            );
            comet.subscribe.mockStep(
                function(channelId, hubListener) {
                    test.equal(channelId, 'theProfile:theJunctionBinding:masterId=theMasterFirst');
                    junctionBindingHubListener = hubListener;
                }
            );
            comet.pushToClient.mockStep(
                ['theConnection', '!theOpenedProfile:theMasterBinding', ['add', { id: 'theMasterFirst'}]]
            );
            masterBindingHubListener('theProfile:theMasterBinding:1', ['add', { id: 'theMasterFirst'}]);


            // Close profile on connection lose
            comet.unsubscribe.mockStep(
                function(channelId, hubListener) {
                    test.equal(channelId, 'theProfile:theMasterBinding:1');
                    test.equal(masterBindingHubListener, hubListener);
                },
                function(channelId, hubListener) {
                    test.equal(channelId, 'theProfile:theJunctionBinding:masterId=theMasterFirst');
                    test.equal(junctionBindingHubListener, hubListener);
                }
            );
            comet.serverEvents.onLostConnection('theConnection');

            test.done();
        });
    }
};