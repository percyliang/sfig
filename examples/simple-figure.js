// Shows an example of a really simple figure.
// Feel free to copy this to use as a template.

// Don't need math for this simple example
sfig.enableMath = false;

// Add to this namespace for convenient access
sfig.importMethods(this, ['circle', 'square']);

sfig.initialize();

function onLoad() {
  sfig.figure(circle(20).color('blue'), 'blueCircle');
  sfig.figure(square(40).color('red'), 'redSquare');
}
