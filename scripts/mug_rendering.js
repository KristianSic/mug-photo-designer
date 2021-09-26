
import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { GLTFLoader } from './GLTFLoader.js';

var theModel;

var controls, scene, textloader, model;

init();

var _width = leftcol.clientWidth; // canvas.offsetWidth;
var _height = leftcol.clientHeight; //canvas.offsetHeight;

function init() {
    material_output = new THREE.MeshBasicMaterial({ transparent: true });
    material_output.map = new THREE.CanvasTexture(hidden_canv);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2b2b2b);
    textloader = new THREE.TextureLoader();
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(leftcol.clientWidth, leftcol.clientHeight);

    leftcol.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(60, _width / _height, 1, 1000);
    camera.position.set(750, 0, 0);

    const INITIAL_MTL = new THREE.MeshPhongMaterial({ color: 0xf1f1f1, shininess: 10 });

    // controls

    controls = new OrbitControls(camera, renderer.domElement);

    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.05;

    controls.screenSpacePanning = false;
    controls.enableKeys = false;
    controls.minDistance = 100;
    controls.maxDistance = 200;

    controls.maxPolarAngle = Math.PI / 2;

    let light = new THREE.HemisphereLight(0xffffff, 0xffffff, .5)
    let backLight = new THREE.DirectionalLight(0xffffff, .4);
    let shadowLight = new THREE.DirectionalLight(0xffffff, .2);

    shadowLight.position.set(200, 200, 200);
    shadowLight.castShadow = true;
    shadowLight.shadowDarkness = .2;

    backLight.position.set(-100, 200, 50);
    backLight.shadowDarkness = .1;
    backLight.castShadow = true;

    scene.add(backLight);
    scene.add(light);
    scene.add(shadowLight);

    function initColor(parent, type, mtl) {
        parent.traverse((o) => {
            if (o.isMesh) {
                if (o.name.includes(type)) {
                    o.material = mtl;
                    o.nameID = type; // Set a new property to identify this object
                }
            }
        });
    }

    var geometry = new THREE.CylinderGeometry(20.3, 20.3, 44, 64, 1, true, 0, THREE.Math.degToRad(304));
    var meshOuter = new THREE.Mesh(geometry, material_output);

    meshOuter.rotation.y = THREE.Math.degToRad(28);
    meshOuter.position.set(0, -24, 0);
    var box = new THREE.Box3().setFromObject(meshOuter);
    scene.add(meshOuter);

    window.addEventListener('resize', onWindowResize, false);

    let loader = new GLTFLoader();
    loader.load("assets/models/mug/scene.gltf", (gltf) => {

        gltf.scene.traverse(child => {
            if (child.isMesh) {
                if (child.name === "sleeve") {
                }
                else if (child.name === "mug") {
                }
            }
        });
        gltf.scene.scale.set(5.0, 5.0, 5.0);
        theModel = gltf.scene;
        initColor(theModel, "mug", INITIAL_MTL);
        initColor(theModel, "sleeve", material_output);
        scene.add(gltf.scene);
        animate();
        resetCanvas();
        resizeCanvas();
    });

}

function onWindowResize() {
    renderer.setSize(leftcol.clientWidth, leftcol.clientHeight);
    camera.aspect = leftcol.clientWidth / leftcol.clientHeight;
    camera.updateProjectionMatrix();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
    render();
}

function render() {
    renderer.render(scene, camera);
}