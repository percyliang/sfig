////////////////////////////////////////////////////////////
// Graph: for plotting numerical data.
// A trajectory is a sequence of points.
// The data supplied to the Graph is a list of trajectories.
// Each point is either
//   - a number (its index is used as the x value)
//   - a pair [x, y]
//   - an object {x:?, y:?, miny:?, maxy:?}
// There are two types of graphs:
//  - LineGraph: plots each of these trajectories.
//  - BarGraph: plots each trajectory as a bar.

(function() {
  sfig.importMethods(this, ['_', 'ytable']);

  function canonicalizeTrajectory(trajectory) {
    var newTrajectory = [];
    for (var i = 0; i < trajectory.length; i++) {
      var p = trajectory[i];
      if (typeof(p) == 'number') p = {y:p};
      else if (p instanceof Array) p = {x:p[0], y:p[1]};
      if (p.x == null) p.x = i;
      if (p.y == null) throw 'No value specified in '+p;
      newTrajectory[i] = p;
    }
    return newTrajectory;
  }

  // items can contain trajectories or PropertyChangers
  var Graph = sfig.Graph = function(items) {
    var self = this;
    Graph.prototype.constructor.call(this);
    if (items == null) return;
    var minx, miny, maxx, maxy;
    this.propertyChangers = []
    this.trajectories = [];
    var i = 0;
    Array.prototype.slice.call(items).forEach(function(item) {
      if (item instanceof sfig.PropertyChanger) {
        sfig_.vectorPushInto(self.propertyChangers, i, item);
      } else {
        var trajectory = canonicalizeTrajectory(item);
        trajectory.forEach(function(p) {
          minx = minx == null || p.x < minx ? p.x : minx;
          miny = miny == null || p.y < miny ? p.y : miny;
          maxx = maxx == null || p.x > maxx ? p.x : maxx;
          maxy = maxy == null || p.y > maxy ? p.y : maxy;
        });
        self.trajectories.push(trajectory);
        i++;
      }
    });
    this.minValue(minx, miny).maxValue(maxx, maxy);
  }
  sfig_.inheritsFrom('Graph', Graph, sfig.Block);

  // Abstract method that creates children representing the rendering of the graph.
  Graph.prototype.createDataChildren = function() { throw 'Please override'; }

  Graph.prototype.createChildren = function() {
    var self = this;

    // For each of the axes...
    for (var axis = 0; axis <= 1; axis++) {
      var length = this.length()[axis].getOrDie();
      var otherLength = this.length()[1-axis].getOrDie();
      var overshoot = this.overshoot()[axis].getOrDie();
      var convert;
      if (axis == 0)
        convert = function(x, y) { return [x, y]; };
      else
        convert = function(y, x) { return [x, y] };

      // Axis
      this.addChild(line([0, 0], convert((length + overshoot) * (axis == 0 ? 1 : -1), 0)));

      //// Ticks and tick labels
      var tickStyle = this.tickStyle()[axis].get();
      var minValue = this.minValue()[axis].getOrDie();
      var maxValue = this.maxValue()[axis].getOrDie();
      var tickLength = this.tickLength()[axis].getOrDie();
      var tickColor = this.tickColor()[axis].getOrDie();
      var tickLabels = this.tickLabels()[axis].get();
      var tickLabelFormat = this.tickLabelFormat()[axis].get();
      var tickLabelPadding = this.tickLabelPadding()[axis].get();
      var tickLabelScale = this.tickLabelScale()[axis].get();
      var roundPlaces = this.roundPlaces()[axis].get();
      var axisLabel = this.axisLabel()[axis].get();
      var axisLabelPadding = this.axisLabelPadding()[axis].get();

      var tickStartValue = this.tickStartValue()[axis].getOrElse(minValue);
      // Determine how to space the ticks
      var tickIncrValue = this.tickIncrValue()[axis].get();
      var numTicks = this.numTicks()[axis].get();
      if (tickIncrValue != null)
        numTicks = Math.floor((maxValue - tickStartValue) / tickIncrValue) + 1;
      else if (numTicks != null)
        tickIncrValue = 1.0 * (maxValue - tickStartValue) / (numTicks-1);
      else
        throw 'Either tickIncrValue or numTicks must be specified';
      //sfig.L(numTicks, tickIncrValue, minValue, maxValue, tickStartValue);

      // For each position...
      for (var i = this.tickIncludeAxis()[axis].get() ? 0 : 1; i < numTicks; i++) {
        var value = tickIncrValue * i + tickStartValue;
        if (!isFinite(value)) throw 'Bad value: '+value;
        var coord = axis == 0 ? this.xvalueToCoord(value) : this.yvalueToCoord(value);
        var displayValue = this.expValue()[axis].get() ? Math.exp(value) : value;

        // Draw the tick
        var tick = null;
        if (tickStyle == 'short') {
          // Ticks stick out of the graph a little bit
          tick = sfig.line(convert(coord, 0), convert(coord, tickLength));
        } else if (tickStyle == 'long') {
          // Ticks go all the way across the graph
          if (value != minValue)  // Exclude if we are already are drawing the axis
            tick = sfig.line(convert(coord, 0), convert(coord, otherLength));
        }
        if (tick != null) {
          tick.color(tickColor);
          this.addChild(tick);
        }

        // Draw the tick label
        var tickLabel = null;
        if (tickLabels != null) {
          tickLabel = tickLabel[i];
        } else if (tickLabelFormat == 'reg') {
          tickLabel = displayValue.toFixed(roundPlaces);
        } else if (tickLabelFormat == 'pow' || tickLabelFormat == 'sci') {
          var str = displayValue.toExponential();  // 200.5 => '2.005e2'
          var pair = str.split(/e/);
          var man = parseFloat(pair[0]).toFixed(roundPlaces);
          var exp = parseInt(pair[1]);
          if (tickLabelFormat == 'pow') {
            if (Math.abs(man-1) < 0.1)  // man is about 1
              tickLabel = '$10^{'+exp+'}$';
            else
              tickLabel = '$'+man+' \\times 10^{'+exp+'}$';
          } else if (tickLabelFormat == 'sci') {
            tickLabel = man + 'e' + exp;
          }
        } else if (tickLabelFormat == 'human') {
          var suffix;
          if (Math.abs(displayValue) < 1e3) {
            suffix = '';
          } else if (Math.abs(displayValue) < 1e6) {
            suffix = 'K'
            displayValue /= 1e3;
          } else {
            suffix = 'M';
            displayValue /= 1e6;
          }
          tickLabel = displayValue.toFixed(roundPlaces) + suffix;
        }

        if (tickLabel != null) {
          var p = convert(coord, -tickLabelPadding);
          tickLabel = transform(tickLabel).scale(tickLabelScale);
          if (axis == 0)
            tickLabel.pivot(0, -1).shift(coord, tickLabelPadding);
          else
            tickLabel.pivot(1, 0).shift(-tickLabelPadding, coord);
          this.addChild(tickLabel);
        }
      }

      // Axis label
      if (axisLabel != null) {
        axisLabel = sfig.std(axisLabel);
        if (axis == 1) axisLabel.rotate(-90);
        this.axisLabelBlock = sfig.transform(axisLabel);
        if (axis == 0)
          this.axisLabelBlock.pivot(0, -1).shift(length / 2, axisLabelPadding);
        else
          this.axisLabelBlock.pivot(1, 0).shift(-axisLabelPadding, -length / 2);
        this.addChild(this.axisLabelBlock);
      }
    }

    this.createDataChildren();

    var trajectoryColors = this.trajectoryColors().get() || [];
    var trajectoryNames = this.trajectoryNames().get() || [];

    // Draw legend
    var pairs = [];
    var createMarker = this.marker().get();
    for (var i = 0; i < this.trajectories.length; i++) {
      var marker = createMarker ? createMarker(i, trajectoryColors[i] || 'black') : square(5);
      marker.color(trajectoryColors[i] || 'black');
      pairs.push([marker, trajectoryNames[i] || (i+1)]);
      // TODO: set the level of these to match the levels of the individual trajectories
    }
    this.legend = sfig.frame(new sfig.Table(pairs).yjustify('c').margin(5, 2));
    this.legend.padding(3);
    this.legend.bg.strokeWidth(2).fillColor('white').end;

    var xlegendPivot = this.xlegendPivot().get();
    var ylegendPivot = this.ylegendPivot().get();
    if (xlegendPivot != null && ylegendPivot != null) {
      var legendBlock = frame(this.legend).bg.dim(this.xlength(), this.ylength()).end;  // Put legend in a large box
      legendBlock.pivot(xlegendPivot * 0.8, ylegendPivot * 0.8);  // Move to right place
      var legendBlock = sfig.transform(legendBlock).pivot(-1, 1); // Line it up with rest of Graph (lower-left is origin)
      this.addChild(legendBlock);
    }
  }

  Graph.prototype.xvalueToCoord = function(value) {
    return +this.xlength().getOrDie() * (value - this.xminValue().get()) / (this.xmaxValue().get() - this.xminValue().get());
  }
  Graph.prototype.yvalueToCoord = function(value) {
    return -this.ylength().getOrDie() * (value - this.yminValue().get()) / (this.ymaxValue().get() - this.yminValue().get());
  }

  // Trajectory
  sfig_.addProperty(Graph, 'trajectoryNames', null, 'Trajectory names');
  sfig_.addProperty(Graph, 'trajectoryColors', null, 'Array of colors for the trajectories');

  // Structural
  sfig_.addPairProperty(Graph, 'minValue', 'xminValue', 'yminValue', null, null, 'Minimum value that appears on graph');
  sfig_.addPairProperty(Graph, 'maxValue', 'xmaxValue', 'ymaxValue', null, null, 'Maximum value that appears on graph');
  sfig_.addPairProperty(Graph, 'length', 'xlength', 'ylength', 300, 200, 'How long the axes are');
  sfig_.addPairProperty(Graph, 'overshoot', 'xovershoot', 'yovershoot', 10, 10, 'Extra spacing to overshoot');

  Graph.prototype.xrange = function(min, max) { return this.xminValue(min).xmaxValue(max); }
  Graph.prototype.yrange = function(min, max) { return this.yminValue(min).ymaxValue(max); }

  Graph.circleMarker = function(i, color) { return overlay(circle(4).color('white'), circle(3).color(color)); };

  // Ticks
  sfig_.addPairProperty(Graph, 'tickIncludeAxis', 'xtickIncludeAxis', 'ytickIncludeAxis', true, true, 'Draw the tick at the axis');
  sfig_.addPairProperty(Graph, 'tickStartValue', 'xtickStartValue', 'ytickStartValue', null, null, 'Start at this tick');
  sfig_.addPairProperty(Graph, 'tickIncrValue', 'xtickIncrValue', 'ytickIncrValue', null, null, 'Show a tick every this increment of value');
  sfig_.addPairProperty(Graph, 'numTicks', 'xnumTicks', 'ynumTicks', 5, 5, 'Number of ticks to show (not applied if tickIncrValue is specified)');
  sfig_.addPairProperty(Graph, 'tickStyle', 'xtickStyle', 'ytickStyle', 'short', 'long', 'null (no ticks), \'short\' (just a tick), or \'long\' (extend over the length of the axis)');
  sfig_.addPairProperty(Graph, 'tickColor', 'xtickColor', 'ytickColor', 'black', 'lightgray', 'Color of ticks');
  sfig_.addPairProperty(Graph, 'tickLength', 'xtickLength', 'ytickLength', 3, 3, 'If tick is short, how long to make them');

  // Tick labels
  sfig_.addPairProperty(Graph, 'expValue', 'xexpValue', 'yexpValue', null, null, 'Print out exponentiated values (useful for log-log plots)');
  sfig_.addPairProperty(Graph, 'roundPlaces', 'xroundPlaces', 'yroundPlaces', 1, 1, 'Number of decimal places to print for tick labels');
  sfig_.addPairProperty(Graph, 'tickLabels', 'xtickLabels', 'ytickLabels', null, null, 'Use these custom tick labels instead of tickLabelFormat');
  sfig_.addPairProperty(Graph, 'tickLabelFormat', 'xtickLabelFormat', 'ytickLabelFormat', 'reg', 'reg', 'How to render numbers (\'sci\' means 1e-6, \'pow\' means 10^6, \'human\' means 100K, \'reg\' is regular up to roundPlaces, null is none)');
  sfig_.addPairProperty(Graph, 'tickLabelPadding', 'xtickLabelPadding', 'ytickLabelPadding', 3, 3, 'Space between ticks and label');
  sfig_.addPairProperty(Graph, 'tickLabelScale', 'xtickLabelScale', 'ytickLabelScale', 1, 1, 'How small are the ticks');

  // Axis
  sfig_.addPairProperty(Graph, 'axisLabel', 'xaxisLabel', 'yaxisLabel', null, null, 'Labels of the axes');
  sfig_.addPairProperty(Graph, 'axisLabelPadding', 'xaxisLabelPadding', 'yaxisLabelPadding', 25, 35, 'How much space to put between the axis label and the tick labels');
  sfig_.addPairProperty(Graph, 'legendPivot', 'xlegendPivot', 'ylegendPivot', null, null, 'Where to put the legend');
})();

