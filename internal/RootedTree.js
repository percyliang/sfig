////////////////////////////////////////////////////////////
// RootedTree: for drawing parse trees.

(function() {
  // A RootedTreeBranch contains an edge and a child.
  var RootedTreeBranch = sfig.RootedTreeBranch = function(edgeLabel, child) {
    this.edgeLabel = edgeLabel != null ? sfig.std(edgeLabel) : null;
    if (child == null) sfig.throwException('No child: '+child);
    this.child = (child instanceof sfig.RootedTree) ? child : sfig.rootedTree(child);
    this.edge = new sfig.DecoratedLine(); // No arrows, end points set later
    this.edge.setEnd(this);
  }
  sfig_.inheritsFrom('RootedTreeBranch', RootedTreeBranch, sfig.AuxiliaryInfo);

  sfig.rootedTreeBranch = function(edgeLabel, child) { return new RootedTreeBranch(edgeLabel, child); }

  // In a rooted tree, each node has a label, and edges with labels to children.
  //   node, nodeBox
  //   edgeLabel, edge (same level as parent)
  // Nodes are referenced by a pivot nodeLabel.
  // Input: items = [head, branch_1, ..., branch_n]
  var RootedTree = sfig.RootedTree = function(items) {
    RootedTree.prototype.constructor.call(this);
    items = sfig.std(items);

    // Branches
    var children = [];  // Children trees
    this.branches = [];  // Branches include information about child trees and edge labels
    for (var i = 1; i < items.length; i++) {
      var item = items[i];
      if (item instanceof sfig.RootedTreeBranch) {
        // Explicit branch
        var branch = item;
        this.branches.push(branch);
        children.push(branch.child);
      } else if (item instanceof sfig.Block) {
        // Convert RootedTree to branch (with empty edge label)
        var branch = sfig.rootedTreeBranch(null, item);
        this.branches.push(branch);
        children.push(branch.child);
      } else if (item instanceof sfig.PropertyChanger) {
        children.push(item);
      } else {
        sfig.throwException('Not RootedTreeBranch or Block: '+item);
      }
    }
    if (this.branches.length > 0)
      this.childrenBlock = sfig.table(children).xmargin(this.xmargin());
    else if (children.length != 0)
      sfig.throwException('Can\'t have children without actual branches');

    // Head
    this.head = items[0];
    if (!(this.head instanceof sfig.Block)) sfig.throwException('Head must be Block, but got: '+this.head);

    // Center the head in the middle between center of the first and the last children heads
    this.headBox = frame(this.head).bg.round(this.nodeRound()).end.atomicMouseShowHide(true);
    this.headBox.bg.level(this.head.showLevel(), this.head.hideLevel());
    this.headBox.setEnd(this);
    this.headBox.padding(this.nodePadding());
    this.headBox.bg.strokeWidth(this.nodeBorderWidth());
    this.headBox = transform(this.headBox);
    if (this.branches.length > 0) {
      var a = this.branches[0].child.headBox;
      var b = this.branches[this.branches.length-1].child.headBox;
      var x = a.xmiddle().add(b.xmiddle()).div(2);
      var y = this.childrenBlock.top().up(this.ymargin());
      this.headBox.pivot(0, +1).shift(x, y);
    }
  };
  sfig_.inheritsFrom('RootedTree', RootedTree, sfig.Block);

  RootedTree.prototype.createChildren = function() {
    // Need to render children trees first to know where to place head and edges.
    if (this.childrenBlock != null)
      this.addInitDependency(this.childrenBlock);

    // Head
    this.addChild(this.headBox);

    // Children
    if (this.childrenBlock != null)
      this.addChild(this.childrenBlock);

    // Connect head to children
    for (var i = 0; i < this.branches.length; i++) {
      var b = this.branches[i];

      // Edge
      b.edge.mimic(b.child.head);
      if (this.verticalCenterEdges().get()) {
        // Edges meeting at the bottom middle of headBox
        b.edge.line.p1(this.headBox.xmiddle(), this.headBox.bottom());
        b.edge.line.p2(b.child.headBox.xmiddle(), b.child.headBox.top());
      } else {
        // Edges meeting at the center of headBox
        b.edge.line.b1(this.headBox);
        b.edge.line.b2(b.child.headBox);
      }
      b.edge.drawArrow1(this.drawArrow1()).drawArrow2(this.drawArrow2());
      b.edge.strokeWidth(this.edgeStrokeWidth());
      this.addChild(b.edge.atomicMouseShowHide(true));

      // Edge label
      if (b.edgeLabel != null) {
        var edgeLabel = sfig.center(b.edgeLabel).shift(b.edge.xmiddle(), b.edge.ymiddle()).atomicMouseShowHide(true);
        edgeLabel.mimic(b.child.head);
        this.addChild(edgeLabel);
      }
    }
    
    if (this.tail().get() != null) this.addChild(this.tail().get());
  };

  sfig_.addPairProperty(RootedTree, 'margin', 'xmargin', 'ymargin', 30, 30, 'Amount of space between siblings and parent/child.');
  sfig_.addProperty(RootedTree, 'nodePadding', 3, 'Amount of space inside a node');
  sfig_.addProperty(RootedTree, 'nodeBorderWidth', 1, 'How thick to make node');
  sfig_.addProperty(RootedTree, 'nodeRound', 5, 'How rounded are the nodes?');
  sfig_.addProperty(RootedTree, 'edgeStrokeWidth', 1, 'How thick to make the edges');
  sfig_.addPairProperty(RootedTree, 'drawArrow', 'drawArrow1', 'drawArrow2', null, null, 'Are the edges directed (up, down)?');
  sfig_.addProperty(RootedTree, 'verticalCenterEdges', null, 'For drawing parse trees, have edges converge');
  sfig_.addProperty(RootedTree, 'tail', null, 'Draw this after everything');

  RootedTree.prototype.bareHead = function() {
    this.nodePadding(0);
    this.nodeBorderWidth(0);
    var frame = this.headBox.content;
    // Make the frame bg and title orphaned so arrows can connect directly to the head
    // TODO: this is hacky because it relies on the internal structure of a frame
    frame.overlay.items[0].orphan(true);
    return this;
  }
  RootedTree.prototype.recbareHead = function() {
    this.bareHead();
    for (var i = 0; i < this.branches.length; i++)
      this.branches[i].child.bareHead();
    return this;
  }

  // Add ways to recursively set properties for all descendants.
  function addRecursiveProperty(recursiveName, name) {
    RootedTree.prototype[recursiveName] = function() {
      this[name].apply(this, arguments);
      for (var i = 0; i < this.branches.length; i++) {
        var child = this.branches[i].child;
        child[recursiveName].apply(child, arguments);
      }
      return this;
    }
  }
  ['margin', 'xmargin', 'ymargin', 'nodePadding', 'nodeBorderWidth', 'nodeRound', 'drawArrow', 'drawArrow1', 'drawArrow2', 'verticalCenterEdges'].forEach(function(name) {
    addRecursiveProperty('rec'+name, name);
  });

  sfig.rootedTree = function() { return new RootedTree(arguments); }
})();
