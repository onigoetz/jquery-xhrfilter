import FilterCaller from "./FilterCaller.js";

var $ = window.jQuery;
var originalAjax = $.ajax;
var ajaxFilters = [];

/**
 * Register a new Filter
 *
 * @param filter
 */
$.ajaxRegisterFilter = function (filter) {
  ajaxFilters.push(filter);
};

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
      //TODO :: keep this information if there is an other ajax request to do
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
      //TODO :: keep this information if there is an other ajax request to do
      if (innerXHR) {
        innerXHR.statusCode(map);
      }
      return this;
    },

    // Cancel the request
    abort: function (statusText) {
      if (innerXHR) {
        innerXHR.abort(statusText);
      } else {
        //TODO :: handle the case were we're between two calls
      }
      return this;
    }
  };

  // Attach deferred methods
  var outerDeferred = $.Deferred();
  outerDeferred.promise(outerXHR);

  // Create new deferred
  // ----------------------------------------------------------------------------

  // Copy the options to remove the callbacks
  var newOpts = $.extend({}, options, {success: $.noop, error: $.noop, complete: $.noop});

  var filterCaller = new FilterCaller(ajaxFilters);

  // Before filters
  filterCaller.before([newOpts]);

  // Make the actual call
  innerXHR = originalAjax(url, newOpts);

  innerXHR.done(function (data, textStatus, jqXHR) {
    var originalContext = this;

    // All filters passed, resolve the outer XHR
    var deferredResolve = function () {
      outerXHR.readyState = jqXHR.readyState;
      outerDeferred.resolveWith(originalContext, [data, textStatus, jqXHR]);
    };

    var innerDeferredReject = function(errorThrown) {
      outerXHR.readyState = jqXHR.readyState;
      outerDeferred.rejectWith(originalContext, [jqXHR, textStatus, errorThrown]);
    };

    // This is called when the request is bouncing between rejected and resolved
    var deferredResolveAgain = function () {
      var text = "The Request was resolved, then rejected and resolved again ... I'm out.";
      innerDeferredReject(text);
      throw new Error(text);
    };

    // If a filter decides to reject the request, this method is called
    var deferredReject = function (errorThrown) {
      filterCaller.fail([jqXHR, errorThrown, newOpts, deferredResolveAgain], function() {
        innerDeferredReject(errorThrown);
      });
    };

    filterCaller.done([jqXHR, data, newOpts, deferredReject], deferredResolve);
  });

  innerXHR.fail(function (jqXHR, textStatus, errorThrown) {
    var originalContext = this;

    // All filters passed, reject the outer XHR
    var deferredReject = function () {
      outerXHR.readyState = jqXHR.readyState;
      outerDeferred.rejectWith(originalContext, [jqXHR, textStatus, errorThrown]);
    };

    // This is called when the request is bouncing between rejected and resolved
    var deferredRejectAgain = function() {
      deferredReject();
      throw new Error("The Request was rejected, then resolved and rejected again ... I'm out.")
    };

    var innerDeferredResolve = function(data, retryXHR) {
      outerXHR.readyState = retryXHR.readyState;
      outerDeferred.resolveWith(originalContext, [data, textStatus, retryXHR]);
    };

    // If a filter decides to resolve the request, this method is called
    var deferredResolve = function (data, retryXHR) {
      // If the retry XHR is the same than the original failing one, we need to pass it through the other filter
      if (innerXHR == retryXHR) {
        filterCaller.done([retryXHR, data, newOpts, deferredRejectAgain], function() {
          innerDeferredResolve(data, retryXHR);
        });
      } else {
        innerDeferredResolve(data, retryXHR);
      }
    };

    filterCaller.fail([jqXHR, errorThrown, newOpts, deferredResolve], deferredReject);
  });

  // Rebind old callbacks
  // ----------------------------------------------------------------------------

  if (options.success) {
    outerXHR.done(options.success);
  }

  if (options.error) {
    outerXHR.fail(options.error);
  }

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

    // Bind on both done and fail
    outerXHR.then(function (data, textStatus, jqXHR) {
      options.complete.call(this, jqXHR, textStatus);
    }, function () {
      options.complete.apply(this, arguments);
    });
  }

  return outerXHR;
};
