// Shows an example of a really simple presentation.
// Feel free to copy this to use as a template.

sfig.importMethods(this, [
  '_', 'let', 'pause', 'center', 'parentCenter',
  'circle', 'square', 'ellipse', 'rect',
  'xtable', 'ytable', 'table',
  'frame', 'wrap', 'overlay', 'transform', 'slide',
  'textBox', 'text',
  'bulletedText', 'line', 'arrow',
]);
sfig.initialize();
sfig.wideScreen();

sfig.Text.defaults.setProperty('fontSize', 18);
sfig.TextBox.defaults.setProperty('fontSize', 14);
sfig.Slide.defaults.setProperty('showHelp', true);

var prez = sfig.presentation();
var slideNum = 0;
function add(block) { slideNum++; prez.addSlide(block.rightFooter(slideNum)); }

// Show an example alongside the rendered output
function example(code, options) {
  var target = wrap(eval(code));
  var numRows = (options && options.numRows) || code.split('\n').length;
  return parentCenter(frame(xtable(
    textBox().multiline(true).size(50, numRows).content(code).onEnter(function(box) {
      var input = box.content().get();
      var output = eval(input);
      target.resetContent(output);
      prez.refresh(function() { box.textElem.focus(); });
    }),
    sfig.rightArrow(50).strokeWidth(5).color('brown'),
    frame(target).padding(5).bg.strokeWidth(1).strokeColor('gray').end,
  ).xmargin(20).center()).padding(10));
}

prez.addSlide(slide('',
  parentCenter('<b>sfig</b>').scale(2).strokeColor('darkblue'),
  'sfig is a Javascript library for creating SVG-based presentations and figures.  Here\'s an example:',
  example("circle(20).color('blue')", {numRows: 4}),
  'You can edit the Javascript code (e.g., try changing the color to red) and press ctrl-enter to see the updated result.',
  'Use the arrow keys to move between slides.',
  text('Download the code from GitHub.'.fontcolor('blue')).linkToUrl('http://github.com/percyliang/sfig'),
).id('title'));

add(slide('Why sfig?',
  'As motivation, consider the task of drawing nodes with labels inside:',
  example("function node(s) {\n  l = text(s)\n  c = ellipse(l.realWidth().mul(0.7),\n              l.realHeight().mul(0.7))\n  return overlay(l, c).center()\n}\na = node('$G_{n,p}$')\nb = node('graph')\nytable(a, b).center().margin(40)"),
  '<b>Factor out form and content</b>: figures often have recurring elements which display different content in the same form (e.g., circled nodes).  Using code, we can define the form <em>once</em> in a function and use it with different content (e.g., <tt>node(\'algorithm\')</tt>, <tt>node(\'graph\')</tt>).',
  '<b>Relative layout</b>: creating figures by code would be tedious if we had to specify the absolute sizes/positions of all the elements.  sfig offers constructs (e.g., <tt>overlay</tt>, <tt>xtable</tt>) to specify control layout in a higher-level way.',
  '<b>MathJax integration</b>: Embed $\\LaTeX$ seamlessly into your figures.',
));

add(slide('Blocks and properties',
  'The basic unit in sfig is called a <b>Block</b> (includes text, circles, rectangles, etc.). A Block has various properties which specifies all the information to render into an SVG element.',
  'We can set the properties of Blocks by chaining them as follows:',
  example("c = square(40)\nc.strokeColor('blue').fillColor('red')\nc.strokeWidth(2).opacity(0.5)"),
  'We can also transform Blocks:',
  example("square(40).scale(0.8).rotate(45)"),
  'Properties can be also overridden:',
  example("ellipse(40, 20).xradius(10)"),
));

add(slide('Text',
  'By default, strings are converted into Text Blocks:',
  example("'hello'"),
  'Or more explicitly, which allows us to change text properties:',
  example("text('hello').fontSize(30).font('Courier New')"),
  'We can also created bulleted lists:',
  example("text(['Shapes:',\n  'circle', 'square']).bulleted(true)"),
  'Importantly, we can embed LaTeX (rendered using MathJax):',
  example("'$\\\\frac{\\\\sin(\\\\alpha)}{\\\\cos(\\\\alpha)}$'"),
));

