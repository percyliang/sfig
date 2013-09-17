sfig
====

SVG/Javascript-based library for creating presentations/figures.

To get an overview of the functionality and try sfig out interactively, point
your web browser to:

    http://cs.stanford.edu/~pliang/sfig/examples/tutorial.html

After you've downloaded sfig, create a presentation by typing:

    ./create-presentation <name of presentation>

This creates a new directory with two important files:

    index.html # Point your browser here to view the presentation
    index.js   # Edit your presentation here

To generate a PDF, make sure you have node.js installed and type:

    node index.js  # Outputs index.pdf

You can optionally download third-party libraries (e.g., get a local copy of
MathJax for rendering math offline) by typing:

    ./download-packages

When you're going to give a presentation:
* Type 'shift-f' to toggle between full screen mode.
* Type 'shift-r' to pre-render all the slides.

Currently, sfig has been tested with Chrome 21 and Firefox 15 on Linux and both
work, although the math and animations work much better in Firefox due to a bug
in Chrome (Webkit, specifically).

In Firefox, to load MathJax fonts properly from local disk, go to about:config
and set security.fileuri.strict\_origin\_policy to false.

------------------------------------------------------------
(C) Copyright 2012-2013, Percy Liang

http://cs.stanford.edu/~pliang

Permission is granted for anyone to copy, use, or modify these programs and
accompanying documents for purposes of research or education, provided this
copyright notice is retained, and note is made of any changes that have been
made.

These programs and documents are distributed without any warranty, express or
implied.  As the programs were written for research purposes only, they have
not been tested to the degree that would be advisable in any important
application.  All use of these programs is entirely at the user's own risk.
