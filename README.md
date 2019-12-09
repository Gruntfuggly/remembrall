# Remembrall

This was created as a simple TODO list organiser, but can be used to store any arbitrary text in a tree. The contents of the tree can be optionally synced with other instances of Code using a github gist.

<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/screenshot.png">

Note:
The following buttons are shown on the tree view title bar:

<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/add.svg?sanitize=true" height="16px" align="center"> Add a new item to the tree<br/>
<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/refresh.svg?sanitize=true" height="16px" align="center"> Refresh the tree<br/>
<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/expand.svg?sanitize=true" height="16px" align="center"> Expand all the items in the tree<br/>
<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/collapse.svg?sanitize=true" height="16px" align="center"> Collapse all the items in the tree<br/>

Hovering over or selecting items in the tree will show the following buttons:

<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/arrow-up.svg?sanitize=true" height="16px" align="center"> Move item up the tree<br/>
<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/arrow-down.svg?sanitize=true" height="16px" align="center"> Move item down the tree<br/>
<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/make-child.svg?sanitize=true" height="16px" align="center"> Make the item a child of the item above<br/>
<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/unparent.svg?sanitize=true" height="16px" align="center"> Move the item out of it's current group<br/>
<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/edit.svg?sanitize=true" height="16px" align="center"> Modify the text of the item<br/>
<img src="https://raw.githubusercontent.com/Gruntfuggly/remembrall/master/resources/icons/light/trash.svg?sanitize=true" height="16px" align="center"> Remove the item from the tree<br/>

The icon shown in the tree can be changed to an icon from the [octicons](https://octicons.github.com/) set.

### Configuration

**remembrall.debug** (default: false)<br/>
Create a debug channel in the output view.

**remembrall.showInExplorer** (default: true)<br/>
Show the view in the explorer. Set to false if you only want to use the dedicated view in the activity bar.

**remembrall.confirmRemove** (default: true)<br/>
Set to false to disable the remove confirmation prompt.

**remembrall.syncEnabled** (default: false)<br/>
Enable syncing via gist.

**remembrall.syncToken**<br/>
A github token to allow sync via gist.

**remembrall.syncGistId**<br/>
A github gist ID used to store shared settings.

## Commands

**Create From Selection** will create a new item in the tree from any text you have selected in the current editor (or multiple items if you have multiple selections).

**Mark As Done** will subsequently show the item in a smaller font

**Mark As New** will revert the **Mark As Done** command

**Export** will generate a text file containing the tree contents in JSON format, which can be saved as required.

**Import** will take the contents of the current editor and import them into the tree replacing any existing content.

## Installing

You can install the latest version of the extension via the Visual Studio Marketplace [here](https://marketplace.visualstudio.com/items?itemName=Gruntfuggly.remembrall).

### Source Code

The source code is available on GitHub [here](https://github.com/Gruntfuggly/remembrall).

## Credits

Icon by [Anton Gerasimenko](http://www.iconarchive.com/artist/anton-gerasimenko.html).
