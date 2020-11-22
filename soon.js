// See http://www.bluejava.com/4NS/Speed-up-your-Websites-with-a-Faster-setTimeout-using-soon
// This is a very fast "asynchronous" flow control - i.e. it yields the thread and executes later,
// but not much later. It is far faster and lighter than using setTimeout(fn,0) for yielding threads.
// Its also faster than other setImmediate shims, as it uses Mutation Observer and "mainlines" successive
// calls internally.
// WARNING: This does not yield to the browser UI loop, so by using this repeatedly
// 		you can starve the UI and be unresponsive to the user.
// This is an even FASTER version of https://gist.github.com/bluejava/9b9542d1da2a164d0456 that gives up
// passing context and arguments, in exchange for a 25x speed increase. (Use anon function to pass context/args)
var soon = (function() {

   var fq = []; // function queue;

   function callQueue()
   {
      while (fq.length) // this approach allows new yields to pile on during the execution of these
      {
         fq[0](); // no context or args..
         fq.shift(); // remove element just processed... do this after processing so we don't go 0 and trigger soon again
      }
   }

   // run the callQueue function asyncrhonously, as fast as possible
   var cqYield = (function() {

      // This is the fastest way browsers have to yield processing
      if (typeof MutationObserver !== "undefined")
      {
         // first, create a div not attached to DOM to "observe"
         var dd = document.createElement("div");
         var mo = new MutationObserver(callQueue);
         mo.observe(dd, { attributes: true });

         return function(fn) { dd.setAttribute("a", 0); } // trigger callback to
      }

      // if No MutationObserver - this is the next best thing - handles Node and MSIE
      if (typeof setImmediate !== "undefined")
         return function() { setImmediate(callQueue) }

      // final fallback - shouldn't be used for much except very old browsers
      return function() { setTimeout(callQueue, 0) }
   })();

   // this is the function that will be assigned to soon
   // it takes the function to call and examines all arguments
   return function(fn) {

      // push the function and any remaining arguments along with context
      fq.push(fn);

      if (fq.length == 1) // upon adding our first entry, kick off the callback
         cqYield();
   };

})();