var vscode = require( 'vscode' );
var path = require( 'path' );

var expandedNodes = {};
var nodeCounter = 1;

var ITEM = "ITEM";

class RememberallDataProvider
{
    constructor( _context, outputChannel )
    {
        this._context = _context;
        this.outputChannel = outputChannel;

        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;

        expandedNodes = _context.workspaceState.get( 'rememberall.expandedNodes', {} );

        this.itemNodes = this._context.globalState.get( 'rememberall.items' ) || [];
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
            return [ { label: "Nothing found" } ];
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

        console.log( "getTreeItem:" + node.label + " nodes:" + ( node.nodes && node.nodes.length ) );
        if( node.nodes && node.nodes.length > 0 )
        {
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
            var nodeId = node.startDate + ( node.endDate ? node.endDate : "" );
            if( expandedNodes[ nodeId ] !== undefined )
            {
                treeItem.collapsibleState = ( expandedNodes[ nodeId ] === true ) ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
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

    add( item )
    {
        var itemNode = {
            type: ITEM,
            label: item.label,
            icon: 'rememberall',
            nodes: []
        };

        this.itemNodes.push( itemNode );

        this.resetOrder( this.itemNodes );

        this._context.globalState.update( 'rememberall.items', this.itemNodes );
    }

    edit( item, update )
    {
        this.itemNodes.forEach( function( node, index )
        {
            if( node.id === item.id )
            {
                this[ index ].label = update;
            }
        }, this.itemNodes );

        this._context.globalState.update( 'rememberall.items', this.itemNodes );
    }

    remove( item )
    {
        this.itemNodes = this.itemNodes.filter( function( node )
        {
            return node.id !== item.id;
        } );

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
            node.contextValue = node.contextValue || '';
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
            node.contextValue = node.contextValue || ''
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
        nodeCounter = this._context.globalState.get( 'rememberall.nodeCounter' ) || 1;
        this.itemNodes = this._context.globalState.get( 'rememberall.items' ) || [];
        this.resetOrder( this.itemNodes );
        this.rebuild();
        this._context.globalState.update( 'rememberall.nodeCounter', nodeCounter )
        this._context.globalState.update( 'rememberall.items', this.itemNodes )
        this._onDidChangeTreeData.fire();
        vscode.commands.executeCommand( 'setContext', 'rememberall-tree-has-content', this.itemNodes.length > 0 );
    }

    setExpanded( node, expanded )
    {
        var nodeId = node.startDate + ( node.endDate ? node.endDate : "" );
        expandedNodes[ nodeId ] = expanded;
        this._context.workspaceState.update( 'rememberall.expandedNodes', expandedNodes );
    }

    clearExpansionState()
    {
        expandedNodes = {};
        this._context.workspaceState.update( 'rememberall.expandedNodes', expandedNodes );
    }

    moveUp( node )
    {
        var nodes = node.parent ? node.parent.nodes : this.itemNodes;
        var index = nodes.map( function( e ) { return e.id; } ).indexOf( node.id );
        var temp = nodes[ index ];
        nodes[ index ] = nodes[ index - 1 ];
        nodes[ index - 1 ] = temp;
        this._context.globalState.update( 'rememberall.items', this.itemNodes );
        this.refresh();
    }

    moveDown( node )
    {
        var nodes = node.parent ? node.parent.nodes : this.itemNodes;
        var index = nodes.map( function( e ) { return e.id; } ).indexOf( node.id );
        var temp = nodes[ index ];
        nodes[ index ] = this.itemNodes[ index + 1 ];
        nodes[ index + 1 ] = temp;
        this._context.globalState.update( 'rememberall.items', this.itemNodes );
        this.refresh();
    }

    makeChild( node )
    {
        var nodes = node.parent ? node.parent.nodes : this.itemNodes;
        var index = nodes.map( function( e ) { return e.id; } ).indexOf( node.id );
        var parent = nodes[ index - 1 ];
        var child = nodes.splice( index, 1 );
        child.parent = parent;
        parent.nodes.push( child[ 0 ] );
        this._context.globalState.update( 'rememberall.items', this.itemNodes );
        this.refresh();
    }

    unparent( node )
    {
        var nodes = node.parent ? node.parent.nodes : this.itemNodes;
        var index = nodes.map( function( e ) { return e.id; } ).indexOf( node.id );
        var parent = node.parent;
        var grandparent = parent.parent;
        var child = nodes.splice( index, 1 );
        if( grandparent )
        {
            child.parent = grandparent;
            var parentIndex = grandparent.nodes.map( function( e ) { return e.id; } ).indexOf( parent.id );
            grandparent.nodes.splice( parentIndex + 1, 0, child[ 0 ] );
        }
        else
        {
            child.parent = undefined;
            var parentIndex = this.itemNodes.map( function( e ) { return e.id; } ).indexOf( parent.id );
            this.itemNodes.splice( parentIndex + 1, 0, child[ 0 ] );
        }
        this._context.globalState.update( 'rememberall.items', this.itemNodes );
        this.refresh();
    }
}

exports.RememberallDataProvider = RememberallDataProvider;