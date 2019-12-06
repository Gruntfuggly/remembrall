
var vscode = require( 'vscode' );
var fs = require( 'fs' );
var path = require( 'path' );
var tree = require( './tree' );
var storage = require( './storage' );

function activate( context )
{
    var outputChannel;

    var remembrallTree = new tree.RemembrallDataProvider( context );

    var remembrallViewExplorer = vscode.window.createTreeView( "remembrall-explorer", { treeDataProvider: remembrallTree } );
    var remembrallView = vscode.window.createTreeView( "remembrall", { treeDataProvider: remembrallTree } );

    function extensionVersion()
    {
        var extensionPath = path.join( context.extensionPath, "package.json" );
        var packageFile = JSON.parse( fs.readFileSync( extensionPath, 'utf8' ) );
        return packageFile.version;
    }

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
            remembrallTree.setOutputChannel( undefined );
        }
        if( vscode.workspace.getConfiguration( 'remembrall' ).get( 'debug' ) === true )
        {
            outputChannel = vscode.window.createOutputChannel( "Remembrall" );
            storage.setOutputChannel( outputChannel );
            remembrallTree.setOutputChannel( outputChannel );
            debug( "Info: Ready" );
        }
    }

    function onLocalDataUpdated()
    {
        remembrallTree.refresh();
    }

    function refresh()
    {
        context.globalState.update( 'remembrall.lastSync', undefined );

        debug( "Info: Refreshing..." );

        storage.sync( onLocalDataUpdated );
    }

    function setContext()
    {
        var showTree = true;
        var expanded = context.workspaceState.get( 'remembrall.expanded' );
        var showInExplorer = vscode.workspace.getConfiguration( 'remembrall' ).get( 'showInExplorer' );

        vscode.commands.executeCommand( 'setContext', 'remembrall-show-expand', !expanded );
        vscode.commands.executeCommand( 'setContext', 'remembrall-show-collapse', expanded );
        vscode.commands.executeCommand( 'setContext', 'remembrall-tree-has-content', showTree );
        vscode.commands.executeCommand( 'setContext', 'remembrall-tree-has-content', remembrallTree.hasContent() );
        vscode.commands.executeCommand( 'setContext', 'remembrall-in-explorer', showInExplorer );
    }

    function collapse()
    {
        context.workspaceState.update( 'remembrall.expanded', false ).then( function()
        {
            remembrallTree.clearExpansionState();
            remembrallTree.refresh();
            setContext();
        } );
    }

    function expand()
    {
        context.workspaceState.update( 'remembrall.expanded', true ).then( function()
        {
            remembrallTree.clearExpansionState();
            remembrallTree.refresh();
            setContext();
        } );
    }

    function selectedNode()
    {
        var result;
        if( remembrallViewExplorer && remembrallViewExplorer.visible === true )
        {
            remembrallViewExplorer.selection.map( function( node )
            {
                result = node;
            } );
        }
        if( remembrallView && remembrallView.visible === true )
        {
            remembrallView.selection.map( function( node )
            {
                result = node;
            } );
        }
        return result;
    }

    function selectNode( node )
    {
        if( remembrallViewExplorer && remembrallViewExplorer.visible === true )
        {
            remembrallViewExplorer.reveal( node, { select: true } );
        }
        if( remembrallView && remembrallView.visible === true )
        {
            remembrallView.reveal( node, { select: true } );
        }
    }

    function create()
    {
        vscode.window.showInputBox( { placeHolder: "Enter something to remember..." } ).then( function( item )
        {
            if( item )
            {
                var node = remembrallTree.add( { label: item }, selectedNode() );
                remembrallTree.refresh();
                selectNode( node );
                storage.triggerBackup( onLocalDataUpdated );
            }
        } );
    }

    function createFromSelection()
    {
        var editor = vscode.window.activeTextEditor;
        if( editor && editor.selections )
        {
            var currentNode = selectedNode();
            var newNode;
            editor.selections.reverse().map( function( selection )
            {
                if( selection.start != selection.end )
                {
                    var document = editor.document;
                    var content = document.getText().substring( document.offsetAt( selection.start ), document.offsetAt( selection.end ) );

                    newNode = remembrallTree.add( { label: content }, currentNode );
                }
                remembrallTree.refresh();
                selectNode( newNode );
                storage.triggerBackup( onLocalDataUpdated );
            } );
        }
    }

    function remove( node )
    {
        node = node ? node : selectedNode();

        if( node )
        {
            function removeNode()
            {
                remembrallTree.remove( node );
                remembrallTree.refresh();
                storage.triggerBackup( onLocalDataUpdated );
            }

            if( vscode.workspace.getConfiguration( 'remembrall' ).get( 'confirmRemove' ) === true )
            {
                vscode.window.showInformationMessage( "Are you sure you want to remove this item?", 'Yes', 'No' ).then( function( confirm )
                {
                    if( confirm === 'Yes' )
                    {
                        removeNode();
                    }
                } );
            }
            else
            {
                removeNode();
            }
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
                    remembrallTree.edit( node, update );
                    remembrallTree.refresh();
                    storage.triggerBackup( onLocalDataUpdated );
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
            method.call( remembrallTree, node );
            storage.triggerBackup( onLocalDataUpdated );
        }
    }

    function moveUp( node ) { nodeFunction( remembrallTree.moveUp, node ); }
    function moveDown( node ) { nodeFunction( remembrallTree.moveDown, node ); }
    function makeChild( node ) { nodeFunction( remembrallTree.makeChild, node ); }
    function unparent( node ) { nodeFunction( remembrallTree.unparent, node ); }

    function resetCache()
    {
        context.workspaceState.update( 'remembrall.expanded', undefined );
        context.workspaceState.update( 'remembrall.expandedNodes', undefined );

        context.globalState.update( 'remembrall.lastUpdate', undefined );

        debug( "Info: Cache cleared" );

        refresh();
    }

    function register()
    {
        resetOutputChannel();

        storage.initialize( context.globalState, extensionVersion() );

        vscode.window.registerTreeDataProvider( 'remembrall', remembrallTree );

        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.refresh', refresh ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.expand', expand ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.collapse', collapse ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.resetCache', resetCache ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.create', create ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.createFromSelection', createFromSelection ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.edit', edit ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.remove', remove ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.moveUp', moveUp ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.moveDown', moveDown ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.makeChild', makeChild ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.unparent', unparent ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.resetSync', storage.resetSync ) );

        context.subscriptions.push( remembrallViewExplorer.onDidExpandElement( function( e ) { remembrallTree.setExpanded( e.element, true ); } ) );
        context.subscriptions.push( remembrallView.onDidExpandElement( function( e ) { remembrallTree.setExpanded( e.element, true ); } ) );
        context.subscriptions.push( remembrallViewExplorer.onDidCollapseElement( function( e ) { remembrallTree.setExpanded( e.element, false ); } ) );
        context.subscriptions.push( remembrallView.onDidCollapseElement( function( e ) { remembrallTree.setExpanded( e.element, false ); } ) );

        context.subscriptions.push( vscode.workspace.onDidChangeConfiguration( function( e )
        {
            if( e.affectsConfiguration( "remembrall" ) )
            {
                if( e.affectsConfiguration( "remembrall.debug" ) )
                {
                    resetOutputChannel();
                }
                else if( e.affectsConfiguration( 'remembrall.showInExplorer' ) )
                {
                    setContext();
                }
                else if(
                    e.affectsConfiguration( 'remembrall.syncEnabled' ) ||
                    e.affectsConfiguration( 'remembrall.syncGistId' ) )
                {
                    storage.initializeSync( extensionVersion, function()
                    {
                        if( vscode.workspace.getConfiguration( 'remembrall' ).get( 'syncEnabled' ) === true )
                        {
                            refresh();
                        }
                    } );
                }
                else if( e.affectsConfiguration( 'remembrall.syncToken' ) )
                {
                }
                else
                {
                    debug( "Error: Unexpected setting changed" );
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
