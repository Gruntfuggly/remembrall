# Remembrall

A simple extension that provides a reorderable, syncable TODO list.

This was created as a simple TODO list organiser, but can be used to store any arbitrary text in a tree. The contents of the tree can be optionally synced with other instances of Code using a github gist.

![screenshot](https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/screenshot.png)

*Note: Sync is done via a secret github gist. These are not public, not discoverable via github, and are not searchable. However, they are not encrypted or protected in any other way. If someone discovers the URL for your gist or you share it with somebody, they will be able to view it's contents. **For this reason, it is recommended that you do not store private or sensitive information in your tree**.*

## Controls

The following buttons are shown on the tree view title bar:

<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/add.png" height="16px" align="center"> Add a new item to the tree<br/>
<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/search.png" height="16px" align="center"> Search the tree. Double click to find the next instance.<br/>
<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/refresh.png" height="16px" align="center"> Refresh the tree<br/>
<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/expand.png" height="16px" align="center"> Expand all the items in the tree<br/>
<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/collapse.png" height="16px" align="center"> Collapse all the items in the tree<br/>

Hovering over or selecting items in the tree will show the following buttons:

<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/arrow-up.png" height="16px" align="center"> Move item up the tree<br/>
<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/arrow-down.png" height="16px" align="center"> Move item down the tree<br/>
<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/make-child.png" height="16px" align="center"> Make the item a child of the item above<br/>
<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/unparent.png" height="16px" align="center"> Move the item out of it's current group<br/>
<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/edit.png" height="16px" align="center"> Modify the text of the item<br/>
<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/trash.png" height="16px" align="center"> Remove the item from the tree<br/>

There is also a context menu providing the following commands:

**Create New Child Item**<br/>
Creates a new item as a child of the selected item.

**Set Icon**<br/>
Change the icon shown in the tree to one from the [octicons](https://octicons.github.com/) set.

**Set Icon Colour**<br/>
Set the colour of the icon shown in the tree.

**Mark As Done/Mark As New**<br/>
Show the item in a smaller font if you want to show it as done, but not delete it yet.

**Move To Top/Move To Bottom**<br/>
Move the selected item to the top or bottom of it's list of siblings.

### Configuration

**remembrall.autoSync** (default: true)<br/>
Normally the extension syncs when Code is started, and whenever the window is activated. If you only want to sync manually (using the Refresh button), set this to false.

**remembrall.confirmRemove** (default: true)<br/>
Set to false to disable the remove item confirmation prompt. *Note: You will still be prompted if the item has children.*

**remembrall.debug** (default: false)<br/>
Create a debug channel in the output view.

**remembrall.defaultIcon**<br/>
Set the default icon to one from the [octicons](https://octicons.github.com/). Used when when creating new items.

**remembrall.doubleClickAction** (default: "Expand/Collapse")<br/>
Set what action to take when double clicking items in the tree.

**remembrall.moveDoneItemsToBottom** (default: true)<br/>
When marking an item as done, move it to the bottom of the list. Set to false to keep the item in the same place in the list.

**remembrall.showCollapsedItemCounts** (default: true)<br/>
If true, collapsed items show a count of the number of children.

**remembrall.showInExplorer** (default: true)<br/>
If true, the view is also shown in the explorer. Set to false if you only want to use the dedicated view in the activity bar.

**remembrall.syncEnabled** (default: false)<br/>
Enable syncing via gist.

**remembrall.syncGistId**<br/>
A github gist ID used to store shared settings.

**remembrall.syncToken**<br/>
A github token to allow sync via gist (*see* [syncing](#syncing) *below*).

**remembrall.viewTitle** (default: "Remembrall")<br/>
Set the title displayed above the tree.

## Syncing

When syncing is enabled, you'll need to provide a github personal access token:

1. Log in to your github account
2. Visit <https://github.com/settings/tokens>
3. Click the **Generate new token** button
4. Enter 'remembrall' in the Note field, select the 'Create gists' checkbox, then click the **Generate token** button.
5. Copy the new personal access token.
6. Paste it into your `remembrall.syncToken` settings.

You can use the same personal access token for each instance of Code that you want to sync, or you can create a new one each time.

If you have already set up sync from another instance of Code, once the token has been set, Remembrall should automatically find the existing gist and sync it. If this is the initial set up, a new gist will be created and populated with your current tree.

### Troubleshooting

If you see `Request failed with status code 401` then your access token is not valid. Ensure that the token has the *Create gists* scope.

If you see `Request failed with status code 404` then the gist can't be found. Try clearing the `remembrall.syncGistId` setting and refreshing the tree.

## Other Commands

**Create From Selection** will create a new item in the tree from any text you have selected in the current editor (or multiple items if you have multiple selections).

**Export** will generate a text file containing the tree contents in JSON format, which can be saved as required.

**Import** will take the contents of the current editor and import them into the tree replacing any existing content.

**Find Next** can be used to find the next occurrence when searching the tree.

## Installing

You can install the latest version of the extension via the Visual Studio Marketplace [here](https://marketplace.visualstudio.com/items?itemName=Gruntfuggly.remembrall).

### Source Code

The source code is available on GitHub [here](https://github.com/Gruntfuggly/remembrall).

## Credits

Icon by [Anton Gerasimenko](http://www.iconarchive.com/artist/anton-gerasimenko.html).

Uses a modified version of [gistore](https://github.com/cwj0417/gistore).
