/**
 * Instance of Route.
 * Initial config setup.
 * Init route parameter
 */

var Route = function(options, cb) {
	for(url in options) {
		if(options[url].hasOwnProperty('url')) {
			window.routes 	= this;
			this.options 	= options;
		}
	}

	this.clearDiv 		= false;
	this.defaultRoute 	= null;
	this.currentRoute	= this.currentRoute ? this.currentRoute : null;
	this.location 		= window.location ? window.location : null;
	this.eventRef 		= $('*[data-route]');
	this.container 		= $("#pageContainer");
	this.activeClass 	= 'm-menu__item--expanded';

	/**
	 * Init route parameters
	 */
	this.prepareRoutes();

}


/**
 * Initialization of routes.
 */
Route.prototype.prepareRoutes = function(){

	// Default Route Executation
	this.defaultRoute = {};
	for(var index in routes.options) {
		if(routes.options[index].hasOwnProperty('default')) {
			this.defaultRoute[index] = routes.options[index];
			if(!this.location.hash.length)
				this.executeRoute(Object.keys(this.defaultRoute));
		}
	}
};


/**
 * Executation of route where XML request and response perform.
 */
var sourceR = null;
Route.prototype.executeRoute = function(route, options = null, cb = null) {

	if(sourceR) {
		sourceR.cancel('Operation canceled');
		// sourceR = null;
	}

	var self 			= this,
		CancelToken		= axios.CancelToken;
		sourceR 		= CancelToken.source();

	if(routes.options.hasOwnProperty(route)) {
		this.currentRoute 	= routes.options[route];

		var u = this.currentRoute.hasOwnProperty('url') ? this.currentRoute.url :
			  				options.hasOwnProperty('url') ? options.url : '404';


		/**
		 * Start Router XHR Process
		 */
		axios({

			  	url 	: u.trim(),
			  	method	: this.currentRoute.hasOwnProperty('method') ? this.currentRoute.method.toLowerCase() : 'get',
			  	cancelToken: sourceR.token,

			}).then( function(response) {
				if(!response.data && (response.data && response.data != '')) {
					return toastr.error("Something went Wrong");
				}

				// Remove Page Router Loader
				$("#renderPartialPage").find('.m-loader.page').remove();

				// Change Hash
				self.changeUrl(u);

				if(self.clearDiv) {
					$('.__route_container_class').html('');
				}

				// Has Container
				// Default : #renderPartialPage
				if(routes.options[route].hasOwnProperty('container')) {

					// Has Parent Route
					// Prepare Parent route before child route
					if(routes.options[route].hasOwnProperty('parentRoute')) {
						var prev_response 	= response,
							callback 		= routes.options[route].hasOwnProperty('callback') ? routes.options[route].callback : '',
							pageUrl 		= routes.options[route].hasOwnProperty('url') ? routes.options[route].url : routes.options[route];

						// Execute parent URL
						self.executeRoute(routes.options[route].parentRoute, null, function(){
							self.changeUrl(pageUrl.trim());
							$(routes.options[route].container).addClass('__route_container_class').html(prev_response.data);

							// Current URL callback
							if(callback) {
								window[callback](prev_response);
							}
						})
					}

				} else {
					self.container.addClass('__route_container_class').html(response.data);
				}

				// Add Active Class
				var pageUrl = options.hasOwnProperty('url') ? options.url : routes.options[route];
				if(routes.options[route].hasOwnProperty('class')) {

					routes.activeClass 	= routes.options[route].class;

					$(document).find('.'+routes.activeClass).removeClass(routes.activeClass);
					$('*[data-route="'+pageUrl+'"]').addClass(routes.activeClass);

				} else {

					$('*[data-route]').closest('li').siblings('li').removeClass(routes.activeClass+ " m-menu__item--open");
				  	$('*[data-route="'+pageUrl+'"]').closest('li').addClass(routes.activeClass+ " m-menu__item--open");
				}

				self.currentRoute.hasOwnProperty('callback') ? window[self.currentRoute['callback']](response) : '';

				(typeof cb === 'function') ? cb(response) : '';

				// If Has Initial Load on Parent
				if(routes.options[route].hasOwnProperty('initialLoad')) {
					return self.executeRoute(routes.options[route].initialLoad);
				}

			}).catch( function(error){
				showError(error);
				self.currentRoute.hasOwnProperty('callback') ? window[self.currentRoute['callback']](error) : '';
				$("#renderPartialPage").find('.m-loader.page').remove();
				(typeof cb === 'function') ? cb(error) : '';

			});

	} else {
		return this.notFound();
	}
}

/**
 * 404 Error for route path.
 */
Route.prototype.notFound = function() {
	$("#renderPartialPage").find('.m-loader.page').remove();
	toastr.error("View Not Found");
}


/**
 * Get Current URL
 * Current URL is defined on executeRoute method
 */
Route.prototype.getCurrentUrl = function() {
	return (this.currentRoute !== null) ? this.currentRoute.url : false;
}


/**
 * Reload Page using URL
 */
Route.prototype.redirect = function(url) {

	if(!url && url === '' || url === ' ') {
		toastr.error("Route Not Found");
	}

	routeIndex = url;
	if(url.split('/').length > 1) {
		routeIndex = routes.mapRoutes(url);
	}

	routes.executeRoute(routeIndex, {
		url: url
	});
}


/**
 * Change Hash path on browser
 */
Route.prototype.changeUrl = function(url = null) {
	var u = '';
	if(url) {
		u = url;
	} else {
		u = this.currentRoute.hasOwnProperty('url') ? this.currentRoute.url : url;
	}

	if(u.split('#').length > 1) {
		u = u.split('#')[1];
	}
	this.location.hash = u;
};


/**
 * Find dynamic placeholder of route
 */