add(slide('Interactive math',
  'Math can be dense and hard to process, so it\'s useful to be able to walk through it slowly.',
  'That\'s why writing math on the board is so much more pleasant than breezing through it on slides.',
  'But with sfig, you can simulate writing math on the board in slides.',
  'Press shift-m to toggle mouse show/hide mode and then move your mouse over the equation below.',
  parentCenter(text('$\\text{KL}(p || q) = \\int p(x) \\log \\frac{p(x)}{q(x)} dx$').atomicMouseShowHide(false).scale(2)),
).id('interactive-math'));

add(slide('Multiple objects',
  'So far we have created one Block at a time.  Much of the richness of sfig comes from now Blocks are combined.',
  'The simplest way is to create an <b>Overlay</b>:',
  example("a = circle(20)\nb = circle(20).shift(60, 0)\noverlay(a, b)"),
  'However, this often requires specifying absolute positions, which can be quite tedious.  The second way is to use a <b>Table</b>:',
  example("a = circle(20)\nb = circle(20).shift(60, 0)\nxtable(a, b).margin(20)"),
));

add(slide('Overlays',
  'Note that each Block has an origin (for a circle, it\'s the center; for a square, it\'s the top-left corner).',
  'Overlay always places the Blocks so all the origins are in one place.',
  'However, we can change the origin by pivoting:',
  example("a = square(20).strokeColor('red')\nb = square(40).strokeColor('blue')\noverlay(a, b)"),
  'Pivoting around the center of each square:',
  example("a = square(20).strokeColor('red')\nb = square(40).strokeColor('blue')\noverlay(a, b).pivot(0, 0)"),
  'Or around the bottom middle:',
  example("a = square(20).strokeColor('red')\nb = square(40).strokeColor('blue')\noverlay(a, b).pivot(0, 1)"),
));

add(slide('Tables',
  'A Table is built from a two-dimensional matrix of Blocks.',
  'It uses the bounding boxes of the Blocks to position.',
  'By default, everything is left justified:',
  example("table(['cat', 'dog'], ['caterpillar', circle(30)])\n  .margin(10)"),
  'We can re-justify (l is left, c is center, r is right):',
  example("table(['cat', 'dog'], ['caterpillar', circle(30)])\n  .margin(10).justify('cl', 'r')"),
  'The first argument (cl) corresponds to the x-axis and the second (r) to the y-axis.',
))

add(slide('Referencing other Blocks',
  'sfig tries hard to avoid absolute references. We saw that Tables and Overlays are constructs that position Blocks relative to each other, but these relations are only with respect to a given hierarchy.',
  'We can also create relative references more directly as follows inside an Overlay:',
  example("c = circle(20)\nl = center('C')\n  .shift(c.right().add(8), c.ymiddle())\noverlay(c, l)"),
  'Note that the position of the label depends dynamically on that of c, which critically might not be known when the Blocks are constructed.',
));

add(slide('Referencing other Blocks (continued)',
  'Another example (note that it would be hard to get the absolute size of the text):',
  example("t = text('hello world')\nl = line([t.left(), t.ymiddle()],\n         [t.right(), t.ymiddle()])\noverlay(t, l)"),
  'We can also access the width and height (the real prefix refers to what\'s actually rendered):',
  example("t = text('hello world')\nl = text(t.realWidth().add(' ')\n    .add(t.realHeight()))\nytable(t, l)"),
  'Under the hood, all properties (t.strokeColor(), t.left()) are <b>Thunk</b> objects, which encapsulate the lazy computation of their values.',
));

add(slide('Links',
  'We can attach hyperlinks to internal slides:',
  example("text('Go to title page')\n  .linkToInternal(prez, 'title', 0)"),
  'Or other sfig presentations:',
  example("text('Go to simple presentation')\n  .linkToExternal('simple-presentation')"),
  'Or different URLs:',
  example("text('Google').linkToUrl('http://www.google.com')"),
));

add(slide('Events',
  'We can attach the usual events to Blocks:',
  example("circle(30).onClick(function() {\n  alert('Clicked')\n})"),
));

add(slide('Animation',
  'Every Block has an <b>Animate</b> object, which contains the set of properties to be animated from.',
  'For example, to fade something in:',
  example("circle(20).color('blue').animate.opacity(0).end"),
));

