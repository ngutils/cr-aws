/**
 * Integration between AngularJs and AWS Js sdk
 */
angular.module('cr.aws', [])
/**
 * Cognito service
 * @see http://aws.amazon.com/cognito/
 */
.service('crAwsCognitoService', ['$q', '$rootScope', function($q, $rootScope) {
	var self = this;
    var credentialsDefer = $q.defer(),
    credentialsPromise = credentialsDefer.promise;
    self._config = {};
    self._client = {};

    /**
     * Get Identity
     * @return $q
     */
    self.getIdentity = function() {
        self._client = credentialsPromise;
        return credentialsPromise;
    };

    /**
     * Manage Sync in Cognito
     * @param String datasetName Name of dataset
     * @return $q
     */
	self.getSync =  function(datasetName) {
		var s = $q.defer();
		credentialsPromise.then(function(){
			self._client.openOrCreateDataset(datasetName, function(err, dataset) {
				var clientSync = {
					get: function(key) {

						var q2 = $q.defer();
						dataset.get(key, function(err, value) {
							q2.resolve(value);
						});
						return q2.promise;
					},
					set: function(key, value) {
						var q2 = $q.defer();
						dataset.put(key, value, function(err, value) {
							q2.resolve(value);
						});
						return q2.promise;
					},
					purge: function() {
					},
					remove: function() {
					},
					sync: function() {
						dataset.synchronize();
					}
				};
				s.resolve(clientSync);
			});
		});
		return s.promise;
	};

    /**
     * Return Dynamo with correct auth
     * @param Object tableName
     * @return $q
     */
	self.getDynamo = function(tableName) {
      var d = $q.defer();
      credentialsPromise.then(function(credentials) {
          table = new AWS.DynamoDB({credetnials: credentials, params: {TableName: tableName}});
          var tableService = {
			  get: function(key, type) {
				var q2 = $q.defer();
				  table.getItem({Key: {id: {S: key}}}, function(err, data) {
                    q2.resolve(data);
				  });
				 return q2.promise;
			  },
			  set: function(key, value) {
					var q2 = $q.defer();
					var itemParams = {Item: {id: {S: key}, data: {S: value}}};
					table.putItem(itemParams, function(err, value) {
						q2.resolve(value);
					});
					return q2.promise;
				}
          };
        d.resolve(tableService);
      });
      return d.promise;
    };

    /**
     * Create crAwsCognito
     * @param Object config
     * @return this
     */
	self.createService = function(config) {
		self._config = config;

		if(AWS.config.credentials && false) {
            AWS.config.credentials.params.RoleArn = self._config.RoleArnAuth;
            AWS.config.credentials.params.Logins = self._config.Logins;
            AWS.config.credentials.expired = true;
		}
		else {

            var cognitoRequest = {
                AccountId: self._config.AccountId,
                IdentityPoolId: self._config.IdentityPoolId
            };
            if(self._config.Logins && self._config.RoleArnAuth) {
                cognitoRequest.RoleArn = self._config.RoleArnAuth;
                cognitoRequest.Logins = self._config.Logins;
            }
            else if(self._config.RoleArnUnauth) {
                cognitoRequest.RoleArn = self._config.RoleArnUnauth;
                delete cognitoRequest.Logins;
            }

    		if(cognitoRequest.RoleArn) {
                AWS.config.credentials = new AWS.CognitoIdentityCredentials(cognitoRequest);
                AWS.config.credentials.get(function() {
                    self._client = new AWS.CognitoSyncManager();
                    credentialsDefer.resolve(self._client);
                    $rootScope.$broadcast("auth:login:success", {"provider": "cognito", "auth": self._client});
                });
    		}
            return self;
		}
	};

	$rootScope.$on('identity:login:success', function(event, data) {
	    if(data.provider == "cognito") {
	        return false;
	    }
        if(data.provider == "google" && data.auth.id_token) {
            self._config.Logins = {"accounts.google.com": data.auth.id_token };
        }
	    self.createService(self._config);
    });
}])

/**
 * CrAws Provider
 */
.provider('crAws', function() {
	AWS.config.region = 'eu-west-1';
	AWS.config.logger = console;
	this._config = {
		cognito: {
		    AccountId: "",
		    IdentityPoolId: "",
		    RoleArn: "",
		    RoleArnUnauth: "",
		    RoleArnAuth: "",
		    Logins: false
		}
	};

    /**
     * Configuration for Cognito
     * @param Object config
     */
	this.setCognito = function(config) {
		 for (var key in config) {
			 this._config.cognito[key] = config[key];
		 }
	};

	this.$get = ['$q', 'crAwsCognitoService', function($q, crAwsCognitoService) {
		return {
			cognito: crAwsCognitoService.createService(this._config.cognito)
		};
	}];
});
