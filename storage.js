var vscode = require( 'vscode' );
var os = require( 'os' );
var gistore = require( './gistore' );
var utils = require( './utils' );

var generalOutputChannel;
var active = false;
var state;
var lastUpdate = new Date();
var backupTimer;
var queue = [];
var version;
var status;

var OPEN_SETTINGS = 'Open Settings';
var KEEP_LOCAL = 'Keep Local';
var OVERWRITE = 'Overwrite';
var REPLACE_BACKUP = 'Replace Backup';
var OVERWRITE_LOCAL = 'Overwrite Local';

function initialize( globalState, status, currentVersion )
{
    state = globalState;
    statusBarItem = status;

    initializeSync( currentVersion );
    var storedDate = globalState.get( 'remembrall.lastUpdate' );
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

function fetchNodes()
{
    var nodeData = state.get( 'remembrall.items' );
    try
    {
        var nodes = JSON.parse( nodeData );
        return nodes;
    }
    catch( e )
    {
        return [];
    }
}

function logAndCallback( error, callback )
{
    debug( error );
    if( callback )
    {
        statusBarItem.hide();
        callback();
    }
}

function initializeSync( currentVersion, callback )
{
    statusBarItem.text = "Initialize sync...";
    statusBarItem.show();

    version = currentVersion;

    var enabled = vscode.workspace.getConfiguration( 'remembrall' ).get( 'syncEnabled', undefined );
    var token = vscode.workspace.getConfiguration( 'remembrall' ).get( 'syncToken', undefined );
    var gistId = vscode.workspace.getConfiguration( 'remembrall' ).get( 'syncGistId', undefined );

    if( enabled === true && token )
    {
        gistore.setToken( token );

        if( gistId )
        {
            gistore.setId( gistId );
            logAndCallback( "Info: Reading from gist " + gistId, callback );
        }
        else
        {
            debug( "Debug: Fetching gists..." );
            gistore.getList().then( function( list )
            {
                var found = false;
                list.map( function( gist )
                {
                    if( found === false )
                    {
                        if( gist.description === 'remembrallSync' )
                        {
                            debug( "Info: Found existing gist " + gist.id );
                            vscode.workspace.getConfiguration( 'remembrall' ).update( 'syncGistId', gist.id, true );
                            gistore.setId( gist.id );
                            found = true;
                        }
                    }
                } );
                if( found === false )
                {
                    debug( "Info: Creating new gist..." );

                    var data = {
                        remembrallSync: {
                            items: utils.cleanNodes( fetchNodes() ),
                            version: version,
                            lastSync: new Date(),
                            by: os.hostname()
                        }
                    };

                    gistore.createBackUp( 'remembrallSync', data ).then( function( id )
                    {
                        vscode.workspace.getConfiguration( 'remembrall' ).update( 'syncGistId', id, true ).then( function()
                        {
                            logAndCallback( "Info: New gist " + id, callback );
                        } );
                    } );
                }
            } );
        }
    }
    else if( callback )
    {
        statusBarItem.hide();
        callback();
    }
}

function resetId( gistId, callback )
{
    gistore.setId( gistId );
    logAndCallback( "Info: Reset gist " + gistId, callback );
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
    state.update( 'remembrall.items', JSON.stringify( data.remembrallSync.items ) ).then( function()
    {
        logAndCallback( "Info: Updated local data", callback );
    } );
}

function checkSetting( setting, callback )
{
    if( !vscode.workspace.getConfiguration( 'remembrall' ).get( setting ) )
    {
        vscode.window.showErrorMessage( setting + " mot defined", OPEN_SETTINGS ).then( function( button )
        {
            if( button === OPEN_SETTINGS )
            {
                vscode.commands.executeCommand( 'workbench.action.openSettings', 'remembrall.' + setting );
            }
        } );

        if( callback )
        {
            callback();
        }
        processQueue();

        return false;
    }

    return true;
}

function sync( callback )
{
    function doSync( callback )
    {
        debug( "Debug: doSync" );

        if( checkSetting( 'syncToken', callback ) && checkSetting( 'syncGistId', callback ) && gistore.token )
        {
            gistore.sync().then( function( data )
            {
                if( data.remembrallSync === undefined )
                {
                    logAndCallback( "Warning: No existing backup", callback );
                }
                else
                {
                    var cleanedNodes = utils.cleanNodes( fetchNodes() );

                    if( JSON.stringify( data.remembrallSync.items ) !== JSON.stringify( cleanedNodes ) )
                    {
                        debug( "Info: Checking local data against backup..." );
                        debug( " local timestamp:" + new Date( state.get( 'remembrall.lastSync' ) ) );
                        debug( " remote timestamp:" + new Date( data.remembrallSync.lastSync ) );

                        if( state.get( 'remembrall.lastSync' ) === undefined || new Date( data.remembrallSync.lastSync ) > new Date( state.get( 'remembrall.lastSync' ) ) )
                        {
                            // var storedVersion = state.get( 'remembrall.version' );
                            // if( storedVersion === undefined || utils.compareVersions( version, storedVersion ) >= 0 )
                            // {
                            debug( " last update:" + lastUpdate );
                            if( new Date( data.remembrallSync.lastSync ) < lastUpdate )
                            {
                                debug( "Query: local tree is newer than the backup" );
                                vscode.window.showInformationMessage( "Your local tree is newer than the backup.", KEEP_LOCAL, OVERWRITE ).then( function( confirm )
                                {
                                    if( confirm === OVERWRITE )
                                    {
                                        debug( "Response: Overwrite local data" );
                                        doUpdate( data, callback );
                                    }
                                    else if( confirm === KEEP_LOCAL )
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
                            // }
                            // else
                            // {
                            //     debug( "Warning: Ignoring synced state from older version" );
                            //     if( callback )
                            //     {
                            //         callback();
                            //     }
                            // }
                        }
                        else
                        {
                            logAndCallback( "Warning: Ignoring out of date remote data", callback );
                        }
                    }
                    else
                    {
                        logAndCallback( "Info: Ignoring unchanged data", callback );
                    }
                }

                processQueue();
            } ).catch( function( error )
            {
                vscode.window.showErrorMessage( "Sync failed: " + error );
                logAndCallback( "Error: sync failed: " + error, callback );
                processQueue();
            } );
        }
    }

    if( vscode.workspace.getConfiguration( 'remembrall' ).get( 'syncEnabled' ) === true )
    {
        statusBarItem.text = "Sync...";
        statusBarItem.show();

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
}

function backup( callback )
{
    function updateRemoteData()
    {
        var cleanedNodes = utils.cleanNodes( fetchNodes() );

        now = new Date();

        gistore.backUp( {
            remembrallSync: {
                items: cleanedNodes,
                version: version,
                lastSync: now,
                by: os.hostname()
            }
        } ).then( function()
        {
            debug( "Info: Backup complete at " + now.toISOString() );
            state.update( 'remembrall.lastSync', now );
            processQueue();
        } ).catch( function( error )
        {
            console.error( "Error: Backup failed: " + error );
            triggerBackup();
            processQueue();
        } );
    }

    function doBackup()
    {
        debug( "Debug: doBackup" );
        if( checkSetting( 'syncToken', callback ) && checkSetting( 'syncGistId', callback ) && gistore.token )
        {
            gistore.sync().then( function( data )
            {
                var storedVersion = state.get( 'remembrall.version' );
                // if( storedVersion === undefined || utils.compareVersions( version, storedVersion ) >= 0 )
                // {
                var cleanedNodes = utils.cleanNodes( fetchNodes() );

                if( JSON.stringify( data.remembrallSync.items ) !== JSON.stringify( cleanedNodes ) )
                {
                    var now = new Date();

                    if( data.remembrallSync.lastSync < lastUpdate )
                    {
                        vscode.window.showInformationMessage( "Your local tree is newer than the backup.", REPLACE_BACKUP, OVERWRITE_LOCAL ).then( function( confirm )
                        {
                            debug( "Query: local tree is newer than the backup" );

                            if( confirm === REPLACE_BACKUP )
                            {
                                debug( "Response: Replacing backup with local data..." );

                                updateRemoteData();
                            }
                            else if( confirm === OVERWRITE_LOCAL )
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

                        updateRemoteData();
                    }
                }
                else
                {
                    debug( "Info: Ignoring unchanged data" );
                    processQueue();
                }
                // }
                // else
                // {
                //     debug( "Warning: Ignoring synced state from older version" );
                // }
            } ).catch( function( error )
            {
                debug( "Error: sync failed: " + error );
                vscode.window.showErrorMessage( "Sync failed: " + error );

                processQueue();
            } );
        }
        else
        {
            processQueue();
        }
    }

    if( active === true && vscode.workspace.getConfiguration( 'remembrall' ).get( 'syncEnabled' ) === true )
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
    state.update( 'remembrall.lastUpdate', lastUpdate );

    if( vscode.workspace.getConfiguration( 'remembrall' ).get( 'syncEnabled' ) === true )
    {
        statusBarItem.text = "Backup...";
        statusBarItem.show();

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
            remembrallSync: {
                items: [],
                nodeCounter: 1,
                lastSync: now,
                by: os.hostname()
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
module.exports.resetId = resetId;
module.exports.setOutputChannel = setOutputChannel;
module.exports.setActive = setActive;
module.exports.initializeSync = initializeSync;
module.exports.sync = sync;
module.exports.resetSync = resetSync;
module.exports.triggerBackup = triggerBackup;
