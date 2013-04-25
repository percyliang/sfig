#!ruby -Ks
=begin

= image_size.rb
measure image (GIF, PNG, JPEG ,,, etc) size

画像(GIF, PNG, JPEG ,,, etc)のサイズを求める

== Methods:
=== new(image)
receive image & measure size.
argument is image String or IO.

画像を受け取ってサイズを計算。
引数は画像のバイト列かIOのファイルハンドラ。

=== get_type
return type

タイプを返す。

=== get_height
return height size

縦のサイズを返す

=== get_width
return width size

横のサイズを返す

== Class Methods:
=== type
return type list (Array).

判別できる画像タイプのリスト

== How to

=== argument is String
  open("image.gif", "rb") do |fh|
  	img = ImageSize.new(fh.read)
  end

=== argument is IO
  open("image.gif", "rb") do |fh|
  	img = ImageSize.new(fh)
  end

=== Type List
  ImageSize.type
   => ["PCX", "PSD", "XPM", "TIFF", "XBM", "XV", "PGM", "PBM", "PPM", "BMP", "JPEG", "PNG", "GIF", "OTHER"]

=end


class ImageSize
# Image Type Constants
	module Type
		OTHER = "OTHER"
		GIF  = "GIF"
		PNG  = "PNG"
		JPEG = "JPEG"
		BMP  = "BMP"
		PPM  = "PPM" # PPM is like PBM, PGM, & XV
		PBM  = "PBM"
		PGM  = "PGM"
		XV   = "XV"
		XBM  = "XBM"
		TIFF = "TIFF"
		XPM  = "XPM"
		PSD  = "PSD"
		PCX  = "PCX"
	end

	JpegCodeCheck = [
		"\xc0", "\xc1", "\xc2", "\xc3",
		"\xc5", "\xc6", "\xc7",
		"\xc9", "\xca", "\xcb",
		"\xcd", "\xce", "\xcf",
	]

# image type list
	def ImageSize.type
		Type.constants 
	end

# receive image & make size
# argument is image String or IO
	def initialize(img_data)
		@img_data = img_data
		@img_wedth = nil
		@img_height = nil

		if @img_data.is_a?(IO)
			@img_top = @img_data.read(128)
			@img_data.seek(0, 0)
# define Singleton-method definition to IO (byte, offset)
			def @img_data.read_o(length = 1, offset = nil)
				self.seek(offset, 0) if offset
				ret = self.read(length)
				raise "cannot read!!" unless ret
				ret
			end
		elsif @img_data.is_a?(String)
			@img_top = @img_data[0, 128]
# define Singleton-method definition to String (byte, offset)
			def @img_data.read_o(length = 1, offset = nil)
				@img_offset = 0 if !(defined?(@img_offset))
				@img_offset = offset if offset
				ret = self[@img_offset, length]
				@img_offset += length
				ret
			end
		else
			raise "argument class error!! #{img_data.type}"
		end

		@img_type = check_type()

		eval("@img_width, @img_height = measure_" + @img_type + "()") if @img_type != Type::OTHER
	end

