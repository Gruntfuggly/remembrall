var vscode = require( 'vscode' );
var gistore = require( 'gistore' );

var generalOutputChannel;
var active = false;
var state;
var backupTimer;
var queue = [];

function initialize( globalState, outputChannel )
{
    state = globalState;
    generalOutputChannel = outputChannel;

    initializeSync();
}

function setOutputChannel( outputChannel )
{
    generalOutputChannel = outputChannel;
}

function debug( text )
{
    if( generalOutputChannel )
    {
        generalOutputChannel.appendLine( new Date().toLocaleTimeString( vscode.env.language, { hour12: false } ) + " " + text );
    }
    else
    {
        console.log( text );
    }
}

function cleanNodes( nodes )
{
    return nodes.map( function( node )
    {
        var cleaned = {
            label: node.label,
            icon: node.icon,
            uniqueId: node.uniqueId,
            nodes: [],
        };
        if( node.nodes && node.nodes.length > 0 )
        {
            cleaned.nodes = cleanNodes( node.nodes );
        }
        return cleaned;
    } );
}

function initializeSync()
{
    var enabled = vscode.workspace.getConfiguration( 'rememberall' ).get( 'syncEnabled', undefined );
    var token = vscode.workspace.getConfiguration( 'rememberall' ).get( 'syncToken', undefined );
    var gistId = vscode.workspace.getConfiguration( 'rememberall' ).get( 'syncGistId', undefined );

    if( enabled === true && token )
    {
        gistore.setToken( token );

        if( gistId )
        {
            debug( "Reading from gist " + gistId );

            gistore.setId( gistId );
        }
        else
        {
            debug( "Creating new gist..." );

            gistore.createBackUp( 'rememberallSync',
                {
                    rememberallSync: {
                        items: cleanNodes( state.get( 'rememberall.items' ) || [] ),
                        nodeCounter: state.get( 'rememberall.nodeCounter' ),
                        lastSync: new Date()
                    }
                } )
                .then( function( id )
                {
                    debug( "New gist " + id );
                    vscode.workspace.getConfiguration( 'rememberall' ).update( 'syncGistId', id, true );
                } );
        }
    }
}

var enqueue = function( fn, context, params )
{
    return function()
    {
        fn.apply( context, params );
    };
};

function processQueue()
{
    if( queue.length > 0 )
    {
        ( queue.shift() )();
    }
}

function sync( callback )
{
    function doSync( callback )
    {
        if( gistore.token )
        {
            gistore.sync().then( function( data )
            {
                var now = new Date();

                debug( "Sync at " + now.toISOString() );

                if( state.get( 'rememberall.lastSync' ) === undefined || data.rememberallSync.lastSync > state.get( 'rememberall.lastSync' ) )
                {
                    state.update( 'rememberall.items', data.rememberallSync.items );
                    state.update( 'rememberall.nodeCounter', data.rememberallSync.nodeCounter );
                    state.update( 'rememberall.lastSync', data.rememberallSync.lastSync );
                }

                if( callback )
                {
                    callback();
                }

                processQueue();
            } ).catch( function( error )
            {
                if( vscode.workspace.getConfiguration( 'rememberall' ).get( 'syncToken' ) )
                {
                    debug( "sync failed:" + error );
                }

                if( callback )
                {
                    callback();
                }

                processQueue();
            } );
        }
        else
        {
            debug( "No sync token defined" );

            if( callback )
            {
                callback();
            }
            processQueue();
        }
    }

    if( vscode.workspace.getConfiguration( 'rememberall' ).get( 'syncEnabled' ) === true )
    {
        queue.push( enqueue( doSync, this, [ callback ] ) );

        processQueue();
    }
    else
    {
        callback();
    }
}

function setActive( isActive )
{
    if( isActive === false )
    {
        backup();
    }
    active = isActive;
}

function backup()
{
    function doBackup()
    {
        if( gistore.token )
        {
            var now = new Date();

            debug( "Starting backup at " + now.toISOString() );

            gistore.backUp( {
                rememberallSync: {
                    items: cleanNodes( state.get( 'rememberall.items' ) || [] ),
                    nodeCounter: state.get( 'rememberall.nodeCounter' ),
                    lastSync: now
                }
            } ).then( function()
            {
                debug( "Backup at " + now.toISOString() );
                processQueue();
            } ).catch( function( error )
            {
                console.error( "backup failed: " + error );
                triggerBackup();
                processQueue();
            } );
        }
        else
        {
            processQueue();
        }
    }

    if( active )
    {
        queue.push( enqueue( doBackup, this, [] ) );

        processQueue();
    }
    else
    {
        debug( "Not active" );
    }
}

function triggerBackup()
{
    if( vscode.workspace.getConfiguration( 'rememberall' ).get( 'syncEnabled' ) === true )
    {
        debug( "Backing up in 1 second..." );
        clearTimeout( backupTimer );
        backupTimer = setTimeout( backup, 1000 );
    }
}

function resetSync()
{
    if( gistore.token )
    {
        var now = new Date();
        gistore.backUp( {
            rememberallSync: {
                items: [],
                nodeCounter: 1,
                lastSync: now
            }
        } ).then( function()
        {
            debug( "Reset sync at " + now.toISOString() );
            sync();
        } ).catch( function( error )
        {
            debug( "Reset failed: " + error );
        } );
    }
}

module.exports.initialize = initialize;
module.exports.setOutputChannel = setOutputChannel;
module.exports.setActive = setActive;
module.exports.initializeSync = initializeSync;
module.exports.sync = sync;
module.exports.resetSync = resetSync;
module.exports.triggerBackup = triggerBackup;
