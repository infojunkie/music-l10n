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

Array.method('clone', function() {
  return this.slice(0);
});

Array.method('fsort', function (f) {
  var a = this.clone();
  a.sort(f);
  return a;
});

// https://davidwalsh.name/array-insert-index
// MUTATES!
Array.method('insert', function(index, item) {
  this.splice(index, 0, item);
  return this;
});

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
(function() {
  /**
   * Decimal adjustment of a number.
   *
   * @param {String}  type  The type of adjustment.
   * @param {Number}  value The number.
   * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
   * @returns {Number} The adjusted value.
   */
  function decimalAdjust(type, value, exp) {
    // If the exp is undefined or zero...
    if (typeof exp === 'undefined' || +exp === 0) {
      return Math[type](value);
    }
    value = +value;
    exp = +exp;
    // If the value is not a number or the exp is not an integer...
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
      return NaN;
    }
    // Shift
    value = value.toString().split('e');
    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
    // Shift back
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
  }

  // Decimal round
  if (!Math.round10) {
    Math.round10 = function(value, exp) {
      return decimalAdjust('round', value, exp);
    };
  }
  // Decimal floor
  if (!Math.floor10) {
    Math.floor10 = function(value, exp) {
      return decimalAdjust('floor', value, exp);
    };
  }
  // Decimal ceil
  if (!Math.ceil10) {
    Math.ceil10 = function(value, exp) {
      return decimalAdjust('ceil', value, exp);
    };
  }
})();
