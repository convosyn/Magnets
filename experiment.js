const NS = 0;
const SN = 1;

var font = null;
var loadSceneBool = false;
var magnetS;
var magnetM;
var magnetSelected = false;

var raycaster= new THREE.Raycaster();
var mouse = new THREE.Vector2();
var running = false;
var started = false;
var greatWorkText = null;
var timerSet = false;
var timerEvent = null;
var firstTime = false;
var flipOne = true;
var flipTwo = true;
var panelInit = false;
var magnetism = 0.2;

function getRestructuredBoundingBox(obj, scalex = 1.8, scaley = 1.5, boxOnly = false){
	let bb = new THREE.Box3().setFromObject(obj);
	let Xwidth = bb.max.x - bb.min.x;
	let Ywidth = bb.max.y - bb.min.y;
	let Zwidth = bb.max.z - bb.min.z;
	let incXWidth = Xwidth * scalex;
	let incYWidth = Ywidth * scaley;

	let boxFromGm = new THREE.BoxGeometry(incXWidth, incYWidth, Zwidth);
	let boxMaterial = new THREE.MeshPhongMaterial({color: 0x2222ff, transparent: true});
	boxMaterial.opacity = 0.3;
	let bx = new THREE.Mesh(boxFromGm, boxMaterial);
	let  bbNew = new THREE.Box3().setFromObject(bx);

	let centerXPrev = (bb.max.x + bb.min.x)/2;
	let centerYPrev = (bb.max.y + bb.min.y)/2;
	let centerZPrev = (bb.max.z + bb.min.z)/2;

	let centerXNew = (bbNew.max.x + bbNew.min.x)/2;
	let centerYNew = (bbNew.max.y + bbNew.min.y)/2;
	let centerZNew = (bbNew.max.z + bbNew.min.z)/2;

	bx.translateX(centerXPrev - centerXNew);
	bx.translateY(centerYPrev - centerYNew);
	bx.translateZ(centerZPrev - centerZNew);

	return bx;
}

class Magnet{
	constructor(range = 0.2, pole = SN, dragable = false){
		this.range = range;
		this.pole = pole;
		this.x = 0;
		this.parse();
		this.dragable = dragable;
		this.bb;
	}

	move(x){
		this.x = x;
		if(this.x < -12) this.x = -12;
		else if(this.x > 12) this.x = 12;
		this.magnet.position.x = this.x;
		if(this.bb){
			this.bb.position.x = this.x;
		}
		PIErender();
	}

	get obj(){
		return this.magnet;
	}

	get pos(){
		return this.x;
	}

	get rangeF(){
		return this.range;
	}

	get poleF(){
		return this.pole;
	}

	flip(type){
		if(type == true){
			this.pole = SN;
		} else {
			this.pole = NS;
		}
		this.remove();
		this.parse();
		this.draw();
		this.move(this.pos);
		PIErender();
	}

	changeRange(value){
		this.range = value;
	}

	checkInRange(mg, side = true){
		console.log("checking range...");
		let checkX = this.x + (side ? 4 : 0);
		console.log("Current positions: -> " + checkX + " -- " + mg.pos);
		console.log("Checking for range -> " + (this.rangeF + mg.rangeF) + " Difference is -> " + Math.abs(checkX - mg.pos));
		if(mg.pos - checkX  < (mg.rangeF + this.rangeF)){
			if(this.poleF == mg.poleF){
				console.log("not same poles");
				// var mgBox = getRestructuredBoundingBox(mg, 1.0, 1.0, true);
				var positionMg = new THREE.Vector3();
				positionMg.setFromMatrixPosition( mg.obj.matrixWorld );
				console.log("Position Mg -> " + positionMg.x + ',' + positionMg.y + ',' + positionMg.z);

				var positionT = new THREE.Vector3();
				// this.magnet.computeBoundingBox();
				positionT.setFromMatrixPosition( this.magnet.matrixWorld );
				console.log("Position T -> " + positionT.x + ',' + positionT.y + ',' + positionT.z);
				this.move(positionMg.x-4);
				greatWorkText = drawText("Attraction!", 0xbcbcbc, 1.0, 0.2, font, 0.0, false);

			} else {
				console.log("same poles");
				var positionMg = new THREE.Vector3();
				positionMg.setFromMatrixPosition( mg.obj.matrixWorld );
				console.log("Position Mg -> " + positionMg.x + ',' + positionMg.y + ',' + positionMg.z);

				var positionT = new THREE.Vector3();
				// this.magnet.computeBoundingBox();
				positionT.setFromMatrixPosition( this.magnet.matrixWorld );
				console.log("Position T -> " + positionT.x + ',' + positionT.y + ',' + positionT.z);
				this.move(positionT.x-(this.range + 2));
				console.log("Position is -> " + this.pos);
				greatWorkText = drawText("Repulsion!", 0xbcbcbc, 1.0, 0.2, font, 0.0, false);
				// if(this.pos < -5)
			}
			
			PIEaddElement(greatWorkText);
			greatWorkText.position.set(-3, 4, 0);
			running = false;
			timerSet = true;
			timerEvent = setInterval(resetExperiment, 3000);
		}
	}

