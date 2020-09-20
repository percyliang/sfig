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
      if (p.x == null) p.x = i+1;
      if (p.y == null) sfig.throwException('No value specified in '+p);
      if (!isFinite(p.x)) sfig.throwException('Bad x coordinate: ' + p.x);
      if (!isFinite(p.y)) sfig.throwException('Bad y coordinate: ' + p.y);
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
    if (items.length === 0) return;
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
    if (!isFinite(minx)) throw 'minx is ' + minx;
    if (!isFinite(miny)) throw 'miny is ' + miny;
    if (!isFinite(maxx)) throw 'maxx is ' + maxx;
    if (!isFinite(maxy)) throw 'maxy is ' + maxy;
    this.minValue(minx, miny).maxValue(maxx, maxy);  // Can be overridden
  }
  sfig_.inheritsFrom('Graph', Graph, sfig.Block);

  // Abstract method that creates children representing the rendering of the graph.
  Graph.prototype.createDataChildren = function() { throw 'Please override'; }

  Graph.prototype.createChildren = function() {
    var self = this;

    // For each of the axes...
    for (var axis = 0; axis <= 1; axis++) {
      const outputs = [];
      var length = this.length()[axis].getOrDie();
      var otherLength = this.length()[1-axis].getOrDie();
      var overshoot = this.overshoot()[axis].getOrDie();

      // Axis
      if (axis == 0)  // x-axis
        outputs.push(line([0, 0], [length + overshoot, 0]));
      else  // y-axis
        outputs.push(line([0, 0], [0, -sfig.downSign * (length + overshoot)]));

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
      var axisLabelRotate = this.axisLabelRotate()[axis].get();
      var axisLabelPadding = this.axisLabelPadding()[axis].get();

      var tickStartValue = this.tickStartValue()[axis].getOrElse(minValue);
      if (!isFinite(tickStartValue)) throw 'tickStartValue is ' + tickStartValue;
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
        var coord = (axis == 0) ? this.xvalueToCoord(value) : this.yvalueToCoord(value);
        var displayValue = this.expValue()[axis].get() ? Math.exp(value) : value;

        // Draw the tick
        var tick = null;
        if (tickStyle == 'short') {
          // Ticks stick out of the graph a little bit
          if (axis == 0)
            tick = sfig.line([coord, 0], [coord, sfig.downSign * tickLength]);
          else
            tick = sfig.line([0, coord], [-tickLength, coord]);
        } else if (tickStyle == 'long') {
          // Ticks go all the way across the graph
          if (value != minValue) {  // Exclude if we are already are drawing the axis
            if (axis == 0)
              tick = sfig.line([coord, 0], [coord, -sfig.downSign * otherLength]);
            else
              tick = sfig.line([0, coord], [otherLength, coord]);
          }
        }
        if (tick != null) {
          tick.color(tickColor);
          outputs.push(tick);
        }

        // Draw the tick label
        var tickLabel = null;
        if (tickLabels != null) {
          tickLabel = tickLabels[i];
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
          tickLabel = transform(tickLabel).scale(tickLabelScale);
          if (axis == 0)  // x-axis
            tickLabel.pivot(0, -1).shift(coord, sfig.downSign * tickLabelPadding);
          else  // y-axis
            tickLabel.pivot(1, 0).shift(-tickLabelPadding, coord);
          outputs.push(tickLabel);
        }
      }

      // Axis label
      if (axisLabel != null) {
        axisLabel = sfig.std(axisLabel);
        axisLabel.rotate(axisLabelRotate);
        this.axisLabelBlock = sfig.transform(axisLabel);
        if (axis == 0)  // x-axis
          this.axisLabelBlock.pivot(0, -1).shiftBy(length / 2, axisLabelPadding);
        else  // y-axis
          this.axisLabelBlock.pivot(1, 0).shiftBy(-axisLabelPadding, -length / 2);
        outputs.push(this.axisLabelBlock);
      }

      this.addChild(overlay(...outputs).atomicMouseShowHide(true));
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

  // Internal function
  Graph.prototype.addValueLabel = function(i, x, y, target) {
    //sfig.L('addValueLabel', i, x, y);
    var yvalueFunc = this.yvalueFunc().get();
    if (yvalueFunc == null) return;
    var yvalue = yvalueFunc(i, x, y);
    if (yvalue == null) return;
    yvalue = sfig.transform(yvalue).pivot(0, 1).shift(target.xmiddle(), target.top().up(this.yvaluePadding()));
    this.addChild(yvalue);
  }

  Graph.prototype.xvalueToCoord = function(value) {
    return +this.xlength().getOrDie() * (value - this.xminValue().getOrDie()) / (this.xmaxValue().getOrDie() - this.xminValue().getOrDie());
  }
  Graph.prototype.yvalueToCoord = function(value) {
    return -sfig.downSign * this.ylength().getOrDie() * (value - this.yminValue().getOrDie()) / (this.ymaxValue().getOrDie() - this.yminValue().getOrDie());
  }
  Graph.prototype.xyValueToCoord = function(xy) {
    const [x, y] = xy;
    return [this.xvalueToCoord(x), this.yvalueToCoord(y)];
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
  sfig_.addPairProperty(Graph, 'roundPlaces', 'xroundPlaces', 'yroundPlaces', 0, 0, 'Number of decimal places to print for tick labels');
  sfig_.addPairProperty(Graph, 'tickLabels', 'xtickLabels', 'ytickLabels', null, null, 'Use these custom tick labels instead of tickLabelFormat');
  sfig_.addPairProperty(Graph, 'tickLabelFormat', 'xtickLabelFormat', 'ytickLabelFormat', 'reg', 'reg', 'How to render numbers (\'sci\' means 1e-6, \'pow\' means 10^6, \'human\' means 100K, \'reg\' is regular up to roundPlaces, null is none)');
  sfig_.addPairProperty(Graph, 'tickLabelPadding', 'xtickLabelPadding', 'ytickLabelPadding', 3, 3, 'Space between ticks and label');
  sfig_.addPairProperty(Graph, 'tickLabelScale', 'xtickLabelScale', 'ytickLabelScale', 0.7, 0.7, 'How small are the ticks');

  // Axis
  sfig_.addPairProperty(Graph, 'axisLabel', 'xaxisLabel', 'yaxisLabel', null, null, 'Labels of the axes');
  sfig_.addPairProperty(Graph, 'axisLabelPadding', 'xaxisLabelPadding', 'yaxisLabelPadding', 35, 35, 'How much space to put between the axis label and the tick labels');
  sfig_.addPairProperty(Graph, 'axisLabelRotate', 'xaxisLabelRotate', 'yaxisLabelRotate', 0, -90, 'Number of degrees to rotate axis labels');
  sfig_.addPairProperty(Graph, 'legendPivot', 'xlegendPivot', 'ylegendPivot', null, null, 'Where to put the legend');

  // Marker
  sfig_.addProperty(Graph, 'marker', null, 'Function mapping trajectory to a marker object');
  sfig_.addProperty(Graph, 'yvalueFunc', null, 'Call this function on (trajectory index, x, y) and display result above marker.');
  sfig_.addProperty(Graph, 'yvaluePadding', 3, 'Padding between the marker or bar and the value to be displayed');
})();