Route.prototype.getPlaceholder = function(r) {

	var placeHolders = [];
	if(r.split("{").length >= 2){
		for(var i =0; i < r.split("{").length; i++) {
			if(r.split("{")[i].split('}').length >= 2) {
				placeHolders.push(r.split("{")[i].split('}')[0]);
			}
		}
	}
	return placeHolders;
};


/**
 * Get the defined dynamic route path using browser URL
 */

var matched = '';
var u = '';
Route.prototype.mapRoutes = function(url = null) {

	var r = '';
	if(url) {

		var prev = ''
		if(this.options.hasOwnProperty(url) && this.options[url].hasOwnProperty('url')) {
			return url;
		}

		for(var index in this.options) {

			if(index != prev) {
				u = '';
			}
			prev = index;

			if(index.split('/').length == url.split('/').length) {
				for(var i = 0; i <= index.split('/').length; i++) {
					if(index.split('/')[i] != undefined && index.split('/')[i].match(/\{(.*?)\}/g) == null) {
						if(index.split('/')[i].trim() == url.split('/')[i].trim()) {
							matched = true;
							if(matched) {
								u += index.split('/')[i]+'/';
							}
						} else {
							matched = false;
						}
					} else {
						if((index.split('/')[i] != undefined && url.split('/')[i] != undefined) && (index.split('/')[i].trim().match(/\{(.*?)\}/g) != null) && url.split('/')[i].trim().length) {
							matched = true;
							if(matched) {
								u += index.split('/')[i]+'/';
							}
						} else {
							matched = false;
						}
					}
				}

				if(url.split('/').length == u.replace(/.$/,"").split('/').length) {
					r = u.replace(/.$/,"");
				}
			} else {

			}
		}
		return r ? r : 'map not found';
	}

};


function removePrevClass(self) {
	if(routes.location.hash && routes.location.hash.split("#")[1].trim() != self.attr('data-route')) {
		var prevRoute = routes.mapRoutes(routes.location.hash.split("#")[1].trim());
		var prevRouteConfig = routes.options[prevRoute];
		if(!prevRouteConfig)
			return;
		var removeClassList = prevRouteConfig.hasOwnProperty('class') ? prevRouteConfig.class : false;
		if(removeClassList) {
			$('*[data-route="'+routes.location.hash.split("#")[1].trim()+'"]').removeClass(removeClassList);
		}
	}
}


/**
 * Event using *[data-route] attributes of DOM for route executation/navigation
 */
$(document).off('click','*[data-route]').on('click','*[data-route]', function(e) {

	var self 		= $(this),
		routeName 	= self.attr('data-route');

	if(routeName === '' || routeName === ' ') {
		toastr.error("Route Not Found");
	}

	if(routeName.split('/').length > 1) {
		routeName = routes.mapRoutes(routeName);
	}

	removePrevClass(self);
	$("#renderPartialPage").append('<div class="m-loader page" rel="pageLoader"><i class="mdi mdi-48px mdi-spin mdi-loading"></i></div>');

	routes.executeRoute(routeName, {
		url: self.attr('data-route')
	});
});


/**
 * On page reload get defined dynamic route using @mapRoutes method
 * process route params for callback and get dynamic content
 */

window.onload = function() {

	$("#renderPartialPage").append('<div class="m-loader page" rel="pageLoader"><i class="mdi mdi-48px mdi-spin mdi-loading"></i></div>');

	var url = window.location.hash.length ? window.location.hash : '';
	var routeIndex = url.split('#')[1];

	if(routeIndex && routeIndex.split('/').length > 1) {
		routeIndex = routes.mapRoutes(routeIndex);
	}
	if(url && url.split('#')[1] !== "undefined") {
		if(routes.currentRoute && routes.currentRoute.hasOwnProperty('default')) {
			// console.log("Default route detected");
		} else {
			if(Object.keys(window.routes).length && window.routes instanceof Route) {
				routes.executeRoute(routeIndex, {
					url: window.location.hash.split("#")[1]
				});
			}
		}
	}
}


/**
 * Hash Change Event
 */

var oldURL = [];
window.onhashchange = function(e) {
	oldURL.push(e.oldURL);
}

$(document).off('click','.redirect-back').on('click','.redirect-back', redirectBack);


function redirectBack(e) {

	if(typeof e !== "undefined") {
		e.preventDefault();
	}

	if(oldURL.length) {
		var lastURLIndex 	= oldURL.length - 1,
			url 			= oldURL[lastURLIndex],
			routeIndex 		= url.split("#")[1];

		if(routeIndex && routeIndex.split('/').length > 1) {
			routeIndex = routes.mapRoutes(routeIndex);
		}

		if(url && typeof url !== "undefined") {
			if(routes.currentRoute && routes.currentRoute.hasOwnProperty('default')) {
				// console.log("Default route detected");
			} else {
				if(Object.keys(window.routes).length && window.routes instanceof Route) {

					addFormLoader();
					routes.executeRoute(routeIndex, {
						url: url.split("#")[1]
					}, function() {
						removeFormLoader();
						oldURL.pop();
					});
				}
			}
		}
	} else {
		// console.warn('Direct jumped path detected');
	}
}


/**
 * Show Error Message On Response status > 500
 */
function showError(error) {
	if(error && error.response &&
		error.response.status && error.response.status >= 500 &&
		error.response.data) {

		// Display Errors
		for(var i = 0; i < error.response.data.length; i++) {
			if(error.response.data[i].type == "error") {
				toastr.error(error.response.data[i].data);
			}
		}

	}
}


new Route({
    'web/home': {
        url: 'web/home',
        default: true,
    },
    'web/about': {
        url: 'web/about',
    },
    'web/application': {
        url: 'web/application',
    },
    'web/partners': {
        url: 'roles',
    }
});