	draw(){
		PIEaddElement(this.magnet);
		PIErender();
	}

	remove(){
		if(this.magnet) {
			PIEremoveElement(this.magnet);
		}
		if(this.bb){
			PIEremoveElement(this.bb);
		}
	}

	addbb(){
		this.bb = getRestructuredBoundingBox(this.magnet, 1.01, 1.0, false);
		this.bb.rotation.x = deg2Rad(-10);
		this.bb.castShadow = false;
		this.magnet.add(this.bb);
		PIEaddElement(this.bb);
	}

	removebb(){
		PIEremoveElement(this.bb);
		this.magnet.remove(this.bb);
		this.bb = null;
	}

	checkMouse(){
		console.log("mousemove called for magnet");
		return (this.dragable && raycaster.intersectObjects(this.magnet.children).length > 0);
	}
	
	parse(){
		console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%\nparsing on flip")
		this.magnet = new THREE.Group();
		let magnetG = new THREE.BoxGeometry(2, 1, 1);
		let magnetMaterialNorth = new THREE.MeshPhongMaterial({color: 0x99200d});
		let magnetMaterialSouth = new THREE.MeshPhongMaterial({color: 0xad9b98});
		let magnetNorth = new THREE.Mesh(magnetG, magnetMaterialNorth);
		let magnetSouth = new THREE.Mesh(magnetG, magnetMaterialSouth);
		let ntext = drawText("N", 0x010101, 0.5, 0.001, font, 0.0, true);
		let stext = drawText("S", 0x010101, 0.5, 0.001, font, 0.0, true);
		if(this.pole == SN){
			console.log("TYPE OF POSITION IS SN");
			magnetNorth.position.x = 1;
			magnetSouth.position.x = -1;
			this.magnet.add(magnetNorth);
			this.magnet.add(magnetSouth);
			this.magnet.position.y = 2;
			this.magnet.position.z = -8;

			ntext.rotation.x = deg2Rad(10);
			stext.rotation.x = deg2Rad(10);
			ntext.position.set(1.0, -1.2, 0);
			stext.position.set(-1.5, -1.2, 0);
		} else {
			console.log("TYPE OF POSITION IS NS");
			magnetNorth.position.x = -1;
			magnetSouth.position.x = 1;
			this.magnet.add(magnetNorth);
			this.magnet.add(magnetSouth);
			this.magnet.position.y = 2;
			this.magnet.position.z = -8;

			ntext.rotation.x = deg2Rad(10);
			stext.rotation.x = deg2Rad(10);
			ntext.position.set(-1.5, -1.2, 0);
			stext.position.set(1.0, -1.2, 0);
		}
		// this.
		this.magnet.rotation.x = deg2Rad(-10);
		this.magnet.add(ntext);
		this.magnet.add(stext);
	}
}

function deg2Rad(v){
	return ((180 / Math.PI) * v);
}

function drawText(text, color, size, height, font, rotation = 0.2, basic = false){
	let geometry = new THREE.TextGeometry(text, {
		font : font,
		size : size,
		height : height,
		curveSegments : 10
	});
	geometry.computeBoundingBox();
	let textDrawen = undefined;
	if(basic == false){
		textDrawen =new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color:color, transparent: true}));
		textDrawen.rotation.y += rotation;
	} else if(basic == true){
		textDrawen =new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({color:color, transparent: true}));
		textDrawen.rotation.y += rotation;
	}
	return textDrawen;
}


