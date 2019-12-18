var vscode = require( 'vscode' );
var icons = require( './icons' );
var utils = require( './utils' );

var expandedNodes = {};
var nodeCounter = 1;

class RemembrallDataProvider
{
    constructor( _context, onTreeRefreshed )
    {
        this._context = _context;
        this.onTreeRefreshed = onTreeRefreshed;

        this.collapsedNodes = 0;
        this.expandedNodes = 0;
        this.nodesToGet = 0;

        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;

        expandedNodes = _context.workspaceState.get( 'remembrall.expandedNodes', {} );

        this.fetchNodes();
    }

    fetchNodes()
    {
        try
        {
            var nodeData = this._context.globalState.get( 'remembrall.items' );
            this.itemNodes = JSON.parse( nodeData );
        }
        catch( e )
        {
            this.itemNodes = [];
        }
    }

    storeNodes()
    {
        var nodeData = JSON.stringify( utils.cleanNodes( this.itemNodes ) );
        this._context.globalState.update( 'remembrall.items', nodeData );
        this._onDidChangeTreeData.fire();
    }

    setOutputChannel( outputChannel )
    {
        this.outputChannel = outputChannel;
    }

    debug( text )
    {
        if( this.outputChannel )
        {
            this.outputChannel.appendLine( text );
        }
    }

    hasContent()
    {
        return this.itemNodes.length > 0;
    }

    getChildren( node )
    {
        if( !node )
        {
            if( this.itemNodes.length > 0 )
            {
                this.nodesToGet += this.itemNodes.length;
                return this.itemNodes;
            }
            return undefined;
        }
        else if( node.nodes )
        {
            this.nodesToGet += node.nodes.length;
            return node.nodes;
        }
    }

    getParent( node )
    {
        return node.parent;
    }

    getTreeItem( node )
    {
        var treeItem = new vscode.TreeItem( node.label );

        treeItem.id = nodeCounter++;
        treeItem.tooltip = node.tooltip;

        treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;

        if( node.done )
        {
            treeItem.description = node.label;
            treeItem.label = "";
        }

        treeItem.iconPath = icons.getIcon( this._context, node.icon, node.iconColour );

        if( node.nodes && node.nodes.length > 0 )
        {
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
            if( expandedNodes[ node.uniqueId ] !== undefined )
            {
                treeItem.collapsibleState = ( expandedNodes[ node.uniqueId ] === true ) ?
                    vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
            }
            else
            {
                treeItem.collapsibleState = this._context.workspaceState.get( 'remembrall.expandAll' ) ?
                    vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
            }

            if( treeItem.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed )
            {
                this.collapsedNodes++;
            }
            if( treeItem.collapsibleState === vscode.TreeItemCollapsibleState.Expanded )
            {
                this.expandedNodes++;
            }
        }

        treeItem.contextValue = node.contextValue;

        this.nodesToGet--;
        if( this.nodesToGet === 0 && this.onTreeRefreshed )
        {
            this.onTreeRefreshed();
        }
        return treeItem;
    }

    clear()
    {
        this.itemNodes = [];
    }

    locateNode( node )
    {
        var nodes = node.parent ? node.parent.nodes : this.itemNodes;
        var index = nodes.map( function( e ) { return e.uniqueId; } ).indexOf( node.uniqueId );
        return { nodes: nodes, index: index };
    }

    add( item, selectedNode, callback )
    {
        var itemNode = {
            id: nodeCounter++,
            uniqueId: utils.uuidv4(),
            label: item.label,
            done: false,
            icon: vscode.workspace.getConfiguration( 'remembrall' ).get( 'defaultIcon' ),
            nodes: []
        };

        if( selectedNode )
        {
            var located = this.locateNode( selectedNode );
            located.nodes.splice( located.index + 1, 0, itemNode );
        }
        else
        {
            this.itemNodes.push( itemNode );
        }

        this.rebuild();
        this.resetOrder( this.itemNodes );
        this.storeNodes();

        if( callback )
        {
            callback( itemNode );
        }
    }

    addChild( item, parentNode, callback )
    {
        var itemNode = {
            id: nodeCounter++,
            uniqueId: utils.uuidv4(),
            label: item.label,
            done: false,
            nodes: [],
            icon: vscode.workspace.getConfiguration( 'remembrall' ).get( 'defaultIcon' ),
            parent: parentNode,
        };

        parentNode.nodes.unshift( itemNode );

        this.rebuild();
        this.resetOrder( this.itemNodes );
        this.storeNodes();

        if( callback )
        {
            callback( itemNode );
        }
    }

    remove( node )
    {
        var located = this.locateNode( node );
        located.nodes.splice( located.index, 1 );

        this.resetOrder( this.itemNodes );

        this.storeNodes();
    }

