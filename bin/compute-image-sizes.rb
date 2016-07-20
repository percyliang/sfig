#!/usr/bin/ruby

require File.dirname(File.absolute_path($0)) + '/fastimage'
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

def convert_type(s)
  return s.to_s.upcase
end

def recurse(path)
  if File.directory?(path)
    Dir[path+'/*'].each { |subpath| recurse(subpath) }
  elsif path =~ /\.(jpe?g|png|gif)$/
    info = {}
    info['width'], info['height'] = FastImage.size(path)
    info['type'] = convert_type(FastImage.type(path))
    puts path + ': ' + info.inspect

    out = open(path+'.info', 'w')
    out.puts info.to_json
    out.close
  end
end

path = ARGV.shift
recurse(path)