# get parameter
	def get_type; @img_type; end
	def get_height; @img_height; end
	def get_width; @img_width; end

	def check_type()
		if @img_top =~ /^GIF8[7,9]a/                      then Type::GIF
		elsif @img_top[0, 8] == "\x89PNG\x0d\x0a\x1a\x0a" then Type::PNG
		elsif @img_top[0, 2] == "\xFF\xD8"                then Type::JPEG
		elsif @img_top[0, 2] == 'BM'                      then Type::BMP
		elsif @img_top =~ /^P[1-7]/                       then Type::PPM
		elsif @img_top =~ /\#define\s+\S+\s+\d+/          then Type::XBM
		elsif @img_top[0, 4] == "MM\x00\x2a"              then Type::TIFF
		elsif @img_top[0, 4] == "II\x2a\x00"              then Type::TIFF
		elsif @img_top =~ /\/\* XPM \*\//                 then Type::XPM
		elsif @img_top[0, 4] == "8BPS"                    then Type::PSD
		elsif @img_top[0] == 10                           then Type::PCX
		else Type::OTHER
		end
	end
	private(:check_type)

	def measure_GIF()
		@img_data.read_o(6)
		@img_data.read_o(4).unpack('SS')
	end
	private(:measure_GIF)

	def measure_PNG()
		@img_data.read_o(12)
		raise unless @img_data.read_o(4) == "IHDR"
		@img_data.read_o(8).unpack('NN')
	end
	private(:measure_PNG)

	def measure_JPEG()
		c_marker = "\xFF"   # Section marker.
		@img_data.read_o(2)
		while(true)
      marker, code, length = @img_data.read_o(4).unpack('aan')
      #marker, code, length = @img_data.read_o(4).unpack('aas') # FIXED
			raise "JPEG marker not found!" if marker != c_marker

			if JpegCodeCheck.include?(code)
        height, width = @img_data.read_o(5).unpack('xnn')
				#height, width = @img_data.read_o(5).unpack('xss') # FIXED
				return([width, height])
			end
			@img_data.read_o(length - 2)
		end
	end
	private(:measure_JPEG)

	def measure_BMP()
		@img_data.read_o(26).unpack("x18VV");
	end
	private(:measure_BMP)

	def measure_PPM()
		header = @img_data.read_o(1024)
		header.gsub!(/^\#.*/m, "")
		header =~ /^(P[1-6])\s+(\d+)\s+(\d+)/m
		width = $2; height = $3
		case $1
			when "P1", "P4" then @img_type = "PBM"
			when "P2", "P5" then @img_type = "PGM"
			when "P3", "P6" then @img_type = "PPM"
			when "P7"
				@img_type = "XV"
				header =~ /IMGINFO:(\d+)x(\d+)/m
				width = $1; height = $2
		end
		[width, height]
	end
	private(:measure_PPM)

	def measure_XBM()
		@img_data.read_o(1024) =~ /^\#define\s*\S*\s*(\d+)\s*\n\#define\s*\S*\s*(\d+)/mi
		[$1, $2]
	end
	private(:measure_XBM)

	def measure_XPM()
		width = height = nil
		while(line = @img_data.read_o(1024))
			if line =~ /"\s*(\d+)\s+(\d+)(\s+\d+\s+\d+){1,2}\s*"/m
				width = $1; height = $2
				break
			end
		end
		[width, height]
	end
	private(:measure_XPM)

	def measure_PSD()
		@img_data.read_o(26).unpack("x14NN")
	end
	private(:measure_PSD)

	def measure_TIFF()
		endian = if (@img_data.read_o(4) =~ /II\x2a\x00/o) then 'v' else 'n' end
# 'v' little-endian   'n' default to big-endian

		packspec = [
			nil,           # nothing (shouldn't happen)
			'C',           # BYTE (8-bit unsigned integer)
			nil,           # ASCII
			endian,        # SHORT (16-bit unsigned integer)
			endian.upcase, # LONG (32-bit unsigned integer)
			nil,           # RATIONAL
			'c',           # SBYTE (8-bit signed integer)
			nil,           # UNDEFINED
			endian,        # SSHORT (16-bit unsigned integer)
			endian.upcase, # SLONG (32-bit unsigned integer)
		]

		offset = @img_data.read_o(4).unpack(endian.upcase)[0] # Get offset to IFD

		ifd = @img_data.read_o(2, offset)
		num_dirent = ifd.unpack(endian)[0]                   # Make it useful
		offset += 2
		num_dirent = offset + (num_dirent * 12);             # Calc. maximum offset of IFD

		ifd = width = height = nil
		while(width.nil? || height.nil?)
			ifd = @img_data.read_o(12, offset)                 # Get first directory entry
			break if (ifd.nil? || (offset > num_dirent))
			offset += 12
			tag = ifd.unpack(endian)[0]                       # ...and decode its tag
			type = ifd[2, 2].unpack(endian)[0]                # ...and the data type

     # Check the type for sanity.
			next if (type > packspec.size + 0) || (packspec[type].nil?)
			if tag == 0x0100                                  # Decode the value
				width = ifd[8, 4].unpack(packspec[type])
			elsif tag == 0x0101                               # Decode the value
				height = ifd[8, 4].unpack(packspec[type])
			end
		end

		raise "#{if width.nil? then 'width not defined.' end} #{if height.nil? then 'height not defined.' end}" if width.nil? || height.nil?
		[width, height]
	end
	private(:measure_TIFF)

	def measure_PCX()
		header = @img_data.read_o(128)
		head_part = header.unpack('C4S4')
		width = head_part[6] - head_part[4] + 1
		height = head_part[7] - head_part[5] + 1
		[width, height]
	end
	private(:measure_PCX)
end


if __FILE__ == $0
	print "TypeList: #{ImageSize.type.inspect}\n"

#	p "http://www.ruby-lang.org/image/title.gif"
#	require "socket"
#	s = TCPSocket.open("www.ruby-lang.org", 80)
#	s.write "GET /image/title.gif HTTP/1.0\n\n"
#	loop { break if s.gets.sub(/(\r|\n)+/, "") == "" }

#	print s.read(6); print s.read(4); exit
#	print s.read; exit

#	io_img = ImageSize.new(s)
#	print <<-EOF
#type:   #{io_img.get_type}
#width:  #{io_img.get_width}
#height: #{io_img.get_height}
#	EOF
#exit

	Dir.glob("//D/shared/photos/*.*").each do |file|
		print "#{file} (string)\n"
		open(file, "rb") do |fh|
			img = ImageSize.new(fh.read)
			print <<-EOF
type:   #{img.get_type}
width:  #{img.get_width}
height: #{img.get_height}
			EOF
		end
	end
end

=begin
== Memo
 c:\usr\local\bin\ruby -v

 d:
 cd D:\Cvs11\minami\scripts\rb\image_size
 c:\usr\local\bin\ruby image_size.rb
=end
