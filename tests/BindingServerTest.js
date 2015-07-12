require('./bootstrap');
require('../src/lib/NeatCometServer'); // For intersectKeys, TODO: extract utils
require('../src/lib/bindings/BindingServer');

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
    }
};