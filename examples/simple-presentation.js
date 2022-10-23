// Shows an example of a really simple presentation.

require('../internal/sfig.js');
require('../internal/metapost.js');

sfig.wideScreen();

// Make this work for both Metapost and in browser.
G = sfig.serverSide ? global : this;

// Add to this namespace for convenient access
sfig.importAllMethods(G);
sfig.initialize();

// Create a new presentation
G.prez = sfig.presentation();

prez.addSlide(slide('Introduction',  // Title to show at the top.
  'Welcome to sfig.',  // Just some text.
  pause(),  // Create a new level.
  'Here is a blue circle:',
  parentCenter(circle(50).strokeColor('blue')),  // Create circle and center it.
).id('intro'));

prez.addSlide(slide('Conclusion',
  'Here\'s a diagram:',
  parentCenter(overlay(
    xtable(c1 = circle(50), c2 = circle(80)).xmargin(100).yjustify('c'),  // Create two circles aligned.
    arrow(c1, c2),  // Connect them with a line.
    transform('small').center().shift(c1.xmiddle(), c1.ymiddle()),  // Put a label in the middle of c1.
    transform('big').center().shift(c2.xmiddle(), c2.ymiddle()),  // Put a label in the middle of c2.
  )),
  pause(),
  'Links:',
  bulletedText('First page').linkToInternal(prez, 'intro', 0),
  bulletedText('Tutorial').linkToExternal('tutorial'),
  bulletedText('GitHub').linkToUrl('http://github.com/percyliang/sfig'),
));

prez.writePdf({outPrefix: 'simple-presentation'});
