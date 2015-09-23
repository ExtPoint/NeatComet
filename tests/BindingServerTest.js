require('./bootstrap');
require('../src/lib/NeatCometServer'); // For intersectKeys, TODO: extract utils
require('../src/lib/bindings/BindingServer');

/**
 * @param {Object} definition
 * @returns {NeatComet.bindings.BindingServer}
 */
function initSubject(definition) {

    // Mock
    Joints.namespace('NeatComet.channels.BaseChannelServer');
    NeatComet.channels.BaseChannelServer.create = function() {
        return {
            init: function() {}
        };
    };

    return new NeatComet.bindings.BindingServer(
        {},
        'theProfile',
        'theBinding',
        definition
    );
}

/**
 * @param {NodeUnit} test
 * @param definition
 * @param applyRequestResult
 * @param applyAttributesResult
 */
function testApplyXxxToMatchObject(test, definition, applyRequestResult, applyAttributesResult) {

    var request = {
        theRequestScalar: 'theRequestScalarValue',
        theRequestIrrelevant: 'theRequestIrrelevantValue',
        "theRequest.Multiple": ['theRequestMultiple1', 'theRequestMultiple2', null],
        theConst: 'thisValueMustBeOverridden'
    };
    var attributes = {
        theAttributesScalar: 'theAttributesScalarValue',
        theAttributesIrrelevant: 'theAttributesIrrelevantValue',
        theConst: 'theAttributesConstValue'
    };

    var bindingServer = initSubject(definition);

    test.deepEqual(
        bindingServer.applyRequestToMatchObject(request),
        applyRequestResult
    );

    test.deepEqual(
        bindingServer.applyAttributesToMatchObject(attributes),
        applyAttributesResult
    );
}

/**
 * @param {NodeUnit} test
 * @param {Array} challenge
 * @param {?Array} response
 */
function testJsFilter(test, challenge, response) {

    var bindingServer = initSubject({
        where: 'model.theAttribute >= {theRequestParam}'
    });

    var jsFilter = bindingServer.composeJsFilter(
        response ?
            test.mockFunction('sender', ['theChannel', response]) :
            test.mockFunction('sender'),
        // openedProfile: NeatComet.router.OpenedProfileServer
        {
            requestParams: {
                'theRequestParam': 'theMatchingValue'
            }
        }
    );

    jsFilter('theChannel', challenge);
}

