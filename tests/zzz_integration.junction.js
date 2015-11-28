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
            unsubscribe: test.mockFunction('comet.unsubscribe')
        };


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
                    [['theProfile', 'theMasterBinding', {'theMasterBinding.id': {}, 'theJunctionBinding.detailId': {}}]]
                ],
                return: when.resolve([[]])
            }
        );
        comet.subscribe.mockStep(
            function(channelId, pusher) {
                test.equal(channelId, 'theProfile:theMasterBinding:1');
            }
        );

        comet.serverEvents.onNewConnection('theConnection');
        var openProfilePromise = comet.serverEvents.onOpenProfileCommand('theConnection', [
            [
                'theOpenedProfile', // openedProfileId
                'theProfile', // profileId
                {} // profileRequestParams
            ]
        ]);
        openProfilePromise.then(function(loadedData) {
            test.deepEqual(loadedData, {
                theProfile: [
                    ['theMasterBinding', []],
                    ['theJunctionBinding', []],
                    ['theDetailBinding', []]
                ]
            });

            // Chain
            step2();
        });

        function step2() {

            // Close profile on connection lose
            comet.unsubscribe.mockStep(
                function(channelId, pusher) {
                    test.equal(channelId, 'theProfile:theMasterBinding:1');
                }
            );
            comet.serverEvents.onLostConnection('theConnection');

            test.done();
        }
    }
};