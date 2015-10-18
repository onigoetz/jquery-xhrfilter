
var $ = window.jQuery;

var ajaxMiddlewares = [];
$.ajaxRegisterMiddleware = function (middleware) {
    ajaxMiddlewares.push(middleware);
};

function MiddlewareCaller(method, backwards, deferredHelpers, final) {
    this.method = method;
    this.backwards = backwards;
    this.middlewares = ajaxMiddlewares;
    this.helpers = deferredHelpers;
    this.final = final;

    this.current = (this.backwards)? this.middlewares.length : -1;
}

/** Goes backward **/
MiddlewareCaller.prototype.runSync = function() {
    this.args = [];
    for (var i in arguments) {
        this.args.push(arguments[i]);
    }

    for (var j = this.middlewares.length; j >= 0; --j) {
        if (this.middlewares.hasOwnProperty(j) && this.middlewares[j].hasOwnProperty(this.method)) {
            this.middlewares[j][this.method].apply(null, this.args);
        }
    }
};

/** Goes Forward **/
MiddlewareCaller.prototype.run = function() {
    this.args = [];
    for (var i in arguments) {
        this.args.push(arguments[i]);
    }
    this.args.push(this.helpers);
    this.args.push(this.next.bind(this));

    this.next();
};

MiddlewareCaller.prototype.next = function() {
    this.current = (this.backwards)? this.current - 1 : this.current + 1;
    if (this.middlewares.hasOwnProperty(this.current) && this.middlewares[this.current].hasOwnProperty(this.method)) {
        this.middlewares[this.current][this.method].apply(null, this.args);
    } else {
        // We call this one as we finished going through all middlewares
        this.final();
    }
};

var originalAjax = $.ajax;
$.ajax = function (url, options) {

    // If url is an object, simulate pre-1.5 signature
    if (typeof url === "object") {
        options = url;
        url = undefined;
    }

    // Force options to be an object
    options = options || {};

    // Save the url in the options in case of retry
    if (url) {
        options.url = url;
    }

    var innerXHR;


    // Emulate a jqXHR object
    // ----------------------------------------------------------------------------

    var outerXHR = {
        readyState: 0,

        // Builds headers hashtable if needed
        getResponseHeader: function (key) {
            return (innerXHR) ? innerXHR.getResponseHeader(key) : null;
        },

        // Raw string
        getAllResponseHeaders: function () {
            return (innerXHR) ? innerXHR.getAllResponseHeaders() : null;
        },

        // Caches the header
        setRequestHeader: function (name, value) {
            if (innerXHR) {
                innerXHR.setRequestHeader(name, value);
            }
            return this;
        },

        // Overrides response content-type header
        overrideMimeType: function (type) {
            //TODO :: keep this information if there is an other ajax request to do
            if (innerXHR) {
                innerXHR.overrideMimeType(type);
            }
            return this;
        },

        // Status-dependent callbacks
        statusCode: function (map) {
            //TODO :: keep this information if there is an other ajax request
            if (innerXHR) {
                innerXHR.statusCode(map);
            }
            return this;
        },

        // Cancel the request
        abort: function (statusText) {
            if (innerXHR) {
                innerXHR.statusCode(statusText);
            } else {
                //TODO :: handle the case were we're between two calls
            }
            return this;
        }
    };

    // Attach deferreds
    var outerDeferred = $.Deferred();
    outerDeferred.promise(outerXHR);

    // Create new deferred
    // ----------------------------------------------------------------------------

    // Copy the options to remove the callbacks
    var newOpts = $.extend({}, options, {success: $.noop, error: $.noop, complete: $.noop});

    // Middleware before
    (new MiddlewareCaller("before", true)).runSync(newOpts);

    innerXHR = originalAjax(url, newOpts).done(function (data, textStatus, jqXHR) {
        var originalContext = this;

        var deferred = {
            resolve: function() {
                console.log("Resolve outer XHR from resolved");
                outerXHR.readyState = jqXHR.readyState;
                outerDeferred.resolveWith(originalContext, [data, textStatus, jqXHR]);
            },
            reject: function(reason) {
                console.log("Reject inner XHR from resolved");
                //TODO :: readystate
                outerDeferred.rejectWith(originalContext, [jqXHR, textStatus, reason]);
            }
        };

        // Middleware done
        (new MiddlewareCaller("done", false, deferred, deferred.resolve)).run(jqXHR, data, newOpts);


    }).fail(function (jqXHR, textStatus, errorThrown) {
        var originalContext = this;

        var deferred = {
            resolve: function() {
                //TODO :: parse data the jQuery way to return it cleanly
                console.log("Resolve inner XHR from rejected");

                //TODO :: readystate
                outerDeferred.resolveWith(originalContext, [jqXHR.responseText, textStatus, jqXHR]);
            },
            reject: function(reason) {
                console.log("Reject inner XHR from rejected");
                outerXHR.readyState = jqXHR.readyState;
                outerDeferred.rejectWith(originalContext, [jqXHR, textStatus, reason]);
            }
        };

        (new MiddlewareCaller("done", false, deferred, deferred.reject)).run(jqXHR, errorThrown, newOpts);

        jqXHR.readyState = arguments[0].readyState;
        outerDeferred.rejectWith(this, arguments);
    });

    // Rebind callbacks
    // ----------------------------------------------------------------------------

    //public Function( Anything data, String textStatus, jqXHR jqXHR ) success;
    if (options.success) {
        outerXHR.done(options.success);
    }

    //public Function( jqXHR jqXHR, String textStatus, String errorThrown ) error;
    if (options.error) {
        outerXHR.fail(options.error);
    }

    //public Function( jqXHR jqXHR, String textStatus ) complete;
    if (options.complete) {

        // complete can be an array, handle that case as well
        if (typeof options.complete != "function") {
            var complete = options.complete;
            options.complete = function () {
                for (var i in complete) {
                    if (complete.hasOwnProperty(i)) {
                        complete[i].apply(this, arguments);
                    }
                }
            }
        }

        outerXHR.done(function (data, textStatus, jqXHR) {
            options.complete.call(this, jqXHR, textStatus);
        });

        outerXHR.fail(options.complete);
    }

    return outerXHR;
};
