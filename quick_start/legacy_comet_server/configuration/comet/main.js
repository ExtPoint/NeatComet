module.exports = {

	master: {
		name: 'Comet Server',
        maxCPUs: 2
	},

	components: {

        comet: {
            routes: {

                'open': 'neat/open',
                'close': 'neat/close',

                // Call on client php actions for test:
                // HelpOnClick.comet.request('php/nodejs_stat_log', {}, function(response) { console.log(response.responses[0]) })
                'php/*': 'proxy/appProxy'
            }
        }
	}

};