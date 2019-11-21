
var vscode = require( 'vscode' );
var tree = require( './tree' );
var storage = require( './storage' );

function activate( context )
{
    var outputChannel;

    var rememberallTree = new tree.RememberallDataProvider( context );

    var rememberallViewExplorer = vscode.window.createTreeView( "rememberall-explorer", { treeDataProvider: rememberallTree } );
    var rememberallView = vscode.window.createTreeView( "rememberall", { treeDataProvider: rememberallTree } );

    function debug( text )
    {
        if( outputChannel )
        {
            outputChannel.appendLine( new Date().toLocaleTimeString( vscode.env.language, { hour12: false } ) + " " + text );
        }
    }

    function resetOutputChannel()
    {
        if( outputChannel )
        {
            outputChannel.dispose();
            outputChannel = undefined;
            storage.setOutputChannel( undefined );
            rememberallTree.setOutputChannel( undefined );
        }
        if( vscode.workspace.getConfiguration( 'rememberall' ).get( 'debug' ) === true )
        {
            outputChannel = vscode.window.createOutputChannel( "Rememberall" );
            storage.setOutputChannel( outputChannel );
            rememberallTree.setOutputChannel( outputChannel );
            debug( "Ready" );
        }
    }

    function refresh()
    {
        function onSync()
        {
            rememberallTree.refresh();
        }

        context.globalState.update( 'rememberall.lastSync', undefined );

        storage.sync( onSync );
    }

    function setContext()
    {
        var showTree = true;
        var expanded = context.workspaceState.get( 'rememberall.expanded' );
        var showInExplorer = vscode.workspace.getConfiguration( 'rememberall' ).get( 'showInExplorer' );
        // var authorized = context.globalState.get( 'calendar.google.token' ) ? true : false;
        var authorized = true;

        vscode.commands.executeCommand( 'setContext', 'rememberall-show-expand', !expanded );
        vscode.commands.executeCommand( 'setContext', 'rememberall-show-collapse', expanded );
        vscode.commands.executeCommand( 'setContext', 'rememberall-tree-has-content', showTree );
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
                storage.triggerBackup();
            }
        } );
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
                    storage.triggerBackup();
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
                    storage.triggerBackup();
                }
            } );
        }
        else
        {
            vscode.window.showInformationMessage( "Please select an item in the list" );
        }
    }

    function nodeFunction( method, node )
    {
        node = node ? node : selectedNode();

        if( node )
        {
            method.call( rememberallTree, node );
            storage.triggerBackup();
        }
    }

    function moveUp( node ) { nodeFunction( rememberallTree.moveUp, node ); }
    function moveDown( node ) { nodeFunction( rememberallTree.moveDown, node ); }
    function makeChild( node ) { nodeFunction( rememberallTree.makeChild, node ); }
    function unparent( node ) { nodeFunction( rememberallTree.unparent, node ); }

    function resetCache()
    {
        // context.globalState.update( 'rememberall.lastSync', undefined );

        // context.workspaceState.update( 'rememberall.expanded', undefined );
        // context.workspaceState.update( 'rememberall.expandedNodes', undefined );

        // purgeFolder( context.globalStoragePath );

        debug( "Cache cleared" );

        refresh();
    }

    function register()
    {
        storage.initialize( context.globalState );

        vscode.window.registerTreeDataProvider( 'rememberall', rememberallTree );

        // context.subscriptions.push( vscode.commands.registerCommand( 'calendar.authorize', refresh ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.refresh', refresh ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.expand', expand ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.collapse', collapse ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.resetCache', resetCache ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.create', create ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.edit', edit ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.remove', remove ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.moveUp', moveUp ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.moveDown', moveDown ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.makeChild', makeChild ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.unparent', unparent ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'rememberall.resetSync', storage.resetSync ) );

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
                else if(
                    e.affectsConfiguration( 'rememberall.syncEnabled' ) ||
                    e.affectsConfiguration( 'rememberall.syncGistId' ) )
                {
                    storage.initializeSync();
                    if( vscode.workspace.getConfiguration( 'rememberall' ).get( 'syncEnabled' ) === true )
                    {
                        refresh();
                    }
                }
                else if( e.affectsConfiguration( 'rememberall.syncToken' ) )
                {
                }
                else
                {
                    debug( "Unexpected setting changed" );
                }
            }
        } ) );

        context.subscriptions.push( vscode.window.onDidChangeWindowState( function( e )
        {
            storage.setActive( e.focused );
            if( e.focused )
            {
                refresh();
            }
        } ) );

        context.subscriptions.push( outputChannel );

        resetOutputChannel();
        setContext();
        storage.setActive( true );
        refresh();
    }

    register();
}

function deactivate()
{
}

exports.activate = activate;
exports.deactivate = deactivate;