////////////////////////////////////////////////////////////
// LineGraph
(function() {
  var LineGraph = sfig.LineGraph = function(trajectories) {
    LineGraph.prototype.constructor.call(this, trajectories);
  }
  sfig_.inheritsFrom('LineGraph', LineGraph, sfig.Graph);

  sfig_.addProperty(LineGraph, 'markerPeriod', 2, 'Number of points between successive markers');
  sfig_.addProperty(LineGraph, 'lineWidth', 2, 'Width of lines');
  sfig_.addProperty(LineGraph, 'lineDasharrays', null, 'List of list of dash lengths');

  LineGraph.prototype.createDataChildren = function() {
    var self = this;

    var createMarker = this.marker().get();
    var lineWidth = this.lineWidth().get();
    var trajectoryNames = this.trajectoryNames().get() || [];
    var trajectoryColors = this.trajectoryColors().get() || [];
    var lineDasharrays = this.lineDasharrays().get() || [];

    for (var i = 0; i <= this.trajectories.length; i++) {
      // Add property changers
      (this.propertyChangers[i] || []).forEach(function(changer) { self.addChild(changer); });
      if (i == this.trajectories.length) break;

      var trajectory = this.trajectories[i];

      const trajectoryBlocks = [];
      var lastq = null;
      trajectory.forEach(function(p) {
        var q = [self.xvalueToCoord(p.x), self.yvalueToCoord(p.y)];
        if (lastq != null && lineWidth > 0) {
          // Create line
          var segment = sfig.line(lastq, q);
          if (trajectoryNames[i]) segment.tooltip(trajectoryNames[i]);
          segment.color(trajectoryColors[i] || 'black');
          segment.strokeWidth(lineWidth);
          if (lineDasharrays[i])
            segment.strokeDasharray(lineDasharrays[i]);
          trajectoryBlocks.push(segment);
        }

        // Create marker
        if (createMarker != null) {
          var marker = createMarker(i, trajectoryColors[i] || 'black');
          marker.shift(q[0], q[1]);
          marker.tooltip(p.x + ',' + p.y);
          trajectoryBlocks.push(marker);
          self.addValueLabel(p.y, i, marker);
        }
        lastq = q;
      });
      self.addChild(overlay(...trajectoryBlocks).atomicMouseShowHide(true));
    }
  };

  sfig.lineGraph = function() { return new sfig.LineGraph(arguments); }
})();

