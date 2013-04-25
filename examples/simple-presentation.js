// Shows an example of a really simple presentation.
// Feel free to copy this to use as a template.

// Don't need math for this simple example
sfig.enableMath = false;

// Add to this namespace for convenient access
sfig.importMethods(sfig.serverSide ? global : this, [
  '_', 'pause', 'overlay', 'parentCenter', 'circle', 'xtable',
  'bulletedText', 'arrow', 'transform', 'slide'
]);

sfig.initialize();

// Create a new presentation
var prez = sfig.presentation();
if (sfig.serverSide) global.prez = prez;

prez.addSlide(slide('Introduction',  // Title to show at the top.
  'Welcome to sfig.',  // Just some text.
  pause(),  // Create a new level.
  'Here is a blue circle:',
  parentCenter(circle(50).strokeColor('blue')),  // Create circle and center it.
_).id('intro'));  // _ is ignored, but allows us to end all list items with a comma.

prez.addSlide(slide('Conclusion',
  'Here\'s a diagram:',
  parentCenter(overlay(
    xtable(c1 = circle(50), c2 = circle(80)).xmargin(100).yjustify('c'),  // Create two circles aligned.
    arrow(c1, c2),  // Connect them with a line.
    transform('small').center().shift(c1.xmiddle(), c1.ymiddle()),  // Put a label in the middle of c1.
    transform('big').center().shift(c2.xmiddle(), c2.ymiddle()),  // Put a label in the middle of c2.
  _)), 
  pause(),
  'Links:',
  bulletedText('First page').linkToInternal(prez, 'intro', 0),
  bulletedText('Tutorial').linkToExternal('tutorial'),
  bulletedText('GitHub').linkToUrl('http://github.com/percyliang/sfig'),
_));
