var vscode = require( 'vscode' );
var icons = require( './icons' );
var utils = require( './utils' );

var expandedNodes = {};
var nodeCounter = 1;

class RemembrallDataProvider
{
    constructor( _context )
    {
        this._context = _context;

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
                return this.itemNodes;
            }
            return [ { label: "Click + to add new items..." } ];
        }
        else if( node.nodes )
        {
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

        treeItem.iconPath = icons.getIcon( this._context, node.icon );

        if( node.nodes && node.nodes.length > 0 )
        {
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
            if( expandedNodes[ node.uniqueId ] !== undefined )
            {
                treeItem.collapsibleState = ( expandedNodes[ node.uniqueId ] === true ) ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
            }
            else
            {
                treeItem.collapsibleState = ( this._context.workspaceState.get( 'remembrall.expanded' ) ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed );
            }
        }

        treeItem.contextValue = node.contextValue;

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

    add( item, selectedNode )
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

        return itemNode;
    }

    addChild( item, parentNode )
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

        parentNode.nodes.push( itemNode );

        this.rebuild();
        this.resetOrder( this.itemNodes );
        this.storeNodes();

        return itemNode;
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

    refresh()
    {
        this.fetchNodes();
        this.rebuild();
        this.resetOrder( this.itemNodes );
        this._onDidChangeTreeData.fire();
        vscode.commands.executeCommand( 'setContext', 'remembrall-tree-has-content', this.itemNodes.length > 0 );
    }

    setExpanded( node, expanded )
    {
        expandedNodes[ node.uniqueId ] = expanded;
        this._context.workspaceState.update( 'remembrall.expandedNodes', expandedNodes );
    }

    clearExpansionState()
    {
        expandedNodes = {};
        this._context.workspaceState.update( 'remembrall.expandedNodes', expandedNodes );
    }

    swap( nodes, firstIndex, secondIndex )
    {
        var temp = nodes[ firstIndex ];
        nodes[ firstIndex ] = nodes[ secondIndex ];
        nodes[ secondIndex ] = temp;
    }

    move( node, offset )
    {
        var located = this.locateNode( node );
        if( located.index !== undefined )
        {
            this.swap( located.nodes, located.index, located.index + offset );
            this.storeNodes();
            this.refresh();
        }
    }

    moveTo( node, end )
    {
        var located = this.locateNode( node );
        if( located.index !== undefined )
        {
            this.swap( located.nodes, located.index, end === -1 ? 0 : located.nodes.length - 1 );
            this.storeNodes();
            this.refresh();
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
}

exports.RemembrallDataProvider = RemembrallDataProvider;