////////////////////////////////////////////////////////////
// BarGraph
// Given trajectories, create a group, one for each time point.

(function() {
  var BarGraph = sfig.BarGraph = function(trajectories) {
    BarGraph.prototype.constructor.call(this, trajectories);
    this.xrange(0, trajectories[0].length + 1);
    this.xtickIncrValue(1);
    this.xtickIncludeAxis(false);
  }
  sfig_.inheritsFrom('BarGraph', BarGraph, sfig.Graph);

  sfig_.addProperty(BarGraph, 'barWidth', 30, 'Bar width');
  sfig_.addProperty(BarGraph, 'innerBarSpacing', 2, 'Spacing between bars in a groups');

  BarGraph.prototype.createDataChildren = function() {
    var self = this;

    var trajectoryNames = this.trajectoryNames().get() || [];
    var trajectoryColors = this.trajectoryColors().get() || [];
    var barWidth = this.barWidth().getOrDie();
    var innerBarSpacing = this.innerBarSpacing().getOrDie();

    var n = this.trajectories.length;
    var groupWidth = barWidth * n + innerBarSpacing * (n - 1);

    for (var i = 0; i <= n; i++) {
      // Add property changers
      (this.propertyChangers[i] || []).forEach(function(changer) { self.addChild(changer); });
      if (i == this.trajectories.length) break;

      var trajectory = this.trajectories[i];

      trajectory.forEach(function(p) {
        var x = self.xvalueToCoord(p.x);
        var xOffset = - groupWidth / 2 + (barWidth + innerBarSpacing) * i;
        // Corners
        var q0 = [x + xOffset, self.yvalueToCoord(self.yminValue().getOrDie())];
        var q1 = [x + xOffset + barWidth, self.yvalueToCoord(p.y)];
        //sfig.L(q0 + ' | ' + q1);

        // Create bar
        if (q0[1] == q1[1]) {
          sfig.L('Warning: empty bar will not be visible: ' + q0 + ' | ' + q1);
        } else {
          var bar = sfig.polygon(q0, [q0[0], q1[1]], q1, [q1[0], q0[1]]).fillColor(trajectoryColors[i] || 'gray');
          bar.tooltip(p.x + ',' + p.y);
          self.addChild(bar);
          self.addValueLabel(i, p.x, p.y, bar);
        }
      });
    }
  };

  sfig.barGraph = function() { return new sfig.BarGraph(arguments); }
})();
