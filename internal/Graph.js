////////////////////////////////////////////////////////////
// Graph

(function() {
  // |data|: a list of time series
  // Each time series is a sequence of points.
  // Each point is either
  //   - a number (its index is used as the x value)
  //   - a pair [x, y]
  //   - an object {x:?, y:?, miny:?, maxy:?}
  var Graph = sfig.Graph = function(data) {
    Graph.prototype.constructor.call(this);
    this.data = data;
  };
  sfig_.inheritsFrom('Graph', Graph, sfig.Block);

  sfig.importMethods(this, ['_', 'ytable']);

  Graph.prototype.renderElem = function(state, callback) {
    var obj = ytable(this.data.length, this.xlabel().getOrElse(_));
    var self = this;
    obj.renderElem(state, function() {
      self.elem = obj.elem;
    });
  }

  sfig_.addPairProperty(Graph, 'label', 'xlabel', 'ylabel', null, null, 'Labels of the axes.');

  sfig.graph = function() { return new Graph(arguments); }
})();
