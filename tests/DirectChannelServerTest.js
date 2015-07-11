require('./bootstrap');
require('../src/lib/NeatCometServer'); // For intersectKeys, TODO: extract utils
require('../src/lib/channels/BaseChannelServer');
require('../src/lib/channels/DirectChannelServer');

function initSubject() {

    var directChannelSever = new NeatComet.channels.DirectChannelServer;

    // Stub
    directChannelSever.binding = {
        id: 'theBinding',
        profile: 'theProfile',
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

    directChannelServer.binding.applyRequestToMatchObject = function(request) {
        test.equal(arguments.length, 1);
        test.equal(request, requestParams);
        return bindingAppliedParams;
    };

    directChannelServer.binding.composeJsFilter = function(sender, params, openedProfile) {
        test.equal(arguments.length, 3);
        test.ok(_.isFunction(sender));
        test.deepEqual(params, bindingAppliedParams);
        test.strictEqual(openedProfile, theOpenedProfile);
        return sender;
    };

    _.extend(directChannelServer.binding, binding);

    var theOpenedProfile = {
        id: 'theOpenedProfile',
        requestParams: requestParams,

        /**
         * @param {NeatComet.channels.ChannelsMap} channelsMap
         * @param {Function} [directSender]
         */
        addChannels: function(channelsMap, directSender) {
            test.equal(arguments.length, 2);
            test.ok(_.isFunction(directSender));

            testChannels(channelsMap, directSender);

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
        }
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
                }
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
            function (channelsMap, directSender) {

                test.deepEqual(channelsMap, { 'theProfile:theBinding:1': directSender });
            }
        );

        test.expect(13);
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
            function (channelsMap, directSender) {

                test.deepEqual(
                    channelsMap,
                    { 'theProfile:theBinding:theAttribute=theValue:theConstantAttribute=theConstantValue': directSender }
                );
            }
        );

        test.expect(13);
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
            function (channelsMap, directSender) {

                test.deepEqual(
                    channelsMap,
                    { 'theProfile:theBinding:theValue:theConstantValue': directSender }
                );
            }
        );

        test.expect(13);
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
            function (channelsMap, directSender) {

                test.deepEqual(
                    channelsMap,
                    {
                        'theProfile:theBinding:theValue1:theConstantValue': directSender,
                        'theProfile:theBinding:theValue2:theConstantValue': directSender,
                        'theProfile:theBinding::theConstantValue': directSender
                    }
                );
            }
        );

        test.expect(21);
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
            function (channelsMap, directSender) {

                test.deepEqual(
                    channelsMap,
                    {
                        'theProfile:theBinding:theAttribute=theValue1:theConstantAttribute=theConstantValue': directSender,
                        'theProfile:theBinding:theAttribute=theValue2:theConstantAttribute=theConstantValue': directSender,
                        'theProfile:theBinding:theAttribute:theConstantAttribute=theConstantValue': directSender
                    }
                );
            }
        );

        test.expect(21);
        test.done();
    }
};