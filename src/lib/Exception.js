/**
 * @copyright Copyright 2014-2017 <a href="http://www.extpoint.com">ExtPoint</a>
 * @author <a href="http://koryagin.com">Pavel Koryagin</a>
 * @license MIT
 */

/**
 * @class NeatComet.Exception
 */
NeatComet.Exception = function(msg) {

    this.msg = msg;
};

NeatComet.Exception.prototype = {

    msg: null

};

NeatComet.Exception.warning = function(msg) {

    if (typeof console !== 'undefined') {
        console.error("NeatComet warning: " + msg);
    }
};
