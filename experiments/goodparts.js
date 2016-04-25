// Javascript: The Good Parts + more

// Pg 32. Augmenting Types
// Function.method() to define a new method.
Function.prototype.method = function (name, func) {
  this.prototype[name] = func;
  return this;
};

Number.method('integer', function ( ) {
  return Math[this < 0 ? 'ceiling' : 'floor'](this);
});

String.method('trim', function ( ) {
  return this.replace(/^\s+|\s+$/g, '');
});

// http://javascript.about.com/od/problemsolving/a/modulobug.htm
Number.method('mod', function (n) {
  return ((this % n) + n) % n;
});
