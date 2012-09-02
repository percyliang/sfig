////////////////////////////////////////////////////////////
// RootedTree

(function() {
  // A RootedTreeBranch contains an edge and a child.
  var RootedTreeBranch = sfig.RootedTreeBranch = function(edgeLabel, child) {
    this.edgeLabel = edgeLabel != null ? sfig.std(edgeLabel) : null;
    if (child == null) throw 'No child: '+child;
    this.child = (child instanceof sfig.RootedTree) ? child : sfig.rootedTree(child);
    this.edge = sfig.decoratedLine(false, false); // No arrows, end points set later
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

    var blocks = [];

    // Branches
    this.branches = [];
    var children = [];
    for (var i = 1; i < items.length; i++) {
      var item = items[i];
      if (item instanceof sfig.RootedTreeBranch) {
        // Explicit branch
        var branch = item;
        this.branches.push(branch);
        children.push(branch.child);
      } else if ((item instanceof sfig.Block)) {
        // Convert RootedTree to branch (with empty edge)
        var branch = sfig.rootedTreeBranch(null, item);
        this.branches.push(branch);
        children.push(branch.child);
      } else {
        throw 'Not RootedTreeBranch or Block: '+item;
      }
    }
    if (this.branches.length > 0) {
      this.branchesBlock = sfig.table(children).xmargin(this.xmargin());
      blocks.push(this.branchesBlock);
    }

    // Head
    this.head = items[0];
    if (!(this.head instanceof sfig.Block)) throw 'Head must be Block, but got: '+this.head;

    // Place in the middle between first and the last children heads
    this.headBox = frame(this.head).bg.round(this.nodeRound()).end;
    this.headBox.setEnd(this);
    this.headBox.padding(this.nodePadding()).strokeWidth(this.nodeBorderWidth());
    if (this.branches.length > 0) {
      var a = this.branches[0].child.headBox;
      var b = this.branches[this.branches.length-1].child.headBox;
      var x = a.xmiddle().add(b.xmiddle()).div(2);
      var y = this.branchesBlock.top().sub(this.ymargin());
      this.headBox = transform(this.headBox).pivot(0, +1).shift(x, y);
    }
    blocks.push(this.headBox);

    // Connect head with branch heads
    for (var i = 0; i < this.branches.length; i++) {
      var b = this.branches[i];

      //b.edge.level(b.child.showLevel(), b.child.hideLevel()); // XXX: doesn't work
      //Z = b.child.showLevel();

      blocks.push(b.edge);

      // Draw label on edge
      if (b.edgeLabel != null) {
        var edgeLabel = sfig.transform(b.edgeLabel).center();
        edgeLabel.shift(b.edge.xmiddle(), b.edge.ymiddle());
        blocks.push(edgeLabel);
      }

      // Edges meeting at the bottom middle of headBox
      var v = this.verticalCenterEdges();
      b.edge.line.p1(v.cond(this.headBox.xmiddle(), null), v.cond(this.headBox.bottom(), null));
      b.edge.line.p2(v.cond(b.child.headBox.xmiddle(), null), v.cond(b.child.headBox.top(), null));

      // Edges meeting at the center of headBox
      b.edge.line.b1(v.cond(null, this.headBox));
      b.edge.line.b2(v.cond(null, b.child.headBox));
    }

    this.addChild(new sfig.Overlay(blocks));
  };
  sfig_.inheritsFrom('RootedTree', RootedTree, sfig.Block);

  sfig_.addPairProperty(RootedTree, 'margin', 'xmargin', 'ymargin', 30, 30, 'Amount of space between siblings and parent/child.');
  sfig_.addProperty(RootedTree, 'nodePadding', 3, 'Amount of space inside a node');
  sfig_.addProperty(RootedTree, 'nodeBorderWidth', 1, 'How thick to make node');
  sfig_.addProperty(RootedTree, 'nodeRound', 5, 'How rounded?');
  sfig_.addProperty(RootedTree, 'verticalCenterEdges', null, 'For drawing parse trees, have edges converge');

  sfig.rootedTree = function() { return new RootedTree(arguments); }
})();
