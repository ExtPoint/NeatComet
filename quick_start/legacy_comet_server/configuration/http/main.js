module.exports = {

	master: {
		name: 'Http Server',
        maxCPUs: 1
	},

	components: {

        http: {
            className: 'Jii.components.router.ServerRouter',
            port: '3000',
            routes: {
                'stat/node': 'jii/cometApi'
            }
        }
	}

};