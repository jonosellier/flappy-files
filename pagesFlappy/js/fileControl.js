var fs = require('fs');
var path = require('path');
var os = require('os');
var systemFuckable = true; //deletion safety switch
var startPath = os.homedir();
var copySrc;
var copyDest;
var dirItems = new Array();
let objArr = new Array();

function read(dir){
    console.log(os.homedir());
    let currDir = dir;
    console.log(currDir);
    fs.readdir(dir, (err, items) => {
        if(err) console.log(err);
        console.log(items);
        for (var i = 0; i < items.length; i++) {
            const obj = path.parse(items[i]);
            fs.stat(path.join(currDir,items[i]), function(err, stat){
                if(err) console.log(err);
                if(stat.isDirectory()){
                    obj.ext = "📂"; //changes folder extensions to folder emoji because emojis can't be used in flesystem
                    console.log("Folder found");
                    dirItems.push('d');
                } else {
                    console.log("File found");
                    dirItems.push('f');
                }
                console.log(obj);
                objArr.push(obj);
            });
            obj.dir=path.join(currDir,items[i]);
        }
        console.log(objArr);
        localStorage.setItem("dir", objArr);
        localStorage.setItem("crateKey", dirItems);
    });
}

const copy = (sPath, dPath) => {
    fs.copyFile(sPath, dPath, function(err){
        console.log("Error: "+err);
    });
}

function parentOf(d){
        let temp = d.split(path.sep);
        temp.pop();
        return temp.join(path.sep);
}

const delFile = (currDirectory,delItem) => {
    if(systemFuckable) fs.rename(path.join(currDirectory,delItem), path.join(__dirname,"delItems",delItem), function(err){
        if(err) throw err;
    });
    else console.log("System in safemode");
}