var table;
function init(){
	let tableTopG = new THREE.BoxGeometry(24, 16, 1);
	let tableTopMaterial = new THREE.MeshPhongMaterial({color: 0x9b640c});
	let tableTop = new THREE.Mesh(tableTopG, tableTopMaterial);
	tableTop.position.z = -8;
	tableTop.rotation.x = deg2Rad(-10);

	let tableLegG = new THREE.BoxGeometry(1, 8, 1);
	let tableLeg1 = new THREE.Mesh(tableLegG, tableTopMaterial);
	let tableLeg2 = tableLeg1.clone();
	let tableLeg3 = tableLeg1.clone();
	let tableLeg4 = tableLeg1.clone();

	tableLeg1.position.set(-10, -7, -8);
	tableLeg2.position.set(10, -7, -8);
	tableLeg3.position.set(10, -4, -16);
	tableLeg4.position.set(-10, -4, -16);
	PIEaddElement(tableTop);
	PIEaddElement(tableLeg1);
	PIEaddElement(tableLeg2);
	PIEaddElement(tableLeg3);
	PIEaddElement(tableLeg4);
	let floorG = new THREE.PlaneGeometry(50, 40);
	let floorM = new THREE.MeshPhongMaterial({color: 0x212121});
	let floorMt = new THREE.MeshPhongMaterial({color: 0x0a6d3a});
	let floor1 = new THREE.Mesh(floorG, floorM);
	let floor2 = new THREE.Mesh(floorG, floorMt);
	floor2.scale.x = 0.95;
	floor2.scale.y = 0.95;
	floor1.position.z = -9;
	floor2.position.z = -9;
	floor1.rotation.x = deg2Rad(-10);
	floor1.position.y = -10.01;
	floor2.rotation.x = deg2Rad(-10);
	floor2.position.y = -10;
	
	PIEaddElement(floor1);
	PIEaddElement(floor2);

	// flipOne = flipTwo = false;
}

function initFont(){
	let loader = new THREE.FontLoader().load("optimer.json", function(v){
		font = v;
		resetExperiment();
	});
	// while(!font);
	// console.log("Font loaded");
}


const MAGNETISM = "Magnetism";
const FLIPMAGNETONE = "Flip Magnet 1";
const FLIPMAGNETTWO = "Flip Magnet 2";

function initControlPanel(){
	console.log("initialising panel - >> " +  flipOne + " " + flipTwo);
	if(panelInit == true) return;
	PIEaddInputSlider(MAGNETISM, 0.2, (value) => {
		if(magnetS && magnetM){
			console.log("changing magnetism!");
			magnetism = value;
			magnetS.changeRange(magnetism);
			magnetM.changeRange(magnetism);
			PIEchangeDisplayText(MAGNETISM, value);
		} 
	}, 0.2, 2, 0.2);
    PIEaddInputCheckbox(FLIPMAGNETONE, flipOne, () => {
		if(flipOne == true) {
			flipOne = false;
		} else {
			flipOne = true;
		}
		PIEchangeDisplayText("Magnet One", !flipOne ? "SN" : "NS");
		if(magnetS){
			magnetS.flip(flipOne);
		}
	});
	PIEaddInputCheckbox(FLIPMAGNETTWO, flipTwo, () => {
		if(flipTwo == true) {
			flipTwo = false;
		} else {
			flipTwo = true;
		}
		PIEchangeDisplayText("Magnet Two",  !flipTwo ? "SN" : "NS");
		if(magnetM){
			magnetM.flip(flipTwo);
		}
	});


    /* Observation Table */
    // PIEcreateTable("Original Table", 4, 4, true);
    // PIEsetRowInput(1, 5, "abcde");
    // PIEsetRowInput(2, 6, "fghijk");
    // PIEsetRowInput(3, 4, "lmno");

	PIEcreateTable("Observation Table", 5, 2, true);
	// PIEheaderROW
    PIEupdateTableRow(0, ['Interaction', "Repulsive/Attractive"]);
    PIEupdateTableCell(1, 0, "NS->NS");
    PIEupdateTableCell(2, 0, "SN->SN");
	PIEupdateTableCell(3, 0, "NS->SN");
	PIEupdateTableCell(4, 0, "SN->NS");
	PIEsetCellInput(1, 1, 15, "Attract");
	PIEsetCellInput(2, 1, 15, "Attract");
	PIEsetCellInput(3, 1, 15, "Repel");
	PIEsetCellInput(4, 1, 15, "Repel");	

    // PIEtableSelect("Original Table");
	PIEtableSetInputChange(handleChange);
	let elem = document.getElementsByTagName("div")[22];
	elem.style.top = "80px";
	elem.style.left = "10px";
	// elem.s
	
	PIEaddDisplayText(MAGNETISM, magnetism);
	PIEaddDisplayText("Magnet One", !flipOne ? "SN" : "NS");
	PIEaddDisplayText("Magnet Two", !flipTwo ? "SN" : "NS");
	panelInit = true;
}

