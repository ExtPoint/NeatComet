/**
 * @copyright Copyright 2014 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/**
 * @class NeatComet.Exception
 * @extends Joints.Object
 */
Joints.defineClass('NeatComet.Exception', Joints.Object, /** @lends NeatComet.Exception.prototype */{

	msg: null,

	constructor: function(msg) {

		this._super();

		this.msg = msg;
	}

}, {
    warning: function(msg) {
        if (typeof console !== 'undefined') {
            console.error("NeatComet warning: " + msg);
        }
    }
});
