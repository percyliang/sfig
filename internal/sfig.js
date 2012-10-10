// sfig: SVG/Javascript-based library for creating presentation/figures.
// Percy Liang

var sfig = {}; // Namespace of public members.
var sfig_ = {}; // Namespace of private members.

////////////////////////////////////////////////////////////
// Default parameters which can be overridden.

sfig.homePage = 'http://github.com/percyliang/sfig';
sfig.version = '1.0';
sfig.defaultStrokeWidth = 1;
sfig.defaultStrokeColor = 'black';
sfig.defaultFillColor = 'none';
sfig.defaultBgColor = 'white';
sfig.defaultExplanationScale = 0.8;  // When popup an explanation, make a bit smaller.

sfig.enableMath = true;  // Whether to render LaTeX math using MathJax.
sfig.enableAnimations = true;  // Whether to allow animations.
sfig.enableTiming = false;  // Enable to see how long it takes to render.
sfig.enableProfiling = false;  // Enable to see where CPU is being spent.

Image.useCachedImages = false;  // Whether to used cached images

sfig.defaultPrintNumRowsPerPage = 3;
sfig.defaultPrintNumColsPerPage = 2;

////////////////////////////////////////////////////////////
// Simple functions

(function() {
  // Usage: importMethods(this)
  // Will import all the necessary methods into the namespace.
  sfig.importMethods = function(target, names) {
    names.forEach(function(name) {
      var method = sfig[name];
      if (method == null) throw 'Can\'t import '+name+' because it doesn\'t exist';
      target[name] = method;
    });
  }

  // Usage: someFunction(3, 4, _)
  // Ignored if in function arguments.  Useful as the final argument so all
  // real arguments can have a trailing comma (easier to shuffle things
  // around).
  sfig._ = {'IGNORED' : true};

  // Usage: let(x = 4, y = 5)
  // Allows definitions in the middle of function calls.
  sfig.let = function() { return _; }

  // Concatenate strings
  sfig.cat = function() { return Array.prototype.slice.call(arguments).join(''); }

  sfig.setPointerCursor = function() {
    document.documentElement.style.cursor = 'pointer';
  }
  sfig.resetCursor = function() {
    document.documentElement.style.cursor = '';
  }
  sfig.setLaserPointerCursor = function() {
    document.documentElement.style.cursor = 'url("red-dot.png"), auto';
  }

  sfig.identity = function(x) { return x; };

  // Shorthand methods for debugging
  sfig.L = function() {
    console.log(arguments);
  }
  sfig.S = function(x) {
    if (x instanceof SVGRect) return sfig_.rectToString(x);
    if (x instanceof SVGMatrix) return 'matrix('+[x.a, x.b, x.c, x.d, x.e, x.f].join(' ')+')';
    if (x instanceof sfig.Block) return x.toString(true);
    if (x instanceof sfig.Thunk) return x.get();
    if (x instanceof Array) return x.map(S);
    return x;
  }
})();

////////////////////////////////////////////////////////////
// Generic utility functions.

