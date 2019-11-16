var vscode = require( 'vscode' );
var gistore = require( 'gistore' );
// var utils = require( './utils' );

var active = false;
var state;
var backupTimer;
var queue = [];

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

                utils.log( "Sync at " + now.toISOString() );

                if( state.get( 'lastSync' ) === undefined || data.discordSync.lastSync > state.get( 'lastSync' ) )
                {
                    state.update( 'mutedServers', data.discordSync.mutedServers );
                    state.update( 'mutedChannels', data.discordSync.mutedChannels );
                    state.update( 'lastRead', data.discordSync.lastRead );
                    state.update( 'lastSync', data.discordSync.lastSync );
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
            callback();
            processQueue();
        }
    }

    if( vscode.workspace.getConfiguration( 'discord-chat' ).get( 'syncEnabled' ) === true )
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
    var enabled = vscode.workspace.getConfiguration( 'discord-chat' ).get( 'syncEnabled', undefined );
    var token = vscode.workspace.getConfiguration( 'discord-chat' ).get( 'syncToken', undefined );
    var gistId = vscode.workspace.getConfiguration( 'discord-chat' ).get( 'syncGistId', undefined );

    if( enabled === true && token )
    {
        gistore.setToken( token );

        if( gistId )
        {
            gistore.setId( gistId );

            sync();
        }
        else
        {
            gistore.createBackUp( 'discordSync',
                {
                    discordSync: {
                        mutedServers: state.get( 'mutedServers' ),
                        mutedChannels: state.get( 'mutedChannels' ),
                        lastRead: state.get( 'lastRead' ),
                        lastSync: new Date()
                    }
                } )
                .then( function( id )
                {
                    vscode.workspace.getConfiguration( 'discord-chat' ).update( 'syncGistId', id, true );
                } );
        }
    }
}

function initialize( workspaceState )
{
    state = workspaceState;

    initializeSync();
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

            utils.log( "Starting backup at " + now.toISOString() );

            gistore.backUp( {
                discordSync: {
                    mutedServers: state.get( 'mutedServers' ),
                    mutedChannels: state.get( 'mutedChannels' ),
                    lastRead: state.get( 'lastRead' ),
                    lastSync: now
                }
            } ).then( function()
            {
                utils.log( "Backup at " + now.toISOString() );
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
        utils.log( "not active" );
    }
}

function triggerBackup()
{
    if( vscode.workspace.getConfiguration( 'discord-chat' ).get( 'syncEnabled' ) === true )
    {
        utils.log( "Backing up in 1 second..." );
        clearTimeout( backupTimer );
        backupTimer = setTimeout( backup, 1000 );
    }
}

function setServerMuted( server, muted )
{
    var mutedServers = state.get( 'mutedServers' );
    mutedServers[ server.id.toString() ] = muted;
    state.update( 'mutedServers', mutedServers );
    triggerBackup();
    utils.log( "Server " + server.name + ( muted ? " muted" : " unmuted" ) );
}

function getServerMuted( server )
{
    return server && server.id && state.get( 'mutedServers' )[ server.id.toString() ];
}

function resetSync()
{
    if( gistore.token )
    {
        var now = new Date();
        gistore.backUp( {
            discordSync: {
                mutedServers: {},
                mutedChannels: {},
                lastRead: {},
                lastSync: now
            }
        } ).then( function()
        {
            utils.log( "Reset sync at " + now.toISOString() );
            sync();
        } ).catch( function( error )
        {
            utils.log( "reset failed: " + error );
            console.error( "reset failed: " + error );
        } );
    }
}

module.exports.initialize = initialize;
module.exports.setActive = setActive;

module.exports.initializeSync = initializeSync;
module.exports.sync = sync;
module.exports.resetSync = resetSync;