module.exports = {

    /**
     * @param {NodeUnit} test
     */
    "test apply***ToMatchObject": function(test) {

        testApplyXxxToMatchObject(test,
            {},
            {},
            {}
        );

        testApplyXxxToMatchObject(test,
            {
                match: {
                    theAttributesScalar: 'theRequestScalar'
                }
            },
            { theAttributesScalar: 'theRequestScalarValue' },
            { theAttributesScalar: 'theAttributesScalarValue' }
        );

        testApplyXxxToMatchObject(test,
            {
                match: {
                    theAttributesScalar: 'theRequestScalar'
                },
                matchConst: {
                    theConst: 'theConstValue'
                }
            },
            { theAttributesScalar: 'theRequestScalarValue', theConst: 'theConstValue' },
            { theAttributesScalar: 'theAttributesScalarValue', theConst: 'theAttributesConstValue' }
        );

        testApplyXxxToMatchObject(test,
            {
                match: {
                    theAttributesScalar: ['theRequestScalar', 'theRequest.Multiple']
                },
                matchConst: {
                    theConst: 'theConstValue'
                }
            },
            { theAttributesScalar: ['theRequestScalarValue', 'theRequestMultiple1', 'theRequestMultiple2', null], theConst: 'theConstValue' },
            { theAttributesScalar: 'theAttributesScalarValue', theConst: 'theAttributesConstValue' }
        );

        testApplyXxxToMatchObject(test,
            {
                match: {
                    theAttributesScalar: ['theRequestScalar', 'theRequest.Multiple']
                },
                matchConst: {
                    theAttributesScalar: 'theConstValue'
                }
            },
            { theAttributesScalar: ['theRequestScalarValue', 'theRequestMultiple1', 'theRequestMultiple2', null, 'theConstValue'] },
            { theAttributesScalar: 'theAttributesScalarValue' }
        );

        testApplyXxxToMatchObject(test,
            {
                match: {
                    theAttributesScalar: ['theRequestScalar', 'theRequest.Multiple']
                },
                matchConst: {
                    theAttributesScalar: ['theConstValue1', 'theConstValue2']
                }
            },
            { theAttributesScalar: ['theRequestScalarValue', 'theRequestMultiple1', 'theRequestMultiple2', null, 'theConstValue1', 'theConstValue2'] },
            { theAttributesScalar: 'theAttributesScalarValue' }
        );

        test.done();
    },

    /**
     * @param {NodeUnit} test
     */
    "test composeJsFilter direct": function(test) {

        var plainSender = function(){};

        var bindingServer = initSubject({
        });
        test.deepEqual(bindingServer.masterKeys, {});

        var jsFilter = bindingServer.composeJsFilter(
            plainSender,
            // openedProfile: NeatComet.router.OpenedProfileServer
            {}
        );

        test.strictEqual(jsFilter, plainSender);

        test.done();
    },

    /**
     * @param {NodeUnit} test
     */
    "test composeJsFilter for relations": function(test) {

        var bindingServer = initSubject({
        });

        // Mock masterKeys
        bindingServer.masterKeys = {
            'theMasterAttribute': [
                // Mock detail BindingServer
                {}
            ]
        };

        var mockSender = test.mockFunction('sender',
            ['theChannel', ["add", { 'id': 'theId', 'theAttribute': 'theMatchingValue', 'theMasterAttribute': 'theMasterValue' }]]
        );

        var jsFilter = bindingServer.composeJsFilter(
            mockSender,
            // openedProfile: NeatComet.router.OpenedProfileServer
            {
                updateMasterValues: test.mockFunction('updateMasterValues',
                    ['theBinding', 'theId', { 'theMasterAttribute': 'theMasterValue' }]
                )
            }
        );

        // Make sure it was covered
        test.notEqual(jsFilter, mockSender);

        jsFilter('theChannel', ["add", { 'id': 'theId', 'theAttribute': 'theMatchingValue', 'theMasterAttribute': 'theMasterValue' }]);

        test.done();
    },

    /**
     * @param {NodeUnit} test
     */
    "test composeJsFilter for JS-where": function(test) {

        // Test various command split combinations
        testJsFilter(test,
            ["add", { 'theAttribute': 'theIrrelevantValue' }],
            null
        );

        testJsFilter(test,
            ["add", { 'theAttribute': 'theMatchingValue', 'somePayload': 1 }],
            ["add", { 'theAttribute': 'theMatchingValue', 'somePayload': 1 }]
        );

        testJsFilter(test,
            ["remove", { 'theAttribute': 'theIrrelevantValue' }],
            null
        );

        testJsFilter(test,
            ["remove", { 'theAttribute': 'theMatchingValue' }],
            ["remove", { 'theAttribute': 'theMatchingValue' }]
        );

        testJsFilter(test,
            ["update",
                { 'theAttribute': 'theMatchingValue2', 'somePayload': 5 },
                { 'theAttribute': 'theMatchingValue' }
            ],
            ["update",
                { 'theAttribute': 'theMatchingValue2', 'somePayload': 5 },
                { 'theAttribute': 'theMatchingValue' }
            ]
        );

        testJsFilter(test,
            ["update",
                { 'theAttribute': 'theMatchingValue', 'somePayload': 2 },
                { 'theAttribute': 'theIrrelevantValue' }
            ],
            ["add", { 'theAttribute': 'theMatchingValue', 'somePayload': 2 }]
        );

        testJsFilter(test,
            ["update",
                { 'theAttribute': 'theIrrelevantValue', 'somePayload': 3 },
                { 'theAttribute': 'theMatchingValue' }
            ],
            ["remove", { 'theAttribute': 'theMatchingValue' }]
        );

        test.done();
    },

    /**
     * @param {NodeUnit} test
     */
    "test constructor": function(test) {

        var bindingServer;


        bindingServer = initSubject({
            channelTemplate: 'abc'
        });
        test.equal(bindingServer.channelTemplate, 'abc');
        test.strictEqual(bindingServer.match, null);


        bindingServer = initSubject({
            channelTemplate: 'abc{def}ghi{jkl}'
        });
        test.deepEqual(bindingServer.match, { 'def': 'def', 'jkl': 'jkl' });


        bindingServer = initSubject({
            match: ['abc', 'def']
        });
        test.deepEqual(bindingServer.match, { 'abc': 'abc', 'def': 'def' });


        test.done();
    },

    /**
     * @param {NodeUnit} test
     */
    "test primitives": function(test) {

        var bindingServer = initSubject({
        });

        test.equal(bindingServer.getIdFromAttributes({ 'id': 'abc', 'x': 'def' }), 'abc');

        test.done();
    },

    /**
     * @param {NodeUnit} test
     */
    "test initRelations": function(test) {

        function attempt(definition, expectedResult) {

            var allRelationsMock = {
                'theMasterBinding': {
                    masterKeys: {}
                }
            };

            var bindingServer = initSubject(definition);

            allRelationsMock[bindingServer.id] = bindingServer;

            bindingServer.initRelations(allRelationsMock);

            test.deepEqual(bindingServer.masterKeys, {});
            test.deepEqual(allRelationsMock.theMasterBinding.masterKeys, expectedResult(bindingServer));
        }


        attempt(
            {},
            function(bindingServer) { return {} }
        );


        attempt(
            {
                match: {
                    'theDetailAttribute': 'theMasterBinding.theMasterAttribute'
                }
            },
            function(bindingServer) {
                return {
                    theMasterAttribute: [bindingServer]
                }
            }
        );


        test.done();
    }

};