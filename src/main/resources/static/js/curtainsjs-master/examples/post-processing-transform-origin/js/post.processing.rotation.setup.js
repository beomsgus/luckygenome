import {Curtains, Plane, ShaderPass, FXAAPass, Vec3} from '../../../src/index.mjs';

window.addEventListener("load", () => {
    let rotationEffect = 0;
    // used for touch devices
    let touch = {
        y: 0,
        lastY: 0,
    };

    // handle wheel event
    window.addEventListener("wheel", (e) => {
        // normalize wheel event
        const delta = window.navigator.userAgent.indexOf("Firefox") !== -1 ? e.deltaY : e.deltaY / 40;

        rotationEffect += delta;
    }, {
        passive: true
    });

    // handle touch
    window.addEventListener("touchstart", (e) => {
        // reset our values on touch start
        if(e.targetTouches) {
            touch.y = e.targetTouches[0].clientY;
        }
        else {
            touch.y = e.clientY;
        }
        touch.lastY = touch.y;
    }, {
        passive: true
    });

    window.addEventListener("touchmove", (e) => {
        touch.lastY = touch.y;

        if(e.targetTouches) {
            touch.y = e.targetTouches[0].clientY;
        }
        else {
            touch.y = e.clientY;
        }

        rotationEffect += (touch.lastY - touch.y) / 10;
    }, {
        passive: true
    });

    // set up our WebGL context and append the canvas to our wrapper
    const curtains = new Curtains({
        container: "canvas",
        antialias: false, // render targets will disable default antialiasing anyway
        premultipliedAlpha: true, // improves shader pass rendering
        pixelRatio: Math.min(1.5, window.devicePixelRatio) // limit pixel ratio for performance
    });

    curtains.onRender(() => {
        rotationEffect = curtains.lerp(rotationEffect, 0, 0.05);
    }).onError(() => {
        // we will add a class to the document body to display original images
        document.body.classList.add("no-curtains");
    }).onContextLost(() => {
        // on context lost, try to restore the context
        curtains.restoreContext();
    });

    // we will keep track of all our planes in an array
    const planes = [];

    // get our planes elements
    const planeElements = document.getElementsByClassName("plane");

    const vs = `
        precision mediump float;
    
        // default mandatory variables
        attribute vec3 aVertexPosition;
        attribute vec2 aTextureCoord;
    
        uniform mat4 uMVMatrix;
        uniform mat4 uPMatrix;
    
        uniform mat4 planeTextureMatrix;
    
        // custom variables
        varying vec3 vVertexPosition;
        varying vec2 vTextureMatrixCoord;
    
        void main() {
    
            vec3 vertexPosition = aVertexPosition;
    
            gl_Position = uPMatrix * uMVMatrix * vec4(vertexPosition, 1.0);
    
            // varyings
            vVertexPosition = vertexPosition;
            vTextureMatrixCoord = (planeTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
        }
    `;

    const fs = `
        precision mediump float;
    
        varying vec3 vVertexPosition;
        varying vec2 vTextureMatrixCoord;
    
        uniform sampler2D planeTexture;
    
        void main() {
            // just display our texture
            gl_FragColor = texture2D(planeTexture, vTextureMatrixCoord);
        }
    `;

    // add our planes and handle them
    for(let i = 0; i < planeElements.length; i++) {
        const plane = new Plane(curtains, planeElements[i], {
            vertexShader: vs,
            fragmentShader: fs,
        });

        if(plane) {
            planes.push(plane);

            handlePlanes(i);
        }
    }

    function setPlaneTransformOrigin(plane) {
        const curtainsBoundingRect = curtains.getBoundingRect();
        // has to be set according to its css positions
        // (0, 0) means plane's top left corner
        // (1, 1) means plane's bottom right corner
        if(curtainsBoundingRect.width >= curtainsBoundingRect.height) {
            plane.setTransformOrigin(new Vec3(-0.4, 0.5, 0));
        }
        else {
            // for portrait mode we deliberately set the transform origin outside the viewport to give space to the planes
            plane.setTransformOrigin(new Vec3(-0.5, 0.5, 0));
        }
    }

    // handle all the planes
    function handlePlanes(index) {
        const plane = planes[index];

        // set transform origin
        setPlaneTransformOrigin(plane);

        // set initial rotation based on plane index
        plane.rotation.z = (index / planeElements.length) * Math.PI * 2;

        plane.onReady(() => {

        }).onRender(() => {
            // update rotation based on rotation effect
            plane.rotation.z += rotationEffect / 100;
        }).onAfterResize(() => {
            setPlaneTransformOrigin(plane);
        });
    }

    // post processing
    const rotationFs = `
        precision mediump float;
    
        varying vec3 vVertexPosition;
        varying vec2 vTextureCoord;
    
        uniform sampler2D uRenderTexture;
    
        uniform float uRotationEffect;
    
        void main() {
            vec2 textCoords = vTextureCoord;
    
            // calculate an effect that spreads from the left-center point
            float rgbEffect = uRotationEffect * distance(textCoords, vec2(0.0, 0.5));
    
            // apply a simple rgb shift based on that effect
            vec4 red = texture2D(uRenderTexture, textCoords + rgbEffect * 0.005);
            vec4 green = texture2D(uRenderTexture, vTextureCoord);
            vec4 blue = texture2D(uRenderTexture, vTextureCoord + rgbEffect * -0.005);
    
            // use green channel alpha as this one does not have any displacement
            gl_FragColor = vec4(red.r, green.g, blue.b, green.a);
        }
    `;

    const shaderPassParams = {
        fragmentShader: rotationFs, // we'll be using the lib default vertex shader
        uniforms: {
            rotationEffect: {
                name: "uRotationEffect",
                type: "1f",
                value: 0,
            },
        },
    };

    const shaderPass = new ShaderPass(curtains, shaderPassParams);
    shaderPass.onRender(() => {
        // update the uniform
        shaderPass.uniforms.rotationEffect.value = rotationEffect;
    });

    // FXAA pass to add antialiasing
    const fxaaPass = new FXAAPass(curtains);
});