    rebuild( nodes, parent )
    {
        if( nodes === undefined )
        {
            nodes = this.itemNodes;
            this.collapsedNodes = 0;
            this.expandedNodes = 0;
            this.totalNodes = 0;
        }
        nodes.forEach( function( node )
        {
            node.id = nodeCounter++;
            if( !node.uniqueId )
            {
                node.uniqueId = utils.uuidv4();
            }
            node.contextValue = '';
            if( node.done )
            {
                node.contextValue += ' canMarkAsNew';
            }
            else
            {
                node.contextValue += ' canMarkAsDone';
            }
            if( parent )
            {
                node.parent = parent;
                node.contextValue += ' canUnparent';
            }
            if( node.nodes )
            {
                this.rebuild( node.nodes, node );
            }
        }, this );
    }

    resetOrder( nodes )
    {
        nodes = nodes.map( function( node, index )
        {
            node.contextValue += 'canEdit canDelete canSetIcon canAddChild';
            if( index !== 0 )
            {
                node.contextValue += ' canMoveUp canParent';
            }
            if( index < nodes.length - 1 )
            {
                node.contextValue += ' canMoveDown';
            }
            if( node.nodes )
            {
                this.resetOrder( node.nodes );
            }
            return node;
        }, this );
    }

    refresh( callback )
    {
        this.fetchNodes();
        this.rebuild();
        this.resetOrder( this.itemNodes );
        this._onDidChangeTreeData.fire();
        vscode.commands.executeCommand( 'setContext', 'remembrall-tree-has-content', this.itemNodes.length > 0 );
        if( callback )
        {
            callback();
        }
    }

    setExpanded( node, expanded, callback )
    {
        expandedNodes[ node.uniqueId ] = expanded;
        this.expandedNodes += expanded ? +1 : -1;
        this.collapsedNodes += expanded ? -1 : +1;
        this._context.workspaceState.update( 'remembrall.expandedNodes', expandedNodes );
        if( callback )
        {
            callback();
        }
    }

    clearExpansionState( callback )
    {
        expandedNodes = {};
        this._context.workspaceState.update( 'remembrall.expandedNodes', expandedNodes ).then( function()
        {
            callback();
        } );
    }

    swap( nodes, firstIndex, secondIndex )
    {
        var temp = nodes[ firstIndex ];
        nodes[ firstIndex ] = nodes[ secondIndex ];
        nodes[ secondIndex ] = temp;
    }

    move( node, offset, callback )
    {
        var located = this.locateNode( node );
        if( located.index !== undefined )
        {
            this.swap( located.nodes, located.index, located.index + offset );
            this.storeNodes();
            this.refresh( callback );
        }
    }

    moveTo( node, end, callback )
    {
        var located = this.locateNode( node );
        if( located.index !== undefined )
        {
            located.nodes.splice( end === -1 ? 0 : located.nodes.length - 1, 0, located.nodes.splice( located.index, 1 )[ 0 ] );
            this.storeNodes();
            this.refresh( callback );
        }
    }

    makeChild( node )
    {
        var located = this.locateNode( node );
        if( located.index !== undefined )
        {
            var parent = located.nodes[ located.index - 1 ];
            var child = located.nodes.splice( located.index, 1 );
            child.parent = parent;
            parent.nodes.push( child[ 0 ] );
            this.storeNodes();
            this.refresh();
        }
    }

    unparent( node )
    {
        var located = this.locateNode( node );
        if( located.index !== undefined )
        {
            var parent = node.parent;
            var grandparent = parent.parent;
            var child = located.nodes.splice( located.index, 1 )[ 0 ];
            child.parent = grandparent ? grandparent : undefined;
            var parentNodes = grandparent ? grandparent.nodes : this.itemNodes;
            var parentIndex = parentNodes.map( function( e ) { return e.uniqueId; } ).indexOf( parent.uniqueId );
            parentNodes.splice( parentIndex + 1, 0, child );
            this.storeNodes();
            this.refresh();
        }
    }

    find( text, callback, notFound, instance )
    {
        var result = { found: false };

        this.doFind( result, text, callback, instance, this.itemNodes );

        if( result.found === false )
        {
            if( callback )
            {
                if( result.firstInstance )
                {
                    callback( result.firstInstance, true );
                }
                else if( notFound )
                {
                    notFound();
                }
            }
        }
    }

    doFind( result, text, callback, instance, nodes )
    {
        var searchTerm = text.toLowerCase();

        nodes.forEach( function( node )
        {
            if( !result.found && node.label.toLowerCase().indexOf( searchTerm ) !== -1 )
            {
                if( instance < 1 )
                {
                    callback( node, false );
                    result.found = true;
                }
                else
                {
                    if( !result.firstInstance )
                    {
                        result.firstInstance = node;
                    }
                    instance--;
                }
            }
            if( !result.found && node.nodes )
            {
                this.doFind( result, text, callback, instance, node.nodes );
            }
        }, this );

        return result;
    }

    numberOfCollapsedNodes()
    {
        return this.collapsedNodes;
    }

    numberOfExpandedNodes()
    {
        return this.expandedNodes;
    }
}

exports.RemembrallDataProvider = RemembrallDataProvider;
