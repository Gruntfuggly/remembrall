
#! /bin/bash

convert $1 -size 16x16 xc:none -fill red -draw "roundrectangle 0,0,15,15,1,1" -compose SrcIn -composite $1.mask.png
convert $1 -background "#ffffff" -flatten $1.tmp
convert $1.tmp -matte $1.mask.png -compose DstIn -composite $1

rm $1.tmp
rm $1.mask.png
