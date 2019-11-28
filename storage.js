var vscode = require( 'vscode' );
var gistore = require( 'gistore' );

var generalOutputChannel;
var active = false;
var state;
var lastBackup = new Date();
var backupTimer;
var queue = [];
var version;

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

function initialize( globalState, currentVersion )
{
    state = globalState;

    initializeSync( currentVersion );
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

function initializeSync( currentVersion, callback )
{
    version = currentVersion;

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

            if( callback )
            {
                callback();
            }
        }
        else
        {
            debug( "Creating new gist..." );

            gistore.createBackUp( 'rememberallSync',
                {
                    rememberallSync: {
                        items: cleanNodes( state.get( 'rememberall.items' ) || [] ),
                        version: version,
                        lastSync: new Date()
                    }
                } )
                .then( function( id )
                {
                    debug( "New gist " + id );
                    vscode.workspace.getConfiguration( 'rememberall' ).update( 'syncGistId', id, true );

                    if( callback )
                    {
                        callback();
                    }
                } );
        }
    }
    else if( callback )
    {
        callback();
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
                function doUpdate()
                {
                    debug( "Sync at " + now.toISOString() );

                    state.update( 'rememberall.items', data.rememberallSync.items );
                    state.update( 'rememberall.lastSync', data.rememberallSync.lastSync );
                }

                var now = new Date();

                debug( "Checking local data against backup..." );

                debug( "local:" + new Date( state.get( 'rememberall.lastSync' ) ) );
                debug( "remote:" + new Date( data.rememberallSync.lastSync ) );
                if( state.get( 'rememberall.lastSync' ) === undefined || data.rememberallSync.lastSync > new Date( state.get( 'rememberall.lastSync' ) ) )
                {
                    debug( "Checking version..." );
                    var storedVersion = state.get( 'rememberall.version' );
                    if( storedVersion === undefined || compareVersions( version, storedVersion ) >= 0 )
                    {
                        debug( "Checking time..." );
                        debug( "last backup:" + lastBackup );
                        if( new Date( data.rememberallSync.lastSync ) < lastBackup )
                        {
                            vscode.window.showInformationMessage( "Your local tree is newer than the backup.", 'Keep Local', 'Overwrite' ).then( function( confirm )
                            {
                                if( confirm === 'Overwrite' )
                                {
                                    debug( "Overwrite" );
                                    doUpdate();
                                }
                                else
                                {
                                    debug( "Keep Local" );
                                    triggerBackup();
                                }
                            } );
                        }
                        else
                        {
                            doUpdate();
                        }
                    }
                    else
                    {
                        debug( "Ignoring synced state from older version" );
                    }
                }
                else
                {
                    debug( "Ignoring remote data" );
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
            gistore.sync().then( function( data )
            {
                var storedVersion = state.get( 'rememberall.version' );
                if( storedVersion === undefined || compareVersions( version, storedVersion ) >= 0 )
                {
                    var cleanedNodes = cleanNodes( state.get( 'rememberall.items' ) || [] );

                    if( data.rememberallSync.items !== cleanedNodes )
                    {
                        debug( "Content changed..." );

                        var now = new Date();

                        if( data.rememberallSync.lastSync < lastBackup )
                        {
                            debug( "local data newer than backup?" );

                            vscode.window.showInformationMessage( "Your local tree is newer than the backup.", 'Replace Backup', 'Overwrite Local' ).then( function( confirm )
                            {
                                if( confirm === 'Replace Backup' )
                                {
                                    debug( "Replacing backup with local data" );

                                    gistore.backUp( {
                                        rememberallSync: {
                                            items: cleanedNodes,
                                            version: version,
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
                                    debug( "Cancelled" );
                                }
                            } );
                        }
                        else
                        {
                            debug( "Starting backup at " + now.toISOString() );

                            gistore.backUp( {
                                rememberallSync: {
                                    items: cleanedNodes,
                                    version: version,
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
                    }
                    else
                    {
                        debug( "Ignoring unchanged data" );
                        processQueue();
                    }
                }
                else
                {
                    debug( "Ignoring synced state from older version" );
                }
            } ).catch( function( error )
            {
                if( vscode.workspace.getConfiguration( 'rememberall' ).get( 'syncToken' ) )
                {
                    debug( "sync failed:" + error );
                }

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
    lastBackup = new Date();

    debug( "set lastBackup: " + lastBackup );
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
