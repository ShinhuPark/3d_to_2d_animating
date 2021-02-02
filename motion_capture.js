/*
structure of our fluffy's bones :
torso1
 leg1_R
  leg2_R
 leg1_L
  leg2_L
 torso2
  head
  arm1_R
   arm2_R
  arm1_L
   arm2_L
*/
var bonesToTranslate = ["torso1", "nose"]
, bonesNotToScale = ["nose", "tail", "tail2", "tail3", "tail4", "tail5", "tail6", "belly"]
, bonesNotToRotate = ["nose", "belly"];

var stop = false;
var frameCount = 0;
var fps = 60, fpsInterval, startTime, now, then, elapsed;

//To avoid searching through whole elements of list, we give specific index number instead of string.
var anim = data;
var frame = 0;
var pose_frame;
var pose_json = {angle : [], translate : [], scale : []};
var anim_json = {};
var setupPose = {};
const varToString = varObj => Object.keys(varObj)[0]


var bonesToInvisible = [];


var animal, animalCtx;  // element to draw fluffy and its webGl context



//spine runtime asset manager object
var assetManager;

//spine runtime rendering object
var debug;

//spine runtime skeleton object
var fluffy;

//bones to visible in debug of animal
var spineBones = ["head", "leg1_L", "leg2_L", "leg1_R", "leg2_R", "arm1_L", "arm2_L", "arm1_R", "arm2_R", "torso1", "torso2", "nose","tail", "tail2", "tail3", "tail4", "tail5", "tail6","belly"]
var leg1_R, leg2_R, leg1_L, leg2_L, arm1_R, arm2_R, arm1_L, arm2_L;
var torso1, torso2, head, nose;
var root, tail, tail2, tail3, tail4, tail5, tail6;


var vec = new spine.Vector2();

async function init() {

  //assign html element to draw fluffy
  animal = document.getElementById("fluffy");
  animal.width = 1600;
  animal.height = 1200;
  var config = { alpha: false };
  animalCtx = animal.getContext("webgl", config);

  //create asset manager object
  assetManager = new spine.webgl.AssetManager(animalCtx);

  //create fluffy-rendering object
  debug = new spine.webgl.SceneRenderer(animal, animalCtx);

  assetManager.loadTextureAtlas("assets/fluffy.atlas");
  assetManager.loadText("assets/fluffy.json");

  requestAnimationFrame(load);
}

function load () {
  // Wait until the AssetManager has loaded all resources, then load the skeletons.
  if (assetManager.isLoadingComplete()) {

    //parachute animation preset is good for motion capture, because it disabled all IK bones and transform constrains.
    fluffy = loadfluffy("parachute/fall", false);

    fluffy.skeleton.setBonesToSetupPose();
    fluffy.skeleton.updateWorldTransform();
    //fluffy.skeleton.setBonesToSetupPose();


    // Assign every targetted bones. we do this before rendering, else searching for this bone will need searching through 30-long lists each time, each frame.
    for (var i=0; i<spineBones.length; i++){
      window[spineBones[i]] = fluffy.skeleton.findBone(spineBones[i]);

      var setupBone = fluffy.skeleton.findBone(spineBones[i]);
      vec.set(setupBone.worldX, setupBone.worldY);
      setupBone.parent.worldToLocal(vec);
      setupPose[spineBones[i]] = {
        angle : setupBone.rotation
        , translate : [vec.x, vec.y]
      };
      if(setupBone.rotation < 0){
        setupPose[spineBones[i]]["angle"] += 360;
      }

      anim_json[spineBones[i]] = {};
      if (bonesToTranslate.includes(spineBones[i])){
        anim_json[spineBones[i]]["translate"] = [];
      }
      if(!bonesNotToScale.includes(spineBones[i])){
        anim_json[spineBones[i]]["scale"] = [];
      }
      if(!bonesNotToRotate.includes(spineBones[i])){
        anim_json[spineBones[i]]["rotate"] = [];
      }

    }




    //options of debugging of fluffy
    debug.skeletonDebugRenderer.drawBones = true;
    debug.skeletonDebugRenderer.drawRegionAttachments = false;
    debug.skeletonDebugRenderer.drawBoundingBoxes = false;
    debug.skeletonDebugRenderer.drawMeshHull = false;
    debug.skeletonDebugRenderer.drawMeshTriangles = false;
    debug.skeletonDebugRenderer.drawPaths = false;
    debug.skeletonDebugRenderer.drawSkeletonXY = false;
    debug.skeletonDebugRenderer.drawClipping = false;
    debug.skeletonDebugRenderer.premultipliedAlpha = true;


    // we make list for bones to hide in fluffy debug
    for (var i = 0, n = fluffy.skeleton.bones.length; i < n; i++) {
      var _bone = fluffy.skeleton.bones[i];
      if (
        spineBones.includes(_bone.data.name)
      ){
        continue
      }
      else if (["root"].includes(_bone.data.name)){
        continue
      }
      else {
      bonesToInvisible.push(_bone.data.name);
      }
    }

    fluffy.state.update(0);
    fluffy.state.apply(fluffy.skeleton);


    debug.camera.position.set(0, debug.camera.viewportHeight / 2,0);
    fpsInterval = 1000 / fps;
    then = Date.now();
    startTime = then;
    requestAnimationFrame(render); // Loading is done, call render every frame.
  } else {
    requestAnimationFrame(load);
  }
}


