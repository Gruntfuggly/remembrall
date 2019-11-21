var vscode = require( 'vscode' );
var path = require( 'path' );

var expandedNodes = {};
var nodeCounter = 1;

function uuidv4()
{
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, function( c )
    {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : ( r & 0x3 | 0x8 );
        return v.toString( 16 );
    } );
}

class RememberallDataProvider
{
    constructor( _context )
    {
        this._context = _context;

        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;

        expandedNodes = _context.workspaceState.get( 'rememberall.expandedNodes', {} );

        this.itemNodes = this._context.globalState.get( 'rememberall.items' ) || [];
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

    getIcon( name )
    {
        var icon = {
            dark: this._context.asAbsolutePath( path.join( "resources/icons", "dark", name + ".svg" ) ),
            light: this._context.asAbsolutePath( path.join( "resources/icons", "light", name + ".svg" ) )
        };

        return icon;
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

        if( node.icon )
        {
            treeItem.iconPath = this.getIcon( node.icon );
        }

        if( node.nodes && node.nodes.length > 0 )
        {
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
            if( expandedNodes[ node.uniqueId ] !== undefined )
            {
                treeItem.collapsibleState = ( expandedNodes[ node.uniqueId ] === true ) ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
            }
            else
            {
                treeItem.collapsibleState = ( this._context.workspaceState.get( 'rememberall.expanded' ) ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed );
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
            uniqueId: uuidv4(),
            label: item.label,
            icon: 'rememberall',
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

        this.resetOrder( this.itemNodes );

        this._context.globalState.update( 'rememberall.items', this.itemNodes );
    }

    edit( item, update )
    {
        item.label = update;
        this._context.globalState.update( 'rememberall.items', this.itemNodes );
    }

    remove( node )
    {
        var located = this.locateNode( node );
        located.nodes.splice( located.index, 1 );

        this.resetOrder( this.itemNodes );

        this._context.globalState.update( 'rememberall.items', this.itemNodes );
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
            node.contextValue = '';
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
            node.contextValue += 'canEdit canDelete';
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
        this.itemNodes = this._context.globalState.get( 'rememberall.items' ) || [];
        this.rebuild();
        this.resetOrder( this.itemNodes );
        this._context.globalState.update( 'rememberall.items', this.itemNodes )
        this._onDidChangeTreeData.fire();
        vscode.commands.executeCommand( 'setContext', 'rememberall-tree-has-content', this.itemNodes.length > 0 );
    }

    setExpanded( node, expanded )
    {
        expandedNodes[ node.uniqueId ] = expanded;
        this._context.workspaceState.update( 'rememberall.expandedNodes', expandedNodes );
    }

    clearExpansionState()
    {
        expandedNodes = {};
        this._context.workspaceState.update( 'rememberall.expandedNodes', expandedNodes );
    }

    swap( nodes, firstIndex, secondIndex )
    {
        var temp = nodes[ firstIndex ];
        nodes[ firstIndex ] = nodes[ secondIndex ];
        nodes[ secondIndex ] = temp;
    }

    moveUp( node )
    {
        var located = this.locateNode( node );
        if( located.index !== undefined )
        {
            this.swap( located.nodes, located.index, located.index - 1 );
            this._context.globalState.update( 'rememberall.items', this.itemNodes );
            this.refresh();
        }
    }

    moveDown( node )
    {
        var located = this.locateNode( node );
        if( located.index !== undefined )
        {
            this.swap( located.nodes, located.index, located.index + 1 );
            this._context.globalState.update( 'rememberall.items', this.itemNodes );
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
            this._context.globalState.update( 'rememberall.items', this.itemNodes );
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
            this._context.globalState.update( 'rememberall.items', this.itemNodes );
            this.refresh();
        }
    }
}

exports.RememberallDataProvider = RememberallDataProvider;