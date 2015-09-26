/**
 * @copyright Copyright 2014 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/**
 * Basic class supports two types of initialization
 *
 * I. Single operator call. Note: init() is being called internally
 * var x = new X({
 *     abc: 123
 * });
 *
 * II. Explicit initialization
 * var x = new X; // Don't pass any parameter in constructor. init() won't be called implicitly.
 * x.abc = 123;
 * x.init();
 *
 * @class NeatComet.Object
 *
 * @param {Object.<string, *>} [config]
 */
NeatComet.Object = function(config) {

    if (config) {
        _.assign(this, config);
        this.init();
    }
};

NeatComet.Object.prototype = {

    init: function() {
    }

};

/**
 * Function to define subclasses
 *
 * It is a part of Backbone.js 1.2.3 http://backbonejs.org
 * (c) 2010-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 *
 * @param {Object} protoProps
 * @param {Object} [staticProps]
 */
NeatComet.Object.extend = function(protoProps, staticProps) {

    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
        child = protoProps.constructor;
    } else {
        child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent` constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
};