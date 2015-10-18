(function ($) {
    var originalAjax = $.ajax;
    $.ajax = function (url, options) {

        // If url is an object, simulate pre-1.5 signature
        if (typeof url === "object") {
            options = url;
            url = undefined;
        }

        // Force options to be an object
        options = options || {};

        var innerXHR;


        // Emulate a jqXHR object
        // ----------------------------------------------------------------------------

        var jqXHR = {
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
        var deferred = jQuery.Deferred();
        deferred.promise(jqXHR);


        // Create new deferred
        // ----------------------------------------------------------------------------

        // Copy the options to remove the callbacks
        var newOpts = $.extend({}, options, {success: $.noop, error: $.noop, complete: $.noop});

        innerXHR = originalAjax(url, newOpts).done(function () {
            jqXHR.readyState = arguments[2].readyState;
            deferred.resolveWith(this, arguments);
        }).fail(function () {
            jqXHR.readyState = arguments[0].readyState;
            deferred.rejectWith(this, arguments);
        });

        // Rebind callbacks
        // ----------------------------------------------------------------------------

        //public Function( Anything data, String textStatus, jqXHR jqXHR ) success;
        if (options.success) {
            jqXHR.done(options.success);
        }

        //public Function( jqXHR jqXHR, String textStatus, String errorThrown ) error;
        if (options.error) {
            jqXHR.fail(options.error);
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

            jqXHR.done(function (data, textStatus, jqXHR) {
                options.complete.call(this, jqXHR, textStatus);
            });

            jqXHR.fail(options.complete);
        }

        return jqXHR;
    };


})(jQuery);
