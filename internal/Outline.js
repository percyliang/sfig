// Create an outline with section name |section|.
// Throughout the presentation, add sections.
// Note that the slide returned has a Thunk evaluated after all the slides are
// created (so we know what all the sections are).
// Usage:
//   var outline = new sfig.Outline();
//   prez.addSlide(outline.createSlide('Introduction'));
//   outline.indent();
//   prez.addSlide(outline.createSlide('Motivation'));
//   prez.addSlide(outline.createSlide('Related work'));
//   outline.unindent();
//   ...
(function() {
  var Outline = sfig.Outline = function(name) {
    this.name = name || 'Outline';
    this.sections = [null];  // A tree of sections
    this.stack = [this.sections];
  }
  Outline.sectionToId = function(section) { return section.replace(/[^\w]/g, '_'); }
  Outline.prototype.getBlock = function(options) {
    function create(item) {
      if (typeof(item) == 'string') {
        var display;
        if (options.highlightSection == item)
          display = item.fontcolor('red').bold();
        else if (options.dimSections)
          display = item.fontcolor('gray');
        else
          display = item;
        if (sfig.serverSide)
          return display;
        var div = sfig_.newElem('div');
        div.innerHTML = display;
        return sfig.divLinkToInternal(div, prez, Outline.sectionToId(item), 0);
      } else if (item instanceof Array) {
        return item.map(create);
      } else if (item == null) {
        return null;
      } else {
        throw 'Invalid: '+item;
      }
    }
    var self = this;
    return bulletedText(sfig.tfunc(null, function() { return create(self.sections); }, []));
  }
  Outline.prototype.currNode = function() { return this.stack[this.stack.length-1]; }
  Outline.prototype.indent = function() {
    this.stack.push(this.currNode()[this.currNode().length-1]);
  }
  Outline.prototype.unindent = function() {
    this.stack.pop();
  }
  Outline.prototype.createSlide = function(section) {
    this.currNode().push([section]);
    var s = sfig.slide(this.name, this.getBlock({highlightSection: section, dimSections: true}));
    if (!s.id().exists()) s.id(Outline.sectionToId(section));
    return s;
  }
})();
