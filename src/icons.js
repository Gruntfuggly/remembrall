var fs = require( 'fs' );
var path = require( 'path' );
var octicons = require( 'octicons' );

var validColours = [
    'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black',
    'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse', 'chocolate',
    'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan', 'darkgoldenrod',
    'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki', 'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid',
    'darkred', 'darksalmon', 'darkseagreen', 'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet',
    'deeppink', 'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen',
    'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'grey', 'green',
    'greenyellow', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender',
    'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan', 'lightgoldenrodyellow', 'lightgray',
    'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey',
    'lightsteelblue', 'lightyellow', 'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine',
    'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue', 'mediumspringgreen', 'mediumturquoise', 'mediumvioletred',
    'midnightblue', 'mintcream', 'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive',
    'olivedrab', 'orange', 'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred',
    'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'red',
    'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell', 'sienna',
    'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow', 'springgreen', 'steelblue',
    'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white',
    'whitesmoke', 'yellow', 'yellowgreen'
];

function getIcon( context, name, colour )
{
    var darkIconPath;
    var lightIconPath;
    var colourIconPath;

    if( name && octicons[ name ] )
    {
        if( context.globalStoragePath )
        {
            if( !fs.existsSync( context.globalStoragePath ) )
            {
                fs.mkdirSync( context.globalStoragePath );
            }

            if( colour && validColours.indexOf( colour ) !== -1 )
            {
                colourIconPath = path.join( context.globalStoragePath, name + "-" + colour + ".svg" );
                if( !fs.existsSync( colourIconPath ) )
                {
                    var darkIcon = "<?xml version=\"1.0\" encoding=\"iso-8859-1\"?>\n" +
                        octicons[ name ].toSVG( { "xmlns": "http://www.w3.org/2000/svg", "fill": colour } );
                    fs.writeFileSync( colourIconPath, darkIcon );
                }

                darkIconPath = colourIconPath;
                lightIconPath = colourIconPath;
            }
            else
            {
                darkIconPath = path.join( context.globalStoragePath, name + "-dark.svg" );
                if( !fs.existsSync( darkIconPath ) )
                {
                    var darkIcon = "<?xml version=\"1.0\" encoding=\"iso-8859-1\"?>\n" +
                        octicons[ name ].toSVG( { "xmlns": "http://www.w3.org/2000/svg", "fill": "#C5C5C5" } );
                    fs.writeFileSync( darkIconPath, darkIcon );
                }

                lightIconPath = path.join( context.globalStoragePath, name + "-light.svg" );
                if( !fs.existsSync( lightIconPath ) )
                {
                    var lightIcon = "<?xml version=\"1.0\" encoding=\"iso-8859-1\"?>\n" +
                        octicons[ name ].toSVG( { "xmlns": "http://www.w3.org/2000/svg", "fill": "424242" } );

                    fs.writeFileSync( lightIconPath, lightIcon );
                }
            }
        }
    }
    else
    {
        if( colour && validColours.indexOf( colour ) !== -1 )
        {
            colourIconPath = path.join( context.globalStoragePath, "remembrall-" + colour + ".svg" );

            if( !fs.existsSync( colourIconPath ) )
            {
                var svgPath = path.join( context.extensionPath, "resources/icons", "dark", "remembrall.svg" );
                var svgData = fs.readFileSync( svgPath, 'utf8' );
                var colourRegex = new RegExp( /"#C5C5C5"/, 'g' );
                svgData = svgData.replace( colourRegex, "\"" + colour + "\"" );
                fs.writeFileSync( colourIconPath, svgData );
            }

            darkIconPath = colourIconPath;
            lightIconPath = colourIconPath;
        }
        else
        {
            darkIconPath = context.asAbsolutePath( path.join( "resources/icons", "dark", "remembrall.svg" ) );
            lightIconPath = context.asAbsolutePath( path.join( "resources/icons", "light", "remembrall.svg" ) );
        }
    }

    return {
        dark: darkIconPath,
        light: lightIconPath
    };
}

module.exports.getIcon = getIcon;
module.exports.validColours = validColours;