
var vscode = require( 'vscode' );
var fs = require( 'fs' );
var path = require( 'path' );
var os = require( 'os' );
var icons = require( './icons' );
var tree = require( './tree' );
var storage = require( './storage' );
var octiconData = require( 'octicons/build/data.json' );

function activate( context )
{
    var outputChannel;
    var lastClickedNode;
    var doubleClickTimer;

    var remembrallTree = new tree.RemembrallDataProvider( context, setContext );

    var remembrallViewExplorer = vscode.window.createTreeView( "remembrall-view-explorer", { treeDataProvider: remembrallTree } );
    var remembrallView = vscode.window.createTreeView( "remembrall-view", { treeDataProvider: remembrallTree } );

    var status = vscode.window.createStatusBarItem( vscode.StatusBarAlignment.Left, 0 );

    context.subscriptions.push( remembrallTree );
    context.subscriptions.push( remembrallViewExplorer );
    context.subscriptions.push( remembrallView );
    context.subscriptions.push( status );

    var findInstance = 0;
    var findText = "";

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
        remembrallTree.refresh( setContext );
    }

    function reinitializeSync()
    {
        storage.initializeSync( extensionVersion, function()
        {
            if( vscode.workspace.getConfiguration( 'remembrall' ).get( 'syncEnabled' ) === true )
            {
                refresh();
            }
        } );
    }

    function updateTree()
    {
        remembrallTree.storeNodes();
        remembrallTree.refresh();
        storage.triggerBackup( onLocalDataUpdated );
        onLocalDataUpdated();
    }

    function refresh()
    {
        debug( "Info: Refreshing..." );

        remembrallTree.refresh();

        var config = vscode.workspace.getConfiguration( 'remembrall' );
        if( config.get( 'syncEnabled' ) && config.get( 'syncToken' ) )
        {
            if( config.get( 'syncGistId' ) )
            {
                storage.sync( onLocalDataUpdated );
            }
            else
            {
                reinitializeSync();
            }
        }
    }

    function setContext()
    {
        var showTree = true;
        var showInExplorer = vscode.workspace.getConfiguration( 'remembrall' ).get( 'showInExplorer' );

        var expanded = ( remembrallTree.numberOfExpandedNodes() > remembrallTree.numberOfCollapsedNodes() )

        vscode.commands.executeCommand( 'setContext', 'remembrall-show-expand', !expanded );
        vscode.commands.executeCommand( 'setContext', 'remembrall-show-collapse', expanded );
        vscode.commands.executeCommand( 'setContext', 'remembrall-tree-has-content', showTree );
        vscode.commands.executeCommand( 'setContext', 'remembrall-tree-has-content', remembrallTree.hasContent() );
        vscode.commands.executeCommand( 'setContext', 'remembrall-in-explorer', showInExplorer );
        vscode.commands.executeCommand( 'setContext', 'remembrall-in-explorer', showInExplorer );

        var message = remembrallTree.hasContent() ? "" : "Click the + button on the title bar to add new items...";
        remembrallView.message = message;
        remembrallViewExplorer.message = message;

        var title = vscode.workspace.getConfiguration( 'remembrall' ).get( 'viewTitle' );
        remembrallView.title = title;
        remembrallViewExplorer.title = title;
    }

    function setExpansionState( expanded )
    {
        context.workspaceState.update( 'remembrall.expandAll', expanded ).then( function()
        {
            remembrallTree.clearExpansionState( function()
            {
                remembrallTree.refresh( setContext );
            } );
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
            remembrallViewExplorer.reveal( node, { select: true, focus: true, expand: 3 } );
        }
        if( remembrallView && remembrallView.visible === true )
        {
            remembrallView.reveal( node, { select: true, focus: true, expand: 3 } );
        }
    }

    function selectionTreeAction( node, choices, property, prompt )
    {
        node = node ? node : selectedNode();

        if( node )
        {
            vscode.window.showQuickPick( choices, prompt ).then( function( response )
            {
                if( response !== undefined )
                {
                    node[ property ] = response;
                    updateTree();
                }
            } );
        }
        else
        {
            vscode.window.showInformationMessage( "Please select an item in the list" );
        }
    }

    function markAsNew( node )
    {
        node = node ? node : selectedNode();

        if( node )
        {
            node.done = false;
            updateTree();
        }
        else
        {
            vscode.window.showInformationMessage( "Please select an item in the list" );
        }
    }

    function markAsDone( node )
    {
        node = node ? node : selectedNode();

        if( node )
        {
            node.done = true;
            var located = remembrallTree.locateNode( node );
            if( vscode.workspace.getConfiguration( 'remembrall' ).get( 'moveDoneItemsToBottom' ) === true && located.index !== located.nodes.length - 1 )
            {
                moveToBottom( node );
            }
            else
            {
                updateTree();
            }
        }
        else
        {
            vscode.window.showInformationMessage( "Please select an item in the list" );
        }
    }

    function create()
    {
        vscode.window.showInputBox( { placeHolder: "Enter something to remember..." } ).then( function( item )
        {
            if( item )
            {
                remembrallTree.add( { label: item }, selectedNode(), function( node )
                {
                    storage.triggerBackup( onLocalDataUpdated );
                    onLocalDataUpdated();
                    selectNode( node );
                } );
            }
        } );
    }

    function createChild( node )
    {
        var parentNode = node ? node : selectedNode();

        if( node )
        {
            vscode.window.showInputBox( { placeHolder: "Enter something to remember..." } ).then( function( item )
            {
                if( item )
                {
                    remembrallTree.addChild( { label: item }, parentNode, function( node )
                    {
                        storage.triggerBackup( onLocalDataUpdated );
                        onLocalDataUpdated();
                        selectNode( node );
                    } );
                }
            } );
        }
        else
        {
            vscode.window.showInformationMessage( "Please select an item in the list" );
        }
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
                onLocalDataUpdated();
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
                onLocalDataUpdated();
            }

            if( vscode.workspace.getConfiguration( 'remembrall' ).get( 'confirmRemove' ) === true )
            {
                var prompt = "Are you sure you want to remove this item";
                if( node.nodes.length > 0 )
                {
                    prompt += ", and all it's children";
                }
                vscode.window.showInformationMessage( prompt + "?", 'Yes', 'No' ).then( function( confirm )
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
            vscode.window.showInputBox( { value: node.label } ).then( function( response )
            {
                if( response !== undefined )
                {
                    node[ property ] = response;
                    updateTree();
                }
            } );
        }
        else
        {
            vscode.window.showInformationMessage( "Please select an item in the list" );
        }
    }

    function setIcon( node )
    {
        selectionTreeAction( node, Object.keys( octiconData ).sort(), 'icon', { placeHolder: "Select an octicon..." } );
    }

    function setIconColour( node )
    {
        selectionTreeAction( node, icons.validColours, 'iconColour', { placeHolder: "Select a colour..." } );
    }

    function nodeFunction( method, node, argument )
    {
        node = node ? node : selectedNode();

        if( node )
        {
            method.call( remembrallTree, node, argument, function()
            {
                storage.triggerBackup( onLocalDataUpdated );
                onLocalDataUpdated();
                remembrallTree.find( node.label, selectNode );
            } );
        }
    }

    function moveUp( node ) { nodeFunction( remembrallTree.move, node, -1 ); }
    function moveDown( node ) { nodeFunction( remembrallTree.move, node, +1 ); }
    function moveToTop( node ) { nodeFunction( remembrallTree.moveTo, node, -1 ); }
    function moveToBottom( node ) { nodeFunction( remembrallTree.moveTo, node, +1 ); }
    function makeChild( node ) { nodeFunction( remembrallTree.makeChild, node ); }
    function unparent( node ) { nodeFunction( remembrallTree.unparent, node ); }

    function found( node, resetInstance )
    {
        selectNode( node );
        if( resetInstance === true )
        {
            findInstance = 0;
        }
    }

    function notFound()
    {
        vscode.window.showInformationMessage( "Not found: " + findText );
        findInstance = 0;
    }

    function find()
    {
        vscode.window.showInputBox( { placeHolder: "Search tree...", value: findText } ).then( function( text )
        {
            if( text !== undefined )
            {
                findText = text;
                var node = selectedNode();
                if( node && node.label.toLowerCase().indexOf( findText.toLowerCase() ) !== -1 )
                {
                    findInstance++;
                }
                else
                {
                    findInstance = 0;
                }
                remembrallTree.find( findText, findInstance, found, notFound );
            }
        } );
    }

    function findNext()
    {
        if( findText.trim().length > 0 )
        {
            findInstance++;
            remembrallTree.find( findText, findInstance, found, notFound );
        }
    }

    function selected( node )
    {
        if( doubleClickTimer && node.id === lastClickedNode.id )
        {
            var doubleClickAction = vscode.workspace.getConfiguration( 'remembrall' ).get( 'doubleClickAction' );

            debug( "Info: item double clicked - action: " + doubleClickAction );

            switch( doubleClickAction )
            {
                case 'Edit':
                    edit( node );
                    break;
                case 'Toggle Mark As Done':
                    if( node.done )
                    {
                        markAsNew( node );
                    }
                    else
                    {
                        markAsDone( node );
                    }
                    break;
                case 'Expand/Collapse':
                    if( node.nodes.length > 0 )
                    {
                        remembrallTree.setExpanded( node, !remembrallTree.isExpanded( node ), setContext );
                    }
                    break;
                default:
                    break;
            }
        }
        else
        {
            lastClickedNode = node;
            doubleClickTimer = setTimeout( function()
            {
                doubleClickTimer = undefined;
                lastClickedNode = undefined;
            }, 500 );
        }
    }

    function resetCache()
    {
        function purgeFolder( folder )
        {
            fs.readdir( folder, function( err, files )
            {
                files.map( function( file )
                {
                    fs.unlinkSync( path.join( folder, file ) );
                } );
            } );
        }

        purgeFolder( context.globalStoragePath );

        context.workspaceState.update( 'remembrall.expandAll', undefined );
        context.workspaceState.update( 'remembrall.expandedNodes', undefined );

        context.globalState.update( 'remembrall.lastUpdate', undefined );
        context.globalState.update( 'remembrall.lastSync', undefined );
        context.globalState.update( 'remembrall.items', undefined );

        debug( "Info: Cache cleared" );

        refresh();
    }

    function exportTree()
    {
        var exported = JSON.stringify( JSON.parse( context.globalState.get( 'remembrall.items' ) ), null, 2 );
        var newFile = vscode.Uri.parse( 'untitled:' + path.join( os.homedir(), 'remembrall.json' ) );
        vscode.workspace.openTextDocument( newFile ).then( function( document )
        {
            var edit = new vscode.WorkspaceEdit();
            edit.delete( newFile, new vscode.Range(
                document.positionAt( 0 ),
                document.positionAt( document.getText().length - 1 )
            ) );
            return vscode.workspace.applyEdit( edit ).then( function( success )
            {
                var edit = new vscode.WorkspaceEdit();
                edit.insert( newFile, new vscode.Position( 0, 0 ), exported );
                return vscode.workspace.applyEdit( edit ).then( function( success )
                {
                    if( success )
                    {
                        vscode.window.showTextDocument( document );
                    }
                } );
            } );
        } );
    }

    function importTree()
    {
        if( vscode.window.activeTextEditor )
        {
            if( vscode.window.activeTextEditor.document )
            {
                try
                {
                    var nodeData = JSON.parse( vscode.window.activeTextEditor.document.getText() );
                    vscode.window.showInformationMessage( "Are you sure you want import this data?", 'Yes', 'No' ).then( function( confirm )
                    {
                        if( confirm === 'Yes' )
                        {
                            if( Array.isArray( nodeData ) )
                            {
                                context.globalState.update( 'remembrall.items', JSON.stringify( nodeData ) ).then( function()
                                {
                                    remembrallTree.fetchNodes();
                                    storage.triggerBackup( onLocalDataUpdated );
                                    onLocalDataUpdated();
                                } );
                            }
                            else
                            {
                                debug( "Error: Data is not valid" );
                                vscode.window.showErrorMessage( "Remembrall: Data is not valid" );
                            }
                        }
                    } );
                }
                catch( e )
                {
                    debug( "Error: Failed to get data from current document." );
                    vscode.window.showErrorMessage( "Remembrall: Failed to get data from current document" );
                }
            }
        }
    }

    function register()
    {
        resetOutputChannel();

        storage.initialize( context.globalState, status, extensionVersion() );

        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.refresh', refresh ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.expand', function() { setExpansionState( true ); } ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.collapse', function() { setExpansionState( false ); } ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.resetCache', resetCache ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.create', create ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.createChild', createChild ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.createFromSelection', createFromSelection ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.edit', edit ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.remove', remove ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.moveUp', moveUp ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.moveDown', moveDown ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.moveToTop', moveToTop ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.moveToBottom', moveToBottom ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.makeChild', makeChild ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.unparent', unparent ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.resetSync', storage.resetSync ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.export', exportTree ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.import', importTree ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.setIcon', setIcon ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.setIconColour', setIconColour ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.markAsDone', markAsDone ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.markAsNew', markAsNew ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.find', find ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.findNext', findNext ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.onSelected', selected ) );

        context.subscriptions.push( remembrallViewExplorer.onDidExpandElement( function( e ) { remembrallTree.setExpanded( e.element, true, setContext ); } ) );
        context.subscriptions.push( remembrallView.onDidExpandElement( function( e ) { remembrallTree.setExpanded( e.element, true, setContext ); } ) );
        context.subscriptions.push( remembrallViewExplorer.onDidCollapseElement( function( e ) { remembrallTree.setExpanded( e.element, false, setContext ); } ) );
        context.subscriptions.push( remembrallView.onDidCollapseElement( function( e ) { remembrallTree.setExpanded( e.element, false, setContext ); } ) );

        context.subscriptions.push( vscode.workspace.onDidChangeConfiguration( function( e )
        {
            if( e.affectsConfiguration( "remembrall" ) )
            {
                if( e.affectsConfiguration( "remembrall.debug" ) )
                {
                    resetOutputChannel();
                }
                else if( e.affectsConfiguration( 'remembrall.showInExplorer' ) ||
                    e.affectsConfiguration( 'remembrall.viewTitle' ) )
                {
                    setContext();
                }
                else if(
                    e.affectsConfiguration( 'remembrall.syncEnabled' ) ||
                    e.affectsConfiguration( 'remembrall.syncToken' ) )
                {
                    debug( "Info: sync configuration updated" );
                    reinitializeSync();
                }
                else if( e.affectsConfiguration( 'remembrall.syncGistId' ) )
                {
                    storage.resetId( vscode.workspace.getConfiguration( 'remembrall' ).get( 'syncGistId' ), refresh );
                }
                else if( e.affectsConfiguration( 'remembrall.showCollapsedItemCounts' ) )
                {
                    remembrallTree.rebuild();
                    remembrallTree.refresh();
                }
                else if(
                    e.affectsConfiguration( 'remembrall.confirmRemove' ) ||
                    e.affectsConfiguration( 'remembrall.defaultIcon' ) ||
                    e.affectsConfiguration( 'remembrall.moveDoneItemsToBottom' ) ||
                    e.affectsConfiguration( 'remembrall.doubleClickAction' ) )
                {
                    debug( "Info: settings updated" );
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
