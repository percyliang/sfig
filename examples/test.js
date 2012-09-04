// Performs comprehensive tests of sfig functionality.
// This file is currently a mess.

// Initialize
sfig.latexMacro('name', 0, '\\text{foo}');
sfig.enableProfiling = true;
sfig.enableTiming = true;
sfig.initialize();
sfig.importMethods(this, [
  '_', 'pause', 'home', 'parentCenter', 'bulletedText',
  'center', 'textBox', 'raw', 'rawAddHtml', 'rawAddSvg',
  'circle', 'square', 'rect', 'arrow', 'line', 'polyline', 'text',
  'xtable', 'ytable', 'table', 'frame', 'transform', 'overlay', 'image', 'wrap', 'slide',
  'lineGraph', 'Graph',
]);

var prez = sfig.presentation();
function addToPrez(block) { prez.addSlide(block); }

function testCase(block, elemStr) {
  var marker = circle(2).opacity(0.5).color('red');
  marker.onShow(function() {
    //console.log(sfig_.javascriptEscape(block.elemString()));
  });
  addToPrez(overlay(marker, block));

  var trueBlock = elemStr ? raw(sfig.stringToElem(elemStr)) : text('?').scale(10).color('green');
  var trueMarker = circle(2).opacity(0.5).color('green');
  trueMarker.onShow(function() {
    //console.log(sfig_.javascriptEscape(trueBlock.elemString()));
  });
  addToPrez(overlay(trueMarker, trueBlock));
}

function assertEquals(a, b) {
  if (a != b) throw 'Assertion failed: '+a+' != '+b;
}
function thunkTest() {
  sfig.importMethods(this, ['tconstant', 'tfunc']);
  var x = tconstant(4);
  var y = tconstant(5);
  var z = x.add(y);
  assertEquals(z.get(), 9);
  assertEquals(z.value, 9);  // Should be cached

  x.set(1);  // This should affect z which uses x
  assertEquals(z.value, null);  // Should be invalidated
  assertEquals(z.get(), 6);

  x.set(y.mul(2));
  assertEquals(z.get(), 15);

  y.set(10);
  assertEquals(z.get(), 30);

  var p = new sfig.Properties();
  p.setProperty('x', 5);
  p.setProperty('y', p.getProperty('x').mul(2));
  assertEquals(p.getProperty('y').get(), 10);
  p.setProperty('x', 3);
  assertEquals(p.getProperty('y').get(), 6);
}
thunkTest();