(function() {
  var PropertyChanger = sfig.PropertyChanger = function(name, operation) {
    this.name = name;
    this.operation = operation;
  }
  PropertyChanger.prototype.toString = function() {
    return 'PropertyChanger[' + this.name + ']';
  }

  sfig.pause = function(n) {
    if (n == null) n = 1;
    return new sfig.PropertyChanger('pause('+n+')', function(env) {
      env.showLevel = env.showLevel.add(n);
    });
  }

  sfig.showLevel = function(n) {
    return new sfig.PropertyChanger('showLevel('+n+')', function(env) {
      env.showLevel = n;
    });
  }

  // Arguments which are not Blocks, but are kept in tact during standarization.
  sfig.AuxiliaryInfo = function() { }

  // Standardize arguments.  sfig functions that take a tree of Blocks are
  // sometimes passed with _'s and raw strings.  Remove all instances of _, and
  // make sure every item is either an Block, a PropertyChanger, AuxiliaryInfo, or
  // an array of these things.
  sfig.std = function(item) {
    if (item == null) throw 'Null not allowed';
    if (item instanceof Function) throw 'Function not allowed (did you mean to call it?): '+item;
    if (item instanceof sfig.Thunk) throw 'Thunk not allowed: '+item;
    if (item instanceof sfig.Block) return item;
    if (item instanceof sfig.AuxiliaryInfo) return item;
    if (item instanceof sfig.PropertyChanger) return item;
    if (item instanceof HTMLElement) return sfig.text(item);
    var type = typeof(item);
    if (type == 'string') return sfig.text(item);
    if (type == 'number') return sfig.text(''+item);  // Convert strings and numbers to text
    if (item.length != null) {  // Array and Arguments
      var newList = [];
      for (var i = 0; i < item.length; i++) {
        var x = item[i];
        if (x == sfig._) continue;
        newList.push(sfig.std(x));
      }
      return newList;
    }
    console.log(item);
    throw 'Invalid: '+item;
  }

  sfig_.javascriptEscape = function(s) { return '\'' + s.replace(/'/g, '\\\'') + '\''; }

  // Create an element with the desired attributes.
  sfig_.newElem = function(type) { return document.createElement(type); }
  sfig_.svgns = 'http://www.w3.org/2000/svg';
  sfig_.newSvgElem = function(type) { return document.createElementNS(sfig_.svgns, type); }
  sfig_.newSvg = function() {
    return sfig_.newSvgElem('svg', {
      id: 'svg',
      xmlns: sfig_.svgns,
      version: '1.1',
    });
  }

  sfig_.mergeInto = function(target, source) {
    for (var key in source) target[key] = source[key];
    return target;
  }

  sfig_.rectToString = function(r) { return r.x+','+r.y+';'+r.width+'x'+r.height; }
  sfig_.svg = sfig_.newSvg();

  sfig_.robustMin = function(a, b) {
    if (a == null) return b;
    if (b == null) return a;
    return Math.min(a, b);
  }

  sfig_.robustMax = function(a, b) {
    if (a == null) return b;
    if (b == null) return a;
    return Math.max(a, b);
  }

  sfig_.shiftMatrix = function(xshift, yshift) {
    var ctm = sfig_.svg.createSVGMatrix();
    ctm.e = xshift;
    ctm.f = yshift;
    return ctm;
  }

  sfig_.scaleMatrix = function(xscale, yscale) {
    var ctm = sfig_.svg.createSVGMatrix();
    ctm.a = xscale;
    ctm.d = yscale;
    return ctm;
  }

  sfig_.translateElem = function(elem, x, y) {
    var transformed = sfig_.newSvgElem('g');
    transformed.setAttribute('transform', 'translate('+x+','+y+')');
    transformed.appendChild(elem);
    return transformed;
  }

  // x is either already an HTMLElement or a string which is to be parsed as such
  sfig_.ensureHTMLElement = function(x) {
    if (x instanceof HTMLElement) return x;
    var div = sfig_.newElem('div');
    div.innerHTML = x;
    return div;
  }

  var codeToKey = {
    8 : 'backspace',
    9 : 'tab',
    10 : 'enter',
    13 : 'enter',
    27 : 'escape',
    32 : 'space',
    33 : 'page_up',
    34 : 'page_down',
    35 : 'end',
    36 : 'home',
    37 : 'left',
    38 : 'up',
    39 : 'right',
    40 : 'down',
    191: '/',
  };
  sfig_.eventToKey = function(event) {
    var key = '';
    if (event.ctrlKey) key += '-ctrl';
    if (event.altKey) key += '-alt';
    if (event.shiftKey) key += '-shift';
    var code = event.charCode || event.keyCode;
    key += '-' + (codeToKey[code] || String.fromCharCode(code).toLowerCase());
    key = key.substring(1);
    return key;
  }

  // Creates subarrays dynamically as necessary.

  // Append |value| to the list vector[i].
  sfig_.vectorPushInto = function(vector, i, value) {
    if (!vector[i]) vector[i] = [];
    vector[i].push(value);
  }

  // Append |value| to the list matrix[r][c].
  sfig_.matrixPushInto = function(matrix, r, c, value) {
    var row = matrix[r];
    if (row == null) row = matrix[r] = [];
    if (!row[c]) row[c] = [];
    row[c].push(value);
  }

  // Set matrix[r][c] to |value|.
  sfig_.matrixSetValue = function(matrix, r, c, value) {
    var row = matrix[r];
    if (row == null) row = matrix[r] = [];
    row[c] = value;
  }

  // Return a function that dispatches to |func| with |arg| as the first argument.
  sfig_.funcPrependArg = function(func, arg) {
    return function(x) { return func(arg, x); }
  }

  // Note: assume |func| takes a callback.  Inject end timing code before the callback.
  sfig_.measureTime = function(name, func, callback) {
    var startTime, endTime;
    if (sfig.enableTiming) startTime = new Date().getTime();
    if (sfig.enableProfiling) console.profile([name]);
    func(function() {
      if (sfig.enableProfiling) console.profileEnd();
      if (sfig.enableTiming) endTime = new Date().getTime();
      if (sfig.enableTiming) console.log(name + ' time: '+(endTime-startTime));
      callback();
    });
  }
  sfig_.performOperation = function(name, func, callback) {
    if (sfig.enableProfiling || sfig.enableTiming)
      sfig_.measureTime(name, func, callback);
    else
      func(callback);
  }

  sfig_.inheritsFrom = function(className, childClass, parentClass) {
    if (parentClass != Object) {
      childClass.prototype = new parentClass();
      childClass.prototype.constructor = parentClass;

      // Copy defaults
      childClass.defaults = new sfig.Properties();
      if (parentClass.defaults != null)
        childClass.defaults.from(parentClass.defaults, true);
    }
    childClass.prototype.className = className;
    childClass.prototype.myClass = childClass;
  }

  sfig_.atan2Degrees = function(y, x) { return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; }
  sfig_.cosDegrees = function(angle) { return Math.cos(angle / 180 * Math.PI); }
  sfig_.sinDegrees = function(angle) { return Math.sin(angle / 180 * Math.PI); }

  sfig_.rotateDegrees = function(p, angle) {
    var cos = sfig_.cosDegrees(angle);
    var sin = sfig_.sinDegrees(angle);
    var x = p[0], y = p[1];
    return [x * cos + y * sin, y * cos - x * sin];
  }

  // Make sure angle is in the range [0, 360)
  sfig_.stdDegrees = function(angle) {
    if (angle < 0) return 360 - (-angle % 360);
    return angle % 360;
  }

  // Input: '#a=b'
  // Output: {'a': 'b'}
  sfig_.parseUrlParams = function(href) {
    var params = {};
    var items = href.split(/[#&]/);
    for (var i = 1; i < items.length; i++) {
      var pair = items[i].split(/=/);
      params[pair[0]] = unescape(pair[1]);
    }
    return params;
  }

  // Input: {'a': 'b'}
  // Output: '#a=b'
  sfig_.serializeUrlParams = function(params) {
    var str = '';
    var first = true;
    for (var name in params) {
      if (params[name] == null) continue;
      str += (first ? '#' : '&') + name + '=' + escape(params[name]);
      first = false;
    }
    return str;
  }

  sfig_.urlParams = {};

  sfig_.parseUrlParamsFromLocation = function() {
    sfig_.urlHash = window.location.hash;
    sfig_.urlParams = sfig_.parseUrlParams(sfig_.urlHash);
  }
  sfig_.serializeUrlParamsToLocation = function() {
    sfig_.urlHash = sfig_.serializeUrlParams(sfig_.urlParams);
    window.location.hash = sfig_.urlHash;
  }
})();

////////////////////////////////////////////////////////////
// Thunk: encapsulated a computation.
// Either consists of
//   - value [primitive value]
//   - func, args [depends on other Thunks] (can still have cached value)

(function() {
  // Usage: don't call this function directly.
  // When we call .get() on a thunk, we either get the value or func(args)
  var Thunk = sfig.Thunk = function() {
    this.usedBy = []; // Thunks that use this
  }

  Thunk.prototype.toString = function() {
    if (this.func != null)
      return this.name + '(' + this.args.map(function(arg) { return arg.toString(); }).join(',') + ')';
    else
      return (this.name != null ? this.name + '=' : '') + this.value;
  }

  Thunk.prototype.log = function(name) {
    if (name != null) this.name = name;
    this.hookFunc = function(name, value) { console.log('thunk', name, value); };
    return this;
  }

  Thunk.prototype.exists = function() { return this.value != null || this.func != null; }

  // If value exists, return it.
  // Otherwise, recursively compute it and cache it.
  Thunk.prototype.get = function() {
    // Compute value if it doesn't exist.
    if (this.value == null && this.func != null) {
      this.value = this.func.apply(null, this.args.map(function(arg) { return arg.get(); }));
      if (this.value instanceof sfig.Thunk) throw 'Value is thunk: '+this.value;
      if (this.hookFunc != null) this.hookFunc(this.name, this.value);
    }
    return this.value;
  }

  // Set the value to the desired value.
  Thunk.prototype.set = function(newValue) {
    this.invalidate();

    // If function, remove dependendence on arguments anymore.
    if (this.func != null) {
      var self = this;
      this.args.forEach(function(arg) {
        var i = arg.usedBy.indexOf(self);
        if (i == -1) throw 'Inconsistent state';
        arg.usedBy.splice(i, 1);
      });
    }

    // Set new value
    if (newValue instanceof sfig.Thunk) {
      // Depend on newValue *by reference*
      this.func = sfig.identity;
      this.args = [newValue];
      newValue.usedBy.push(this);
    } else {
      this.func = null;
      this.args = null;
      this.value = newValue;
    }

    return this;
  }

  Thunk.prototype.invalidate = function() {
    if (this.value == null) return;  // Already invalidated
    this.value = null;
    this.usedBy.forEach(function(client) { client.invalidate(); });
  }

  Thunk.prototype.getOrElse = function(defaultValue) {
    var value = this.get();
    if (value == null) return defaultValue;
    return value;
  }

  Thunk.prototype.getOrDie = function() {
    var value = this.get();
    if (value == null) throw 'Null value from '+this+' (maybe not available if Block isn\'t rendered yet)';
    return value;
  }

  Thunk.prototype.getNonnegativeOrDie = function() {
    var value = this.getOrDie();
    if (!(value >= 0)) throw 'Negative value from '+this+': '+value;
    return value;
  }

  sfig.tconstant = function(value) {
    var thunk = new Thunk();
    thunk.value = value;
    return thunk;
  }

  sfig.tvalue = function(name, value) {
    if (value instanceof Thunk) throw 'Value can\'t be thunk: '+value;
    var thunk = new Thunk();
    thunk.name = name;
    thunk.value = value;
    return thunk;
  }

  var tfunc = sfig.tfunc = function(name, func, args) {
    var thunk = new Thunk();
    thunk.name = name;
    thunk.func = func;
    thunk.args = [];
    for (var i = 0; i < args.length; i++) {
      var x = args[i];
      if (!(x instanceof sfig.Thunk)) x = sfig.tconstant(x); // Ensure thunk
      thunk.args[i] = x;
      x.usedBy.push(thunk);
    }
    return thunk;
  }

  var orElse = function(a, b) { return a != null ? a : b; }
  var andThen = function(a, b) { return a != null ? b : null; }

  Thunk.prototype.orElse = function(x) { return tfunc('orElse', orElse, [this, x]); }
  Thunk.prototype.andThen = function(x) { return tfunc('andThen', andThen, [this, x]); }

  var charAtOrLast = function(str, i, x) { return str != null && i != null ? (i < str.length ? str[i] : str[str.length-1]) : x; }
  Thunk.prototype.charAtOrLast = function(i, x) { return tfunc('charAtOrLast', charAtOrLast, [this, i, x]); }

  var apply = function(x, f) { return x == null || f == null ? null : f(x); }
  Thunk.prototype.apply = function(f) { return tfunc('apply', apply, [this, f]); }

  var add = function(a, b) { return a == null || b == null ? null : a + b; }
  var sub = function(a, b) { return a == null || b == null ? null : a - b; }
  var mul = function(a, b) { return a == null || b == null ? null : a * b; }
  var div = function(a, b) { return a == null || b == null ? null : a / b; }
  var min = sfig_.robustMin;
  var max = sfig_.robustMax;
  var and = function(a, b) { return a && b; }
  var or = function(a, b) { return a || b; }
  var not = function(a) { return !a; }
  var cond = function(test, a, b) { return test ? a : b; } // Note: in Javascript, null, false, 0, '' are all false

  Thunk.prototype.add = function(x) { return tfunc('add', add, [this, x]); }
  Thunk.prototype.sub = function(x) { return tfunc('sub', sub, [this, x]); }
  Thunk.prototype.mul = function(x) { return tfunc('mul', mul, [this, x]); }
  Thunk.prototype.div = function(x) { return tfunc('div', div, [this, x]); }
  Thunk.prototype.min = function(x) { return tfunc('min', min, [this, x]); }
  Thunk.prototype.max = function(x) { return tfunc('max', max, [this, x]); }
  Thunk.prototype.and = function(x) { return tfunc('and', and, [this, x]); }
  Thunk.prototype.or = function(x) { return tfunc('or', or, [this, x]); }
  Thunk.prototype.not = function() { return tfunc('not', not, [this]); }
  Thunk.prototype.cond = function(a, b) { return tfunc('not', cond, [this, a, b]); }
})();

////////////////////////////////////////////////////////////
// Properties: The base class for all high-level objects.
(function() {
  var Properties = sfig.Properties = function() {
    // Mapping from property name to a Thunk representing the value
    this.properties = {};
    if (this.myClass.defaults != null) this.from(this.myClass.defaults, true);
  }
  sfig_.inheritsFrom('Properties', Properties, Object);

  // Copy properties of |source| to |this| by value.
  // get = false -> copy by reference
  // get = true -> copy by value
  Properties.prototype.from = function(source, get) {
    for (var name in source.properties) {
      var value = source.getProperty(name);
      if (get) value = value.get();
      this.setProperty(name, value);
    }
    return this;
  }

  Properties.prototype.setEnd = function(block) {
    if (this.end != null) throw this+' already has end: '+this.end+', but tried to set to '+block;
    this.end = block;
  }

  // Get the property (returns a Thunk); create it it doesn't exist.
  Properties.prototype.getProperty = function(name) {
    var v = this.properties[name];
    if (v == null) v = this.properties[name] = sfig.tvalue(name, null);
    return v;
  }

  // Set the property to a new value (either constant or thunk).
  Properties.prototype.setProperty = function(name, newValue) {
    var v = this.properties[name];
    if (v == null) v = this.properties[name] = sfig.tvalue(name, null);
    if (newValue == null) throw 'Can\'t set '+name+' to null';
    v.set(newValue);
    return this;
  }

  Properties.prototype.toString = function(recurse) {
    var str = this.className;
    for (var name in this.properties) {
      var value = this.properties[name];
      if (value.value != null) str += ',' + name + '=' + value.value;
    }
    return str;
  }

  // Add property with given name to the given class |constructor|.
  sfig_.addProperty = function(constructor, name, defaultValue, description) {
    if (arguments.length != 4) throw 'Wrong number of arguments: '+Array.prototype.slice.call(arguments);
    if (defaultValue != null) constructor.defaults.setProperty(name, defaultValue);

    if (constructor.prototype[name]) throw constructor.prototype.className+' already has property '+name;
    constructor.prototype[name] = function(newValue) {
      if (arguments.length == 0) {
        return this.getProperty(name);
      } else if (arguments.length == 1) {
        return this.setProperty(name, newValue);
      } else
        throw 'Wrong number of arguments to '+name+': '+Array.prototype.slice.call(arguments);
    }
  }

  // Add property with given name to the given class |constructor|.
  sfig_.addMapProperty = function(constructor, name, defaultValue, description) {
    if (arguments.length != 4) throw 'Wrong number of arguments: '+Array.prototype.slice.call(arguments);
    if (defaultValue != null) constructor.defaults.setProperty(name, defaultValue);

    if (constructor.prototype[name]) throw constructor.prototype.className+' already has property '+name;
    constructor.prototype[name] = function(key, newValue) {
      if (arguments.length == 0) {
        return this.getProperty(name);
      } else if (arguments.length == 2) {
        var map = this.getProperty(name).get();
        if (map == null) map = {};
        map[key] = newValue;
        return this.setProperty(name, map);
      } else {
        throw 'Wrong number of arguments to '+name+': '+Array.prototype.slice.call(arguments);
      }
    }
  }

  // Add property with given names to the given class |constructor|.
  // |name| is a pair property (e.g., shift) which modifies the same variables as |name1| and |name2|.
  sfig_.addPairProperty = function(constructor, name, name1, name2, defaultValue1, defaultValue2, description) {
    if (arguments.length != 7) throw 'Wrong number of arguments: '+Array.prototype.slice.call(arguments);
    if (constructor.prototype[name]) throw constructor.prototype.className+' already has property '+name;
    if (constructor.prototype[name1]) throw constructor.prototype.className+' already has property '+name1;
    if (constructor.prototype[name2]) throw constructor.prototype.className+' already has property '+name2;

    if (defaultValue1 != null) constructor.defaults.setProperty(name1, defaultValue1);
    if (defaultValue2 != null) constructor.defaults.setProperty(name2, defaultValue2);

    constructor.prototype[name] = function(newValue1, newValue2) {
      if (arguments.length == 0) { // Getter
        return [this.getProperty(name1), this.getProperty(name2)];
      } else if (arguments.length == 1) {  // Setter ...property(2)
        return this.setProperty(name1, newValue1) && this.setProperty(name2, newValue1);
      } else if (arguments.length == 2) { // Setter ...property(2, 3)
        return this.setProperty(name1, newValue1) && this.setProperty(name2, newValue2);
      } else {
        throw 'Wrong number of arguments to '+name+': '+Array.prototype.slice.call(arguments);
      }
    }
    constructor.prototype[name1] = function(newValue1) {
      if (arguments.length == 0) { // Getter
        return this.getProperty(name1);
      } else if (arguments.length == 1) { // Setter
        return this.setProperty(name1, newValue1);
      } else {
        throw 'Wrong number of arguments to '+name+': '+Array.prototype.slice.call(arguments);
      }
    }
    constructor.prototype[name2] = function(newValue2) {
      if (arguments.length == 0) { // Getter
        return this.getProperty(name2);
      } else if (arguments.length == 1) { // Setter
        return this.setProperty(name2, newValue2);
      } else {
        throw 'Wrong number of arguments to '+name2+': '+arguments;
      }
    }
  }

  // Add a read-only property which is only available after .
  sfig_.addDerivedProperty = function(constructor, name, func, argNames, description) {
    if (constructor.prototype[name]) throw constructor.prototype.className+' already has property '+name;
    constructor.prototype[name] = function() {
      if (arguments.length != 0)
        throw 'Derived property '+name+' is read-only, unable to set to '+Array.prototype.slice.call(arguments);
      var v = this.properties[name];
      if (v == null) {
        var self = this;
        v = this.properties[name] = sfig.tfunc(name, func, argNames.map(function(argName) { return self[argName](); }));
      }
      return v;
    }
  }
})();

////////////////////////////////////////////////////////////

(function() {
  // Stores the animation properties.
  var Animate = sfig.Animate = function() {
    Animate.prototype.constructor.call(this);
  }
  sfig_.inheritsFrom('Animate', Animate, sfig.Properties);

  // The Block is basic unit which we use to specify what is displayed.
  // One view is that it is essentially a tree of function calls,
  // which ultimately is rendered to produce SVG DOM elements.
  // A Block is in one of two stages:
  //   1) Construction and setting of properties.
  //   2) Rendering: sets initDependencies/children, elem/rendering properties, state (if root)
  var Block = sfig.Block = function() {
    Block.prototype.constructor.call(this);

    this.animate = new sfig.Animate();
    this.animate.setEnd(this);

    this.resetRender();
  };
  sfig_.inheritsFrom('Block', Block, sfig.Properties);

  Block.prototype.getRoot = function() {
    var block = this;
    while (block.parent != null) block = block.parent;
    return block;
  }

  // Go back to stage one (remove all rendering information).
  // TODO: quite possible that there's a memory leak with Thunks.
  Block.prototype.resetRender = function() {
    // Recurse.
    if (this.children != null)
      for (var i = 0; i < this.children.length; i++) this.children[i].resetRender();

    this.initDependencies = null;  // List of initial dependencies - these should be rendered first before children.
    this.children = null;  // List of sub-Blocks.
    this.parent = null;

    // Environment - properties might change for children via PropertyChangers
    this.env = {};
    this.env.showLevel = this.showLevel();

    // When this object is rendered, set to the corresponding DOM element
    // (e.g., SVG <g></g>).
    this.getBlocksVisited = null;
    this.elem = null;
    this.hasAnimation = null;  // Whether there are any animations
    this.bboxIsSet = null;

    // Only applicable for the top node
    if (this.state) {
      this.state.animateBlocks = [];
      this.state.showBlocks = [];
      this.state.hideBlocks = [];
    }
  }

  Block.prototype.ensureRendered = function() {
    if (this.elem == null) throw 'Not rendered yet: ' + this.toString(true);
  }

  Block.prototype.addInitDependency = function(item) {
    if (item instanceof sfig.Block) {
      this.initDependencies.push(item);
    } else {
      throw 'Invalid: '+item;
    }
  }

  Block.prototype.addChild = function(item) {
    if (item instanceof sfig.Block) {
      item.freeze();  // When child is added, its properties are frozen
      if (this.children == null) throw 'Children not initialized yet for '+item;
      this.children.push(item);
      if (item.parent != null) throw 'Already has parent, trying to give another: '+item;
      item.parent = this;
      if (!item.showLevel().exists()) {  // Only propagate to/from item if its level is specified
        // env -> item [if not exists]
        item.showLevel(this.env.showLevel);
        // item.env -> env
        this.env.showLevel = item.env.showLevel;
      }
    } else if (item instanceof sfig.PropertyChanger) {
      item.operation(this.env);
    } else {
      throw 'Invalid: '+item;
    }
  }

  // Take some of the salient properties from |source|.
  // Use case: |this| is an edge connected to the |source| node.
  Block.prototype.mimic = function(source) {
    this.showLevel(source.showLevel());
    this.hideLevel(source.hideLevel());
    this.orphan(source.orphan());
    return this;
  }

  // For all children, recursively take their appendices and add them as children.
  // The appendix feature allows one to add content locally and have it show up later (good for labels and dropdowns).
  Block.prototype.closeAppendices = function() {
    this.freeze();
    var self = this;
    function gather(block) {
      var appendix = block.appendix();
      if (appendix.get()) {
        self.addChild(sfig.std(appendix.get()));
        appendix.set(null);
      }
      block.children.forEach(gather);
    }
    gather(this);
    return this;
  }

  sfig_.addProperty(Animate, 'duration', '1s', 'Time to spend performing the animation');
  sfig_.addProperty(Block, 'replace', null, 'Object to hide when this object is shown.');

  // Transforms
  [Block, Animate].forEach(function(constructor) {
    sfig_.addPairProperty(constructor, 'shift', 'xshift', 'yshift', null, null, 'Move object by this distance.');
    sfig_.addPairProperty(constructor, 'scale', 'xscale', 'yscale', null, null, 'Change size by this factor.');

    sfig_.addProperty(constructor, 'rotate', null, 'Number of degrees to rotate clockwise.');
    sfig_.addPairProperty(constructor, 'rotatePivot', 'xrotatePivot', 'yrotatePivot', null, null, 'Rotate around this point.');

    sfig_.addPairProperty(constructor, 'skew', 'xskew', 'yskew', null, null, 'Skew this number of degrees.');
    sfig_.addPairProperty(constructor, 'color', 'strokeColor', 'fillColor', null, null, 'Color of object.');
    sfig_.addPairProperty(constructor, 'opacity', 'strokeOpacity', 'fillOpacity', null, null, 'Opacity of object.');

    sfig_.addProperty(constructor, 'strokeWidth', null, 'How thick the stroke should be.');
  });

  // Style of stroke
  sfig_.addProperty(Block, 'strokeDasharray', null, 'List of dash lengths.');
  Block.prototype.dashed = function() { return this.strokeDasharray([5, 2]); }
  Block.prototype.dotted = function() { return this.strokeDasharray([1, 5]); }

  // Levels
  sfig_.addPairProperty(Block, 'level', 'showLevel', 'hideLevel', null, null, 'Levels at which this object is available.');
  Block.prototype.numLevels = function(n) { return this.hideLevel(this.showLevel().add(n)); } // How long to display this object

  sfig_.addProperty(Block, 'orphan', null, 'Orphans do not contribute to the bounding box of its parent.');
  sfig_.addPairProperty(Block, 'parentPivot', 'xparentPivot', 'yparentPivot', null, null, 'Pivot used by parent.');

  // Justify with respect to parent.
  sfig.parentCenter = function(block) { return sfig.std(block).xparentPivot(0); }
  sfig.parentLeft = function(block) { return sfig.std(block).xparentPivot(-1); }
  sfig.parentRight = function(block) { return sfig.std(block).xparentPivot(+1); }

  sfig_.addProperty(Block, 'tooltip', null, 'String to display when mouseover.');
  sfig_.addProperty(Block, 'onClick', null, 'Function to call when object is clicked.');
  sfig_.addProperty(Block, 'onMouseover', null, 'Function to call when mouse moves over object.');
  sfig_.addProperty(Block, 'onMouseout', null, 'Function to call when mouse moves out of object.');
  sfig_.addProperty(Block, 'onShow', null, 'Function to call when object is shown.');

  sfig_.addMapProperty(Block, 'partOnClick', null, 'Function to call when part of the object is clicked.');
  sfig_.addMapProperty(Block, 'partTooltip', null, 'String to display when mouse goes over.');

  sfig_.addProperty(Block, 'appendix', null, 'Block which will be added in a big Overlay at the top-level.');

  // Rendered properties.
  // The bounding box of this object as perceived by the outside world
  // for purposes of layout (doesn't actually have to be the real bounding
  // box).
  sfig_.addPairProperty(Block, 'realDim', 'realWidth', 'realHeight', null, null, 'Dimensions of the actual rendered object');
  sfig_.addPairProperty(Block, 'leftTop', 'left', 'top', null, null, 'Top-left corner');
  sfig_.addDerivedProperty(Block, 'right', function(a, b) { return a + b; }, ['left', 'realWidth'], 'Right coordinate');
  sfig_.addDerivedProperty(Block, 'bottom', function(a, b) { return a + b; }, ['top', 'realHeight'], 'Bottom coordinate');
  sfig_.addDerivedProperty(Block, 'xmiddle', function(a, b) { return a + b/2; }, ['left', 'realWidth'], 'Middle x-coordinate');
  sfig_.addDerivedProperty(Block, 'ymiddle', function(a, b) { return a + b/2; }, ['top', 'realHeight'], 'Middle y-coordinate');

  // Return the point of where a ray from the center leaving with given angle would intersect
  // the boundaries.  By default, assume rectangular boundaries.
  Block.prototype.clipPoint = function(angle) {
    // If there is a unique non-orphaned child, then delegate to that
    var c;
    for (var i = 0; i < this.children.length; i++) {
      if (this.children[i].orphan().get()) continue;
      if (c == null) c = i;
      else { c = null; break; }
    }
    if (c != null) return this.children[c].clipPoint(angle);

    /*var rotate = this.rotate().getOrElse(0);
    sfig.L(rotate);
    angle -= rotate;*/

    angle = sfig_.stdDegrees(angle);
    this.ensureRendered();
    var dx = sfig_.cosDegrees(angle);
    var dy = sfig_.sinDegrees(angle);
    var mx = (this.realWidth().get() - this.strokeWidth().getOrElse(sfig.defaultStrokeWidth)) / 2;
    var my = (this.realHeight().get() - this.strokeWidth().getOrElse(sfig.defaultStrokeWidth)) / 2;
    // Figure out which quadrant angle is in...
    //         270
    //     a3 ------ a4
    // 180 |          | 0
    //     a2 ------ a1
    //          90
    var a1 = sfig_.atan2Degrees(my, mx);
    var a2 = 180 - a1;
    var a3 = 180 + a1;
    var a4 = 360 - a1;
    if (angle >= a1 && angle < a2) { // Bottom
      dx *= Math.abs(my / dy);
      dy = my;
    } else if (angle >= a2 && angle < a3) { // Left
      dy *= Math.abs(mx / dx);
      dx = -mx;
    } else if (angle >= a3 && angle < a4) { // Top
      dx *= Math.abs(my / dy);
      dy = -my;
    } else {  // Right
      dy *= Math.abs(mx / dx);
      dx = mx;
    }

    // Rotate back
    //var result = sfig_.rotateDegrees([dx, dy], rotate);
    //dx = result[0], dy = result[1];
    
    return [this.left().get() + mx + dx, this.top().get() + my + dy];
  }

  Block.prototype.elemString = function() { return new XMLSerializer().serializeToString(this.elem); }

  // TODO: optimize (don't recurse if nothing to set)
  Block.prototype.setStrokeFillProperties = function(elem, direct) {
    if (elem.tagName == 'g') {
      // Recursively set properties
      for (var i = 0; i < elem.childElementCount; i++)
        this.setStrokeFillProperties(elem.childNodes[i], false);
    } else {
      var strokeColor = this.strokeColor().get();
      if (strokeColor == null && direct) strokeColor = sfig.defaultStrokeColor;  // Set default
      if (strokeColor != null) {
        if (elem.tagName == 'foreignObject') { // Need to handle foreignObject/div specially
          for (var i = 0; i < elem.childElementCount; i++)  // Modify underlying div
            elem.childNodes[i].style.color = strokeColor;
        } else {
          elem.style.stroke = strokeColor;
        }
      }

      var fillColor = this.fillColor().get();
      if (fillColor == null && direct) fillColor = sfig.defaultFillColor;  // Set default
      if (fillColor != null) elem.style.fill = fillColor;

      var strokeWidth = this.strokeWidth().get();
      if (strokeWidth == null && direct) strokeWidth = sfig.defaultStrokeWidth;  // Set default
      if (strokeWidth != null) elem.style.strokeWidth = strokeWidth;

      var strokeOpacity = this.strokeOpacity().get();
      if (strokeOpacity != null) elem.style.strokeOpacity = strokeOpacity;

      var strokeDasharray = this.strokeDasharray().get();
      if (strokeDasharray != null) elem.style.strokeDasharray = strokeDasharray.join(' ');

      var fillOpacity = this.fillOpacity().get();
      if (fillOpacity != null) elem.style.fillOpacity = fillOpacity;
    }
  }

  // Hacky: look inside the element to get the strokeWidth property
  function getStrokeWidth(elem) {
    if (elem.style.strokeWidth != '')
      return parseFloat(elem.style.strokeWidth); // Assume units are pixels
    if (elem.childElementCount == 1)
      return getStrokeWidth(elem.firstChild);
    return sfig.defaultStrokeWidth;
  }

  // Set this.elem to the rendered element and update all the bounding boxes recursively.
  Block.prototype.applyTransforms = function(state) {
    // Perform transforms (remember to update the bounding boxes recursively).
    var transforms = [];
    var ctm = sfig_.svg.createSVGMatrix();

    // Note: translate must come before scale to not affect the amount
    // translated.
    var xshift = this.xshift().getOrElse(0);
    var yshift = this.yshift().getOrElse(0);
    if (xshift != 0 || yshift != 0) {
      transforms.push('translate('+xshift+','+yshift+')');
      //ctm = sfig_.shiftMatrix(xshift, yshift);
      ctm.e = xshift;
      ctm.f = yshift;
    }

    var xscale = this.xscale().getOrElse(1);
    var yscale = this.yscale().getOrElse(1);
    if (xscale != 1 || yscale != 1) {
      transforms.push('scale('+xscale+','+yscale+')');
      //ctm = sfig_.scaleMatrix(xscale, yscale);
      ctm.a = xscale;
      ctm.d = yscale;
    }

    var rotate = this.rotate().getOrElse(0);
    if (rotate != 0) {
      transforms.push('rotate('+rotate+','+this.xrotatePivot().getOrElse(0)+','+this.yrotatePivot().getOrElse(0)+')');
      ctm = null;
    }

    var xskew = this.xskew().getOrElse(0);
    if (xskew != 0) {
      transforms.push('skewX('+xskew+')');
      ctm = null;
    }
    var yskew = this.yskew().getOrElse(0);
    if (yskew != 0) {
      transforms.push('skewY('+yskew+')');
      ctm = null;
    }

    if (transforms.length > 0)
      this.elem.setAttribute('transform', transforms.join(' '));

    state.svg.appendChild(this.elem);  // Need elements to be added before we can bounding box.

    // Compute bounding box if it doesn't already exist
    if (!this.bboxIsSet) {
      this.bboxIsSet = true;
      if (this.children.length == 0) {  // Base case
        var bbox = this.elem.getBBox();
        // By default, the bounding box does not include half of the stroke.
        // Adjust it so it includes the entire element.
        var s = getStrokeWidth(this.elem);
        this.left(bbox.x - s/2);
        this.top(bbox.y - s/2);
        this.realWidth(bbox.width + s);
        this.realHeight(bbox.height + s);
      } else {  // Recursive case
        var x0, y0, x1, y1;
        this.children.forEach(function(child) {
          if (child.elem == null) throw 'Child not rendered: '+child;
          if (!child.orphan().get()) {
            x0 = sfig_.robustMin(x0, child.left().get());
            y0 = sfig_.robustMin(y0, child.top().get());
            x1 = sfig_.robustMax(x1, child.right().get());
            y1 = sfig_.robustMax(y1, child.bottom().get());
          }
        });
        if (x0 != null) this.left(x0).top(y0).realWidth(x1-x0).realHeight(y1-y0);
        //sfig.L('update', this, x0, this.left().get());
      }
    }

    // Compute transformation from scratch
    if (ctm == null) {
      ctm = this.elem.getTransformToElement(state.svg);
      //sfig.L('compute transform from scratch', transforms.join(' '), S(ctm));
    }

    // Propagate the transformation down to the bounding boxes
    if (transforms.length > 0) this.updateBBox(ctm);

    //sfig.L(this.toString(), this.left().get(), this.realWidth().get(), this.xmiddle().get());
  }

  Block.prototype.updateBBox = function(ctm) {
    var x = this.left().get(), y = this.top().get(), width = this.realWidth().get(), height = this.realHeight().get();

    // Optimization: only have translate and scale, can solve simpler
    if (ctm.b == 0 && ctm.c == 0) {
      //sfig.L('updateBBox', this, this.left().get(), x * ctm.a + ctm.e);
      this.left(x * ctm.a + ctm.e);
      this.top(y * ctm.d + ctm.f);
      this.realWidth(width * ctm.a);
      this.realHeight(height * ctm.d);
    } else {
      // Because of rotations, need to compute where all the four corners go.
      var x0, y0, x1, y1;
      var p = sfig_.svg.createSVGPoint();
      [[0,0], [1,0], [0, 1], [1,1]].forEach(function(s) {
        p.x = x + width * s[0];
        p.y = y + height * s[1];
        p = p.matrixTransform(ctm);
        x0 = sfig_.robustMin(x0, p.x);
        y0 = sfig_.robustMin(y0, p.y);
        x1 = sfig_.robustMax(x1, p.x);
        y1 = sfig_.robustMax(y1, p.y);
      });

      if (x0 != null) this.left(x0).top(y0).realWidth(x1-x0).realHeight(y1-y0);
    }

    // Recurse
    for (var i = 0; i < this.children.length; i++)
      this.children[i].updateBBox(ctm);
  }

  // reverse: whether we're going through the slides backwards in time (false by default)
  Block.prototype.show = function(reverse) {
    this.elem.style.display = null;
    if (!reverse && this.replace().get() != null) this.replace().get().hide(reverse);
    if (!reverse && this.onShow().get() != null) this.onShow().get()();
  }
  Block.prototype.hide = function(reverse) {
    this.elem.style.display = 'none';
    if (reverse && this.replace().get() != null) this.replace().get().show(reverse);
  }
  Block.prototype.toggleShowHide = function(reverse) {
    // TODO: in Firefox, this messes up MathJax
    // Recursively set the display to whatever is opposite of what the top level is.
    // Return whether it's shown
    var target = this.elem.style.display == 'none' ? null : 'none';
    function recurse(elem) {
      if (elem.style) elem.style.display = target;
      for (var i = 0; i < elem.childElementCount; i++)
        recurse(elem.childNodes[i]);
    }
    recurse(this.elem);
    return target == null;
  }

  Block.prototype.startAnimate = function() {
    // TODO: Animating Text (which is a foreignObject) in Firefox doesn't work (but works in Chrome)
    if (sfig.enableAnimations) {
      for (var i = 0; i < this.elem.childElementCount; i++) {
        var animate = this.elem.childNodes[i];
        if (animate.tagName == 'animate' || animate.tagName == 'animateTransform') {
          animate.beginElement();
        }
      }
    }
  }

  Block.prototype.resetAnimate = function() {
    // Don't need to do anything
  }

  function setAnimateProperties(animate) {
    animate.setAttribute('begin', 'indefinite');
    animate.setAttribute('fill', 'freeze');
  }

  function addAnimate(elem, attribute, fromValue, toValue, duration) {
    if (fromValue == toValue) return false;
    var animate = sfig_.newSvgElem('animate');
    setAnimateProperties(animate);
    animate.setAttribute('attributeName', attribute);
    animate.setAttribute('from', fromValue);
    animate.setAttribute('to', toValue);
    animate.setAttribute('dur', duration);
    elem.appendChild(animate);
    return true;
  }

  function addAnimateTransform(elem, attribute, fromValue, toValue, duration) {
    if (fromValue == toValue) return false;
    var animate = sfig_.newSvgElem('animateTransform');
    setAnimateProperties(animate);
    animate.setAttribute('attributeName', 'transform');
    animate.setAttribute('type', attribute);
    animate.setAttribute('from', fromValue);
    animate.setAttribute('to', toValue);
    animate.setAttribute('dur', duration);
    animate.setAttribute('additive', 'sum');
    elem.appendChild(animate);
    return true;
  }

  Block.prototype.addAnimations = function(elem) {
    var from = this.animate;
    var to = this;
    var duration = this.animate.duration().getOrElse(sfig.defaultAnimateDuration);
    this.hasAnimation = false;

    if (from.fillOpacity().get() != null)
      this.hasAnimation |= addAnimate(elem, 'fill-opacity', from.fillOpacity().get(), to.fillOpacity().getOrElse(1), duration);
    if (from.strokeOpacity().get() != null)
      this.hasAnimation |= addAnimate(elem, 'stroke-opacity', from.strokeOpacity().get(), to.strokeOpacity().getOrElse(1), duration);
    if (from.strokeWidth().get() != null)
      this.hasAnimation |= addAnimate(elem, 'stroke-width', from.strokeWidth().get(), to.strokeWidth().getOrElse(1), duration);

    if (from.xshift().get() != null || from.yshift().get() != null) {
      var xfromValue = from.xshift().getOrElse(0) - to.xshift().getOrElse(0);
      var yfromValue = from.yshift().getOrElse(0) - to.yshift().getOrElse(0);
      var fromValue = xfromValue+','+yfromValue;
      var toValue = '0,0';
      this.hasAnimation |= addAnimateTransform(elem, 'translate', fromValue, toValue, duration);
    }

    if (from.xscale().get() != null || from.yscale().get() != null) {
      var fromValue = from.xscale().getOrElse(1)+','+from.yscale().getOrElse(1);
      var toValue = to.xscale().getOrElse(1)+','+to.yscale().getOrElse(1);
      this.hasAnimation |= addAnimateTransform(elem, 'scale', fromValue, toValue, duration);
    }
  }

  // Create the children and set any remaining properties based on others.
  // Default: do nothing.
  Block.prototype.createChildren = function() { }

  // Look at all the properties and children and create the SVG elem property.
  // Default: just collect children into a single group.
  Block.prototype.renderElem = function(state, callback) {
    var group = sfig_.newSvgElem('g');
    this.children.forEach(function(block) {
      if (block.elem == null) throw 'No elem for '+block;
      group.appendChild(block.elem);
    });
    this.elem = group;
    callback();
  }

  Block.prototype.postRender = function(state) {
    if (this.elem == null) throw 'renderElem didn\'t return anything: '+this;
    this.setStrokeFillProperties(this.elem, true);
    this.applyTransforms(state);

    // Hide initially until explicitly shown.
    // Note: this needs to be done after applyTransforms(), where bounding box is computed.
    this.elem.style.display = 'none';

    // Regardless of fill, always activate on the entire element.
    this.elem.style.pointerEvents = 'all';

    // Add additional properties
    // TODO: works in Chrome, but doesn't work in Firefox
    if (this.tooltip().get() != null) {
      var title = sfig_.newSvgElem('title');
      title.textContent = this.tooltip().get();
      this.elem.appendChild(title);
    }
    if (this.onClick().get() != null) this.elem.onclick = sfig_.funcPrependArg(this.onClick().get(), this);
    if (this.onMouseover().get() != null) this.elem.onmouseover = sfig_.funcPrependArg(this.onMouseover().get(), this);
    if (this.onMouseout().get() != null) this.elem.onmouseout = sfig_.funcPrependArg(this.onMouseout().get(), this);

    var partTooltip = this.partTooltip().get();
    if (partTooltip != null) {
      for (var key in partTooltip) {
        var partElem = document.getElementById(key);
        var title = sfig_.newElem('title');
        title.innerHTML = partTooltip[key];
        partElem.appendChild(title);
      }
    }
    var partOnClick = this.partOnClick().get();
    if (partOnClick) {
      for (var key in partOnClick) {
        var partElem = document.getElementById(key);
        var self = this;
        //partElem.style.pointerEvents = 'all';
        partElem.onclick = function() { partOnClick[key](self, partElem); };
      }
    }

    this.addAnimations(this.elem);

    // Index level to this element so we can quickly show/hide as we change levels.
    var showLevel = this.showLevel().get();
    var hideLevel = this.hideLevel().get();
    if (this.hasAnimation) sfig_.vectorPushInto(state.animateBlocks, showLevel, this);
    if (showLevel != -1) sfig_.vectorPushInto(state.showBlocks, showLevel, this);
    if (hideLevel != -1) sfig_.vectorPushInto(state.hideBlocks, hideLevel, this);
  }

  // Called (either manually or automatically) when we're done setting properties.
  Block.prototype.freeze = function() {
    // Create children if they don't exist.
    if (this.children == null) {
      this.initDependencies = [];
      this.children = [];
      this.createChildren();
    }
    return this;
  }

  Block.prototype.render = function(state, callback) {
    // Recursively go through children and get all blocks in the order they should be rendered.
    function recursiveGetBlocks(block, blocks) {
      if (block.getBlocksVisited) return;
      block.getBlocksVisited = true;
      for (var i = 0; i < block.initDependencies.length; i++)
        recursiveGetBlocks(block.initDependencies[i], blocks);
      for (var i = 0; i < block.children.length; i++)
        recursiveGetBlocks(block.children[i], blocks);
      blocks.push(block);
    }
    var blocks = [];
    recursiveGetBlocks(this, blocks);

    // Finally, go through all the Blocks and render them.
    var i = 0;
    var stage = 0;
    function process() {
      // Optimization: don't need recursion/callback mechanism for blocks that don't need it
      while (i < blocks.length && !blocks[i].renderUsesCallback) {
        blocks[i].renderElem(state, sfig.identity);
        blocks[i].postRender(state);
        i++;
      }

      if (i == blocks.length) return callback();
      var block = blocks[i];
      if (stage == 0) {  // First render...
        stage = 1;
        block.renderElem(state, process);
      } else {  // Then post-process the rendered element
        block.postRender(state);
        i++;
        stage = 0;
        process();
      }
    }
    process();
  }

  Block.prototype.toString = function(recurse) {
    var str = this.className;
    for (var name in this.properties) {
      var value = this.properties[name];
      if (value.value != null) str += ',' + name + '=' + value.value;
    }
    if (recurse && this.children && this.children.length != 0) {
      str += '['+this.children.map(function(block) { return block.toString(recurse); }).join(' ')+']';
    }
    return str;
  }

  Block.prototype.log = function(indent) {
    if (indent == null) indent = '';
    console.log(indent + this.toString());
    this.children.forEach(function(child) { child.log(indent + '  '); });
  }

  // Helper function
  Block.prototype.setPointerWhenMouseOver = function() {
    // TODO: highlight the link (e.g., change color)
    this.onMouseover(function() { sfig.setPointerCursor(); });
    this.onMouseout(function() { sfig.resetCursor(); });
    return this;
  }

  Block.prototype.linkToUrl = function(url) {
    this.onClick(function() { window.open(url); });
    return this.setPointerWhenMouseOver();
  }

  Block.prototype.linkToInternal = function(prez, slideId, level) {
    this.onClick(function(block, event) {
      if (event.ctrlKey)
        sfig_.goToPresentation(sfig_.currPresentationName(), slideId, level, true);
      else
        prez.setSlideIdAndLevel(slideId, level, function() { sfig.resetCursor(); });
    });
    return this.setPointerWhenMouseOver();
  }

  // Parallel setPointerWhenMouseOver() and linkToInternal() for divs.
  // Need these to modify the links of HTML elements which are not represented by a block.
  sfig.divSetPointerWhenMouseOver = function(div) {
    div.onmouseover = function() { sfig.setPointerCursor(); };
    div.onmouseout = function() { sfig.resetCursor(); };
    return div;
  }

  sfig.divLinkToInternal = function(div, prez, slideId, level) {
    div = sfig_.ensureHTMLElement(div);
    div.onclick = function(event) {
      if (event.ctrlKey)
        sfig_.goToPresentation(sfig_.currPresentationName(), slideId, level, true);
      else
        prez.setSlideIdAndLevel(slideId, level, function() { sfig.resetCursor(); });
    };
    return sfig.divSetPointerWhenMouseOver(div);
  }

  Block.prototype.linkToExternal = function(name, slideId, level) {
    this.onClick(function() { sfig_.goToPresentation(name, slideId, level, true); });
    return this.setPointerWhenMouseOver();
  }
})();

////////////////////////////////////////////////////////////
// Subclasses of Block.
////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////
// Text

(function() {
  var Text = sfig.Text = function() {
    Text.prototype.constructor.call(this);
  };
  sfig_.inheritsFrom('Text', Text, sfig.Block);

  // TODO: disadvantage with building bulleted lists this way is that it must
  // be text all rendered at once (can't put pause()).
  Text.bulletize = function(content) {
    if (content instanceof Array) {
      var result = sfig_.newElem('div');
      if (content[0]) result.appendChild(sfig_.ensureHTMLElement(content[0]));
      var ul = sfig_.newElem('ul');
      ul.style.margin = 0;
      for (var i = 1; i < content.length; i++) {
        var li = sfig_.newElem('li');
        li.appendChild(Text.bulletize(content[i]));
        ul.appendChild(li);
      }
      result.appendChild(ul);
      return result;
    }
    return sfig_.ensureHTMLElement(content);
  }

  // Due to MathJax, renderElem doesn't callback.
  Text.prototype.renderUsesCallback = true;

  Text.prototype.renderElem = function(state, callback) {
    var self = this;

    // Put text in a div
    var div = sfig_.newElem('div');
    div.style.display = 'inline-block'; // Needed by Firefox
    div.style.height = 'auto';
    div.style.width = 'auto';
    div.style.float = 'left';
    div.style.fontFamily = this.font().getOrDie();
    div.style.fontSize = this.fontSize().getOrDie();
    var content = this.content().getOrDie();
    if (this.bulleted().get()) {
      if (typeof(content) == 'string') content = [null, content];
      content = Text.bulletize(content);
    }
    div.appendChild(sfig_.ensureHTMLElement(content));

    var font = this.font().getOrDie();
    var fontSize = this.fontSize().getOrDie();
    var content = this.content().getOrDie();

    // Put div in foreignObject for SVG
    var elem = sfig_.newSvgElem('foreignObject');
    elem.setAttribute('width', this.width().getOrElse(1000000));
    elem.setAttribute('height', 1000000);
    elem.appendChild(div);
    state.svg.appendChild(elem);  // Add to just get the size

    function finish() {
      var fudge = 1; // Firefox needs +1
      // BUG: Chrome doesn't render $G$ properly
      elem.setAttribute('width', div.offsetWidth + fudge);
      elem.setAttribute('height', div.offsetHeight + fudge);
      self.elem = elem;
      callback();
    }

    if (sfig.enableMath)
      MathJax.Hub.queue.Push(['Typeset', MathJax.Hub, div], finish);
      //MathJax.Hub.queue.Push(function() { MathJax.Hub.Typeset(div, finish); });
    else
      finish();
  }

  sfig_.addProperty(Text, 'content', null, 'The string to be displayed.');
  sfig_.addProperty(Text, 'font', 'Times New Roman', 'Font to use to display the text.');
  sfig_.addProperty(Text, 'fontSize', 28, 'Font size to use to display the text.');
  sfig_.addProperty(Text, 'width', null, 'Affects wrapping');
  sfig_.addProperty(Text, 'bulleted', null, 'Whether to prepend a bullet');

  sfig.text = function(content) { return new Text().content(content); }
  sfig.bulletedText = function(content) { return sfig.text(content).bulleted(true); }
})();

////////////////////////////////////////////////////////////
// TextBox: allow user to enter text.

(function() {
  // Select doesn't work in Chrome:
  // http://code.google.com/p/chromium/issues/detail?id=116566
  // No problem in Firefox.
  var TextBox = sfig.TextBox = function() {
    TextBox.prototype.constructor.call(this);
  };
  sfig_.inheritsFrom('TextBox', TextBox, sfig.Block);

  TextBox.prototype.renderElem = function(state, callback) {
    var self = this;
    var numCols = this.numCols().get();
    var numRows = this.numRows().get();
    var content = this.content().get();

    var text;
    if (this.multiline().get()) {
      text = sfig_.newElem('input');
      text.type = 'text';
      text.size = numCols;
      if (content) text.value = content;
    } else {
      text = sfig_.newElem('textarea');
      text.setAttribute('spellcheck', false);
      text.rows = numRows;
      text.cols = numCols;
      if (content) text.appendChild(document.createTextNode(content));
    }

    text.onfocus = function() {
      sfig_.keysEnabled = false;
      // Works: when we call refresh() and focus on a text box, the cursor stays the same.
      // Doesn't work: when move out of text area and come back, doesn't maintain position.
      text.setSelectionRange(self.selectionStart().get(), self.selectionEnd().get());
    };
    text.onblur = function() {
      self.selectionStart(text.selectionStart);
      self.selectionEnd(text.selectionEnd);
      // TODO: Doesn't give focus back to body properly
      sfig_.keysEnabled = true;
    };

    text.onkeypress = function(event) {
      var key = sfig_.eventToKey(event);
      if (key == 'ctrl-enter' || (self.numRows().get() == 1 && key == 'enter')) {
        self.content(text.value);  // Set the text
        self.selectionStart(text.selectionStart);
        self.selectionEnd(text.selectionEnd);
        if (self.onEnter().get() != null)
          self.onEnter().get()(self);
      }
    }

    if (this.onChange().get() != null) {
      text.onchange = sfig_.funcPrependArg(this.onChange().get(), this);
    }

    // Put div in foreignObject for SVG
    var elem = sfig_.newSvgElem('foreignObject');
    elem.setAttribute('width', 1000000);
    elem.setAttribute('height', 1000000);
    elem.appendChild(text);
    state.svg.appendChild(elem);  // Add to just get the size
    var fudge = 2; // Need this for Chrome
    elem.setAttribute('width', text.offsetWidth + fudge);
    elem.setAttribute('height', text.offsetHeight + fudge);

    this.elem = elem;
    this.textElem = elem.firstChild;
    callback();
  }

  TextBox.prototype.focus = function() { return this.textElem.focus(); }

  sfig_.addProperty(TextBox, 'content', null, 'The string to be displayed.');
  sfig_.addPairProperty(TextBox, 'selection', 'selectionStart', 'selectionEnd', 0, 0, 'Where the cursor is');
  sfig_.addProperty(TextBox, 'multiline', null, 'Whether to use textarea (rather than input text)');

  sfig_.addProperty(TextBox, 'onChange', null, 'Function to call when the content changes.');
  sfig_.addProperty(TextBox, 'onEnter', null, 'Function to call when enter is pressed.');

  sfig_.addPairProperty(TextBox, 'size', 'numCols', 'numRows', 50, 1, 'Size of the text box');

  sfig.textBox = function() { return new TextBox(); }
})();

////////////////////////////////////////////////////////////
// Raw: creates SVG DOM elements directly.

(function() {
  var Raw = sfig.Raw = function() {
    Raw.prototype.constructor.call(this);
  };
  sfig_.inheritsFrom('Raw', Raw, sfig.Block);

  sfig.stringToElem = function(str) {
    // TODO: doesn't work for MathJax
    var div = sfig_.newElem('div');
    str = '<svg xmlns="'+sfig_.svgns+'" verison="1.1"><g>' + str + '</g></svg>';
    div.innerHTML = str;
    var svg = div.firstChild;
    if (svg.childElementCount != 1) throw 'Expected one element, but got '+div;
    return svg.firstChild;
  }

  Raw.prototype.renderElem = function(state, callback) {
    var content = this.content().get();
    if (content instanceof Function) content = content();
    this.elem = content;
    callback();
  }
  sfig_.addProperty(Raw, 'content', null, 'DOM element');

  // Call |addTo| on a non-SVG element (<div/>) of the desired size.
  // If rendered thing is an svg, just pull it out (e.g., for Grafico).
  // Otherwise, add it as as a foreignObject.
  sfig.rawAddHtml = function(width, height, addTo) {
    return raw(function() {
      var div = sfig_.newElem('div');
      div.style.width = width+'px';
      div.style.height = height+'px';
      var body = document.body;
      body.appendChild(div);
      addTo(div);
      var svg = div.firstChild;
      if (svg.tagName == 'svg') {
        var g = sfig_.newSvgElem('g');
        while (svg.hasChildNodes())
          g.appendChild(svg.firstChild);
        body.removeChild(div);
        return g;
      } else {
        var foreignObject = sfig_.newSvgElem('foreignObject');
        foreignObject.setAttribute('width', width);
        foreignObject.setAttribute('height', height);
        foreignObject.appendChild(div);
        return foreignObject;
      }
    });
  };

  // Call |addTo| on an SVG element (<g/>) and return it (e.g., for d3)
  sfig.rawAddSvg = function(addTo) {
    return raw(function() {
      var g = sfig_.newSvgElem('g');
      addTo(g);
      return g;
    });
  };

  sfig.raw = function(content) { return new Raw().content(content); }
  sfig.nil = function(content) { return new Raw().content(sfig_.newSvgElem('g')); }
})();

////////////////////////////////////////////////////////////
// Image

(function() {
  var Image = sfig.Image = function() {
    Image.prototype.constructor.call(this);
  };
  sfig_.inheritsFrom('Image', Image, sfig.Block);

  Image.prototype.renderElem = function(state, callback) {
    var href = this.href().getOrDie();
    if (href.substr(-4) == '.pdf') {
      // Not quite ready: doesn't work very nicely
      var div = sfig_.newElem('object');
      div.setAttribute('data', href);
      div.setAttribute('type', 'application/pdf');
      div.setAttribute('width', this.width().getOrElse('100%'));
      div.setAttribute('height', this.height().getOrElse('100%'));

      var elem = sfig_.newSvgElem('foreignObject');
      elem.setAttribute('width', this.width().getOrDie());
      elem.setAttribute('height', this.height().getOrDie());
      elem.appendChild(div);
      this.elem = elem;
    } else {
      var elem = sfig_.newSvgElem('image');
      elem.setAttributeNS('http://www.w3.org/1999/xlink', 'href', this.href().getOrDie());
      elem.setAttribute('width', this.width().getOrDie());
      elem.setAttribute('height', this.height().getOrDie());
      this.elem = elem;
    }
    callback();
  }
  sfig_.addProperty(Image, 'href', null, 'URL of the image to be loaded');
  sfig_.addPairProperty(Image, 'dim', 'width', 'height', null, null, 'Dimensions of rectangle');

  sfig.image = function(href) { return new Image().href(href); }

  sfig_.cachedCommands = ['mkdir -p cached-images'];
  sfig.cachedImage = function(href) {
    var tokens = href.split('/');
    var local = 'cached-images/'+tokens[tokens.length-1];

    if (sfig.useCachedImages) {
      // Use the local version
      return new image(local);
    } else {
      // Use web version, but suggest caching
      sfig_.cachedCommands.push('wget -c \''+href+'\' -O '+local);
      return new image(href);
    }
  }
  sfig.showCachedCommands = function() {
    console.log(sfig_.cachedCommands.join('\n'));
  }
})();

////////////////////////////////////////////////////////////
// Ellipse

(function() {
  var Ellipse = sfig.Ellipse = function() {
    Ellipse.prototype.constructor.call(this);
  };
  sfig_.inheritsFrom('Ellipse', Ellipse, sfig.Block);

  Ellipse.prototype.renderElem = function(state, callback) {
    var elem = sfig_.newSvgElem('ellipse');
    elem.setAttribute('rx', this.xradius().getOrDie());
    elem.setAttribute('ry', this.yradius().getOrDie());
    this.elem = elem;
    callback();
  }
  sfig_.addPairProperty(Ellipse, 'radius', 'xradius', 'yradius', null, null, 'Vertical and horizontal radius of ellipse');

  Ellipse.prototype.clipPoint = function(angle) {
    this.ensureRendered();
    // Assume no rotation!
    var mx = this.realWidth().get() / 2;
    var my = this.realHeight().get() / 2;
    var dx = sfig_.cosDegrees(angle) * this.xradius().getOrDie();
    var dy = sfig_.sinDegrees(angle) * this.yradius().getOrDie();
    return [this.left().get() + mx + dx, this.top().get() + my + dy];
  }

  sfig.ellipse = function(rx, ry) { return new Ellipse().radius(rx, ry); }
  sfig.circle = function(r) { return new Ellipse().radius(r); }
})();

////////////////////////////////////////////////////////////
// ArrowHead: a triangle which is oriented.

(function() {
  var ArrowHead = sfig.ArrowHead = function() {
    ArrowHead.prototype.constructor.call(this);
  };
  sfig_.inheritsFrom('ArrowHead', ArrowHead, sfig.Block);

  ArrowHead.prototype.createChildren = function() {
    var width = this.width().getOrElse(sfig.defaultArrowWidth);
    var length = this.length().getOrElse(sfig.defaultArrowLength);
    var e = this.strokeWidth().getOrElse(sfig.defaultStrokeWidth) * 1.5;  // Adjust for stroke size
    var poly = sfig.polygon([-e,0], [-length-e, -width/2], [-length-e, +width/2]);
    poly.rotate(this.angle());
    poly.shift(this.xtip(), this.ytip());
    this.addChild(poly);
  }

  // Set by the Line
  sfig_.addPairProperty(ArrowHead, 'tip', 'xtip', 'ytip', null, null, 'Tip of the arrow');
  sfig_.addProperty(ArrowHead, 'angle', null, 'Orientation of the arrow');
  sfig_.addPairProperty(ArrowHead, 'dim', 'width', 'length', 6, 9, 'Size of the arrow');
})();

////////////////////////////////////////////////////////////
// Line: a line segment connecting two points or objects
// with clipping.

(function() {
  var Line = sfig.Line = function() {
    Line.prototype.constructor.call(this);
  };
  sfig_.inheritsFrom('Line', Line, sfig.Block);

  Line.prototype.renderElem = function(state, callback) {
    // Get positions
    var x1, y1, x2, y2;
    if (this.b1().get() != null) {
      x1 = this.b1().get().xmiddle().getOrDie();
      y1 = this.b1().get().ymiddle().getOrDie();
    } else {
      x1 = this.x1().getOrDie();
      y1 = this.y1().getOrDie();
    }

    if (this.b2().get() != null) {
      x2 = this.b2().get().xmiddle().getOrDie();
      y2 = this.b2().get().ymiddle().getOrDie();
    } else {
      x2 = this.x2().getOrDie();
      y2 = this.y2().getOrDie();
    }

    // Compute default angle from start to end (straight)
    var straightAngle = sfig_.atan2Degrees(y2 - y1, x2 - x1);
    var angle1 = this.angle1().getOrElse(straightAngle);
    var angle2 = this.angle2().getOrElse(straightAngle + 180);

    // Clip with object if necessary
    if (this.b1().get() != null) {
      var p1 = this.b1().get().clipPoint(angle1);
      x1 = p1[0], y1 = p1[1];
    }
    if (this.b2().get() != null) {
      var p2 = this.b2().get().clipPoint(angle2);
      x2 = p2[0], y2 = p2[1];
    }

    // Save our rendered values (note: before shrinking)
    this.realAngle1(angle1);
    this.realAngle2(angle2);
    this.realx1(x1);
    this.realy1(y1);
    this.realx2(x2);
    this.realy2(y2);

    // Apply shrink - note doesn't affect the real coordinates
    var shrink1 = this.shrink1().get();
    if (shrink1 != null) {
      x1 += shrink1 * sfig_.cosDegrees(angle1);
      y1 += shrink1 * sfig_.sinDegrees(angle1);
    }
    var shrink2 = this.shrink2().get();
    if (shrink2 != null) {
      x2 += shrink2 * sfig_.cosDegrees(angle2);
      y2 += shrink2 * sfig_.sinDegrees(angle2);
    }

    // Compute label position (note: on the shrunk coordinates)
    // alwaysUp: label is always in a negative y direction
    // frac: what fraction of the way from p1 to p2
    // soar: how much to go above the line at |frac|
    function getPoint(frac, soar, alwaysUp) {
      var x = frac * x1 + (1-frac) * x2;
      var y = (y1 + y2) / 2;
      var len = Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
      var dx = -(y2-y1) / len;
      var dy = +(x2-x1) / len;
      if (alwaysUp && dy > 0) { dx = -dx; dy = -dy;}
      x += soar * dx;
      y += soar * dy;
      return {x: x, y: y};
    }

    // Place label
    var labelDist = this.labelDist().getOrDie();
    var labelpt = getPoint(0.5, labelDist, true);
    this.plabel(labelpt.x, labelpt.y);

    // Draw line
    var ctrlx1 = this.ctrlx1().get();
    var ctrly1 = this.ctrly1().get();
    var curve = this.curve().get();
    if (curve) {
      var ctrlpt = getPoint(0.5, curve, false);
      ctrlx1 = ctrlpt.x;
      ctrly1 = ctrlpt.y;
    }
    //sfig.L(curve, ctrlx1, ctrly1);

    if (ctrlx1 != null) {
      this.elem = sfig_.newSvgElem('path');
      var spec = 'M'+x1+','+y1+' '+'Q'+ctrlx1+','+ctrly1+' '+x2+','+y2;
      //sfig.L(spec);
      this.elem.setAttribute('d', spec);
    } else {
      this.elem = sfig_.newSvgElem('line');
      this.elem.setAttribute('x1', x1);
      this.elem.setAttribute('y1', y1);
      this.elem.setAttribute('x2', x2);
      this.elem.setAttribute('y2', y2);
    }

    callback();
  }

  // Either point or block is specified
  sfig_.addPairProperty(Line, 'p1', 'x1', 'y1', null, null, 'Starting point');
  sfig_.addPairProperty(Line, 'p2', 'x2', 'y2', null, null, 'Ending point');
  sfig_.addProperty(Line, 'b1', null, 'Starting block');
  sfig_.addProperty(Line, 'b2', null, 'Ending block');
  sfig_.addPairProperty(Line, 'shrink', 'shrink1', 'shrink2', null, null, 'Shink length of line by this amount');
  sfig_.addProperty(Line, 'angle1', null, 'Starting angle');
  sfig_.addProperty(Line, 'angle2', null, 'Ending angle');
  sfig_.addProperty(Line, 'curve', null, 'Distance to curve the line (specifies a quadratic Bezier curve)');
  sfig_.addPairProperty(Line, 'ctrlp1', 'ctrlx1', 'ctrly1', null, null, 'First control point');
  sfig_.addPairProperty(Line, 'ctrlp2', 'ctrlx2', 'ctrly2', null, null, 'Second control point');

  // Rendered versions
  sfig_.addPairProperty(Line, 'realp1', 'realx1', 'realy1', null, null, 'Rendered starting point');
  sfig_.addPairProperty(Line, 'realp2', 'realx2', 'realy2', null, null, 'Rendered ending point');
  sfig_.addProperty(Line, 'realAngle1', null, 'Rendered starting angle');
  sfig_.addProperty(Line, 'realAngle2', null, 'Rendered ending angle');

  // For label positioning (label drawing is done elsewhere
  sfig_.addProperty(Line, 'labelDist', 5, 'How far to put the label');
  sfig_.addPairProperty(Line, 'plabel', 'xlabel', 'ylabel', null, null, 'After rendering, where to put the center of the label');

  Line.prototype.arg1 = function(arg1) {
    if (arg1 instanceof Array) this.p1(arg1[0], arg1[1]);
    else if (arg1 instanceof sfig.Block) this.b1(arg1);
    return this;
  }
  Line.prototype.arg2 = function(arg2) {
    if (arg2 instanceof Array) this.p2(arg2[0], arg2[1]);
    else if (arg2 instanceof sfig.Block) this.b2(arg2);
    return this;
  }

  // Arguments arg1, arg2 could be either a point [x,y] or an Block.
  sfig.line = function(arg1, arg2) { return new Line().arg1(arg1).arg2(arg2); }
})();

////////////////////////////////////////////////////////////
// DecoratedLine: decorate Line with arrow heads and labels.

(function() {
  var DecoratedLine = sfig.DecoratedLine = function() {
    DecoratedLine.prototype.constructor.call(this);
    this.line = new sfig.Line();
    this.line.setEnd(this);
  };
  sfig_.inheritsFrom('DecoratedLine', DecoratedLine, sfig.Block);

  DecoratedLine.prototype.createChildren = function() {
    if (this.drawArrow1().get()) {
      this.arrowHead1 = new sfig.ArrowHead();
      this.arrowHead1.setEnd(this);
      this.arrowHead1.tip(this.line.realx1(), this.line.realy1());
      this.arrowHead1.angle(this.line.realAngle1().add(180));
      // Need to explicitly set the color and width
      this.arrowHead1.color(this.line.strokeColor().getOrElse(sfig.defaultStrokeColor));
      this.arrowHead1.strokeWidth(this.strokeWidth().getOrElse(sfig.defaultStrokeWidth));
      this.line.shrink1(this.arrowHead1.length().getOrDie() + this.arrowHead1.strokeWidth().getOrDie() * 1.5);
    }
    if (this.drawArrow2().get()) {
      this.arrowHead2 = new sfig.ArrowHead();
      this.arrowHead2.setEnd(this);
      this.arrowHead2.tip(this.line.realx2(), this.line.realy2());
      this.arrowHead2.angle(this.line.realAngle2().add(180));
      // Need to explicitly set the color and width
      this.arrowHead2.color(this.line.strokeColor().getOrElse(sfig.defaultStrokeColor));
      this.arrowHead2.strokeWidth(this.strokeWidth().getOrElse(sfig.defaultStrokeWidth));
      this.line.shrink2(this.arrowHead2.length().getOrDie() + this.arrowHead2.strokeWidth().getOrDie() * 1.5);
    }

    this.addChild(this.line);
    if (this.arrowHead1 != null) this.addChild(this.arrowHead1);
    if (this.arrowHead2 != null) this.addChild(this.arrowHead2);

    // Add label
    var label = this.label().get();
    if (label != null)
      this.addChild(center(label).shift(this.line.xlabel(), this.line.ylabel()));
  };

  sfig_.addPairProperty(DecoratedLine, 'drawArrow', 'drawArrow1', 'drawArrow2', null, null, 'Whether to draw an arrow at the two ends of the line');
  sfig_.addProperty(DecoratedLine, 'label', null, 'Label to draw');

  sfig.decoratedLine = function(arg1, arg2) { return new DecoratedLine().line.arg1(arg1).arg2(arg2).end; }
  sfig.arrow = function(arg1, arg2) { return sfig.decoratedLine(arg1, arg2).drawArrow(false, true); }
  sfig.doubleArrow = function(arg1, arg2) { return sfig.decoratedLine(arg1, arg2).drawArrow(true, true); }

  sfig.leftArrow = function(n) { return sfig.arrow([0, 0], [-n, 0]); }
  sfig.rightArrow = function(n) { return sfig.arrow([0, 0], [n, 0]); }
  sfig.upArrow = function(n) { return sfig.arrow([0, 0], [0, -n]); }
  sfig.downArrow = function(n) { return sfig.arrow([0, 0], [0, n]); }
  sfig.leftRightArrow = function(n) { return sfig.doubleArrow([0, 0], [n, 0]); }
  sfig.upDownArrow = function(n) { return sfig.doubleArrow([0, 0], [0, n]); }
})();

////////////////////////////////////////////////////////////
// Poly: sequence of segments

(function() {
  var Poly = sfig.Poly = function() {
    Poly.prototype.constructor.call(this);
  };
  sfig_.inheritsFrom('Poly', Poly, sfig.Block);

  Poly.prototype.renderElem = function(state, callback) {
    var elem = sfig_.newSvgElem(this.closed().get() ? 'polygon' : 'polyline');
    elem.setAttribute('points', this.points().getOrDie().map(function(p) { return p.join(','); }).join(' '));
    this.elem = elem;
    callback();
  }

  sfig_.addProperty(Poly, 'points', null, 'Array of points');
  sfig_.addProperty(Poly, 'closed', null, 'Whether to create a polygon');

  sfig.polyline = function() { return new Poly().points(Array.prototype.slice.call(arguments)).closed(false); }
  sfig.polygon = function() { return new Poly().points(Array.prototype.slice.call(arguments)).closed(true); }
  sfig.eqTriangle = function(side) {
    var length = side * 0.5 * Math.sqrt(3);
    var width = side;
    return sfig.polygon([0,0], [-width/2, length], [+width/2, length]);
  }
  sfig.xline = function(length) { return sfig.polyline([0, 0], [length, 0]); }
  sfig.yline = function(length) { return sfig.polyline([0, 0], [0, length]); }

  sfig.xspace = function(length) { return sfig.xline(length).opacity(0); }
  sfig.yspace = function(length) { return sfig.yline(length).opacity(0); }
})();

////////////////////////////////////////////////////////////
// Rect

(function() {
  var Rect = sfig.Rect = function() {
    Rect.prototype.constructor.call(this);
  };
  sfig_.inheritsFrom('Rect', Rect, sfig.Block);

  Rect.prototype.renderElem = function(state, callback) {
    var elem = sfig_.newSvgElem('rect');
    elem.setAttribute('width', this.width().getNonnegativeOrDie());
    elem.setAttribute('height', this.height().getNonnegativeOrDie());
    if (this.xround().get() != null) elem.setAttribute('rx', this.xround().get());
    if (this.yround().get() != null) elem.setAttribute('ry', this.yround().get());
    this.elem = elem;
    callback();
  }

  sfig_.addPairProperty(Rect, 'dim', 'width', 'height', null, null, 'Dimensions of rectangle');
  sfig_.addPairProperty(Rect, 'round', 'xround', 'yround', null, null, 'Amount of rounding to do on the rectangle');

  sfig.rect = function(width, height) { return new Rect().dim(width, height); }
  sfig.square = function(width) { return new Rect().dim(width); }
})();

////////////////////////////////////////////////////////////
// Wrap: light wrapper around an object.  This allows us to modify the
// properties (e.g., shifting, scaling) without interferring with the
// properties of the underlying object.

(function() {
  var Wrap = sfig.Wrap = function() {
    Wrap.prototype.constructor.call(this);
  };
  sfig_.inheritsFrom('Wrap', Wrap, sfig.Block);

  Wrap.prototype.createChildren = function() {
    var content = this.content();
    if (content.exists()) {
      content = sfig.std(content.get());
      this.addChild(content);
      if (!this.orphan().exists()) this.orphan(content.orphan());
    }
  }

  Wrap.prototype.resetContent = function(content) {
    this.content(content);
  }

  sfig_.addProperty(Wrap, 'content', null, 'What to draw');

  sfig.wrap = function(block) { return new sfig.Wrap().content(block); }
})();

////////////////////////////////////////////////////////////
// Transform

// A transform takes an object and transforms its position/size and can do it
// in a way that depends on the position/size of the object.
// Scale so that width is a certain value (if height not specified, scale as
// well to keep same aspect ratio).
// Transforms are separate from the object because we need to first render it
// to access its position and size.
(function() {
  var Transform = sfig.Transform = function(content) {
    Transform.prototype.constructor.call(this);
    this.content = sfig.std(content);
  };
  sfig_.inheritsFrom('Transform', Transform, sfig.Block);

  Transform.prototype.createChildren = function() {
    if (!this.orphan().exists()) this.orphan(this.content.orphan());

    var wrapped = sfig.wrap(this.content);

    // Shift so that the pivot point is at (0,0)
    var xpivot = this.xpivot().get();
    if (xpivot != null) {
      var x1 = this.content.left().mul(-0.5 * (1 - xpivot));
      var x2 = this.content.right().mul(-0.5 * (1 + xpivot));
      wrapped.xshift(x1.add(x2));
    }

    var ypivot = this.ypivot().get();
    if (ypivot != null) {
      var y1 = this.content.top().mul(-0.5 * (1 - ypivot));
      var y2 = this.content.bottom().mul(-0.5 * (1 + ypivot));
      wrapped.yshift(y1.add(y2));
    }

    // Resize so that width and height are as desired
    var xscale = this.width().andThen(this.width().div(this.content.realWidth()));
    var yscale = this.height().andThen(this.height().div(this.content.realHeight()));
    wrapped.scale(xscale.min(yscale));  // Preserve aspect ratio
    //wrapped.scale(xscale.orElse(yscale), yscale.orElse(xscale));

    this.addChild(wrapped);
  }

  Transform.prototype.home = function() { return this.pivot(-1, -1); }
  Transform.prototype.center = function() { return this.pivot(0, 0); }

  // These are used to set shift, scale
  sfig_.addPairProperty(Transform, 'pivot', 'xpivot', 'ypivot', null, null, 'A relative scaling (between [-1,1]) determines position of each child.  Make each of these positions coincide at (0,0).');
  sfig_.addPairProperty(Transform, 'dim', 'width', 'height', null, null, 'Absolute dimensions to resize object to.');

  sfig.transform = function(content) { return new Transform(content); }
  sfig.home = function(content) { return sfig.transform(content).home(); }
  sfig.center = function(content) { return sfig.transform(content).center(); }
})();

////////////////////////////////////////////////////////////
// Overlay: a group of objects rendered on top of each other.

(function() {
  var Overlay = sfig.Overlay = function(items) {
    var self = this;
    Overlay.prototype.constructor.call(this);
    this.items = sfig.std(items);
  };
  sfig_.inheritsFrom('Overlay', Overlay, sfig.Block);

  Overlay.prototype.createChildren = function() {
    var self = this;
    this.items.forEach(function(item) {
      if (item instanceof sfig.Block) {
        self.addChild(sfig.transform(item).pivot(self.xpivot(), self.ypivot()));
      } else if (item instanceof sfig.PropertyChanger) {
        self.addChild(item);
      } else {
        throw 'Invalid: '+item;
      }
    });
  }

  // Delegate pivoting to the transforms
  Overlay.prototype.center = function() { return this.pivot(0, 0); }
  sfig_.addPairProperty(Overlay, 'pivot', 'xpivot', 'ypivot', null, null, 'A relative scaling (between [-1,1]) determines position of each child.  Make each of these positions coincide at (0,0).');

  sfig.overlay = function() { return new Overlay(arguments); }
})();

////////////////////////////////////////////////////////////
// Frame: an object overlaid on a rectangular background |bg|.

(function() {
  var Frame = sfig.Frame = function(content) {
    Frame.prototype.constructor.call(this);
    this.content = sfig.std(content);
    this.content.setEnd(this);
    this.bg = new sfig.Rect();
    this.bg.setEnd(this);
    this.titleBlock = new sfig.Wrap();

    var bgWithTitle = sfig.overlay(
      this.bg,  // Rectangular background
      transform(this.titleBlock).pivot(-1, 0).xshift(10),  // Title
    _);
    this.overlay = sfig.overlay(bgWithTitle, this.content);
    this.overlay.pivot(this.xpivot().orElse(0), this.ypivot().orElse(0)); // Center by default
  };
  sfig_.inheritsFrom('Frame', Frame, sfig.Block);

  Frame.prototype.createChildren = function() {
    var strokeWidth = this.bg.strokeWidth();
    if (!strokeWidth.exists()) strokeWidth.set(0);  // Default

    var title = this.title();
    if (title.exists()) this.titleBlock.content(sfig.std(title.get()));

    // Make |bg| a bit bigger than |content| so that it fits snuggly without overlapping.
    var extra = strokeWidth.getOrDie() / 2;
    var width = this.bg.width();
    var height = this.bg.height();
    if (!width.exists()) {
      var contentWidth = this.content.realWidth().add((this.xpadding().getOrElse(0) + extra) * 2);
      var titleWidth = this.titleBlock.realWidth().add(this.titleIndent().getOrDie() * 2);
      width.set(contentWidth.max(titleWidth));
    }
    if (!height.exists())
      height.set(this.content.realHeight().add((this.ypadding().getOrElse(0) + extra) * 2));

    this.addInitDependency(this.content);
    this.addInitDependency(this.titleBlock);
    this.addChild(this.overlay);
  }

  // Delegate pivoting to the transforms
  Frame.prototype.center = function() { return this.pivot(0, 0); }
  sfig_.addPairProperty(Frame, 'pivot', 'xpivot', 'ypivot', null, null, 'A relative scaling (between [-1,1]) determines position of each child.  Make each of these positions coincide.');
  sfig_.addPairProperty(Frame, 'padding', 'xpadding', 'ypadding', null, null, 'Amount of space to put around the object');
  sfig_.addProperty(Frame, 'title', null, 'Title to put on the border');
  sfig_.addProperty(Frame, 'titleIndent', 10, 'Horizontal space between frame and start of title');

  sfig.frame = function(block) { return new Frame(block); }

  sfig.opaquebg = function(block, color) { return sfig.frame(block).bg.color(color || sfig.defaultBgColor).end; }
})();

////////////////////////////////////////////////////////////
// Table
// TODO: support multirow/column tables

(function() {
  var Table = sfig.Table = function(contents) {
    Table.prototype.constructor.call(this);
    contents = sfig.std(contents);

    this.items = []; // Flattened version of contents
    this.cells = [];

    var r = 0;
    var c = 0;
    var numCols = -1;
    for (var i = 0; i < contents.length; i++) {
      var item = contents[i];
      if (item instanceof Array) {
        for (var j = 0; j < item.length; j++) {
          var x = item[j];
          if (x instanceof sfig.Block) {
            sfig_.matrixSetValue(this.cells, r, c++, x);
            this.items.push(x);
          } else if (x instanceof sfig.PropertyChanger) {
            this.items.push(x);
          } else {
            throw 'Expected Block or PropertyChanger, but got: '+x;
          }
        }
        if (numCols == -1) numCols = c;
        if (numCols != c) throw 'Each row must have the same number of columns, but row 0 has '+numCols+' while row '+(r+1)+' has '+c;
        c = 0;
        r++;
      } else if (item instanceof sfig.PropertyChanger) {
        this.items.push(item);
      } else {
        throw 'Expected Array or PropertyChanger, but got: '+item;
      }
    }
    this.numCols = numCols;
    this.numRows = r;
  };
  sfig_.inheritsFrom('Table', Table, sfig.Block);

  Table.prototype.createChildren = function() {
    for (var i = 0; i < this.items.length; i++) this.addChild(this.items[i]);
  }

  Table.prototype.renderElem = function(state, callback) {
    // Justification
    var xjustify = this.xjustify().getOrElse('l');
    while (xjustify.length < this.numCols) xjustify += xjustify[xjustify.length-1];
    var yjustify = this.yjustify().getOrElse('l');
    while (yjustify.length < this.numRows) yjustify += yjustify[yjustify.length-1];

    // Compute maximum width of each column and height of each column
    var widths = [];
    var heights = [];
    var cellWidth = this.cellWidth().getOrElse(0);
    var cellHeight = this.cellHeight().getOrElse(0);
    for (var r = 0; r < this.numCols; r++) widths.push(cellWidth);
    for (var c = 0; c < this.numRows; c++) heights.push(cellHeight);
    for (var r = 0; r < this.numRows; r++) {
      for (var c = 0; c < this.numCols; c++) {
        widths[c] = Math.max(widths[c], this.cells[r][c].realWidth().get());
        heights[r] = Math.max(heights[r], this.cells[r][c].realHeight().get());
      }
    }

    var xmargin = this.xmargin().getOrElse(0);
    var ymargin = this.ymargin().getOrElse(0);

    // If desire a different width/height, change the widths/heights
    // by shrinking the excess.
    var totalWidth = 0;
    if (this.numCols > 0) {
      totalWidth += xmargin * (this.numCols - 1);
      for (var c = 0; c < this.numCols; c++) totalWidth += widths[c];
      var extraWidth = (this.width().getOrElse(totalWidth) - totalWidth) / this.numCols;
      for (var c = 0; c < this.numCols; c++) widths[c] += extraWidth;
      totalWidth += extraWidth;
    }

    var totalHeight = 0;
    if (this.numRows > 0) {
      totalHeight += ymargin * (this.numRows - 1);
      for (var r = 0; r < this.numRows; r++) totalHeight += heights[r];
      var extraHeight = (this.height().getOrElse(totalHeight) - totalHeight) / this.numRows;
      for (var r = 0; r < this.numRows; r++) heights[r] += extraHeight;
      totalHeight += extraHeight;
    }

    // Starting positions
    var xstart = [0];
    var ystart = [0];
    for (var c = 1; c <= this.numCols; c++)
      xstart[c] = xstart[c-1] + widths[c-1] + (c < this.numCols ? xmargin : 0);
    for (var r = 1; r <= this.numRows; r++)
      ystart[r] = ystart[r-1] + heights[r-1] + (r < this.numRows ? ymargin : 0);

    function justifyToPivot(justify) {
      if (justify == 'l') return -1;
      if (justify == 'c') return 0;
      if (justify == 'r') return +1;
      throw 'Invalid justify (expected l,c,r): '+justify;
    }

    // To compute the bounding box (if there are orphan children)
    var minx = totalWidth;
    var miny = totalHeight;
    var maxx = 0;
    var maxy = 0;

    // Display the table
    this.elem = sfig_.newSvgElem('g');
    for (var r = 0; r < this.numRows; r++) {
      for (var c = 0; c < this.numCols; c++) {
        var cell = this.cells[r][c];

        // Compute the offset
        var xpivot = cell.xparentPivot().getOrElse(justifyToPivot(xjustify[c]));
        var ypivot = cell.yparentPivot().getOrElse(justifyToPivot(yjustify[r]));
        var xoffset = (xstart[c] + 0.5 * (xpivot + 1) * widths[c]) -
                      (cell.left().getOrDie() + 0.5 * (xpivot + 1) * cell.realWidth().getOrDie());
        var yoffset = (ystart[r] + 0.5 * (ypivot + 1) * heights[r]) -
                      (cell.top().getOrDie() + 0.5 * (ypivot + 1) * cell.realHeight().getOrDie());

        // Only non-orphans contribute to the bounding box
        if (!cell.orphan().get()) {
          minx = Math.min(minx, xstart[c]);
          miny = Math.min(miny, ystart[r]);
          maxx = Math.max(maxx, xstart[c+1]);
          maxy = Math.max(maxy, ystart[r+1]);
        }

        // Shift the cell element
        this.elem.appendChild(sfig_.translateElem(cell.elem, xoffset, yoffset));

        // Manually update the bounding box of the children
        cell.updateBBox(sfig_.shiftMatrix(xoffset, yoffset));
      }
    }

    // Manually set bounding box.
    this.left(minx).top(miny).realWidth(maxx-minx).realHeight(maxy-miny);
    this.bboxIsSet = true;

    callback();
  };

  Table.prototype.closeAppendices = function() { throw 'Not supported for tables'; }

  Table.prototype.center = function() { return this.justify('c', 'c'); }
  sfig_.addPairProperty(Table, 'justify', 'xjustify', 'yjustify', null, null, 'Justification string consisting of l (left), c (center), or r (right)');
  sfig_.addPairProperty(Table, 'margin', 'xmargin', 'ymargin', null, null, 'Amount of space between rows/columns');
  sfig_.addPairProperty(Table, 'cellDim', 'cellWidth', 'cellHeight', null, null, 'Set the dimensions of cells');
  sfig_.addPairProperty(Table, 'dim', 'width', 'height', null, null, 'Set the overall dimensions');

  sfig.table = function() { return new Table(arguments); }
  sfig.xtable = function() { return new Table([arguments]); }
  sfig.ytable = function() { return new Table(sfig.std(arguments).map(function(x) { return x instanceof sfig.Block ? [x] : x; })); }
})();

////////////////////////////////////////////////////////////
// Slide

(function() {
  var Slide = sfig.Slide = function(contents) {
    Slide.prototype.constructor.call(this);
    this.contents = contents;

    this.body = sfig.ytable.apply(null, this.contents).ymargin(this.bodySpacing());
    this.body.dim(this.innerWidth(), this.bodyHeight().mul(this.bodyFrac()));
    this.body.setEnd(this);
  };
  sfig_.inheritsFrom('Slide', Slide, sfig.Block);

  Slide.prototype.createChildren = function() {
    this.titleBlock = this.title().getOrElse('');
    if (!(this.titleBlock instanceof sfig.Block))
      this.titleBlock = sfig.text(this.titleBlock).strokeColor(this.titleColor());
    this.titleBlock.setEnd(this);

    var _ = sfig._;

    //       +                   +
    // title | titleHeight       |
    //       +                   |
    //       | titleSpacing      | height
    // ------+---------------+   |
    // body  | ...           |   |
    //       | bodySpacing   |   |
    //       | ...           | bodyHeight
    //       | bodySpacing   |   |
    //       | ...           |   |
    //       +               +   +

    // Combine title and body
    var titleBlock = sfig.frame(sfig.wrap(this.titleBlock).scale(this.titleScale())).pivot(0, 1).bg.strokeWidth(0).dim(this.innerWidth(), this.titleHeight()).end;
    var titleBody = sfig.ytable(
      titleBlock,
      this.body,
    _).ymargin(this.titleSpacing()).shift(this.leftPadding(), this.topPadding());

    var border = sfig.rect(this.width(), this.height()).strokeWidth(this.borderWidth());

    this.addChild(border);

    this.addChild(titleBody);

    // Add headers and footers
    if (this.leftHeader().exists()) this.addChild(sfig.transform(this.leftHeader().getOrDie()).pivot(-1, -1).shift(this.headerPadding(), this.headerPadding()).scale(this.headerScale()).showLevel(0));
    if (this.rightHeader().exists()) this.addChild(sfig.transform(this.rightHeader().getOrDie()).pivot(+1, -1).shift(this.width().sub(this.headerPadding()), this.headerPadding()).scale(this.headerScale()).showLevel(0));
    if (this.leftFooter().exists()) this.addChild(sfig.transform(this.leftFooter().getOrDie()).pivot(-1, +1).shift(this.footerPadding(), this.height().sub(this.footerPadding())).scale(this.footerScale()).showLevel(0));
    if (this.rightFooter().exists()) this.addChild(sfig.transform(this.rightFooter().getOrDie()).pivot(+1, +1).shift(this.width().sub(this.footerPadding()), this.height().sub(this.footerPadding())).scale(this.footerScale()).showLevel(0));

    var extra = this.extra().get();
    if (extra != null) this.addChild(sfig.std(extra));
  };

  sfig_.addProperty(Slide, 'title', null, 'Title string to show at top of slide.');
  sfig_.addProperty(Slide, 'titleHeight', 50, 'How much vertical space the title should take up.');
  sfig_.addProperty(Slide, 'titleSpacing', 30, 'Vertical distance between title and body.');
  sfig_.addProperty(Slide, 'titleScale', 1.5, 'How much to scale the title up by.');
  sfig_.addProperty(Slide, 'titleColor', 'darkblue', 'How much to scale the title up by.');

  sfig_.addProperty(Slide, 'leftHeader', null, 'String to put in top left corner.');
  sfig_.addProperty(Slide, 'rightHeader', null, 'String to put in top right corner.');
  sfig_.addProperty(Slide, 'leftFooter', null, 'String to put in bottom left corner.');
  sfig_.addProperty(Slide, 'rightFooter', null, 'String to put in bottom right corner.');

  sfig_.addPairProperty(Slide, 'padding', 'headerPadding', 'footerPadding', 10, 10, 'Amount of space between border and header/footer.');
  sfig_.addProperty(Slide, 'headerScale', 0.5, 'Scale for header.');
  sfig_.addProperty(Slide, 'footerScale', 0.5, 'Scale for footer.');
  sfig_.addProperty(Slide, 'bodySpacing', 10, 'How much space to put between rows in the body.');
  sfig_.addProperty(Slide, 'bodyFrac', 1, 'How much of the body to use.');

  sfig_.addProperty(Slide, 'borderWidth', 1, 'Put a border with this thickness around the slide.');

  sfig_.addPairProperty(Slide, 'dim', 'width', 'height', 800, 600, 'Absolute dimensions of the entire slide.');
  sfig_.addPairProperty(Slide, 'xpadding', 'leftPadding', 'rightPadding', 20, 20, 'Horizontal space to put between border and content.');
  sfig_.addPairProperty(Slide, 'ypadding', 'topPadding', 'bottomPadding', 20, 100, 'Vertical space to put between border and content.');

  function removePadding(length, padding1, padding2) { return length - padding1 - padding2; }
  sfig_.addDerivedProperty(Slide, 'innerWidth', removePadding, ['width', 'leftPadding', 'rightPadding'], 'Dimensions minus padding.');
  sfig_.addDerivedProperty(Slide, 'innerHeight', removePadding, ['height', 'topPadding', 'bottomPadding'], 'Dimensions minus padding.');
  sfig_.addDerivedProperty(Slide, 'bodyHeight', removePadding, ['innerHeight', 'titleHeight', 'titleSpacing'], 'Dimensions minus padding.');

  sfig_.addProperty(Slide, 'id', null, 'Identifier of the slide');

  sfig_.addProperty(Slide, 'notes', null, 'Identifier of the slide');
  sfig_.addProperty(Slide, 'showHelp', false, 'Whether to show help');
  sfig_.addProperty(Slide, 'showIndex', true, 'Whether to show slide indices');
  sfig_.addProperty(Slide, 'extra', null, 'Object to overlay on top of the slide');

  sfig.slide = function() {
    var title = arguments[0];
    var contents = Array.prototype.slice.call(arguments, 1);
    var slide = new Slide(contents);
    if (title != null) slide.title(title);
    else slide.titleHeight(0).titleSpacing(0);  // No title - plain slide
    return slide;
  }

  // Return an element which looks like |button|, but when pressed will toggle display of |explanation| under it.
  sfig.explain = function(button, explanation, options) {
    if (options == null) options = {};
    var pivot = options.pivot;
    if (pivot == null) throw 'Missing pivot';

    button = sfig.std(button);
    if (options.borderWidth)
      button = sfig.frame(button).bg.round(5).strokeWidth(options.borderWidth).end.padding(5);
    explanation = frame(explanation).bg.fillColor('#F7F9D0').strokeWidth(2).end.padding(5);
    explanation.scale(options.explanationScale || sfig.defaultExplanationScale); 
    var x, y;
    if (pivot[0] == -1) x = button.left();
    else if (pivot[0] == 1) x = button.right();
    else x = button.xmiddle();
    if (pivot[1] == -1) y = button.bottom();
    else if (pivot[1] == 1) y = button.top();
    else y = button.ymiddle();
    explanation = transform(explanation).pivot(pivot[0], pivot[1]).shift(x, y).orphan(true).showLevel(-1);

    button.setPointerWhenMouseOver().onClick(function() {
      if (explanation.toggleShowHide())
        button.bg.elem.style.fill = 'gray';
      else
        button.bg.elem.style.fill = 'none';
    });
    return button.appendix(explanation);
  }

  // Set default text width based on slide width
  sfig.Text.defaults.setProperty('width', sfig.slide(null).innerWidth().getOrDie());
})();

////////////////////////////////////////////////////////////
// Presentation: manages the rendering of Blocks to SVGs.

(function() {
  // container is optional
  var Presentation = sfig.Presentation = function(options) {
    if (!options) options = {};
    this.slides = [];
    if (options.initKeys == null || options.initKeys)
      this.initKeys();
  }

  Presentation.prototype.addSlide = function(slide) {
    slide = sfig.std(slide);
    if (!(slide instanceof sfig.Block)) throw 'Slide must be Block, but got: '+slide;

    if (slide instanceof sfig.Slide) {
      // Add slide index
      if (slide.showIndex().get()) slide.rightFooter(this.slides.length)

      // Add notes and help
      var items = [];
      var notes = slide.notes().get();
      if (notes)
        items.push(sfig.explain('Notes', notes, {pivot: [1, -1], borderWidth: 1}));
      if (slide.showHelp().get())
        items.push(sfig.explain('Help', this.getHelpBlock(), {pivot: [1, -1], borderWidth: 1}));
      if (slide.rightHeader().exists())
        items.push(slide.rightHeader().get());
      if (items.length > 0)
        slide.rightHeader(sfig.table(items).xmargin(5));
    }

    // The root is shown at level 0
    slide.showLevel(0);

    slide.state = sfig_.newState();
    slide.freeze();
    slide.closeAppendices();
    this.slides.push(slide);
  }

  sfig_.newState = function() {
    return {
      svg: sfig_.newSvg(),
      // For each level, list of new Blocks to hide/show/animate
      showBlocks: [],
      hideBlocks: [],
      animateBlocks: [],
      rendered: false,
    };
  }

  Presentation.prototype.showNextSlide = function(firstLevel, callback) {
    var self = this;
    if (self.currSlideIndex+1 < self.slides.length) {
      self.setSlideIndex(self.currSlideIndex+1, function() {
        self.setLevel(firstLevel ? 0 : self.currMaxLevel());
        self.updateUrlParams();
        callback();
      });
    } else {
      callback();
    }
  }

  Presentation.prototype.showPrevSlide = function(firstLevel, callback) {
    var self = this;
    if (self.currSlideIndex-1 >= 0) {
      self.setSlideIndex(self.currSlideIndex-1, function() {
        self.setLevel(firstLevel ? 0 : self.currMaxLevel());
        self.updateUrlParams();
        callback();
      });
    } else {
      callback();
    }
  }

  Presentation.prototype.registerKey = function(description, keys, func) {
    var self = this;
    keys.forEach(function(key) {
      if (self.keyMap[key]) throw 'Already registered key '+key;
      self.keyMap[key] = {description: description, func: func};
    });
    self.keyBindings.push({description: description, keys: keys});
  }

  // Map from key to [description, func], where func takes a single callback argument
  Presentation.prototype.initKeys = function() {
    this.keyMap = {};  // key -> description and func
    this.keyBindings = []; // List of description, keys
    var self = this;

    this.registerKey('Go to next slide build', ['space', 'down', 'page_down', 'right', 'j', 'l'], function(callback) {
      if (!self.readyForSlideShowKey()) return callback();
      if (self.currLevel+1 <= self.currMaxLevel()) {
        self.setLevel(self.currLevel+1);
        self.updateUrlParams();
        callback();
      } else {
        self.showNextSlide(true, callback);
      }
    });

    this.registerKey('Go to next slide', ['shift-down', 'shift-right', 'shift-j', 'shift-l'], function(callback) {
      if (!self.readyForSlideShowKey()) return callback();
      self.showNextSlide(false, callback);
    });

    this.registerKey('Go to previous slide build', ['backspace', 'up', 'page_up', 'left', 'k', 'h'], function(callback) {
      if (!self.readyForSlideShowKey()) return callback();
      if (self.currLevel-1 >= 0) {
        self.setLevel(self.currLevel-1);
        self.updateUrlParams();
        callback();
      } else {
        self.showPrevSlide(false, callback);
      }
    });

    this.registerKey('Go to previous slide', ['shift-up', 'shift-left', 'shift-k', 'shift-h'], function(callback) {
      if (!self.readyForSlideShowKey()) return callback();
      self.showPrevSlide(false, callback);
    });

    this.registerKey('Jump to a presentation', ['shift-g'], function(callback) {
      var query = prompt('Go to which presentation (name)?');
      if (query == null) return callback();
      sfig_.goToPresentation(query, null, null, true);
    });

    function containsText(block, query) {
      if (block instanceof sfig.Text) {
        var content = (block.content().get() || '').toString();
        return content.toLowerCase().match(query.toLowerCase());
      }
      for (var i = 0; i < block.children.length; i++)
        if (containsText(block.children[i], query)) return true;
      return false;
    }

    this.registerKey('Jump to slide (by number or search)', ['g'], function(callback) {
      if (!self.readyForSlideShowKey()) return callback();
      var query = prompt('Go to which slide (<slide id> or <slide index> or [/?]<search query>)?');
      if (query == null) return callback();
      if (parseInt(query) < 0) query = self.slides.length + parseInt(query);
      var slideIndex = self.currSlideIndex;
      var isTextSearch = query[0] == '/' || query[0] == '?';
      var incr = query[0] == '?' ? -1 : +1;
      var found = false;
      while (true) {
        slideIndex = (slideIndex + incr + self.slides.length) % self.slides.length;  // Advance slide
        if (slideIndex == self.currSlideIndex) break;  // Wrapped around
        var slide = self.slides[slideIndex];
        if ((slide.id && slide.id().get() == query) ||
            (''+slideIndex == query) ||
            (isTextSearch && containsText(slide, query.slice(1)))) {
          found = true;
          break;
        }
      }

      if (!found) return callback();

      self.setSlideIndex(slideIndex, function() {
        self.setLevel(isTextSearch ? sfig_.maxLevel : 0);
        self.updateUrlParams();
        callback();
      });
    });

    this.registerKey('Toggle full screen', ['shift-f'], function(callback) {
      if (sfig_.urlParams.mode != 'fullScreen')
        sfig_.urlParams.mode = 'fullScreen';
      else
        sfig_.urlParams.mode = '';
      sfig_.serializeUrlParamsToLocation();
      window.location.reload();
    });
    this.registerKey('Outline version', ['shift-o'], function(callback) {
      sfig_.urlParams.mode = 'outline';
      sfig_.serializeUrlParamsToLocation();
      window.location.reload();
    });
    this.registerKey('Printer-friendly version', ['shift-p'], function(callback) {
      sfig_.urlParams.mode = 'print';
      sfig_.serializeUrlParamsToLocation();
      window.location.reload();
    });

    /*this.registerKey('Change display mode', ['shift-m'], function(callback) {
      var mode = prompt('Current mode is \''+(sfig_.urlParams.mode || '')+'\', enter new mode (\'print\', \'outline\', \'fullScreen\', or \'\'):');
      if (mode == 'p') mode = 'print';
      else if (mode == 'o') mode = 'outline';
      else if (mode == 'f') mode = 'fullScreen';
      if (mode != null) {
        sfig_.urlParams.mode = mode;
        sfig_.serializeUrlParamsToLocation();
        window.location.reload();
      }
    });*/

    this.registerKey('Render all slides, caching results', ['shift-r'], function(callback) {
      if (!self.readyForSlideShowKey()) return callback();
      sfig_.performOperation('renderAll', function(modifiedCallback) {
        self.goThroughAllSlides(modifiedCallback);
      }, callback);
    });

    // Set up key bindings
    self.keyQueue = [];
    function processKeyQueue() {
      if (self.keyQueue.length == 0) {
        return;
      } else {
        var key = self.keyQueue.splice(0, 1)[0];
        self.processKey(key, processKeyQueue);
      }
    }
    document.documentElement.addEventListener('keydown', function(event) {
      if (!sfig_.keysEnabled) return;
      var key = sfig_.eventToKey(event);
      self.keyQueue.push(key);
      processKeyQueue(function() {});
    }, false);

    // Allow scrolling to go to previous and next slide builds
    function handleMouseWheel(event) {
      var delta = 0;
      if (event.wheelDelta) // IE, Opera, Chrome
        delta = event.wheelDelta / 60;
      else if (event.detail) // Firefox
        delta = -event.detail / 2;

      if (delta > 0) {
        self.keyQueue.push('up');
        processKeyQueue(function() {});
      } else if (delta < 0) {
        self.keyQueue.push('down');
        processKeyQueue(function() {});
      }
    }
    document.onmousewheel = handleMouseWheel;
    document.documentElement.addEventListener('DOMMouseScroll', handleMouseWheel, false);
  }

  Presentation.prototype.getHelpBlock = function() {
    var rows = this.keyBindings.map(function(binding) {
      return [binding.keys.map(function(key) { return key.fontcolor('blue') }).join(' | '.fontcolor('brown')), binding.description];
    });
    return sfig.ytable(
      'This presentation is created using <a href="'+sfig.homePage+'" target="blank">sfig '+sfig.version+'</a>.',
      'Key bindings'.bold(),
      new sfig.Table(rows).xjustify('rl').xmargin(15),
    _).center().ymargin(10);
  }

  Presentation.prototype.readyForSlideShowKey = function() {
    if (sfig_.urlParams.mode == 'print' || sfig_.urlParams.mode == 'outline')
      return false;

    // This function is sometimes called when rendering isn't completed yet, so just ignore.
    if (this.slides[this.currSlideIndex].elem == null) {
      console.log('Dropped key because current slide not rendered yet');
      return false;
    }
    return true;
  }

  Presentation.prototype.processKey = function(key, callback) {
    if (!this.keyMap[key]) {
      callback();
      return;
    } else {
      this.keyMap[key].func(callback);
    }
  }

  Presentation.prototype.goThroughAllSlides = function(callback) {
    // Render all the slides
    var self = this;
    var i = 0;
    var saveSlideIndex = self.currSlideIndex;
    var saveLevel = self.currLevel;
    function process() {
      console.log('Rendering slide '+i+'/'+self.slides.length);
      if (i == self.slides.length) {
        self.setSlideIndexAndLevel(saveSlideIndex, saveLevel, callback);  // Go to beginning
        self.updateUrlParams();
        return;
      }
      self.setSlideIndex(i++, process);
    }
    process();
  }

  Presentation.prototype.setSlideIndex = function(slideIndex, callback) {
    var self = this;

    // Remove old SVG (if not printing)
    if (sfig_.urlParams.mode != 'print' && self.currSlideIndex != null)
      self.container.removeChild(self.slides[self.currSlideIndex].state.svg);

    self.currSlideIndex = Math.min(slideIndex, self.slides.length-1);
    self.currLevel = -1;
    var slide = self.slides[self.currSlideIndex];
    if (slide == null) throw 'Invalid slide index: '+self.currSlideIndex;
    self.container.appendChild(self.slides[self.currSlideIndex].state.svg);

    if (sfig_.urlParams.mode == 'fullScreen') slide.borderWidth(0);

    var state = slide.state;

    // Reset nodes
    while (state.svg.hasChildNodes())
      state.svg.removeChild(state.svg.lastChild);

    slide.render(state, function() {
      state.svg.appendChild(slide.elem);

      // Set the size of containers for a snug fit
      var x = slide.left().getOrDie();
      var y = slide.top().getOrDie();
      var width = slide.realWidth().getOrDie();
      var height = slide.realHeight().getOrDie();

      var desiredWidth, desiredHeight;
      if (sfig_.urlParams.mode == 'fullScreen') {  // Print to fit the screen
        // Make this less than 1, otherwise Firefox will show scrollbars
        var scale = 0.97;
        desiredWidth = screen.availWidth * scale;
        desiredHeight = screen.availHeight * scale;
      } else if (sfig_.urlParams.mode == 'print') {  // Print to fit the paper
        var numRowsPerPage = sfig_.urlParams.numRowsPerPage || sfig.defaultPrintNumRowsPerPage;
        var numColsPerPage = sfig_.urlParams.numColsPerPage || sfig.defaultPrintNumColsPerPage;
        var scale;
        if (numColsPerPage == 1) scale = numRowsPerPage == 1 ? 1 : 0.7;
        else if (numColsPerPage == 2) scale = 0.4;
        else scale = 1;
        desiredWidth = width * scale;
        desiredHeight = height * scale;
      } else {  // Original size
        desiredWidth = width;
        desiredHeight = height;
      }

      state.svg.setAttribute('width', desiredWidth);
      state.svg.setAttribute('height', desiredHeight);
      state.svg.setAttribute('viewBox', [x, y, width, height].join(' '));

      callback();
    });
  }

  // Of the current slide...
  Presentation.prototype.currMaxLevel = function() {
    var state = this.slides[this.currSlideIndex].state;
    return Math.max(state.hideBlocks.length, state.showBlocks.length) - 1;
  }

  Presentation.prototype.setLevel = function(targetLevel) {
    var self = this;
    var state = this.slides[this.currSlideIndex].state;

    if (targetLevel == sfig_.maxLevel) targetLevel = self.currMaxLevel();

    // If first time, need to clear everything
    if (self.currLevel == -1) {
      for (var i = 0; i <= self.currMaxLevel(); i++) {
        var showBlocks = state.showBlocks[i];
        if (showBlocks) showBlocks.forEach(function(block) { block.hide(true); });
      }
    }

    // Go forward
    for (; self.currLevel < targetLevel && self.currLevel < self.currMaxLevel(); self.currLevel++) {
      var hideBlocks = state.hideBlocks[self.currLevel+1];
      var showBlocks = state.showBlocks[self.currLevel+1];
      var animateBlocks = state.animateBlocks[self.currLevel+1];
      if (hideBlocks) hideBlocks.forEach(function(block) { block.hide(false); });
      if (showBlocks) showBlocks.forEach(function(block) { block.show(false); });
      if (animateBlocks) animateBlocks.forEach(function(block) { block.startAnimate(); });
    }

    // Go backward
    for (; self.currLevel > targetLevel && self.currLevel > 0; self.currLevel--) {
      var hideBlocks = state.hideBlocks[self.currLevel];
      var showBlocks = state.showBlocks[self.currLevel];
      var animateBlocks = state.animateBlocks[self.currLevel];
      if (hideBlocks) hideBlocks.forEach(function(block) { block.show(true); });
      if (showBlocks) showBlocks.forEach(function(block) { block.hide(true); });
      if (animateBlocks) animateBlocks.forEach(function(block) { block.resetAnimate(); });
    }
  }

  Presentation.prototype.slideIdToSlideIndex = function(slideId) {
    for (var i = 0; i < this.slides.length; i++) {
      if (this.slides[i].id().get() == slideId)
        return i;
    }
    throw 'No slide with id '+slideId;
  }

  Presentation.prototype.setSlideIdAndLevel = function(slideId, level, callback) {
    var self = this;
    var slideIndex = this.slideIdToSlideIndex(slideId);
    this.setSlideIndexAndLevel(slideIndex, level, function() {
      self.updateUrlParams();
      callback();
    });
  }

  Presentation.prototype.setSlideIndexAndLevel = function(slideIndex, level, callback) {
    var self = this;
    this.setSlideIndex(slideIndex, function() {
      self.setLevel(level);
      callback();
    });
  }

  Presentation.prototype.updateUrlParams = function() {
    var self = this;
    sfig_.urlParams.slideId = null;
    sfig_.urlParams.slideIndex = self.currSlideIndex;
    sfig_.urlParams.level = self.currLevel;
    sfig_.serializeUrlParamsToLocation();
  }

  // When file initially loads, jump to the right place.
  Presentation.prototype.setSlideIndexAndLevelFromUrlParams = function(params, callback) {
    var slideIndex = parseInt(params.slideIndex);
    if (slideIndex == null || !isFinite(slideIndex)) slideIndex = 0;
    var slideId = params.slideId;
    if (slideId != null) slideIndex = this.slideIdToSlideIndex(slideId);
    var level = parseInt(params.level);
    if (level == null || !isFinite(level)) level = 0;
    this.setSlideIndexAndLevel(slideIndex, level, callback);
  }

  function pageBreak() {
    var p = sfig_.newElem('p');
    p.style.pageBreakAfter = 'always';
    return p;
  }
  function interSlidePadding() {
    var p = sfig_.newElem('p');
    p.style.margin = 30;
    return p;
  }

  sfig_.maxLevel = 10000;

  Presentation.prototype.run = function(callback) {
    var self = this;
    if (callback == null) callback = function() {};

    if (this.slides.length == 0) throw 'No slides';
    if (!sfig_.initialized) throw 'Must call sfig.initialize() first';

    sfig_.performOperation('Presentation.run', function(modifiedCallback) {
      var mode = sfig_.urlParams.mode;
      if (mode == 'print')
        self.displayPrinterFriendly(null, modifiedCallback);
      else if (mode == 'outline')
        self.displayOutline(null, modifiedCallback);
      else if (mode == 'fullScreen' || !mode)
        self.displaySlideShow(null, modifiedCallback);
      else
        throw 'Invalid mode: '+mode;
    }, callback);

    window.onhashchange = function() {
      // If changed externally (not reflected by sfig_.urlHash), then force refresh.
      if (window.location.hash != sfig_.urlHash) {
        var oldUrlParams = sfig_.urlParams;
        sfig_.parseUrlParamsFromLocation();
        if (oldUrlParams.mode != sfig_.urlParams.mode) {
          window.location.reload();  // Need to reload the whole page
        } else {
          // Just change slides
          self.setSlideIndexAndLevelFromUrlParams(sfig_.urlParams, function() { });
        }
      }
    }
  }

  // Don't render(), but just display text - quick way to see all the content in a searchable way
  Presentation.prototype.displayOutline = function(container, callback) {
    var self = this;

    // Body
    if (container == null) container = document.body;
    this.container = container;

    function blockToHtml(block, compressUnaries) {
      if (block instanceof sfig.Text) {
        return sfig.Text.bulletize(block.content().get());
      } else if (block instanceof sfig.Slide) {
        return blockToHtml(block.body, compressUnaries);
      } else {
        var childDivs = [];
        for (var i = 0; i < block.children.length; i++) {
          var childDiv = blockToHtml(block.children[i], true);
          if (childDiv != null) childDivs.push(childDiv);
        }
        if (childDivs.length == 0) return null;
        if (childDivs.length == 1 && compressUnaries) return childDivs[0];
        var div = sfig_.newElem('ul');
        childDivs.forEach(function(childDiv) {
          var li = sfig_.newElem('li');
          li.appendChild(childDiv);
          div.appendChild(li);
        });
        return div;
      }
    }

    for (var i = 0; i < this.slides.length; i++) {
      var slide = this.slides[i];
      var div = sfig_.newElem('div');
      div.style.margin = 10;

      var title = sfig_.newElem('a');
      title.innerHTML = ('Slide '+i + (slide.title && slide.title().get() ? ': '+slide.title().get() : '')).bold();
      title.href = window.location.pathname + sfig_.serializeUrlParams({slideIndex: i});
      div.appendChild(title);

      var html = blockToHtml(slide, false);
      if (html != null) div.appendChild(html);
      container.appendChild(div);
    }
    if (sfig.enableMath)
      MathJax.Hub.queue.Push(['Typeset', MathJax.Hub, container], callback);
  }

  // Works well in Chrome, not Firefox
  Presentation.prototype.displayPrinterFriendly = function(container, callback) {
    var self = this;

    // Body
    if (container == null) container = document.body;
    this.container = container;

    var numRowsPerPage = sfig_.urlParams.numRowsPerPage || sfig.defaultPrintNumRowsPerPage;
    var numColsPerPage = sfig_.urlParams.numColsPerPage || sfig.defaultPrintNumColsPerPage;
    var numSlidesPerPage = numRowsPerPage * numColsPerPage;
    var i = 0;
    function process() {
      //console.log('Printing slide '+i+'/'+self.slides.length);
      if (i == self.slides.length) {
        if (callback) callback();
        return;
      }
      self.setSlideIndexAndLevel(i, sfig_.maxLevel, function() {
        i++;
        // Put a break
        if (i < self.slides.length) {
          if (i % numSlidesPerPage == 0) {
            self.container.appendChild(pageBreak());
          } else if (i % numColsPerPage == 0) {
            self.container.appendChild(interSlidePadding());
          } else {
            self.container.appendChild(document.createTextNode(' '));
          }
        }
        process();
      });
    }
    process();
  }

  sfig_.keysEnabled = true;

  // Works well in Firefox, not Chrome
  // container (if null, default to body): where to put the presentation
  Presentation.prototype.displaySlideShow = function(container, callback) {
    var self = this;

    // Create new container and add it to the body if doesn't exist
    if (container == null) {
      //document.body.style.overflow = 'hidden'; // Don't show scrollbars
      container = document.body;
    }
    this.container = container;

    self.currSlideIndex = null;
    self.currLevel = null;

    self.setSlideIndexAndLevelFromUrlParams(sfig_.urlParams, callback);
  }

  Presentation.prototype.refresh = function(callback) {
    if (callback == null) callback = function() {};

    // Force reload
    var slide = this.slides[this.currSlideIndex];
    slide.resetRender();
    slide.freeze();

    this.setSlideIndexAndLevel(this.currSlideIndex, this.currLevel, callback);
  }

  Presentation.prototype.serialize = function() {
    console.log(new XMLSerializer().serializeToString(document));
  }

  sfig.presentation = function(rootBlock, container) { return new sfig.Presentation(rootBlock, container); }
})();

////////////////////////////////////////////////////////////
// Main entry point for sfig.

(function() {
  sfig_.latexMacros = {};
  sfig.latexMacro = function(name, arity, body) {
    if (sfig_.initialized) throw 'Can\'t add Latex macros after initialized';
    sfig_.latexMacros[name] = [arity, body];
  }

  sfig_.includeScript = function(src) {
    var head = document.head;
    var script = document.createElement('script');
    script.src = src;
    head.appendChild(script);
    return script;
  }

  sfig.initialize = function() {
    sfig_.parseUrlParamsFromLocation();

    // Hack: find where this file (sfig.js) is.
    // Assume the external directory is one level down.
    var scripts = document.getElementsByTagName('script');
    var parentDir = '.';
    for (var i = 0; i < scripts.length; i++) {
      var file = scripts[i].src;
      if (!file.match(/sfig\.js$/)) continue;
      parentDir = file.replace(/\/[^\/]*$/, '');
    }

    if (sfig.enableMath) {
      var script = sfig_.includeScript(parentDir + '/../external/MathJax/MathJax.js?config=default');
      var buf = '';
      buf += 'MathJax.Hub.Config({';
      // TODO: want to remove this condition and not use the SVG jax, but there are problems.
      // Chrome:
      //   - normal: due to a bug in WebKit, stuff doesn't render properly at all (SVG transforms aren't handled).
      //   - jax=SVG: math isn't colored properly and can't highlight text, but it's better than nothing.
      // Firefox:
      //   - normal: works great, except when we print from this, the text is completely mis-aligned.
      //   - jax=SVG: only needed for printing.
      if (window.chrome || sfig_.urlParams.mode == 'print') buf += '  jax: ["input/TeX", "output/SVG"],';
      buf += '  extensions: ["tex2jax.js"],';
      buf += '  tex2jax: {inlineMath: [["$", "$"]]},';
      buf += '  TeX: { Macros: {';
      for (var name in sfig_.latexMacros) {
        var arityBody = sfig_.latexMacros[name];
        var arity = arityBody[0];
        var value = arityBody[1];
        value = value.replace(/\\/g, '\\\\');
        value = value.replace(/'/g, '\\\'');
        buf += name + ': [\'' + value + '\', ' + arity + '],';
      }
      buf += '  } }';
      buf += '});';
      script.innerHTML = buf;
    }

    sfig_.initialized = true;
  }

  sfig_.currPresentationName = function() {
    return window.location.pathname.match(/\/([^\/]+)\.html/)[1];
  }

  sfig_.goToPresentation = function(name, slideId, level, newWindow) {
    var urlParams = newWindow ? sfig_.mergeInto({}, sfig_.urlParams) : sfig_.urlParams;
    urlParams.slideIndex = null;
    urlParams.slideId = slideId;
    urlParams.level = level;

    // name is the filename (without the html extension) of the sfig presentation to go to.
    var pathname = window.location.pathname.replace(/\/[^\/]+\.html/, '/'+name+'.html');
    var urlHash = sfig_.serializeUrlParams(urlParams);
    var url = pathname + urlHash;
    if (newWindow)
      window.open(url);
    else {
      window.location.href = url;
    }
  }

  // Create a figure from |block| and render it into |container|.
  sfig.figure = function(block, container) {
    if (typeof(container) == 'string') container = document.getElementById(container);
    var prez = sfig.presentation({initKeys: false});
    prez.addSlide(block);
    prez.displayPrinterFriendly(container);
  }
})();
