require('./bootstrap');
require('../src/lib/router/openedProfile/LimitsServer');

module.exports = {

    /**
     * @param {NodeUnit} test
     */
    "test simple flow": function(test) {

        var limits = new NeatComet.router.openedProfile.LimitsServer;

        // With no limit set, allow all
        test.equal(
            limits.match('theBinding', 'theValue'),
            true
        );


        // Closed range
        limits.update('theBinding', 'b', 'c');
        test.equal(
            limits.match('theBinding', 'bb'),
            true
        );
        test.equal(
            limits.match('theBinding', 'a'),
            false
        );
        test.equal(
            limits.match('theBinding', 'd'),
            false
        );


        // Opened up range
        limits.update('theBinding', 'b', null);
        test.equal(
            limits.match('theBinding', 'bb'),
            true
        );
        test.equal(
            limits.match('theBinding', 'a'),
            false
        );
        test.equal(
            limits.match('theBinding', 'd'),
            true
        );


        // Opened down range
        limits.update('theBinding', null, 'c');
        test.equal(
            limits.match('theBinding', 'bb'),
            true
        );
        test.equal(
            limits.match('theBinding', 'a'),
            true
        );
        test.equal(
            limits.match('theBinding', 'd'),
            false
        );


        // Reset range
        limits.update('theBinding', null, null);
        test.equal(
            limits.match('theBinding', 'bb'),
            true
        );
        test.equal(
            limits.match('theBinding', 'a'),
            true
        );
        test.equal(
            limits.match('theBinding', 'd'),
            true
        );


        test.done();
    },


    /**
     * @param {NodeUnit} test
     */
    "test extractAndUpdate": function(test) {

        var limits = new NeatComet.router.openedProfile.LimitsServer;

        var theBinding = {
            id: 'theBinding',
            limitParam: 'theLimitParam',
            limitOrder: ['theAttribute', 'DESC']
        };


        // Test on set
        limits.extractAndUpdate(theBinding, {
            theLimitParam: [1, 1] // Note: numbers do not count. Checking for null/not-null
        }, [
            { 'theAttribute': 'b' },
            { 'theAttribute': 'c' }
        ]);

        test.deepEqual(
            limits.getRange('theBinding'),
            ['b', 'c']
        );
        test.equal(
            limits.match('theBinding', 'bb'),
            true
        );
        test.equal(
            limits.matchRecord(theBinding, { 'theAttribute': 'bb' }),
            true
        );
        test.equal(
            limits.match('theBinding', 'a'),
            false
        );
        test.equal(
            limits.matchRecord(theBinding, { 'theAttribute': 'a' }),
            false
        );
        test.equal(
            limits.match('theBinding', 'd'),
            false
        );


        // Test on empty set
        limits.extractAndUpdate(theBinding, {
            theLimitParam: [1, 1] // Note: numbers do not count. Checking for null/not-null
        }, []);

        test.deepEqual(
            limits.getRange('theBinding'),
            [null, null]
        );
        test.equal(
            limits.match('theBinding', 'bb'),
            true
        );
        test.equal(
            limits.match('theBinding', 'a'),
            true
        );
        test.equal(
            limits.match('theBinding', 'd'),
            true
        );


        // Test on closed set with opened limit
        limits.extractAndUpdate(theBinding, {
            theLimitParam: 1 // Note: numbers do not count. Checking for null/not-null
        }, [
            { 'theAttribute': 'b' },
            { 'theAttribute': 'c' }
        ]);
        test.deepEqual(
            limits.getRange('theBinding'),
            ['b', null]
        );
        test.equal(
            limits.match('theBinding', 'bb'),
            true
        );
        test.equal(
            limits.match('theBinding', 'a'),
            false
        );
        test.equal(
            limits.match('theBinding', 'd'),
            true
        );


        var theBindingAscending = {
            id: 'theBinding',
            limitParam: 'theLimitParam',
            limitOrder: ['theAttribute', 'ASC']
        };


        // Test on closed set with opened limit
        limits.extractAndUpdate(theBindingAscending, {
            theLimitParam: 1 // Note: numbers do not count. Checking for null/not-null
        }, [
            { 'theAttribute': 'b' },
            { 'theAttribute': 'c' }
        ]);
        test.deepEqual(
            limits.getRange('theBinding'),
            [null, 'c']
        );
        test.equal(
            limits.match('theBinding', 'bb'),
            true
        );
        test.equal(
            limits.match('theBinding', 'a'),
            true
        );
        test.equal(
            limits.match('theBinding', 'd'),
            false
        );



        test.done();
    }
};