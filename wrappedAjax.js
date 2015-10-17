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


        // Create new deferred
        // ----------------------------------------------------------------------------

        var newjQXHR = $.Deferred(function (deferred) {
            var newOpts = $.extend({}, options, {success: $.noop, error: $.noop, complete: $.noop});

            originalAjax(url, newOpts).done(function () {
                deferred.resolveWith(this, arguments);
            }).fail(function () {
                deferred.rejectWith(this, arguments);
            });
        });

        // Rebind callbacks
        // ----------------------------------------------------------------------------

        //public Function( Anything data, String textStatus, jqXHR jqXHR ) success;
        if (options.success) {
            newjQXHR.done(options.success);
        }

        //public Function( jqXHR jqXHR, String textStatus, String errorThrown ) error;
        if (options.error) {
            newjQXHR.fail(options.error);
        }

        //public Function( jqXHR jqXHR, String textStatus ) complete;
        if (options.complete) {

            // complete can be an array, handle that case as well
            if (typeof options.complete != "function") {
                var complete = options.complete;
                options.complete = function() {
                    for (var i in complete) {
                        if (complete.hasOwnProperty(i)) {
                            complete[i].apply(this, arguments);
                        }
                    }
                }
            }

            newjQXHR.done(function (data, textStatus, jqXHR) {
                options.complete.call(this, jqXHR, textStatus);
            });

            newjQXHR.fail(options.complete);
        }

        return newjQXHR;
    };

})(jQuery);
