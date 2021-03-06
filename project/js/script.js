/**
 *  Game Constants
 * 
 */ 
// dimensions
const COLS = 80;
const ROWS = 60;
const TILE_DIM = 10;

const DEBUG = true;

const OUTER_LIMIT = 3;

const SHADOW_CODE = 0;
const VISIBLE_CODE = 1;

const WALL_CODE = 0;
const FLOOR_CODE = 1;
const PLAYER_CODE = 2;
const ENEMY_CODE = 3;
const POTION_CODE = 4;
const WEAPON_CODE = 5;
const RELIC_CODE = 6;

const POTIONS = [10, 20, 30, 40, 50];

// possible health that enemies can have
const ENEMIES_HEALTH = [30, 30, 30, 30, 40, 40, 60, 80];

// possible damage thatxenemies can inflict
const ENEMIES_DAMAGE = [30, 30, 30, 30, 40, 40, 60, 80];

const POINTS_PER_LEVEL = 100;

// the visible area
const VISIBILITY = 3;

const TOTAL_ENEMIES = 15;
const STARTING_POTIONS_AMOUNT = 10;
const STARTING_WEAPONS_AMOUNT = 10;

const TILE_COLORS = [
   // wall
   'grey',
   // floor
   'white',
   // player
   'blue',
   // enemy
   'red',
   // health drop
   'green',
   // weapon
   'orange',

   // relic
   '#a117f2'
];


/**
 * Classes 
 */

/**
 * Creates a new player. 
 * @class
 * 
 * @property {number} level - starts at one and progresses
 * @property {number} health - keep this above zero
 * @property {string} weapon - ties to an object with a damage rating
 * @property {object} coords - location on the grid
 * @property {number} xp - experience points
 * @property {relics} relics - relics collected
 */
class Player {
   constructor(level, health, weapon, coords, xp, relics) {
      this.level = level;
      this.health = health;
      this.weapon = weapon;
      this.coords = coords;
      this.relics = relics;
      this.xp = xp;
   }
}

/**
 * Creates a new enemy. 
 * @class
 * 
 * @property {Number} health
 * @property {Object} coords
 * @property {Number} damage
 */
class Enemy {
   constructor(health, coords, damage) {
      this.health = health;
      this.coords = coords;
      this.damage = damage;
   }
}






/**
 * Constants
 */
const WEAPONS = [{
      name: "Dagger",
      damage: 15
   },
   {
      name: "Sword",
      damage: 30
   },
   {
      name: "Hammer",
      damage: 60
   },
   {
      name: "Axe",
      damage: 100
   }
];

// game object

/**
 * 
 * @param {Sring} label - the visible label of the stat
 * @param {HTMLElement} container - the parent container we add it to
 */
function addStat(label, container) {
   let el = document.createElement('li');
   let id = label.toLowerCase();
   let value = '0';
   el.innerHTML = `<label>${label}</label>: <span id="${id}" ${value}></span>`
   container.appendChild(el);
   return container;
}

function createDOM() {

   let container = document.getElementById('container');

   let hud = document.createElement('ul');

   hud.id = 'hud';

   let labels = ['XP', 'Level', 'Health', 'Weapon', 'Damage', 'Enemies','Relics'];

   for (var label of labels) {
      hud = addStat(label, hud);
   }
   container.appendChild(hud);

   // add canvas
   let canvas = document.createElement('canvas');
   canvas.id = 'grid';


   canvas.height = ROWS * TILE_DIM;
   canvas.width = COLS * TILE_DIM;

   container.appendChild(canvas);
}



/**
 *  HTML5 Canvas
 */
var game = null;
var player = null;

function init() {
   createDOM();
   game = new Game();
   game.canvas = document.getElementById("grid");
   game.context = game.canvas.getContext("2d");
   startGame();
   addKeyboardListener();

}
init();


/**
 * Start Game
 */


function startGame() {

  let ready = sequentialRooms();

  if (ready) {
     generatePlayer();
     generateItems(STARTING_WEAPONS_AMOUNT, WEAPON_CODE);
     generateItems(STARTING_POTIONS_AMOUNT, POTION_CODE);
     generateEnemies(TOTAL_ENEMIES);
     updateStats();
     drawMap(0, 0, COLS, ROWS);
     //labelRooms();
     console.log('enemies: '+ game.enemies.length);
  }
}
function labelRooms() {
   game.context.fillStyle ='black';
   game.context.font = '15px Arial';
   game.rooms.forEach(function(room) {

      let txt = `r${room.id} (${room.start.x},${room.start.y})`;

      game.context.fillText(txt, (room.start.x+1)*TILE_DIM, room.center.y*TILE_DIM);
   });
}


   