////////////////////////////////////////////////////////////
// LineGraph
(function() {
  var LineGraph = sfig.LineGraph = function(trajectories) {
    LineGraph.prototype.constructor.call(this, trajectories);
  }
  sfig_.inheritsFrom('LineGraph', LineGraph, sfig.Graph);

  sfig_.addProperty(LineGraph, 'marker', null, 'Function mapping trajectory to a marker object');
  sfig_.addProperty(LineGraph, 'markerSize', null, 'How big should the marker be?');
  sfig_.addProperty(LineGraph, 'markerPeriod', 2, 'Number of points between successive markers');
  sfig_.addProperty(LineGraph, 'lineWidth', 2, 'Width of lines');

  LineGraph.prototype.createDataChildren = function() {
    var self = this;

    var createMarker = this.marker().get();
    var lineWidth = this.lineWidth().get();
    var trajectoryNames = this.trajectoryNames().get() || [];
    var trajectoryColors = this.trajectoryColors().get() || [];

    for (var i = 0; i <= this.trajectories.length; i++) {
      // Add property changers
      (this.propertyChangers[i] || []).forEach(function(changer) { self.addChild(changer); });
      if (i == this.trajectories.length) break;

      var trajectory = this.trajectories[i];

      var lastq = null;
      trajectory.forEach(function(p) {
        var q = [self.xvalueToCoord(p.x), self.yvalueToCoord(p.y)];
        if (lastq != null && lineWidth > 0) {
          // Create line
          var segment = sfig.line(lastq, q);
          if (trajectoryNames[i]) segment.tooltip(trajectoryNames[i]);
          segment.color(trajectoryColors[i] || 'black');
          segment.strokeWidth(lineWidth);
          self.addChild(segment);
        }

        // Create marker
        if (createMarker != null) {
          var marker = createMarker(i, trajectoryColors[i] || 'black');
          marker.shift(q[0], q[1]);
          marker.tooltip(p.x + ',' + p.y);
          self.addChild(marker);
        }
        lastq = q;
      });
    }
  };

  sfig.lineGraph = function() { return new sfig.LineGraph(arguments); }
})();

////////////////////////////////////////////////////////////
// BarGraph TODO

(function() {
  var BarGraph = sfig.BarGraph = function(trajectories) {
    BarGraph.prototype.constructor.call(this, trajectories);
  }
  sfig_.inheritsFrom('BarGraph', BarGraph, sfig.Graph);

  sfig.barGraph = function() { return new sfig.BarGraph(arguments); }
})();