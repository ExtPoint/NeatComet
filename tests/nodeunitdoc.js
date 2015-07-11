/**
 * Never include this file. Created for jsdoc only
 * @class NodeUnit
 */
function NodeUnit() {}
NodeUnit.prototype = {

    fail: function (actual, expected, message, operator, stackStartFunction) {},

    ok: function (value, message) {},

    equal: function (actual, expected, message) {},

    notEqual: function (actual, expected, message) {},

    deepEqual: function (actual, expected, message) {},

    notDeepEqual: function (actual, expected, message) {},

    strictEqual: function (actual, expected, message) {},

    notStrictEqual: function (actual, expected, message) {},

    /**
     * @param block
     * @param [error]
     * @param [message]
     */
    throws: function(block, error, message) {},

    /**
     * @param block
     * @param [message]
     */
    doesNotThrow: function(block, message) {},

    ifError: function(err) {},

    /**
     * @param {number} amount
     */
    expect: function(amount) {},

    /**
     * @param [err]
     */
    done: function(err) {}
};