function createSlides() {
  // Wrapping
  addToPrez(slide('A test of word wrapping',
    bulletedText('This is a really long sentence that keeps on going and going, but fortunately we have word wrap which prevents this sentence from going off the screen.'),
    bulletedText('Here is a nice rectangle:'),
    parentCenter(rect(80, 40)),
    bulletedText('After that sentence, some math: $\\frac{3}{4}$.'),
  _));

  // Javascript create objects
  (function() {
    var o = wrap('?');
    var t = textBox().size(50, 10).content('circle(10).color(\'blue\')').selection(1, 2).onEnter(function(box) {
      var input = box.content().get();
      var output = eval(input);
      console.log('eval', input, output);
      output = sfig.std(output);
      o.resetContent(output);
      prez.refresh(function() { t.textElem.focus(); });
    })
    addToPrez(xtable(t, frame(o).bg.strokeWidth(2).end.padding(10)).xmargin(10));
  })();

  // LineGraph
  addToPrez(lineGraph([[0, 5], [1, 9], [3, 4], [5, 6]], pause(), [5, 6, 9]).marker(Graph.circleMarker).trajectoryColors(['red', 'blue']));

  // Tutorial: http://www.recursion.org/d3-for-mere-mortals/
  // Using d3
  addToPrez(rawAddSvg(function(container) {
    container = d3.select(container);

    var c = container.selectAll('circle').data([10, 20, 30]).enter().append('circle');
    c.attr('cx', function(x) { return x * 10; });
    c.attr('cy', function(x) { return x * 5; });
    c.attr('r', 50);
    c.style('stroke', 'blue');
    c.style('fill', 'none');
    c.transition().duration(1000).attr('r', function(x) { return x; });
    c.on('click', function(x, i) { console.log(x); });
  }));

  // Add raw HTML
  addToPrez(frame(rawAddHtml(100, 100, function(container) {
    container.appendChild(document.createTextNode('hello this is a test and it goes on and on'));
  })).bg.strokeWidth(1).end.padding(5).scale(2));

  // Add events to parts
  addToPrez(text('$x^2 \\cssId{foo}{+ y - y}$')
      .tooltip('equation')
      .partTooltip('foo', 'irrelevant')  // Doesn't work
      .partOnClick('foo', function(x, div) {
    sfig.L('clicked');
    div.style.display = 'none';
  }));

  var p = d3.select("body").selectAll("p")
        .data([4, 8, 15, 16, 23, 42])
        .text(String);
  p.enter().append("p").text(String);
  p.exit().remove();

  // Align
  addToPrez(home(overlay(
    circle(30), pause(),
    circle(50).onShow(function() { console.log('show circle'); }),
  _).onShow(function() { console.log('show overlay'); })));

  // Replace
  testCase(xtable(c1 = circle(30), pause(), circle(50).replace(c1)));

  // Animate (doesn't work properly in Chrome unless refreshed from this page)
  addToPrez(square(30).color('blue'));
  addToPrez(square(30).animate.scale(0.5).end);

  a = square(50).shift(10);
  b = square(50).shift(80, 30);
  c1 = circle(10).shift(a.xmiddle(), a.ymiddle()).scale(2);
  c2 = circle(10).shift(b.xmiddle(), b.ymiddle());
  c2.animate.from(c1);
  testCase(overlay(a, b, c1, pause(), c2.replace(c1)), '<g style=""><g style=""><g style=""><rect width="50" height="50" style="stroke: #000000; fill: none; stroke-width: 1px; " transform="translate(10,10)"></rect></g></g><g style=""><g style=""><rect width="50" height="50" style="stroke: #000000; fill: none; stroke-width: 1px; " transform="translate(80,30)"></rect></g></g><g style=""><g style=""><ellipse rx="10" ry="10" style="stroke: #000000; fill: none; stroke-width: 1px; display: none; " transform="translate(35,35) scale(2,2)"></ellipse></g></g><g style=""><g style=""><ellipse rx="10" ry="10" style="stroke: #000000; fill: none; stroke-width: 1px; " transform="translate(105,55)"><animateTransform begin="indefinite" fill="freeze" attributeName="transform" type="translate" from="-70,-20" to="0,0" dur="1s" additive="sum"></animateTransform><animateTransform begin="indefinite" fill="freeze" attributeName="transform" type="scale" from="2,2" to="1,1" dur="1s" additive="sum"></animateTransform></ellipse></g></g></g>');

  // Interactive
  (function() {
    var container = wrap(square(100));
    var button = circle(30).fillColor('red');
    button.onClick(function() {
      container.resetContent(square(200));
      prez.refresh();
    });
    addToPrez(home(overlay(container, button).center()));
  })();

  (function() {
    var container = wrap(square(100));
    var button = circle(50).fillColor('red').onClick(function() {
      container.color('blue');
      container.invalidateRender();
      prez.refresh();
    });
    addToPrez(xtable(container, button));
  })();

  // Text
  testCase(text('$\\sqrt{x^2}$').scale(3).color('blue'));
  testCase(text('a'), '<foreignObject width="13" height="34" style="fill: none; stroke-width: 1px; "><div style="display: inline-block; height: auto; width: auto; float: left; font-family: \'Times New Roman\'; font-size: 28px; color: black; ">a</div></foreignObject>');
  testCase(text('$x^2$'), '<foreignObject width="32" height="27" style="fill: none; stroke-width: 1px; "><div style="display: inline-block; height: auto; width: auto; float: left; font-family: \'Times New Roman\'; font-size: 28px; color: black; "><span class="MathJax_Preview"></span><span style="display: inline-block; " class="MathJax_SVG" id="MathJax-Element-1-Frame" role="textbox" aria-readonly="true"><svg xmlns:xlink="http://www.w3.org/1999/xlink" style="width: 2.402ex; height: 2.002ex; vertical-align: -0.187ex; margin: 1px 0px; " viewBox="0 -840.8961840821062 1034.0889244992065 861.8961840821062"><g stroke="black" fill="black" stroke-thickness="0" transform="matrix(1 0 0 -1 0 0)"><use href="#MJMATHI-78"></use><use transform="scale(0.7071067811865476)" href="#MJMAIN-32" x="816" y="513"></use></g></svg></span><script type="math/tex" id="MathJax-Element-1">x^2</script></div></foreignObject>');

  // Tables
  testCase(table(
    [square(50).color('red'), square(50).color('red'), square(50).color('red')],
    [square(10).color('blue'), square(10).color('blue'), square(10).color('blue')],
  _).justify('lcr', 'c').margin(5), '<g style=""><g style=""><g transform="translate(0,25.5)" style=""><g style=""><g style=""><g style=""><g transform="translate(0,-25.5)" style=""><rect width="51" height="51" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(0.5,-25)" style=""><rect width="50" height="50" style="stroke: #ff0000; fill: #ff0000; stroke-width: 1px; "></rect></g></g></g></g></g></g><g transform="translate(56,0)" style=""><g transform="translate(25.5,25.5)" style=""><g style=""><g style=""><g style=""><g transform="translate(-25.5,-25.5)" style=""><rect width="51" height="51" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(-25,-25)" style=""><rect width="50" height="50" style="stroke: #ff0000; fill: #ff0000; stroke-width: 1px; "></rect></g></g></g></g></g></g><g transform="translate(112,0)" style=""><g transform="translate(51,25.5)" style=""><g style=""><g style=""><g style=""><g transform="translate(-51,-25.5)" style=""><rect width="51" height="51" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(-50.5,-25)" style=""><rect width="50" height="50" style="stroke: #ff0000; fill: #ff0000; stroke-width: 1px; "></rect></g></g></g></g></g></g><g transform="translate(0,56)" style=""><g transform="translate(0,5.5)" style=""><g style=""><g style=""><g style=""><g transform="translate(0,-5.5)" style=""><rect width="51" height="11" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(0.5,-5)" style=""><rect width="10" height="10" style="stroke: #0000ff; fill: #0000ff; stroke-width: 1px; "></rect></g></g></g></g></g></g><g transform="translate(56,56)" style=""><g transform="translate(25.5,5.5)" style=""><g style=""><g style=""><g style=""><g transform="translate(-25.5,-5.5)" style=""><rect width="51" height="11" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(-5,-5)" style=""><rect width="10" height="10" style="stroke: #0000ff; fill: #0000ff; stroke-width: 1px; "></rect></g></g></g></g></g></g><g transform="translate(112,56)" style=""><g transform="translate(51,5.5)" style=""><g style=""><g style=""><g style=""><g transform="translate(-51,-5.5)" style=""><rect width="51" height="11" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(-10.5,-5)" style=""><rect width="10" height="10" style="stroke: #0000ff; fill: #0000ff; stroke-width: 1px; "></rect></g></g></g></g></g></g></g>');

  // Images
  testCase(xtable(image('../images/yes.png').dim(20), image('../images/no.png').dim(20)), '<g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><rect width="21" height="21" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(0.5,0.5)" style=""><image href="../images/yes.png" width="20" height="20" style="stroke: #000000; fill: none; stroke-width: 1px; "></image></g></g></g></g></g></g><g transform="translate(21,0)" style=""><g style=""><g style=""><g style=""><g style=""><g style=""><rect width="21" height="21" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(0.5,0.5)" style=""><image href="../images/no.png" width="20" height="20" style="stroke: #000000; fill: none; stroke-width: 1px; "></image></g></g></g></g></g></g></g>');

  // Transformations
  testCase(rect(100, 50).rotate(45), '<rect width="100" height="50" style="stroke: #000000; fill: none; stroke-width: 1px; " transform="rotate(45,0,0)"></rect>');
  testCase(frame(circle(50).strokeColor('red')).bg.color('green').opacity(0.2).strokeWidth(10).end, '<g style=""><g style=""><g style=""><g transform="translate(-55.5,-55.5)" style=""><rect width="111" height="111" style="stroke: #008000; fill: #008000; stroke-width: 10px; stroke-opacity: 0.2; fill-opacity: 0.2; "></rect></g></g><g style=""><g style=""><ellipse rx="50" ry="50" style="stroke: #ff0000; fill: none; stroke-width: 1px; "></ellipse></g></g></g></g>');
  testCase(square(50).color('green', 'red').opacity(0.5).strokeWidth(10), '<rect width="50" height="50" style="stroke: #008000; fill: #ff0000; stroke-width: 10px; stroke-opacity: 0.5; fill-opacity: 0.5; "></rect>');

  // Lines and arrows
  testCase(polyline([0, 0], [10, 20], [20, 10]).strokeColor('red').scale(4), '<polyline points="0,0 10,20 20,10" style="stroke: #ff0000; fill: none; stroke-width: 1px; " transform="scale(4,4)"></polyline>');
  testCase(arrow([0,0], [40,20]), '<g><g><g><g><line x1="0" y1="0" x2="40" y2="20" style="stroke: #000000; fill: none; stroke-width: 1px; "></line></g></g><g><g><g><g style=""></g></g></g></g><g><g><g><polygon points="0,0 -9,-3 -9,3" style="stroke: #000000; fill: #000000; stroke-width: 1px; " transform="translate(40,20) rotate(26.565051177077976,0,0)"></polygon></g></g></g></g></g>');
  testCase(overlay(c1 = circle(10), c2 = circle(10).shift(40, 20), line(c1, c2)), '<g><g><g><ellipse rx="10" ry="10" style="stroke: #000000; fill: none; stroke-width: 1px; "></ellipse></g></g><g><g><ellipse rx="10" ry="10" style="stroke: #000000; fill: none; stroke-width: 1px; " transform="translate(40,20)"></ellipse></g></g><g><g><line x1="8.94427190999916" y1="4.472135954999577" x2="31.05572809000084" y2="15.52786404500042" style="stroke: #000000; fill: none; stroke-width: 1px; "></line></g></g></g>');
  testCase(overlay(c1 = square(50), c2 = square(50).shift(40, 80), line(c1, c2)), '<g><g><g><rect width="50" height="50" style="stroke: #000000; fill: none; stroke-width: 1px; "></rect></g></g><g><g><rect width="50" height="50" style="stroke: #000000; fill: none; stroke-width: 1px; " transform="translate(40,80)"></rect></g></g><g><g><line x1="36.99999999999999" y1="49.5" x2="51.99999999999999" y2="79.5" style="stroke: #000000; fill: none; stroke-width: 1px; "></line></g></g></g>');

  // Rooted trees
  function T() { return sfig.rootedTree.apply(null, arguments); }
  function B() { return sfig.rootedTreeBranch.apply(null, arguments); }
  testCase(T('a', 'b', 'c').verticalCenterEdges(true), '<g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><rect width="22" height="41" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(11,20.5)" style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g transform="translate(-11,-20.5)" style=""><rect width="22" height="41" rx="5" ry="5" style="stroke: #000000; fill: none; stroke-width: 1px; "></rect></g></g><g style=""><g transform="translate(-7.5,-17)" style=""><foreignObject width="15" height="34" style="fill: none; stroke-width: 1px; "><div style="display: inline-block; height: auto; width: auto; float: left; font-family: \'Times New Roman\'; font-size: 28px; color: black; ">b</div></foreignObject></g></g></g></g></g></g></g></g></g></g></g></g></g></g><g transform="translate(52,0)" style=""><g style=""><g style=""><g style=""><g style=""><g style=""><rect width="20" height="41" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(10,20.5)" style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g transform="translate(-10,-20.5)" style=""><rect width="20" height="41" rx="5" ry="5" style="stroke: #000000; fill: none; stroke-width: 1px; "></rect></g></g><g style=""><g transform="translate(-6.5,-17)" style=""><foreignObject width="13" height="34" style="fill: none; stroke-width: 1px; "><div style="display: inline-block; height: auto; width: auto; float: left; font-family: \'Times New Roman\'; font-size: 28px; color: black; ">c</div></foreignObject></g></g></g></g></g></g></g></g></g></g></g></g></g></g></g></g></g><g style=""><g style=""><g transform="translate(36.5,-30)" style=""><g transform="translate(0,-20.5)" style=""><g style=""><g style=""><g style=""><g transform="translate(-10,-20.5)" style=""><rect width="20" height="41" rx="5" ry="5" style="stroke: #000000; fill: none; stroke-width: 1px; "></rect></g></g><g style=""><g transform="translate(-6.5,-17)" style=""><foreignObject width="13" height="34" style="fill: none; stroke-width: 1px; "><div style="display: inline-block; height: auto; width: auto; float: left; font-family: \'Times New Roman\'; font-size: 28px; color: black; ">a</div></foreignObject></g></g></g></g></g></g></g></g><g style=""><g style=""><g style=""><line x1="36.5" y1="-30" x2="11" y2="0" style="stroke: #000000; fill: none; stroke-width: 1px; "></line></g></g></g><g style=""><g style=""><g style=""><line x1="36.5" y1="-30" x2="62" y2="0" style="stroke: #000000; fill: none; stroke-width: 1px; "></line></g></g></g></g></g>');
  testCase(T('a', 'b', 'c'), '<g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><rect width="22" height="41" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(11,20.5)" style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g transform="translate(-11,-20.5)" style=""><rect width="22" height="41" rx="5" ry="5" style="stroke: #000000; fill: none; stroke-width: 1px; "></rect></g></g><g style=""><g transform="translate(-7.5,-17)" style=""><foreignObject width="15" height="34" style="fill: none; stroke-width: 1px; "><div style="display: inline-block; height: auto; width: auto; float: left; font-family: \'Times New Roman\'; font-size: 28px; color: black; ">b</div></foreignObject></g></g></g></g></g></g></g></g></g></g></g></g></g></g><g transform="translate(52,0)" style=""><g style=""><g style=""><g style=""><g style=""><g style=""><rect width="20" height="41" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(10,20.5)" style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g transform="translate(-10,-20.5)" style=""><rect width="20" height="41" rx="5" ry="5" style="stroke: #000000; fill: none; stroke-width: 1px; "></rect></g></g><g style=""><g transform="translate(-6.5,-17)" style=""><foreignObject width="13" height="34" style="fill: none; stroke-width: 1px; "><div style="display: inline-block; height: auto; width: auto; float: left; font-family: \'Times New Roman\'; font-size: 28px; color: black; ">c</div></foreignObject></g></g></g></g></g></g></g></g></g></g></g></g></g></g></g></g></g><g style=""><g style=""><g transform="translate(36.5,-30)" style=""><g transform="translate(0,-20.5)" style=""><g style=""><g style=""><g style=""><g transform="translate(-10,-20.5)" style=""><rect width="20" height="41" rx="5" ry="5" style="stroke: #000000; fill: none; stroke-width: 1px; "></rect></g></g><g style=""><g transform="translate(-6.5,-17)" style=""><foreignObject width="13" height="34" style="fill: none; stroke-width: 1px; "><div style="display: inline-block; height: auto; width: auto; float: left; font-family: \'Times New Roman\'; font-size: 28px; color: black; ">a</div></foreignObject></g></g></g></g></g></g></g></g><g style=""><g style=""><g style=""><line x1="28.816901408450708" y1="-31" x2="17.683098591549296" y2="0" style="stroke: #000000; fill: none; stroke-width: 1px; "></line></g></g></g><g style=""><g style=""><g style=""><line x1="43.183098591549296" y1="-31" x2="54.3169014084507" y2="0" style="stroke: #000000; fill: none; stroke-width: 1px; "></line></g></g></g></g></g>');
  testCase(T('a', B(frame('3').bg.fillColor('white').end.scale(0.5), 'b')), '<g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><rect width="22" height="41" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(11,20.5)" style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g transform="translate(-11,-20.5)" style=""><rect width="22" height="41" rx="5" ry="5" style="stroke: #000000; fill: none; stroke-width: 1px; "></rect></g></g><g style=""><g transform="translate(-7.5,-17)" style=""><foreignObject width="15" height="34" style="fill: none; stroke-width: 1px; "><div style="display: inline-block; height: auto; width: auto; float: left; font-family: \'Times New Roman\'; font-size: 28px; color: black; ">b</div></foreignObject></g></g></g></g></g></g></g></g></g></g></g></g></g></g></g></g></g><g style=""><g style=""><g transform="translate(11,-30)" style=""><g transform="translate(0,-20.5)" style=""><g style=""><g style=""><g style=""><g transform="translate(-10,-20.5)" style=""><rect width="20" height="41" rx="5" ry="5" style="stroke: #000000; fill: none; stroke-width: 1px; "></rect></g></g><g style=""><g transform="translate(-6.5,-17)" style=""><foreignObject width="13" height="34" style="fill: none; stroke-width: 1px; "><div style="display: inline-block; height: auto; width: auto; float: left; font-family: \'Times New Roman\'; font-size: 28px; color: black; ">a</div></foreignObject></g></g></g></g></g></g></g></g><g style=""><g style=""><g style=""><line x1="10.500000000000002" y1="-31" x2="10.499999999999996" y2="0" style="stroke: #000000; fill: none; stroke-width: 1px; "></line></g></g></g><g style=""><g style=""><g transform="translate(10.5,-15.5)" style=""><g style=""><g transform="scale(0.5,0.5)" style=""><g style=""><g style=""><g transform="translate(-8,-17.5)" style=""><rect width="16" height="35" style="stroke: #000000; fill: #ffffff; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(-7.5,-17)" style=""><foreignObject width="15" height="34" style="fill: none; stroke-width: 1px; "><div style="display: inline-block; height: auto; width: auto; float: left; font-family: \'Times New Roman\'; font-size: 28px; color: black; ">3</div></foreignObject></g></g></g></g></g></g></g></g></g></g>');

  // Big matrix
  var numRows = 20, numCols = 20;
  var matrix = [];
  var items = []
  for (var r = 0; r < numRows; r++) {
    matrix[r] = [];
    for (var c = 0; c < numCols; c++) {
      matrix[r][c] = circle(10);
      items.push(matrix[r][c].shift(r*30, c*30));
    }
  }
  addToPrez(new sfig.Overlay(items));  // Faster
  //addToPrez(new sfig.Table(matrix).margin(5));

  // Events
  o = square(50).color('green');
  o.tooltip('this is a circle');
  o.onClick(function() { L('clicked'); });
  o.onMouseover(function() { L('onmouseover'); });
  o.onMouseout(function() { L('onmouseout'); });
  testCase(o);

  // Slides
  testCase(o = slide('Introduction',
    'The function:',
    center('convex'),
    'The derivative:',
    center('positive'),
  _), '<g style=""><g style=""><g style=""><g style=""><g transform="translate(5,5) scale(0.5,0.5)" style=""><g transform="translate(0.5,0.5)" style=""><foreignObject width="1" height="1" style="fill: none; stroke-width: 1px; "><div style="display: inline-block; height: auto; width: auto; float: left; font-family: \'Times New Roman\'; font-size: 28px; color: black; "></div></foreignObject></g></g></g></g><g style=""><g style=""><g transform="translate(795,5) scale(0.5,0.5)" style=""><g transform="translate(-1.5,0.5)" style=""><foreignObject width="1" height="1" style="fill: none; stroke-width: 1px; "><div style="display: inline-block; height: auto; width: auto; float: left; font-family: \'Times New Roman\'; font-size: 28px; color: black; "></div></foreignObject></g></g></g></g><g style=""><g style=""><g transform="translate(5,595) scale(0.5,0.5)" style=""><g transform="translate(0.5,-1.5)" style=""><foreignObject width="1" height="1" style="fill: none; stroke-width: 1px; "><div style="display: inline-block; height: auto; width: auto; float: left; font-family: \'Times New Roman\'; font-size: 28px; color: black; "></div></foreignObject></g></g></g></g><g style=""><g style=""><g transform="translate(795,595) scale(0.5,0.5)" style=""><g transform="translate(-1.5,-1.5)" style=""><foreignObject width="1" height="1" style="fill: none; stroke-width: 1px; "><div style="display: inline-block; height: auto; width: auto; float: left; font-family: \'Times New Roman\'; font-size: 28px; color: black; "></div></foreignObject></g></g></g></g><g style=""><g style=""><g style=""><g transform="translate(0.5,0.5)" style=""><g style=""><g style=""><g style=""><g transform="translate(20,20)" style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><rect width="760" height="52.5" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(380,52.5)" style=""><g style=""><g style=""><g style=""><g transform="translate(-380,-50)" style=""><rect width="760" height="50" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(-104.25,-51.75)" style=""><g transform="scale(1.5,1.5)" style=""><foreignObject width="139" height="34" style="fill: none; stroke-width: 1px; "><div style="display: inline-block; height: auto; width: auto; float: left; font-family: \'Times New Roman\'; font-size: 28px; color: rgb(0, 0, 139); ">Introduction</div></foreignObject></g></g></g></g></g></g></g></g></g></g></g><g transform="translate(0,82.5)" style=""><g style=""><g style=""><g style=""><g style=""><g style=""><rect width="760" height="400" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><rect width="760" height="400" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><g style=""><rect width="760" height="92.5" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(0.5,0.5)" style=""><foreignObject width="152" height="34" style="fill: none; stroke-width: 1px; "><div style="display: inline-block; height: auto; width: auto; float: left; font-family: \'Times New Roman\'; font-size: 28px; color: black; ">The function:</div></foreignObject></g></g></g></g></g></g><g transform="translate(0,102.5)" style=""><g transform="translate(380,0)" style=""><g style=""><g style=""><g style=""><g transform="translate(-380,0)" style=""><rect width="760" height="92.5" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(0,17.5)" style=""><g style=""><g style=""><g style=""><g transform="translate(-41,-17.5)" style=""><rect width="82" height="35" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(-40.5,-17)" style=""><foreignObject width="81" height="34" style="fill: none; stroke-width: 1px; "><div style="display: inline-block; height: auto; width: auto; float: left; font-family: \'Times New Roman\'; font-size: 28px; color: black; ">convex</div></foreignObject></g></g></g></g></g></g></g></g></g></g><g transform="translate(0,205)" style=""><g style=""><g style=""><g style=""><g style=""><g style=""><rect width="760" height="92.5" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(0.5,0.5)" style=""><foreignObject width="170" height="34" style="fill: none; stroke-width: 1px; "><div style="display: inline-block; height: auto; width: auto; float: left; font-family: \'Times New Roman\'; font-size: 28px; color: black; ">The derivative:</div></foreignObject></g></g></g></g></g></g><g transform="translate(0,307.5)" style=""><g transform="translate(380,0)" style=""><g style=""><g style=""><g style=""><g transform="translate(-380,0)" style=""><rect width="760" height="92.5" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(0,17.5)" style=""><g style=""><g style=""><g style=""><g transform="translate(-45.5,-17.5)" style=""><rect width="91" height="35" style="stroke: #000000; fill: none; stroke-width: 0px; "></rect></g></g><g style=""><g transform="translate(-45,-17)" style=""><foreignObject width="90" height="34" style="fill: none; stroke-width: 1px; "><div style="display: inline-block; height: auto; width: auto; float: left; font-family: \'Times New Roman\'; font-size: 28px; color: black; ">positive</div></foreignObject></g></g></g></g></g></g></g></g></g></g></g></g></g></g></g></g></g></g></g></g></g></g></g></g><g style=""><g style=""><rect width="800" height="600" style="stroke: #000000; fill: none; stroke-width: 1px; "></rect></g></g></g></g></g></g></g></g></g>');

  testCase(slide('Introduction',
    'hello', 'good bye',
    ytable('hello', 'good bye').strokeColor('green'),
  _).leftHeader('left header').rightHeader('right header').leftFooter('left footer').rightFooter('right footer'));
}

createSlides();

function onLoad() { prez.run(); }
