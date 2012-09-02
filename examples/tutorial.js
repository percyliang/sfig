// Shows an example of a really simple presentation.
// Feel free to copy this to use as a template.

sfig.importMethods(this, [
  '_', 'pause', 'center', 'parentCenter',
  'circle', 'square', 'ellipse',
  'xtable', 'ytable', 'table',
  'frame', 'wrap', 'overlay', 'transform', 'slide',
  'textBox', 'text',
  'bulletedText', 'line', 'arrow',
]);
sfig.initialize();

sfig.Text.defaults.setProperty('fontSize', 18);

var prez = sfig.presentation();
var slideNum = 0;
function add(block) { slideNum++; prez.addSlide(block.rightFooter(slideNum)); }

// Show an example alongside the rendered output
function example(code) {
  var target = wrap(eval(code));
  var numLines = code.split('\n').length;
  return frame(xtable(
    textBox().size(50, numLines).content(code).onEnter(function(box) {
      var input = box.content().get();
      var output = eval(input);
      target.resetContent(output);
      prez.refresh(function() { box.textElem.focus(); });
    }),
    sfig.rightArrow(50),
    frame(target).padding(5).bg.strokeWidth(1).strokeColor('gray').end,
  _).xmargin(20).center()).padding(10);
}

prez.addSlide(slide('',
  parentCenter('sfig tutorial').scale(1.5).strokeColor('darkblue'),
  parentCenter('Percy Liang'),
_).id('title'));

add(slide('What is sfig?',
  'sfig is a Javascript library for producing SVG-based presentations and figures.',
  'To jump right in, we can draw a blue circle with radius 20:',
  example("circle(20).color('blue')"),
  'This command creates a <b>Block</b> object, which is later rendered into SVG.',
  'You can edit the code and press ctrl-enter to see the updated result.',
_));

add(slide('Setting properties',
  'It is easy to set the properties of Blocks by chaining them:',
  example("c = square(40)\nc.strokeColor('blue').fillColor('red')\nc.strokeWidth(2).opacity(0.5)"),
  'We can also transform Blocks:',
  example("square(40).scale(0.8).rotate(45)"),
  'Properties can be overridden:',
  example("ellipse(40, 20).xradius(10)"),
_));

add(slide('Text',
  'By default, strings are converted into Text Blocks:',
  example("'hello'"),
  'Or more explicitly, which allows us to change text properties:',
  example("text('hello').fontSize(30).font('Courier New')"),
  'We can also created bulleted lists:',
  example("text(['Shapes:',\n  'circle', 'square']).bulleted(true)"),
  'Importantly, we can embed LaTeX (rendered using MathJax):',
  example("'$\\\\frac{\\\\sin(\\\\alpha)}{\\\\cos(\\\\alpha)}$'"),
_));

add(slide('Multiple objects',
  'So far we have created one Block at a time.  Much of the richness of sfig comes from now Blocks are combined.',
  'The simplest way is to create an <b>Overlay</b>:',
  example("a = circle(20)\nb = circle(20).shift(60, 0)\noverlay(a, b)"),
  'However, this often requires specifying absolute positions, which can be quite tedious.  The second way is to use a <b>Table</b>:',
  example("a = circle(20)\nb = circle(20).shift(60, 0)\nxtable(a, b).margin(20)"),
_));

add(slide('Overlays',
  'Note that each Block has an origin (for a circle, it\'s the center; for a square, it\'s the top-left corner).',
  'Overlay always places the Blocks so all the origins are in one place.',
  'However, we can change the origin by pivoting:',
  example("a = square(20).strokeColor('red')\nb = square(40).strokeColor('blue')\noverlay(a, b)"),
  'Pivoting around the center of each square:',
  example("a = square(20).strokeColor('red')\nb = square(40).strokeColor('blue')\noverlay(a, b).pivot(0, 0)"),
  'Or around the bottom middle:',
  example("a = square(20).strokeColor('red')\nb = square(40).strokeColor('blue')\noverlay(a, b).pivot(0, 1)"),
_));

add(slide('Tables',
  'A Table is built from a two-dimensional matrix of Blocks.',
  'It uses the bounding boxes of the Blocks to position.',
  'By default, everything is left justified:',
  example("table(['cat', 'dog'], ['caterpillar', circle(20)])\n  .margin(10)"),
  'We can re-justify (l is left, c is center, r is right):',
  example("table(['cat', 'dog'], ['caterpillar', circle(20)])\n  .margin(10).justify('cl', 'r')"),
  'The first argument (cl) corresponds to the x-axis and the second (r) to the y-axis.',
_))

add(slide('Referencing other Blocks',
  'sfig tries hard to avoid absolute references. We saw that Tables and Overlays are constructs that position Blocks relative to each other, but these relations are only with respect to a given hierarchy.',
  'We can also create relative references more directly as follows inside an Overlay:',
  example("c = circle(20)\nl = center('C').shift(c.right().add(8), c.ymiddle())\noverlay(c, l)"),
  'Note that the position of the label depends dynamically on that of c, which critically might not be known when the Blocks are constructed.',
  'Another example (note that it would be hard to get the absolute size of the text):',
  example("t = text('hello world')\nl = line([t.left(), t.ymiddle()],\n         [t.right(), t.ymiddle()])\noverlay(t, l)"),
  'We can also access the width and height (the real prefix refers to what\'s actually rendered):',
  example("t = text('hello world')\nl = text(t.realWidth().add(' ')\n    .add(t.realHeight()))\nytable(t, l)"),
  'Under the hood, all properties (t.strokeColor(), t.left()) are <b>Thunk</b> objects, which encapsulate the lazy computation of their values.',
_));

add(slide('Links',
  'We can attach hyperlinks to internal slides:',
  example("text('Go to title page').linkToInternal(prez, 'title', 0)"),
  'Or other sfig presentations:',
  example("text('Go to simple presentation').linkToExternal('simple-presentation')"),
  'Or different URLs:',
  example("text('Google').linkToUrl('http://www.google.com')"),
_));

add(slide('Events',
  'We can attach the usual events to Blocks:',
  example("circle(30).onClick(function() { alert('Clicked') })"),
_));

add(slide('Animation',
  'Every Block has an <b>Animate</b> object, which contains the set of properties to be animated from.',
  'For example, to fade something in:',
  example("circle(20).color('blue').animate.opacity(0).end"),
_));

add(slide('From Blocks to SVG elements',
  bulletedText([null,
    'All the code so far only generates Blocks, which contain all the necessary information to render into SVG.',
    ['This layer of indirection offers some advantages:',
      'Allows modification of the Block\'s properties after contstruction',
      'Allows us to manipulate the higher-level Block in various ways before rendering (possibly in different ways).',
    ],
  ]),
_));

add(slide('To be completed...',
  bulletedText([null, 'Levels', 'Slides', 'Frames', 'Transforms', 'ParseTree', 'd3']), 
_));

function onLoad() { prez.run(); }
