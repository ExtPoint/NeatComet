module.exports = {

	master: {
	},

	actionNamespace: 'comet.actions',

	components: {

		comet: {
			className: 'Jii.components.comet.SockJsCometServer',
			host: '127.0.0.1',
			port: 3100,
			redisHost: '127.0.0.1',
			redisPort: 6379,
			apiTokens: [
				'override this in your config'
			]
		},

		time: {
			timezone: '+0000'
		},

		logger: {
			enable: true,
			level: 'info'
		},

		redis: {
			className: 'Jii.components.Redis',
			host: '127.0.0.1',
			port: 6379
		}
	},

	modules: {
	    neat: {
		    className: 'app.neat.NeatModule'
	    },
	    proxy: {
		    className: 'app.proxy.ProxyModule'
	    }
	},

	params: {
		phpServerUrl: ''
	}

};