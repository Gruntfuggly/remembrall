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

function log( text )
{
    if( generalOutputChannel )
    {
        generalOutputChannel.appendLine( new Date().toLocaleTimeString() + " " + text );
    }
    else
    {
        console.log( text );
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

                log( "Sync at " + now.toISOString() );

                if( state.get( 'lastSync' ) === undefined || data.rememberallSync.lastSync > state.get( 'lastSync' ) )
                {
                    state.update( 'rememberall.items', data.rememberallSync.mutedServers );
                    state.update( 'lastSync', data.rememberallSync.lastSync );
                }

                if( callback )
                {
                    callback();
                }

                processQueue();
            } ).catch( function( error )
            {
                console.error( "sync failed:" + error );

                if( callback )
                {
                    callback();
                }

                processQueue();
            } );
        }
        else
        {
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
            log( "Reading from gist " + gistId );

            gistore.setId( gistId );

            sync();
        }
        else
        {
            log( "Creating new gist..." );

            gistore.createBackUp( 'rememberallSync',
                {
                    rememberallSync: {
                        items: state.get( 'rememberall.items' ),
                        lastSync: new Date()
                    }
                } )
                .then( function( id )
                {
                    log( "New gist " + id );
                    vscode.workspace.getConfiguration( 'rememberall' ).update( 'syncGistId', id, true );
                } );
        }
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

            log( "Starting backup at " + now.toISOString() );

            gistore.backUp( {
                rememberallSync: {
                    items: state.get( 'rememberall.items' ),
                    lastSync: now
                }
            } ).then( function()
            {
                log( "Backup at " + now.toISOString() );
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
        log( "not active" );
    }
}

function triggerBackup()
{
    if( vscode.workspace.getConfiguration( 'rememberall' ).get( 'syncEnabled' ) === true )
    {
        log( "Backing up in 1 second..." );
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
                lastSync: now
            }
        } ).then( function()
        {
            log( "Reset sync at " + now.toISOString() );
            sync();
        } ).catch( function( error )
        {
            log( "reset failed: " + error );
            console.error( "reset failed: " + error );
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
