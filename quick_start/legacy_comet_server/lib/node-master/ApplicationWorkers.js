var _ = require('lodash');
var util = require('util');
var fs = require('fs');
var cluster = require('cluster');
var events = require('events');

process.setMaxListeners(30);

var ApplicationWorkers = function ApplicationWorkers(id, config) {
    this._id = id;
    this._config = _.merge({
        bootstrapFileName: 'main.js',
        name: id,
        maxCPUs: 1
		//maxRestarts: 10
		//restartAfterLimitRestarts: 60 // sec
    }, config || {});

    this._workers = {};
    this._workersIndexes = {};
    this._isMasterKilled = false;
    //this._countRestart = 0;

    events.EventEmitter.call(this);

    this.init();
}

util.inherits(ApplicationWorkers, events.EventEmitter);

_.extend(ApplicationWorkers.prototype, {

    init: function () {
    },

    run: function() {
        for (var i=0; i < this._config.maxCPUs; i++) {
            this._runWorker();
        }
    },

    killAll: function() {
        this._isMasterKilled = true;

        _.each(this._workers, function(worker) {
            if (!worker || !worker.process.pid) {
                return;
            }

	        this._workers[worker.process.pid] = null;
	        this._workersIndexes[worker.process.pid] = null;

            process.kill(worker.process.pid);
        }.bind(this));
    },

	_getNextWorkerIndex: function() {
		var index = 0;
		while (true) {
			// Find index for check already used
			var isUsed = false;
			for (var pid in this._workersIndexes) {
				if (this._workersIndexes.hasOwnProperty(pid) && this._workersIndexes[pid] === index) {
					isUsed = true;
					break;
				}
			}

			if (!isUsed) {
				return index;
			}

			index++;
		}
	},

    _runWorker: function() {
        if (this._isMasterKilled/* || this._countRestart >= this._config.maxRestarts*/) {
			/*if (this.restartAfterLimitRestarts) {
				setTimeout(_.bind(function() {
					this._countRestart = 0;
					this._runWorker();
				}, this), this.restartAfterLimitRestarts);
			}*/
            return;
        }

		//this._countRestart++;

	    var workerIndex = this._getNextWorkerIndex();
        var worker = cluster.fork({
			APPLICATION_NAME: this._id,
	        WORKER_INDEX: workerIndex
        });
        if (!worker) {
            console.info('Worker can not started (application id `%s`).', this._id);
            return;
        }

        console.info('Run worker: pid `%s`, application id `%s` (index %s).', worker.process.pid, this._id, workerIndex);

		// kill by time: 05:00 UTC tomorrow
		var now = new Date();
		var nextTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 5, 0, 0, 0).getTime();
		var killTime = nextTime - new Date().getTime() + Math.floor(Math.random()*1800000); // + разброс в 30 минут
		var timerId = setTimeout(function() {
			process.kill(worker.process.pid);
			console.log('KILL TIME!!!', killTime);
		}, killTime);

        worker.on('exit', function(code, signal) {
            clearInterval(timerId);
            this._onExit(worker, code, signal);
        }.bind(this));

        worker.on('message', function(message) {
            this.emit('message', this._id, worker, message);
        }.bind(this));

        this._workers[worker.process.pid] = worker;
	    this._workersIndexes[worker.process.pid] = workerIndex;
    },

    _onExit: function(worker, code, signal) {
        if (signal) {
            console.warn("Worker `%s` was killed by signal `%s`.", worker.process.pid, signal);
        } else if (code) {
            console.error("worker `%s` exited with error code: `%s`.", worker.process.pid, code);
        } else {
            console.log("worker was success exit!");
        }

        this._workers[worker.process.pid] = null;
	    this._workersIndexes[worker.process.pid] = null;

        // start another worker
        this._runWorker();
    }
});

module.exports = ApplicationWorkers;