function loadfluffy (initialAnimation, premultipliedAlpha) {
  // Load the texture atlas from the AssetManager.
  var atlas = assetManager.get("assets/fluffy.atlas");

  // Create a AtlasAttachmentLoader that resolves region, mesh, boundingbox and path attachments
  var atlasLoader = new spine.AtlasAttachmentLoader(atlas);

  // Create a SkeletonBinary instance for parsing the .skel file.
  var skeletonJson = new spine.SkeletonJson(atlasLoader);

  // Set the scale to apply during parsing, parse the file, and create a new skeleton.
  skeletonJson.scale = 1;
  var skeletonData = skeletonJson.readSkeletonData(assetManager.get("assets/fluffy.json"));
  var skeleton = new spine.Skeleton(skeletonData);
  skeleton.setSkinByName("Fox/Fox");
  var bounds = calculateSetupPoseBounds(skeleton);

  // Create an AnimationState, and set the initial animation in looping mode.
  var animationStateData = new spine.AnimationStateData(skeleton.data);
  var animationState = new spine.AnimationState(animationStateData);
  animationState.setAnimation(0, initialAnimation, true);

  // Pack everything up and return to caller.
  return { skeleton: skeleton, skeletonData: skeletonData, state: animationState, bounds: bounds, premultipliedAlpha: premultipliedAlpha };
}

function calculateSetupPoseBounds (skeleton) {
  skeleton.setToSetupPose();
  skeleton.updateWorldTransform();
  var offset = new spine.Vector2();
  var size = new spine.Vector2();
  skeleton.getBounds(offset, size, []);
  return { offset: offset, size: size };
}



async function render () {


  requestAnimationFrame(render);

   // calc elapsed time since last loop

  now = Date.now();
  elapsed = now - then;

  // if enough time has elapsed, draw the next frame

  if (elapsed > fpsInterval) {


    then = now - (elapsed % fpsInterval);

    animalCtx.clearColor(0, 1, 0, 1);
    animalCtx.clear(animalCtx.COLOR_BUFFER_BIT);


    //prepare for skeleton data to animate upon coords of estimated pose

    var skeleton = fluffy.skeleton;


    debug.begin();


    if (frame < anim["angle"].length){
      pose_frame = {angle : anim["angle"][frame], location : anim["location"][frame], scale : anim["scale"][frame]};

      for (var ib = 0; ib < spineBones.length; ib++) {

        if(![].includes(spineBones[ib])){
          animate(window[spineBones[ib]], pose_frame, skeleton);
          window[spineBones[ib]].updateAppliedTransform();
          createJson(window[spineBones[ib]], setupPose, frame);
        }
      }

    }
    else if (frame == anim["angle"].length){

      frame = -1;
      console.log(JSON.stringify(anim_json));
    }


    frame += 1

    //draw fluffy on animal canvas
    debug.drawSkeleton(skeleton, false);
    debug.drawSkeletonDebug(skeleton, false, bonesToInvisible);
    debug.end();
  }
}