function handleChange(row, col, value)
{
    /* Set current Table to Copy Table */
    PIEtableSelect("Observation Table");
    /* copy cell content to Copy Table */
    PIEupdateTableCell(row, col, value);
}


function loadScene(){
	loadSceneBool = true;
	magnetS = new Magnet(magnetism, flipOne, false);
	magnetS.move(-4)
	magnetS.draw();
	magnetM = new Magnet(magnetism, flipTwo, true);
	magnetM.move(9);
	magnetM.draw();
	running = true;
	// PIErender();
	if(firstTime == false){
		firstTime = true;
	}
	document.addEventListener('mousedown', onMouseDown , false);
	document.addEventListener('mousemove', onMouseHover, false);
	initControlPanel();
	PIErender();
}

function loadExperimentElements() {
	PIEsetAreaOfInterest(-12, 12, 12, -12);
	init();
	initFont();
	PIEsetDeveloperName("Kartik Verma");
	PIEsetExperimentTitle("Magnets- Attraction and Repulsion");
	PIEscene.background = new THREE.Color(0x122f5e);
	initialiseInfo();
	initialiseHelp();
}

function resetExperiment() {
	if(timerSet){
		clearInterval(timerEvent);
		timerEvent = null;
		timerSet = false;
	}
	console.log("reset Experiment called");
	if(greatWorkText){
		console.log("removing great Work Text");
		PIEremoveElement(greatWorkText);
		greatWorkText = null;
	}
	if(magnetS){
		magnetS.remove();
		magnetS = null;
	}
	if(magnetM){
		magnetM.remove();
		magnetM = null;
	}
	// running = false;
	// started = false;
	magnetSelected = false;
	// PIErender();
	// started = false;
	// flipOne = false;
	// flipTwo = false;
	document.removeEventListener('mousedown', onMouseDown);
	document.removeEventListener('mousemove', onMouseHover);
	loadScene();
	// PIEinput
	PIEchangeDisplayText("");
}

function updateExperimentElements(t, dt) {
	// if(started == false){
	// 	started = true;
	// }
	// if(running){
	// 	// magnetS.handleRotation();
	// 	// if(magnetS.checkInRange(magnetM)){
			
	// 	// }
	// 	// magnetS.chec
	// magnetS.checkInRange(magnetM);
	// 	PIErender();
	// }
}


function onMouseHover(event){
	if(running == false){
		return;
	} else if (PIEshowInput == true){
		console.log("returning because input true");
	}
	console.log("Mouse over called -> " + magnetSelected);
	mouse.x = (( event.clientX / PIErenderer.domElement.clientWidth ) * 2 - 1);
    mouse.y = (- ( event.clientY / PIErenderer.domElement.clientHeight ) * 2 + 1);
	raycaster.setFromCamera( mouse, PIEcamera );
	if(magnetSelected){
		console.log(12 * mouse.x);
		magnetM.move(12 * mouse.x);
		magnetS.checkInRange(magnetM);
		PIErender();
	}
}

function onMouseDown(event){
	if(running == false || PIEshowInput == true){
		console.log("returning because running is false");
		return;
	}
	// PIEs
	console.log("Mouse down called");
	PIErender();
	mouse.x = (( event.clientX / PIErenderer.domElement.clientWidth ) * 2 - 1);
    mouse.y = (-( event.clientY / PIErenderer.domElement.clientHeight ) * 2 + 1);
	raycaster.setFromCamera( mouse, PIEcamera );
	console.log(mouse);
	if(magnetSelected == true){
		magnetSelected = false;
		magnetM.removebb();
	}
	else {
		magnetSelected = magnetM.checkMouse();
		if(magnetSelected){
			magnetM.addbb();
		}
	}
	PIErender();
	// return handled;
}


