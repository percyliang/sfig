#!/usr/bin/ruby

require File.dirname($0) + '/image_size'
require 'json'

if ARGV.size == 0
  puts <<EOF
Usage:
 ./convert-image-sizes.rb <path>
For all the image files in <path>, create a file <path>.info that contains its metadata
(height and width).
EOF
  exit 1
end

def recurse(path)
  if File.directory?(path)
    Dir[path+'/*'].each { |subpath| recurse(subpath) }
  elsif path =~ /\.(jpe?g|png|gif)$/
    img = ImageSize.new(open(path))
    info = {}
    info['type'] = img.get_type
    info['width'] = img.get_width
    info['height'] = img.get_height
    puts path + ': ' + info.inspect

    out = open(path+'.info', 'w')
    out.puts info.to_json
    out.close
  end
end

path = ARGV.shift
recurse(path)
