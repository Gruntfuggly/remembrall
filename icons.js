var fs = require( 'fs' );
var path = require( 'path' );
var octicons = require( 'octicons' );

function getIcon( context, name )
{
    var icon = {
        dark: context.asAbsolutePath( path.join( "resources/icons", "dark", "remembrall.svg" ) ),
        light: context.asAbsolutePath( path.join( "resources/icons", "light", "remembrall.svg" ) )
    };

    if( name && octicons[ name ] )
    {
        if( context.globalStoragePath )
        {
            if( !fs.existsSync( context.globalStoragePath ) )
            {
                fs.mkdirSync( context.globalStoragePath );
            }

            var darkIconPath = path.join( context.globalStoragePath, name + "-dark.svg" );
            if( !fs.existsSync( darkIconPath ) )
            {
                var darkIcon = "<?xml version=\"1.0\" encoding=\"iso-8859-1\"?>\n" +
                    octicons[ name ].toSVG( { "xmlns": "http://www.w3.org/2000/svg", "fill": "#C5C5C5" } );
                fs.writeFileSync( darkIconPath, darkIcon );
            }

            var lightIconPath = path.join( context.globalStoragePath, name + "-light.svg" );
            if( !fs.existsSync( lightIconPath ) )
            {
                var lightIcon = "<?xml version=\"1.0\" encoding=\"iso-8859-1\"?>\n" +
                    octicons[ name ].toSVG( { "xmlns": "http://www.w3.org/2000/svg", "fill": "424242" } );

                fs.writeFileSync( lightIconPath, lightIcon );
            }

            icon = { dark: darkIconPath, light: lightIconPath };
        }
    }

    return icon;
}

module.exports.getIcon = getIcon;