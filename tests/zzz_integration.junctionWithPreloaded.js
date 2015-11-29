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
        var junctionFirstBindingHubListener;
        var junctionSecondBindingHubListener;
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
                        },
                        "idField": ['masterId', 'detailId']
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
                return: when.resolve([[{ id: 'theMasterFirst' }, { id: 'theMasterSecond' }]])
            },
            {
                arguments: [
                    // requestParams
                    [['theProfile', 'theJunctionBinding',
                        {'theMasterBinding.id': ['theMasterFirst', 'theMasterSecond'], 'theJunctionBinding.detailId': []}]]
                ],
                return: when.resolve([[]])
            }
        );
        comet.subscribe.mockStep(
            function(channelId, hubListener) {
                test.equal(channelId, 'theProfile:theMasterBinding:1');
                masterBindingHubListener = hubListener;
            },
            function(channelId, hubListener) {
                test.equal(channelId, 'theProfile:theJunctionBinding:masterId=theMasterFirst');
                junctionFirstBindingHubListener = hubListener;
            },
            function(channelId, hubListener) {
                test.equal(channelId, 'theProfile:theJunctionBinding:masterId=theMasterSecond');
                junctionSecondBindingHubListener = hubListener;
            }
        );
        comet.unsubscribe.mockStep(
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
                    ['theMasterBinding', [{ id: 'theMasterFirst' }, { id: 'theMasterSecond' }]],
                    ['theJunctionBinding', []],
                    ['theDetailBinding', []]
                ]
            });

            saveJunction();
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
                                'theMasterBinding.id': ['theMasterFirst', 'theMasterSecond'],
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
                next(deleteJunction)
            );
            junctionFirstBindingHubListener('theProfile:theJunctionBinding:masterId=theMasterFirst',
                ['add', {masterId: 'theMasterFirst', detailId: 'theDetailFirst'}]);
        }


        function deleteJunction() {

            // Save junction record, while detail is already saved
            externalDataLoader.mockStep(
                {
                    arguments: [
                        // requestParams
                        [[
                            'theProfile',
                            'theDetailBinding',
                            {
                                'theMasterBinding.id': ['theMasterFirst', 'theMasterSecond'],
                                'theJunctionBinding.detailId': ['theDetailFirst']
                            }
                        ]]
                    ],
                    return: when.resolve([[{ id: 'theDetailFirst' }]]) // TODO: do not load removed records. Generalize "remove" command instead, if possible
                }
            );
            comet.unsubscribe.mockStep(
                function (channelId, hubListener) {
                    test.equal(channelId, 'theProfile:theDetailBinding:id=theDetailFirst');
                    test.equal(detailBindingHubListener, hubListener);
                }
            );
            comet.pushToClient.mockStep(
                ['theConnection', '!theOpenedProfile:theJunctionBinding',
                    ['remove', { masterId: 'theMasterFirst', detailId: 'theDetailFirst' }]],
                ['theConnection', '!theOpenedProfile:theDetailBinding',
                    ['remove', { id: 'theDetailFirst' }]]
            );
            chain.mockStep(
                next(saveJunctionAgain)
            );
            junctionFirstBindingHubListener('theProfile:theJunctionBinding:masterId=theMasterFirst',
                ['remove', {masterId: 'theMasterFirst', detailId: 'theDetailFirst'}]);
        }


        function saveJunctionAgain() {

            // Save junction record, while detail is already saved
            externalDataLoader.mockStep(
                {
                    arguments: [
                        // requestParams
                        [[
                            'theProfile',
                            'theDetailBinding',
                            {
                                'theMasterBinding.id': ['theMasterFirst', 'theMasterSecond'],
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
                next(saveJunctionSecondMasterToFirstDetail)
            );
            junctionFirstBindingHubListener('theProfile:theJunctionBinding:masterId=theMasterFirst',
                ['add', {masterId: 'theMasterFirst', detailId: 'theDetailFirst'}]);
        }


        function saveJunctionSecondMasterToFirstDetail() {

            // Save master record
            externalDataLoader.mockStep(
            );
            comet.unsubscribe.mockStep(
            );
            comet.subscribe.mockStep(
            );
            comet.pushToClient.mockStep(
                ['theConnection', '!theOpenedProfile:theJunctionBinding',
                    ['add', {masterId: 'theMasterSecond', detailId: 'theDetailFirst'}]]
            );
            junctionSecondBindingHubListener('theProfile:theJunctionBinding:masterId=theMasterSecond',
                ['add', {masterId: 'theMasterSecond', detailId: 'theDetailFirst'}]);

            deleteFirstJunctionAgain();
        }


        function deleteFirstJunctionAgain() {

            // Save junction record, while detail is already saved
            externalDataLoader.mockStep(
            );
            comet.unsubscribe.mockStep(
            );
            comet.pushToClient.mockStep(
                ['theConnection', '!theOpenedProfile:theJunctionBinding',
                    ['remove', { masterId: 'theMasterFirst', detailId: 'theDetailFirst' }]]
            );
            junctionFirstBindingHubListener('theProfile:theJunctionBinding:masterId=theMasterFirst',
                ['remove', {masterId: 'theMasterFirst', detailId: 'theDetailFirst'}]);

            deleteSecondJunction();
        }


        function deleteSecondJunction() {

            // Save junction record, while detail is already saved
            externalDataLoader.mockStep(
                {
                    arguments: [
                        // requestParams
                        [[
                            'theProfile',
                            'theDetailBinding',
                            {
                                'theMasterBinding.id': ['theMasterFirst', 'theMasterSecond'],
                                'theJunctionBinding.detailId': ['theDetailFirst']
                            }
                        ]]
                    ],
                    return: when.resolve([[{ id: 'theDetailFirst' }]])
                }
            );
            comet.unsubscribe.mockStep(
                function (channelId, hubListener) {
                    test.equal(channelId, 'theProfile:theDetailBinding:id=theDetailFirst');
                    test.equal(detailBindingHubListener, hubListener);
                }
            );
            comet.pushToClient.mockStep(
                ['theConnection', '!theOpenedProfile:theJunctionBinding',
                    ['remove', { masterId: 'theMasterSecond', detailId: 'theDetailFirst' }]],
                ['theConnection', '!theOpenedProfile:theDetailBinding',
                    ['remove', { id: 'theDetailFirst' }]]
            );
            chain.mockStep(
                next(close)
            );
            junctionSecondBindingHubListener('theProfile:theJunctionBinding:masterId=theMasterSecond',
                ['remove', {masterId: 'theMasterSecond', detailId: 'theDetailFirst'}]);
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
                    test.equal(junctionFirstBindingHubListener, hubListener);
                },
                function(channelId, hubListener) {
                    test.equal(channelId, 'theProfile:theJunctionBinding:masterId=theMasterSecond');
                    test.equal(junctionSecondBindingHubListener, hubListener);
                }
            );
            comet.serverEvents.onLostConnection('theConnection');


            test.done();
        }
    }
};