function equationEditor() {
  var example = '\\alpha^2';
  function convert(str) { return '$\\displaystyle ' + str + '$'; }
  var target = wrap(convert(example));
  return parentCenter(ytable(
    textBox().size(30, 1).content(example).onEnter(function(box) {
      target.resetContent(convert(box.content().get()));
      prez.refresh(function() { box.textElem.focus(); });
    }),
    target,
  ).center().ymargin(10));
}

function timeSeriesPlotter() {
  //var example = '1 1\n4 2\n9 3\n16 4';
  var example = 'Baseline 40 73.2 90 88\nImproved 60 75 91 95';
  function convert(str) {
    var lines = str.split('\n');
    var trajectoryNames = [];
    var trajectories = [];
    for (var i = 0; i < lines.length; i++) {
      var tokens = lines[i].split(/\s+/).filter(function(x) { return x != ''; });
      if (!isFinite(tokens[0])) {
        trajectoryNames.push(tokens[0]);
        trajectories.push(tokens.slice(1).map(parseFloat));
      } else {
        tokens = tokens.map(parseFloat);
        for (var j = 1; j < tokens.length; j++) {
          var trajectory = trajectories[j-1];
          if (trajectory == null) trajectory = trajectories[j-1] = [];
          trajectory.push({x:tokens[0], y:tokens[j]});
        }
      }
    }
    var graph = new sfig.LineGraph(trajectories);
    graph.trajectoryNames(trajectoryNames);
    graph.axisLabel('iteration', 'value $\\alpha$');
    graph.marker(sfig.Graph.circleMarker);
    graph.trajectoryColors(['red', 'blue', 'green']);
    graph.legendPivot(1, 1);
    graph.numTicks(10, 5).yrange(0, 100).roundPlaces(0).tickIncrValue(1, 20);
    return graph;
  }
  var target = wrap(convert(example));
  return parentCenter(xtable(
    textBox().multiline(true).size(30, 10).content(example).onEnter(function(box) {
      target.resetContent(convert(box.content().get()));
      prez.refresh(function() { box.textElem.focus(); });
    }),
    target,
  ).center().ymargin(10));
}

add(slide('Example Tools',
  'sfig can be used to build quick interactive tools.',

  '<b>Render a LaTeX equation</b>:',
  equationEditor(),

  '<b>Plot time series</b> (format is "name $x_1$ $x_2$..." or "$x_1$ $y_1$\\n$x_2$ $y_2$\\n..."):',
  timeSeriesPlotter(),
));

add(slide('Drawing Rooted Trees',
  'sfig can be used to draw trees (e.g., for syntax):',
  example("T = sfig.rootedTree\nB = sfig.rootedTreeBranch\nnp = T('NP', T('N', 'I'))\nvp = T('VP', T('V', 'like'), T('N', 'cheese'))\ntree = T('S', np, vp)\ntree.recverticalCenterEdges(true)\ntree.recnodeBorderWidth(0).recnodePadding(0)"),
));

add(slide('From Blocks to SVG elements',
  bulletedText([null,
    'All the code so far only generates Blocks, which contain all the necessary information to render into SVG.',
    ['This layer of indirection offers some advantages:',
      'Allows modification of the Block\'s properties after contstruction',
      'Allows us to manipulate the higher-level Block in various ways before rendering (possibly in different ways).',
    ],
    ['The life of a Block has three stages:',
      'Construction and setting its properties [<tt>c = circle(10).color(\'blue\')</tt>]',
      ['Creating children from properties [<tt>c.freeze()</tt>, which calls <tt>c.createChildren()</tt>].  There are two ways this stage will use the properties:',
        'Indirectly [<tt>c.xradius().add(3)</tt>]: can manipulate properties which might depend on some Block\'s rendered properties (e.g., realWidth)',
        'Directly [<tt>c.strokeColor().get() + 3</tt>]: can use actual values to control the identity of the children Blocks created',
      ],
      'Rendering [<tt>c.renderElem(...)</tt> sets <tt>c.elem</tt> and properties such as realWidth]',
    ],
  ]),
));

add(slide('To be completed...',
  bulletedText([null, 'Level', 'Slide', 'Frame', 'Transform', 'RootedTree', 'Graph', 'd3']),
));

function onLoad() { prez.run(); }
