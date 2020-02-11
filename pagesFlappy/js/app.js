var shell = require('electron').shell; //opening files within the game

var currDir;
var bgy = 0;
var copyPath, copyName;
var fObj;
var sizePrefex;
var moveVel = -300;
var canReset = false;
var sTime, eTime;
var game;
var done = false;


var crateArray = new Array(); //dir contents
var labelArray = new Array(); //Labels
var files, folders, crate, crateLabel; //dir items
var offset = 800; //offset of dir items

var player; //player character
var bgImg; //background image

var cursors, copyKey, deleteKey, accessKey, pauseKey, newFile, newFolder; //control keys
var currMode, currModeTxt; //operation moades

//Most of the game takes place here
class MainScene extends Phaser.Scene {
    constructor() {
        super('sceneMain');
    }

    preload() {
        console.log("preload");
        canReset = false;
        this.load.image('player', './js/img/billyJP.png');
        this.load.image('file', './js/img/fileCrate.png');
        this.load.image('bg', './js/img/bgMoveable.png');
        this.load.image('jpFire', './js/img/billyJPfire.png');
        this.load.image('folder', './js/img/folderCrate.png');
        //keyboard input
        cursors = this.input.keyboard.createCursorKeys();
        deleteKey = this.input.keyboard.addKey('X');
        copyKey = this.input.keyboard.addKey('C');
        accessKey = this.input.keyboard.addKey('Z');
        pauseKey = this.input.keyboard.addKey('P');
        newFile = this.input.keyboard.addKey('N');
        newFolder = this.input.keyboard.addKey('M');
    }

    create() {
        //Single objects
        bgImg = this.add.image(400, bgy, 'bg');
        player = this.physics.add.sprite(100, 245, 'player');
        currModeTxt = this.add.text(16, 16, "", { fontFamily: '"Arial"', size: '32px' });
        changeMode('Accessing'); //default behavior is access on collide
        offset = 800;

        //multiple objects
        for (var i = 0; i < dirItems.length; i++) {
            const y = Phaser.Math.Between(50, 500);
            if (dirItems[i] === 'd') {
                crate = this.physics.add.sprite(offset, y, 'folder');
                crate.name = "Folder";
            }
            if (dirItems[i] === 'f') {
                crate = this.physics.add.sprite(offset, y, 'file');
                crate.name = "File";
            }
            let name = objArr[i].name;
            fObj = fs.statSync(path.join(currDir, name));
            fObj.ctime = new Date(fObj.ctimeMs);
            fObj.mtime = new Date(fObj.mtimeMs);
            const created = (fObj.ctime.getMonth() + 1) + "/" + fObj.ctime.getDate() + "/" + (fObj.ctime.getYear() + 1900);
            const modified = (fObj.atime.getMonth() + 1) + "/" + fObj.atime.getDate() + "/" + (fObj.atime.getYear() + 1900);
            if (fObj.size < 1) {
                fObj.size = "";
                sizePrefex = "";
            } else if (fObj.size > 1000000) {
                fObj.size = fObj.size / 1000000;
                sizePrefex = "MB";
            } else {
                fObj.size = fObj.size / 1000;
                sizePrefex = "KB";
            }
            if (name.length >= 19) name = name.substring(0, 16) + "..."; //concatination
            crateLabel = this.add.text(offset, y, name + "\n" + fObj.size + sizePrefex + "\nCreated: " + created + "\nModified: " + modified, { fontFamily: '"Arial"', size: '24px' });
            labelArray.push(crateLabel);
            crateArray.push(crate);
            offset += 400; //space out crates
            crateArray[i].body.velocity.x = moveVel;
            crateArray[i].body.allowGravity = false; //balloons float
        }
        canReset = true;
    }