/**
 * Randomly generates a set of dimensions.
 * 
 */
function genDim(baseDim, added, roomType) {
   const BASE_DIM = baseDim || 6;

   let width, height;

   width = height = BASE_DIM;

   const EXTRA_RANGE = 5;

   let additional = added || Math.round(Math.random() * EXTRA_RANGE);

   if (!roomType) {
      roomType = Math.random() < 0.5 ? 'tall' : 'wide';
   } 

   if (roomType == 'tall') {
      height += additional;
   } else {
      width += additional;
   }
   return {
      width,
      height
   };
}

/**
 * 
 * @param {Object} center
 * @param {Number} height
 * @param {Number} width
 * 
 */
function setRoomCoords(center, width, height) {


   let halfW = Math.round(width / 2);
   let halfH = Math.round(height / 2);

   let start = {
      x: center.x - halfW,
      y: center.y - halfH
   };

   let end = {
      x: center.x + halfW,
      y: center.y + halfH
   };

   return {
      start,
      end
   };
}
/**
 * Generates one room based on a center point.
 * @param {Object} center {x,y}
 */
function generateRoom(center, width, height) {

   // get coordinates based on width and height
   let { start, end } = setRoomCoords(center, width, height);

   let room = new Room(center, start, end);

   room.id = game.curRoomId;

   return room;

}

function addRoom(coords, baseDim, additional, roomType) {

   let { width, height} = genDim(baseDim, additional, roomType);

   const genCenterCoord = (maxCells, dim) => {
      // get limit on either side based on outer limit and a room dimension - width or height
      let limit = OUTER_LIMIT + Math.round(dim / 2);

      // get range based on cells in array - limit on either side.
      let range = maxCells - 2 * limit;

      // get a random  number within 
      return limit + Math.round(Math.random() * range);
   }

   coords = coords || {
      x: genCenterCoord(COLS, width),
      y: genCenterCoord(ROWS, height)
   }

   let room = generateRoom(coords, width, height);

   for (var gameRoom of game.rooms) {

      if (room.overlaps(gameRoom, 1)) {
         return null;
      }

   }

   game.curRoomId++;
   game.roomToMap(room);
   game.rooms.push(room);
   return room;

}

/**
 * Generates a series of map rooms
 * 
 */


function generateMapRooms() {

   game.resetMap();

   let maxSeqLen = 30;

   for (var i = 0; i < maxSeqLen; ++i) {
      addRoom();
   }
   let success = false;

   const min = 3;

   for (var room of game.rooms) {

      success = room.findFacingRooms(min);

      // make diagonal-only? 
      success = room.nearestNeighbor();
 
   }
   for (var myRoom of game.rooms) {

     let {numConnected, numDisc} = myRoom.connectRemaining();

     console.log(`Room${room.id} conected ${numConnected} out of ${numDisc} disconnected rooms`);
   }
}

function printNeighbors() {
   for (var room of game.rooms) {
      let ids = room.neighbors.map(x => x.id);

   }
}
/**
 * The generate map function
 * 
 * This algorithmm starts in the center and works its way outward.
 */
function generateMapTunnels() {

   // set up total number of tiles used
   // and the total number of penalties made
   game.resetMap();


   let pos = {
      x: COLS / 2,
      y: ROWS / 2
   };

   const ATTEMPTS = 30000;
   const MAX_PENALTIES_COUNT = 1000;
   const MINIMUM_TILES_AMOUNT = 1000;

   const randomDirection = () => Math.random() <= 0.5 ? -1 : 1;

   let tiles = 0,
      penalties = 0;

   for (var i = 0; i < ATTEMPTS; i++) {

      // choose an axis to dig on.
      let axis = Math.random() <= 0.5 ? 'x' : 'y';

      // get the number of rows or columns, depending on the axis.
      let numCells = axis == 'x' ? COLS : ROWS;

      // choose the positive or negative direction.
      pos[axis] += randomDirection();

      // if we are on the far left or far right, find another value.

      // we don't want to dig here so let's find a way to get out
      while (pos[axis] < OUTER_LIMIT || pos[axis] >= numCells - OUTER_LIMIT) {

         pos[axis] += randomDirection();

         penalties++;

         if (penalties > MAX_PENALTIES_COUNT) {

            // if we have used up our tiles, we're done.
            if (tiles >= MINIMUM_TILES_AMOUNT) {
               return;
            }
            // bring coords back to center
            pos.x = COLS / 2;
            pos.y = ROWS / 2;
         }
      }

      let {
         x,
         y
      } = pos;

      // if not a floor, make this a floor
      if (game.map[y][x] != FLOOR_CODE) {

         game.map[y][x] = FLOOR_CODE;
         // we use up a tile.
         tiles++;
      }
      penalties = 0;

   } // end the large loop
}

