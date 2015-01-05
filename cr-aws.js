angular.module('cr.aws', [])
.service('crAwsCognitoService', ['$q', '$rootScope', function($q, $rootScope) {
	
    
    
	var self = this; 
	
    var credentialsDefer = $q.defer(),
    credentialsPromise = credentialsDefer.promise;
	
    self._config = {};
    
    self._client = {};
    
	
    self.getIdentity = function() {
        console.log("sto ritornando promise cognito", self);
        self._client = credentialsPromise; 
        return credentialsPromise;
    };
//    self.setIdentity = function(providerId, token) {
//		
//        self._config = {
////            RoleArn: self.arn,
//            WebIdentityToken: token,
//            RoleSessionName: 'web-id'
//        }
//        if (providerId) {
//            self._config['ProviderId'] = providerId;
//          }
//       AWS.config.credentials = 
//            new AWS.WebIdentityCredentials(config);
//          credentialsDefer.resolve(AWS.config.credentials);
//        
//	};
	
	self.startCognito = function(callback) {
//		self.getIdentity().get(function() {
//			self._client = new AWS.CognitoSyncManager();
//			if(callback){
//				callback();
//			}
//		});
	};
	
	
	self.getSync =  function(datasetName) {
		var s = $q.defer();
		credentialsPromise.then(function(){
			self._client.openOrCreateDataset(datasetName, function(err, dataset) {
				var clientSync = {
					get: function(key) {

						var q2 = $q.defer();
						dataset.get(key, function(err, value) {
	                        console.log("COGNITO sto recuperando " + key + " con ", value);
							q2.resolve(value);
						});
						return q2.promise;
					},
					set: function(key, value) {
					    console.log("COGNITO sto settando " + key + " con ", value);
						var q2 = $q.defer();
						dataset.put(key, value, function(err, value) {
	                        console.log("COGNITO ho settato " + key + " con ", value);
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
	
	
	self.getDynamo = function(tableName) {
      var d = $q.defer();
      credentialsPromise.then(function(credentials) {
        //var table = dynamoCache.get(JSON.stringify(params));
        //if (!table) {
          table = new AWS.DynamoDB({credetnials: credentials, params: {TableName: tableName}});
          
          
          var tableService = {
			  get: function(key, type) {
				var q2 = $q.defer();
				  table.getItem({Key: {id: {S: key}}}, function(err, data) {
				    console.log(data.Item); // print the item data
				    q2.resolve(data);
				  });
				 return q2.promise; 
			  },
			  set: function(key, value) {
				    console.log("DYNAMO sto settando " + key + " con ", value);
					var q2 = $q.defer();
					var itemParams = {Item: {id: {S: key}, data: {S: value}}};
					table.putItem(itemParams, function(err, value) {
	                    console.log("DYNAMO ho settato " + key + " con ", value);
						q2.resolve(value);
					});
					return q2.promise;
				}
          };
          //dynamoCache.put(JSON.stringify(params), table);
        //}
        d.resolve(tableService);
      });
      return d.promise;
    };
	
	
	self.set = function(datasetName, key, value) {
		var s = $q.defer();
		credentialsPromise.then(function(){
			self._client.openOrCreateDataset(datasetName, function(err, dataset) {
				s.resolve(dataset);
				
			});
		});
		s.promise.then(function(dataset) {
			dataset.put(key, value, function(err, value) {
				console.log(datasetName + ': '+ key+ ' -> ' + value);
				dataset.synchronize();
			});
		});
	};
	self.get = function(datasetName, key) {
		var s = $q.defer();
		credentialsPromise.then(function(){
			self._client.openOrCreateDataset(datasetName, function(err, dataset) {
				s.resolve(dataset);
			});
		});
		s.promise.then(function(dataset) {
			dataset.get(key, function(err, value) {
				console.log(datasetName + ': '+ key+ ' -> ' + value);
				dataset.synchronize();
			});
		});
	};
	
	self.build = function(config) {
		self._config = config;

		//AWS.config.credentials = new AWS.WebIdentityCredentials(this._config);
		//already logged as unauth user, switch to auth
		if(AWS.config.credentials && false) {
            AWS.config.credentials.params.RoleArn = self._config.RoleArnAuth;
            AWS.config.credentials.params.Logins = self._config.Logins;
            AWS.config.credentials.expired = true;
		}
		//not yet logged as auth or unauth, create the service
		else {

            var cognitoRequest = {
                AccountId: self._config.AccountId,
                IdentityPoolId: self._config.IdentityPoolId
            };
            if(self._config.Logins && self._config.RoleArnAuth) {
                cognitoRequest.RoleArn = self._config.RoleArnAuth;
                cognitoRequest.Logins = self._config.Logins;
                
    //            creds.params.Logins[providerName] = token;
    
                
            }
            else if(self._config.RoleArnUnauth) {
                cognitoRequest.RoleArn = self._config.RoleArnUnauth;
                delete cognitoRequest.Logins;
            }
            
            //if an arn (aut or unaht is setted process to credential
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
	
	
	$rootScope.$on('cr-auth:identity:login:success', function(event, data) {
//        if(data.provider == "google" && data.auth.id_token) {
//            config.WebIdentityToken = data.auth.id_token;
//        }
	    if(data.provider == "cognito") {
	        return false;
	    }
        if(data.provider == "google" && data.auth.id_token) {
            self._config.Logins = {"accounts.google.com": data.auth.id_token };
        }
        
        
//      RoleSessionName: 'web-id'
//  }
//  if (providerId) {
//      self._config['ProviderId'] = providerId;
//    }
	    self.build(self._config);
    });
	
	
}])
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
	
	this.setCognito = function(config) {
		 for (var key in config) {
			 this._config.cognito[key] = config[key];
		 }
	};
	
	this.$get = ['$q', 'crAwsCognitoService', function($q, crAwsCognitoService) {

//        var credentialsDefer = $q.defer(),
//        credentialsPromise = credentialsDefer.promise;
		
		return {
			cognito: crAwsCognitoService.build(this._config.cognito)
		};
	}];
});



/*
angular.module('cr.aws', [])
.service('crAwsService', function() {
    this._config = {};
    
    this.build = function(config) {
        this._config = config;
        return this;
    };
    
})
.provider('crAws', function(){
    
//   this.$get = ['crAwsService', function(crAwsService) {
//       return crAwsService.build(this._config);
//   }];
    
    
    var self = this;
    
    self.services = {
        cognito: {
            arn: ""
        }
    };
    

    self.setRegion = function(region) {
      if (region) {
          AWS.config.region = region;
      }
    };
    

//    self.setArn = function(arn) {
//      if (arn) {
//          self.arn = arn;
//      }
//    };
    
    self.setConfig = function(service, key, value) {
      if(self.services[service]) {
          self.services[service][key] = value;
      }  
      console.log(self.services);
    };

    self.$get = ['$q', function($q) {
        
        var credentialsDefer = $q.defer(),
        credentialsPromise = credentialsDefer.promise;

        return {
          cognitoGetIdentity: function() {
              return credentialsPromise;
          },
          cognitoSetIdentity: function(token, providerId) {
              var config = {
                  RoleArn: self.services.cognito.arn,
                  WebIdentityToken: token,
                  RoleSessionName: 'web-id'
              };
        
              if (providerId) {
                  config['ProviderId'] = providerId;
              }
              self.config = config;
              console.log("sto settanto cognito", config);
              AWS.config.credentials = new AWS.WebIdentityCredentials(config);
              credentialsDefer.resolve(AWS.config.credentials);
          }
//          ,
//          s3: function(params) {
//              var d = $q.defer();
//              credentialsPromise.then(function() {
//                var s3Obj = s3Cache.get(JSON.stringify(params));
//                if (!s3Obj) {
//                  s3Obj = new AWS.S3(params);
//                  s3Cache.put(JSON.stringify(params), s3Obj);
//                }
//                d.resolve(s3Obj);
//              });
//              return d.promise;
//            }
        };
        
    }];
    
   
});



/*


angular.module('cr.aws', [])
.provider('AWSService', function() {
  var self = this;
 
  // Set defaults
  AWS.config.region = 'eu-west-1';
 
  self.arn = null;
 
  self.setArn = function(arn) {
    if (arn) {
    	self.arn = arn;
    }
  };
  
  self.setCognito = function(credentials) {
	  AWS.config.credentials = new AWS.CognitoIdentityCredentials(credentials);  
  };
  self.startCognito = function(callback) {
	  AWS.config.credentials.get(function() {
		  self._client = new AWS.CognitoSyncManager();
		  callback();
	  });
  };
  self.testDataset = function() {
	  self._client.openOrCreateDataset('myDatasetName', function(err, dataset) {
		  	dataset.get('myRecord', function(err, value) {
			  console.log('myRecord get 1: ' + value);
			});

			dataset.put('newRecord', 'newValue', function(err, record) {
				  console.log('newRecord put: ' + record);
			});
			
		 	dataset.get('newRecord', function(err, value) {
			  console.log('newRecord get 2: ' + value);
			});
		 	
		 	
		 	
		 	dataset.synchronize({

		 		  onSuccess: function(dataset, newRecords) {
		 		     console.log("successo");
		 		  },

		 		  onFailure: function(err) {
		 			 console.log("fallimento");
		 		  },

		 		  onConflict: function(dataset, conflicts, callback) {

		 		     var resolved = [];

		 		     for (var i=0; i<conflicts.length; i++) {

		 		        // Take remote version.
		 		        resolved.push(conflicts[i].resolveWithRemoteRecord());

		 		        // Or... take local version.
		 		        // resolved.push(conflicts[i].resolveWithLocalRecord());

		 		        // Or... use custom logic.
		 		        // var newValue = conflicts[i].getRemoteRecord().getValue() + conflicts[i].getLocalRecord().getValue();
		 		        // resolved.push(conflicts[i].resovleWithValue(newValue);

		 		     }

		 		     dataset.resolve(resolved, function() {
		 		        return callback(true);
		 		     });

		 		     // Or... callback false to stop the synchronization process.
		 		     // return callback(false);

		 		  },

		 		  onDatasetDeleted: function(dataset, datasetName, callback) {

		 		     // Return true to delete the local copy of the dataset.
		 		     // Return false to handle deleted datasets outsid ethe synchronization callback.

		 		     return callback(true);

		 		  },

		 		  onDatasetMerged: function(dataset, datasetNames, callback) {

		 		     // Return true to continue the synchronization process.
		 		     // Return false to handle dataset merges outside the synchroniziation callback.

		 		     return callback(false);

		 		  }

		 		});
		 	
		 	

//			dataset.remove('oldKey', function(err, record) {
//			  console.log(success);
//			});
	  });
  };
 
  self.setRegion = function(region) {
    if (region) {
    	AWS.config.region = region;
    }
  };
 
  self.setLogger = function(logger) {
    if (logger) {
    	AWS.config.logger = logger;
    }
  };
  
  self.$get = function($q, $cacheFactory) {
    var s3Cache = $cacheFactory('s3Cache'),
        dynamoCache = $cacheFactory('dynamo'),
        snsCache = $cacheFactory('sns'),
        sqsCache = $cacheFactory('sqs');
        credentialsDefer = $q.defer();
        credentialsPromise = credentialsDefer.promise;
 
    return {
      credentials: function() {
        return credentialsPromise;
      },
      setToken: function(token, providerId) {
        var config = {
          RoleArn: self.arn,
          WebIdentityToken: token,
          RoleSessionName: 'web-id'
        };
        if (providerId) {
          config['ProviderId'] = providerId;
        }
        self.config = config;
        AWS.config.credentials = 
          new AWS.WebIdentityCredentials(config);
        credentialsDefer.resolve(AWS.config.credentials);
      },
      s3: function(params) {
        var d = $q.defer();
        credentialsPromise.then(function() {
          var s3Obj = s3Cache.get(JSON.stringify(params));
          if (!s3Obj) {
            s3Obj = new AWS.S3(params);
            s3Cache.put(JSON.stringify(params), s3Obj);
          }
          d.resolve(s3Obj);
        });
        return d.promise;
      },
      dynamo: function(params) {
        var d = $q.defer();
        credentialsPromise.then(function() {
          var table = dynamoCache.get(JSON.stringify(params));
          if (!table) {
            table = new AWS.DynamoDB(params);
            dynamoCache.put(JSON.stringify(params), table);
          }
          d.resolve(table);
        });
        return d.promise;
      },
      sns: function(params) {
        var d = $q.defer();
        credentialsPromise.then(function() {
          var sns = snsCache.get(JSON.stringify(params));
          if (!sns) {
            sns = new AWS.SNS(params);
            snsCache.put(JSON.stringify(params), sns);
          }
          d.resolve(sns);
        });
        return d.promise;
      },
      sqs: function(params) {
        var d = $q.defer();
        credentialsPromise.then(function() {
          var url = sqsCache.get(JSON.stringify(params)),
              queued = $q.defer();
          if (!url) {
            var sqs = new AWS.SQS();
            sqs.createQueue(params, function(err, data) {
              if (data) {
                url = data.QueueUrl;
                sqsCache.put(JSON.stringify(params), url);
                queued.resolve(url);
              } else {
                queued.reject(err);
              }
            });
          } else {
            queued.resolve(url);
          }
          queued.promise.then(function(url) {
            var queue = new AWS.SQS({params: {QueueUrl: url}});
            d.resolve(queue);
          });
        });
        return d.promise; 
      }
    };
  };
});

*/