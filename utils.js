function compareVersions( a, b )
{
    var i, diff;
    var regExStrip0 = /(\.0+)+$/;
    var segmentsA = a.replace( regExStrip0, '' ).split( '.' );
    var segmentsB = b.replace( regExStrip0, '' ).split( '.' );
    var l = Math.min( segmentsA.length, segmentsB.length );

    for( i = 0; i < l; i++ )
    {
        diff = parseInt( segmentsA[ i ], 10 ) - parseInt( segmentsB[ i ], 10 );
        if( diff )
        {
            return diff;
        }
    }
    return segmentsA.length - segmentsB.length;
}

function cleanNodes( nodes )
{
    return nodes.map( function( node )
    {
        var cleaned = {
            label: node.label,
            icon: node.icon,
            uniqueId: node.uniqueId,
            done: node.done,
            nodes: [],
        };
        if( node.nodes && node.nodes.length > 0 )
        {
            cleaned.nodes = cleanNodes( node.nodes );
        }
        return cleaned;
    } );
}

function uuidv4()
{
    // https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript/2117523#2117523
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, function( c )
    {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : ( r & 0x3 | 0x8 );
        return v.toString( 16 );
    } );
}

module.exports.compareVersions = compareVersions;
module.exports.cleanNodes = cleanNodes;
module.exports.uuidv4 = uuidv4;