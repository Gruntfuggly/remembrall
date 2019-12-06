var vscode = require( 'vscode' );
var gistore = require( 'gistore' );

var generalOutputChannel;
var active = false;
var state;
var lastUpdate = new Date();
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
    var storedDate = globalState.get( 'rememberall.lastUpdate' );
    if( storedDate )
    {
        debug( "Info: Last backup: " + lastUpdate );
        lastUpdate = new Date( storedDate );
    }
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
            debug( "Info: Reading from gist " + gistId );

            gistore.setId( gistId );

            if( callback )
            {
                callback();
            }
        }
        else
        {
            debug( "Info: Creating new gist..." );

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
                    debug( "Info: New gist " + id );
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

function doUpdate( data, callback )
{
    debug( "Info: Updating local data" );

    state.update( 'rememberall.items', data.rememberallSync.items );
    state.update( 'rememberall.lastSync', data.rememberallSync.lastSync );

    if( callback )
    {
        callback();
    }
}

function sync( callback )
{
    function doSync( callback )
    {
        debug( "Debug: doSync" );
        if( gistore.token )
        {
            gistore.sync().then( function( data )
            {
                var cleanedNodes = cleanNodes( state.get( 'rememberall.items' ) || [] );

                if( JSON.stringify( data.rememberallSync.items ) !== JSON.stringify( cleanedNodes ) )
                {
                    debug( "Info: Checking local data against backup..." );
                    debug( " local timestamp:" + new Date( state.get( 'rememberall.lastSync' ) ) );
                    debug( " remote timestamp:" + new Date( data.rememberallSync.lastSync ) );

                    if( state.get( 'rememberall.lastSync' ) === undefined || data.rememberallSync.lastSync > new Date( state.get( 'rememberall.lastSync' ) ) )
                    {
                        var storedVersion = state.get( 'rememberall.version' );
                        if( storedVersion === undefined || compareVersions( version, storedVersion ) >= 0 )
                        {
                            debug( " last backup:" + lastUpdate );
                            if( new Date( data.rememberallSync.lastSync ) < lastUpdate )
                            {
                                debug( "Query: local tree is newer than the backup" );
                                vscode.window.showInformationMessage( "Your local tree is newer than the backup.", 'Keep Local', 'Overwrite' ).then( function( confirm )
                                {
                                    if( confirm === 'Overwrite' )
                                    {
                                        debug( "Response: Overwrite local data" );
                                        doUpdate( data, callback );
                                    }
                                    else if( confirm === 'Keep Local' )
                                    {
                                        debug( "Response: Keep local data" );
                                        triggerBackup( callback );
                                    }
                                    else 
                                    {
                                        debug( "Response: Cancelled" );
                                    }
                                } );
                            }
                            else
                            {
                                doUpdate( data, callback );
                            }
                        }
                        else
                        {
                            debug( "Warning: Ignoring synced state from older version" );
                            if( callback )
                            {
                                callback();
                            }
                        }
                    }
                    else
                    {
                        debug( "Warning: Ignoring out of date remote data" );
                        if( callback )
                        {
                            callback();
                        }
                    }
                }
                else
                {
                    debug( "Info: Ignoring unchanged data" );
                    if( callback )
                    {
                        callback();
                    }
                }

                processQueue();
            } ).catch( function( error )
            {
                if( vscode.workspace.getConfiguration( 'rememberall' ).get( 'syncToken' ) )
                {
                    debug( "Error: sync failed:" + error );
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
            debug( "Info: No sync token defined" );

            if( callback )
            {
                callback();
            }
            processQueue();
        }
    }

    if( vscode.workspace.getConfiguration( 'rememberall' ).get( 'syncEnabled' ) === true )
    {
        debug( "Debug: sync" );

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
    active = isActive;

    if( active === true && vscode.workspace.getConfiguration( 'rememberall' ).get( 'syncEnabled' ) === true )
    {
        backup();
    }
}

function backup( callback )
{
    function doBackup()
    {
        debug( "Debug: doBackup" );
        if( gistore.token )
        {
            gistore.sync().then( function( data )
            {
                var storedVersion = state.get( 'rememberall.version' );
                if( storedVersion === undefined || compareVersions( version, storedVersion ) >= 0 )
                {
                    var cleanedNodes = cleanNodes( state.get( 'rememberall.items' ) || [] );

                    if( JSON.stringify( data.rememberallSync.items ) !== JSON.stringify( cleanedNodes ) )
                    {
                        var now = new Date();

                        if( data.rememberallSync.lastSync < lastUpdate )
                        {
                            vscode.window.showInformationMessage( "Your local tree is newer than the backup.", 'Replace Backup', 'Overwrite Local' ).then( function( confirm )
                            {
                                debug( "Query: local tree is newer than the backup" );

                                if( confirm === 'Replace Backup' )
                                {
                                    debug( "Response: Replacing backup with local data..." );

                                    now = new Date();

                                    gistore.backUp( {
                                        rememberallSync: {
                                            items: cleanedNodes,
                                            version: version,
                                            lastSync: now
                                        }
                                    } ).then( function()
                                    {
                                        debug( "Info: Backup complete at " + now.toISOString() );
                                        processQueue();
                                    } ).catch( function( error )
                                    {
                                        console.error( "Error: Backup failed: " + error );
                                        triggerBackup();
                                        processQueue();
                                    } );
                                }
                                else if( confirm === 'Overwrite Local' )
                                {
                                    debug( "Response: Overwrite local data with backup" );
                                    doUpdate( data, callback );
                                }
                                else
                                {
                                    debug( "Response: Cancelled" );
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
                                debug( "Info: Backup complete at " + now.toISOString() );
                                processQueue();
                            } ).catch( function( error )
                            {
                                console.error( "Error: backup failed: " + error );
                                triggerBackup();
                                processQueue();
                            } );
                        }
                    }
                    else
                    {
                        debug( "Info: Ignoring unchanged data" );
                        processQueue();
                    }
                }
                else
                {
                    debug( "Warning: Ignoring synced state from older version" );
                }
            } ).catch( function( error )
            {
                if( vscode.workspace.getConfiguration( 'rememberall' ).get( 'syncToken' ) )
                {
                    debug( "Error: sync failed:" + error );
                }

                processQueue();
            } );
        }
        else
        {
            processQueue();
        }
    }

    if( active === true && vscode.workspace.getConfiguration( 'rememberall' ).get( 'syncEnabled' ) === true )
    {
        debug( "Debug: backup" );

        queue.push( enqueue( doBackup, this, [] ) );

        processQueue();
    }
    else
    {
        debug( "Info: Not active" );
    }
}

function triggerBackup( callback )
{
    debug( "Debug: triggerBackup" );

    lastUpdate = new Date();
    state.update( 'rememberall.lastUpdate', lastUpdate );

    if( vscode.workspace.getConfiguration( 'rememberall' ).get( 'syncEnabled' ) === true )
    {
        debug( "Info: Set time of last update: " + lastUpdate );
        debug( "Info: Backing up in 1 second..." );
        clearTimeout( backupTimer );
        backupTimer = setTimeout( backup, 1000, this, callback );
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
            debug( "Info: Reset sync at " + now.toISOString() );
            sync();
        } ).catch( function( error )
        {
            debug( "Error: Reset failed: " + error );
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
