const { app, BrowserWindow } = require('electron')

function createWindow () {
  // Create the browser window.
  let win = new BrowserWindow({ width: 685, height: 560 })

  // and load the index.html of the app.
  win.loadFile(`pagesFlappy/index.html`)
}

app.on('ready', createWindow)
