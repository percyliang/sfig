#!/usr/bin/env python

import sys
import struct
import imghdr
import json

def get_image_size(fname):
    # https://stackoverflow.com/questions/8032642/how-to-obtain-image-size-using-standard-python-class-without-using-external-lib
    '''Determine the image type of fhandle and return its size.
    from draco'''
    with open(fname, 'rb') as fhandle:
        head = fhandle.read(24)
        if len(head) != 24:
            raise Exception("Invalid header")
        if imghdr.what(fname) == 'png':
            check = struct.unpack('>i', head[4:8])[0]
            if check != 0x0d0a1a0a:
                raise Exception("png checksum failed")
            width, height = struct.unpack('>ii', head[16:24])
        elif imghdr.what(fname) == 'gif':
            width, height = struct.unpack('<HH', head[6:10])
        elif imghdr.what(fname) == 'jpeg':
            fhandle.seek(0) # Read 0xff next
            size = 2
            ftype = 0
            while not 0xc0 <= ftype <= 0xcf:
                fhandle.seek(size, 1)
                byte = fhandle.read(1)
                while ord(byte) == 0xff:
                    byte = fhandle.read(1)
                ftype = ord(byte)
                size = struct.unpack('>H', fhandle.read(2))[0] - 2
            # We are at a SOFn block
            fhandle.seek(1, 1)  # Skip `precision' byte.
            height, width = struct.unpack('>HH', fhandle.read(4))
        else:
            raise Exception("Invalid handle")
        return width, height, imghdr.what(fname)

if len(sys.argv) == 1:
    print """Usage:

    ./convert-image-sizes.py <path>

For all the image files in <path>, create a file <path>.info that contains its metadata
(height and width)."""
    sys.exit(1)

for fname in sys.argv[1:]:
    width, height, type = get_image_size(fname)
    info = {'width': width, 'height': height, 'type': type.upper()}
    with open(fname + '.info', 'w') as f:
        print >>f, json.dumps(info)