/**
 * @param {Number} quantity - the number of items to generate
 * @param {Number} tileCode - corresponds to a constant, such as POTION_CODE.
 *                            used to index into the TILE_COLORS array
 */
function generateItems(quantity, tileCode) {
   for (var i = 0; i < quantity; i++) {

      let coords = generateValidCoords();

      placeItem(coords,tileCode);
   }
}
function placeItem(coords,tileCode) {
   
   addObjToMap(coords, tileCode);

   let color = TILE_COLORS[tileCode];
   drawObject(coords.x, coords.y, color);
   
}

/**
 * 
 * @TODO: Update so it's pure javaScript
 * use an array for the first three
 * use standalone functions for the others
 */
function updateStats() {

   let player_props = ['xp', 'level', 'health','relics'];

   for (var prop of player_props) {
      let el = document.getElementById(prop);

      el.textContent = player[prop];
   }

   let weapon_props = [{
         domId: 'weapon',
         key: 'name',
      },
      {
         domId: 'damage',
         key: 'damage'
      }
   ];

   for (var prop of weapon_props) {

      let {
         domId,
         key
      } = prop;

      let el = document.getElementById(domId);

      el.textContent = player.weapon[key];
   }


   let stats = document.getElementById('enemies');

   stats.textContent = game.enemies.length;

  
}


/**
 *
 * @param {Number} startX
 * @param {Number} startY
 * @param {Number} endX
 * @param {Number} endY
 * 
 */
function drawMap(startX, startY, endX, endY) {

   // loop through all cells of the map
   for (var row = startY; row < endY; row++) {

      for (var col = startX; col < endX; col++) {

         let color = null;

         let c_idx = game.map[row][col];

         color = TILE_COLORS[c_idx];
         
         drawObject(col, row, color);

      } // end loop
   }
}

/**
 * Coordinate Helper Functions
 */

function generateValidCoords() {

   var x=null, y=null;

   let turns = 0,
      limit = 100;

   do {
      x = Math.floor(Math.random() * COLS);
      y = Math.floor(Math.random() * ROWS);
      turns++;
   }
   while (game.map[y][x] != FLOOR_CODE && turns < limit);

   return {x,y};

}

function pickRandom(arr) {
   let idx = Math.floor(Math.random() * arr.length);

   return arr[idx];
}
/**
 * @param {Number} amount
 */
function generateEnemies(amount) {
   for (var i = 0; i < amount; i++) {
      // generate valid coordinates.
      let coords = generateValidCoords();

      let health = pickRandom(ENEMIES_HEALTH);

      let damage = pickRandom(ENEMIES_DAMAGE);

      let enemy = new Enemy(health, coords, damage);

      game.enemies.push(enemy);

      addObjToMap(coords, ENEMY_CODE);
   }
}

function generatePlayer() {

  // let coords = generateValidCoords();

   let coords = {
      x: COLS / 2,
      y: ROWS / 2
   };

   // level, health, weapon, coords, xp
   player = new Player(1, 100, WEAPONS[0], coords, 30, 0);

   addObjToMap(player.coords, PLAYER_CODE);
}

// add given coords to map 
// make the coords and neighbors busy
// and draw object with given color
function addObjToMap(coords, tileCode) {
   game.map[coords.y][coords.x] = tileCode;
}

/**
 * @param {Number} x
 * @param {Number} y
 * @param {String} color
 */
function drawObject(x, y, color) {

   //  game.context.clearRect(x * 10, y * 10, 10, 10);
   game.context.beginPath();
   game.context.rect(x * TILE_DIM, y * TILE_DIM, TILE_DIM, TILE_DIM);
   game.context.fillStyle = color;
   game.context.fill();
}


// key down events
/**
 * 
 * @TODO: Lose the jQuery
 * https://stackoverflow.com/questions/26131686/trigger-keyboard-event-in-vanilla-javascript
 */