    update() {
        if (done) this.scene.pause();
        var redirect = undefined;
        player.x = 100;
        if (player.y < 15) { //"roof" of sorts
            player.body.velocity.y = 0;
            player.y = 15;
        }

        //keyboard events
        if (cursors.up.isDown) jump();
        if (accessKey.isDown) changeMode('Accessing');
        if (copyKey.isDown) changeMode('Copying');
        if (deleteKey.isDown) changeMode('Deleting');
        if (pauseKey.isDown) {
            this.scene.launch('pauseScene');
            this.scene.pause();
        }
        if (newFile.isDown) {
            fs.writeFileSync(path.join(currDir, "aNewFile" + Math.floor(Math.random() * 1000)));
            this.scene.restart(currDir);
        }
        if (newFolder.isDown) {
            fs.mkdirSync(path.join(currDir, "aNewFolder" + Math.floor(Math.random() * 1000)));
            this.scene.restart(currDir);
        }

        for (var i = 0; i < crateArray.length; i++) {
            if (crateArray[i].x < 0) crateArray[i].x = crateArray.length * 400; //looping crates
            labelArray[i].x = crateArray[i].x + 32; //make labels follow crates
            this.physics.collide(player, crateArray[i], function() {
                switch (currMode) {
                    case "Accessing":
                        if (dirItems[i] === "f") {
                            shell.openItem(path.join(currDir, objArr[i].name));
                            bgy -= 50;
                            document.querySelector("#end").style.display = 'block';
                            done = true;
                            calcScore();
                        } else {
                            console.log("Collide!");
                            redirect = path.join(currDir, objArr[i].name);
                        }
                        break;
                    case "Copying":
                        if (!copyPath) {
                            copyPath = path.join(currDir, objArr[i].name);
                            copyName = objArr[i].name;
                        } else if (dirItems[i] === "d") {
                            copy(copyPath, path.join(currDir, objArr[i].name, copyName));
                            copyPath = undefined;
                            copyName = undefined;
                            changeMode("Accessing");
                        } else player.y = 601;
                        break;
                    case "Deleting":
                        delFile(currDir, objArr[i].name);
                        break;
                }
            });
            if (redirect == path.join(currDir, objArr[i].name)) break;
        }

        if (redirect != undefined) {
            console.log("Restarting to " + redirect);
            bgy += 50;
            this.scene.restart(redirect);
        }

        if (player.y > 600 && canReset) {
            console.log(parentOf(currDir));
            if (currDir == os.homedir()) {
                this.scene.restart(os.homedir());
            } else {
                bgy -= 50;
                this.scene.restart(parentOf(currDir)); //off screen
            }
        }
    }

    init(dir) {
        if (typeof(dir) != "string" || dir == "C:") {
            console.log("Not allowed going to home");
            bgy = 0;
            dir = os.homedir();
        }
        crateArray = []; //dir contents
        labelArray = []; //Labels
        dirItems = [];
        currDir = dir;
        console.log(currDir);
        objArr = fs.readdirSync(dir, { withFileTypes: true });
        console.log(objArr);
        for (var i = 0; i < objArr.length; i++) {
            if (objArr[i].isDirectory()) dirItems.push("d");
            else dirItems.push("f");
        }
    }
}

//deals with loading new directory scenes
class StartScene extends Phaser.Scene {
    constructor() {
        super('startScene');
    }

    create() {

        this.scene.start('sceneMain', os.homedir());
    }
}

//Pause screen
class PauseScene extends Phaser.Scene {
    constructor() {
        super('pauseScene');
    }

    preload() {
        pauseKey = this.input.keyboard.addKey('P');
    }

    create() {}

    update() {
        if (pauseKey.isDown) {
            this.scene.resume('sceneMain')
            this.scene.stop();
        }
    }


}

//game info
var config = {
    key: 'game',
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 }
        }
    },
    scene: [MainScene, StartScene, PauseScene]
};

//function outside class as it deals with editing global varfiables
function changeMode(mode) {
    currMode = mode;
    currModeTxt.setText(mode);
}


function reset() {
    player.y = 0;
    this.scene.restart('sceneMain');
}

function jump() {
    player.setTexture('jpFire'); //turn on jetpack
    this.player.body.velocity.y = -350; //upwards velocity
    setTimeout(function() { player.setTexture('player') }, 100); //turn off jetpack
}

function calcScore() {
    let score = new Date().getTime() - sTime;
    console.log(score);
    document.querySelector("#score").innerHTML = Math.floor(score / 100) / 10 + "s";
}

//start game
function newGame() {
    game = new Phaser.Game(config);
    document.querySelector("#menu").style.display = 'none';
    sTime = new Date().getTime();
    console.log(sTime);
}