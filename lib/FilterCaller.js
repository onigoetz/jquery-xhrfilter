/**
 * Utility method to call all filters in the correct order.
 *
 * @param filters All filters implementations
 * @constructor
 */
function FilterCaller(filters) {
  this.filters = filters;
}

/**
 * Filters to run before the XHR Request.
 *
 * The order of the filters is reversed
 *
 * @param args The arguments to pass to the methods
 */
FilterCaller.prototype.before = function (args) {
  for (var j = this.filters.length; j >= 0; --j) {
    if (this.filters.hasOwnProperty(j) && this.filters[j].hasOwnProperty("before")) {
      this.filters[j]["before"].apply(null, args);
    }
  }
};

/**
 * Filters to run when a request succeeded
 *
 * @param args The arguments to pass to the methods
 * @param final The callback to execute after all filters are run
 */
FilterCaller.prototype.done = function (args, final) {
  this.method = "done";
  this.run(args, final);
};

/**
 * Filters to run when a request succeeded
 *
 * @param args The arguments to pass to the methods
 * @param final The callback to execute after all filters are run
 */
FilterCaller.prototype.fail = function (args, final) {
  this.method = "fail";
  this.run(args, final);
};

/**
 * !! INTERNAL METHOD !!
 * Start the chain
 *
 * @param args The arguments to pass to the methods
 * @param final The callback to execute after all filters are run
 */
FilterCaller.prototype.run = function (args, final) {
  this.args = args;
  this.args.push(this.next.bind(this));
  this.final = final;
  this.current = -1;

  this.next();
};

/**
 * Find the next filter that implements the method we're looking for
 *
 * @returns Function
 */
FilterCaller.prototype.findNext = function () {
  this.current += 1;
  for (var i = this.current; i < this.filters.length; ++i) {
    if (this.filters.hasOwnProperty(i) && this.filters[i].hasOwnProperty(this.method)) {
      this.current = i;
      return this.filters[i][this.method];
    }
  }
};

/**
 * Execute the next method
 */
FilterCaller.prototype.next = function () {
  var next = this.findNext();

  if (next) {
    next.apply(null, this.args);
  } else {
    // We call this one as we finished going through all filters
    this.final();
  }
};

export default FilterCaller;
