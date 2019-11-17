
var vscode = require( 'vscode' );
// var chrono = require( 'chrono-node' );
// var googleCalendar = require( './google' );
// var outlookCalendar = require( './outlook' );
var TreeView = require( './tree' );
// var utils = require( './utils' );

// var GOOGLE = 'GOOGLE';
// var OUTLOOK = 'OUTLOOK';
// var OK = 'OK';
// var IGNORE = 'Snooze';
// var BUMP = "Bump";

function activate( context )
{
    var outputChannel;
    var notifications = {};

    var rememberallTree = new TreeView.RememberallDataProvider( context, outputChannel );

    var rememberallViewExplorer = vscode.window.createTreeView( "rememberall-explorer", { treeDataProvider: rememberallTree } );
    var rememberallView = vscode.window.createTreeView( "rememberall", { treeDataProvider: rememberallTree } );

    function debug( text )
    {
        if( outputChannel )
        {
            outputChannel.appendLine( text );
        }
    }

    function resetOutputChannel()
    {
        if( outputChannel )
        {
            outputChannel.dispose();
            outputChannel = undefined;
        }
        if( vscode.workspace.getConfiguration( 'rememberall' ).debug === true )
        {
            outputChannel = vscode.window.createOutputChannel( "Rememberall" );
            debug( "Ready" );
        }
    }

    function fetch()
    {
        // var config = vscode.workspace.getConfiguration( 'rememberall' );
        // if( config.get( 'google.enabled' ) )
        // {
        //     googleCalendar.fetch( function( events )
        //     {
        //         debug( "Found " + events.length + " events" );
        //         events.map( function( event )
        //         {
        //             rememberallTree.add( event, GOOGLE );
        //         } );
        //         filterTree( context.workspaceState.get( 'calendar.filter' ) );
        //         rememberallTree.refresh();
        //         setContext();
        //         if( !allDayNotificationsShown )
        //         {
        //             showAllDayNotifications( events );
        //         }
        //         showNotifications( events );
        //         debug( "Ready" );
        //     }, context );
        // }
    }

    function refresh()
    {
        rememberallTree.clear();
        fetch();
    }

    function clearFilter()
    {
        context.workspaceState.update( 'rememberall.filter', undefined ).then( function()
        {
            debug( "Clearing filter" );
            rememberallTree.clearFilter();
            rememberallTree.refresh();
            setContext();
        } );
    }

    function setContext()
    {
        var showTree = true;
        var expanded = context.workspaceState.get( 'rememberall.expanded' );
        var showInExplorer = vscode.workspace.getConfiguration( 'rememberall' ).get( 'showInExplorer' );
        // var authorized = context.globalState.get( 'calendar.google.token' ) ? true : false;
        var authorized = true;
        var hasFilter = context.workspaceState.get( 'rememberall.filter' );

        vscode.commands.executeCommand( 'setContext', 'rememberall-show-expand', !expanded );
        vscode.commands.executeCommand( 'setContext', 'rememberall-show-collapse', expanded );
        vscode.commands.executeCommand( 'setContext', 'rememberall-tree-has-content', showTree );
        vscode.commands.executeCommand( 'setContext', 'rememberall-is-filtered', hasFilter );
        vscode.commands.executeCommand( 'setContext', 'rememberall-tree-has-content', rememberallTree.hasContent() );
        vscode.commands.executeCommand( 'setContext', 'rememberall-in-explorer', showInExplorer );
        vscode.commands.executeCommand( 'setContext', 'rememberall-is-authorized', authorized );
    }

    function collapse()
    {
        context.workspaceState.update( 'rememberall.expanded', false ).then( function()
        {
            rememberallTree.clearExpansionState();
            rememberallTree.refresh();
            setContext();
        } );
    }

    function expand()
    {
        context.workspaceState.update( 'rememberall.expanded', true ).then( function()
        {
            rememberallTree.clearExpansionState();
            rememberallTree.refresh();
            setContext();
        } );
    }

    function filterTree( term )
    {
        if( term )
        {
            debug( "Filtering: " + term );
            rememberallTree.filter( term );
        }
        else
        {
            debug( "No filter" );
            rememberallTree.clearFilter();
        }
        rememberallTree.refresh();
        setContext();
    }

    function selectedNode()
    {
        var result;
        if( rememberallViewExplorer && rememberallViewExplorer.visible === true )
        {
            rememberallViewExplorer.selection.map( function( node )
            {
                result = node;
            } );
        }
        if( rememberallView && rememberallView.visible === true )
        {
            rememberallView.selection.map( function( node )
            {
                result = node;
            } );
        }
        return result;
    }

    function create()
    {
        // var status = vscode.window.createStatusBarItem();
        // status.text = "Creating event...";
        // status.show();

        vscode.window.showInputBox( { prompt: "Remember this:" } ).then( function( entry )
        {
            if( entry )
            {
                rememberallTree.add( { label: entry } );
                rememberallTree.refresh();
            }
        } );
        //     if( summary )
        //     {
        //         getDateAndTime( function( parsedDateTime )
        //         {
        //             var config = vscode.workspace.getConfiguration( 'calendar' );

        //             debug( "parsed date and time: " + JSON.stringify( parsedDateTime, null, 2 ) );
        //             var eventDateTime = {
        //                 start: parsedDateTime[ 0 ].start.date(),
        //                 allDay: isAllDay( parsedDateTime )
        //             };
        //             if( parsedDateTime[ 0 ].end )
        //             {
        //                 eventDateTime.end = parsedDateTime[ 0 ].end.date();
        //             }
        //             else if( parsedDateTime.length > 1 )
        //             {
        //                 eventDateTime.end = parsedDateTime[ 1 ].start.date();
        //             }

        //             if( config.get( 'google.enabled' ) )
        //             {
        //                 googleCalendar.createEvent( refresh, summary, eventDateTime );
        //             }
        //         }, status, "Please enter the date and time of the event", "E.g., Friday at 4.15pm", "Creating event", undefined, showEventHint );
        //     }
        //     else
        //     {
        //         status.dispose();
        //     }
        // } );
    }

    function filter()
    {
        vscode.window.showInputBox( { prompt: "Filter the list" } ).then( function( term )
        {
            context.workspaceState.update( 'rememberall.filter', term ).then( function()
            {
                filterTree( term );
            } );
        } );
    }

    function resetCache()
    {
        // function purgeFolder( folder )
        // {
        //     fs.readdir( folder, function(br err, files )
        //     {
        //         files.map( function( file )
        //         {
        //             fs.unlinkSync( path.join( folder, file ) );
        //         } );
        //     } );
        // }

        context.workspaceState.update( 'rememberall.expanded', undefined );
        context.workspaceState.update( 'rememberall.filter', undefined );
        context.workspaceState.update( 'rememberall.expandedNodes', undefined );

        // purgeFolder( context.globalStoragePath );

        debug( "Cache cleared" );

        refresh();
    }

    function register()
    {
        vscode.window.registerTreeDataProvider( 'rememberall', rememberallTree );

        // context.subscriptions.push( vscode.commands.registerCommand( 'calendar.authorize', refresh ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.refresh', refresh ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.expand', expand ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.collapse', collapse ) );
        // context.subscriptions.push( vscode.commands.registerCommand( 'calendar.resetCache', resetCache ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.filter', filter ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.clearFilter', clearFilter ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.create', create ) );
        // context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.edit', edit ) );
        // context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.remove', remove ) );

        context.subscriptions.push( rememberallViewExplorer.onDidExpandElement( function( e ) { rememberallTree.setExpanded( e.element, true ); } ) );
        context.subscriptions.push( rememberallView.onDidExpandElement( function( e ) { rememberallTree.setExpanded( e.element, true ); } ) );
        context.subscriptions.push( rememberallViewExplorer.onDidCollapseElement( function( e ) { rememberallTree.setExpanded( e.element, false ); } ) );
        context.subscriptions.push( rememberallView.onDidCollapseElement( function( e ) { rememberallTree.setExpanded( e.element, false ); } ) );

        context.subscriptions.push( vscode.workspace.onDidChangeConfiguration( function( e )
        {
            if( e.affectsConfiguration( "rememberall" ) )
            {
                if( e.affectsConfiguration( "rememberall.debug" ) )
                {
                    resetOutputChannel();
                }
                else if( e.affectsConfiguration( 'rememberall.showInExplorer' ) )
                {
                    setContext();
                }
                else if( true
                    // e.affectsConfiguration( 'calendar.maxEvents' ) ||
                    // e.affectsConfiguration( 'calendar.historicDays' ) ||
                    // e.affectsConfiguration( 'calendar.notificationInterval' ) ||
                    // e.affectsConfiguration( 'calendar.notificationRepeatInterval' ) ||
                    // e.affectsConfiguration( 'calendar.showRelativeDates' ) ||
                    // e.affectsConfiguration( 'calendar.google.enabled' ) ||
                    // e.affectsConfiguration( 'calendar.google.credentialsFile' ) ||
                    // e.affectsConfiguration( 'calendar.outlook.enabled' ) ||
                    // e.affectsConfiguration( 'calendar.outlook.clientSecret' ) ||
                    // e.affectsConfiguration( 'calendar.outlook.clientId' )
                )
                {
                    refresh();
                }
            }
        } ) );

        context.subscriptions.push( outputChannel );

        resetOutputChannel();
        setContext();
    }

    register();
}

function deactivate()
{
}

exports.activate = activate;
exports.deactivate = deactivate;
