var vscode = require( 'vscode' );
var path = require( 'path' );

var itemNodes = [];
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

        itemNodes = this._context.globalState.get( 'rememberall.items' ) || [];
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
        return itemNodes.length > 0;
    }

    getChildren( node )
    {
        if( !node )
        {
            if( itemNodes.length > 0 )
            {
                return itemNodes;
            }
            return [ { label: "Nothing found" } ];
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
        itemNodes = [];
    }

    add( item )
    {
        var itemNode = {
            type: ITEM,
            label: item.label,
            icon: 'rememberall',
            contextValue: 'canEdit canDelete canMoveUp',
        };

        itemNodes.push( itemNode );

        this.resetOrder();

        this._context.globalState.update( 'rememberall.items', itemNodes );
    }

    edit( item, update )
    {
        itemNodes.forEach( function( node, index )
        {
            if( node.id === item.id )
            {
                this[ index ].label = update;
            }
        }, itemNodes );

        this._context.globalState.update( 'rememberall.items', itemNodes );
    }

    remove( item )
    {
        itemNodes = itemNodes.filter( function( node )
        {
            return node.id !== item.id;
        } );

        this.resetOrder();

        this._context.globalState.update( 'rememberall.items', itemNodes );
    }

    rebuild( nodes )
    {
        if( nodes === undefined )
        {
            nodes = itemNodes;
        }
        nodes.forEach( function( node )
        {
            node.id = nodeCounter++;
            if( node.nodes )
            {
                this.rebuild( node.nodes );
            }
        }, this );
    }

    resetOrder()
    {
        var oldNodes = itemNodes;
        itemNodes = oldNodes.map( function( item, index )
        {
            item.contextValue = 'canEdit canDelete';
            if( index !== 0 )
            {
                item.contextValue += ' canMoveUp';
            }
            if( index < oldNodes.length - 1 )
            {
                item.contextValue += ' canMoveDown';
            }
            return item;
        } );
    }

    refresh()
    {
        nodeCounter = this._context.globalState.get( 'rememberall.nodeCounter' ) || 1;
        itemNodes = this._context.globalState.get( 'rememberall.items' ) || [];
        this.resetOrder();
        this.rebuild();
        this._context.globalState.update( 'rememberall.nodeCounter', nodeCounter )
        this._onDidChangeTreeData.fire();
        vscode.commands.executeCommand( 'setContext', 'rememberall-tree-has-content', itemNodes.length > 0 );
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
        var index = itemNodes.map( function( e ) { return e.id; } ).indexOf( node.id );
        var temp = itemNodes[ index ];
        itemNodes[ index ] = itemNodes[ index - 1 ];
        itemNodes[ index - 1 ] = temp;
        this.resetOrder();
        this.rebuild();
        this._context.globalState.update( 'rememberall.items', itemNodes );
        this._context.globalState.update( 'rememberall.nodeCounter', nodeCounter )
        this._onDidChangeTreeData.fire();
    }

    moveDown( node )
    {
        var index = itemNodes.map( function( e ) { return e.id; } ).indexOf( node.id );
        var temp = itemNodes[ index ];
        itemNodes[ index ] = itemNodes[ index + 1 ];
        itemNodes[ index + 1 ] = temp;
        this.resetOrder();
        this.rebuild();
        this._context.globalState.update( 'rememberall.items', itemNodes );
        this._context.globalState.update( 'rememberall.nodeCounter', nodeCounter )
        this._onDidChangeTreeData.fire();
    }
}

exports.RememberallDataProvider = RememberallDataProvider;