var helpContent;
function initialiseHelp()
{
    helpContent="";
    helpContent = helpContent + "<h2>Magnets- Attraction and Repulsion</h2>";
    helpContent = helpContent + "<h3>About the experiment</h3>";
    helpContent = helpContent + "<p>The experiment shows interation between two magnets.</p>";
    helpContent = helpContent + "<h3>Animation control</h3>";
    helpContent = helpContent + "<p>The top line has animation controls. There are two states of the experiment.</p>";
    helpContent = helpContent + "<h3>The setup stage</h3>";
    helpContent = helpContent + "<p>The initial state is setup stage. In this stage, you can see a control window at the right. You have access to five sliders.</p>";
    helpContent = helpContent + "<p>You can control the following:</p>";
    helpContent = helpContent + "<ul>";
    helpContent = helpContent + "<li>Magnetism&nbsp;&nbsp;:&nbsp;Controls how strong the magnets are?.</li>";
    helpContent = helpContent + "<li>Flip Magnet 1&nbsp;&nbsp;:&nbsp;Controls the orientation of magnet 1.</li>";
    helpContent = helpContent + "<li>Flip Magnet 2&nbsp;:&nbsp;Controls the orientation of magnet 2.</li>";
    helpContent = helpContent + "</ul>";
    helpContent = helpContent + "<p>Once you setup the experiment, you can enter the animation stage by clicking the start button</p>";
    helpContent = helpContent + "<h3>The animation stage</h3>";
    helpContent = helpContent + "<p>In the animation stage, You select the magnet on the end of table and then drag it closer to the other one.</p>";
    helpContent = helpContent + "<p>The right hand panel now shows the values of the experiment variables during animation.</p>";
    helpContent = helpContent + "<ul>";
    helpContent = helpContent + "<li>Magnetism&nbsp;&nbsp;:&nbsp;Shows the strongness of Magnets.</li>";
    helpContent = helpContent + "<li>Magnet One&nbsp;&nbsp;:&nbsp;Shows the orientation of magnet 1.</li>";
    helpContent = helpContent + "<li>Magnet Two&nbsp;:&nbsp;Shows the orientation of magnet 2.</li>";
    helpContent = helpContent + "</ul>";
    helpContent = helpContent + "<p>You can pause and resume the animation by using the pause/play button on the top line</p>";
	helpContent = helpContent + "<h3>The drag and drop</h3>";
	helpContent = helpContent + "<h3>To select the magnet on the side just click on it. and to deselect again click anywhere on screen.</h3>";
	helpContent = helpContent + "<h3>Once the magnet is selected just move the mouse to move the magnet in x direction</h3>";
    helpContent = helpContent + "<h2>Happy Experimenting</h2>";
    PIEupdateHelp(helpContent);
}

var infoContent;
function initialiseInfo()
{
    infoContent =  "";
    infoContent = infoContent + "<h2>Magnets- Attraction and Repulsion</h2>";
    infoContent = infoContent + "<h3>About the experiment</h3>";
    infoContent = infoContent + "<p>The experiment shows interation between two magnets.</p>";
    infoContent = infoContent + "<h3>Magnets</h3>";
	infoContent = infoContent + "<p>Magnets have two poles.</p>";
	infoContent = infoContent + "<ul><li>North Pole</li><li>South Pole</li></ul>"
    infoContent = infoContent + "<p>Similar Poles attract, while opposite poles repel each other.</p>";
	infoContent = infoContent + "<p>e.g. If two north poles are brought together first pole repels other, On the other hand if we bring a north pole and south pole together they attract each other.</p>";
	infoContent = infoContent + "<p>When the magnet on the end of the table is brought closer to the magnet lying the center the two either attract or repel depending upon on the pole positions as described above.</p>"
    infoContent = infoContent + "<h2>Happy Experimenting</h2>";
    PIEupdateInfo(infoContent);
}