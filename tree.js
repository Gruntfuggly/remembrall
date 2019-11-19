var vscode = require( 'vscode' );
var path = require( 'path' );

var itemNodes = [];
var expandedNodes = {};
var buildCounter = 1;
var nodeCounter = 1;

var ITEM = "ITEM";
var REMINDER = "REMINDER";

var isVisible = function( node )
{
    return node.visible === true;
};

function newNodeId()
{
    return ( buildCounter * 1000000 ) + nodeCounter++;
}

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
            var roots = itemNodes.filter( function( n ) { return n.visible; } );
            if( roots.length > 0 )
            {
                return roots;
            }
            return [ { label: "Nothing found" } ];
        }
        // else if( node.type === DATE )
        // {
        //     return node.nodes.filter( function( n ) { return n.visible; } );
        // }
        // else if( node.type === EVENT )
        // {
        //     var children = node.nodes.filter( function( n ) { return n.visible; } );
        //     if( children.length > 0 )
        //     {
        //         return children;
        //     }
        //     return node.text;
        // }
        // else if( node.type === DETAILS )
        // {
        //     return node.text;
        // }
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

        treeItem.id = node.id;
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
            id: newNodeId(),
            visible: true,
            icon: 'rememberall'
        };

        itemNodes.push( itemNode );

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
            node.id = newNodeId();
            if( node.nodes )
            {
                this.rebuild( node.nodes );
            }
        }, this );
    }

    refresh()
    {
        buildCounter += 1;
        nodeCounter = 1;
        itemNodes = this._context.globalState.get( 'rememberall.items' ) || [];
        this.rebuild();
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

    filter( term, nodes )
    {
        var matcher = new RegExp( term, 'i' );

        if( nodes === undefined )
        {
            nodes = itemNodes;
        }
        nodes.forEach( function( node )
        {
            var match = matcher.test( node.label );

            if( !match && node.nodes )
            {
                this.filter( term, node.nodes );
                node.visible = node.nodes.filter( isVisible ).length > 0;
            }
            else
            {
                node.visible = !term || match;
            }
        }, this );
    }

    clearFilter( nodes )
    {
        if( nodes === undefined )
        {
            nodes = itemNodes;
        }
        nodes.forEach( function( node )
        {
            node.visible = true;
            if( node.nodes )
            {
                this.clearFilter( node.nodes );
            }
        }, this );
    }

}
exports.RememberallDataProvider = RememberallDataProvider;