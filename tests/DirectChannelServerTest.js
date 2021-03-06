require('./bootstrap');
require('../src/lib/NeatCometServer'); // For intersectKeys, TODO: extract utils
require('../src/lib/channels/BaseChannelServer');
require('../src/lib/channels/DirectChannelServer');

function initSubject() {

    var directChannelSever = new NeatComet.channels.DirectChannelServer;

    // Stub
    directChannelSever.binding = {
        id: 'theBinding',
        profileId: 'theProfile',
        match: null,
        channelTemplate: null
    };

    directChannelSever.init();

    return directChannelSever;
}

/**
 * @param {NodeUnit} test
 * @param {Object} binding
 * @param {Object} bindingAppliedParams
 * @param {Function} testChannels
 */
function testOpenProfile(test, binding, bindingAppliedParams, testChannels) {

    var directChannelServer = initSubject();

    // Mock
    var requestParams = {}; // Contents does not matter
    var ultimateChannelSender;
    var channelSender = function() {};

    directChannelServer.binding.applyRequestToMatchObject = function(request) {
        test.equal(arguments.length, 1);
        test.equal(request, requestParams);
        return bindingAppliedParams;
    };

    directChannelServer.binding.composeJsFilter = function(sender, openedProfile) {
        test.equal(arguments.length, 2);
        test.ok(_.isFunction(sender));
        test.strictEqual(openedProfile, theOpenedProfile);

        // Remember to test further
        ultimateChannelSender = sender;

        return channelSender;
    };

    _.extend(directChannelServer.binding, binding);

    var theOpenedProfile = {
        id: 'theOpenedProfile',
        requestParams: requestParams,

        /**
         * @param {string} bindingId
         * @param {NeatComet.channels.ChannelsMap} channelsMap
         * @param {Function} [directSender]
         */
        addChannels: function(bindingId, channelsMap, directSender) {
            test.equal(arguments.length, 3);
            test.equal(bindingId, 'theBinding');
            test.ok(_.isFunction(directSender));
            test.equal(ultimateChannelSender, directSender);

            testChannels(channelsMap, channelSender);

            // Test directSender, see pushToClient below
            directSender('theSourceChannel (unused)', ["add", { 'y': 1 }]);
        },

        connection: {
            connectionId: 'theConnection',
            comet: {
                pushToClient: function(connectionId, channel, data) {
                    test.equal(arguments.length, 3);
                    test.equal(connectionId, 'theConnection');
                    test.equal(channel, '!theOpenedProfile:theBinding');
                    test.deepEqual(data, ["add", { 'y': 1 }]);
                }
            }
        },

        pushers: {}
    };

    // Test
    directChannelServer.openProfile(theOpenedProfile);
}

module.exports = {

    /**
     * @param {NodeUnit} test
     */
    "test primitives": function(test) {

        var directChannelServer = initSubject();


        // Test init
        test.equal(directChannelServer.channelPrefix, 'theProfile:theBinding:');


        // Test push
        directChannelServer.push(

            // openedProfile: NeatComet.router.OpenedProfileServer
            {
                id: 'theOpenedProfile',
                connection: {
                    connectionId: 'theConnection',
                    comet: {
                        pushToClient: function(connectionId, channel, data) {
                            test.equal(arguments.length, 3);
                            test.equal(connectionId, 'theConnection');
                            test.equal(channel, '!theOpenedProfile:theBinding');
                            test.deepEqual(data, ["add", { 'x': 1 }]);
                        }
                    }
                },
                pushers: {}
            },

            // message
            ["add", { 'x': 1 }]
        );

        test.expect(5);
        test.done();
    },

    /**
     * @param {NodeUnit} test
     */
    "test openProfile in CONSTANT_CHANNEL mode": function(test) {

        testOpenProfile(
            test,
            {
                // Empty binding
            },
            {
                'theAttribute': 'theValue',
                'theConstantAttribute': 'theConstantValue'
            },
            function (channelsMap, sender) {

                test.deepEqual(channelsMap, { 'theProfile:theBinding:1': sender });
            }
        );

        test.expect(14);
        test.done();
    },

    /**
     * @param {NodeUnit} test
     */
    "test openProfile with match": function(test) {

        testOpenProfile(
            test,
            {
                match: {
                    theAttribute: 'theMatchValue'
                }
            },
            {
                'theAttribute': 'theValue',
                'theConstantAttribute': 'theConstantValue'
            },
            function (channelsMap, sender) {

                test.deepEqual(
                    channelsMap,
                    { 'theProfile:theBinding:theAttribute=theValue:theConstantAttribute=theConstantValue': sender }
                );
            }
        );

        test.expect(14);
        test.done();
    },

    /**
     * @param {NodeUnit} test
     */
    "test openProfile with channelTemplate": function(test) {

        testOpenProfile(
            test,
            {
                channelTemplate: '{theAttribute}:{theConstantAttribute}'
            },
            {
                'theAttribute': 'theValue',
                'theConstantAttribute': 'theConstantValue'
            },
            function (channelsMap, sender) {

                test.deepEqual(
                    channelsMap,
                    { 'theProfile:theBinding:theValue:theConstantValue': sender }
                );
            }
        );

        test.expect(14);
        test.done();
    },

    /**
     * @param {NodeUnit} test
     */
    "test openProfile with channelTemplate and multiple values in request": function(test) {

        testOpenProfile(
            test,
            {
                channelTemplate: '{theAttribute}:{theConstantAttribute}'
            },
            {
                'theAttribute': ['theValue1', 'theValue2', null],
                'theConstantAttribute': 'theConstantValue'
            },
            function (channelsMap, sender) {

                test.deepEqual(
                    channelsMap,
                    {
                        'theProfile:theBinding:theValue1:theConstantValue': sender,
                        'theProfile:theBinding:theValue2:theConstantValue': sender,
                        'theProfile:theBinding::theConstantValue': sender
                    }
                );
            }
        );

        test.expect(20);
        test.done();
    },

    /**
     * @param {NodeUnit} test
     */
    "test openProfile with match and multiple values in request": function(test) {

        testOpenProfile(
            test,
            {
                match: {
                    theAttribute: 'theMatchValue'
                }
            },
            {
                'theAttribute': ['theValue1', 'theValue2', null],
                'theConstantAttribute': 'theConstantValue'
            },
            function (channelsMap, sender) {

                test.deepEqual(
                    channelsMap,
                    {
                        'theProfile:theBinding:theAttribute=theValue1:theConstantAttribute=theConstantValue': sender,
                        'theProfile:theBinding:theAttribute=theValue2:theConstantAttribute=theConstantValue': sender,
                        'theProfile:theBinding:theAttribute:theConstantAttribute=theConstantValue': sender
                    }
                );
            }
        );

        test.expect(20);
        test.done();
    }
};