function toTuple({x, y}) {
  return [x, y];
}


function animate(chaBone, transform, skeleton) {
  //bones that need to be translated
  if (bonesToTranslate.includes(chaBone.data.name)){
    var scaleFactor = 1;
    if(chaBone.data.name == "torso1"){
      scaleFactor = 0.6
    }
    else if(chaBone.data.name == "nose"){
      scaleFactor = 0.7
    }
    else{
      scaleFactor = 1
    }
    vec.set(-22 + scaleFactor*154*transform["location"][chaBone.data.name][0], 0 + scaleFactor*428*transform["location"][chaBone.data.name][1]);
    chaBone.parent.worldToLocal(vec);

    chaBone.x = vec.x;
    skeleton.updateWorldTransform();
    chaBone.y = vec.y;
    skeleton.updateWorldTransform();


  }

  //scale
  if(!(bonesNotToScale.includes(chaBone.data.name))){ //exclude bones that has only 'head', not 'tail'
    chaBone.scaleX = transform["scale"][chaBone.data.name];
    skeleton.updateWorldTransform();
  }

  //rotate
  if(!bonesNotToRotate.includes(chaBone.data.name)){

    var rotateFactor = 1;
    if(chaBone.data.name == "head"){
      rotateFactor = 1
    }
    else if(["tail", "tail2", "tail3", "tail4", "tail5", "tail6"].includes(chaBone.data.name)){
      rotateFactor = 1.3
    }
    else{
      rotateFactor = 1
    }

    if(["tail", "tail2", "tail3", "tail4", "tail5", "tail6"].includes(chaBone.data.name)){
      chaBone.rotation = chaBone.worldToLocalRotation(adjustRotationMagnitude(360-transform["angle"][chaBone.data.name], 90,rotateFactor));
      skeleton.updateWorldTransform();
    }
    else if(chaBone.data.name == "head"){
      chaBone.rotation = chaBone.worldToLocalRotation(adjustRotationMagnitude(transform["angle"][chaBone.data.name], 90,rotateFactor));
      skeleton.updateWorldTransform();
    }
    else{
      //debugging the problematic bone
      if(chaBone.data.name == "arm2_R"){
        console.log('frame : '+(frame+1));
        console.log('global rotation to apply : '+transform["angle"][chaBone.data.name]);
        console.log('a : '+chaBone.a);
        console.log('b : '+chaBone.b);
        console.log('c : '+chaBone.c);
        console.log('d : '+chaBone.d);
        console.log('rotation : '+chaBone.rotation);
        console.log('shearX : '+chaBone.shearX);
        console.log('local rotation calculated by worldToLocalRotation() : '+chaBone.worldToLocalRotation(transform["angle"][chaBone.data.name]));

      }

      chaBone.rotation = chaBone.worldToLocalRotation(transform["angle"][chaBone.data.name]);
      skeleton.updateWorldTransform();
    }
  }
}

function createJson(chaBone, setupPose, frame){
  if (bonesToTranslate.includes(chaBone.data.name)){
    vec.set(chaBone.worldX, chaBone.worldY);
    chaBone.parent.worldToLocal(vec);

    anim_json[chaBone.data.name]["translate"].push({ time: frame*(1/fps), x: vec.x - setupPose[chaBone.data.name]["translate"][0], y: vec.y - setupPose[chaBone.data.name]["translate"][1]}
    );
  }
  if(!(bonesNotToScale.includes(chaBone.data.name))){
    anim_json[chaBone.data.name]["scale"].push({ time: frame*(1/fps), x: chaBone.scaleX})
  }
  if(!bonesNotToRotate.includes(chaBone.data.name)){

    var angle_json = chaBone.rotation - setupPose[chaBone.data.name]["angle"];
    if (angle_json < 0){
      angle_json += 360;
    }
    anim_json[chaBone.data.name]["rotate"].push({ time: frame*(1/fps), angle: angle_json})
  }
}
function adjustRotationMagnitude(glbAngle,refAngle,fac){
  var _angle = refAngle + (glbAngle - refAngle) * fac
  if(_angle < 0){
    _angle += 360
  }
  return _angle
}
init();
