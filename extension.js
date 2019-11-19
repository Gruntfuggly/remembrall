
var vscode = require( 'vscode' );
var TreeView = require( './tree' );

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

    function refresh()
    {
        // rememberallTree.clear();
        // resync...
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
        vscode.window.showInputBox( { placeHolder: "Enter something to remember..." } ).then( function( item )
        {
            if( item )
            {
                rememberallTree.add( { label: item } );
                rememberallTree.refresh();
            }
        } );
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


    function remove( node )
    {
        node = node ? node : selectedNode();

        if( node )
        {
            vscode.window.showInformationMessage( "Are you sure you want to remove this item?", 'Yes', 'No' ).then( function( confirm )
            {
                if( confirm === 'Yes' )
                {
                    rememberallTree.remove( node );
                    rememberallTree.refresh();
                }
            } );
        }
        else
        {
            vscode.window.showInformationMessage( "Please select an item in the list" );
        }
    }

    function edit( node )
    {
        node = node ? node : selectedNode();

        if( node )
        {
            vscode.window.showInputBox( {
                value: node.label
            } ).then( function( update )
            {
                if( update )
                {
                    rememberallTree.edit( node, update );
                    rememberallTree.refresh();
                }
            } );
        }
        else
        {
            vscode.window.showInformationMessage( "Please select an item in the list" );
        }
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
        context.globalState.update( 'rememberall.entries', [] );

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
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.resetCache', resetCache ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.filter', filter ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.clearFilter', clearFilter ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.create', create ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.edit', edit ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.remove', remove ) );

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
                else
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