function addKeyboardListener() {
   document.addEventListener('keydown', function(e) {
      var x = player.coords.x;
      var y = player.coords.y;
      var oldX = player.coords.x;
      var oldY = player.coords.y;

      switch (e.which) {
         case 37: // left
            x--;
            break;
         case 38: // up
            y--;
            break;
         case 39: // right
            x++;
            break;
         case 40: // down
            y++;
            break;
         default:
            return; // exit this handler for other keys
      }
      // check if next spot is enemy
      if (game.map[y][x] == ENEMY_CODE) {

         const matching_coords = (enemy) => {
            return enemy.coords.x == x && enemy.coords.y == y;
         }
         let enemy = game.enemies.find(matching_coords);

         fightEnemy(enemy);
      } else if (game.map[y][x] != WALL_CODE) {
         // if next spot is potion
         if (game.map[y][x] == POTION_CODE) {

            player.health += pickRandom(POTIONS);

            removeObjFromMap(x, y);
            generateItems(1, POTION_CODE);
            // if next spot is weapon
         } else if (game.map[y][x] == WEAPON_CODE) {

            player.weapon = pickRandom(WEAPONS);

            removeObjFromMap(x, y);
            generateItems(1, WEAPON_CODE);
         }
         /**
          * @TODO: Write logic that 
          * 
          * a) increments the number of relics
          * b) sets a maximum value for XP earned
          * c) determines the xp value randomly
          * d) removes the relic from the map
          * e) checks for a win
          */ 
         else if (game.map[y][x] == RELIC_CODE) {
          
         }
         // update player position
         updatePlayerPosition(player.coords.x, player.coords.y, x, y);

         updateStats();

         let left = oldX - VISIBILITY - 1;
         let top = oldY - VISIBILITY - 1;

         let right = x + VISIBILITY + 2;
         let bot = y + VISIBILITY + 2;

         drawMap(left, top, right, bot);
      }
      e.preventDefault(); // prevent the default action (scroll / move caret)
   });
}

function fightEnemy(enemy) {
   if (player.health - enemy.damage <= 0) {
      gameOver();
      return;
   }
   if (enemy.health - player.weapon.damage <= 0) {
      enemyDefeated(enemy);
   } else {
      enemy.health -= player.weapon.damage;
   }
   player.health -= enemy.damage;
   updateStats();
}

function enemyDefeated(enemy) {

   // remove enemy from  2D array
   removeObjFromMap(enemy.coords.x, enemy.coords.y);

   let left = enemy.coords.x - 1;
   let top = enemy.coords.y - 1
   let right = enemy.coords.x + 1;
   let bot = enemy.coords.y + 1;
   // remove ane enemy from the visible map.
   drawMap(left, top, right, bot);

   // add experience points
   player.xp += Math.round((enemy.damage + enemy.health) / 2);

   // calculate the level in points. Level 1 has no experience so machine-wise it is level 0.
   let level_in_points = POINTS_PER_LEVEL * (player.level - 1)

   // level up if needed.
   if (player.xp - level_in_points >= POINTS_PER_LEVEL) {

      player.level++;
   }

   // remove enemy from enemies array
   let e_idx = game.enemies.indexOf(enemy);

   // remove enemy from array
   game.enemies.splice(e_idx, 1);

   // update stats
   updateStats();

   checkForWin();

   // if no enemies, user wins
  
}


/** 
 * @TODO: Make the collection of all relics a 
 * requirement for winning the game. 
 * 
 * HINT: Use the new tileCount method you will write (or have written)
 * in game.js.
 */ 
function checkForWin() {
   if (game.enemies.length == 0) {
      userWins();
   }
}





function userWins() {
   alert("YOU CONQUERED THE DUNGEON!");
   game.reset();
   startGame();
};

function gameOver() {
   alert("GAME OVER");
   game.reset();
   startGame();
};

function removeObjFromMap(x, y) {
   // make this a floor coordinate
   game.map[y][x] = FLOOR_CODE;
};


/**
 * Removes old player square from map
 * Adds new square
 * @param {Number} oldX
 * @param {Number} oldY
 * @param {Number} newX
 * @param {Number} newY
 */
function updatePlayerPosition(oldX, oldY, newX, newY) {
   removeObjFromMap(oldX, oldY);

   // set this as the player
   game.map[newY][newX] = PLAYER_CODE;

   player.coords = {
      x: newX,
      y: newY
   };

   let start = {},
      end = {};


}