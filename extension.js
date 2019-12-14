
var vscode = require( 'vscode' );
var fs = require( 'fs' );
var path = require( 'path' );
var os = require( 'os' );
var icons = require( './icons' );
var tree = require( './tree' );
var storage = require( './storage' );

function activate( context )
{
    var outputChannel;

    var remembrallTree = new tree.RemembrallDataProvider( context, setContext );

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
    }

    function setExpansionState( expanded )
    {
        remembrallTree.setExpansionState( expanded );
        remembrallTree.refresh( setContext );
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
            remembrallViewExplorer.reveal( node, { select: true, expand: 3 } );
        }
        if( remembrallView && remembrallView.visible === true )
        {
            remembrallView.reveal( node, { select: true, expand: 3 } );
        }
    }

    function treeAction( node, property, prompt )
    {
        node = node ? node : selectedNode();

        if( node )
        {
            vscode.window.showInputBox( prompt ).then( function( response )
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

    function simpleTreeAction( node, property, value )
    {
        node = node ? node : selectedNode();

        if( node )
        {
            node[ property ] = value;
            updateTree();
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
        treeAction( node, 'label', { value: node.label } );
    }

    function setIcon( node )
    {
        var prompt =
        {
            placeHolder: "Enter an octicon name...",
            prompt: "For available icons, see: https://octicons.github.com/ "
        };
        treeAction( node, 'icon', prompt );
    }

    function setIconColour( node )
    {
        node = node ? node : selectedNode();

        if( node )
        {
            vscode.window.showQuickPick( icons.validColours, { placeHolder: "Select a colour..." } ).then( function( colour )
            {
                if( colour !== undefined )
                {
                    node.iconColour = colour;
                    updateTree();
                }
            } );
        }
        else
        {
            vscode.window.showInformationMessage( "Please select an item in the list" );
        }
    }

    function nodeFunction( method, node, argument )
    {
        node = node ? node : selectedNode();

        if( node )
        {
            method.call( remembrallTree, node, argument, function()
            {
                storage.triggerBackup( onLocalDataUpdated );
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

    function find()
    {
        vscode.window.showInputBox( { placeHolder: "Search tree..." } ).then( function( term )
        {
            if( term !== undefined )
            {
                remembrallTree.find( term, function( node )
                {
                    selectNode( node );
                } );
            }
        } );
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
                                context.globalState.update( 'remembrall.items', JSON.stringify( nodeData ) );
                                onLocalDataUpdated();
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

        storage.initialize( context.globalState, extensionVersion() );

        vscode.window.registerTreeDataProvider( 'remembrall', remembrallTree );

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
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.markAsDone', function( node ) { simpleTreeAction( node, 'done', true ); } ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.markAsNew', function( node ) { simpleTreeAction( node, 'done', false ); } ) );
        context.subscriptions.push( vscode.commands.registerCommand( 'remembrall.find', find ) );

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
                else if( e.affectsConfiguration( 'remembrall.showInExplorer' ) )
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
