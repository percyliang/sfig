sfig
====

SVG/Javascript-based library for creating presentations/figures.

To get an overview of the functionality, point your web browser to:

    http://cs.stanford.edu/~pliang/sfig/examples/tutorial.html

sfig works by itself, but you can readily incorporate third-party libraries.
For example, sfig uses MathJax to render math.  To download these packages,
type:

    ./download-packages

If you want to create a presentation, type

    ./create-presentation <name of presentation>

Notes:
* Type 'shift-f' to toggle between full screen mode.
* Before you give a presentation, type 'shift-r' to pre-render all the slides.

Currently, sfig has been tested with Chrome 21 and Firefox 15 on Linux and both
work, although the math and animations work much better in Firefox due to a bug
in Chrome (Webkit, specifically).

In Firefox, to load MathJax fonts properly from local disk, go to about:config
and set security.fileuri.strict\_origin\_policy to false.

------------------------------------------------------------
(C) Copyright 2012, Percy Liang

http://cs.stanford.edu/~pliang

Permission is granted for anyone to copy, use, or modify these programs and
accompanying documents for purposes of research or education, provided this
copyright notice is retained, and note is made of any changes that have been
made.

These programs and documents are distributed without any warranty, express or
implied.  As the programs were written for research purposes only, they have
not been tested to the degree that would be advisable in any important
application.  All use of these programs is entirely at the user's own risk.
